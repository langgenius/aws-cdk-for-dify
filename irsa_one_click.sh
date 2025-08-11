#!/bin/bash
set -euo pipefail

error_handler() {
  local lineno=$1
  local msg=$2
  echo "❌ Error on or near line ${lineno}: ${msg}"
  exit 1
}

trap 'error_handler ${LINENO} "${BASH_COMMAND}"' ERR


# ──────────────── Input Section ────────────────
# Prompt for AWS region (must be valid, default: us-west-2)
while true; do
  read -rp "AWS region [default: us-west-2]: " region
  region=${region:-us-west-2}

  if AWS_PAGER="" aws ec2 describe-regions --region "$region" --query "Regions[].RegionName" --output text 2>/dev/null | grep -wq "$region"; then
    break
  else
    echo "❌ Region '$region' is invalid or not accessible. Please enter a valid AWS region."
  fi
done


# Prompt for EKS cluster name (must exist, not empty)
while true; do
  read -rp "EKS cluster name (must already exist): " cluster_name
  if [[ -z "$cluster_name" ]]; then
    echo "❌ Cluster name cannot be empty."
    continue
  fi

  if aws eks describe-cluster --name "$cluster_name" --region "$region" >/dev/null 2>&1; then
    # 获取集群 ARN
    cluster_arn=$(aws eks describe-cluster \
      --name "$cluster_name" \
      --region "$region" \
      --query "cluster.arn" \
      --output text)

    echo "✅ Cluster '$cluster_name' found."
    echo "🔗 Cluster ARN: $cluster_arn"
    break
  else
    echo "❌ Cluster '$cluster_name' does not exist in region '$region'. Please re-enter."
  fi
done


# Prompt for S3 bucket name (must exist, not empty)
while true; do
  read -rp "S3 bucket name (must already exist): " bucket_name
  if [[ -z "$bucket_name" ]]; then
    echo "❌ Bucket name cannot be empty."
    continue
  fi
  if AWS_PAGER="" aws s3api head-bucket --bucket "$bucket_name" >/dev/null 2>&1; then
    break
  else
    echo "❌ Bucket '$bucket_name' does not exist or you don't have access. Please re-enter."
  fi
done

# IAM roles name 
# Set fixed IAM role names based on cluster name
s3_role_name="DifyEE-Role-${cluster_name}-s3"
s3_ecr_role_name="DifyEE-Role-${cluster_name}-s3-ecr"
ecr_pull_role_name="DifyEE-Role-${cluster_name}-ecr-image-pull"

# Default ECR repo name based on cluster name
default_repo_name="dify-ee-plugin-repo-$(echo "$cluster_name" | tr '[:upper:]' '[:lower:]')"

# Prompt for ECR repo name (non-empty, format check, default supported)
while true; do
  read -rp "ECR repository name to create (will create if not exist) [default: ${default_repo_name}]: " repo_name
  repo_name=${repo_name:-$default_repo_name}

  if [[ -z "$repo_name" ]]; then
    echo "❌ Repository name cannot be empty."
    continue
  fi

  if [[ ! "$repo_name" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
    echo "❌ Invalid ECR repo name. Only letters, numbers, '.', '_', '/' and '-' are allowed."
    continue
  fi

  if aws ecr describe-repositories --repository-names "$repo_name" --region "$region" >/dev/null 2>&1; then
    echo "ℹ️  ECR repo '$repo_name' already exists and will be reused."
  else
    echo "✅ ECR repo '$repo_name' will be created."
  fi
  break
done

account_id=$(aws sts get-caller-identity --query Account --output text)

# ──────────────── Preview all input variables ────────────────
echo ""
echo "=========== Configuration Preview ==========="
echo "AWS Region         : $region"
echo "EKS Cluster Name   : $cluster_name"
echo "S3 Bucket Name     : $bucket_name"
echo "ECR Repo Name      : $repo_name"
echo "============================================="
echo "The following IAM roles will be used or created:"
echo "1. S3 Role:             $s3_role_name"
echo "2. S3 + ECR Role:       $s3_ecr_role_name"
echo "3. ECR Image Pull Role: $ecr_pull_role_name"
echo "============================================="

read -rp "Proceed with the above configuration? [Y/n]: " config_confirm
config_confirm=$(echo "$config_confirm" | tr '[:upper:]' '[:lower:]')

if [[ -n "$config_confirm" && "$config_confirm" != "y" ]]; then
  echo "❌ Aborted by user."
  exit 1
fi
# ──────────────── Create ECR ────────────────
if aws ecr describe-repositories --repository-names "${repo_name}" --region "${region}" >/dev/null 2>&1; then
  echo "ℹ️  ECR repository '${repo_name}' already exists. Reusing it."
else
  echo "📦 ECR repository '${repo_name}' not found. Creating now..."
  aws ecr create-repository --repository-name "${repo_name}" --region "${region}"
  echo "✅ ECR repository '${repo_name}' created."
fi

# ──────────────── OIDC Setup ────────────────
echo "Resolving OIDC provider for cluster '${cluster_name}'..."
oidc_issuer=$(aws eks describe-cluster \
  --name "${cluster_name}" \
  --region "${region}" \
  --query "cluster.identity.oidc.issuer" \
  --output text)

oidc_provider="${oidc_issuer/https:\/\//}"
echo "OIDC Provider: ${oidc_provider}"
oidc_id=$(echo "${oidc_issuer}" | cut -d'/' -f5)
oidc_provider_arn=$(aws iam list-open-id-connect-providers \
  | grep "${oidc_id}" \
  | awk -F'"' '{print $4}')

if [[ -z "${oidc_provider_arn}" ]]; then
  echo "❌ OIDC provider not found. Make sure IAM OIDC provider is enabled for this cluster."
  exit 1
fi
echo "OIDC provider ARN: ${oidc_provider_arn}"
echo "OIDC ID: ${oidc_id}"
# ──────────────── Create Role ────────────────

# Function to create or reuse IAM role
create_or_refresh_iam_role() {
  local role_name="$1"
  trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { 
          "Federated": "${oidc_provider_arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity"
    }
  ]
}
EOF
)
  if aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    echo "🔄 IAM role '$role_name' exists. Will reuse it..."
    role_arn=$(aws iam get-role \
    --role-name "${role_name}" \
    --query 'Role.Arn' \
    --output text)
  else
    echo "🚀 Creating IAM role '$role_name'..."
    role_arn=$(aws iam create-role \
    --role-name "${role_name}" \
    --assume-role-policy-document "${trust_policy}" \
    --description "irsa role for Dify EE" \
    --query 'Role.Arn' \
    --output text)
  fi
}

# Create or update each role
for role in "$s3_role_name" "$s3_ecr_role_name" "$ecr_pull_role_name"; do
  create_or_refresh_iam_role "$role"
done


# ──────────────── S3 Policy ────────────────
s3_policy_json=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::${bucket_name}/*"
    }
  ]
}
EOF
)

# ──────────────── ECR Policy ────────────────
ecr_policy_json=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:*",
                "cloudtrail:LookupEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)
# ──────────────── ECR Policy ────────────────
ecr_pull_only_policy_json=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:BatchGetImage",
      "Resource": "*"
    }
  ]
}
EOF
)


s3_policy_name="dify-ee-irsa-${cluster_name}-s3-policy"
ecr_policy_name="dify-ee-irsa-${cluster_name}-ecr-policy"
ecr_pull_only_policy_name="dify-ee-irsa-${cluster_name}-ecr-pull-only-policy"
# ──────────────── Preview ────────────────
echo ""
echo "──── IAM Policy Preview ────"
echo "[S3 Policy: ${s3_policy_name}]"
echo "${s3_policy_json}" | jq .
echo
echo "[ECR Policy: ${ecr_policy_name}]"
echo "${ecr_policy_json}" | jq .
echo
echo "[ECR Policy: ${ecr_pull_only_policy_name}]"
echo "${ecr_pull_only_policy_json}" | jq .
echo "─────────────────────────────"

read -rp "Proceed to create policies? (y/N): " preview_confirm
preview_confirm=$(echo "$preview_confirm" | tr '[:upper:]' '[:lower:]')

if [[ -n "$preview_confirm" && "$preview_confirm" != "y" ]]; then
  echo "❌ Aborted by user."
  exit 1
fi
# ──────────────── Create S3 Policy ────────────────
# Check if S3 policy already exists
if aws iam get-policy --policy-arn "arn:aws:iam::${account_id}:policy/${s3_policy_name}" >/dev/null 2>&1; then
  echo "ℹ️  Policy '${s3_policy_name}' already exists. Will reuse it."
else
  echo "📜 Creating IAM policy '${s3_policy_name}'..."
  s3_policy_arn=$(aws iam create-policy \
    --policy-name "${s3_policy_name}" \
    --policy-document "${s3_policy_json}" \
    --query 'Policy.Arn' \
    --output text)
  echo "✅ Created policy: ${s3_policy_arn}"
fi

# ──────────────── Create ECR Policy ────────────────
# Check if ECR policy already exists
if aws iam get-policy --policy-arn "arn:aws:iam::${account_id}:policy/${ecr_policy_name}" >/dev/null 2>&1; then
  echo "ℹ️  Policy '${ecr_policy_name}' already exists. Will reuse it."
else
  echo "📜 Creating IAM policy '${ecr_policy_name}'..."
  ecr_policy_arn=$(aws iam create-policy \
    --policy-name "${ecr_policy_name}" \
    --policy-document "${ecr_policy_json}" \
    --query 'Policy.Arn' \
    --output text)
  echo "✅ Created policy: ${ecr_policy_arn}"
fi

# ──────────────── Create ECR Pull Only Policy ────────────────
# Check if ECR pull only policy already exists
if aws iam get-policy --policy-arn "arn:aws:iam::${account_id}:policy/${ecr_pull_only_policy_name}" >/dev/null 2>&1; then
  echo "ℹ️  Policy '${ecr_pull_only_policy_name}' already exists. Will reuse it."
else
  echo "📜 Creating IAM policy '${ecr_pull_only_policy_name}'..."
  ecr_pull_only_policy_arn=$(aws iam create-policy \
    --policy-name "${ecr_pull_only_policy_name}" \
    --policy-document "${ecr_pull_only_policy_json}" \
    --query 'Policy.Arn' \
    --output text)
  echo "✅ Created policy: ${ecr_pull_only_policy_arn}"
fi


attach_policy_to_role() {
  local role_name="$1"
  shift
  local policy_names=("$@")

  for policy_name in "${policy_names[@]}"; do
    echo "🔗 Attaching policy '${policy_name}' to role '${role_name}'..."
    aws iam attach-role-policy \
      --role-name "${role_name}" \
      --policy-arn "arn:aws:iam::${account_id}:policy/${policy_name}"
  done
}

# Attach policies to roles
attach_policy_to_role "$s3_role_name" "$s3_policy_name"
attach_policy_to_role "$s3_ecr_role_name" "$ecr_policy_name" "$s3_policy_name"
attach_policy_to_role "$ecr_pull_role_name" "$ecr_pull_only_policy_name"

# ──────────────── Output ECR repo ────────────────
repo_uri="${account_id}.dkr.ecr.${region}.amazonaws.com/${repo_name}"

cat <<EOM

✅ Done!
──────────────────────────────────────────────
AWS Region         : ${region}
EKS Cluster Name   : ${cluster_name}
ECR Repo Name      : ${repo_name}
S3 Bucket          : ${bucket_name}
──────────────────────────────────────────────
ECR Repository     : ${repo_uri}
──────────────────────────────────────────────
EOM

echo "🎯 Final IAM Role ARNs:"
echo "──────────────────────────────────────────────"
for role_name in "$s3_role_name" "$s3_ecr_role_name" "$ecr_pull_role_name"; do
  role_arn=$(aws iam get-role --role-name "$role_name" --query 'Role.Arn' --output text)
  echo "  - $role_name: $role_arn"
done
echo "──────────────────────────────────────────────"

# Prompt for namespace (default to 'default')
read -rp "Namespace for the ServiceAccounts [default: default]: " sa_namespace
sa_namespace=${sa_namespace:-default}

echo ""
echo "📦 Namespace confirmed: $sa_namespace"

echo ""
echo "🔧 Please confirm or customize the ServiceAccount names in namespace '$sa_namespace':"

read -rp "ServiceAccount for dify-api [default: dify-api-sa]: " sa_api
sa_api=${sa_api:-dify-api-sa}

read -rp "ServiceAccount for dify-plugin-crd [default: dify-plugin-crd-sa]: " sa_crd
sa_crd=${sa_crd:-dify-plugin-crd-sa}

read -rp "ServiceAccount for dify-plugin-runner [default: dify-plugin-runner-sa]: " sa_runner
sa_runner=${sa_runner:-dify-plugin-runner-sa}

# ─── Get current cluster name from kubectl context ───
current_context=$(kubectl config current-context)
echo "🔎 kubectl is currently pointing to cluster '$current_context'"

# ─── Compare current with target ───
if [[ "$current_context" != "$cluster_arn" ]]; then
  echo "⚠️  Your current kubectl context is pointing to cluster: $current_context"
  echo "🔁 But you specified target cluster: $cluster_name"

  while true; do
    read -rp "❓ Do you want to switch kubectl to '$cluster_name'? [Y/n]: " switch
    switch=${switch:-Y}
    if [[ "$switch" =~ ^[Yy]$ ]]; then
      echo "🔄 Switching context..."
      aws eks update-kubeconfig --name "$cluster_name"
      break
    elif [[ "$switch" =~ ^[Nn]$ ]]; then
      echo "❌ Aborted. Please switch cluster manually or rerun with correct cluster."
      exit 1
    else
      echo "❗ Please enter Y or N."
    fi
  done
else
  echo "✅ kubectl is already pointing to EKS cluster '$cluster_name'"
fi

assign_role_to_sa() {
  local role_name="$1"
  local sa_name="$2"
  local namespace="$3"
  local role_arn="arn:aws:iam::${account_id}:role/${role_name}"

  echo ""
  echo "🔍 Checking if ServiceAccount '$sa_name' exists in namespace '$namespace'..."
  if kubectl get sa "$sa_name" -n "$namespace" >/dev/null 2>&1; then
    echo "✅ ServiceAccount '$sa_name' already exists in '$namespace'."
  else
    echo "🚀 Creating ServiceAccount '$sa_name' in '$namespace'..."
    kubectl create sa "$sa_name" -n "$namespace"
    echo "✅ ServiceAccount '$sa_name' created."
  fi
  echo "🔗 Annotating '$sa_name' with IRSA role..."
  kubectl annotate serviceaccount "$sa_name" \
    -n "$namespace" \
    eks.amazonaws.com/role-arn="$role_arn" \
    --overwrite
}

assign_role_to_sa "$s3_role_name" "$sa_api" "$sa_namespace"
assign_role_to_sa "$s3_ecr_role_name" "$sa_crd" "$sa_namespace"
assign_role_to_sa "$ecr_pull_role_name" "$sa_runner" "$sa_namespace"



# Dify Enterprise on AWS

Deploy Dify Enterprise on AWS using CDK.

![1719058485616](images/README/infra.jpg)

## Components

### Testing Deployment

| **Component**       | **Helm Chart Value** | **Count** | **vCPU** | **Memory (GB)** | **Storage (GB)** | **Notes** |
| ------------------- | -------------------- | --------- | -------- | --------------- | ---------------- | --------- |
| S3                  | persistence          | 1         |          |                 |                  |           |
| Redis DB            | externalRedis        | 1         | 2        | 6.38            |                  |           |
| RDS Postgres DB     | externalPostgres     | 2         | 2        | 8               |                  |           |
| K8S Worker Node     |                      | 1         | 4        | 16              | 100              |           |
| EC2 (for Vector DB) | vectorDB             | 1         | 4        | 8               | 100              |           |

### Production Deployment

| **Component**       | **Helm Chart Value** | **Count** | **vCPU** | **Memory (GB)** | **Storage (GB)** | **Notes** |
| ------------------- | -------------------- | --------- | -------- | --------------- | ---------------- | --------- |
| S3                  | persistence          | 1         |          |                 |                  |           |
| Redis DB            | externalRedis        | 1         | 2        | 12.93           |                  |           |
| RDS Postgres DB     | externalPostgres     | 1         | 4        | 32              |                  |           |
| K8S Worker Node     |                      | 6         | 8        | 32              | 100              |           |
| EC2 (for Vector DB) | vectorDB             | 3         | 16       | 64              | 100              |           |

## Deployment

1. **Configure AWS CLI:**

   Install and configure the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html):

   ```bash
   aws configure
   ```

2. **Clone this repository:**

   ```bash
   git clone https://github.com/langgenius/aws-cdk-for-dify.git
   ```

3. **Install NodeJS Dependencies:**

   ```bash
   npm install
   ```

4. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Modify the environment variable values in the `.env` file.

   - `ENVIRONMENT`: Specifies the deployment environment; must be either `test` or `prod`.
   - `CDK_DEFAULT_REGION`: The AWS region where Dify Enterprise will be deployed.
   - `CDK_DEFAULT_ACCOUNT`: Your AWS account ID.
   - `DEPLOY_VPC_ID`: The ID of an existing VPC for deployment. If not set, CDK will create one for you.
   - Subnets Configuration (`DEPLOY_VPC_ID` required, comma-separated without spaces):
     - `EKS_CLUSTER_SUBNETS`: Subnet IDs for the EKS control plane. Requires at least 2 subnets in different Availability Zones (AZs).
     - `EKS_NODES_SUBNETS`: Subnet IDs for the EKS worker nodes. Requires at least 2 subnets in different AZs.
     - `REDIS_SUBNETS`: Subnet IDs for Redis deployment.
     - `RDS_SUBNETS`: subnet ids for RDS database. (At least 2 with different AZs)
     - `OPENSEARCH_SUBNETS`: Subnet IDs for OpenSearch deployment.
   - `AWS_EKS_CHART_REPO_URL`: (For AWS China regions ONLY) The AWS EKS Helm chart repository URL.
   - `RDS_PUBLIC_ACCESSIBLE`: Set to `true` to make RDS publicly accessible (NOT RECOMMENDED).

   **Note:**
   - If you are using AWS China regions, you must configure the `AWS_EKS_CHART_REPO_URL` for proper functionality. Please contact Dify Team for the URL.
   - It is recommended to use an existing VPC for easier resource access.

5. **CDK Bootstrap:**

   Initialize the CDK environment:

   ```bash
   npm run init
   ```

6. **CDK Deploy:**
   - Deploy Dify Enterprise:

     ```bash
     npm run deploy
     ```

7. **Update AWS EKS Access Permissions:**

   1. Navigate to the EKS Cluster panel, select the "Access" menu, and click on "Manage access":
        ![Dify-Testing-DifyStackTest-EKS](images/README/eks-access-panel.png)
   2. In the "Manage access" dialog, select "EKS API and ConfigMap," then click "Save Changes."
   3. In the IAM Access Entries panel, click "Create access entry":
        ![IAM access entries](images/README/eks-iam-access.png)
   4. Add your IAM user and assign the following permissions:
        - `AmazonEKSAdminPolicy`
        - `AmazonEKSAdminViewPolicy`
        - `AmazonEKSClusterAdminPolicy`

8. **Configure `kubeconfig` to access the Kubernetes (K8S) cluster locally:**

   ```bash
   aws eks update-kubeconfig --region <cn-northwest-1> --name <Dify-Testing-DifyStackTest-EKS>
   ```

   Adjust the `region` and `name` parameters according to your deployment:
   - **region:** The AWS region where your cluster is deployed.
   - **name:** The EKS cluster name (`Dify-Testing-DifyStackTest-EKS` or `Dify-Production-DifyStackProd-EKS`).

9. **AWS Load Balancer Configuration**

    It is recommended to use an AWS Application Load Balancer (ALB) for your ingress configuration in the Helm `values.yaml` file. To enable it, modify the `ingress` section as follows:

    ```yaml
    ingress:
        enabled: true
        className: "alb"
        annotations: {
            # Existing annotations
            ...
            # Add the following annotations
            alb.ingress.kubernetes.io/target-type: "ip",
            alb.ingress.kubernetes.io/scheme: "internet-facing",
        }
    ```

10. **Initialize Postgres Databases**

    Before installing Helm charts, you need to create the necessary databases in your RDS instance. These database names should correspond to the values specified in the `externalPostgres` field of the Helm `values.yaml` file.

11. **CDK Destroy:**

    Destroy the deployment for the environment specified in the `.env` file under `ENVIRONMENT`.

    ```bash
    npm run destroy
    ```

12. **Advanced Configuration**

    To customize deployment configurations, modify the [test.ts](./configs/test.ts) file for the testing environment or the [prod.ts](./configs/prod.ts) file for the production environment.

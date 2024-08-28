
export const AWS_EKS_CHART_REPO_URL = process.env.AWS_EKS_CHART_REPO_URL || 'https://aws.github.io/eks-charts';
export const DESTROY_WHEN_REMOVE = process.env.GLOBAL_REMOVE_WHEN_DESTROYED === 'true' || false;
export const PRODUCT_NAME = 'Dify';

/**
 * Instance map for the EC2 instances
 * See https://aws.amazon.com/ec2/instance-types for more information
 * 
 * c - vCPUs, m - Memory in GB
 */
export const EC2_INSTANCE_MAP = {
  '2c8m': 'm7g.large',
  '4c16m': 'm7g.xlarge',
  '8c32m': 'm7g.2xlarge',
  '16c64m': 'm7g.4xlarge',
  '32c128m': 'm7g.8xlarge',

  '2c4m': 'c7g.large',
  '4c8m': 'c7g.xlarge',
  '8c16m': 'c7g.2xlarge',
  '16c32m': 'c7g.4xlarge',
  '32c64m': 'c7g.8xlarge',
}

/**
 * Redis node map
 * See https://aws.amazon.com/elasticache/pricing/ for more information
 * Assume 2 vCPUs.
 * 
 * c - vCPUs, m - Memory in GB
 */
export const REDIS_NODE_MAP = {
  '6.38m': 'cache.m6g.large',
  '12.93m': 'cache.m6g.xlarge',
}

/**
 * Aurora instance map
 * See https://aws.amazon.com/rds/aurora/pricing/ for more information
 * Please note that not all instance types may be supported in every region, 
 * You can find the available instance types on the AWS RDS creation page.
 * 
 * c - vCPUs, m - Memory in GB
 */
export const RDS_INSTANCE_MAP = {
  '2c8m': 'm5.large',
  '4c32m': 'r5.xlarge',
}

/**
 * OpenSearch instance map
 * See https://aws.amazon.com/opensearch-service/pricing/ for more information
 * Please note that not all instance types may be supported in every region, 
 * You can find the available instance types on the AWS OpenSearch creation page.
 * 
 * c - vCPUs, m - Memory in GB
 */
export const OPENSEARCH_INSTANCE_MAP = {
  '16c64m': 'm7g.4xlarge.search',
  '8c16m': 'c6g.2xlarge.search',
  '2c8m': 'm6g.large.search',
  '4c16m': 'm6g.xlarge.search',
}
import { EksClusterConfig, EksTaintsConfig } from './constructs/eksConfig';
import { OpenSearchConfig } from './constructs/openSearchConfig';
import { PostgresSQLConfig } from './constructs/postgresConfig';
import { RedisConfig } from './constructs/redisConfig';
import { S3Config } from './constructs/s3Config';

/**
 * Basic configuration for a stack
 */
export interface StackConfig {
  environment: "Testing" | "Production";
  region: string;
  account: string;

  // Taints for the EKS cluster
  taints: EksTaintsConfig;

  // EKS cluster config
  cluster: EksClusterConfig;

  // s3 bucket config
  s3: S3Config;

  // AuroraPGSQL config
  postgresSQL: PostgresSQLConfig;

  // Redis config
  redis: RedisConfig;

  // OpenSearch config
  openSearch: OpenSearchConfig;
}
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';

export interface OpenSearchConfig {
  enabled: boolean,
  version: opensearch.EngineVersion | undefined,
  masterNodes: number | undefined,
  masterNodeType: string | undefined,
  dataNodes: number | undefined,
  dataNodeType: string | undefined,
  dataNodeSize: number | undefined
}
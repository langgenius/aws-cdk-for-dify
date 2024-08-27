import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';

export interface OpenSearchConfig {
  enabled: boolean, // Whether to enable OpenSearch
  version: opensearch.EngineVersion | undefined, // The version of OpenSearch to use
  masterNodes: number | undefined, // The number of master nodes
  masterNodeType: string | undefined, // The instance type of the master nodes, see // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
  dataNodes: number | undefined, // The number of data nodes
  dataNodeType: string | undefined, // The instance type of the data nodes, see https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
  dataNodeSize: number | undefined // The storage size of the data nodes, in GB
}

export interface OpenSearchConfig {
  enabled: boolean, // Whether to enable OpenSearch
  multiAz: {
    enabled: boolean, // Whether to enable multi-AZ
    azCount: 2 | 3, // The number of availability zones to deploy the OpenSearch domain
  }
  subnetIds: string[], // The subnet IDs to deploy the OpenSearch domain
  capacity: {
    dataNodes: number | undefined, // The number of data nodes
    dataNodeInstanceType: string | undefined, // The instance type of the data nodes, see https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
    masterNodes?: number | undefined, // The number of master nodes
    masterNodeInstanceType?: string | undefined, // The instance type of the master nodes, see https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
  }
  dataNodeSize: number | undefined // The storage size of the data nodes, in GB
}
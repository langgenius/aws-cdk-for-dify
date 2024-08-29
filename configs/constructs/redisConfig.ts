
export interface RedisConfig {
  nodeType: string; // node type for the Redis cluster
  subnetIds: string[]; // list of subnet IDs
  multiAZ: {
    enabled: boolean; // whether to enable multi-AZ
    subnetGroupName: string; // name of the subnet group
  }
  parameterGroup: string; // name of the parameter group
  engineVersion: string; // version of the engine
  readReplicas: number; // number of read replicas
}
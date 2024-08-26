
export interface RedisConfig {
  nodeType: string; // node type for the Redis cluster
  multiAZ: boolean; // whether to enable multi-AZ
  parameterGroup: string; // name of the parameter group
  engineVersion: string; // version of the engine
  readReplicas: number; // number of read replicas
}
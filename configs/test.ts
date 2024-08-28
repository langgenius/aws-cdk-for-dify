import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { EC2_INSTANCE_MAP, RDS_INSTANCE_MAP, REDIS_NODE_MAP } from "./constants";
import { StackConfig } from "./stackConfig";


/**
 * Configuration for the test stack
 */
export interface TestStackConfig extends StackConfig {

}

export const testConfig: TestStackConfig = {
  environment: 'Testing',
  region: process.env.CDK_TESTING_REGION || process.env.CDK_DEFAULT_REGION || '',
  account: process.env.CDK_TESTING_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '',

  cluster: {
    version: KubernetesVersion.V1_29,
    tags: { "marketplace": "dify" },
    managedNodeGroups: {
      app: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 1,
        instanceType: new InstanceType(EC2_INSTANCE_MAP['4c16m']),
        diskSize: 100,
      }
    },
  },

  s3: {
    removeWhenDestroyed: false,
  },

  postgresSQL: {
    version: PostgresEngineVersion.VER_14_9,
    instanceType: new InstanceType(RDS_INSTANCE_MAP['2c8m']),
    dbName: 'postgres',
    dbCredentialUsername: 'clusteradmin',
    backupRetention: 0,
    storageSize: 256,
    removeWhenDestroyed: true,
  },

  redis: {
    engineVersion: "6.2",
    parameterGroup: "default.redis6.x",
    nodeType: REDIS_NODE_MAP['6.38m'],
    readReplicas: 1,
    multiAZ: true
  },

  openSearch: {
    enabled: true,
    capacity: {
      dataNodes: 2,
      dataNodeInstanceType: 'r6g.large.search',
      multiAzWithStandbyEnabled: true,
    },
    dataNodeSize: 100
  }

}

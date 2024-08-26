import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { EC2_INSTANCE_MAP, RDS_INSTANCE_MAP, REDIS_NODE_MAP } from "./constants";
import { StackConfig } from "./stackConfig";

export interface ProdStackConfig extends StackConfig {

}

export const prodConfig: ProdStackConfig = {
  environment: 'Production',
  region: process.env.CDK_PROD_REGION || process.env.CDK_DEFAULT_REGION || '',
  account: process.env.CDK_PROD_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '',

  taints: {
    vectorDb: {
      key: 'vectordb',
      value: 'true',
    }
  },

  cluster: {
    version: KubernetesVersion.V1_29,
    tags: { "marketplace": "dify" },
    managedNodeGroups: {
      app: {
        desiredSize: 3,
        minSize: 1,
        maxSize: 6,
        instanceType: new InstanceType(EC2_INSTANCE_MAP['8c32m']),
        diskSize: 100,
      },
      db: {
        desiredSize: 3,
        minSize: 1,
        maxSize: 3,
        instanceType: new InstanceType(EC2_INSTANCE_MAP['8c64m']),
        diskSize: 100,
      }
    },
  },

  s3: {
    removeWhenDestroyed: false,
  },

  postgresSQL: {
    version: PostgresEngineVersion.VER_14_9,
    instanceType: new InstanceType(RDS_INSTANCE_MAP['4c32m']),
    dbName: 'postgres',
    dbCredentialUsername: 'clusteradmin',
    backupRetention: 0,
    storageSize: 512,
    removeWhenDestroyed: false,
  },

  redis: {
    engineVersion: "6.2",
    parameterGroup: "default.redis6.x",
    nodeType: REDIS_NODE_MAP['12.93m'],
    readReplicas: 1,
    multiAZ: true
  },

}
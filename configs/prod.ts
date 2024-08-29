import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { DESTROY_WHEN_REMOVE, EC2_INSTANCE_MAP, RDS_INSTANCE_MAP, REDIS_NODE_MAP } from "./constants";
import { StackConfig } from "./stackConfig";

export interface ProdStackConfig extends StackConfig {

}

export const prodConfig: ProdStackConfig = {
  environment: 'Production',
  region: process.env.CDK_PROD_REGION || process.env.CDK_DEFAULT_REGION || '',
  account: process.env.CDK_PROD_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '',

  cluster: {
    version: KubernetesVersion.V1_30,
    tags: { "marketplace": "dify" },
    // at least 2 ids
    // [],
    vpcSubnetIds: process.env.EKS_CLUSTER_SUBNETS?.split(',') || [],
    managedNodeGroups: {
      app: {
        desiredSize: 3,
        minSize: 1,
        maxSize: 6,
        instanceType: new InstanceType(EC2_INSTANCE_MAP['8c32m']),
        diskSize: 100,
        // at least 2 ids
        workerNodeSubnetIds: process.env.EKS_NODES_SUBNETS?.split(',') || []
      }
    },
  },

  s3: {
    removeWhenDestroyed: DESTROY_WHEN_REMOVE || false,
  },

  postgresSQL: {
    version: PostgresEngineVersion.VER_14_9,
    instanceType: new InstanceType(RDS_INSTANCE_MAP['4c32m']),
    dbName: 'postgres',
    dbCredentialUsername: 'clusteradmin',
    backupRetention: 0,
    storageSize: 512,
    removeWhenDestroyed: DESTROY_WHEN_REMOVE,
    // at least 2 ids
    subnetIds: process.env.RDS_SUBNETS?.split(',') || [],
    multiAz: {
      enabled: false,
      subnetGroupName: ''
    }
  },

  redis: {
    engineVersion: "6.2",
    parameterGroup: "default.redis6.x",
    nodeType: REDIS_NODE_MAP['12.93m'],
    readReplicas: 1,
    subnetIds: process.env.REDIS_SUBNETS?.split(',') || [],
    multiAZ: {
      enabled: false,
      subnetGroupName: ''
    },
  },

  openSearch: {
    enabled: true,
    multiAz: {
      enabled: false,
      azCount: 2
    },
    subnetIds: process.env.OPENSEARCH_SUBNETS?.split(',') || [],
    capacity: {
      dataNodes: 2,
      dataNodeInstanceType: 'r6g.large.search',
      // masterNodes: 2,
      // masterNodeInstanceType: 'r6g.xlarge.search'
    },
    dataNodeSize: 100
  }

}
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { DESTROY_WHEN_REMOVE, EC2_INSTANCE_MAP, RDS_INSTANCE_MAP, REDIS_NODE_MAP } from "./constants";
import { StackConfig } from "./stackConfig";


/**
 * Configuration for the test stack
 */
export interface TestStackConfig extends StackConfig {

}

export const testConfig: TestStackConfig = {
  environment: 'Test',
  region: process.env.CDK_TESTING_REGION || process.env.CDK_DEFAULT_REGION || '',
  account: process.env.CDK_TESTING_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '',

  cluster: {
    version: KubernetesVersion.V1_31,
    tags: { "marketplace": "dify" },
    // at least 2 ids
    vpcSubnetIds: process.env.EKS_CLUSTER_SUBNETS?.trim().split(',').filter(id => id.length > 0) || [],
    managedNodeGroups: {
      app: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 1,
        instanceType: new InstanceType(EC2_INSTANCE_MAP['4c16m']),
        diskSize: 100,
        // at least 2 ids
        workerNodeSubnetIds: process.env.EKS_NODES_SUBNETS?.trim().split(',').filter(id => id.length > 0) || [],
      }
    },
  },

  s3: {
    removeWhenDestroyed: DESTROY_WHEN_REMOVE || false,
  },

  postgresSQL: {
    version: PostgresEngineVersion.VER_14,
    instanceType: new InstanceType(RDS_INSTANCE_MAP['2c8m']),
    dbName: 'postgres',
    dbCredentialUsername: 'clusteradmin',
    backupRetention: 0,
    storageSize: 256,
    removeWhenDestroyed: true,
    // at least 2 ids
    subnetIds: process.env.RDS_SUBNETS?.trim().split(',').filter(id => id.length > 0) || [],
    multiAz: {
      enabled: false,
      subnetGroupName: ''
    }
  },

  redis: {
    engineVersion: "6.2",
    parameterGroup: "default.redis6.x",
    nodeType: REDIS_NODE_MAP['6.38m'],
    readReplicas: 1,
    subnetIds: process.env.REDIS_SUBNETS?.trim().split(',').filter(id => id.length > 0) || [],
    multiAZ: {
      enabled: false,
      subnetGroupName: ''
    }
  },

  openSearch: {
    enabled: true,
    multiAz: {
      enabled: false,
      azCount: 2
    },
    subnetIds: process.env.OPENSEARCH_SUBNETS?.trim().split(',').filter(id => id.length > 0) || [],
    capacity: {
      dataNodes: 2,
      dataNodeInstanceType: 'r6g.large.search',
    },
    dataNodeSize: 100
  }

}

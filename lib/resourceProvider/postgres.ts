import { ResourceContext, ResourceProvider } from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { getConstructPrefix } from '../../configs';
import { StackConfig } from '../../configs/stackConfig';


export interface PostgresSQLProps {
  vpc: ec2.IVpc,
  config: StackConfig,
}

export class PostgresSQLResourceProvider implements ResourceProvider<rds.DatabaseInstance> {
  private readonly config: StackConfig;
  private readonly vpc: ec2.IVpc;

  constructor(readonly props: PostgresSQLProps) {
    this.config = props.config;
    this.vpc = props.vpc
  }

  provide(context: ResourceContext): rds.DatabaseInstance {
    const dbCred = rds.Credentials.fromUsername(this.config.postgresSQL.dbCredentialUsername);

    const dbSecurityGroup = new ec2.SecurityGroup(context.scope, `${getConstructPrefix(this.config)}-PostgresRDSInstanceSG`, {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      dbSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic inside SG"
    )

    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      "Allow access to the DB from the VPC"
    );

    const postgresInstance = new rds.DatabaseInstance(context.scope, `${getConstructPrefix(this.config)}-PostgresRDSInstance`, {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.config.postgresSQL.version,
      }),
      instanceType: this.config.postgresSQL.instanceType,
      vpc: this.vpc,
      securityGroups: [dbSecurityGroup],
      credentials: dbCred,
      storageEncrypted: true,
      allocatedStorage: this.config.postgresSQL.storageSize,
      databaseName: this.config.postgresSQL.dbName,
      storageType: rds.StorageType.GP2,
      removalPolicy: this.config.postgresSQL.removeWhenDestroyed ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      publiclyAccessible: false,
      backupRetention: cdk.Duration.days(this.config.postgresSQL.backupRetention),
    });

    return postgresInstance;
  }
}
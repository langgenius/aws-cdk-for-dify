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
    const publiclyAccessible = process.env.RDS_PUBLIC_ACCESSIBLE === 'true' || false;
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

    if (publiclyAccessible) {
      dbSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(5432),
        "Allow access to the DB from the Internet"
      );
    }

    let vpcSubnets: ec2.SubnetSelection;
    const multiAz = this.config.postgresSQL.multiAz;

    if (multiAz.enabled) {
      // Multi-AZ deployment: Use either user-defined subnets or private subnets across multiple AZs
      if (this.config.postgresSQL.subnetIds && this.config.postgresSQL.subnetIds.length > 0) {
        const selectedSubnets = this.config.postgresSQL.subnetIds.map(id =>
          ec2.Subnet.fromSubnetId(this.vpc, `Subnet-${id}`, id)
        );
        vpcSubnets = { subnets: selectedSubnets };

        console.log(`PostgresSQL: using subnets: ${selectedSubnets.map(subnet => subnet.subnetId).join(', ')}`);
      } else if (multiAz.subnetGroupName) {
        // Use a specific subnet group for multi-AZ
        vpcSubnets = { subnetGroupName: multiAz.subnetGroupName };
        console.log(`PostgresSQL: using subnet group: ${multiAz.subnetGroupName}`);
      } else {
        // Fallback to default behavior
        vpcSubnets = {
          subnetType: publiclyAccessible ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS,
        };

        console.log(`PostgresSQL: using default subnets (${publiclyAccessible ? 'public' : 'private'})`);
      }
    } else {
      // Single-AZ deployment: Use the first two available subnets or a user-provided subnets
      if (this.config.postgresSQL.subnetIds && this.config.postgresSQL.subnetIds.length > 0) {
        const subnets = this.config.postgresSQL.subnetIds.slice(0, 2);
        vpcSubnets = {
          subnets: subnets.map(id => ec2.Subnet.fromSubnetId(this.vpc, `Subnet-${id}`, id)),
        };

        console.log(`PostgresSQL: using subnets: ${subnets.join(', ')}`);
      } else {
        vpcSubnets = {
          subnetType: publiclyAccessible ? ec2.SubnetType.PUBLIC : ec2.SubnetType.PRIVATE_WITH_EGRESS,
        };

        console.log(`PostgresSQL: using default subnets (${publiclyAccessible ? 'public' : 'private'})`);
      }
    }

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
      publiclyAccessible: publiclyAccessible,
      vpcSubnets: vpcSubnets,
      multiAz: multiAz.enabled,
      backupRetention: cdk.Duration.days(this.config.postgresSQL.backupRetention),
    });

    return postgresInstance;
  }
}
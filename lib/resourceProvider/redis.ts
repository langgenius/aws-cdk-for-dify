import { ResourceContext, ResourceProvider } from '@aws-quickstart/eks-blueprints';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { getConstructPrefix } from '../../configs';
import { StackConfig } from '../../configs/stackConfig';

export interface RedisProps {
  vpc: ec2.IVpc,
  config: StackConfig,
}

export class RedisResourceProvider implements ResourceProvider<elasticache.CfnReplicationGroup> {
  private readonly config: StackConfig;
  private readonly vpc: ec2.IVpc;

  constructor(readonly props: RedisProps) {
    this.config = props.config;
    this.vpc = props.vpc
  }

  provide(context: ResourceContext): elasticache.CfnReplicationGroup {

    const ecSecurityGroup = new ec2.SecurityGroup(context.scope, `${getConstructPrefix(this.config)}-RedisSG`, {
      vpc: this.vpc,
      description: 'SecurityGroup associated with Redis Cluster ' + getConstructPrefix(this.config),
      allowAllOutbound: true,
    });

    ecSecurityGroup.addIngressRule(
      ecSecurityGroup,
      ec2.Port.allTraffic(),
      "Allow all traffic inside SG"
    )

    ecSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.props.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      "Allow access to Redis from the VPC"
    )

    let subnetIds: string[];
    const multiAz = this.config.redis.multiAZ;

    if (multiAz.enabled) {
      // Multi-AZ deployment: Use either user-defined subnets or private subnets across multiple AZs
      if (this.config.redis.subnetIds && this.config.redis.subnetIds.length > 0) {
        subnetIds = this.config.redis.subnetIds;
        console.log(`Redis: using subnets: ${subnetIds.join(', ')}`);
      } else if (this.config.redis.multiAZ.subnetGroupName) {
        // Use a specific subnet group name if provided (Note: This is a name, not IDs)
        subnetIds = this.vpc.selectSubnets({ subnetGroupName: this.config.redis.multiAZ.subnetGroupName }).subnetIds;
        console.log(`Redis: using subnetGroupName: ${this.config.redis.multiAZ.subnetGroupName}`);
      } else {
        // Fallback to default private subnets for multi-AZ
        subnetIds = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds;
        console.log(`Redis: using default private subnets: ${subnetIds.join(', ')}`);
      }
    } else {
      // Single-AZ deployment: Use the first available subnet or a user-provided subnet
      if (this.config.redis.subnetIds && this.config.redis.subnetIds.length > 0) {
        subnetIds = [this.config.redis.subnetIds[0]];
        console.log(`Redis: using subnet: ${subnetIds[0]}`);
      } else {
        subnetIds = [this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds[0]];
        console.log(`Redis: using default private subnet: ${subnetIds[0]}`);
      }
    }

    const ecSubnetGroup = new elasticache.CfnSubnetGroup(context.scope, `${getConstructPrefix(this.config)}-RedisSubnetGroup`, {
      description: 'Redis Subnet Group',
      subnetIds: subnetIds,
      cacheSubnetGroupName: `${getConstructPrefix(this.config)}-RedisSubnetGroup`,
    });

    const redis_cluster = new elasticache.CfnReplicationGroup(context.scope, `${getConstructPrefix(this.config)}-Redis`, {
      cacheNodeType: this.config.redis.nodeType,
      engine: 'Redis',
      multiAzEnabled: multiAz.enabled,
      cacheParameterGroupName: this.config.redis.parameterGroup,
      engineVersion: this.config.redis.engineVersion,
      cacheSubnetGroupName: ecSubnetGroup.cacheSubnetGroupName!,
      securityGroupIds: [ecSecurityGroup.securityGroupId],
      replicationGroupDescription: 'Redis cluster',
      replicasPerNodeGroup: this.config.redis.readReplicas,
    });

    redis_cluster.node.addDependency(ecSubnetGroup)
    redis_cluster.node.addDependency(ecSecurityGroup)

    return redis_cluster

  }
}
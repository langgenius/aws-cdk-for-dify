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

    let subnets: string[] = [];
    this.vpc.privateSubnets.forEach(function (value) {
      subnets.push(value.subnetId);
    });

    const ecSubnetGroup = new elasticache.CfnSubnetGroup(context.scope, `${getConstructPrefix(this.config)}-RedisSubnetGroup`, {
      description: 'Redis Subnet Group',
      subnetIds: subnets,
      cacheSubnetGroupName: `${getConstructPrefix(this.config)}-RedisSubnetGroup`,
    });

    const redis_cluster = new elasticache.CfnReplicationGroup(context.scope, `${getConstructPrefix(this.config)}-Redis`, {
      cacheNodeType: this.config.redis.nodeType,
      engine: 'Redis',
      multiAzEnabled: this.config.redis.multiAZ,
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
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import { getConstructPrefix } from '../../configs';
import { DESTROY_WHEN_REMOVE } from '../../configs/constants';
import { StackConfig } from '../../configs/stackConfig';

interface OpenSearchProps {
  config: StackConfig,
  vpc: ec2.IVpc,
}


export class OpensearchResourceProvider implements blueprints.ResourceProvider<opensearch.IDomain> {
  private readonly config: StackConfig;
  private readonly vpc: ec2.IVpc;

  constructor(readonly props: OpenSearchProps) {
    this.vpc = props.vpc;
    this.config = props.config;
  }

  provide(context: blueprints.ResourceContext): opensearch.IDomain {
    const selectedSubnet = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
    }).subnets[0];

    const domain = new opensearch.Domain(context.scope, `${getConstructPrefix(this.config)}-OpensearchDomain`, {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      vpcSubnets: [{ subnets: [selectedSubnet] }],
      removalPolicy: DESTROY_WHEN_REMOVE ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      capacity: {
        dataNodes: this.config.openSearch.dataNodes,
        dataNodeInstanceType: this.config.openSearch.dataNodeType,
        masterNodes: this.config.openSearch.masterNodes,
        masterNodeInstanceType: this.config.openSearch.masterNodeType,
        multiAzWithStandbyEnabled: false,
      },
      ebs: {
        volumeSize: this.config.openSearch.dataNodeSize,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        throughput: 125,
        iops: 3000,
      },
      vpc: this.vpc
    });
    return domain
  }
}
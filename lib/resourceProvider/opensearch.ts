import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import { getConstructPrefix } from '../../configs';
import { StackConfig } from '../../configs/stackConfig';

interface OpenSearchProps {
  config: StackConfig,
  vpc: ec2.IVpc,
  version: opensearch.EngineVersion,
  masterNodes: number,
  masterNodeType: string,
  dataNodes: number,
  dataNodeType: string,
  dataNodeSize: number
}


export class OpensearchResourceProvider implements blueprints.ResourceProvider<opensearch.IDomain> {
  private readonly config: StackConfig;

  constructor(readonly props: OpenSearchProps) {
    this.config = props.config;
  }

  provide(context: blueprints.ResourceContext): opensearch.IDomain {
    const domain = new opensearch.Domain(context.scope, `${getConstructPrefix(this.config)}-OpensearchDomain`, {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      capacity: {
        dataNodes: this.props.dataNodes,
        dataNodeInstanceType: this.props.dataNodeType,
        masterNodes: this.props.masterNodes,
        masterNodeInstanceType: this.props.masterNodeType,
      },
      ebs: {
        volumeSize: this.props.dataNodeSize,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        throughput: 125,
        iops: 3000,
      },
      vpc: this.props.vpc
    });
    return domain
  }
}
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
    const { multiAz, subnetIds, capacity, dataNodeSize } = this.config.openSearch;

    let selectedSubnets: ec2.ISubnet[];

    if (multiAz.enabled) {
      // If multi-AZ is enabled, use either user-provided subnet IDs or private subnets of specified availabilityZoneCount
      selectedSubnets = subnetIds && subnetIds.length > 0
        ? subnetIds.map(id => ec2.Subnet.fromSubnetId(this.vpc, `Subnet-${id}`, id))
        : this.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }).subnets.slice(0, multiAz.azCount);

      if (selectedSubnets.length !== multiAz.azCount) {
        throw new Error(`The number of provided subnets (${selectedSubnets.length}) does not match the required availability zones (${multiAz.azCount}).`);
      }

      console.log(`OpenSearch: using subnets: ${selectedSubnets.map(subnet => subnet.subnetId).join(', ')}`);
    } else {
      // If multi-AZ is not enabled, use the first available subnet or a user-provided subnet
      selectedSubnets = subnetIds && subnetIds.length > 0
        ? [ec2.Subnet.fromSubnetId(this.vpc, `Subnet-${subnetIds[0]}-OpenSearch`, subnetIds[0])]
        : this.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }).subnets.slice(0, 1);

      console.log(`OpenSearch: using subnet: ${selectedSubnets[0].subnetId}`);
    }

    // Security group for the OpenSearch domain
    const domainSecurityGroup = new ec2.SecurityGroup(context.scope, `${getConstructPrefix(this.config)}-OpenSearchSG`, {
      vpc: this.vpc,
      description: 'SecurityGroup associated with OpenSearch Domain ' + getConstructPrefix(this.config),
      allowAllOutbound: true,
    });
    domainSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "Allow HTTPS access to OpenSearch from the VPC"
    );
    domainSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(9200),
      "Allow OpenSearch traffic"
    )

    const domainProps: opensearch.DomainProps = {
      version: opensearch.EngineVersion.OPENSEARCH_2_13,
      removalPolicy: DESTROY_WHEN_REMOVE ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      vpcSubnets: [{ subnets: selectedSubnets }],
      capacity: {
        ...capacity,
        multiAzWithStandbyEnabled: multiAz.enabled,
      },
      securityGroups: [domainSecurityGroup],
      ebs: {
        volumeSize: dataNodeSize,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        throughput: 125,
        iops: 3000,
      },
      zoneAwareness: {
        enabled: multiAz.enabled,
        availabilityZoneCount: multiAz.azCount,
      },
      vpc: this.vpc,
    };

    const domain = new opensearch.Domain(context.scope, `${getConstructPrefix(this.config)}-OpensearchDomain`, domainProps);
    return domain;
  }
}
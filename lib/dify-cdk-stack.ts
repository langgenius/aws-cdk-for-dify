import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { getConstructPrefix } from '../configs';
import { AWS_EKS_CHART_REPO_URL } from '../configs/constants';
import { StackConfig } from '../configs/stackConfig';
import { OpensearchResourceProvider } from './resourceProvider/opensearch';
import { PostgresSQLResourceProvider } from './resourceProvider/postgres';
import { RedisResourceProvider } from './resourceProvider/redis';
import { S3ResourceProvider } from './resourceProvider/s3';

export interface DifyStackProps {
  vpc: IVpc;
  config: StackConfig;
  extraValues?: object;
}

export class DifyStackConstruct {
  id: string;
  scope: Construct;
  difyProps: DifyStackProps;
  props?: cdk.StackProps;

  constructor(scope: Construct, id: string, difyProps: DifyStackProps, props: cdk.StackProps) {
    this.scope = scope;
    this.id = id;
    this.difyProps = difyProps;
    this.props = props;
  }
  build() {
    const scope = this.scope;
    const id = this.id;
    const difyProps = this.difyProps;
    const config = difyProps.config;

    const clusterProvider = new blueprints.GenericClusterProvider({
      version: config.cluster.version,
      tags: config.cluster.tags,
      managedNodeGroups: [
        { // worker node group for app
          id: 'app',
          desiredSize: config.cluster.managedNodeGroups.app.desiredSize,
          minSize: config.cluster.managedNodeGroups.app.minSize,
          maxSize: config.cluster.managedNodeGroups.app.maxSize,
          instanceTypes: [config.cluster.managedNodeGroups.app.instanceType],
          amiType: eks.NodegroupAmiType.AL2_ARM_64,
          nodeGroupSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
          enableSsmPermissions: true,
          tags: {
            "Name": cdk.Aws.STACK_NAME + "-Workload",
            "stack": cdk.Aws.STACK_NAME
          },
          diskSize: config.cluster.managedNodeGroups.app.diskSize,
        }
      ]
    })

    const addOns: Array<blueprints.ClusterAddOn> = [
      new blueprints.addons.VpcCniAddOn(),
      new blueprints.addons.CoreDnsAddOn(),
      new blueprints.addons.KubeProxyAddOn(),
      new blueprints.addons.AwsLoadBalancerControllerAddOn({
        repository: AWS_EKS_CHART_REPO_URL,
        version: "1.8.2",
        enableShield: false,
        enableWaf: false,
        enableWafv2: false,
        createIngressClassResource: true,
        ingressClass: "alb",
        enableServiceMutatorWebhook: false
      }),
      new blueprints.addons.EbsCsiDriverAddOn({
        version: "auto",
        storageClass: "gp3"
      })
    ]

    const blueprintBuilder = blueprints.EksBlueprint.builder()
      .version(config.cluster.version)
      .addOns(...addOns)
      .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.DirectVpcProvider(difyProps.vpc))
      .resourceProvider("db", new PostgresSQLResourceProvider({ vpc: difyProps.vpc, config: config }))
      .resourceProvider("redis", new RedisResourceProvider({ vpc: difyProps.vpc, config: config }))
      .resourceProvider("s3", new S3ResourceProvider({ config: config }).provide())

    if (config.openSearch.enabled) {
      blueprintBuilder.resourceProvider("openSearch", new OpensearchResourceProvider({
        vpc: difyProps.vpc,
        config: config
      }))
    }

    const blueprint = blueprintBuilder
      .clusterProvider(clusterProvider)
      .build(scope, `${getConstructPrefix(config)}-${id}-EKS`, this.props);

    cdk.Tags.of(blueprint).add('marketplace', 'dify');

    // Workaround for permission denied when creating cluster
    const handler = blueprint.node.tryFindChild('@aws-cdk--aws-eks.KubectlProvider')!
      .node.tryFindChild('Handler')! as cdk.aws_lambda.Function

    (
      blueprint.node.tryFindChild('@aws-cdk--aws-eks.KubectlProvider')!
        .node.tryFindChild('Provider')!
        .node.tryFindChild('framework-onEvent')!
        .node.tryFindChild('ServiceRole')!
        .node.tryFindChild('DefaultPolicy') as cdk.aws_iam.Policy
    )
      .addStatements(new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ["lambda:GetFunctionConfiguration"],
        resources: [handler.functionArn]
      }))

    // Provide static output name for cluster
    const cluster = blueprint.getClusterInfo().cluster
    const clusterNameCfnOutput = cluster.node.findChild('ClusterName') as cdk.CfnOutput;
    clusterNameCfnOutput.overrideLogicalId('ClusterName')

    const configCommandCfnOutput = cluster.node.findChild('ConfigCommand') as cdk.CfnOutput;
    configCommandCfnOutput.overrideLogicalId('ConfigCommand')

    const getTokenCommandCfnOutput = cluster.node.findChild('GetTokenCommand') as cdk.CfnOutput;
    getTokenCommandCfnOutput.overrideLogicalId('GetTokenCommand')
  }
}
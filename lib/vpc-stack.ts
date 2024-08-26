import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, id + "VPC", {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 3,
      natGateways: 1
    });

    this.vpc.addGatewayEndpoint(id + "s3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    })
  }
}
#!/usr/bin/env node

// Load environment variables
import './loadenv';

import { App } from 'aws-cdk-lib';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import 'source-map-support/register';
import { config } from '../configs';
import { DifyProdStackConstruct } from '../lib/dify-prod-stack';
import { DifyTestStackConstruct } from '../lib/dify-test-stack';
import { VPCStack } from '../lib/vpc-stack';

const app = new App();

const environment = app.node.tryGetContext('env');

if (!environment || !['test', 'prod', 'all'].includes(environment)) {
  throw new Error("Please provide a valid environment name ('test', 'prod', or 'all')");
}

console.log(`Detected environment: ${environment}`);

const deployVpcId = process.env.DEPLOY_VPC_ID;
let myVpc: IVpc | undefined;

if (deployVpcId) {
  console.log(`Deploying to existing VPC with ID: ${deployVpcId}`);
  myVpc = Vpc.fromLookup(app, 'ExistingVPC', { vpcId: deployVpcId });
}

const deployStack = (
  stackName: string,
  vpc: IVpc,
  envConfig: { account: string; region: string },
  description: string,
  StackConstruct: typeof DifyTestStackConstruct | typeof DifyProdStackConstruct
) => {
  new StackConstruct(app, stackName, { vpc }, {
    env: {
      account: envConfig.account,
      region: envConfig.region,
    },
    description,
  }).build();
};

if (['test', 'all'].includes(environment)) {
  const vpcTest = myVpc || new VPCStack(app, 'DifyVPCTest', {
    env: {
      account: config.testConfig.account,
      region: config.testConfig.region,
    },
    description: 'Dify Testing VPC',
  }).vpc;

  deployStack('DifyStackTest', vpcTest, config.testConfig, 'Dify Testing Environment', DifyTestStackConstruct);
}

if (['prod', 'all'].includes(environment)) {
  const vpcProd = myVpc || new VPCStack(app, 'DifyVPCProd', {
    env: {
      account: config.prodConfig.account,
      region: config.prodConfig.region,
    },
    description: 'Dify Production VPC',
  }).vpc;

  deployStack('DifyStackProd', vpcProd, config.prodConfig, 'Dify Production Environment', DifyProdStackConstruct);
}

#!/usr/bin/env node

// load env
import './loadenv';

import { App } from 'aws-cdk-lib';
import 'source-map-support/register';
import { config } from '../configs';
import { DifyProdStackConstruct } from '../lib/dify-prod-stack';
import { DifyTestStackConstruct } from '../lib/dify-test-stack';
import { VPCStack } from '../lib/vpc-stack';

const app = new App();

const environment = app.node.tryGetContext('env');

if (!environment || !['test', 'prod', 'all'].includes(environment)) {
  throw new Error("Please provide a valid environment name ('test' or 'prod' or 'all')");
}

console.log(`Detected environment [${environment}]`);

if (environment === 'test' || environment === 'all') {
  // Deploy for testing environment
  const vpcTest = new VPCStack(app, 'DifyNetworkTest', {
    env: {
      account: config.testConfig.account,
      region: config.testConfig.region,
    },
    description: 'Dify Testing VPC'
  });

  new DifyTestStackConstruct(app, 'DifyStackTest', {
    vpc: vpcTest.vpc,
  }, {
    env: {
      account: config.testConfig.account,
      region: config.testConfig.region,
    },
    description: 'Dify Testing Environment'
  }).build();
}
if (environment === 'prod' || environment === 'all') {
  // Deploy for production environment
  const vpcProd = new VPCStack(app, 'DifyNetworkProd', {
    env: {
      account: config.prodConfig.account,
      region: config.prodConfig.region,
    },
    description: 'Dify Production VPC'
  });

  new DifyProdStackConstruct(app, 'DifyStackProd', {
    vpc: vpcProd.vpc,
  }, {
    env: {
      account: config.prodConfig.account,
      region: config.prodConfig.region,
    },
    description: 'Dify Production Environment'
  }).build();
}
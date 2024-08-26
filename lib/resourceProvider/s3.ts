import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as cdk from 'aws-cdk-lib';
import { getConstructPrefix } from '../../configs';
import { StackConfig } from '../../configs/stackConfig';

interface S3ResourceProviderProps {
  config: StackConfig;
}

export class S3ResourceProvider {
  private readonly config: StackConfig;

  constructor(props: S3ResourceProviderProps) {
    this.config = props.config;
  }

  provide(): blueprints.CreateS3BucketProvider {
    return new blueprints.CreateS3BucketProvider({
      id: `${getConstructPrefix(this.config)}-s3`,
      s3BucketProps: {
        removalPolicy: this.config.s3.removeWhenDestroyed ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
        autoDeleteObjects: this.config.s3.removeWhenDestroyed,
      }
    });
  }
}
import { StackProps } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { config } from "../configs";
import { DifyStack } from "./dify-cdk-stack";

interface DifyTestStackProps extends StackProps {
  vpc: IVpc;
  extraValues?: object;
}

export class DifyTestStack extends DifyStack {
  constructor(scope: Construct, id: string, props: DifyTestStackProps) {
    super(scope, id, {
      ...props,
      config: config.testConfig,
    });
  }
}
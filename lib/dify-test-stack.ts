import { StackProps } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { config } from "../configs";
import { DifyStackConstruct } from "./dify-cdk-stack";

interface DifyTestStackProps {
  vpc: IVpc;
  extraValues?: object;
}

export class DifyTestStackConstruct extends DifyStackConstruct {
  constructor(scope: Construct, id: string, difyProps: DifyTestStackProps, props: StackProps) {
    super(scope, id, {
      ...difyProps,
      config: config.testConfig,
    }, {
      ...props,
    });
  }
}
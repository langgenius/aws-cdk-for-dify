import { StackProps } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { config } from "../configs";
import { DifyStack } from "./dify-cdk-stack";

interface DifyProdStackProps extends StackProps {
  vpc: IVpc;
  extraValues?: object;
}

export class DifyProdStack extends DifyStack {
  constructor(scope: Construct, id: string, props: DifyProdStackProps) {
    super(scope, id, {
      ...props,
      config: config.prodConfig,
    });
  }
}
import { StackProps } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { config } from "../configs";
import { DifyStackConstruct } from "./dify-cdk-stack";

interface DifyProdStackProps {
  vpc: IVpc;
  extraValues?: object;
}

export class DifyProdStackConstruct extends DifyStackConstruct {
  constructor(scope: Construct, id: string, difyProps: DifyProdStackProps, props: StackProps) {
    super(scope, id, {
      ...difyProps,
      config: config.prodConfig,
    }, {
      ...props,
    });
  }
}
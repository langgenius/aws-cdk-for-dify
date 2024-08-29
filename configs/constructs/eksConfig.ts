import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

export interface EksTaintsConfig {
  vectorDb: {
    key: string,
    value: string,
  }
}

interface managedNodeGroups {
  app: {
    desiredSize: number, // desired number of nodes
    minSize: number, // minimum number of nodes
    maxSize: number, // maximum number of nodes
    instanceType: InstanceType, // instance type for the nodes
    diskSize: number, // disk size for the nodes
    workerNodeSubnetIds: string[]; // subnets for the EKS cluster worker nodes
  }
}

export interface EksClusterConfig {
  version: KubernetesVersion; // version of the EKS cluster
  tags: { [key: string]: string }; // tags for the EKS cluster
  managedNodeGroups: managedNodeGroups; // managed node groups for the EKS cluster
  vpcSubnetIds: string[]; // subnets for the EKS cluster control plane
}
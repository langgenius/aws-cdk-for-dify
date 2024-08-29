import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";

export interface PostgresSQLConfig {
  version: PostgresEngineVersion; // version of the Postgres engine
  dbName: string // names of the database
  instanceType: InstanceType; // instance type for the db
  storageSize: number; // size of the storage in GB
  dbCredentialUsername: string; // username for the db, password will be generated and stored in Secrets Manager
  removeWhenDestroyed: boolean; // whether to remove the cluster when the stack is destroyed
  backupRetention: number; // number of days to retain backups, 0 to disable backups
  subnetIds?: string[]; // list of subnet IDs to deploy the db in
  multiAz: {
    enabled: boolean; // whether to deploy the db in multiple AZs
    subnetGroupName?: string; // name of the subnet group to deploy the db in
  }
}
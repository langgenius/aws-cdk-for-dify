# Dify Enterprise on AWS

Deploy Dify Enterprise on AWS using CDK.

![1719058485616](images/README/1719058485616.png)

## Components

### Testing Deployment

| **Component**                | **Helm Chart Value** | **Count** | **vCPU** | **Memory (GB)** | **Storage (GB)** | **Notes** |
| ---------------------------- | -------------------- | --------- | -------- | --------------- | ---------------- | --------- |
| K8S Worker Node              |                      | 1         | 4        | 16              | 100              |           |
| S3                           | persistence          | 1         |          |                 |                  |           |
| Postgres DB (Aurora) Cluster | externalPostgres     | 2         | 2        | 4               |                  |           |
| Redis DB                     | externalRedis        | 1         | 2        | 1.37            |                  |           |
| EC2 (for Vector DB)          | vectorDB             | 1         | 4        | 8               | 100              |           |

### Production Deployment

| **Component**                | **Helm Chart Value** | **Count** | **vCPU** | **Memory (GB)** | **Storage (GB)** | **Notes** |
| ---------------------------- | -------------------- | --------- | -------- | --------------- | ---------------- | --------- |
| K8S Worker Node              |                      | 6         | 8        | 32              | 100              |           |
| S3                           | persistence          | 1         |          |                 |                  |           |
| Postgres DB (Aurora) Cluster | externalPostgres     | 2         | 4        | 32              |                  |           |
| Redis DB                     | externalRedis        | 1         | 2        | 3.09            |                  |           |
| EC2 (for Vector DB)          | vectorDB             | 3         | 8        | 64              | 100              |           |

## Deploy

### Prerequisites

1. 环境安装: NodeJS

   ```bash
   npm install
   ```

2. AWS 配置

   [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

   ```bash
   aws configure
   ```

3. (如果您使用的是AWS CN服务) 配置AWS EKS Helm仓库

    配置环境变量`AWS_LOAD_BALANCER_REPO`，具体url请联系我们。

4. CDK bootstrap

   ```bash
   npm run init
   ```

5. CDK deploy
   - 部署Testing环境

        ```bash
        npm run deploy-test
        ```

   - 部署Production环境

        ```bash
        npm run deploy-prod
        ```

   - 全部部署

        ```bash
        npm run deploy-all
        ```

6. CDK destroy

    ```bash
    npm run destroy
    ```

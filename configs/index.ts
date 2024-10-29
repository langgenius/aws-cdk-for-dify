import { PRODUCT_NAME, AWS_RESOURCE_SUFFIX } from "./constants";
import { prodConfig, ProdStackConfig } from "./prod";
import { StackConfig } from "./stackConfig";
import { testConfig, TestStackConfig } from "./test";

interface DifyCDKConfig {
  testConfig: TestStackConfig;
  prodConfig: ProdStackConfig;
}

export const config: DifyCDKConfig = {
  testConfig: testConfig,
  prodConfig: prodConfig
}

export const getConstructPrefix = (config: StackConfig) => {

  return `${PRODUCT_NAME}-${config.environment}-${AWS_RESOURCE_SUFFIX}`;
} 
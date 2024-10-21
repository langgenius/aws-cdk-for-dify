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
  // Generate a 6-character random string consisting of numbers and letters
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `${PRODUCT_NAME}-${config.environment}-${AWS_RESOURCE_SUFFIX}`;
} 
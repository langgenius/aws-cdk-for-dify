import { PRODUCT_NAME } from "./constants";
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
  return `${PRODUCT_NAME}-${config.environment}`;
} 
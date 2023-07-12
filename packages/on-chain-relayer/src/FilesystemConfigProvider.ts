import dotenv from "dotenv";
import {
  ConditionCheckNames,
  ConfigProvider,
  OnChainRelayerManifest,
} from "./types";
import fs from "fs";

dotenv.config();

const DEFAULT_ADAPTER_CONTRACT_TYPE = "price-feeds";

const getFromEnv = (name: string, optional: boolean = false) => {
  const envValue = process.env[name];
  if (!envValue && !optional) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return envValue;
};

// copy of method from oracle-node. Probably should be moved to some common package
function readJSON<T>(path: string): T {
  const content = fs.readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as T;
  } catch (e: any) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

export const fileSystemConfigProvider: ConfigProvider = () => {
  const mainfestPath = getFromEnv("MANIFEST_FILE")!;
  const manifest = readJSON<OnChainRelayerManifest>(mainfestPath);
  const { timeSinceLastUpdateInMilliseconds, deviationPercentage } =
    manifest.updateTriggers;
  let updateConditions = [] as ConditionCheckNames[];

  const fallbackOffsetInMinutes = Number.parseInt(
    getFromEnv("FALLBACK_OFFSET_IN_MINUTES")!
  );
  if (deviationPercentage) {
    updateConditions.push(
      fallbackOffsetInMinutes > 0 ? "fallback-deviation" : "value-deviation"
    );
  }

  if (timeSinceLastUpdateInMilliseconds) {
    updateConditions.push(
      fallbackOffsetInMinutes > 0 ? "fallback-time" : "time"
    );
  }

  return Object.freeze({
    relayerIterationInterval: Number(getFromEnv("RELAYER_ITERATION_INTERVAL")),
    updatePriceInterval: timeSinceLastUpdateInMilliseconds,
    rpcUrl: getFromEnv("RPC_URL")!,
    chainName: manifest.chain.name!,
    chainId: manifest.chain.id,
    privateKey: getFromEnv("PRIVATE_KEY")!,
    adapterContractAddress: manifest.adapterContract,
    dataServiceId: manifest.dataServiceId,
    uniqueSignersCount: Number(getFromEnv("UNIQUE_SIGNERS_COUNT")),
    dataFeeds: Object.keys(manifest.priceFeeds),
    gasLimit: Number.parseInt(getFromEnv("GAS_LIMIT")!),
    updateConditions: updateConditions,
    minDeviationPercentage: deviationPercentage,
    fallbackDeviationCheckOffsetInMinutes: fallbackOffsetInMinutes,
    fallbackTimeOffsetInMinutes: fallbackOffsetInMinutes,
    healthcheckPingUrl: getFromEnv("HEALTHCHECK_PING_URL", true),
    adapterContractType:
      getFromEnv("ADAPTER_CONTRACT_TYPE", true) ??
      DEFAULT_ADAPTER_CONTRACT_TYPE,
    expectedTxDeliveryTimeInMS: Number(
      getFromEnv("EXPECTED_TX_DELIVERY_TIME_IN_MS")
    ),
    isArbitrumNetwork: getFromEnv("IS_ARBITRUM_NETWORK", true) === "true",
    historicalPackagesGateway: getFromEnv("HISTORICAL_PACKAGES_GATEWAY"),
    historicalPackagesDataServiceId: getFromEnv(
      "HISTORICAL_PACKAGES_DATA_SERVICE_ID"
    ),
  });
};
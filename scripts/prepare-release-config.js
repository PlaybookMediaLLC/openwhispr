#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_PRODUCT_NAME = "OpenWhispr";
const DEFAULT_APP_ID = "com.gizmolabs.openwhispr";
const DEFAULT_PROTOCOL_SCHEME = "openwhispr";
const CANONICAL_REPOSITORY = "openwhispr/openwhispr";

function requireValue(name, value) {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function parseBoolean(name, value) {
  if (value === undefined || value === "") return false;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function validateReleaseIdentity({ productName, appId, protocolScheme, repository }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(productName)) {
    throw new Error(
      "RELEASE_PRODUCT_NAME must be 1-64 characters using letters, numbers, spaces, dots, underscores, or hyphens"
    );
  }

  if (
    !/^[A-Za-z0-9][A-Za-z0-9.-]{2,127}$/.test(appId) ||
    !appId.includes(".") ||
    appId.includes("..")
  ) {
    throw new Error("RELEASE_APP_ID must be a valid reverse-DNS application identifier");
  }

  if (!/^[a-z][a-z0-9+.-]{1,31}$/.test(protocolScheme)) {
    throw new Error("RELEASE_PROTOCOL_SCHEME must be 2-32 lowercase URL-scheme characters");
  }

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY must have the form owner/repository");
  }

  const isRenamed = productName !== DEFAULT_PRODUCT_NAME;
  if (isRenamed && appId === DEFAULT_APP_ID) {
    throw new Error("A renamed release must use a non-OpenWhispr RELEASE_APP_ID");
  }
  if (isRenamed && protocolScheme === DEFAULT_PROTOCOL_SCHEME) {
    throw new Error("A renamed release must use a non-OpenWhispr RELEASE_PROTOCOL_SCHEME");
  }

  const isCanonicalRepository = repository.toLowerCase() === CANONICAL_REPOSITORY;
  if (!isCanonicalRepository && appId === DEFAULT_APP_ID) {
    throw new Error("A fork release must use a non-OpenWhispr RELEASE_APP_ID");
  }
  if (!isCanonicalRepository && protocolScheme === DEFAULT_PROTOCOL_SCHEME) {
    throw new Error("A fork release must use a non-OpenWhispr RELEASE_PROTOCOL_SCHEME");
  }
}

function replaceProductName(value, previousName, productName) {
  if (typeof value === "string") {
    return value.split(previousName).join(productName);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => replaceProductName(entry, previousName, productName));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        replaceProductName(entry, previousName, productName),
      ])
    );
  }
  return value;
}

function createReleaseConfig(baseConfig, options) {
  const {
    productName,
    appId,
    protocolScheme,
    repository,
    repositoryPrivate = false,
    unsignedWindows = false,
    unsignedMacos = false,
  } = options;

  validateReleaseIdentity({ productName, appId, protocolScheme, repository });

  const previousName = baseConfig.productName || DEFAULT_PRODUCT_NAME;
  const config = structuredClone(baseConfig);
  const [owner, repo] = repository.split("/");

  if (config.mac?.extendInfo) {
    config.mac.extendInfo = replaceProductName(config.mac.extendInfo, previousName, productName);
  }

  config.productName = productName;
  config.appId = appId;
  config.extraMetadata = {
    ...(config.extraMetadata || {}),
    releaseIdentity: { productName, appId, protocolScheme },
  };
  config.protocols = {
    ...(config.protocols || {}),
    name: `${productName} Protocol`,
    schemes: [protocolScheme],
  };
  config.dmg = { ...(config.dmg || {}), title: productName };
  config.publish = {
    provider: "github",
    owner,
    repo,
    private: repositoryPrivate,
    releaseType: "draft",
  };

  if (unsignedWindows) {
    config.win = { ...(config.win || {}), azureSignOptions: null };
  }

  if (unsignedMacos) {
    config.mac = { ...(config.mac || {}), identity: null, notarize: false };
  }

  return config;
}

function main(env = process.env) {
  const basePath = path.resolve(env.RELEASE_BASE_CONFIG || "electron-builder.json");
  const outputPath = path.resolve(
    env.RELEASE_CONFIG_PATH || "electron-builder.release.generated.json"
  );
  const productName = requireValue("RELEASE_PRODUCT_NAME", env.RELEASE_PRODUCT_NAME);
  const appId = requireValue("RELEASE_APP_ID", env.RELEASE_APP_ID);
  const protocolScheme = requireValue("RELEASE_PROTOCOL_SCHEME", env.RELEASE_PROTOCOL_SCHEME);
  const repository = requireValue("GITHUB_REPOSITORY", env.GITHUB_REPOSITORY);

  const baseConfig = JSON.parse(fs.readFileSync(basePath, "utf8"));
  const config = createReleaseConfig(baseConfig, {
    productName,
    appId,
    protocolScheme,
    repository,
    repositoryPrivate: parseBoolean("RELEASE_REPOSITORY_PRIVATE", env.RELEASE_REPOSITORY_PRIVATE),
    unsignedWindows: parseBoolean("RELEASE_UNSIGNED_WINDOWS", env.RELEASE_UNSIGNED_WINDOWS),
    unsignedMacos: parseBoolean("RELEASE_UNSIGNED_MACOS", env.RELEASE_UNSIGNED_MACOS),
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Prepared ${productName} release config for ${repository}: ${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`prepare-release-config: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  createReleaseConfig,
  parseBoolean,
  validateReleaseIdentity,
};

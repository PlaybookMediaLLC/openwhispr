#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  loadSelectedDistribution,
  validateDistribution,
} = require("../src/config/distributionSchema.ts");

const DEFAULT_PRODUCT_NAME = "OpenWhispr";
const DEFAULT_APP_ID = "com.gizmolabs.openwhispr";
const DEFAULT_PROTOCOL_SCHEME = "openwhispr";
const CANONICAL_REPOSITORY = "openwhispr/openwhispr";

function parseBoolean(name, value) {
  if (value === undefined || value === "") return false;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function resolveReleaseRepository(distribution, githubRepository) {
  const expected = `${distribution.updates.owner}/${distribution.updates.repo}`;
  const actual = (githubRepository || expected).trim();
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      `Release repository ${actual} does not match distribution updater repository ${expected}`
    );
  }
  return expected;
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
    distribution: distributionValue,
  } = options;

  const baseDistribution = distributionValue
    ? validateDistribution(distributionValue)
    : loadSelectedDistribution({});
  const distribution = validateDistribution({
    ...baseDistribution,
    productName,
    appId,
    protocolScheme,
    updates: {
      ...baseDistribution.updates,
      owner: repository.split("/")[0],
      repo: repository.split("/")[1],
      private: repositoryPrivate,
    },
  });

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
    distribution,
  };
  config.executableName = distribution.executableName;
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

  config.files = Array.from(
    new Set([...(config.files || []), "distributions/**/*", "extensions/**/*"])
  );
  config.mac = { ...(config.mac || {}), icon: distribution.assets.macIcon };
  config.win = { ...(config.win || {}), icon: distribution.assets.windowsIcon };
  config.win.azureSignOptions = distribution.signing.windowsAzure;
  config.linux = { ...(config.linux || {}), icon: distribution.assets.linuxIcon };
  config.dmg = { ...(config.dmg || {}), icon: distribution.assets.macIcon };

  const existingMacResources = (config.mac.extraResources || []).filter(
    (resource) =>
      typeof resource === "string" ||
      (resource.to !== "Assets.car" && resource.from !== "src/assets/Assets.car")
  );
  if (distribution.assets.macAssetCatalog) {
    config.mac.extraResources = [
      ...existingMacResources,
      { from: distribution.assets.macAssetCatalog.file, to: "Assets.car" },
    ];
    config.mac.extendInfo = {
      ...(config.mac.extendInfo || {}),
      CFBundleIconName: distribution.assets.macAssetCatalog.iconName,
    };
  } else {
    config.mac.extraResources = existingMacResources;
    if (config.mac.extendInfo) delete config.mac.extendInfo.CFBundleIconName;
  }

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
  let distribution = loadSelectedDistribution(env, process.cwd());
  if (env.RELEASE_WINDOWS_SIGNING_JSON) {
    distribution = validateDistribution({
      ...distribution,
      signing: { windowsAzure: JSON.parse(env.RELEASE_WINDOWS_SIGNING_JSON) },
    });
  }
  const productName = (env.RELEASE_PRODUCT_NAME || distribution.productName).trim();
  const appId = (env.RELEASE_APP_ID || distribution.appId).trim();
  const protocolScheme = (env.RELEASE_PROTOCOL_SCHEME || distribution.protocolScheme).trim();
  const repository = resolveReleaseRepository(distribution, env.GITHUB_REPOSITORY);

  const baseConfig = JSON.parse(fs.readFileSync(basePath, "utf8"));
  const config = createReleaseConfig(baseConfig, {
    productName,
    appId,
    protocolScheme,
    repository,
    repositoryPrivate: parseBoolean("RELEASE_REPOSITORY_PRIVATE", env.RELEASE_REPOSITORY_PRIVATE),
    unsignedWindows: parseBoolean("RELEASE_UNSIGNED_WINDOWS", env.RELEASE_UNSIGNED_WINDOWS),
    unsignedMacos: parseBoolean("RELEASE_UNSIGNED_MACOS", env.RELEASE_UNSIGNED_MACOS),
    distribution,
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
  resolveReleaseRepository,
  validateReleaseIdentity,
};

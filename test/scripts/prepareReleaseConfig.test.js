const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createReleaseConfig,
  validateReleaseIdentity,
} = require("../../scripts/prepare-release-config");

const baseConfig = {
  appId: "com.gizmolabs.openwhispr",
  productName: "OpenWhispr",
  protocols: {
    name: "OpenWhispr Protocol",
    schemes: ["openwhispr"],
  },
  mac: {
    identity: "Gizmo Labs Inc. (TEAMID)",
    notarize: true,
    extendInfo: {
      NSMicrophoneUsageDescription: "OpenWhispr uses the microphone.",
    },
  },
  win: {
    azureSignOptions: {
      certificateProfileName: "openwhispr-release",
      codeSigningAccountName: "OpenWhispr",
    },
  },
  dmg: { title: "OpenWhispr" },
  publish: {
    provider: "github",
    owner: "OpenWhispr",
    repo: "openwhispr",
    private: false,
    releaseType: "draft",
  },
};

test("creates a renamed release config for the current repository", () => {
  const config = createReleaseConfig(baseConfig, {
    productName: "New Whispr",
    appId: "engineering.oppulence.newwhispr",
    protocolScheme: "newwhispr",
    repository: "Oppulence-Engineering/openwhispr",
    repositoryPrivate: true,
  });

  assert.equal(config.productName, "New Whispr");
  assert.equal(config.appId, "engineering.oppulence.newwhispr");
  assert.deepEqual(config.protocols, {
    name: "New Whispr Protocol",
    schemes: ["newwhispr"],
  });
  assert.equal(config.dmg.title, "New Whispr");
  assert.deepEqual(config.extraMetadata.releaseIdentity, {
    productName: "New Whispr",
    appId: "engineering.oppulence.newwhispr",
    protocolScheme: "newwhispr",
  });
  assert.equal(
    config.mac.extendInfo.NSMicrophoneUsageDescription,
    "New Whispr uses the microphone."
  );
  assert.deepEqual(config.publish, {
    provider: "github",
    owner: "Oppulence-Engineering",
    repo: "openwhispr",
    private: true,
    releaseType: "draft",
  });
  assert.equal(config.win.azureSignOptions.codeSigningAccountName, "OpenWhispr");
});

test("disables unavailable platform signing without changing the base config", () => {
  const config = createReleaseConfig(baseConfig, {
    productName: "OpenWhispr",
    appId: "com.gizmolabs.openwhispr",
    protocolScheme: "openwhispr",
    repository: "OpenWhispr/openwhispr",
    unsignedWindows: true,
    unsignedMacos: true,
  });

  assert.equal(config.win.azureSignOptions, null);
  assert.equal(config.mac.identity, null);
  assert.equal(config.mac.notarize, false);
  assert.notEqual(baseConfig.win.azureSignOptions, null);
  assert.equal(baseConfig.mac.notarize, true);
});

test("requires renamed releases to use a distinct application identity", () => {
  assert.throws(
    () =>
      validateReleaseIdentity({
        productName: "New Whispr",
        appId: "com.gizmolabs.openwhispr",
        protocolScheme: "newwhispr",
        repository: "Oppulence-Engineering/openwhispr",
      }),
    /non-OpenWhispr RELEASE_APP_ID/
  );

  assert.throws(
    () =>
      validateReleaseIdentity({
        productName: "New Whispr",
        appId: "engineering.oppulence.newwhispr",
        protocolScheme: "openwhispr",
        repository: "Oppulence-Engineering/openwhispr",
      }),
    /non-OpenWhispr RELEASE_PROTOCOL_SCHEME/
  );
});

test("requires forks to use an application identity distinct from canonical OpenWhispr", () => {
  assert.throws(
    () =>
      createReleaseConfig(baseConfig, {
        productName: "OpenWhispr",
        appId: "com.gizmolabs.openwhispr",
        protocolScheme: "openwhispr",
        repository: "Oppulence-Engineering/openwhispr",
      }),
    /fork release must use a non-OpenWhispr RELEASE_APP_ID/
  );
});

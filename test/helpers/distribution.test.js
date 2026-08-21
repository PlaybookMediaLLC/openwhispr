const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loadDistribution,
  validateDistribution,
} = require("../../src/config/distributionSchema.ts");

test("loads the Oppulence Voice distribution with its owned update identity", () => {
  const distribution = loadDistribution("distributions/oppulence-voice.json", process.cwd());

  assert.equal(distribution.productName, "Oppulence Voice");
  assert.equal(distribution.appId, "engineering.oppulence.voice");
  assert.equal(distribution.protocolScheme, "oppulence-voice");
  assert.deepEqual(distribution.updates, {
    provider: "github",
    owner: "Oppulence-Engineering",
    repo: "openwhispr",
    private: false,
  });
  assert.deepEqual(distribution.extensions, ["rowboat-export"]);
});

test("rejects unknown extensions and mismatched capability flags", () => {
  const base = loadDistribution("distributions/openwhispr.json", process.cwd());

  assert.throws(
    () => validateDistribution({ ...base, extensions: ["load-arbitrary-module"] }),
    /expected "rowboat-export"/
  );
  assert.throws(
    () =>
      validateDistribution({
        ...base,
        capabilities: { ...base.capabilities, rowboatExport: true },
      }),
    /enabled together/
  );
});

test("rejects malformed application and service identities", () => {
  const base = loadDistribution("distributions/openwhispr.json", process.cwd());

  assert.throws(() => validateDistribution({ ...base, appId: "not-an-app-id" }), /appId/);
  assert.throws(
    () =>
      validateDistribution({
        ...base,
        services: { ...base.services, apiUrl: "file:///tmp/api" },
      }),
    /apiUrl/
  );
  assert.throws(
    () =>
      validateDistribution({
        ...base,
        linux: { ...base.linux, dbusObjectPath: `/${"A/".repeat(10_000)}` },
      }),
    /dbusObjectPath/
  );
});

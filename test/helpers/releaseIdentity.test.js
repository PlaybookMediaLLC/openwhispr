const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_RELEASE_IDENTITY,
  resolveReleaseIdentity,
} = require("../../src/helpers/releaseIdentity");

test("uses packaged release identity metadata", () => {
  assert.deepEqual(
    resolveReleaseIdentity({
      productName: "New Whispr",
      appId: "engineering.oppulence.newwhispr",
      protocolScheme: "newwhispr",
    }),
    {
      productName: "New Whispr",
      appId: "engineering.oppulence.newwhispr",
      protocolScheme: "newwhispr",
    }
  );
});

test("falls back atomically when packaged identity metadata is invalid", () => {
  assert.equal(
    resolveReleaseIdentity({
      productName: "New Whispr",
      appId: "com.gizmolabs.openwhispr",
      protocolScheme: "Not Valid",
    }),
    DEFAULT_RELEASE_IDENTITY
  );
  assert.equal(resolveReleaseIdentity(null), DEFAULT_RELEASE_IDENTITY);
});

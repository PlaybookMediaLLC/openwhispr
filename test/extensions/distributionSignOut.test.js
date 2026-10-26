const assert = require("node:assert/strict");
const test = require("node:test");

const { loadDistribution } = require("../../src/config/distributionSchema.ts");

// distribution.ts reads this global once, when it loads.
globalThis.__APP_DISTRIBUTION__ = loadDistribution(
  "distributions/oppulence-voice.json",
  process.cwd()
);
const invoked = [];
globalThis.window = {
  electronAPI: { distributionExtensions: { invoke: async (...args) => invoked.push(args) } },
};
const { withDistributionSignOut } = require("../../src/config/distributionAuth.ts");

test("Oppulence sign-out clears the extension session, not the upstream auth server", async () => {
  const remote = [];
  const client = withDistributionSignOut({
    signOut: async () => remote.push("signOut"),
    getSession: () => "session",
  });

  await client.signOut();

  assert.deepEqual(invoked, [["oppulence-cloud", "clearSession"]]);
  assert.deepEqual(remote, []);
  assert.equal(client.getSession(), "session");
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { brandResources, brandString } = require("../../src/config/branding.ts");
const { loadDistribution } = require("../../src/config/distributionSchema.ts");

const distribution = loadDistribution("distributions/oppulence-voice.json", process.cwd());

test("brands product copy and names the selected distribution's managed cloud", () => {
  assert.equal(
    brandString("OpenWhispr connects to OpenWhispr Cloud", distribution),
    "Oppulence Voice connects to Oppulence Cloud"
  );
  assert.equal(
    brandString("Email support@openwhispr.com about OpenWhispr", distribution),
    "Email support@oppulence.com about Oppulence Voice"
  );
});

test("brands nested translation resources without mutating the source", () => {
  const source = { heading: "OpenWhispr", nested: ["OpenWhispr Cloud"] };
  const branded = brandResources(source, distribution);

  assert.deepEqual(branded, { heading: "Oppulence Voice", nested: ["Oppulence Cloud"] });
  assert.deepEqual(source, { heading: "OpenWhispr", nested: ["OpenWhispr Cloud"] });
});

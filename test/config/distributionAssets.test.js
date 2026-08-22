const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  resolveDistributionAssetCandidates,
} = require("../../src/config/distributionAssets.ts");

test("distribution assets resolve in development and packaged layouts", () => {
  const asset = "distributions/oppulence-voice/assets/oppulence-mark.png";
  const candidates = resolveDistributionAssetCandidates(asset, {
    projectRoot: "/checkout",
    appPath: "/Applications/Oppulence Voice.app/Contents/Resources/app.asar",
    resourcesPath: "/Applications/Oppulence Voice.app/Contents/Resources",
  });

  assert.deepEqual(candidates, [
    path.resolve("/checkout", asset),
    path.resolve("/Applications/Oppulence Voice.app/Contents/Resources/app.asar", asset),
    path.resolve("/Applications/Oppulence Voice.app/Contents/Resources", asset),
    path.resolve("/Applications/Oppulence Voice.app/Contents/Resources/app.asar.unpacked", asset),
  ]);
});

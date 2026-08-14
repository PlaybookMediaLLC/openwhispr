const assert = require("node:assert/strict");
const test = require("node:test");

const electronBuilderConfig = require("../../electron-builder.json");

test("macOS signing identity is discovered from the imported certificate", () => {
  assert.equal(
    Object.hasOwn(electronBuilderConfig.mac, "identity"),
    false,
    "electron-builder.json must not pin a vendor-specific macOS identity"
  );
  assert.equal(electronBuilderConfig.mac.notarize, true);
});

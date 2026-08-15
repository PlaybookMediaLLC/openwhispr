const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const electronBuilderConfig = require("../../electron-builder.json");
const buildWorkflow = fs.readFileSync(
  path.join(__dirname, "../../.github/workflows/build-and-notarize.yml"),
  "utf8"
);

test("macOS signing identity is discovered from the imported certificate", () => {
  assert.equal(
    Object.hasOwn(electronBuilderConfig.mac, "identity"),
    false,
    "electron-builder.json must not pin a vendor-specific macOS identity"
  );
  assert.equal(electronBuilderConfig.mac.notarize, true);
});

test("pull request packages remain unsigned and skip signature verification", () => {
  assert.match(
    buildWorkflow,
    /MACOS_SIGNING_AVAILABLE: \$\{\{ github\.event_name != 'pull_request' && secrets\.APPLE_CERTIFICATE_BASE64 != ''/
  );
  assert.match(buildWorkflow, /if \[ "\$MACOS_SIGNING_AVAILABLE" = "true" \]; then/);
});

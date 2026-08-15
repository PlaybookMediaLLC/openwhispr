const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workflow = fs.readFileSync(
  path.join(__dirname, "../../.github/workflows/release.yml"),
  "utf8"
);

test("public releases withhold unsigned Windows installers", () => {
  assert.match(workflow, /if \[ "\$WINDOWS_SIGNING_AVAILABLE" != "true" \]/);
  assert.match(workflow, /publish_mode=never/);
  assert.match(
    workflow,
    /npm run build:win -- --publish "\$publish_mode" --config "\$RELEASE_CONFIG_PATH"/
  );
});

test("macOS release builds verify the imported Developer ID signature", () => {
  assert.match(workflow, /codesign --verify --deep --strict --verbose=2 "\$APP_PATH"/);
  assert.match(workflow, /Authority=Developer ID Application:/);
  assert.match(workflow, /TeamIdentifier=\$APPLE_TEAM_ID/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const semanticWorkflow = fs.readFileSync(
  path.join(root, ".github/workflows/semantic-release.yml"),
  "utf8"
);
const releaseWorkflow = fs.readFileSync(path.join(root, ".github/workflows/release.yml"), "utf8");
const releaseConfig = require("../../.github/semantic-release/release.config.cjs");
const toolingPackage = require("../../.github/semantic-release/package.json");
const applicationPackage = require("../../package.json");

function pluginOptions(name) {
  const entry = releaseConfig.plugins.find((plugin) =>
    Array.isArray(plugin) ? plugin[0] === name : plugin === name
  );
  return Array.isArray(entry) ? entry[1] : undefined;
}

test("semantic-release maps Conventional Commits into versioned draft releases", () => {
  assert.deepEqual(releaseConfig.branches, ["main"]);
  assert.equal(releaseConfig.tagFormat, "v${version}");
  assert.ok(releaseConfig.plugins.includes("@semantic-release/commit-analyzer"));
  assert.ok(releaseConfig.plugins.includes("@semantic-release/release-notes-generator"));
  assert.equal(pluginOptions("@semantic-release/npm").npmPublish, false);
  assert.equal(pluginOptions("@semantic-release/github").draftRelease, true);
  assert.match(pluginOptions("@semantic-release/git").message, /\[skip ci\]/);
});

test("semantic release tooling is pinned outside application dependencies", () => {
  assert.equal(applicationPackage.devDependencies?.["semantic-release"], undefined);
  assert.match(toolingPackage.dependencies["semantic-release"], /^\d+\.\d+\.\d+$/);
  assert.match(toolingPackage.engines.node, /24/);
});

test("main pushes dispatch the signed builder only after a semantic release", () => {
  assert.match(semanticWorkflow, /push:\n\s+branches: \[main\]/);
  assert.match(semanticWorkflow, /contents: write/);
  assert.match(semanticWorkflow, /actions: write/);
  assert.match(semanticWorkflow, /steps\.result\.outputs\.released == 'true'/);
  assert.match(semanticWorkflow, /gh workflow run release\.yml/);
  assert.match(semanticWorkflow, /-f reuse_semantic_release=true/);
});

test("the signed builder only reuses a matching semantic draft and tag", () => {
  assert.match(releaseWorkflow, /reuse_semantic_release:/);
  assert.match(releaseWorkflow, /must still be a draft before artifact publication/);
  assert.match(releaseWorkflow, /TAG_SHA.*GITHUB_SHA/s);
  assert.match(releaseWorkflow, /requires both an existing draft release and its matching tag/);
});

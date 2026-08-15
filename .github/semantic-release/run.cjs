const { spawnSync } = require("node:child_process");
const path = require("node:path");

function semanticReleaseEnvironment(env = process.env) {
  const branch = env.SEMANTIC_RELEASE_BRANCH;
  if (!branch) {
    throw new Error("SEMANTIC_RELEASE_BRANCH is required");
  }

  return {
    ...env,
    GITHUB_REF: `refs/heads/${branch}`,
  };
}

function run(args = process.argv.slice(2)) {
  const cli = path.join(__dirname, "node_modules", "semantic-release", "bin", "semantic-release.js");
  const result = spawnSync(process.execPath, [cli, ...args], {
    env: semanticReleaseEnvironment(),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
}

if (require.main === module) {
  run();
}

module.exports = { semanticReleaseEnvironment };

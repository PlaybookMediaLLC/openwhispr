const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DistributionExtensionHost,
  EXTENSION_MODULES,
} = require("../../src/extensions/DistributionExtensionHost.ts");
const { ALLOWED_EXTENSIONS } = require("../../src/config/distributionSchema.ts");

test("every schema-allowlisted extension maps to a shipped module", () => {
  assert.deepEqual(Object.keys(EXTENSION_MODULES).sort(), [...ALLOWED_EXTENSIONS].sort());
});

test("the Rowboat extension loads through Node's packaged TypeScript runtime", () => {
  process.env.ELECTRON_OVERRIDE_DIST_PATH ||= "/tmp";
  const extension = require("../../extensions/rowboat-export/index.ts");
  assert.equal(typeof extension.create, "function");
  assert.equal(extension.RowboatExportExtension.name, "RowboatExportExtension");
});

test("renderer calls require both an enabled extension and an allowlisted method", async () => {
  const host = new DistributionExtensionHost({
    app: {},
    ipcMain: {},
    distribution: { extensions: [] },
    logger: {},
  });
  host.instances.set("rowboat-export", {
    rendererMethods: ["getStatus"],
    invoke: async (method) => ({ method }),
  });

  assert.deepEqual(await host.invoke(null, "rowboat-export", "getStatus"), {
    method: "getStatus",
  });
  await assert.rejects(host.invoke(null, "rowboat-export", "deleteEverything"), /not allowed/);
  await assert.rejects(host.invoke(null, "unknown", "getStatus"), /not allowed/);
});

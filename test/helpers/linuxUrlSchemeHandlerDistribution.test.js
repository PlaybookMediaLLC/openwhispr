const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// A deb/rpm install hands the sign-in scheme back to its packaged desktop entry,
// which each distribution names in its manifest, not the upstream name.
test("a deb/rpm Oppulence Voice reclaims its scheme for oppulence-voice.desktop", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "voice-url-handler-test-"));
  fs.writeFileSync(path.join(root, "package-type"), "deb");
  const savedManifest = process.env.DISTRIBUTION_MANIFEST;
  const savedResourcesPath = process.resourcesPath;
  const originalLoad = Module._load;
  // An earlier AppImage run made its own handler the default.
  let defaultHandler = "oppulence-voice-url-handler.desktop";
  try {
    process.env.DISTRIBUTION_MANIFEST = "distributions/oppulence-voice.json";
    Object.defineProperty(process, "resourcesPath", {
      value: root,
      configurable: true,
      writable: true,
    });
    Module._load = function loadWithXdgStub(request, parent, isMain) {
      if (request !== "child_process") return originalLoad.call(this, request, parent, isMain);
      return {
        execFileSync: (_command, args) => {
          if (args[0] === "query") return `${defaultHandler}\n`;
          if (args[0] === "default") defaultHandler = args[1];
          return "";
        },
      };
    };
    const helperPath = require.resolve("../../src/helpers/linuxUrlSchemeHandler");
    delete require.cache[helperPath];
    const { registerLinuxUrlSchemeHandler } = require(helperPath);

    assert.deepEqual(registerLinuxUrlSchemeHandler("oppulence-voice", []), { registered: false });
    assert.equal(defaultHandler, "oppulence-voice.desktop");
  } finally {
    Module._load = originalLoad;
    if (savedManifest === undefined) delete process.env.DISTRIBUTION_MANIFEST;
    else process.env.DISTRIBUTION_MANIFEST = savedManifest;
    Object.defineProperty(process, "resourcesPath", {
      value: savedResourcesPath,
      configurable: true,
      writable: true,
    });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

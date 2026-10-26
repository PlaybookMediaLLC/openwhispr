const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const test = require("node:test");

/**
 * tokens.css is a pinned copy of @oppulence/ui/tokens.css. Its header records
 * the sha256 of the copied body, so a hand edit fails here. Update the file
 * with `make -C distributions/oppulence-voice tokens` instead.
 */
test("the Oppulence Voice palette is an unedited pinned copy", () => {
  const text = fs.readFileSync("distributions/oppulence-voice/theme/tokens.css", "utf8");
  const header = text.match(/^\/\* Pinned copy[\s\S]*?sha256: ([0-9a-f]{64}) \*\/\n/);
  assert.ok(header, "tokens.css must start with the pinned-copy header");
  const body = text.slice(header[0].length);
  assert.equal(crypto.createHash("sha256").update(body).digest("hex"), header[1]);
});

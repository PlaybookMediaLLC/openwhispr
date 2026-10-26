import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Copies the shared Oppulence palette from an Oppulence-Engineering/oppulence checkout into
// this distribution, with a header that records its sha256. Without a git ref,
// the script reads the checkout's working tree.
const SOURCE = "packages/ui/src/styles/tokens.css";
const TARGET = "distributions/oppulence-voice/theme/tokens.css";

const [checkout, ref] = process.argv.slice(2);
if (!checkout) {
  throw new Error("Usage: sync-tokens.ts <oppulence checkout> [git ref]");
}
const body = ref
  ? execFileSync("git", ["-C", checkout, "show", `${ref}:${SOURCE}`], { encoding: "utf8" })
  : fs.readFileSync(path.join(checkout, SOURCE), "utf8");
const sha256 = crypto.createHash("sha256").update(body).digest("hex");
const header = `/* Pinned copy of @oppulence/ui/tokens.css
   (Oppulence-Engineering/oppulence, ${SOURCE}).
   Do not edit. Update it with
   make -C distributions/oppulence-voice tokens CHECKOUT=<path> [REF=<git ref>]
   sha256: ${sha256} */
`;
fs.writeFileSync(TARGET, header + body);
console.log(`Wrote ${TARGET} (sha256 ${sha256})`);

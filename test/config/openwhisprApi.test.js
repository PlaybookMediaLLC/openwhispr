const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ApiKeyVerifierSnapshotSchema,
  WorkOSTokenBundleSchema,
} = require("../../src/config/openwhisprApi.ts");
const { StoredRowboatConfigSchema } = require("../../src/config/rowboat.ts");

test("WorkOS token bundles reject non-epoch expiry values", () => {
  assert.equal(
    WorkOSTokenBundleSchema.safeParse({
      access_token: "access",
      refresh_token: "refresh",
      expires_at: "tomorrow",
      token_type: "Bearer",
    }).success,
    false
  );
});

test("API key snapshots reject malformed verifier digests", () => {
  assert.equal(
    ApiKeyVerifierSnapshotSchema.safeParse({
      data: {
        verifiers: [
          {
            id: "3c90c3cc-0d44-4b50-8888-8dd25736052a",
            digest: "not-a-sha256",
            scopes: ["notes:read"],
            expires_at: null,
          },
        ],
        valid_until: "2026-08-21T23:15:00Z",
      },
    }).success,
    false
  );
});

test("Rowboat account-mode config never accepts embedded token material", () => {
  const account = StoredRowboatConfigSchema.parse({
    enabled: true,
    endpoint: "https://api.oppulence.io",
    authMode: "oppulence-account",
  });
  assert.equal(account.authMode, "oppulence-account");
  assert.equal(
    StoredRowboatConfigSchema.safeParse({ ...account, encryptedToken: "must-not-coexist" }).success,
    false
  );
});

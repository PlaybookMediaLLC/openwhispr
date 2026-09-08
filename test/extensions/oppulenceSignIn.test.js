const assert = require("node:assert/strict");
const test = require("node:test");

const { loadDistribution } = require("../../src/config/distributionSchema.ts");

/**
 * Desktop sign-in depends on a hand-off contract shared with rowboat-www: the
 * app asks the identity provider to redirect to a registered web URL, and that
 * URL bounces the authorization code back to the app's loopback listener.
 *
 * The web side parses the port out of the OAuth `state` and checks it against
 * an allowlist, so if these values drift apart, sign-in breaks with an opaque
 * "redirect URI invalid" error at the provider. These tests pin both ends.
 *
 * The web-side counterpart lives in
 * rowboat-www/quality/desktop-sign-in.test.ts.
 */
const DESKTOP_STATE = /^desktop\.(\d{2,5})\.[A-Za-z0-9_-]{16,128}$/;

const voice = loadDistribution("distributions/oppulence-voice.json", process.cwd());
const openwhispr = loadDistribution("distributions/openwhispr.json", process.cwd());

test("Oppulence Voice signs in through the registered web callback", () => {
  // WorkOS rejects unregistered redirect URIs, and a loopback URI cannot be
  // registered from code. This exact URL is registered; asking for the loopback
  // URI directly sends users to error.workos.com/redirect-uri-invalid.
  assert.equal(
    voice.services.oauthBrokerUrl,
    "https://oppulence.io/api/auth/workos/callback",
    "the broker must stay the URL registered with WorkOS"
  );
});

test("the loopback callback stays on a port the broker will bounce to", () => {
  const callback = new URL(voice.services.oauthCallbackUrl);

  assert.equal(callback.hostname, "127.0.0.1", "codes must come back over loopback only");
  assert.equal(callback.pathname, "/oauth/callback");
  // rowboat-www's ALLOWED_DESKTOP_PORTS gates this exact port so the callback
  // cannot be turned into an open redirect. Changing it here alone breaks
  // sign-in.
  assert.equal(callback.port, "5198", "port must match the web allowlist");
});

test("the desktop state carries the port in the format the broker parses", () => {
  const port = new URL(voice.services.oauthCallbackUrl).port;
  const nonce = "a".repeat(43);
  const state = `desktop.${port}.${nonce}`;

  const match = state.match(DESKTOP_STATE);
  assert.ok(match, "state must match the format rowboat-www validates");
  assert.equal(match[1], port, "the broker reads the loopback port from here");
});

test("upstream OpenWhispr is unaffected and uses no broker", () => {
  // The broker is opt-in so this stays a purely additive fork change and does
  // not conflict when merging upstream.
  assert.equal(openwhispr.services.oauthBrokerUrl, undefined);
});

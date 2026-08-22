# RFC 0017: Oppulence Voice Distribution and Rowboat Handoff

| Field   | Value                                             |
| ------- | ------------------------------------------------- |
| Status  | Implemented; production rollout pending           |
| Owner   | Oppulence Engineering                             |
| Product | Oppulence Voice                                   |
| Related | Rowboat RFC 055; RFC 0006; capture RFCs 0010–0016 |

## Summary

Oppulence Voice is the Oppulence-owned distribution of the OpenWhispr fork.
It remains a separate capture product. Rowboat remains the relationship manager
and consumes consented, versioned capture artifacts from Oppulence Voice.

We will not merge the OpenWhispr application wholesale into Rowboat. Shared
business value crosses the product boundary through a durable artifact contract,
not through direct access to either product's internal database.

## Decision

1. Keep the upstream-shaped application and its default OpenWhispr distribution
   buildable from this repository.
2. Ship the company distribution as **Oppulence Voice** with app ID
   `engineering.oppulence.voice`, protocol `oppulence-voice://`, and its own
   executable, Linux, D-Bus, storage, update, signing, and asset identities.
3. Select distributions at build time from validated public manifests. Manifests
   contain no credentials.
4. Put Oppulence-owned behavior under `extensions/`; limit changes to upstream
   application code to small, documented hook points.
5. Export to Rowboat only after explicit user opt-in. Persist deliveries in a
   separate SQLite outbox and retry until Rowboat acknowledges them.
6. Keep “OpenWhispr Cloud” in the default distribution. The Oppulence Voice
   distribution uses **Oppulence Cloud**, authenticated through Rowboat's WorkOS
   broker. Product branding must always identify the service actually in use.

## Why a separate product

Voice capture and relationship management have different jobs, trust boundaries,
release cadences, and failure modes. Oppulence Voice must continue recording and
transcribing when Rowboat is unavailable. Rowboat must be able to evolve its
relationship graph without becoming coupled to a desktop transcription schema.

Cherry-picking selected OpenWhispr features into Rowboat would duplicate native
audio, packaging, permissions, model, and updater work. It would also turn every
upstream improvement into a manual port. The integration boundary gives Rowboat
the captured evidence without making Rowboat own the capture runtime.

## Distribution manifest

`src/config/distributionSchema.ts` defines `DistributionSchema` with Zod. Renderer type
`AppDistribution` is inferred from that schema, so validation and TypeScript do
not maintain separate contracts.

The public manifest controls:

- display, company, support, bundle, executable, protocol, and runtime names;
- managed API, auth, and OAuth callback URLs;
- GitHub updater owner, repository, and privacy mode;
- Linux desktop, application, D-Bus service, object, and interface names;
- renderer, tray, and platform icon paths, an optional macOS asset catalog, and
  an optional Windows Azure signing profile;
- capabilities and an allowlisted extension list.

The default local manifest is `distributions/openwhispr.json`. Oppulence release
workflows select `distributions/oppulence-voice.json` for every step, including
Vite compilation and Electron packaging. Existing release environment values are
supported as explicit identity overrides for CI compatibility.

An invalid packaged distribution falls back atomically to the default at runtime;
release generation rejects invalid configuration before packaging.

## Branding and service truth

Vite injects the public distribution as `__APP_DISTRIBUTION__` and sets the HTML
title. Both renderer and main-process i18n resources are transformed at startup,
which avoids editing every locale file. The transformer preserves the configured
`cloudDisplayName` before replacing the product name and support address.

Internal provider keys such as `openwhispr` are data identifiers and are not
renamed. Hosted service headers, cookie semantics, and API-specific names remain
unchanged in the default distribution. Oppulence Voice instead resolves its
session through the `oppulence-cloud` extension and Rowboat's Better Auth-shaped
session adapter.

## Oppulence account and API compatibility

The `oppulence-cloud` extension owns the distribution-specific WorkOS AuthKit
flow. It uses state and PKCE, receives the callback only on the configured
loopback address, validates the callback host, path, state, and expiry, and keeps
the refresh bundle encrypted with Electron `safeStorage`. Access tokens use the
existing token store and refresh fails closed.

The production redirect URI is exactly
`http://127.0.0.1:5198/oauth/callback`; that URI must be registered in WorkOS
before release.

The local automation bridge accepts the published `/api/v1` note, folder,
transcription, format, usage, and search shapes. Requests and responses cross a
Zod boundary in `src/config/openwhisprApi.ts`. Local database identifiers are
mapped deterministically to public UUIDs without changing the upstream schema.
Oppulence personal keys intentionally do not grant workspace access, so the
spaces endpoint returns `workspace_key_required` rather than pretending to
support an unimplemented tenancy model.

Oppulence API keys are created and revoked by Rowboat. The desktop verifier
downloads a short-lived digest-and-scope snapshot over an authenticated WorkOS
session, caches it encrypted, and compares submitted key digests in constant
time. Key plaintext is returned once at creation and is never persisted by the
Rowboat service.

## Release and updater safety

The generated Electron Builder config embeds the validated distribution in
`extraMetadata.distribution`, configures product/app/protocol/executable/icon
identity, and packages `distributions/` and `extensions/`.

The runtime updater reads `distribution.updates`; it must never contain a literal
upstream repository. This prevents an Oppulence binary from installing an
upstream build with a different signing identity or product contract.

Release signing identities and final branded icon assets must be Oppulence-owned.
Until those values and secrets are provisioned, unsigned artifacts are validation
artifacts and must not be represented as production releases.

The existing Oppulence mark is selected by the distribution manifest for
renderer, tray, Linux autostart, DMG, macOS, Windows, and Linux packaging. The
functional animated voice-state symbol is not a brand asset and remains intact.
Electron Builder converts the distribution's 512-pixel PNG into platform icon
formats; Oppulence releases remove the upstream `Assets.car` identity.

## Local released-backend stack

The fork-owned Compose project under `distributions/oppulence-voice/` runs
PostgreSQL, Redis, Temporal, the Rowboat API, the Temporal worker, and a mock
WorkOS/vendor devstack. It pulls
`ghcr.io/oppulence-engineering/desktop-assistant-rowboat-api:production-latest`
and never builds or copies backend source.

Rowboat assigns `production-latest` to the deployed multi-architecture digest
only after production migrations, rollout checks, and authenticated smoke tests
pass. Developers can override `ROWBOAT_API_IMAGE` with a versioned tag or digest
to reproduce a release exactly.

`OPPULENCE_VOICE_API_URL` is a Zod-validated development override accepted only
for the Oppulence Voice distribution. It permits HTTPS and loopback HTTP, which
lets main and renderer processes share the local API identity without adding a
second manifest.

The TypeScript backend smoke client performs mock PKCE authentication, API-key
creation, verifier retrieval, encrypted sync creation/listing/tombstoning, and
capture-artifact idempotency checks.

## Product and documentation surfaces

Oppulence Voice is listed as a product at `https://oppulence.io/voice` within
the existing `rowboat-www` application. It does not own a separate marketing
deployment.

Public product documentation is a fork-owned Astro Starlight site deployed as
static Cloudflare Worker assets at `https://docs.oppulence.io`. It links to the
live Rowboat OpenAPI reference rather than copying generated API contracts into
the fork.

## Low-conflict extension seams

Extensions are shipped, compile-time-trusted modules, not arbitrary runtime
plugins. The Zod manifest enum and `EXTENSION_MODULES` registry form two separate
allowlists. A module must also declare its renderer method allowlist.

The stable seams are:

1. main-process startup and teardown through `DistributionExtensionHost`;
2. mutation observation through `subscribeToBroadcast`, adjacent to the existing
   renderer broadcast path;
3. one namespaced preload bridge whose invocations are checked by the TypeScript host;
4. one renderer contribution slot in the Integrations view.

Oppulence features must not patch the core database, provider registries, or large
settings components when one of these seams can express the behavior.

## Rowboat `CaptureArtifact` contract

The initial `schemaVersion: "1.0"` envelope contains:

- stable `eventId` and logical `artifactId`;
- `note`, `transcription`, or `speaker_mapping` kind;
- `upsert` or `delete` operation;
- occurrence time and local source identity;
- explicit `user_opt_in` consent basis and Rowboat destination;
- local-capture provenance;
- SHA-256 content hash;
- content for upserts and `null` for tombstones.

The Zod `CaptureArtifactSchema` validates every envelope before enqueueing it.
The current transport posts to `<configured endpoint>/capture-artifacts` with a
Bearer token and `Idempotency-Key: <eventId>`. Rowboat exposes that compatibility
route and the canonical `/v1/capture-artifacts` route. It verifies the envelope's
content hash, consent basis, tombstone shape, tenant, and idempotency identity
before acknowledging it.

The first event set is note add/update/delete, transcription
add/update/delete/clear, and explicit speaker-mapping update/removal. Speaker
mapping artifacts use `<noteId>:<speakerId>` as their local logical identity.

## Delivery semantics

The extension uses `oppulence-rowboat-outbox.sqlite` under Electron `userData`,
separate from the OpenWhispr database. `event_id` is the primary key, making
enqueue idempotent. Successful 2xx responses acknowledge and remove events.
Failures store a bounded error and retry with exponential backoff capped at one
hour. Users can force pending rows due immediately.

Tokens are encrypted with Electron `safeStorage` before a mode-0600 settings file
is written. Connection is rejected when secure credential storage is unavailable.
Only HTTPS endpoints are accepted, except localhost HTTP for development.

Disconnecting stops new capture but retains the durable outbox. This preserves
evidence the user already consented to send; a separate destructive “discard
pending captures” control would require an explicit product decision.

## Merge discipline

- Upstream fixes should be contributed upstream when possible.
- Fork behavior belongs in manifests, extensions, tests, and fork documentation.
- Hook changes should remain small and semantic; do not reformat upstream files.
- Nightly upstream synchronization continues through the reviewed `upstream` PR.
- A generated brand-leak check should permit upstream technical/service names but
  reject incorrect product identity in packaged metadata and primary UI surfaces.

## Rollout

1. Validate both manifests, generated release configs, branding, extension
   allowlists, and CaptureArtifact schemas in CI.
2. Provision Oppulence signing identities and final platform assets.
3. Deploy the Rowboat migration and API, register the exact WorkOS loopback
   redirect URI, and configure the production Oppulence API origin.
4. Run a validate-only release on macOS, Windows, and Linux.
5. Test upgrades from one Oppulence Voice version to another and confirm that no
   updater request targets the upstream OpenWhispr repository.
6. Pilot opt-in export, offline capture, retry, duplicate delivery, disconnect,
   and tombstone behavior before enabling broadly.
7. Add Rowboat's asynchronous relationship projection and the product UI for
   inspecting projection and deletion status; acknowledgement currently means
   durable acceptance, not completed graph projection.

## Success criteria

- Installed application surfaces consistently say Oppulence Voice.
- Bundle/protocol/Linux/update identities do not collide with OpenWhispr.
- Upstream syncs do not require editing Oppulence extension implementation.
- Capture continues without Rowboat connectivity.
- Rowboat receives idempotent, consented artifacts and deletions.
- The default OpenWhispr distribution remains buildable from the same source.

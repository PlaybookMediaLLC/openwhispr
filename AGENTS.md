# AGENTS.md — Oppulence OpenWhispr Fork

This repository is an upstream-tracking OpenWhispr fork that ships the
Oppulence Voice distribution. Implement changes so routine upstream merges
remain inexpensive and reviewable.

## Primary rule: minimize upstream merge conflicts

Prefer this implementation order:

1. Add Oppulence-owned behavior in fork-owned files.
2. Use an existing stable seam.
3. If no seam exists, add the smallest generic hook to upstream-owned code and
   keep the feature implementation in a fork-owned module.
4. Modify upstream business logic directly only when the requested behavior
   cannot be expressed safely through a hook.

Fork-owned locations include:

- `distributions/` for product, release, service, and platform identity;
- `extensions/` for Oppulence-specific behavior and integrations;
- `src/extensions/` for the stable extension host;
- `src/config/distribution*.ts`, `src/config/branding.ts`, and
  `src/config/rowboat.ts` for validated cross-process contracts;
- `src/components/distribution/` for distribution-specific UI contributions;
- fork RFCs and `FORK.md` for architecture and maintenance policy.

Stable seams currently include:

- `DistributionExtensionHost` for main-process lifecycle;
- `subscribeToBroadcast` for observing existing mutation events;
- `distributionExtensions` for namespaced preload IPC;
- `DistributionIntegrationSlots` for distribution-specific renderer UI;
- the selected Zod-validated distribution manifest for identity and release
  configuration.

## Rules for upstream-owned files

- Make surgical edits. Every changed line must be necessary for the requested
  behavior.
- Do not reformat, reorder, rename, or clean up unrelated upstream code.
- Do not move upstream files merely to fit a fork-specific architecture.
- Avoid editing large registries, database implementations, locale catalogs,
  and provider routing when a manifest, adapter, subscriber, or contribution
  slot can express the change.
- Do not copy an upstream subsystem into Rowboat or duplicate it inside an
  extension. Integrate through versioned contracts.
- Keep OpenWhispr provider IDs and the `OpenWhispr Cloud` service identity when
  they refer to the actual managed service. Product-facing identity comes from
  the distribution manifest.
- When a new reusable seam is required, make it product-neutral so it can be
  proposed upstream independently of the Oppulence feature.

## TypeScript and validation

- Write new fork-owned application code in TypeScript or TSX, not JavaScript.
- Infer TypeScript types from Zod schemas at trust boundaries, including
  manifests, IPC payloads, stored configuration, and exported artifacts.
- Parse untrusted runtime values. Do not replace validation with type casts.
- Existing upstream JavaScript entry points may receive a minimal call into a
  typed fork-owned module; do not convert whole upstream files solely for style.

## Product boundary

- Oppulence Voice owns capture, transcription, native permissions, local voice
  behavior, and delivery of consented capture artifacts.
- Rowboat owns relationship management, canonical relationship identity,
  evidence interpretation, and consequential actions.
- Rowboat must not read the desktop application's SQLite database directly.
- Cross-product data moves through the versioned `CaptureArtifact` contract and
  a durable delivery boundary.

## Before finishing a change

1. Inspect `git diff --stat` and `git diff --check`.
2. Confirm feature logic is concentrated in fork-owned files.
3. List every upstream-owned file changed and justify each hook.
4. Revert incidental formatting or cleanup unrelated to the request.
5. Add focused tests for new contracts and hook behavior, preferably in new
   test files.
6. Run the smallest relevant tests, then the repository quality checks required
   by the affected area.
7. Report any remaining high-conflict touchpoint or upstream assumption in the
   handoff.

If two designs satisfy the request, choose the one that changes fewer
upstream-owned lines, even if the fork-owned implementation is slightly more
verbose.

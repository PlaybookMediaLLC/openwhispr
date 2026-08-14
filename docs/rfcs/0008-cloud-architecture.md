# RFC 0008: Cloud Architecture — Three Zones

- **Status**: Draft
- **Depends on**: RFC 0003 (E2E sync is Zone 2's core), RFC 0006 (consent link service), RFC 0007 (connector wake signals)
- **Governs**: every future "should this go to the cloud?" decision

## Summary

One product, three zones. The cloud coordinates; the device computes. Every cloud component must deliver a feature the device physically cannot, without holding the corpus in readable form. There is no "local version vs cloud version" — that framing dies here.

The deciding line for every future case:

> **The cloud may hold ciphertext, metadata, and doorbells forever. It may hold plaintext only transiently, only per explicit user action. It may hold voice or audio never.**

## Zone 1 — Device: everything that touches plaintext

Audio, transcripts, embeddings, Qdrant, FTS5, evidence extraction, clustering, voice prints. This never moves. It is the margin (the user's hardware is our infrastructure) and the compliance claim. Voice prints never leave the device except inside the E2E vault (RFC 0003), and never in plaintext anywhere.

## Zone 2 — Zero-Knowledge Cloud: always on, never able to read

Most of our cloud. It must be provably dumb:

1. **Identity, workspaces, billing, referrals.** Already built.
2. **Encrypted sync relay + blob store** (RFC 0003). Ciphertext blobs, wrapped keys, version counters. Delivers the two things users fear most about local-first — losing the corpus, and team access anywhere — at zero privacy cost.
3. **Wake signals and cursors for connectors** (RFC 0007). Laptops sleep; webhooks do not wait. The cloud receives the Zendesk/HubSpot webhook but stores only "something changed" plus a cursor. The device pulls the actual content directly from the source API when awake. The cloud holds a doorbell, never a ticket body.
4. **The consent opt-out link service** (RFC 0006). Stores opt-outs only.
5. **Update, model, and binary distribution.** CDN. Boring, necessary.

The server-visible metadata surface (sizes, timestamps, membership, blob ids, wake signals) is documented publicly per RFC 0003 M4. The honesty is part of the product.

## Zone 3 — Transient-Plaintext Cloud: opt-in, per-action, never stored

Cloud as compute you borrow, not a place data lives:

1. **Frontier inference on demand.** Local models handle extraction and labeling (RFC 0004, RFC 0005). Deep synthesis — "write a positioning doc from 200 findings" — may route to a frontier model through the existing `openwhispr` provider path. Excerpts go up, the answer comes back, nothing persists. Positioning: "local by default, frontier when you ask." This is also a natural paid-tier meter.
2. **Published artifacts.** Quote cards, case studies, and evidence links shared outside the team need a hosted render. Only explicitly published content gets a URL. Publishing is the consent.
3. **Mobile capture.** A phone app for in-person customer conversations (conferences, sales visits). It records, transcribes on-device where hardware allows (transient cloud where it does not), and syncs into the vault E2E. Keys arrive via device-linking (RFC 0003), never via server escrow.

## The Org Tier: Bring the Cloud to the Data

Some orgs will demand always-on, org-wide processing — ingest 100k tickets nightly with no laptop open. We do not solve that by letting our cloud read plaintext. We ship a **workspace node**: a headless build of the same pipeline, run in the customer's VPC or on their own hardware.

- It joins a space like any team member: its own device keypair, wrapped space keys, E2E sync.
- It does the always-on work: connector ingestion, extraction backfills, nightly consolidation (RFC 0005).
- Their infrastructure, our software, our zero-knowledge cloud untouched.

This is the "cloud model" revenue line that never betrays the one sentence the company stands on. It is also the honest answer to enterprise procurement: heavy compute exists, and the customer controls it.

## Deliberate Exclusion: Cross-Company Benchmarks

"Your pricing-objection rate vs the industry" is tempting network-effect bait. Parked indefinitely. Even opt-in aggregate telemetry muddies the story that wins the regulated market, and the story is worth more than the feature. Revisit only if the market position is already won.

## Why This Maximizes Product Value

Each cloud component maps to a top user fear or desire — losing the corpus, team access, always-on ingestion, frontier depth, sharing, mobile — while the corpus stays where the pricing power and the compliance wedge both come from: on hardware we do not pay for and cannot be compelled to produce.

## Milestones

Zone 2 items ship with their owning RFCs (0003, 0006, 0007). This RFC adds:

1. **M1**: Frontier-inference path audited against the transient rule (no logging of prompt content server-side; document it).
2. **M2**: Published-artifacts surface.
3. **M3**: Workspace node (headless build + join-as-device flow).
4. **M4**: Mobile capture companion.

## Open Questions

- Whether the workspace node is a separate build target or the existing Electron app with a `--headless` flag. Start with the flag; a separate target is maintenance debt until the tier proves demand.
- Metering for frontier inference (per-request vs token bucket) — decide with pricing, not before.

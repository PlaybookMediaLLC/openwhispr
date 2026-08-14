# RFC 0003: E2E-Encrypted Team Sync

- **Status**: Draft
- **Depends on**: none (independent track)
- **Feeds**: RFC 0001 M4 (shared speaker profiles)

## Summary

A shared team corpus where the server cannot read the evidence. Notes, transcripts, findings, and speaker profiles sync between team members as ciphertext. This is the feature that closes regulated buyers, and the feature no cloud-first competitor's architecture allows.

## Current State

- Notes carry sync metadata today: `cloud_id`, `client_note_id`, `sync_status`. Spaces carry `cloud_team_id`, `workspace_id`, `sync_status`.
- Sync payloads are server-readable.
- Search is already fully local (FTS5 + Qdrant). This is the architectural gift: E2E sync only has to move data, not make it server-searchable.
- Secrets already use OS keychains via `safeStorage` (`userData/secure-keys/`).

## Design

### Keys

- **Device keypair.** Each install generates an asymmetric keypair. The private key lives in the OS keychain via the existing `safeStorage` path.
- **Space content key.** Each space has a symmetric key. Note payloads encrypt with it (XChaCha20-Poly1305 via libsodium).
- **Distribution.** The space key is wrapped for each member's device public keys. An invitation wraps the key for the invitee. The server relays wrapped keys but cannot unwrap them.
- **Revocation.** Removing a member rotates the space key and re-wraps for the remaining members. Old content re-encrypts lazily on next write. Accept the standard limitation: a revoked member may retain what they already synced.
- **Recovery.** An optional org recovery key, generated at workspace creation, held by the admin offline. Without it, losing all devices loses the vault. State this tradeoff in the product, plainly.

### Data path

- The server stores: ciphertext blobs, blob ids, space id, version counters, timestamps, membership. Document this metadata surface explicitly — it is the honest part of the privacy claim.
- Phase 1 keeps today's last-writer-wins semantics, just encrypted.
- Phase 2 moves note content to CRDT updates (Yjs) shipped as an encrypted append log per note, compacted client-side. This gives offline-first concurrent editing without the server ever merging plaintext.

### Search and intelligence

Each client indexes what it can decrypt, locally, using the FTS5 and Qdrant pipelines that already exist. No server-side index exists to leak. On-device intelligence (RFC 0005) runs per-client over the decrypted local copy.

### What stays out of scope

- Web viewer parity. A browser client weakens the key story; if built later, it gets keys via device-linking (WhatsApp-style), never via server escrow.
- Server-side extraction or clustering. By design, the server cannot.

## Why This Is the Moat

Gong, Fireflies, and Enterpret run server-side pipelines on plaintext; E2E encryption would delete their own product. Our pipelines are already client-side, so encryption costs us sync plumbing, not the product. The gap is structural, and structural gaps do not close with a feature sprint.

## Milestones

1. **M1**: Encrypted blob sync for notes and transcripts, LWW semantics, single-device per user.
2. **M2**: Multi-device, invitations, key rotation, and revocation.
3. **M3**: CRDT note content (Yjs) over the encrypted log.
4. **M4**: Shared speaker profiles and findings in the vault; third-party security audit; publish the metadata surface.

## Open Questions

- Yjs vs Automerge — pick by payload size and Electron perf, measure first.
- Whether findings (RFC 0004) sync as rows or re-extract per client. Syncing rows is cheaper; re-extraction avoids trusting another client's extraction. Default: sync rows, mark provenance.

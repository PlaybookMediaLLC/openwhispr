# RFC 0007: Connector Breadth

- **Status**: Draft
- **Depends on**: RFC 0002 (resolution on ingest), RFC 0004 (findings pipeline)
- **Character**: boring, grinding, compounding

## Summary

Every connector widens the corpus gap between us and a fresh fork of this repo. Tickets, Notion, CRM notes, reviews, and exports all flow into the same local pipeline: normalize → resolve identity → extract findings → index. One envelope format, one SDK, many sources.

## Current State

- Ingest already exists for audio upload (`UploadAudioView`, batch queue), URL ingest, and the unified note save path (#1625).
- OAuth machinery exists: `oauthLoopbackFlow.js` runs a PKCE auth-code flow over a loopback server — built for calendars, reusable for every OAuth connector.
- Token storage exists: the `safeStorage` secure-keys path.
- `IntegrationsView.tsx` and `McpIntegrationCard.tsx` exist — there is already a surface for integrations, including MCP.

## Design

### One envelope

Every connector emits the same shape:

```ts
interface SourceDocument {
  source: string;          // 'zendesk' | 'intercom' | 'notion' | 'hubspot' | ...
  externalId: string;      // stable id in the source system
  externalUrl?: string;    // deep link back to the source
  author?: { email?: string; name?: string; crmId?: string };  // → RFC 0002
  createdAt: string;
  title?: string;
  body: string;            // plain text or markdown
  metadata: Record<string, string>;  // deal stage, ticket status, tags, ...
}
```

Documents land as notes (`note_type` per source) through the existing save path, then flow through identity resolution (RFC 0002) and evidence extraction (RFC 0004) exactly like a transcript. No connector gets a private pipeline.

### The SDK contract

A connector implements three things:

1. `auth()` — OAuth via `oauthLoopbackFlow.js` or an API-key field; tokens go to secure storage.
2. `pull(cursor) → { documents, nextCursor }` — incremental, resumable, rate-limit-aware. Cursors persist in SQLite; a crashed sync resumes, never restarts.
3. `manifest` — name, icon, scopes requested, and what data it reads (rendered in the UI; the consent story extends to connectors).

All pulls run in the main process on a shared scheduler with per-source backoff (the `calendarSyncInterval.js` pattern generalizes).

### MCP as the force multiplier

`McpIntegrationCard` already exists. Wrap any MCP server's resources into the `SourceDocument` envelope and every MCP integration becomes a read connector we did not have to write. First-party connectors are for the sources that matter most and need real incremental sync; MCP covers the long tail from day one.

### Priority order

Ranked by evidence density per document and buyer pull:

1. **Zendesk** and **Intercom** — support tickets are the highest-volume customer-verbatim source.
2. **Notion** — where interview notes already live.
3. **HubSpot**, then **Salesforce** — CRM notes + deal stage (unlocks the heatmap's deal dimension).
4. **App-store / G2 reviews** — public verbatims, zero auth friction, great for trials.
5. **Slack** shared channels — high value, consent-sensitive; ships only with workspace policy gates (RFC 0006).
6. **Competitor exports** (Gong, Fireflies, Otter takeout files) — deliberate: import their corpus, inherit their customers' history, remove the switching cost.

### Scale guards

Ticket corpora are large (100k+ documents). Backfills are windowed (newest first), throttled, and resumable; extraction backfill is a background queue with visible progress. Qdrant and SQLite sizes get monitored with a corpus-size view so "index everything" degrades loudly, not silently.

## Milestones

1. **M1**: Envelope + SDK + scheduler; Zendesk connector end-to-end (auth → pull → resolve → extract → searchable).
2. **M2**: Intercom + Notion; MCP resource wrapper.
3. **M3**: HubSpot with deal-stage metadata; competitor export importers.
4. **M4**: Reviews + Slack (behind RFC 0006 workspace policy); connector directory in `IntegrationsView`.

## Open Questions

- Whether connectors run in-process or in a utility process. Start in-process (they are I/O-bound); move if a misbehaving API client ever stalls the main process.
- Two-way sync (pushing findings back to CRM). Out of scope until the read side proves out; write access changes the permission conversation entirely.

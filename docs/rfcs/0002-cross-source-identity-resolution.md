# RFC 0002: Cross-Source Identity Resolution

- **Status**: Draft
- **Depends on**: RFC 0007 (connectors supply the sources)
- **Feeds**: RFC 0004 (evidence graph)

## Summary

Stitch the same customer across calls, tickets, Notion notes, and CRM rows — locally, with no cloud join. One person, one record. One company, one account. Without this, the evidence graph counts the same customer five times or zero times.

## Current State

- `contacts` (email primary key, display name) is populated from calendar attendees.
- `speaker_profiles.email` links a voice to an email.
- Notes carry participants (`NoteParticipants.tsx`).
- There is no organization concept and no link table across sources.

## Design

### Canonical entities

Two new tables:

```sql
CREATE TABLE entities (          -- people
  id INTEGER PRIMARY KEY,
  display_name TEXT,
  org_id INTEGER,                -- FK to orgs
  primary_email TEXT
);
CREATE TABLE orgs (              -- companies / accounts
  id INTEGER PRIMARY KEY,
  name TEXT,
  domains TEXT                   -- JSON array
);
```

Every source record links through one table:

```sql
CREATE TABLE entity_links (
  entity_id INTEGER NOT NULL,
  source TEXT NOT NULL,          -- 'calendar' | 'speaker' | 'zendesk' | 'hubspot' | ...
  source_ref TEXT NOT NULL,      -- external id or local row ref
  confidence REAL NOT NULL,
  method TEXT NOT NULL,          -- 'email' | 'crm_id' | 'domain' | 'probabilistic' | 'manual'
  PRIMARY KEY (source, source_ref)
);
```

### Resolution ladder (deterministic first)

1. **Email exact match.** Same normalized email = same person. This resolves most calendar, ticket, and CRM records.
2. **CRM ID.** When a connector provides a stable contact/account ID, trust it.
3. **Domain → org.** Corporate email domain maps person → org. Maintain a free-mail blocklist (gmail, outlook, yahoo, …). A free-mail domain never implies an org.
4. **Probabilistic, last.** Name similarity + meeting co-occurrence + org context produce a score. Above a high threshold: queue a "same person?" suggestion. Never merge silently on probabilistic evidence.

Resolution runs incrementally on ingest, not as a batch job. Each connector document passes through the ladder before it lands in the evidence pipeline.

### Merge, split, audit

- Every merge writes an audit row with the pre-merge state, so merges are reversible (reuse the journal pattern from `optimistic_folder_delete_rows`).
- The UI shows *why* two records merged (`method`, `confidence`). Explainability is what makes users trust the counts.
- A wrong merge poisons every downstream count. Reversibility is a hard requirement, not polish.

### Why local resolution is the moat

Cloud platforms resolve identity server-side with cross-tenant tooling. We resolve it on-device against a private corpus. It is harder — no shared enrichment database — but it means customer identity data never leaves the machine, which is the compliance story regulated buyers pay for. Optional enrichment (e.g., Clearbit-style domain → company name) must be explicit opt-in and clearly marked as an external call.

## Milestones

1. **M1**: `entities`/`orgs`/`entity_links` + email and domain resolution over existing calendar and speaker data.
2. **M2**: Connector hook — every ingested document resolves on arrival (with RFC 0007 M1).
3. **M3**: Probabilistic suggestions + merge/split UX with audit.
4. **M4**: Account view — all evidence for one org in one place.

## Open Questions

- Person-level vs org-level defaults for the evidence graph rollups (RFC 0004) — likely org for B2B, person for B2C.
- How to handle contractors and agencies (one person, many orgs) — `entity_links` allows it; the UI must not hide it.

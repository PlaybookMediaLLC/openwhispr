# RFC 0004: The Evidence Graph

- **Status**: Draft
- **Depends on**: RFC 0001 (speakers), RFC 0002 (entities)
- **Feeds**: RFC 0005 (intelligence runs over findings)

## Summary

Turn transcripts and documents into structured, quoted, timestamped findings, linked to speakers, people, and companies. This is the schema behind every instrument (pain leaderboard, objection tracker, segment heatmap, change detection) and behind "ask the corpus."

The product rule lives here: **no insight without a quote and a source.** The schema enforces it with NOT NULL columns.

## Current State

- Sources land in `notes` (with FTS5) and `transcriptions`. Diarized transcripts carry speaker labels via `speaker_mappings`.
- Per-note embeddings live in Qdrant (`vectorIndex.js`, MiniLM, 384-dim).
- Per-scope LLM routing exists (`src/config/inferenceScopes.ts`, `selectResolvedLLMConfig`). Adding a scope is an established pattern.
- The agent already has `search_notes`; `MeetingTranscriptChat` chats with one transcript.

## Design

### The findings table

```sql
CREATE TABLE findings (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,        -- 'meeting' | 'upload' | 'zendesk' | 'notion' | ...
  quote TEXT NOT NULL,              -- verbatim, never paraphrased
  span_start INTEGER NOT NULL,      -- char offset into the source content
  span_end INTEGER NOT NULL,
  timestamp_ms INTEGER,             -- audio position when the source is a recording
  speaker_profile_id INTEGER,       -- RFC 0001
  entity_id INTEGER,                -- person, RFC 0002
  org_id INTEGER,                   -- company, RFC 0002
  finding_type TEXT NOT NULL,       -- 'pain' | 'objection' | 'pull' | 'feature_ask'
                                    -- | 'competitor' | 'workaround' | 'wom'
  severity INTEGER,                 -- 1..3, from language intensity
  cluster_id INTEGER,               -- RFC 0005
  confidence REAL NOT NULL,
  model TEXT NOT NULL,              -- extraction provenance
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Finding embeddings go to a second Qdrant collection (`findings`), reusing `localEmbeddings.js`.

### Extraction

- New inference scope: `evidenceExtraction` in `inferenceScopes.ts`, with the standard fallback chain (local model by default — extraction must not require a cloud key).
- Trigger: after transcription completes and after each connector document lands. Also a backfill job over the existing corpus.
- **Customer-words-only rule**: utterances from speakers whose profile has `is_internal = true` (RFC 0001) are never extracted as customer evidence. For text sources, the author's entity decides.
- The extractor returns quote + span. Validate the span: the quote must appear at the claimed offset, or the finding is rejected. This is the anti-hallucination gate, enforced in code, not in the prompt.

### Edges beyond the source

- **Releases**: a `release_markers` table (date, label, notes). Manual entry first; CHANGELOG ingestion later. Enables "objection X fell after release Y."
- **Deals**: CRM connector (RFC 0007) attaches deal stage to orgs; the heatmap and pull trends read it.
- **Clusters**: RFC 0005 writes `cluster_id`; the leaderboard is `GROUP BY cluster_id`.

### Query surface

- Agent tool `search_evidence`: hybrid FTS + vector over findings, filterable by type, org, speaker, date. Every answer carries quote + note link + timestamp — clicking a finding opens the note at the span.
- The four instruments are views over this table plus cluster rollups. They contain no logic of their own.

## Milestones

1. **M1**: Table + `evidenceExtraction` scope + span validation. Extract on new transcripts.
2. **M2**: Backfill the existing corpus; `search_evidence` agent tool.
3. **M3**: Release markers and the objection-vs-release view.
4. **M4**: Entity/org joins complete (with RFC 0002 M2); segment heatmap ships.

## Open Questions

- One finding per statement vs merged findings per call — start one-per-statement; clustering (RFC 0005) does the merging.
- Whether `severity` from language intensity is reliable enough to rank on. Ship it behind the frequency sort, never above it.

# RFC 0005: On-Device Intelligence at Consumer-Hardware Speed

- **Status**: Draft
- **Depends on**: RFC 0004 (findings are the input)
- **Feeds**: the four instruments (leaderboard, objection tracker, heatmap, change detection)

## Summary

Clustering, trends, and change alerts computed locally, on the user's machine, fast enough to feel instant on a mid-range laptop. Competitors run this on cloud GPUs and price accordingly. Running it on-device is the performance work that protects both the privacy claim and the 90% gross margin.

## Current State

- Finding embeddings (384-dim MiniLM) are computed locally (`localEmbeddings.js`) and stored in Qdrant.
- Heavy native inference already runs in the ONNX utility process (`onnxWorkerClient.js` → `onnxWorker.js`), which isolates crashes and keeps the main process responsive. New compute belongs there or in a sibling utility process.
- SQLite holds all counts and metadata; better-sqlite3 is synchronous and fast.

## Design

### Clustering

- **Algorithm**: incremental greedy centroid clustering. A new finding joins the nearest cluster above a cosine threshold, else it starts a new cluster. Periodic (nightly) consolidation pass merges clusters whose centroids converge and splits incoherent ones.
- Chosen over HDBSCAN-style batch clustering because the corpus grows one finding at a time and users expect the leaderboard to update on ingest, not overnight. The nightly pass corrects greedy drift.
- Runs in the utility process. Centroids persist in SQLite; membership is `findings.cluster_id`.
- **Labels**: each cluster is labeled by its medoid quotes plus a short LLM-generated title (local model scope). The label is presentation; the quotes are the truth.

### Trends and change detection

- Materialize weekly counts per cluster (and per org, per finding type) into a `cluster_stats` table. Pure SQL.
- Alert when the current window's count deviates from the trailing 8-week baseline beyond a z-score threshold, with a minimum absolute count to suppress small-number noise.
- "Mentions of 'slow sync' up 3× since the March release" = change detection joined to `release_markers` (RFC 0004).
- No ML here on purpose. Counting is credible; forecasting is not. Ship counting.

### Performance budget (the actual feature)

Targets on the baseline machine (M1 / 8 GB, and a mid-range x64 laptop):

| Operation | Target |
| --- | --- |
| Incremental cluster assign (1 finding) | < 50 ms |
| Nightly consolidation, 10k findings | < 30 s |
| Leaderboard query | < 100 ms |
| Full backfill, 50k findings | < 10 min, background |

- Memory cap for the clustering pass; above the cap, sample and log the truncation visibly ("clustered 40k of 62k — consolidation continues in background"). Silent truncation is forbidden.
- All passes are resumable; app quit mid-pass loses nothing.

### Why competitors will not follow

Their pipelines assume elastic cloud compute and server-visible plaintext. Matching this requires rewriting their product to run inside a desktop app on unpredictable hardware — a rewrite, not a feature. Every optimization here widens both the margin gap and the privacy gap at once.

## Milestones

1. **M1**: Incremental clustering + pain leaderboard over findings.
2. **M2**: `cluster_stats`, trend lines, and the change-detection alert.
3. **M3**: Consolidation pass, performance budget met and measured in CI on the baseline profile.
4. **M4**: Heatmap rollups (needs RFC 0002 org joins).

## Open Questions

- Whether MiniLM (384-dim) separates objection nuances well enough, or clustering needs a larger local embedding model for findings only. Measure before swapping; model size costs every user's disk and RAM.

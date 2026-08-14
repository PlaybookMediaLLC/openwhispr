# Vision: The Customer Intelligence Platform

OpenWhispr grows from a dictation app into a customer intelligence platform. We capture every customer conversation, turn it into linked evidence, and make it queryable by the whole company.

One sentence: **the company's most valuable dataset — what customers actually said — is captured nowhere, owned by no one, and unqueryable by anyone. We fix that.**

## The Problem

Companies talk to their customers constantly and still make decisions by anecdote.

1. **The signal is fragmented.** Customer truth arrives in sales calls, CS calls, support tickets, interview notes in Notion, CRM fields, community threads, and churn emails. Each lives in a different tool, owned by a different team. No one sees the whole customer.
2. **The signal decays instantly.** A call becomes a summary. A summary becomes a bullet in a deck. A bullet becomes "customers are saying…" in a meeting — with no quote, no speaker, no count. By the time it reaches a roadmap decision, it is folklore.
3. **The loudest anecdote wins.** Without aggregation, the last angry enterprise customer outweighs 200 quiet tickets that describe the same bug. Product ships the wrong thing confidently.
4. **Nobody can answer frequency questions.** "How often do customers mention pricing?" "Is the onboarding complaint growing since the redesign?" "Which segment asks for SSO?" Every company has this data. Almost none can query it.
5. **Existing tools fail structurally.** Call bots (Gong, Fireflies) get blocked by legal, sit only in sales calls, and upload everything to a vendor cloud. Feedback tools (Dovetail, Enterpret) need manual upload or engineering-owned pipelines, so the corpus is always partial. Per-seat pricing rations access — and rationed access defeats a system of record.

## The Solution: Five Layers

### 1. Capture everything, with no bot and no cloud

The system-audio helpers hear both sides of any call on any app — Zoom, Teams, Meet in a browser — with no participant in the meeting. Meeting detection plus three calendar syncs make capture zero-effort: the user forgets the tool exists and the corpus still grows. Audio is processed locally. Competitors cannot ship this layer. It is done.

### 2. Ingest the rest

Upload, batch queue, and URL ingest exist today. We add connectors: support tickets (Zendesk, Intercom), Notion pages, CRM notes, app-store reviews. Everything lands in the same notes and vector store we already run.

### 3. Turn recordings into evidence, not summaries

Diarization with speaker IDs makes every statement attributable. Calendar metadata attaches company, role, and deal stage. An extraction scope converts each source into structured, quoted, timestamped findings: pains, objections, pull signals, feature asks, competitor mentions.

**The product rule: no insight without a quote and a source.** This rule makes it a system of record instead of another AI summarizer.

### 4. Measure, do not summarize

We cluster findings over the embeddings we already compute. Four instruments:

- **Pain leaderboard** — ranked by frequency and severity, in customer words, trended over time.
- **Objection tracker** — did the pricing objection fall after the repackage? Now you know.
- **Segment heatmap** — segment × pain × pull. Shows where demand concentrates.
- **Change detection** — "mentions of 'slow sync' up 3× since the March release." The alert a CPO pays for.

### 5. Give every team the same evidence, in their format

The agent plus semantic search becomes "ask the corpus." Product asks what to build. Marketing asks which words convert. Sales asks which objections are rising. Every answer arrives with receipts. Content generation (case studies, quote cards, messaging docs) is an output tab, not the product. Teams, workspaces, and shared spaces already distribute it.

## Why We Win

- **Completeness beats intelligence.** The category winner holds the most complete corpus. Botless, effortless, local capture maximizes completeness. Every competitor's capture is partial by design: bots get blocked, uploads get forgotten.
- **Local-first flips the compliance objection into the buying reason.** "Customer audio never leaves your machines" closes fintech, healthcare, and EU deals that cloud bots cannot enter.
- **Evidence-linked output rebuilds the trust that AI summaries burned.** Quote + speaker + timestamp on everything.
- **Price on the corpus, not on seats.** Data volume and connectors scale with value. Unlimited viewers spread the evidence through the org and make the platform hard to rip out.
- **Data gravity is the moat.** Every ingested ticket, call, and note makes the corpus more valuable and the switch more painful.

## The Business

- **The platform is the product.** Buyer: VP Product / CPO / RevOps at post-PMF companies. They have the volume, the budget, and the aggregation pain. Comparables set the ceiling: Gong for revenue teams, Enterpret and Dovetail for product orgs at $20k–$150k a year.
- **Founders are the wedge, not the revenue.** A cheap single-player tier plus the "achieve PMF with evidence" story brings them in. They graduate into team plans.
- **Content is a feature.** It demonstrates value fast ("here is a case study from Tuesday's call"). It is not the company.

## What We Must Build

The hard parts — capture moat, vector layer, diarization, the agent, team scaffolding — are in the repo. The gap is small and honest:

1. Extraction scope + one structured findings table (call_id, type, quote, speaker, timestamp, embedding ref).
2. Cross-source agent chat over that table and the existing vectors.
3. Clustering + the pain leaderboard view.
4. Pull scoring and the trend line.
5. Segment heatmap (calendar metadata joined to notes).
6. Connectors: tickets, Notion, CRM.
7. Consent UX for botless recording. Ship it before anyone else finds it for us.

One line: **capture is the wedge, evidence is the product, the compounding corpus is the moat.**

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

## The Path to a Billion Without Enterprise Pricing

$1B valuation ≈ $100M ARR. We do not need $100k contracts. We need ~300k paid seats at ~$25/month. Breadth, not ACV.

**Local processing makes breadth profitable.** Gong and Fireflies pay cloud GPU for every minute of every call, so they must charge $100+/seat/month. Our transcription, diarization, embedding, and search run on the user's machine. We charge $15–25 and keep 90%+ gross margin. Cheap pricing is not a sacrifice — it is a weapon our cost structure lets us fire and theirs does not. Say it on the pricing page: "We are 5x cheaper because your computer does the work and your audio never leaves it."

The ladder:

1. **Free forever: local dictation.** The Trojan horse. Every knowledge worker is a prospect. It costs us nothing to serve.
2. **Pro ($10–15/mo): the personal memory.** Your calls, your notes, your searchable corpus.
3. **Team ($25/seat/mo): the shared corpus.** Workspaces, spaces, shared evidence — already built.
4. **Org (priced on connectors + data volume, not seats).** Tickets, Notion, CRM, compliance controls. This tier funds the business. Unlimited viewers stay free so the evidence spreads and the product becomes hard to rip out.

The expansion motion is bottom-up: one PM installs the free tool, their pain leaderboard shows up in a roadmap meeting with receipts, and the team plan sells itself. The sales army is the artifact.

## The Moat: Build What Is Hard

This repo is a fork of open-source OpenWhispr. The inherited code is not a moat — anyone can fork it, including our competitors. The moat is the set of features that are genuinely hard to build, compound over time, and that cloud-first competitors will not build because cloud is easier. In priority order:

1. **Persistent speaker identity.** Recognize the same voice across meetings, on-device, with consent. We already compute speaker embeddings for diarization; extend them into a local voice-print library. "This is the 4th call where Dana from Acme raised pricing" is a sentence no competitor can say. Hard signal processing + privacy engineering.
2. **Cross-source identity resolution.** Stitch the same customer across calls, tickets, Notion notes, and CRM rows — locally. Entity resolution is hard everywhere; doing it without a cloud join is harder. It is what turns fragments into one customer record.
3. **End-to-end encrypted team sync.** A shared corpus where the server cannot read the evidence. CRDT sync over encrypted blobs is genuinely difficult — and it cements the compliance story that wins regulated buyers. No competitor's architecture allows it.
4. **The evidence graph.** Quotes linked to speakers, companies, deals, releases, and each other. This schema powers change detection, the segment heatmap, and objection trends. Easy to describe, hard to get right, and it deepens with every source connected.
5. **On-device intelligence at consumer-hardware speed.** Clustering, trend detection, and change alerts running locally. Performance engineering competitors skip because they can throw cloud GPUs at it. Our margin advantage lives here.
6. **Consent infrastructure.** Jurisdiction-aware recording consent (notify, two-party states, EU). Legal-engineering nobody wants to build. It becomes the procurement checklist item only we pass.
7. **Connector breadth.** Boring, grinding, compounding. Every connector widens the corpus gap between us and a fresh fork.

The corpus itself is the final moat: every captured call, ticket, and note raises switching cost. Features 1–7 exist to maximize how fast that corpus grows and how much it can say.

Each feature has a design RFC in [docs/rfcs/](docs/rfcs/README.md).

## Marketing: Run It on the Graveyard Corpus

We own a content engine built on loot-drop.io's 1,749 startup autopsies. It is the perfect narrative machine for this product, because the dataset proves the problem daily: **companies die guessing, and the evidence was in their customer conversations the whole time.**

The narrative spine: *"1,749 dead companies. Most of them were told — by their own customers — what was wrong. Nobody kept the receipts."*

How the corpus becomes the funnel:

1. **The "Ignored Evidence" angle on every autopsy.** Each daily autopsy already reconstructs the decision chain. Add one beat: the moment the market told them and they did not hear it — the churned customer, the unread objection, the feature nobody asked for. That beat's CTA is this product. Figures attribute to loot-drop.io; claims about living founders get flagged in the deliverable per canon.
2. **Corpus-level stat content.** Mine the dataset for aggregate proof: how many failures trace to "no market need," how many pivoted away from what customers asked for, median time from first warning sign to death. Each stat becomes a card, a thread, a chart — and an ad. The dataset is a proprietary research asset competitors cannot cite.
3. **A flagship series: "The Calls That Could Have Saved Them."** Reconstruct, from public post-mortems, what the customer signal looked like before the end — then show what a pain leaderboard of that company would have said six months out. Longform episode, atomized through the existing pipeline into shorts, threads, essays, and newsletter editions.
4. **The founder demo as content.** Run our own customer calls through the product publicly — live evidence audits, real pain leaderboards, real objection trends. The product marketing *is* founder-led content, and the artifacts are screenshots people share.
5. **Artifacts as distribution.** Quote cards, pain leaderboards, and evidence-linked case studies get pasted into Slack, decks, and LinkedIn. A subtle "evidence via" mark on exports turns every shared insight into an impression — the Loom loop. The referral system is already built.
6. **Bottom-funnel owned pages.** "Gong alternative without the bot." "Fireflies alternative that's local." "Call recording tools that pass EU/HIPAA review." High-intent queries, one-sentence differentiator, desperate buyers, no good incumbent answers.
7. **Acquisition hook stays simple.** Lead with "the notetaker with no bot in your meeting" — visual, demo-able, instantly understood. Intelligence is the retention story, not the hook.

The funnel, wired: Graveyard content (attention) → free local dictation (the Trojan horse) → "achieve PMF with evidence" Pro tier (the founder wedge) → team corpus (the business) → org connectors (the moat).

One positioning line, used everywhere: **"Your customers already told you what to build. We kept the receipts."**

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

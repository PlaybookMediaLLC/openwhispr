# RFC 0006: Jurisdiction-Aware Consent Infrastructure

- **Status**: Draft
- **Depends on**: none — and it gates RFC 0001 (voice prints) and constrains capture defaults
- **Ship order**: before or alongside the features it gates, never after

## Summary

Botless capture is the moat and also the legal exposure. Build consent as infrastructure: a policy engine that decides when recording is allowed, consent records that prove it, and a compliance surface that turns the risk into a selling point. The end state: we are the only tool in the category that *passes* the procurement checklist instead of dodging it.

## The Honest Constraint

A botless recorder cannot inject a notice into Zoom's chat or Teams' banner. In-meeting notice via the meeting platform is structurally unavailable to us. Consent must therefore come from: calendar-based notice before the meeting, audible/manual notice during it, workspace policy, and user attestation. This RFC states that plainly; pretending otherwise is how the category gets regulated against us.

## Current State

- Recording start/stop is fully user-initiated (hotkeys, meeting prompts). Nothing records silently today.
- `workspacePolicyManager.js` / `workspacePolicyCache.js` exist — workspace-level policy distribution is a built pattern to extend.
- Calendar sync (Google, Microsoft, Apple) gives us attendees and the ability to know about meetings in advance.
- Temp audio files are already deleted after transcription.

## Design

### Policy engine

A pure, unit-tested module (the `dockPolicy.js` / `autoStartPolicy.js` pattern) that answers one question: `mayRecord(meetingContext, workspacePolicy, userSettings) → allow | ask | block | allow_with_notice`.

Inputs:

- **Jurisdiction baseline.** The user declares their recording jurisdiction. A shipped table classifies it: one-party consent, two-party/all-party consent (e.g., CA, WA, FL, IL; most of the EU under GDPR), or unknown → treat as all-party.
- **Attendee signal.** Attendee email domains give a weak location prior. Weak means: it can only make policy stricter, never looser.
- **Workspace policy.** Admins set the floor: e.g., "always all-party rules," "external meetings require notice," "internal meetings allowed." Distributed via the existing workspace policy path.

### Consent mechanisms (layered)

1. **Pre-meeting notice.** Opt-in calendar integration appends a standard notice + link to invites the user organizes ("This meeting may be recorded — details/opt out: <link>"). The link records opt-outs.
2. **Meeting-start prompt.** The existing meeting-detection overlay gains a consent line: it shows the applicable rule and, under all-party policy, requires the user to confirm "I have informed participants" before recording arms. The confirmation is attestation, and it is logged as such.
3. **Audible notice (optional).** A short spoken notice played at record start for users who want belt-and-suspenders.
4. **Consent records.**

```sql
CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY,
  calendar_event_id TEXT,
  note_id INTEGER,
  participant TEXT,                -- email or 'attested-all'
  method TEXT NOT NULL,            -- 'invite_notice' | 'link_ack' | 'attestation' | 'audible'
  policy_snapshot TEXT NOT NULL,   -- the rule that applied, as JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Biometric tier (gates RFC 0001)

Voice-print storage is a separate, stricter consent class (GDPR biometric data; Illinois BIPA requires written consent and a retention schedule, with a private right of action). Separate toggle, separate consent text, workspace-level retention schedule, verified cascade deletion. RFC 0001 does not ship before this does.

### Retention and erasure

- Workspace retention policies: audio (default: delete after transcription — current behavior), transcripts, findings, voice prints. A scheduled purge job enforces them.
- Erasure request flow: given a person (entity from RFC 0002), enumerate and delete their utterances, findings, and voice data, with a deletion report.

### The compliance surface

Generate a procurement-ready document from *actual* settings: what is captured, where it is processed (this machine), what reaches servers (RFC 0003's metadata surface), retention, consent mechanisms in force. Legal teams buy documents like this. It is marketing built from schema.

## Milestones

1. **M1**: Policy engine + meeting-start consent prompt + `consent_records` + attestation logging.
2. **M2**: Invite notice + opt-out link; retention purge job.
3. **M3**: Biometric consent tier (unblocks RFC 0001 launch); erasure flow.
4. **M4**: Compliance surface generator; external legal review of the jurisdiction table.

## Open Questions

- Whether the opt-out link requires a small hosted service (it does — the one acceptable server touchpoint; it stores opt-outs only).
- How often the jurisdiction table needs legal review. Ship with counsel review and an update cadence, not as static data we wrote once.

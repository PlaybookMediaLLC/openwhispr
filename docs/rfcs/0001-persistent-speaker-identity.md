# RFC 0001: Persistent Speaker Identity

- **Status**: Draft
- **Depends on**: RFC 0006 (consent — biometric tier)
- **Feeds**: RFC 0004 (evidence graph)

## Summary

Recognize the same voice across meetings, on-device, with consent. Turn per-note diarization labels ("Speaker 2") into persistent people ("Dana from Acme"). The goal sentence: "This is the 4th call where Dana raised pricing."

## Current State

We are closer than the vision doc implies. The schema and models exist:

- `src/helpers/diarization.js` computes speaker embeddings with the sherpa-onnx CAM++ model (`3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx`), in the ONNX utility process.
- `speaker_profiles` stores a display name, an optional email, an embedding BLOB, and a `sample_count`.
- `note_speaker_embeddings` stores one embedding per speaker per note.
- `speaker_mappings` links a note's speaker label to a profile.
- `contacts` stores attendee emails from calendar sync. `liveSpeakerIdPolicy.js` handles live labels.

What is missing: automatic re-identification across notes, profile quality management, and the consent gate.

## Design

### Re-identification pipeline

1. Diarization completes. Each note speaker has an embedding in `note_speaker_embeddings`.
2. Compare each embedding to all profile centroids with cosine similarity.
3. Three outcomes, two thresholds (`T_auto` > `T_suggest`):
   - Above `T_auto`: auto-assign the profile. Record `method='auto'`.
   - Between: show a suggestion in the note UI ("Is this Dana?"). Never assign silently.
   - Below: leave unassigned. The user can name the speaker; naming creates a profile.
4. Tune thresholds against a labeled internal set before launch. Precision beats recall — a wrong name on a quote is worse than no name.

### Calendar prior

The candidate set for a meeting note is small: the attendees. Join `calendar_events` attendees to `contacts` to `speaker_profiles.email`. Restrict auto-assign to attendee-linked profiles. This raises precision and makes cold-start work: a 2-person meeting with one known voice resolves the other by elimination (suggest, do not auto-assign).

### Profile quality

- Update the centroid as a running mean, weighted by `sample_count` (the column exists for this).
- Store up to N sub-centroids per profile (different microphones and rooms shift embeddings). Match against the nearest sub-centroid.
- Add `speaker_profiles.is_internal` (set from workspace member emails). Internal speakers are excluded from customer-evidence extraction (RFC 0004).

### Merge and split

Users will create duplicate profiles. Provide merge (combine centroids, repoint `speaker_mappings`) and split (detach a note's mapping). Journal pre-merge state so merges are undoable — reuse the `optimistic_folder_delete_rows` journal pattern.

### Team sharing

Profiles sync only inside the E2E-encrypted vault (RFC 0003). Voice prints never reach a server in plaintext. Personal-tier profiles never leave the device.

## Privacy and Legal (this section is the feature)

Voice prints are biometric identifiers under GDPR and under Illinois BIPA. BIPA requires written consent and a retention schedule, and it has a private right of action.

- Voice-print storage is **off by default**. Enabling it runs the biometric consent flow from RFC 0006.
- Deleting a profile cascades: centroids, sub-centroids, and all `note_speaker_embeddings` rows for mapped speakers. Provide export (GDPR access) and verified erasure.
- Retention schedule is a workspace policy setting with a default (e.g., 3 years inactive → purge).

## Milestones

1. **M1**: Cross-note suggestions with manual confirm. No auto-assign.
2. **M2**: Auto-assign with the calendar prior. Merge/split UX.
3. **M3**: People view — per-person call history, first/last seen, linked quotes.
4. **M4**: E2E team-shared profiles (after RFC 0003 M2).

## Open Questions

- Threshold values for CAM++ embeddings on far-field meeting audio — needs measurement.
- Should a profile store audio snippets for user verification, or embeddings only? Embeddings only is the safer default.

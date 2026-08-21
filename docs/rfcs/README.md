# RFCs: Product Architecture and Capability Contracts

The first group designs the moat features from [VISION.md](../../VISION.md).
Each feature is hard to build and compounds with the others. Cloud-first
competitors will not build them, because cloud is easier.

| RFC                                                              | Feature                                          | Status                       |
| ---------------------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| [0001](0001-persistent-speaker-identity.md)                      | Persistent speaker identity                      | Draft                        |
| [0002](0002-cross-source-identity-resolution.md)                 | Cross-source identity resolution                 | Draft                        |
| [0003](0003-e2e-encrypted-team-sync.md)                          | E2E-encrypted team sync                          | Draft                        |
| [0004](0004-evidence-graph.md)                                   | The evidence graph                               | Draft                        |
| [0005](0005-on-device-intelligence.md)                           | On-device intelligence                           | Draft                        |
| [0006](0006-consent-infrastructure.md)                           | Consent infrastructure                           | Draft                        |
| [0007](0007-connector-breadth.md)                                | Connector breadth                                | Draft                        |
| [0008](0008-cloud-architecture.md)                               | Cloud architecture — three zones                 | Draft                        |
| [0009](0009-evidence-to-action-runtime.md)                       | Evidence-to-action runtime                       | Draft                        |
| [0017](0017-oppulence-voice-distribution-and-rowboat-handoff.md) | Oppulence Voice distribution and Rowboat handoff | Implemented; rollout pending |

Dependency order: 0006 (consent) gates 0001. 0001 and 0002 feed 0004. 0004 feeds 0005. 0003 is independent. 0007 widens the input to all of them. 0008 governs where every component runs.

## Oppulence capture-product capability contracts

These RFCs were migrated from Rowboat's former OpenWhispr parity track by
Rowboat RFC 055. They now belong to the capture product. Their original
Rowboat-path inventories are retained as migration provenance and must be
reconciled against the current OpenWhispr fork before implementation is planned.

| RFC                                                    | Capability                                   | Status                                    |
| ------------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| [0010](0010-dictation-core-ux.md)                      | Dictation core UX and native paste           | Adopted; reconcile current implementation |
| [0011](0011-dictation-translation.md)                  | Dictation translation                        | Adopted; reconcile current implementation |
| [0012](0012-gpu-whisper-and-parakeet-engines.md)       | GPU Whisper and Parakeet engines             | Adopted; reconcile current implementation |
| [0013](0013-audio-video-import.md)                     | Audio and video import                       | Adopted; reconcile current implementation |
| [0014](0014-windows-linux-native-voice-stack.md)       | Windows and Linux native voice stack         | Adopted; reconcile current implementation |
| [0015](0015-snippets-dictionary-correction-learner.md) | Dictionary, snippets, and correction learner | Adopted; reconcile current implementation |
| [0016](0016-transcription-provider-breadth.md)         | Transcription provider breadth and failover  | Adopted; reconcile current implementation |

Cross-product identity, evidence, action, and ingestion behavior remains owned
by Rowboat. The capture repository publishes versioned artifacts; it does not
embed Rowboat's relationship graph or consequential-action runtime.

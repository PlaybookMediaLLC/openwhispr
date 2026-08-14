# RFCs: The Moat Features

These RFCs design the seven moat features from [VISION.md](../../VISION.md). Each feature is hard to build. Each one compounds. Cloud-first competitors will not build them, because cloud is easier.

| RFC | Feature | Status |
| --- | --- | --- |
| [0001](0001-persistent-speaker-identity.md) | Persistent speaker identity | Draft |
| [0002](0002-cross-source-identity-resolution.md) | Cross-source identity resolution | Draft |
| [0003](0003-e2e-encrypted-team-sync.md) | E2E-encrypted team sync | Draft |
| [0004](0004-evidence-graph.md) | The evidence graph | Draft |
| [0005](0005-on-device-intelligence.md) | On-device intelligence | Draft |
| [0006](0006-consent-infrastructure.md) | Consent infrastructure | Draft |
| [0007](0007-connector-breadth.md) | Connector breadth | Draft |
| [0008](0008-cloud-architecture.md) | Cloud architecture — three zones | Draft |

Dependency order: 0006 (consent) gates 0001. 0001 and 0002 feed 0004. 0004 feeds 0005. 0003 is independent. 0007 widens the input to all of them. 0008 governs where every component runs.

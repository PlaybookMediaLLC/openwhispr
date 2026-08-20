# RFC 0009: Evidence-to-Action Runtime

* **Status**: Draft
* **Depends on**: RFC 0004 (evidence graph), RFC 0007 (connector/tool breadth)
* **Feeds**: future decision graph, outcome measurement, workflow automation
* **Character**: close the loop — evidence must be able to cause work

## Summary

Turn evidence into safe, attributable action.

Today the system captures customer conversations, resolves people and organizations, extracts evidence, clusters findings, detects trends, and lets users ask the corpus questions.

The workflow stops at the answer.

A user can learn:

> "Enterprise SSO complaints increased 3× this quarter across 14 accounts."

But they still have to manually open Linear, create the initiative, attach customer evidence, notify the relevant team, update the CRM, and later remember why the work was created.

This RFC adds an action runtime that lets the evidence graph initiate work across external systems while preserving the product's core trust model:

> **No action without intent, provenance, permission, and an audit trail.**

The goal sentence:

> "Create a Linear initiative for this problem, attach the top customer quotes, link the affected deals, and notify the enterprise channel."

The system should perform those operations safely and preserve the evidence chain that caused them.

## Product Principle

The product evolves from:

```text
Capture
  ↓
Evidence
  ↓
Intelligence
  ↓
Answer
```

to:

```text
Capture
  ↓
Evidence
  ↓
Intelligence
  ↓
Decision
  ↓
Action
  ↓
Outcome
  ↓
New Evidence
```

The loop is the feature.

Eventually the system should answer not only:

> "What are customers asking for?"

but:

> "What did we do about it, and did the complaints decrease afterward?"

## Current State

The repository already contains several important primitives:

* The agent supports multi-step tool calls.
* `ToolRegistry` exposes typed tools to the AI SDK.
* Tools already distinguish read-only operations.
* Notes, calendar, clipboard, and web search are existing agent capabilities.
* RFC 0004 gives every finding a quote, source, timestamp, entity, organization, type, and provenance.
* RFC 0007 establishes a shared connector framework and OAuth/token infrastructure.
* Selection replacement already uses a fail-closed model: capture target, preserve state, revalidate before mutation, then execute.
* Workspace policy infrastructure exists and provides a precedent for organization-level capability restrictions.

What is missing is a first-class write-action model, permission system, confirmation policy, durable execution journal, idempotency, verification, and linkage between evidence and the external work it caused.

## Non-Goals

* A general autonomous computer-use agent.
* Arbitrary mouse and keyboard automation as the primary execution path.
* Unattended destructive operations.
* A workflow-builder UI in the first release.
* Replacing Linear, Salesforce, Slack, Notion, GitHub, or other systems of record.
* Allowing an LLM to decide its own permission boundaries.

External APIs and typed tools are preferred. Desktop automation is a fallback only where no structured integration exists.

## Design

### 1. Action Capability Model

Replace the current binary `readOnly` distinction with explicit capability classes.

```ts
type ActionRisk =
  | "read"
  | "draft"
  | "write"
  | "external_send"
  | "destructive";

interface ActionCapability {
  name: string;
  provider: string;
  risk: ActionRisk;
  reversible: boolean;
  idempotent: boolean;
  requiresEvidence?: boolean;
}
```

Examples:

| Action                     | Risk            |
| -------------------------- | --------------- |
| Search Linear issues       | `read`          |
| Draft a customer follow-up | `draft`         |
| Create a Linear issue      | `write`         |
| Update CRM deal metadata   | `write`         |
| Send Slack message         | `external_send` |
| Send email                 | `external_send` |
| Delete CRM record          | `destructive`   |

The risk class comes from code and connector manifests. The model cannot downgrade it.

### 2. Action Request

Every proposed mutation becomes a structured `ActionRequest`.

```ts
interface ActionRequest {
  id: string;

  tool: string;
  operation: string;
  arguments: Record<string, unknown>;

  evidenceRefs: number[];
  sourceQuery?: string;
  rationale?: string;

  requestedBy: "user" | "agent" | "rule";
  risk: ActionRisk;

  idempotencyKey: string;
  createdAt: string;
}
```

The important field is `evidenceRefs`.

When an action originates from customer intelligence, the system should retain the exact findings that caused it.

A Linear issue about SSO should be traceable back to the 14 customer quotes that justified its creation.

### 3. Permission Engine

Before execution:

```text
ActionRequest
     ↓
Capability policy
     ↓
Workspace policy
     ↓
User policy
     ↓
Confirmation policy
     ↓
Execute or block
```

A pure policy module decides:

```ts
authorizeAction(
  action,
  userPolicy,
  workspacePolicy,
  executionContext
): "allow" | "confirm" | "block";
```

Policy must be deterministic and unit-tested.

Example default policy:

| Risk            | Default                             |
| --------------- | ----------------------------------- |
| `read`          | allow                               |
| `draft`         | allow                               |
| `write`         | confirm first time per tool/session |
| `external_send` | always confirm                      |
| `destructive`   | explicit high-friction confirmation |

Workspace administrators can make policies stricter, never silently weaker than product safety floors.

Examples:

```text
CRM writes require confirmation.
Slack messages to internal channels may execute after approval.
External email always requires approval.
Destructive tools disabled workspace-wide.
```

### 4. Confirmation Surface

Confirmations should use the existing small desktop-overlay interaction model instead of forcing the user into a chatbot.

Example:

```text
Create Linear initiative?

Enterprise SSO friction
14 customer findings · 6 affected deals

[Create] [Review] [Cancel]
```

For compound requests:

```text
3 actions ready

✓ Create Linear initiative
✓ Attach 14 evidence quotes
! Post summary to #product-enterprise

[Run 3 actions]
```

The user should be able to inspect exactly:

* what will happen;
* where it will happen;
* what information will leave the device;
* which evidence supports the action.

### 5. Execution Journal

Every action attempt gets a durable local record.

```sql
CREATE TABLE actions (
  id TEXT PRIMARY KEY,

  tool TEXT NOT NULL,
  operation TEXT NOT NULL,
  risk TEXT NOT NULL,

  arguments_json TEXT NOT NULL,

  requested_by TEXT NOT NULL,
  status TEXT NOT NULL,

  idempotency_key TEXT NOT NULL UNIQUE,

  external_ref TEXT,
  external_url TEXT,

  reversible INTEGER NOT NULL DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  executed_at DATETIME,
  verified_at DATETIME,
  failed_at DATETIME
);
```

And evidence linkage:

```sql
CREATE TABLE action_evidence (
  action_id TEXT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  PRIMARY KEY (action_id, finding_id)
);
```

This creates:

```text
Finding
   ↓
Action
   ↓
External object
```

with durable provenance.

### 6. Idempotency

Actions must be safe to retry.

Every mutation receives an idempotency key derived from stable request identity rather than natural language alone.

Examples:

```text
create-linear-initiative:
workspace + evidence_cluster + operation_version
```

or:

```text
post-slack-message:
action_request_id
```

If the provider supports native idempotency keys, pass them through.

Otherwise the local action journal checks before replay.

A timeout must never result in two Linear issues because the model retried.

### 7. Verification

A successful API response is not enough.

Where practical, mutation tools expose:

```ts
execute()
verify()
compensate?()
```

Example:

```text
create Linear issue
      ↓
receive LIN-482
      ↓
GET LIN-482
      ↓
verify title / project / labels
      ↓
mark action verified
```

Failed verification surfaces clearly and never reports the action as complete.

### 8. Compensation and Undo

Some operations are reversible.

Examples:

```text
Create Linear issue → archive/close issue
Post internal Slack message → delete message if API permits
Create Notion page → archive page
Add CRM note → delete note
```

Other actions are not meaningfully reversible:

```text
Send email
External Slack/Teams message after recipient reads it
Trigger payment
Delete external data without recovery
```

`reversible` must therefore be an explicit capability property.

Undo is compensation, not pretending history did not happen.

### 9. Evidence Packages

Actions created from findings should carry structured evidence.

Example:

```ts
interface EvidencePackage {
  findingIds: number[];
  clusterId?: number;
  generatedSummary?: string;
}
```

A Linear issue might render:

```text
Customer evidence

14 customers mentioned SSO setup friction in the last 60 days.

Selected quotes:

"Setting up SAML took our IT team almost two weeks."
— Dana, Acme · Customer call · Aug 8

"We may need to delay rollout because of SSO."
— Enterprise prospect · HubSpot note · Aug 11

Evidence source: 14 linked findings
```

The generated summary is presentation.

The quotes remain the source of truth.

### 10. Initial Tool Set

The first release should stay narrow.

#### Linear

* search issues
* create issue
* create project/initiative if API permits
* add comment
* attach evidence references

#### Slack

* search relevant conversations
* draft message
* post internal message

#### Notion

* search pages
* create evidence memo
* update an existing product document

#### CRM

Start with the CRM already prioritized by RFC 0007.

* read deal/contact/account context
* attach evidence note
* update non-destructive metadata
* link affected deals to evidence clusters

#### Calendar

* create follow-up event
* add relevant attendees

Do not begin with dozens of write connectors.

Prove the evidence → action loop with Product, RevOps, and customer-facing teams first.

### 11. Tool Contract

Extend the current tool abstraction.

```ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;

  risk: ActionRisk;
  reversible: boolean;

  execute(args, context): Promise<ToolResult>;

  verify?(
    result: ToolResult,
    context: ActionContext
  ): Promise<VerificationResult>;

  compensate?(
    result: ToolResult,
    context: ActionContext
  ): Promise<ToolResult>;
}
```

The `ActionContext` includes:

```ts
interface ActionContext {
  actionId: string;
  idempotencyKey: string;
  evidenceRefs: number[];
  confirmationToken?: string;
}
```

### 12. MCP Actions

RFC 0007 uses MCP as a force multiplier for read connectors.

This RFC extends that concept carefully to actions.

MCP tools are imported with their schemas but mapped through the same local capability policy.

An MCP server declaring a tool does not automatically receive execution permission.

For every MCP tool:

```text
discover
  ↓
classify capability
  ↓
assign local risk tier
  ↓
show requested permissions
  ↓
user/workspace approval
  ↓
available to agent
```

Unknown or dynamically changing tools default to confirmation-required.

### 13. Decision Objects

The Evidence Graph should eventually distinguish the decision from the execution.

```sql
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE decision_evidence (
  decision_id TEXT NOT NULL,
  finding_id INTEGER NOT NULL,
  PRIMARY KEY (decision_id, finding_id)
);

CREATE TABLE decision_actions (
  decision_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  PRIMARY KEY (decision_id, action_id)
);
```

This is not required for M1, but the action journal should not make it impossible later.

The long-term graph is:

```text
Source
  ↓
Finding
  ↓
Cluster
  ↓
Decision
  ↓
Action
  ↓
Release / Change
  ↓
Outcome
  ↓
Future Finding
```

### 14. Outcome Linkage

The first implementation does not attempt causal inference.

It records temporal relationships.

Example:

```text
Pain cluster: SSO setup
        ↓
Decision: simplify SSO
        ↓
Linear project
        ↓
Release marker v2.7
        ↓
weekly finding counts
```

Then RFC 0005's trend layer can answer:

> "SSO-friction mentions fell from 17/week to 4/week after v2.7."

The product must phrase this as correlation unless causal evidence exists.

Counting is credible. Causality should not be invented.

## Security

External actions widen the blast radius of model mistakes.

Rules:

1. The model never controls capability classification.
2. The model cannot bypass confirmation policy.
3. Secrets stay in existing secure storage.
4. Tools receive the minimum required OAuth scopes.
5. Connector manifests display requested write permissions.
6. Prompt content from evidence never becomes trusted tool instruction.
7. Arguments are schema-validated before execution.
8. External text is treated as data, never executable instruction.
9. Action results are validated before subsequent agent steps consume them.
10. Workspace policy may disable classes of actions entirely.

## Privacy

The existing three-zone architecture still governs.

### Zone 1

* evidence selection;
* action planning;
* policy evaluation;
* local action journal;
* decision graph.

### Zone 2

May hold only infrastructure metadata necessary for team policy distribution or encrypted sync.

### Zone 3

Third-party SaaS APIs necessarily receive the minimum plaintext required to perform the user-requested action.

This is explicit disclosure, not an exception hidden behind "local-first."

Before confirmation, the UI can state:

> "Creating this Linear issue will send the title, description, and 6 selected customer quotes to Linear."

The user should know where data goes.

## Product Examples

### Product

User:

> "Turn this into a product initiative."

Context:

```text
pain cluster:
Enterprise SSO friction
23 findings
14 organizations
$2.1M affected pipeline
```

Execution:

```text
Create Linear initiative
Attach 10 representative quotes
Link affected HubSpot deals
Post summary to #product
```

### RevOps

User:

> "Which open deals mention SOC 2?"

Agent finds supporting evidence.

Then:

> "Tag those opportunities and send the list to the enterprise team."

The resulting CRM mutations link back to the findings.

### Customer Success

After a call:

> "Create the three follow-ups I committed to and draft the recap."

The system extracts commitments from the meeting, proposes actions, and asks before external sends.

### Founder

> "Everything mentioning onboarding got worse this month. Make me a memo with the evidence and open issues for the top three causes."

The output is work, not merely an answer.

## Milestones

### M1 — Safe write kernel

* Expand `ToolRegistry` from `readOnly` to risk classes.
* `actions` + `action_evidence` tables.
* Permission engine.
* Confirmation overlay.
* Idempotency.
* Linear `create_issue` as the first mutation.
* Every created issue includes linked evidence provenance.

Success criterion:

> A user can query a customer problem and turn the answer into a verified Linear issue without manually copying evidence.

### M2 — Compound actions

* Slack internal messages.
* Notion evidence memo creation.
* Calendar follow-up creation.
* Multi-action confirmation.
* Verification hooks.
* Reversible-action compensation.

Success criterion:

> A single request can safely perform 2–4 coordinated actions with one explicit review step.

### M3 — CRM loop

* HubSpot/Salesforce write capabilities.
* Attach evidence to accounts/opportunities.
* Link affected deals to evidence clusters.
* Decision objects.
* Action history UI.

Success criterion:

> Revenue and product teams can trace a customer signal from quote → account → decision → work item.

### M4 — Outcome loop

* Link actions to release markers.
* Measure post-action finding trends through RFC 0005.
* Agent queries over decision/action history.
* Evidence → decision → action → outcome view.

Goal sentence:

> "We fixed SSO because 14 enterprise customers raised it. Here are the quotes, the project, the release, and the change in complaints afterward."

## Open Questions

* Should `write` actions become optionally auto-approved after repeated use, or should confirmation remain permanent for specific providers?
* How should workspace administrators define allowed destination channels/projects without making policy configuration painful?
* Which external systems support reliable compensation semantics?
* Should action plans themselves sync through the encrypted vault?
* How much of the decision graph should be user-authored versus inferred from actions?
* Where should automation rules live once users ask for recurring actions? They should reuse this runtime rather than create a separate execution architecture.
* When browser or desktop automation is eventually necessary, should it be represented as another high-risk tool provider rather than a privileged special case?

## Why This Is a Moat

The evidence corpus tells the company what customers said.

The action graph records what the company did about it.

Together they create a dataset a new installation cannot reconstruct easily:

```text
customer signal
    +
historical evidence
    +
organizational decisions
    +
execution history
    +
measured outcomes
```

Competitors can copy dashboards.

They cannot instantly copy the accumulated chain explaining:

> **what the customer said, what the company decided, what changed, and what happened afterward.**

The corpus becomes more than memory.

It becomes the company's evidence-backed operating history.

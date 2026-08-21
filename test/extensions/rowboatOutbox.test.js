const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CaptureArtifactSchema,
  CaptureOutbox,
  toCaptureArtifact,
} = require("../../extensions/rowboat-export/outbox.ts");
const { loadDistribution } = require("../../src/config/distributionSchema.ts");
const { skipOrFail } = require("../helpers/harness/db");

const distribution = loadDistribution("distributions/oppulence-voice.json", process.cwd());

function createOutbox(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rowboat-outbox-"));
  let outbox;
  try {
    outbox = new CaptureOutbox(directory);
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    skipOrFail(t, error);
    return null;
  }
  t.after(() => {
    outbox.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return outbox;
}

test("creates stable, versioned CaptureArtifact upserts", () => {
  const note = {
    id: 42,
    title: "Customer call",
    content: "Agreed to follow up",
    updated_at: "now",
  };
  const first = toCaptureArtifact(distribution, "note-updated", note);
  const second = toCaptureArtifact(distribution, "note-updated", note);

  assert.deepEqual(CaptureArtifactSchema.parse(first), first);
  assert.equal(first.eventId, second.eventId);
  assert.equal(first.artifactId, "oppulence-voice:note:42");
  assert.equal(first.operation, "upsert");
  assert.deepEqual(first.consent, { basis: "user_opt_in", destination: "rowboat" });
});

test("creates tombstones without retaining deleted content", () => {
  const artifact = toCaptureArtifact(distribution, "note-deleted", { id: 42 });

  assert.equal(artifact.operation, "delete");
  assert.equal(artifact.content, null);
  assert.equal(artifact.artifactId, "oppulence-voice:note:42");
});

test("exports speaker corrections with a note-scoped stable identity", () => {
  const artifact = toCaptureArtifact(distribution, "speaker-mapping-updated", {
    noteId: 42,
    speakerId: "speaker_1",
    displayName: "Ada",
  });

  assert.equal(artifact.kind, "speaker_mapping");
  assert.equal(artifact.artifactId, "oppulence-voice:speaker_mapping:42:speaker_1");
  assert.equal(artifact.operation, "upsert");
});

test("outbox enqueue is idempotent and acknowledgements remove work", (t) => {
  const outbox = createOutbox(t);
  if (!outbox) return;
  const artifact = toCaptureArtifact(distribution, "note-updated", { id: 42, content: "hello" });

  assert.equal(outbox.enqueue(artifact), true);
  assert.equal(outbox.enqueue(artifact), false);
  assert.equal(outbox.status().pending, 1);
  assert.equal(outbox.due()[0].event_id, artifact.eventId);

  outbox.acknowledge(artifact.eventId);
  assert.equal(outbox.status().pending, 0);
});

test("outbox failures back off and a manual retry makes them due", (t) => {
  const outbox = createOutbox(t);
  if (!outbox) return;
  const artifact = toCaptureArtifact(distribution, "transcription-added", {
    id: 7,
    text: "hello",
  });
  outbox.enqueue(artifact);

  outbox.fail(artifact.eventId, 0, "offline", 1_000);
  assert.equal(outbox.due(25, 5_999).length, 0);
  assert.equal(outbox.due(25, 6_000)[0].attempts, 1);

  outbox.fail(artifact.eventId, 1, "still offline", 6_000);
  assert.equal(outbox.due(25, 15_999).length, 0);
  outbox.retryAll();
  assert.equal(outbox.due(25, 6_001).length, 1);
});

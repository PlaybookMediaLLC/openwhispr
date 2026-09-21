const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../../src/utils/dictionaryPromptCap.js");

test("Groq prompt limits require the exact API hostname", async () => {
  const { dictionaryPromptLimit, GROQ_PROMPT_CHARS, WHISPER_PROMPT_CHARS } = await load();

  assert.equal(
    dictionaryPromptLimit({ endpoint: "https://api.groq.com/openai/v1/audio/transcriptions" }),
    GROQ_PROMPT_CHARS
  );
  assert.equal(
    dictionaryPromptLimit({ endpoint: "https://api.groq.com.evil.test/openai/v1" }),
    WHISPER_PROMPT_CHARS
  );
  assert.equal(
    dictionaryPromptLimit({ endpoint: "https://api.groq.com@evil.test/openai/v1" }),
    WHISPER_PROMPT_CHARS
  );
});

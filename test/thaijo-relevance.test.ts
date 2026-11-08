import assert from "node:assert/strict";
import { test } from "node:test";
import { hasThaiJoPsychologicalKeyword, isThaiJoTopicMatch } from "../lib/thaijo-relevance";

test("matches requested English topic phrases", () => {
  assert.equal(isThaiJoTopicMatch("Psychological treatments for humanoid robots"), true);
  assert.equal(isThaiJoTopicMatch("Fundamental treatment approaches"), true);
});

test("matches requested Thai topic phrases", () => {
  assert.equal(isThaiJoTopicMatch("การบำบัดทางจิตสำหรับหุ่นยนต์ฮิวแมนนอยด์"), true);
});

test("requires a psychological keyword in English or Thai", () => {
  assert.equal(hasThaiJoPsychologicalKeyword("robotics, psychological"), true);
  assert.equal(hasThaiJoPsychologicalKeyword("จิตวิทยา, หุ่นยนต์"), true);
  assert.equal(hasThaiJoPsychologicalKeyword("mental health, treatment"), false);
});

test("rejects unrelated article topics", () => {
  assert.equal(isThaiJoTopicMatch("Palliative care for terminal cancer"), false);
});
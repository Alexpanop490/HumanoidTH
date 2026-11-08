import assert from "node:assert/strict";
import { test } from "node:test";
import { countHriOutcomes, evaluateClassification } from "../lib/hri-metrics";

test("counts all HRI outcomes and groups invalid values as unclear", () => {
  const result = countHriOutcomes([
    { year: 2024, outcome: "positive" },
    { year: 2024, outcome: "unclear" },
    { year: 2025, outcome: "negative" },
    { year: null, outcome: "unexpected" }
  ]);

  assert.deepEqual(result.total, {
    positive: 1,
    negative: 1,
    mixed: 0,
    neutral: 0,
    unclear: 2
  });
  assert.deepEqual(result.yearly, [
    { year: 2024, positive: 1, negative: 0, mixed: 0, neutral: 0, unclear: 1 },
    { year: 2025, positive: 0, negative: 1, mixed: 0, neutral: 0, unclear: 0 }
  ]);
});

test("calculates per-class and macro precision, recall, and F1", () => {
  const report = evaluateClassification(
    ["yes", "yes", "no", "no"],
    ["yes", "no", "no", "no"],
    ["yes", "no"]
  );

  assert.equal(report.accuracy, 0.75);
  assert.deepEqual(report.labels[0], {
    label: "yes",
    support: 2,
    precision: 1,
    recall: 0.5,
    f1: 2 / 3
  });
  assert.ok(Math.abs(report.macro.precision - 5 / 6) < 1e-12);
  assert.ok(Math.abs(report.macro.recall - 0.75) < 1e-12);
});

test("rejects inconsistent evaluation inputs", () => {
  assert.throws(() => evaluateClassification(["yes"], [], ["yes"]));
  assert.throws(() => evaluateClassification(["other"], ["yes"], ["yes"]));
});

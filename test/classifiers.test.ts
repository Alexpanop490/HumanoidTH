import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyRelevance, extractPerspective } from "../lib/classifiers";

test("classifies Thailand robot records as accepted", () => {
  assert.equal(classifyRelevance("Dinsaw robot in Thailand hospital").relevanceStatus, "ACCEPTED");
});

test("rejects unrelated records", () => {
  assert.equal(classifyRelevance("Generic cloud chatbot launch").relevanceStatus, "REJECTED");
});

test("abstains on thin perspective evidence", () => {
  assert.equal(extractPerspective("", "").method, "abstain_thin_evidence");
});

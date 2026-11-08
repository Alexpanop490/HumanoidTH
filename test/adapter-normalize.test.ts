import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getHttpUrl,
  parseDate,
  parseGdeltDate,
  reconstructOpenAlexAbstract
} from "../lib/ingest/adapter-normalize";

test("reconstructs OpenAlex abstracts in their original word order", () => {
  assert.equal(reconstructOpenAlexAbstract({
    "care": [2],
    "Robots": [0],
    "support": [1]
  }), "Robots support care");
});

test("returns no abstract for absent or malformed OpenAlex metadata", () => {
  assert.equal(reconstructOpenAlexAbstract(null), "");
  assert.equal(reconstructOpenAlexAbstract({ word: ["0"] }), "");
});

test("parses GDELT compact timestamps and rejects invalid dates", () => {
  assert.equal(parseGdeltDate("20241107T131415Z")?.toISOString(), "2024-11-07T13:14:15.000Z");
  assert.equal(parseGdeltDate("20240230T131415Z"), null);
});

test("accepts only usable HTTP source URLs and valid dates", () => {
  assert.equal(getHttpUrl("javascript:alert(1)"), null);
  assert.equal(getHttpUrl("https://example.org/article"), "https://example.org/article");
  assert.equal(parseDate("not-a-date"), null);
});

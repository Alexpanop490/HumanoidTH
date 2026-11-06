import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeThaiJoArticle } from "../lib/ingest/thaijo-normalize";

test("normalizes ThaiJO article metadata and localized abstract", () => {
  const record = normalizeThaiJoArticle({
    id: "robotics-123",
    titles: { en_US: "Robot-assisted telehealth", th_TH: "การแพทย์ทางไกล" },
    abstracts: { en_US: "<p>Results &amp; discussion.</p>" },
    authors: { en_US: ["A. Author", "B. Author"] },
    article_url: "https://he01.tci-thaijo.org/index.php/robotics/article/view/123?utm_source=test",
    date_published: "2024-01-01T00:00:00+07:00",
    year: 2024,
    journal_name: { en_US: "Thai Journal of Robotics" },
    journal_url: "https://he01.tci-thaijo.org/index.php/robotics",
    journal_path: "robotics",
    keywords: { en_US: ["robot"] },
    languages: ["en_US"],
    pages: "1-12"
  });

  assert.ok(record);
  assert.equal(record.sourceType, "THAIJO");
  assert.equal(record.title, "Robot-assisted telehealth");
  assert.equal(record.excerpt, "Results & discussion.");
  assert.equal(record.author, "A. Author; B. Author");
  assert.equal(record.platform, "ThaiJO");
  assert.equal(record.rawMeta?.year, 2024);
  assert.equal(record.url, "https://he01.tci-thaijo.org/index.php/robotics/article/view/123");
});

test("rejects ThaiJO records with external article URLs or missing titles", () => {
  assert.equal(normalizeThaiJoArticle({
    titles: { en_US: "External record" },
    article_url: "https://example.com/article"
  }), null);
  assert.equal(normalizeThaiJoArticle({
    titles: {},
    article_url: "https://he01.tci-thaijo.org/index.php/journal/article/view/1"
  }), null);
});

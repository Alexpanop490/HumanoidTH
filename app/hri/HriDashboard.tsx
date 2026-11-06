"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Link from "next/link";
import { askHriGemini } from "./actions";

export type HriView = "dashboard" | "deployment" | "summary";

type Metric = { name: string; value: number; unit: string; context: string };
type HriRecord = {
  id: string;
  title: string;
  url: string;
  author: string | null;
  year: number | null;
  workplaceName: string | null;
  robotName: string | null;
  careSetting: string | null;
  interactionOutcome: string;
  communicationBarrier: string;
  barrierStatus: string;
  positiveEmotions: unknown[];
  negativeEmotions: unknown[];
  humanResponse: string;
  robotResponse: string;
  positiveInteractionCount: number | null;
  negativeInteractionCount: number | null;
  metrics: unknown[];
  evidenceExcerpt: string;
  confidence: number;
  analysisStatus: string;
  analysisMethod: string;
  analysisError: string | null;
};

type Slice = { name: string; count: number };

const palette = ["#4a7c59", "#9c2e26", "#d4af37", "#5e7568", "#668bb0", "#9872a0", "#d28442"];
const outcomeColors: Record<string, string> = {
  positive: "#4a7c59",
  negative: "#9c2e26",
  mixed: "#d4af37",
  neutral: "#5e7568",
  unclear: "#9aa3a0"
};

function isMetric(value: unknown): value is Metric {
  if (!value || typeof value !== "object") return false;
  const metric = value as Partial<Metric>;
  return typeof metric.name === "string" &&
    typeof metric.value === "number" &&
    typeof metric.unit === "string" &&
    typeof metric.context === "string";
}

function cleanLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function makeSlices(values: string[], limit = 6): Slice[] {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = cleanLabel(rawValue);
    if (!value || value.toLowerCase() === "unclear" || value.toLowerCase() === "not reported") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit).map(([name, count]) => ({ name, count }));
  const otherCount = sorted.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  if (otherCount) top.push({ name: "Other reported", count: otherCount });
  return top;
}

function responseSlices(records: HriRecord[], field: "humanResponse" | "robotResponse"): Slice[] {
  return makeSlices(records.map((record) => record[field]), 5);
}

function outcomeSlices(records: HriRecord[]): Slice[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const outcome = record.interactionOutcome || "unclear";
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name: cleanLabel(name), count }));
}

function sliceColor(title: string, slice: Slice, index: number) {
  return title === "Interaction outcome"
    ? outcomeColors[slice.name] ?? palette[index % palette.length]
    : palette[index % palette.length];
}

function emotionValues(records: HriRecord[], field: "positiveEmotions" | "negativeEmotions") {
  return records.flatMap((record) => record[field].filter((value): value is string => typeof value === "string"));
}

function logoLetters(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter((part) => /[\p{L}\p{N}]/u.test(part))
    .slice(0, 2)
    .map((part) => [...part][0])
    .join("")
    .toLocaleUpperCase();
}

function listLabels(values: unknown[]) {
  const labels = values.filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return labels.length ? labels.join(", ") : "Not reported";
}

function DistributionPie({ title, data, emptyLabel = "No reported categories" }: {
  title: string;
  data: Slice[];
  emptyLabel?: string;
}) {
  return (
    <section className="panel hri-pie-panel">
      <h3>{title}</h3>
      {data.length ? (
        <div className="hri-pie-chart">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="45%" outerRadius={76}>
                {data.map((slice, index) => (
                  <Cell
                    key={slice.name}
                    fill={sliceColor(title, slice, index)}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} article${value === 1 ? "" : "s"}`, name]} />
              <Legend verticalAlign="bottom" height={48} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="hri-pie-empty">{emptyLabel}</div>
      )}
      <ul className="hri-pie-details">
        {data.map((slice, index) => (
          <li key={slice.name}>
            <span className="hri-pie-key" style={{ backgroundColor: sliceColor(title, slice, index) }} />
            <span>{slice.name}</span>
            <strong>{slice.count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GeminiAssistant({
  search,
  year,
  outcome,
  recordCount
}: {
  search: string;
  year: string;
  outcome: string;
  recordCount: number;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function request(mode: "summary" | "question", event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setAnswer("");
    startTransition(async () => {
      const result = await askHriGemini({ mode, question, search, year, outcome });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAnswer(result.answer ?? "");
      if (mode === "question") setQuestion("");
    });
  }

  return (
    <section className="panel hri-assistant" aria-labelledby="hri-assistant-title">
      <div className="hri-assistant-header">
        <div>
          <h2 id="hri-assistant-title">Gemini research assistant</h2>
          <p className="muted">
            Summarize the filtered health research or ask a question. Answers use reported HRI evidence and aggregate counts from Analytics.
          </p>
        </div>
        <button type="button" className="primary" onClick={() => request("summary")} disabled={pending || recordCount === 0}>
          {pending ? "Thinking…" : "Summarize current results"}
        </button>
      </div>
      <form className="hri-chat-form" onSubmit={(event) => request("question", event)}>
        <label htmlFor="hri-question">Ask about this data</label>
        <div className="hri-chat-controls">
          <input
            id="hri-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. What communication barriers were reported?"
            maxLength={500}
            required
          />
          <button type="submit" className="secondary" disabled={pending || !question.trim()}>
            Ask Gemini
          </button>
        </div>
      </form>
      {error && <p className="notice hri-assistant-message" role="alert">{error}</p>}
      {answer && <div className="hri-assistant-answer" aria-live="polite">{answer}</div>}
      {!answer && !error && (
        <p className="muted hri-assistant-footnote">
          {pending ? "Gemini is reviewing the available evidence…" : "AI answers may be incomplete. Verify findings in the linked source articles."}
        </p>
      )}
    </section>
  );
}

function RecordCard({ record }: { record: HriRecord }) {
  const metrics = record.metrics.filter(isMetric);
  const workplace = record.workplaceName?.trim() || "Workplace not identified";

  return (
    <a className="panel hri-record-card" href={record.url} target="_blank" rel="noreferrer">
      <div className="hri-record-head">
        <span className="hri-institution-logo" aria-label={`${workplace} initials`}>{logoLetters(record.workplaceName)}</span>
        <div className="hri-record-title">
          <strong>{record.title}</strong>
          <span className="muted">{record.year ?? "Year unknown"} · {record.author || "Author not listed"} · ThaiJO source ↗</span>
        </div>
        <span className={`hri-status ${record.analysisStatus === "ANALYZED" ? "is-analyzed" : ""}`}>
          {record.analysisStatus === "ANALYZED" ? "Analyzed" : cleanLabel(record.analysisStatus)}
        </span>
      </div>
      <div className="hri-record-details">
        <div>
          <span className="hri-detail-label">Workplace / deployment setting</span>
          <strong>{workplace}</strong>
          <span className="muted">{record.careSetting || "Setting not reported"}</span>
        </div>
        <div>
          <span className="hri-detail-label">Robot</span>
          <strong>{record.robotName || "Robot not identified"}</strong>
          <span className="muted">Source status: ThaiJO · {cleanLabel(record.analysisStatus)}</span>
        </div>
        <div>
          <span className="hri-detail-label">Interaction / communication</span>
          <strong>{cleanLabel(record.interactionOutcome)}</strong>
          <span className="muted">{cleanLabel(record.communicationBarrier)} · {cleanLabel(record.barrierStatus)}</span>
        </div>
      </div>
      <div className="hri-record-responses">
        <span><strong>Positive emotions:</strong> {listLabels(record.positiveEmotions)}</span>
        <span><strong>Negative emotions:</strong> {listLabels(record.negativeEmotions)}</span>
        <span><strong>Human response:</strong> {record.humanResponse || "Not reported"}</span>
        <span><strong>Robot response:</strong> {record.robotResponse || "Not reported"}</span>
      </div>
      {(metrics.length > 0 || record.positiveInteractionCount !== null || record.negativeInteractionCount !== null) && (
        <div className="hri-record-metrics">
          {metrics.map((metric, index) => (
            <span key={`${metric.name}-${index}`}>
              {metric.name}: {metric.value}{metric.unit ? ` ${metric.unit}` : ""}
            </span>
          ))}
          {record.positiveInteractionCount !== null && <span>Reported positive interactions: {record.positiveInteractionCount}</span>}
          {record.negativeInteractionCount !== null && <span>Reported negative interactions: {record.negativeInteractionCount}</span>}
        </div>
      )}
      {record.evidenceExcerpt && <p className="hri-evidence">“{record.evidenceExcerpt}”</p>}
      <span className="hri-record-link-hint">Open original article</span>
    </a>
  );
}

export default function HriDashboard({
  records,
  dataError,
  view
}: {
  records: HriRecord[];
  dataError: string | null;
  view: HriView;
}) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const years = useMemo(
    () => [...new Set(records.map((record) => record.year).filter((year): year is number => year !== null))]
      .sort((a, b) => b - a),
    [records]
  );
  const visibleRecords = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return records.filter((record) => {
      const matchesYear = yearFilter === "all" || String(record.year) === yearFilter;
      const matchesOutcome = outcomeFilter === "all" || record.interactionOutcome === outcomeFilter;
      const searchable = [
        record.title, record.workplaceName, record.robotName, record.careSetting, record.author,
        record.communicationBarrier, record.barrierStatus, record.humanResponse, record.robotResponse,
        ...record.positiveEmotions, ...record.negativeEmotions
      ];
      const matchesSearch = !term || searchable.some(
        (value) => typeof value === "string" && value.toLocaleLowerCase().includes(term)
      );
      return matchesYear && matchesOutcome && matchesSearch;
    });
  }, [records, search, yearFilter, outcomeFilter]);

  const yearlyOutcomes = useMemo(() => {
    const buckets = new Map<number, { year: number; positive: number; negative: number; mixed: number; neutral: number }>();
    for (const record of visibleRecords) {
      if (record.year === null) continue;
      const row = buckets.get(record.year) ?? { year: record.year, positive: 0, negative: 0, mixed: 0, neutral: 0 };
      if (record.interactionOutcome === "positive" || record.interactionOutcome === "negative" ||
          record.interactionOutcome === "mixed" || record.interactionOutcome === "neutral") {
        row[record.interactionOutcome] += 1;
      }
      buckets.set(record.year, row);
    }
    return [...buckets.values()].sort((a, b) => a.year - b.year);
  }, [visibleRecords]);

  const analyzed = visibleRecords.filter((record) => record.analysisStatus === "ANALYZED").length;
  const positive = visibleRecords.filter((record) => record.interactionOutcome === "positive").length;
  const negative = visibleRecords.filter((record) => record.interactionOutcome === "negative").length;
  const sectionLinks: Array<{ id: HriView; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "deployment", label: "Deployment" },
    { id: "summary", label: "Summary" }
  ];

  return (
    <>
      <div className="topline">
        <div>
          <h1>Healthcare Human-Robot Interaction</h1>
          <p className="muted">ThaiJO research on telehealth, care robots, communication, and workplace interactions.</p>
        </div>
        <a className="button primary" href="/data-pulls">View data pulls</a>
      </div>

      {dataError && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{dataError}</div>}
      <div className="notice" style={{ marginBottom: 16 }}>
        Charts count articles, not people or interactions. Numerical metrics are shown only when explicitly reported by a source. Unreported values are not estimated.
      </div>

      <nav className="hri-section-nav" aria-label="Healthcare dashboard sections">
        {sectionLinks.map((section) => (
          <Link
            key={section.id}
            href={`/synergy/${section.id}`}
            className={view === section.id ? "active" : ""}
            aria-current={view === section.id ? "page" : undefined}
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {view === "dashboard" && (
        <section className="hri-dashboard-section" aria-labelledby="hri-dashboard-title">
          <div className="hri-section-heading">
            <div>
              <h2 id="hri-dashboard-title">Healthcare HRI dashboard</h2>
              <p className="muted">At-a-glance outcomes and yearly trends for the available healthcare research.</p>
            </div>
            <span className="hri-filter-count">{records.length} article{records.length === 1 ? "" : "s"}</span>
          </div>

          <div className="grid" style={{ margin: "16px 0" }}>
            <div className="panel"><div className="muted">Articles</div><div className="stat">{records.length}</div></div>
            <div className="panel"><div className="muted">Analyzed</div><div className="stat">{analyzed}</div></div>
            <div className="panel"><div className="muted">Positive outcome</div><div className="stat">{positive}</div></div>
            <div className="panel"><div className="muted">Negative outcome</div><div className="stat">{negative}</div></div>
          </div>

          <section className="panel hri-yearly-panel">
            <h3>Interaction outcomes by year</h3>
            <p className="muted">Article counts based on the outcome reported in each source.</p>
            <div className="hri-yearly-chart">
              <ResponsiveContainer>
                <LineChart data={yearlyOutcomes} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="positive" stroke={outcomeColors.positive} />
                  <Line type="monotone" dataKey="negative" stroke={outcomeColors.negative} />
                  <Line type="monotone" dataKey="mixed" stroke={outcomeColors.mixed} />
                  <Line type="monotone" dataKey="neutral" stroke={outcomeColors.neutral} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </section>
      )}

      {view === "deployment" && (
        <>
          <div className="panel form hri-filters">
            <label>
              Search healthcare deployments
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Workplace, robot, emotion, response, article…"
              />
            </label>
            <label>
              Publication year
              <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                <option value="all">All years</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>
              Interaction outcome
              <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)}>
                <option value="all">All outcomes</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="mixed">Mixed</option>
                <option value="neutral">Neutral</option>
                <option value="unclear">Unclear</option>
              </select>
            </label>
          </div>

          <section className="hri-records-section" aria-labelledby="hri-deployment-title">
            <div className="hri-section-heading">
              <div>
                <h2 id="hri-deployment-title">Deployment sites, robots and source articles</h2>
                <p className="muted">
                  Showing {visibleRecords.length} of {records.length} article{records.length === 1 ? "" : "s"}. Each card links to its original source. Site initials are identifiers, not official logos.
                </p>
              </div>
            </div>
            {visibleRecords.length ? (
              <div className="hri-record-grid">
                {visibleRecords.map((record) => <RecordCard key={record.id} record={record} />)}
              </div>
            ) : (
              <div className="panel empty">
                {dataError ? "HRI records could not be loaded." : "No matching healthcare deployments. Try another search or filter."}
              </div>
            )}
          </section>
        </>
      )}

      {view === "summary" && (
        <>
          <section className="hri-summary" aria-labelledby="hri-summary-title">
            <div className="hri-section-heading">
              <div>
                <h2 id="hri-summary-title">Healthcare research summary</h2>
                <p className="muted">Evidence-based breakdowns for all stored ThaiJO healthcare HRI articles.</p>
              </div>
              <span className="hri-filter-count">{records.length} article{records.length === 1 ? "" : "s"}</span>
            </div>
            <div className="hri-pie-grid">
              <DistributionPie title="Interaction outcome" data={outcomeSlices(records)} />
              <DistributionPie title="Communication barriers" data={makeSlices(records.map((record) => record.communicationBarrier), 8)} />
              <DistributionPie title="Positive emotions" data={makeSlices(emotionValues(records, "positiveEmotions"))} />
              <DistributionPie title="Negative emotions" data={makeSlices(emotionValues(records, "negativeEmotions"))} />
              <DistributionPie title="Human responses" data={responseSlices(records, "humanResponse")} />
              <DistributionPie title="Robot responses" data={responseSlices(records, "robotResponse")} />
            </div>
          </section>

          <GeminiAssistant search="" year="all" outcome="all" recordCount={records.length} />
        </>
      )}
    </>
  );
}

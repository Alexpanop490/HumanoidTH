"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bot,
  FileText,
  HeartHandshake,
  LoaderCircle,
  MessagesSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { isThaiJoTopicMatch } from "@/lib/thaijo-relevance";
import styles from "./track.module.css";

export type PerspectiveRecord = {
  id: string;
  stance: string;
  sentiment: string;
  theme: string;
  target: string;
  evidence: string;
  confidence: number;
  createdAt: string;
  sourceTitle: string;
  sourceUrl: string;
};

export type ThaiJoRecord = {
  id: string;
  title: string;
  author: string | null;
  journal: string | null;
  publishedAt: string | null;
  excerpt: string;
  url: string;
  year: number | null;
  keywords: string[];
  searchText?: string;
};

type Props = {
  perspectives: PerspectiveRecord[];
  thaiJoRecords: ThaiJoRecord[];
  language: "en" | "th";
  aiSummary: string | null;
};

type Tab = "dashboard" | "deployments" | "summary";
type Distribution = { name: string; value: number };

const chartColors = ["#1c775b", "#d56b58", "#d5a548", "#84948a", "#b8c5ba", "#7288a2", "#ac7a9d"];
const concernThemes = new Set([
  "job_displacement",
  "privacy_and_surveillance",
  "safety_and_reliability",
  "healthcare_and_eldercare_trust"
]);

const tabLabels: Record<Tab, { label: string; eyebrow: string; icon: LucideIcon }> = {
  dashboard: { label: "Dashboard", eyebrow: "01 / PUBLIC PERSPECTIVES", icon: Activity },
  deployments: { label: "Deployment", eyebrow: "02 / THAIJO MEDICAL RESEARCH", icon: FileText },
  summary: { label: "Summary", eyebrow: "03 / EVIDENCE BRIEF", icon: Sparkles }
};

function humanize(value: string) {
  if (!value || value === "unclear") return "Unclassified";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPositive(value: string) {
  return /(^|_)(positive|supportive)(_|$)/.test(value.toLowerCase().replace(/[\s-]+/g, "_"));
}

function isNegative(value: string) {
  return /(^|_)(negative|skeptical)(_|$)/.test(value.toLowerCase().replace(/[\s-]+/g, "_"));
}

function colorFor(name: string, index: number) {
  const value = name.toLowerCase();
  if (/(positive|supportive)/.test(value)) return "#1c775b";
  if (/(negative|skeptical)/.test(value)) return "#d56b58";
  if (value.includes("mixed")) return "#d5a548";
  if (/(neutral|unclear|unclassified)/.test(value)) return "#84948a";
  return chartColors[index % chartColors.length];
}

function distribution(values: string[], emptyLabel = "No classified records"): Distribution[] {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue?.trim().toLowerCase() || "unclear";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (!counts.size) return [{ name: emptyLabel, value: 0 }];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: humanize(name), value }));
}

function ChartCard({ title, description, data }: { title: string; description: string; data: Distribution[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;

  return (
    <article className={styles.chartCard}>
      <div className={styles.cardHeading}>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={styles.chartTotal}>{total}</span>
      </div>
      {hasData ? (
        <div className={styles.chartBody}>
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={colorFor(entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, "Records"]}
                  contentStyle={{ borderRadius: 12, borderColor: "#e5e9e4", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <strong>{total}</strong>
              <span>records</span>
            </div>
          </div>
          <ul className={styles.legend}>
            {data.map((entry, index) => (
              <li key={entry.name}>
                <span className={styles.legendName}>
                  <i style={{ backgroundColor: colorFor(entry.name, index) }} />
                  {entry.name}
                </span>
                <strong>{entry.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.chartEmpty}>No records in this category yet. Results will appear as records are reviewed.</div>
      )}
    </article>
  );
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: LucideIcon }) {
  return (
    <article className={styles.metric}>
      <div className={styles.metricTop}>
        <span>{label}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Dashboard({ perspectives, articleCount }: { perspectives: PerspectiveRecord[]; articleCount: number }) {
  const sentimentData = distribution(perspectives.map((item) => item.sentiment));
  const stanceData = distribution(perspectives.map((item) => item.stance));
  const concernData = distribution(
    perspectives.filter((item) => concernThemes.has(item.theme)).map((item) => item.theme),
    "No barrier themes recorded"
  );
  const positive = perspectives.filter((item) => isPositive(item.sentiment)).length;
  const negative = perspectives.filter((item) => isNegative(item.sentiment)).length;
  return (
    <div className={styles.sectionStack}>
      <div className={styles.metrics}>
        <Metric label="Perspective records" value={perspectives.length} note="Stored evidence annotations" icon={MessagesSquare} />
        <Metric label="Positive signals" value={positive} note="Positive sentiment or support" icon={HeartHandshake} />
        <Metric label="Negative signals" value={negative} note="Negative sentiment or skepticism" icon={Activity} />
        <Metric label="ThaiJO articles" value={articleCount} note="Medical research records in the database" icon={FileText} />
      </div>

      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.sectionEyebrow}>PUBLIC INTERACTION</span>
          <h2>How people respond to robotics</h2>
        </div>
        <p>Sentiment and stance are based on saved source annotations, not assumptions from research articles.</p>
      </div>
      <div className={styles.chartGrid}>
        <ChartCard title="Emotional tone" description="Positive, negative, mixed, and neutral signals" data={sentimentData} />
        <ChartCard title="Response stance" description="Supportive, skeptical, and other recorded responses" data={stanceData} />
        <ChartCard title="Communication barriers" description="Privacy, safety, work, and care concerns found in evidence" data={concernData} />
      </div>
      <div className={styles.dataNote}>
        <FileText size={17} aria-hidden="true" />
        <span>Each count reflects an existing perspective annotation linked to its source. Unclassified records are kept separate from positive and negative signals.</span>
      </div>
    </div>
  );
}

function ThaiJoResearch({ thaiJoRecords }: { thaiJoRecords: ThaiJoRecord[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("All years");
  const [pullBusy, setPullBusy] = useState(false);
  const [pullMessage, setPullMessage] = useState("");
  const [pullError, setPullError] = useState("");

  const filteredThaiJo = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return thaiJoRecords.filter((item) => {
      const searchableText = [item.searchText ?? "", item.title, item.excerpt, item.journal ?? "", ...item.keywords].join(" ");
      const matchesTopic = isThaiJoTopicMatch(searchableText);
      const matchesQuery = !normalizedQuery || [
        item.searchText ?? "",
        item.title,
        item.author ?? "",
        item.journal ?? "",
        item.excerpt,
        ...item.keywords
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesYear = yearFilter === "All years" || String(item.year ?? "Unknown") === yearFilter;
      return matchesTopic && matchesQuery && matchesYear;
    });
  }, [query, thaiJoRecords, yearFilter]);

  const availableYears = [...new Set(thaiJoRecords.map((item) => item.year).filter((year): year is number => year !== null))]
    .sort((a, b) => b - a);

  async function pullThaiJoRecords() {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setPullError("Enter a topic in the search box before pulling ThaiJO results.");
      return;
    }

    setPullBusy(true);
    setPullError("");
    setPullMessage("");
    try {
      const response = await fetch("/api/ingest/THAIJO", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 25 })
      });
      const result = await response.json() as { recordsFound?: number; recordsSaved?: number; error?: string };
      if (!response.ok) {
        setPullError(result.error || "ThaiJO data could not be pulled.");
        return;
      }

      setPullMessage(`ThaiJO returned ${result.recordsFound ?? 0} records; ${result.recordsSaved ?? 0} saved to the atlas.`);
      router.refresh();
    } catch {
      setPullError("Could not reach the ThaiJO pull service. Please try again.");
    } finally {
      setPullBusy(false);
    }
  }

  return (
    <div className={styles.sectionStack}>
      <div className={styles.sectionIntro}>
        <div>
          <span className={styles.sectionEyebrow}>THAIJO MEDICAL RESEARCH DATABASE</span>
          <h2>Search ThaiJO medical research</h2>
        </div>
        <p>Search saved ThaiJO articles, pull new medical-research results into the database, and open each article at its source.</p>
      </div>
      <div className={styles.filterBar}>
        <label className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search ThaiJO medical research in the database</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search medical topic, article, author, journal, keywords…"
          />
        </label>
        <label className={styles.filterSelect}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Filter ThaiJO articles by year</span>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option>All years</option>
            {availableYears.map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.pullPanel}>
        <div>
          <strong>Search and save ThaiJO research</strong>
          <span>Pulls up to 25 articles matching your search and saves them to the atlas database.</span>
        </div>
        <button disabled={pullBusy || !query.trim()} onClick={() => void pullThaiJoRecords()} type="button">
          {pullBusy ? <LoaderCircle className={styles.spin} size={15} /> : <ArrowUpRight size={15} />}
          {pullBusy ? "Searching ThaiJO…" : "Search ThaiJO & save"}
        </button>
        {(pullMessage || pullError) && (
          <p className={pullError ? styles.assistantError : styles.pullSuccess} role="status">
            {pullError || pullMessage}
          </p>
        )}
      </div>
      <div className={styles.resultsLine}>
        <strong>{filteredThaiJo.length} articles</strong>
        <span>Click a result box to open its ThaiJO article.</span>
      </div>
      {filteredThaiJo.length ? (
          <div className={styles.articleGrid}>
            {filteredThaiJo.map((item) => (
              <a className={styles.articleCard} href={item.url} key={item.id} target="_blank" rel="noopener noreferrer">
                <div className={styles.articleCardTop}>
                  <span className={styles.articleTag}>ThaiJO article{item.year ? ` · ${item.year}` : ""}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <p className={styles.journalName}><FileText size={15} aria-hidden="true" /> {item.journal ?? "Journal not listed"}</p>
                {item.author && <p className={styles.articleAuthor}>{item.author}</p>}
                {item.excerpt && <p className={styles.articleExcerpt}>{item.excerpt}</p>}
                {item.keywords.length > 0 && <p className={styles.articleKeywords}>{item.keywords.slice(0, 5).join(" · ")}</p>}
                <span className={styles.articleSourceLink}>Open ThaiJO article <ArrowUpRight size={14} aria-hidden="true" /></span>
              </a>
            ))}
          </div>
      ) : (
          <div className={styles.emptyState}>
            <FileText size={25} aria-hidden="true" />
            <h3>No ThaiJO articles match this search</h3>
            <p>Enter a topic and use “Search ThaiJO &amp; save” to fetch articles into the atlas.</p>
          </div>
      )}
      <div className={styles.dataNote}>
        <FileText size={17} aria-hidden="true" />
        <span>Results are records already stored in the atlas. Pull additional articles using the same search term; article links open the ThaiJO source.</span>
      </div>
    </div>
  );
}

function ThaiJoAssistant({ thaiJoRecords }: { thaiJoRecords: ThaiJoRecord[] }) {
  const [question, setQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);

  async function askThaiJoAssistant(action: "ask" | "summary") {
    setAssistantBusy(true);
    setAssistantError("");
    setAssistantAnswer("");
    try {
      const response = await fetch("/api/synergy/deployment-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          question: action === "ask" ? question : "",
          contextType: "thaijo",
          records: thaiJoRecords.slice(0, 100).map((item) => ({
            title: item.title,
            author: item.author,
            journal: item.journal,
            year: item.year,
            excerpt: item.excerpt,
            keywords: item.keywords
          }))
        })
      });
      const result = await response.json() as { answer?: string; error?: string };
      if (!response.ok) {
        setAssistantError(result.error || "The assistant could not complete this request.");
        return;
      }
      setAssistantAnswer(result.answer || "The assistant returned no answer.");
    } catch {
      setAssistantError("Could not reach the ThaiJO assistant. Check your connection and try again.");
    } finally {
      setAssistantBusy(false);
    }
  }

  return (
    <section className={styles.assistantCard} aria-labelledby="thaijo-assistant-title">
      <div className={styles.assistantHeading}>
        <span className={styles.assistantIcon}><Bot size={19} aria-hidden="true" /></span>
        <div>
          <span className={styles.sectionEyebrow}>LOCAL AI · OLLAMA</span>
          <h3 id="thaijo-assistant-title">Ask about ThaiJO medical research</h3>
          <p>Use the stored ThaiJO articles to ask a question or generate a research summary. {thaiJoRecords.length} records available.</p>
        </div>
        <button
          className={styles.summaryButton}
          disabled={assistantBusy || !thaiJoRecords.length}
          onClick={() => void askThaiJoAssistant("summary")}
          type="button"
        >
          {assistantBusy ? <LoaderCircle className={styles.spin} size={15} /> : <Sparkles size={15} />}
          Summarize research
        </button>
      </div>
      <form
        className={styles.askForm}
        onSubmit={(event) => {
          event.preventDefault();
          void askThaiJoAssistant("ask");
        }}
      >
        <label className={styles.visuallyHidden} htmlFor="thaijo-question">Ask a question about ThaiJO medical research</label>
        <input
          id="thaijo-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. What medical topics appear in these articles?"
          maxLength={500}
        />
        <button disabled={assistantBusy || !question.trim() || !thaiJoRecords.length} type="submit">
          {assistantBusy ? <LoaderCircle className={styles.spin} size={15} /> : <ArrowUpRight size={15} />}
          Ask AI
        </button>
      </form>
      {(assistantAnswer || assistantError || assistantBusy) && (
        <div className={`${styles.assistantResponse} ${assistantError ? styles.assistantError : ""}`} aria-live="polite">
          {assistantBusy ? (
            <><LoaderCircle className={styles.spin} size={16} /> Checking the ThaiJO records…</>
          ) : assistantError ? assistantError : assistantAnswer}
        </div>
      )}
      <div className={styles.assistantFootnote}>
        Answers use up to 100 stored ThaiJO records. Check the linked article before relying on a finding.
      </div>
    </section>
  );
}

function Summary({ perspectives, thaiJoRecords, aiSummary }: { perspectives: PerspectiveRecord[]; thaiJoRecords: ThaiJoRecord[]; aiSummary: string | null }) {
  const sentimentData = distribution(perspectives.map((item) => item.sentiment));
  const positive = perspectives.filter((item) => isPositive(item.sentiment)).length;
  const negative = perspectives.filter((item) => isNegative(item.sentiment)).length;
  const themes = distribution(perspectives.map((item) => item.theme));
  const leadingTheme = themes.find((item) => item.value > 0);
  const positivePercent = perspectives.length ? Math.round((positive / perspectives.length) * 100) : 0;
  const negativePercent = perspectives.length ? Math.round((negative / perspectives.length) * 100) : 0;

  const brief = perspectives.length
    ? [
        `${perspectives.length} stored perspective annotations were included in this brief.`,
        `${positive} positive/supportive signal${positive === 1 ? "" : "s"} (${positivePercent}%) and ${negative} negative/skeptical signal${negative === 1 ? "" : "s"} (${negativePercent}%) are currently recorded.`,
        leadingTheme
          ? `The most frequent recorded theme is ${leadingTheme.name.toLowerCase()} (${leadingTheme.value} record${leadingTheme.value === 1 ? "" : "s"}).`
          : "No recurring perspective theme is available yet."
      ]
    : ["There are no stored perspective annotations to summarize yet. Add reviewed source records to generate an evidence-based brief."];

  const barData = [
    { group: "Sentiment", Positive: positive, Negative: negative },
    {
      group: "Response",
      Positive: perspectives.filter((item) => isPositive(item.stance)).length,
      Negative: perspectives.filter((item) => isNegative(item.stance)).length
    }
  ];

  return (
    <div className={styles.sectionStack}>
      <div className={styles.summaryHero}>
        <div className={styles.summaryIcon}><Sparkles size={20} aria-hidden="true" /></div>
        <div>
          <span className={styles.sectionEyebrow}>AUTOMATED EVIDENCE BRIEF</span>
          <h2>AI summary</h2>
          <p>
            {aiSummary
              ? "Generated locally with Ollama from aggregate annotation counts."
              : "Data-derived fallback; set OLLAMA_MODEL to enable a local AI-written summary."}
          </p>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        <section className={styles.briefCard}>
          <h3>Current readout</h3>
          {aiSummary && <p className={styles.aiSummaryText}>{aiSummary}</p>}
          <ul className={styles.briefList}>
            {brief.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <div className={styles.briefFootnote}>
            <FileText size={15} aria-hidden="true" />
            Summary only reflects the annotations currently stored in the atlas.
          </div>
        </section>
        <ChartCard title="Sentiment mix" description="Share of stored positive, negative, and other signals" data={sentimentData} />
      </div>
      <section className={styles.summaryChartCard}>
        <div className={styles.cardHeading}>
          <div>
            <h3>Positive and negative signals</h3>
            <p>Compare emotional tone with recorded supportive or skeptical responses.</p>
          </div>
        </div>
        {perspectives.length ? (
          <div className={styles.barChart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#e9eee9" vertical={false} />
                <XAxis dataKey="group" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e9e4", fontSize: 12 }} />
                <Legend />
                <Bar dataKey="Positive" fill="#1c775b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Negative" fill="#d56b58" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.chartEmpty}>A comparison graph will appear when annotated records are available.</div>
        )}
      </section>
      <div className={styles.dataNote}>
        <HeartHandshake size={17} aria-hidden="true" />
        <span>“Positive” and “negative” group existing labels only; neutral, mixed, unclear, and unclassified results remain visible in the chart above.</span>
      </div>
      <ThaiJoAssistant thaiJoRecords={thaiJoRecords} />
    </div>
  );
}

export default function SynergyTrack({ perspectives, thaiJoRecords, language, aiSummary }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const tabOrder: Tab[] = ["dashboard", "deployments", "summary"];

  return (
    <div className={styles.workspace}>
      <div className={styles.tabBar} role="tablist" aria-label="Synergy Track sections">
        {tabOrder.map((tab, index) => {
          const Icon = tabLabels[tab].icon;
          const active = activeTab === tab;
          return (
            <button
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.activeTab : ""}`}
              id={`synergy-tab-${tab}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
              aria-controls={`synergy-panel-${tab}`}
            >
              <span className={styles.tabIndex}>0{index + 1}</span>
              <Icon size={18} aria-hidden="true" />
              <span>{tabLabels[tab].label}</span>
              {tab === "deployments" && <span className={styles.tabCount}>{thaiJoRecords.length}</span>}
            </button>
          );
        })}
      </div>
      <section
        aria-labelledby={`synergy-tab-${activeTab}`}
        className={styles.tabPanel}
        id={`synergy-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={0}
      >
        <div className={styles.panelEyebrow}>{tabLabels[activeTab].eyebrow}</div>
        {activeTab === "dashboard" && <Dashboard perspectives={perspectives} articleCount={thaiJoRecords.length} />}
        {activeTab === "deployments" && <ThaiJoResearch thaiJoRecords={thaiJoRecords} />}
        {activeTab === "summary" && <Summary perspectives={perspectives} thaiJoRecords={thaiJoRecords} aiSummary={aiSummary} />}
      </section>
      <div className={styles.footerMeta}>
        <span>THA / SYNERGY TRACK</span>
        <span>{language === "th" ? "ข้อมูลจากแหล่งที่บันทึกในระบบ" : "Evidence linked to recorded atlas sources"}</span>
        <Link href="/database?table=perspective_annotations">Browse perspective records <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

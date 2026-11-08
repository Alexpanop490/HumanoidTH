import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { dashboardWidgetOptions, interestPresets, isDashboardWidget } from "@/lib/user-dashboard-config";
import { deleteUserDashboard, saveUserDashboard } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Research Dashboards",
  robots: { index: false, follow: false }
};

type SearchParams = Promise<{ id?: string }>;
type CountGroup = { label: string; count: number };

function CountWidget({ title, groups }: { title: string; groups: CountGroup[] }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {groups.length ? (
        <ul className="dashboard-count-list">
          {groups.map((group) => (
            <li key={group.label}>
              <span>{group.label.replace(/_/g, " ")}</span>
              <strong>{group.count}</strong>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No matching records yet.</p>}
    </section>
  );
}

export default async function MyDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/my-dashboard");
  const params = await searchParams;
  const dashboards = await prisma.userDashboard.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" }
  });
  const active = dashboards.find((dashboard) => dashboard.id === params.id) ?? dashboards[0] ?? null;

  const widgets = active?.widgets.filter(isDashboardWidget) ?? [];
  const interests = active?.interestKeywords ?? [];
  const interestMatches = interests.length
    ? await prisma.sourceRecord.findMany({
        where: {
          relevanceStatus: "ACCEPTED",
          OR: interests.flatMap((interest) => [
            { title: { contains: interest, mode: "insensitive" as const } },
            { excerpt: { contains: interest, mode: "insensitive" as const } }
          ])
        },
        select: {
          id: true,
          title: true,
          url: true,
          sourceType: true,
          relevanceConfidence: true
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      })
    : [];

  const [sourceGroups, robotGroups, perspectiveGroups, contributionGroups, hriGroups] = await Promise.all([
    widgets.includes("sourceTypes")
      ? prisma.sourceRecord.groupBy({
          by: ["sourceType"],
          where: { relevanceStatus: "ACCEPTED" },
          _count: { _all: true },
          orderBy: { _count: { sourceType: "desc" } },
          take: 10
        })
      : Promise.resolve([]),
    widgets.includes("robotTypes")
      ? prisma.robotModel.groupBy({
          by: ["robotType"],
          _count: { _all: true },
          orderBy: { _count: { robotType: "desc" } },
          take: 10
        })
      : Promise.resolve([]),
    widgets.includes("perspectiveThemes")
      ? prisma.perspectiveAnnotation.groupBy({
          by: ["perspectiveTheme"],
          _count: { _all: true },
          orderBy: { _count: { perspectiveTheme: "desc" } },
          take: 10
        })
      : Promise.resolve([]),
    widgets.includes("contributionTypes")
      ? prisma.contribution.groupBy({
          by: ["contributionType"],
          where: { visibility: "public", verificationStatus: "APPROVED" },
          _count: { _all: true },
          orderBy: { _count: { contributionType: "desc" } },
          take: 10
        })
      : Promise.resolve([]),
    widgets.includes("hriOutcomes")
      ? prisma.hriAnalysis.groupBy({
          by: ["interactionOutcome"],
          where: { source: { is: { sourceType: "THAIJO", relevanceStatus: { not: "REJECTED" } } } },
          _count: { _all: true }
        })
      : Promise.resolve([])
  ]);

  const hriCounts = { positive: 0, negative: 0, mixed: 0, neutral: 0, unclear: 0 };
  for (const group of hriGroups) {
    const outcome = Object.hasOwn(hriCounts, group.interactionOutcome)
      ? group.interactionOutcome as keyof typeof hriCounts
      : "unclear";
    hriCounts[outcome] += group._count._all;
  }
  const presetInterestSet = new Set<string>(interestPresets);

  return (
    <div>
      <div className="topline">
        <div>
          <h1>My research dashboards</h1>
          <p className="muted">Save your interests and choose which verified atlas aggregates to explore.</p>
        </div>
        <Link className="button" href="/profile">Profile</Link>
      </div>

      {dashboards.length > 0 && (
        <nav className="panel dashboard-picker" aria-label="Saved dashboards">
          {dashboards.map((dashboard) => (
            <Link
              key={dashboard.id}
              href={`/my-dashboard?id=${encodeURIComponent(dashboard.id)}`}
              className={dashboard.id === active?.id ? "active" : ""}
            >
              {dashboard.name}
            </Link>
          ))}
        </nav>
      )}

      <section className="panel dashboard-editor">
        <h2>{active ? `Customize “${active.name}”` : "Create your first dashboard"}</h2>
        <form action={saveUserDashboard} className="form">
          {active && <input type="hidden" name="id" value={active.id} />}
          <label>
            Dashboard name
            <input name="name" defaultValue={active?.name ?? "My robotics interests"} maxLength={60} required />
          </label>

          <fieldset>
            <legend>Interests</legend>
            <div className="dashboard-interest-options">
              {interestPresets.map((interest) => (
                <label key={interest}>
                  <input
                    type="checkbox"
                    name="presetInterests"
                    value={interest}
                    defaultChecked={active?.interestKeywords.includes(interest) ?? false}
                  />
                  {interest}
                </label>
              ))}
            </div>
            <label>
              Custom interests (comma-separated)
              <input
                name="customInterests"
                defaultValue={active?.interestKeywords.filter((interest) => !presetInterestSet.has(interest)).join(", ") ?? ""}
                maxLength={500}
                placeholder="e.g. Pepper, psychological care"
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Data widgets</legend>
            <div className="dashboard-interest-options">
              {dashboardWidgetOptions.map((widget) => (
                <label key={widget.value}>
                  <input
                    type="checkbox"
                    name="widgets"
                    value={widget.value}
                    defaultChecked={active ? active.widgets.includes(widget.value) : true}
                  />
                  {widget.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="primary">{active ? "Save dashboard" : "Create dashboard"}</button>
        </form>
        {active && (
          <form action={deleteUserDashboard} style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={active.id} />
            <button type="submit">Delete this dashboard</button>
          </form>
        )}
      </section>

      {active && (
        <>
          <section className="dashboard-interest-results">
            <div>
              <h2>Information matching your interests</h2>
              <p className="muted">
                Matches accepted atlas sources against your chosen keywords. These are keyword matches, not a claim that the article proves an interest or outcome.
              </p>
            </div>
            <div className="panel">
              {interests.length === 0 ? (
                <p className="muted">Choose interests above to see matching source records.</p>
              ) : interestMatches.length ? (
                <ul className="dashboard-source-list">
                  {interestMatches.map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                      <span className="muted">{source.sourceType} · relevance confidence {(source.relevanceConfidence * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">No accepted source records match these interests yet.</p>}
            </div>
          </section>

          <section className="dashboard-widget-grid" aria-label="Selected data widgets">
            {widgets.includes("sourceTypes") && (
              <CountWidget title="Accepted sources by type" groups={sourceGroups.map((row) => ({ label: row.sourceType, count: row._count._all }))} />
            )}
            {widgets.includes("robotTypes") && (
              <CountWidget title="Robot registry by type" groups={robotGroups.map((row) => ({ label: row.robotType, count: row._count._all }))} />
            )}
            {widgets.includes("perspectiveThemes") && (
              <CountWidget title="Perspectives by theme" groups={perspectiveGroups.map((row) => ({ label: row.perspectiveTheme, count: row._count._all }))} />
            )}
            {widgets.includes("contributionTypes") && (
              <CountWidget title="Approved public contributions" groups={contributionGroups.map((row) => ({ label: row.contributionType, count: row._count._all }))} />
            )}
            {widgets.includes("hriOutcomes") && (
              <CountWidget
                title="ThaiJO healthcare HRI outcomes"
                groups={Object.entries(hriCounts).map(([label, count]) => ({ label, count })).filter((group) => group.count > 0)}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

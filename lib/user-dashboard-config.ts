export const interestPresets = [
  "humanoid robots",
  "mental health care",
  "healthcare",
  "Thailand",
  "eldercare",
  "education",
  "social robots",
  "human-robot interaction"
] as const;

export const dashboardWidgetValues = [
  "sourceTypes",
  "robotTypes",
  "perspectiveThemes",
  "contributionTypes",
  "hriOutcomes"
] as const;

export type DashboardWidget = (typeof dashboardWidgetValues)[number];

export const dashboardWidgetOptions: Array<{ value: DashboardWidget; label: string }> = [
  { value: "sourceTypes", label: "Accepted sources by type" },
  { value: "robotTypes", label: "Robot registry by type" },
  { value: "perspectiveThemes", label: "Public perspectives by theme" },
  { value: "contributionTypes", label: "Public contributions by type" },
  { value: "hriOutcomes", label: "ThaiJO HRI outcomes" }
];

export function isDashboardWidget(value: string): value is DashboardWidget {
  return dashboardWidgetOptions.some((widget) => widget.value === value);
}

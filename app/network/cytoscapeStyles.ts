import type { SingularElementArgument, StylesheetJson } from "cytoscape";

const clusterColors: Record<string, string> = {
  healthcare_and_elderly_care: "#60d394",
  hospital_service_robots: "#38bdf8",
  education_robotics: "#facc15",
  humanoid_robots: "#a78bfa",
  public_safety_robots: "#fb7185",
  research_and_academic_contributions: "#f59e0b",
  media_perspectives: "#22d3ee",
  owned_inventory: "#f97316",
  companies_and_institutions: "#94a3b8",
  international_robots_shown_in_thailand: "#34d399",
  unknown: "#64748b"
};

export function networkStyles(showArrows: boolean, showLabels: boolean, animationsEnabled = true): StylesheetJson {
  return [
    {
      selector: "node",
      style: {
        "background-color": (ele: SingularElementArgument) => clusterColors[String(ele.data("cluster"))] ?? clusterColors.unknown,
        "border-color": "#d9fff0",
        "border-opacity": 0.5,
        "border-width": 1,
        "color": "#e5fff5",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": 10,
        "height": (ele: SingularElementArgument) => Math.max(12, Math.min(48, 12 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0))),
        "label": "",
        "min-zoomed-font-size": 8,
        "opacity": 0.92,
        "overlay-opacity": 0,
        "overlay-padding": 4,
        "text-background-color": "#08130f",
        "text-background-opacity": 0,
        "text-background-padding": "2px",
        "text-margin-y": -10,
        "text-outline-color": "#08130f",
        "text-outline-opacity": 0,
        "text-outline-width": 1,
        "text-opacity": 0,
        "text-valign": "top",
        "transition-duration": animationsEnabled ? 220 : 0,
        "transition-property": "width height border-width border-color opacity overlay-opacity text-opacity text-background-opacity text-outline-opacity",
        "transition-timing-function": "ease-out",
        "width": (ele: SingularElementArgument) => Math.max(12, Math.min(48, 12 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0)))
      }
    },
    {
      selector: "node.show-label",
      style: {
        "font-size": (ele: SingularElementArgument) => Number(ele.data("important")) ? 11 : 9,
        "label": "data(displayLabel)",
        "text-background-opacity": 0.82,
        "text-opacity": 1,
        "text-outline-opacity": 1
      }
    },
    {
      selector: "node.low-confidence",
      style: {
        "border-color": "#facc15",
        "border-style": "dashed",
        "border-width": 2,
        "opacity": 0.68
      }
    },
    {
      selector: "node.private",
      style: {
        "background-blacken": 0.35,
        "border-color": "#fb923c",
        "border-width": 3,
        "shape": "round-rectangle"
      }
    },
    {
      selector: "node:selected",
      style: {
        "border-color": "#ffffff",
        "border-width": 4,
        "height": (ele: SingularElementArgument) => Math.max(17, Math.min(58, 17 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0))),
        "overlay-color": "#d9fff0",
        "overlay-opacity": 0.12,
        "width": (ele: SingularElementArgument) => Math.max(17, Math.min(58, 17 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0)))
      }
    },
    {
      selector: "node.is-dragging",
      style: {
        "border-color": "#ffffff",
        "border-width": 5,
        "height": (ele: SingularElementArgument) => Math.max(20, Math.min(62, 20 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0))),
        "overlay-color": "#99f6d4",
        "overlay-opacity": 0.18,
        "z-index": 1200,
        "width": (ele: SingularElementArgument) => Math.max(20, Math.min(62, 20 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0)))
      }
    },
    {
      selector: "node.just-dropped, node.pulse",
      style: {
        "border-color": "#f5d26c",
        "border-width": 5,
        "overlay-color": "#f5d26c",
        "overlay-opacity": 0.16
      }
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "color": "#d8fff0",
        "font-size": 9,
        "label": showLabels ? "data(label)" : "",
        "line-color": "#7dd3c7",
        "line-opacity": (ele: SingularElementArgument) => Math.max(0.18, Math.min(0.8, Number(ele.data("confidence") ?? 0.5))),
        "opacity": (ele: SingularElementArgument) => Math.max(0.24, Math.min(0.9, Number(ele.data("confidence") ?? 0.5))),
        "target-arrow-color": "#7dd3c7",
        "target-arrow-shape": showArrows ? "triangle" : "none",
        "text-background-color": "#08130f",
        "text-background-opacity": 0.85,
        "text-background-padding": "2px",
        "text-outline-color": "#08130f",
        "text-outline-width": 1,
        "text-opacity": showLabels ? 1 : 0,
        "transition-duration": animationsEnabled ? 200 : 0,
        "transition-property": "line-color target-arrow-color width opacity line-opacity text-opacity",
        "transition-timing-function": "ease-out",
        "width": (ele: SingularElementArgument) => Math.max(1, Math.min(7, Number(ele.data("weight") ?? 1) * 1.25))
      }
    },
    {
      selector: "edge.low-confidence",
      style: {
        "line-style": "dashed",
        "line-color": "#facc15",
        "target-arrow-color": "#facc15"
      }
    },
    {
      selector: ".faded",
      style: {
        "opacity": 0.08,
        "text-opacity": 0
      }
    },
    {
      selector: ".highlighted",
      style: {
        "opacity": 1,
        "z-index": 999
      }
    },
    {
      selector: "edge.highlighted",
      style: {
        "label": "data(label)",
        "line-color": "#ffffff",
        "target-arrow-color": "#ffffff",
        "text-opacity": 1,
        "width": 4
      }
    },
    {
      selector: "node.highlighted",
      style: {
        "border-color": "#ffffff",
        "border-width": 3
      }
    }
  ];
}

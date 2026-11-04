"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Counts = {
  sources: number;
  robots: number;
  contributions: number;
  perspectives: number;
  submissions: number;
};

interface AnalyticsBpmnProps {
  counts: Counts;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildXml(counts: Counts) {
  const sourceLabel = escapeXml(`Internet sources (${counts.sources})`);
  const robotLabel = escapeXml(`Robot models (${counts.robots})`);
  const contributionLabel = escapeXml(`Contributions (${counts.contributions})`);
  const perspectiveLabel = escapeXml(`Perspectives (${counts.perspectives})`);
  const submissionLabel = escapeXml(`Submissions (${counts.submissions})`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_Atlas"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Atlas" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Atlas data enters the workspace" />
    <bpmn:parallelGateway id="Gateway_Split" name="Ingest lanes" />
    <bpmn:task id="Task_Sources" name="${sourceLabel}" />
    <bpmn:task id="Task_Robots" name="${robotLabel}" />
    <bpmn:task id="Task_Contributions" name="${contributionLabel}" />
    <bpmn:task id="Task_Perspectives" name="${perspectiveLabel}" />
    <bpmn:task id="Task_Submissions" name="${submissionLabel}" />
    <bpmn:parallelGateway id="Gateway_Join" name="Merge corpus" />
    <bpmn:task id="Task_Dedupe" name="Canonicalize, dedupe, and normalize" />
    <bpmn:task id="Task_Score" name="Relevance scoring and tagging" />
    <bpmn:task id="Task_NLP" name="NLP extraction and entity linking" />
    <bpmn:task id="Task_Graph" name="Graph model and network metrics" />
    <bpmn:task id="Task_Analytics" name="Trend analysis &amp; caching" />
    <bpmn:endEvent id="EndEvent_1" name="Researcher-ready insight surface" />

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_Split" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_Split" targetRef="Task_Sources" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_Split" targetRef="Task_Robots" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_Split" targetRef="Task_Contributions" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_Split" targetRef="Task_Perspectives" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_Split" targetRef="Task_Submissions" />
    <bpmn:sequenceFlow id="Flow_7" sourceRef="Task_Sources" targetRef="Gateway_Join" />
    <bpmn:sequenceFlow id="Flow_8" sourceRef="Task_Robots" targetRef="Gateway_Join" />
    <bpmn:sequenceFlow id="Flow_9" sourceRef="Task_Contributions" targetRef="Gateway_Join" />
    <bpmn:sequenceFlow id="Flow_10" sourceRef="Task_Perspectives" targetRef="Gateway_Join" />
    <bpmn:sequenceFlow id="Flow_11" sourceRef="Task_Submissions" targetRef="Gateway_Join" />
    <bpmn:sequenceFlow id="Flow_12" sourceRef="Gateway_Join" targetRef="Task_Dedupe" />
    <bpmn:sequenceFlow id="Flow_13" sourceRef="Task_Dedupe" targetRef="Task_Score" />
    <bpmn:sequenceFlow id="Flow_14" sourceRef="Task_Score" targetRef="Task_NLP" />
    <bpmn:sequenceFlow id="Flow_15" sourceRef="Task_NLP" targetRef="Task_Graph" />
    <bpmn:sequenceFlow id="Flow_16" sourceRef="Task_Graph" targetRef="Task_Analytics" />
    <bpmn:sequenceFlow id="Flow_17" sourceRef="Task_Analytics" targetRef="EndEvent_1" />
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Atlas">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="90" y="182" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Split_di" bpmnElement="Gateway_Split" isMarkerVisible="true">
        <dc:Bounds x="160" y="177" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Sources_di" bpmnElement="Task_Sources">
        <dc:Bounds x="260" y="60" width="180" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Robots_di" bpmnElement="Task_Robots">
        <dc:Bounds x="260" y="150" width="180" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Contributions_di" bpmnElement="Task_Contributions">
        <dc:Bounds x="260" y="240" width="180" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Perspectives_di" bpmnElement="Task_Perspectives">
        <dc:Bounds x="260" y="330" width="180" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Submissions_di" bpmnElement="Task_Submissions">
        <dc:Bounds x="260" y="420" width="180" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Join_di" bpmnElement="Gateway_Join" isMarkerVisible="true">
        <dc:Bounds x="500" y="177" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Dedupe_di" bpmnElement="Task_Dedupe">
        <dc:Bounds x="600" y="175" width="220" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Score_di" bpmnElement="Task_Score">
        <dc:Bounds x="860" y="175" width="220" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_NLP_di" bpmnElement="Task_NLP">
        <dc:Bounds x="1120" y="175" width="220" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Graph_di" bpmnElement="Task_Graph">
        <dc:Bounds x="1380" y="175" width="220" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Analytics_di" bpmnElement="Task_Analytics">
        <dc:Bounds x="1640" y="175" width="220" height="70" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="1930" y="182" width="36" height="36" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="126" y="200" />
        <di:waypoint x="160" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="210" y="202" />
        <di:waypoint x="235" y="202" />
        <di:waypoint x="235" y="95" />
        <di:waypoint x="260" y="95" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="210" y="202" />
        <di:waypoint x="235" y="202" />
        <di:waypoint x="235" y="185" />
        <di:waypoint x="260" y="185" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="210" y="202" />
        <di:waypoint x="235" y="202" />
        <di:waypoint x="235" y="275" />
        <di:waypoint x="260" y="275" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="210" y="202" />
        <di:waypoint x="235" y="202" />
        <di:waypoint x="235" y="365" />
        <di:waypoint x="260" y="365" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="210" y="202" />
        <di:waypoint x="235" y="202" />
        <di:waypoint x="235" y="455" />
        <di:waypoint x="260" y="455" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7">
        <di:waypoint x="440" y="95" />
        <di:waypoint x="475" y="95" />
        <di:waypoint x="475" y="202" />
        <di:waypoint x="500" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8">
        <di:waypoint x="440" y="185" />
        <di:waypoint x="500" y="185" />
        <di:waypoint x="500" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9">
        <di:waypoint x="440" y="275" />
        <di:waypoint x="475" y="275" />
        <di:waypoint x="475" y="202" />
        <di:waypoint x="500" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_10_di" bpmnElement="Flow_10">
        <di:waypoint x="440" y="365" />
        <di:waypoint x="475" y="365" />
        <di:waypoint x="475" y="202" />
        <di:waypoint x="500" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_11_di" bpmnElement="Flow_11">
        <di:waypoint x="440" y="455" />
        <di:waypoint x="475" y="455" />
        <di:waypoint x="475" y="202" />
        <di:waypoint x="500" y="202" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12">
        <di:waypoint x="550" y="202" />
        <di:waypoint x="600" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13">
        <di:waypoint x="820" y="210" />
        <di:waypoint x="860" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_14_di" bpmnElement="Flow_14">
        <di:waypoint x="1080" y="210" />
        <di:waypoint x="1120" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_15_di" bpmnElement="Flow_15">
        <di:waypoint x="1340" y="210" />
        <di:waypoint x="1380" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_16_di" bpmnElement="Flow_16">
        <di:waypoint x="1600" y="210" />
        <di:waypoint x="1640" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_17_di" bpmnElement="Flow_17">
        <di:waypoint x="1860" y="210" />
        <di:waypoint x="1930" y="200" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

export default function AnalyticsBpmn({ counts }: AnalyticsBpmnProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const xml = useMemo(() => buildXml(counts), [counts]);

  useEffect(() => {
    let viewer: any;
    let cancelled = false;

    async function render() {
      try {
        const mod = await import("bpmn-js/lib/NavigatedViewer");
        if (cancelled || !containerRef.current) return;

        viewer = new mod.default({
          container: containerRef.current
        });

        await viewer.importXML(xml);
        const canvas = viewer.get("canvas");
        canvas.zoom("fit-viewport", "auto");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render BPMN diagram.");
      }
    }

    render();

    return () => {
      cancelled = true;
      if (viewer) {
        viewer.destroy();
      }
    };
  }, [xml]);

  return (
    <section className="panel motion-panel motion-pop">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
        <div>
          <h2>Research Process Map</h2>
          <div className="muted" style={{ fontSize: "12px" }}>
            BPMN view of the ingestion and analysis pipeline used across the atlas.
          </div>
        </div>
        <div className="badge">BPMN</div>
      </div>

      {error ? (
        <div className="notice" style={{ marginTop: "12px" }}>
          BPMN render failed: {error}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="motion-fade"
        style={{
          marginTop: "12px",
          minHeight: "clamp(520px, 72vh, 860px)",
          height: "clamp(520px, 72vh, 860px)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          background: "#fff"
        }}
      />
    </section>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Target } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import ScoreBar from "@/components/ui/ScoreBar";
import EmissionsTrendChart from "@/components/charts/EmissionsTrendChart";
import { getHotspotById, getEmissions, getRecommendationsByStream } from "@/lib/demo-data/index";

const MOCK_TREND = [
  { month: "Jan", total: 1620 }, { month: "Feb", total: 1590 }, { month: "Mar", total: 1680 },
  { month: "Apr", total: 1540 }, { month: "May", total: 1500 }, { month: "Jun", total: 1568 },
  { month: "Jul", total: 1568 }, { month: "Aug", total: 1568 },
];

export default function HotspotDetailPage({ params }) {
  const hotspot = getHotspotById(params.id);
  if (!hotspot) return <div style={{ padding: 40, color: "var(--muted)" }}>Hotspot not found.</div>;

  const recs = getRecommendationsByStream("CX-ORG-2048");

  return (
    <>
      <DemoDisclaimer compact />
      <Link href="/hotspots" className="text-button" style={{ marginBottom: 14, display: "inline-flex" }}>
        <ArrowLeft size={14} /> Back to Hotspots
      </Link>

      <div className="passport-header" style={{ marginBottom: 13 }}>
        <div>
          <div className="passport-id">HOTSPOT · {hotspot.id} · {hotspot.facilityId}</div>
          <h1 className="passport-name">{hotspot.source}</h1>
          <div className="passport-meta">
            <div className="passport-meta-item"><span>Process</span><strong>{hotspot.process}</strong></div>
            <div className="passport-meta-item"><span>Contribution</span><strong>{hotspot.contribution}%</strong></div>
            <div className="passport-meta-item"><span>Trend</span>
              <strong style={{ color: hotspot.trend.startsWith("+") ? "#ad6959" : "#5c8065" }}>{hotspot.trend}</strong>
            </div>
            <div className="passport-meta-item"><span>Priority</span><StatusBadge status={hotspot.priority} /></div>
            {hotspot.anomaly && (
              <div className="passport-meta-item">
                <span>Flag</span>
                <span className="anomaly-badge"><AlertTriangle size={9} /> Anomaly Detected</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="detail-stat">
            <div className="detail-stat-label">Emissions</div>
            <div className="detail-stat-value">{hotspot.emissions.toLocaleString()}<span className="detail-stat-unit">tCO₂e/yr</span></div>
          </div>
        </div>
      </div>

      <section className="two-column">
        <Panel>
          <SectionHeader eyebrow="ANALYSIS" title="Hotspot explanation" />
          <div style={{ padding: "16px 21px" }}>
            <p style={{ color: "#687168", fontSize: 11, lineHeight: 1.75, margin: 0 }}>{hotspot.description}</p>
          </div>
          <div style={{ padding: "0 21px 20px" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>EMISSIONS TREND</div>
            <div style={{ height: 200 }}>
              <EmissionsTrendChart data={MOCK_TREND} />
            </div>
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Panel>
            <SectionHeader eyebrow="SCORES" title="Opportunity metrics" />
            <div style={{ padding: "14px 21px" }}>
              {[
                { label: "Opportunity Score", value: hotspot.opportunityScore },
                { label: "Contribution", value: hotspot.contribution, max: 25 },
                { label: "Emissions (relative)", value: Math.round(hotspot.emissions / 16), max: 100 },
              ].map((s) => (
                <div key={s.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 5 }}>
                    <span>{s.label}</span>
                    <strong>{s.value}/{s.max || 100}</strong>
                  </div>
                  <ScoreBar value={s.value} max={s.max || 100} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="RECOMMENDATIONS" title="Suggested actions" />
            <div style={{ padding: "10px 21px 16px" }}>
              {recs.slice(0, 2).map((r) => (
                <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #f0f2ed" }}>
                  <div className="rec-card-tag" style={{ marginBottom: 4 }}>{r.category}</div>
                  <strong style={{ fontSize: 11 }}>{r.title}</strong>
                  <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 8, color: "#929a92" }}>CO₂ Benefit</span>
                      <strong style={{ fontSize: 11 }}>{r.co2Benefit} tCO₂e</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontSize: 8, color: "#929a92" }}>Circularity</span>
                      <strong style={{ fontSize: 11 }}>{r.circularity}/100</strong>
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/recommendations" className="text-button" style={{ marginTop: 8 }}>
                View all recommendations <ArrowRight size={12} />
              </Link>
            </div>
          </Panel>
        </div>
      </section>

      <footer className="footer" style={{ marginTop: 16 }}>
        <span>CarbonX · Hotspot</span>
      </footer>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowLeft, Factory, FileCheck2, MapPin, Zap } from "lucide-react";
import { notFound } from "next/navigation";
import Tabs from "@/components/ui/Tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import EmissionsTrendChart from "@/components/charts/EmissionsTrendChart";
import HotspotBarChart from "@/components/charts/HotspotBarChart";
import { getFacilityById, getFacilityProcesses, getEmissions, getHotspots, getStreams, getRecommendations } from "@/lib/demo-data/index";

const TABS = ["Overview", "Processes", "Emissions", "Hotspots", "Streams", "Recommendations", "Activity"];

export default function FacilityDetailPage({ params }) {
  const [tab, setTab] = useState("Overview");
  const facility = getFacilityById(params.id);

  if (!facility) notFound();

  const processes = getFacilityProcesses(params.id);
  const emissions = getEmissions();
  const hotspots = getHotspots().filter((h) => h.facilityId === params.id);
  const streams = getStreams().filter((s) => s.facilityId === params.id);
  const recs = getRecommendations();

  return (
    <>
      <DemoDisclaimer compact />
      <div style={{ marginBottom: 20 }}>
        <Link href="/facilities" className="text-button" style={{ marginBottom: 10, display: "inline-flex" }}>
          <ArrowLeft size={14} /> Back to Facilities
        </Link>

        <div className="passport-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="passport-id">{facility.id} · {facility.sector}</div>
            <h1 className="passport-name">{facility.name}</h1>
            <div className="passport-meta">
              <div className="passport-meta-item">
                <span>Location</span>
                <strong style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={11} />{facility.location}
                </strong>
              </div>
              <div className="passport-meta-item">
                <span>Reporting Period</span>
                <strong>{facility.reportingPeriod}</strong>
              </div>
              <div className="passport-meta-item">
                <span>Production</span>
                <strong>{facility.production.toLocaleString()} {facility.productionUnit}</strong>
              </div>
              <div className="passport-meta-item">
                <span>Status</span>
                <StatusBadge status={facility.status} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="detail-stat" style={{ textAlign: "right" }}>
              <div className="detail-stat-label">Total Emissions</div>
              <div className="detail-stat-value">{facility.totalEmissions.toLocaleString()}<span className="detail-stat-unit">tCO₂e</span></div>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="facility-hero-grid" style={{ marginTop: 13 }}>
          {[
            { label: "Emission Intensity", value: facility.emissionIntensity, unit: "tCO₂e/t" },
            { label: "Data Completeness", value: `${facility.dataCompleteness}%`, unit: "" },
            { label: "Active Hotspots", value: hotspots.length, unit: "identified" },
            { label: "Material Streams", value: streams.length, unit: "streams" },
          ].map((s) => (
            <div className="detail-stat" key={s.label}>
              <div className="detail-stat-label">{s.label}</div>
              <div className="detail-stat-value">{s.value}<span className="detail-stat-unit">{s.unit}</span></div>
              {s.label === "Data Completeness" && (
                <div className="completeness-bar" style={{ marginTop: 6 }}>
                  <div className="completeness-fill" style={{ width: `${facility.dataCompleteness}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Panel>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === "Overview" && (
          <div style={{ padding: "20px 21px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>EMISSIONS TREND</div>
                <div style={{ height: 200 }}>
                  <EmissionsTrendChart data={emissions} />
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>TOP PROCESSES</div>
                {processes.slice(0, 4).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 10 }}>
                        <span>{p.name}</span>
                        <strong>{p.emissions.toLocaleString()} tCO₂e</strong>
                      </div>
                      <div className="completeness-bar">
                        <div className="completeness-fill" style={{ width: `${p.contribution}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: "#929a92", width: 30, textAlign: "right" }}>{p.contribution}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Processes" && (
          <table className="data-table">
            <thead><tr><th>Process</th><th>Type</th><th>Emissions (tCO₂e)</th><th>Contribution</th></tr></thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="status-badge" style={{ textTransform: "capitalize" }}>{p.type}</span></td>
                  <td><strong>{p.emissions.toLocaleString()}</strong></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="completeness-bar" style={{ width: 80, flex: "none" }}>
                        <div className="completeness-fill" style={{ width: `${p.contribution}%` }} />
                      </div>
                      <span style={{ fontSize: 10 }}>{p.contribution}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Emissions" && (
          <div style={{ padding: "16px 21px" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>MONTHLY EMISSIONS</div>
            <div style={{ height: 280 }}>
              <EmissionsTrendChart data={emissions} />
            </div>
          </div>
        )}

        {tab === "Hotspots" && (
          <div>
            {hotspots.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>No hotspots identified.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Source</th><th>Emissions</th><th>Contribution</th><th>Trend</th><th>Priority</th><th></th></tr></thead>
                <tbody>
                  {hotspots.map((h) => (
                    <tr key={h.id}>
                      <td><strong>{h.source}</strong><br /><span style={{ fontSize: 9, color: "#929a92" }}>{h.process}</span></td>
                      <td><strong>{h.emissions.toLocaleString()} tCO₂e</strong></td>
                      <td>{h.contribution}%</td>
                      <td style={{ color: h.trend.startsWith("+") ? "#ad6959" : "#5c8065", fontWeight: 700 }}>{h.trend}</td>
                      <td><StatusBadge status={h.priority} /></td>
                      <td><Link href={`/hotspots/${h.id}`} className="text-button">Details →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "Streams" && (
          <div>
            {streams.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>No streams for this facility.</div>
            ) : (
              <div className="stream-list">
                {streams.map((s) => (
                  <Link key={s.id} href={`/streams/${s.id}`} className="stream-row" style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="stream-id">
                      <FileCheck2 size={15} />
                      <div><strong>{s.name}</strong><span>{s.id}</span></div>
                    </div>
                    <div className="stream-quantity"><strong>{s.quantity} {s.unit}</strong><span>total</span></div>
                    <StatusBadge status={s.status} />
                    <span className="more-button">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "Recommendations" && (
          <div style={{ padding: 16 }}>
            <div className="card-grid">
              {recs.slice(0, 3).map((r) => (
                <div className="rec-card" key={r.id}>
                  <div className="rec-card-tag">{r.category}</div>
                  <h3>{r.title}</h3>
                  <p>{r.reason}</p>
                  <div className="rec-metrics">
                    <div className="rec-metric"><span>CO₂ Benefit</span><strong>{r.co2Benefit} t</strong></div>
                    <div className="rec-metric"><span>Circularity</span><strong>{r.circularity}/100</strong></div>
                    <div className="rec-metric"><span>Savings</span><strong>₹{(r.savings/1000).toFixed(0)}k</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Activity" && (
          <div style={{ padding: "16px 0" }}>
            {[
              "Facility registered in CarbonX",
              "Emissions baseline computed",
              "Organic waste stream created",
              "Hotspot analysis completed",
              "Pathway recommendations generated",
            ].map((a, i) => (
              <div key={i} className="activity-row">
                <div className="activity-icon"><Activity size={13} /></div>
                <div className="activity-copy"><strong>{a}</strong><span>GIF-001 · Gujarat Industrial Facility</span></div>
                <time>{["Sep 1", "Aug 28", "Jul 1", "Jul 3", "Jul 10"][i]}, 2025</time>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <footer className="footer" style={{ marginTop: 16 }}>
        <span>CarbonX · {facility.name}</span>
        <span>{facility.reportingPeriod}</span>
      </footer>
    </>
  );
}

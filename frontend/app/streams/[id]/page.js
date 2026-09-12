"use client";

import Link from "next/link";
import { useState, use } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Sparkles,
  Recycle,
  GitBranch,
  Truck,
  FileCheck2,
  Calendar,
  Factory,
  Beaker,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import Tabs from "@/components/ui/Tabs";
import {
  getStreamById,
  getPathwaysByStream,
  getRecommendationsByStream,
  getLifecycleEvents,
} from "@/lib/demo-data/index";

export default function StreamDetailPage({ params }) {
  const unwrappedParams = use(params);
  const stream = getStreamById(unwrappedParams.id);

  if (!stream) {
    return notFound();
  }

  const [activeTab, setActiveTab] = useState("Characterization");
  const pathways = getPathwaysByStream(stream.id);
  const recommendations = getRecommendationsByStream(stream.id);
  const lifecycleEvents = getLifecycleEvents(stream.id);

  return (
    <>
      <DemoDisclaimer compact />

      {/* Back button */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/streams" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <ArrowLeft size={14} /> Back to Streams
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="page-header-eyebrow">ACT / BYPRODUCT STREAM</div>
          <h1 className="page-header-title">{stream.name}</h1>
          <div className="page-header-subtitle">
            Origin: <strong>{stream.facilityName}</strong> ({stream.facilityId}) • Type: <strong>{stream.type}</strong> • Total Volume: <strong>{stream.quantity} {stream.unit}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <StatusBadge status={stream.status} />
          <Link href={`/matching?stream=${stream.id}`} className="primary-button">
            <Sparkles size={14} /> Find Off-taker Match
          </Link>
          <Link href={`/passports?stream=${stream.id}`} className="secondary-button">
            <FileCheck2 size={14} /> View Digital Passport
          </Link>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card">
          <div className="metric-label">Available Volume</div>
          <div className="metric-value-row">
            <span className="metric-value">{stream.available}</span>
            <span className="metric-unit">{stream.unit}</span>
          </div>
          <div className="metric-change neutral">Ready for dispatch</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Reserved / Contracted</div>
          <div className="metric-value-row">
            <span className="metric-value">{stream.reserved}</span>
            <span className="metric-unit">{stream.unit}</span>
          </div>
          <div className="metric-change positive">Allocated to GreenLoop</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Circularity Score</div>
          <div className="metric-value-row">
            <span className="metric-value">92</span>
            <span className="metric-unit">/ 100</span>
          </div>
          <div className="metric-change positive">High grade biomethane</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Avoidance Potential</div>
          <div className="metric-value-row">
            <span className="metric-value">86</span>
            <span className="metric-unit">tCO₂e</span>
          </div>
          <div className="metric-change positive">-86 tCO₂e net vs landfill</div>
        </div>
      </div>

      {/* Tabs Panel */}
      <div className="panel" style={{ padding: 0 }}>
        <Tabs
          tabs={["Characterization", "Evaluated Pathways", "Lifecycle Traceability"]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "Characterization" && (
          <div style={{ padding: "24px 22px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600 }}>Stream Narrative & Description</h4>
                <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#475247", lineHeight: 1.6 }}>
                  {stream.description}
                </p>

                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Proximate & Lab Assay Specifications</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ border: "1px solid #d8ded8", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Moisture Content</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#141f18" }}>72.4%</div>
                    <div style={{ fontSize: 11, color: "#2e7d32" }}>Ideal for wet anaerobic digestion</div>
                  </div>
                  <div style={{ border: "1px solid #d8ded8", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Biochemical Methane Potential (BMP)</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#141f18" }}>280 L CH₄ / kg VS</div>
                    <div style={{ fontSize: 11, color: "#355c45" }}>High biomethane yield</div>
                  </div>
                  <div style={{ border: "1px solid #d8ded8", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Volatile Solids (VS)</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#141f18" }}>84.1% of TS</div>
                    <div style={{ fontSize: 11, color: "#667066" }}>Low inorganic ash content</div>
                  </div>
                  <div style={{ border: "1px solid #d8ded8", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>C:N Ratio</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#141f18" }}>24.8 : 1</div>
                    <div style={{ fontSize: 11, color: "#2e7d32" }}>Balanced microbial nutrition</div>
                  </div>
                </div>
              </div>

              <div style={{ borderLeft: "1px solid #ebefec", paddingLeft: 24 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Compliance & Assay Certification</h4>
                <div style={{ background: "#fafcfb", border: "1px solid #d8ded8", borderRadius: 6, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ShieldCheck size={18} color="#2e7d32" />
                    <strong style={{ fontSize: 13, color: "#141f18" }}>NABL-Accredited Lab Assay</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "#475247", marginBottom: 10 }}>
                    Report Ref: <strong>LAB-2025-07-882</strong> (Tested by EnviroTech Analytical Labs, Ahmedabad)
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    Heavy metals (Pb, Cd, As, Hg) all below CPCB Schedule II threshold for organic soil application.
                  </div>
                </div>

                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600 }}>Logistics & Handling Constraints</h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475247", lineHeight: 1.6 }}>
                  <li>Perishable: maximum 7-day ambient storage window before biological degradation</li>
                  <li>Requires enclosed tipper or tanker transport with leachate containment</li>
                  <li>Recommended transport radius: &lt; 60 km to optimize net carbon balance</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Evaluated Pathways" && (
          <div style={{ padding: "18px 20px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pathway Name</th>
                  <th>Off-take Partner</th>
                  <th>Avoidance (tCO₂e)</th>
                  <th>Circularity</th>
                  <th>Distance & Logistics</th>
                  <th>Net Economic Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pathways.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>{p.name}</div>
                      <span className="source-tag">{p.type}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.partnerName}</div>
                      <div style={{ fontSize: 11, color: "#667066" }}>Partner ID: {p.partnerId}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: "#2e7d32" }}>+{p.co2Benefit} tCO₂e</td>
                    <td style={{ minWidth: 100 }}>
                      <ScoreBar score={p.circularity} max={100} color="#355c45" />
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{p.distance} km</div>
                      <div style={{ fontSize: 11, color: "#667066" }}>+{p.transportEmissions} tCO₂ transit</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>${(p.revenue - p.cost).toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#667066" }}>Payback: {p.payback} mo</div>
                    </td>
                    <td>
                      <Link
                        href={`/pathways?id=${p.id}`}
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                      >
                        Compare
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Lifecycle Traceability" && (
          <div style={{ padding: "20px 22px" }}>
            <div className="timeline">
              {lifecycleEvents.map((evt, idx) => (
                <div key={evt.id} style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#355c45",
                        marginTop: 4,
                      }}
                    />
                    {idx < lifecycleEvents.length - 1 && (
                      <div style={{ width: 2, background: "#d8ded8", flex: 1, marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, border: "1px solid #d8ded8", borderRadius: 6, padding: 12, background: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>{evt.event}</div>
                      <span style={{ fontSize: 11, color: "#667066" }}>{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475247", marginBottom: 6 }}>
                      Actor: <strong>{evt.actor}</strong> • Location: <strong>{evt.location}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11 }}>
                      <span style={{ color: "#2e7d32", display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={12} /> {evt.status}
                      </span>
                      <span style={{ color: "#667066" }}>Evidence Ref: {evt.evidenceRef}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

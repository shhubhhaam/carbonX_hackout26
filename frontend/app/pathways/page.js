"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  GitBranch,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Truck,
  CheckCircle2,
  Sliders,
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import { getPathways as getLocalPathways } from "@/lib/demo-data/index";

export default function PathwaysPage() {
  const [pathways, setPathways] = useState(getLocalPathways());
  const [selectedPathway, setSelectedPathway] = useState(getLocalPathways()[0]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPathways() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/pathways");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && json.data.length > 0) {
            const normalized = json.data.map(p => ({
              ...p,
              partnerName: p.partner_name || p.partnerName || "Offtake Partner",
              co2Benefit: Number(p.co2_benefit !== undefined ? p.co2_benefit : p.co2Benefit || 0),
              overallScore: Number(p.overall_score !== undefined ? p.overall_score : p.overallScore || 0),
              economicValue: Number(p.economic_value !== undefined ? p.economic_value : p.economicValue || 0),
              transportEmissions: Number(p.transport_emissions !== undefined ? p.transport_emissions : p.transportEmissions || 0),
              rejectedReason: p.rejected_reason || p.rejectedReason
            }));
            setPathways(normalized);
            setSelectedPathway(normalized[0]);
            setIsLive(true);
          }
        }
      } catch (err) {
        console.warn("Backend pathways fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPathways();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <DemoDisclaimer compact />
        {isLive && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#e8f5e9",
            border: "1px solid #a5d6a7",
            color: "#1b5e20",
            borderRadius: 12,
            padding: "2px 10px",
            fontSize: 10,
            fontWeight: 600
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2e7d32", display: "inline-block" }}></span>
            Live MCDA Optimizer: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="ACT"
        title="Evaluated Circular Pathways"
        subtitle="Side-by-side multi-criteria evaluation of circular destinations, lifecycle carbon balances, and economic viability."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/simulator" className="primary-button">
              <Sliders size={14} />
              Simulate in What-If Engine
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Evaluated Pathways"
          value={pathways.length.toString()}
          unit="options"
          trend="up"
          change="Multi-criteria scored"
          icon={GitBranch}
        />
        <MetricCard
          label="Top Ranked Pathway"
          value="Biogas"
          unit="88 pts"
          trend="up"
          change="GreenLoop Biogas"
          icon={Sparkles}
        />
        <MetricCard
          label="Max Net Avoidance"
          value="112"
          unit="tCO₂e"
          trend="down"
          change="Biochar Pyrolysis"
          icon={TrendingDown}
        />
        <MetricCard
          label="Fastest Payback"
          value="9"
          unit="months"
          trend="up"
          change="In-vessel Composting"
          icon={DollarSign}
        />
      </div>

      {/* Pathways List + Detail split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        {/* Table / List */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-header">
            <div className="panel-title">Pathways Comparison Matrix</div>
            <div className="panel-subtitle">Click any pathway to inspect granular multi-criteria scoring</div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Pathway & Technology</th>
                <th>Partner</th>
                <th>Net Avoidance</th>
                <th>Payback</th>
                <th>Overall Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pathways.map((p) => {
                const isSelected = selectedPathway?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPathway(p)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#f2f7f4" : "transparent",
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>{p.name}</div>
                      <span className="source-tag">{p.type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.partnerName}</div>
                      <div style={{ fontSize: 11, color: "#667066" }}>{p.distance} km away</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#2e7d32" }}>+{p.co2Benefit} t</div>
                      <div style={{ fontSize: 11, color: "#8a968a" }}>-{p.transportEmissions} t transit</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.payback} mo</td>
                    <td style={{ minWidth: 90 }}>
                      <ScoreBar score={p.overallScore} max={100} color="#355c45" />
                    </td>
                    <td>
                      <button
                        className="secondary-button"
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                          background: isSelected ? "#355c45" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#141f18",
                        }}
                      >
                        {isSelected ? "Active" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Pathway Deep-Dive Card */}
        {selectedPathway && (
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="source-tag" style={{ textTransform: "uppercase", marginBottom: 4 }}>
                  {selectedPathway.type}
                </span>
                <h3 style={{ margin: "4px 0 2px 0", fontSize: 18, fontWeight: 600, color: "#141f18" }}>
                  {selectedPathway.name}
                </h3>
                <div style={{ fontSize: 12, color: "#667066" }}>Pathway ID: {selectedPathway.id}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#355c45" }}>
                  {selectedPathway.overallScore} <span style={{ fontSize: 13, fontWeight: 400 }}>/ 100</span>
                </div>
                <div style={{ fontSize: 11, color: "#8a968a" }}>Multi-Criteria Score</div>
              </div>
            </div>

            {/* Sub-scores breakdown */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#141f18" }}>
                Evaluation Dimensions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span>Circularity Impact</span>
                    <strong>{selectedPathway.circularity}%</strong>
                  </div>
                  <ScoreBar score={selectedPathway.circularity} max={100} color="#355c45" />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span>Economic Value & Return</span>
                    <strong>{selectedPathway.economicValue}%</strong>
                  </div>
                  <ScoreBar score={selectedPathway.economicValue} max={100} color="#2a7a58" />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span>Technical Feasibility</span>
                    <strong>{selectedPathway.feasibility}%</strong>
                  </div>
                  <ScoreBar score={selectedPathway.feasibility} max={100} color="#5d8a70" />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span>Logistics & Proximity</span>
                    <strong>{selectedPathway.logistics}%</strong>
                  </div>
                  <ScoreBar score={selectedPathway.logistics} max={100} color="#8bb09a" />
                </div>
              </div>
            </div>

            {/* Financial & Carbon balance table */}
            <div style={{ borderTop: "1px solid #ebefec", paddingTop: 14, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                <div style={{ background: "#f9faf9", padding: 10, borderRadius: 6 }}>
                  <div style={{ color: "#667066", fontSize: 11 }}>Gross CO₂ Benefit</div>
                  <div style={{ fontWeight: 600, color: "#2e7d32", fontSize: 14 }}>
                    +{selectedPathway.co2Benefit} tCO₂e
                  </div>
                </div>
                <div style={{ background: "#f9faf9", padding: 10, borderRadius: 6 }}>
                  <div style={{ color: "#667066", fontSize: 11 }}>Transport Transit Burden</div>
                  <div style={{ fontWeight: 600, color: "#c45353", fontSize: 14 }}>
                    -{selectedPathway.transportEmissions} tCO₂e
                  </div>
                </div>
                <div style={{ background: "#f9faf9", padding: 10, borderRadius: 6 }}>
                  <div style={{ color: "#667066", fontSize: 11 }}>Capital Investment</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>${selectedPathway.cost.toLocaleString()}</div>
                </div>
                <div style={{ background: "#f9faf9", padding: 10, borderRadius: 6 }}>
                  <div style={{ color: "#667066", fontSize: 11 }}>Projected Annual Revenue</div>
                  <div style={{ fontWeight: 600, color: "#2e7d32", fontSize: 14 }}>
                    +${selectedPathway.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Partner Details */}
            <div style={{ borderTop: "1px solid #ebefec", paddingTop: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "#667066" }}>Matched Off-taker</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>
                {selectedPathway.partnerName}
              </div>
              <div style={{ fontSize: 12, color: "#4f584f", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <MapPin size={12} /> {selectedPathway.distance} km road haulage (Ahmedabad Industrial Corridor)
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href={`/matching?partnerId=${selectedPathway.partnerId}`}
                className="secondary-button"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Inspect Partner
              </Link>
              <Link
                href={`/simulator?pathway=${selectedPathway.id}`}
                className="primary-button"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Simulate Offtake
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

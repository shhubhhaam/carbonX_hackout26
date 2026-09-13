"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight, Search, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { Panel } from "@/components/ui/Panel";
import ScoreBar from "@/components/ui/ScoreBar";
import { getHotspots, getFactoryContribution } from "@/lib/api-client";
import { useFacility } from "@/lib/FacilityContext";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function priorityFromContributionPct(pct) {
  if (pct >= 40) return "critical";
  if (pct >= 20) return "high";
  if (pct >= 8) return "medium";
  return "low";
}

// The real per-factory pipeline (analysis_routes.py) doesn't write into the
// old circular-economy emission_hotspots table — that table only has rows
// for the separate Gujarat/Mumbai/Pune demo facilities. It already computes
// a ranked source-contribution breakdown per factory (contribution_analyses
// .source_contributions), which is the same data the Dashboard's "Emission
// sources ranked" table shows — reuse it here instead of showing an empty
// page for every real factory.
function hotspotsFromContribution(contribution) {
  const sources = contribution?.source_contributions || [];
  return sources.map((s, i) => {
    const pct = Number(s.contribution_pct ?? s.percentage ?? 0);
    return {
      id: s.source_id || `${contribution.id}-${i}`,
      source: s.source_name || "Unknown source",
      process: s.source_category || contribution.emission_type_name || "Unclassified process",
      emissions: Number(s.emission_value || 0) / 1000,
      contribution: pct,
      priority: priorityFromContributionPct(pct),
      opportunityScore: Math.round(pct),
      anomaly: contribution.primary_hotspot_source_id === s.source_id,
      trend: "—",
    };
  });
}

export default function HotspotsPage() {
  const { selectedFacility } = useFacility();
  const [hotspots, setHotspots] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let mounted = true;
    async function loadHotspots() {
      setLoading(true);
      try {
        const data = await getHotspots(selectedFacility?.id ? { facility_id: selectedFacility.id } : {});
        if (!mounted) return;
        let normalized = (data || []).map((h) => ({
          ...h,
          opportunityScore: Number(h.opportunity_score !== undefined ? h.opportunity_score : h.opportunityScore || 0),
          emissions: Number(h.emissions || 0),
          contribution: Number(h.contribution || 0),
          source: h.source || h.source_name || "Unknown emitter",
          process: h.process || h.source_category || "Unclassified process",
          priority: h.priority || "low",
          trend: h.trend || "—",
        }));

        // The circular-economy hotspot table has nothing for real factories
        // (ABC Steel Works, XYZ Textile Mills, custom CSV uploads) — fall
        // back to the real analysis pipeline's own source-contribution
        // ranking for the selected factory instead of showing empty.
        if (normalized.length === 0 && selectedFacility?.id) {
          const contribution = await getFactoryContribution(selectedFacility.id);
          if (contribution) normalized = hotspotsFromContribution(contribution);
        }

        setHotspots(normalized);
        setIsLive(true);
      } catch (err) {
        console.warn("Backend hotspots fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadHotspots();
    return () => { mounted = false; };
  }, [selectedFacility?.id]);

  const priorities = ["All", "Critical", "High", "Medium", "Low"];

  const filtered = hotspots
    .filter((h) => filter === "All" || h.priority.toLowerCase() === filter.toLowerCase())
    .filter(
      (h) =>
        h.source.toLowerCase().includes(search.toLowerCase()) ||
        h.process.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

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
            Live Telemetry: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="MEASURE"
        title="Hotspot Explorer"
        subtitle="Ranked emission hotspots by process, contribution, anomaly, and opportunity score."
      />

      <div className="filters-bar">
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }} />
          <input
            className="search-input"
            placeholder="Search hotspots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        {priorities.map((p) => (
          <button key={p} className={`filter-pill${filter === p ? " active" : ""}`} onClick={() => setFilter(p)}>
            {p}
          </button>
        ))}
      </div>

      <Panel>
        {!loading && filtered.length === 0 ? (
          <div style={{ padding: "32px 21px", color: "#8a968a", fontSize: 13, textAlign: "center" }}>
            No hotspots recorded for {selectedFacility?.name || "this facility"}.
          </div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Source / Process</th>
              <th>Emissions</th>
              <th>Contribution</th>
              <th>Trend</th>
              <th>Anomaly</th>
              <th>Opportunity</th>
              <th>Priority</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={h.id}>
                <td style={{ color: "#929a92", fontWeight: 700, fontSize: 10 }}>{i + 1}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div className="source-icon"><Zap size={13} /></div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 2 }}>{h.source}</strong>
                      <span style={{ color: "#929a92", fontSize: 9 }}>{h.process}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{h.emissions.toLocaleString()}</strong>
                  <span style={{ fontSize: 9, color: "#929a92", marginLeft: 3 }}>tCO₂e</span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60 }}>
                      <ScoreBar value={h.contribution} max={25} size="sm" />
                    </div>
                    <span style={{ fontSize: 10 }}>{h.contribution}%</span>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 10,
                      color: h.trend.startsWith("+") ? "#ad6959" : "#5c8065",
                    }}
                  >
                    {h.trend}
                  </span>
                </td>
                <td>
                  {h.anomaly ? (
                    <span className="anomaly-badge">
                      <AlertTriangle size={9} /> Anomaly
                    </span>
                  ) : (
                    <span style={{ color: "#929a92", fontSize: 9 }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 50 }}>
                      <ScoreBar value={h.opportunityScore} size="sm" />
                    </div>
                    <span style={{ fontSize: 10 }}>{h.opportunityScore}</span>
                  </div>
                </td>
                <td>
                  <StatusBadge status={h.priority} />
                </td>
                <td>
                  <Link href={`/hotspots/${h.id}`} className="text-button">
                    Explore <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Panel>

      <footer className="footer" style={{ marginTop: 16 }}>
        <span>CarbonX · Hotspot Explorer · {selectedFacility?.name || "All facilities"}</span>
        <span>{filtered.length} hotspots shown</span>
      </footer>
    </>
  );
}

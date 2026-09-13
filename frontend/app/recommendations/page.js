"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  TrendingDown,
  DollarSign,
  Gauge,
  CheckCircle2,
  Sliders,
  Search,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { Panel } from "@/components/ui/Panel";
import ScoreBar from "@/components/ui/ScoreBar";
import { getFactoryRecommendations, getFactoryRecommendationDetail } from "@/lib/api-client";
import { useFacility } from "@/lib/FacilityContext";

export default function RecommendationsPage() {
  const { selectedFacility, facilitiesLoading } = useFacility();
  const [alternatives, setAlternatives] = useState([]);
  const [recommendationMeta, setRecommendationMeta] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadRecommendations() {
      if (!selectedFacility?.id) return;
      setLoading(true);
      setError(null);
      try {
        const summaries = await getFactoryRecommendations(selectedFacility.id, 1);
        const latest = summaries?.[0];
        if (!latest) {
          if (mounted) {
            setAlternatives([]);
            setRecommendationMeta(null);
            setError("No recommendations yet — run an analysis for this factory from the Dashboard first.");
          }
          return;
        }
        const detail = await getFactoryRecommendationDetail(selectedFacility.id, latest.id);
        if (!mounted) return;
        setAlternatives(Array.isArray(detail) ? detail : []);
        setRecommendationMeta(latest);
      } catch (err) {
        console.warn("Recommendations fetch error:", err);
        if (mounted) setError("Couldn't load recommendations from the backend.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRecommendations();
    return () => { mounted = false; };
  }, [selectedFacility?.id]);

  const categories = ["all", ...new Set(alternatives.map((a) => (a.category || "other").toLowerCase()))];

  const filtered = alternatives
    .filter((a) => categoryFilter === "all" || (a.category || "").toLowerCase() === categoryFilter)
    .filter(
      (a) =>
        (a.alternative_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.reasoning || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const totalReductionPct = alternatives.reduce((sum, a) => sum + Number(a.estimated_reduction_pct || 0), 0);
  const totalCapex = alternatives.reduce((sum, a) => sum + Number(a.estimated_capex || 0), 0);
  const avgFeasibility = alternatives.length
    ? alternatives.reduce((sum, a) => sum + Number(a.feasibility_score || 0), 0) / alternatives.length
    : 0;
  const topAlternative = alternatives.find((a) => a.is_top_recommendation) || alternatives[0];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <DemoDisclaimer compact />
        {recommendationMeta && (
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
            MCDA-ranked · {selectedFacility?.name}
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="ACT"
        title="Decarbonization Recommendations"
        subtitle="MCDA-ranked reduction alternatives computed by the analysis pipeline for the selected factory."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/simulator" className="primary-button">
              <Sliders size={14} />
              Open What-If Simulator
            </Link>
          </div>
        }
      />

      {/* KPI Cards — computed from the real ranked alternatives, not fixed numbers */}
      <div className="metrics-grid">
        <MetricCard
          label="Top Reduction Potential"
          value={topAlternative ? Number(topAlternative.estimated_reduction_pct || 0).toFixed(1) : "—"}
          unit="% of total"
          trend="down"
          change={topAlternative?.alternative_name || "No recommendation yet"}
          icon={TrendingDown}
        />
        <MetricCard
          label="Combined Capex (all options)"
          value={totalCapex ? (totalCapex >= 1_000_000 ? `$${(totalCapex / 1_000_000).toFixed(1)}M` : `$${(totalCapex / 1000).toFixed(1)}k`) : "—"}
          unit="USD"
          trend="neutral"
          change={`Across ${alternatives.length} option${alternatives.length === 1 ? "" : "s"}`}
          icon={DollarSign}
        />
        <MetricCard
          label="Average Feasibility"
          value={alternatives.length ? avgFeasibility.toFixed(2) : "—"}
          unit="/ 1.0"
          trend="up"
          change="Higher is easier to implement"
          icon={Gauge}
        />
        <MetricCard
          label="Top MCDA Score"
          value={topAlternative ? Number(topAlternative.mcda_score || 0).toFixed(2) : "—"}
          unit=""
          trend="up"
          change={topAlternative ? "Best overall option" : "—"}
          icon={CheckCircle2}
        />
      </div>

      {alternatives.length > 0 && (
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }}
            />
            <input
              className="search-input"
              placeholder="Search recommendations, technologies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`filter-pill ${categoryFilter === c ? "active" : ""}`}
              style={{ textTransform: "capitalize" }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!loading && (error || alternatives.length === 0) && (
        <Panel>
          <div style={{ padding: "32px 21px", textAlign: "center", color: "#8a968a", fontSize: 13 }}>
            {error || `No recommendations recorded for ${selectedFacility?.name || "this facility"}.`}
            {!facilitiesLoading && (
              <div style={{ marginTop: 12 }}>
                <Link href="/dashboard" className="primary-button small" style={{ display: "inline-flex" }}>
                  Go run an analysis <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Recommendations List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((rec, i) => (
          <div
            key={`${rec.alternative_name}-${i}`}
            className="panel"
            style={{
              padding: "18px 20px",
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="source-tag" style={{ textTransform: "uppercase" }}>{rec.category || "General"}</span>
                <span style={{ fontSize: 11, color: "#8a968a" }}>Rank #{rec.rank}</span>
                {rec.is_top_recommendation && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#1b5e20" }}>★ TOP PICK</span>
                )}
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 600, color: "#141f18" }}>
                {rec.alternative_name}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#4f584f", lineHeight: 1.5 }}>
                {rec.reasoning || rec.description}
              </p>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>Emission Reduction</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32" }}>
                -{Number(rec.estimated_reduction_pct || 0).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400 }}>% of total</span>
              </div>
              {rec.estimated_reduction_kg != null && (
                <div style={{ fontSize: 11, color: "#8a968a", marginTop: 2 }}>
                  {(Number(rec.estimated_reduction_kg) / 1000).toFixed(1)} tCO₂e/period
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                  <span>Feasibility</span>
                  <strong>{Number(rec.feasibility_score || 0).toFixed(2)}</strong>
                </div>
                <ScoreBar value={Number(rec.feasibility_score || 0) * 100} max={100} size="sm" />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>Capex & Score</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18" }}>
                {rec.estimated_capex != null ? `$${Number(rec.estimated_capex).toLocaleString()}` : "Capex not estimated"}
              </div>
              <div style={{ fontSize: 12, color: "#355c45" }}>
                MCDA score: {Number(rec.mcda_score || 0).toFixed(2)}
              </div>
              <div style={{ marginTop: 10 }}>
                <Link
                  href="/simulator"
                  className="secondary-button"
                  style={{ justifyContent: "center", fontSize: 12, display: "inline-flex" }}
                >
                  <Sliders size={13} /> Simulate Impact
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

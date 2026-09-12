"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  Sliders,
  Filter,
  Search,
  Zap,
  Recycle,
  GitBranch
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import { getRecommendations as getLocalRecommendations, getStreams as getLocalStreams } from "@/lib/demo-data/index";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState(getLocalRecommendations());
  const [streams, setStreams] = useState(getLocalStreams());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadRecs() {
      try {
        const [recRes, stRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/circular/recommendations").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/streams").then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (recRes.status === "fulfilled" && recRes.value?.data && recRes.value.data.length > 0) {
          const norm = recRes.value.data.map(r => ({
            ...r,
            streamId: r.stream_id || r.streamId,
            co2Benefit: Number(r.co2_benefit !== undefined ? r.co2_benefit : r.co2Benefit || 0),
            cost: Number(r.cost || 0),
            savings: Number(r.savings || 0),
            circularity: Number(r.circularity || 0),
            feasibility: Number(r.feasibility || 0),
            confidence: Number(r.confidence || 0)
          }));
          setRecommendations(norm);
          setIsLive(true);
        }
        if (stRes.status === "fulfilled" && stRes.value?.data) {
          setStreams(stRes.value.data);
        }
      } catch (err) {
        console.warn("Recommendations fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRecs();
    return () => { mounted = false; };
  }, []);

  const filteredRecs = recommendations.filter((r) => {
    const sId = r.streamId || r.stream_id || "";
    const matchCategory = categoryFilter === "all" || r.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchStream = streamFilter === "all" || sId === streamFilter;
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.reason && r.reason.toLowerCase().includes(search.toLowerCase())) ||
      (r.pathway && r.pathway.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchStream && matchSearch;
  });

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
            Live MCDA Interventions: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="ACT"
        title="Decarbonization & Circular Recommendations"
        subtitle="Ranked interventions across the 4R hierarchy (Reduce, Reuse, Recover, Process Change) with multi-criteria optimization."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/simulator" className="primary-button">
              <Sliders size={14} />
              Open What-If Simulator
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Potential Avoidance"
          value="284"
          unit="tCO₂e/yr"
          trend="down"
          change="-18.4% facility footprint"
          icon={TrendingDown}
        />
        <MetricCard
          label="Total Investment Capex"
          value="$166k"
          unit="USD"
          trend="neutral"
          change="Across 4 opportunities"
          icon={DollarSign}
        />
        <MetricCard
          label="Net Annual Cost Savings"
          value="$89.5k"
          unit="/ year"
          trend="up"
          change="Energy + avoided tipping fees"
          icon={DollarSign}
        />
        <MetricCard
          label="Average Payback Period"
          value="14.2"
          unit="months"
          trend="up"
          change="High financial return"
          icon={Clock}
        />
      </div>

      {/* Category Pills & Filters */}
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

        <button
          onClick={() => setCategoryFilter("all")}
          className={`filter-pill ${categoryFilter === "all" ? "active" : ""}`}
        >
          All (4)
        </button>
        <button
          onClick={() => setCategoryFilter("recover")}
          className={`filter-pill ${categoryFilter === "recover" ? "active" : ""}`}
        >
          Recover (Biogas)
        </button>
        <button
          onClick={() => setCategoryFilter("reuse")}
          className={`filter-pill ${categoryFilter === "reuse" ? "active" : ""}`}
        >
          Reuse (Composting)
        </button>
        <button
          onClick={() => setCategoryFilter("process-change")}
          className={`filter-pill ${categoryFilter === "process-change" ? "active" : ""}`}
        >
          Process Change (Biochar)
        </button>
        <button
          onClick={() => setCategoryFilter("reduce")}
          className={`filter-pill ${categoryFilter === "reduce" ? "active" : ""}`}
        >
          Reduce (Efficiency)
        </button>

        <select className="select-input" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
          <option value="all">All Linked Streams</option>
          {streams.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      </div>

      {/* Recommendations List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredRecs.map((rec) => (
          <div
            key={rec.id}
            className="panel"
            style={{
              padding: "18px 20px",
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 180px",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="source-tag" style={{ textTransform: "uppercase" }}>{rec.category}</span>
                <span style={{ fontSize: 11, color: "#8a968a" }}>ID: {rec.id} • Pathway: {rec.pathway}</span>
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 600, color: "#141f18" }}>
                {rec.title}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#4f584f", lineHeight: 1.5 }}>
                {rec.reason}
              </p>
              <div style={{ marginTop: 8, fontSize: 11, color: "#667066" }}>
                Linked Stream: <Link href={`/streams/${rec.streamId}`} style={{ color: "#355c45", fontWeight: 500 }}>{rec.streamId}</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>GHG Avoidance</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32" }}>
                -{rec.co2Benefit} <span style={{ fontSize: 12, fontWeight: 400 }}>tCO₂e / yr</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                  <span>Circularity Score</span>
                  <strong>{rec.circularity}%</strong>
                </div>
                <ScoreBar score={rec.circularity} max={100} color="#355c45" />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>Financial Economics</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18" }}>
                Capex: ${rec.cost.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "#2e7d32" }}>
                Savings: +${rec.savings.toLocaleString()} / yr
              </div>
              <div style={{ fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                Payback: {Math.round((rec.cost / rec.savings) * 12)} months
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href={`/pathways?rec=${rec.id}`}
                className="primary-button"
                style={{ justifyContent: "center", fontSize: 12 }}
              >
                <GitBranch size={13} /> Review Pathway
              </Link>
              <Link
                href={`/simulator?rec=${rec.id}`}
                className="secondary-button"
                style={{ justifyContent: "center", fontSize: 12 }}
              >
                <Sliders size={13} /> Simulate Impact
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

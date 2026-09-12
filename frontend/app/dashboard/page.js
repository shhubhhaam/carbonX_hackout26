"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Database,
  Gauge,
  Layers,
  Loader2,
  PlayCircle,
  Recycle,
  Sparkles,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import EmissionsTrendChart from "@/components/charts/EmissionsTrendChart";
import ScopeDonutChart from "@/components/charts/ScopeDonutChart";
import HotspotBarChart from "@/components/charts/HotspotBarChart";
import FacilityBarChart from "@/components/charts/FacilityBarChart";
import { runFactoryAnalysis, getFactoryFeatureSeries } from "@/lib/api-client";
import { useFacility } from "@/lib/FacilityContext";

const SOURCE_COLORS = ["#355c45", "#5d8a70", "#8bb09a", "#a3c5b0", "#c6ddce"];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export default function DashboardPage() {
  const { selectedFacility, facilitiesLoading } = useFacility();
  const [periodStart, setPeriodStart] = useState(() => daysAgo(14));
  const [periodEnd, setPeriodEnd] = useState(() => isoDate(new Date()));
  const [report, setReport] = useState(null);
  const [trendSeries, setTrendSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runAnalysis(facilityId, start, end) {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runFactoryAnalysis(facilityId, {
        periodStart: `${start}T00:00:00Z`,
        periodEnd: `${end}T23:59:59Z`,
      });
      if (!data) {
        setError("Couldn't reach the analysis pipeline. Is the backend running?");
        setReport(null);
        return;
      }
      if (data.status === "INCOMPLETE") {
        setError(data.warnings?.[0] || "No measurements found for this factory in the selected period.");
        setReport(data);
        return;
      }
      setReport(data);
      // The feature-values table accumulates one row per re-run of /analyze
      // for the same day (no upsert), so group by calendar day and average
      // rather than plotting every duplicate as a separate point.
      const series = await getFactoryFeatureSeries(facilityId, "emission_intensity_co2", 500);
      const byDay = new Map();
      for (const s of series) {
        const day = s.period_start.slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(Number(s.value));
      }
      const dedup = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, values]) => ({
          month: new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          total: Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1)),
        }));
      setTrendSeries(dedup);
    } catch (e) {
      console.warn("Factory analysis failed:", e);
      setError("Analysis failed unexpectedly. Check the backend logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedFacility?.id) {
      runAnalysis(selectedFacility.id, periodStart, periodEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility?.id]);

  const contribution = report?.contribution;
  const recommendation = report?.recommendation;
  const topRec = recommendation?.top_recommendation;
  const sources = contribution?.sources || [];
  const totalTCO2e = contribution ? contribution.total_emission_kg / 1000 : 0;

  const sourceChartData = sources.map((s, i) => ({
    name: s.source_name,
    value: Number((s.emission_value / 1000).toFixed(2)),
    color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  const hotspotBarData = sources.map((s) => ({
    process: s.source_name,
    emissions: Number((s.emission_value / 1000).toFixed(2)),
    anomaly: s.rank === 1,
  }));

  const altBarData = (report?.alternative_impacts || []).map((a) => ({
    name: a.alternative_name.length > 18 ? a.alternative_name.slice(0, 18) + "…" : a.alternative_name,
    emissions: a.reduction_pct_of_total,
  }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <DemoDisclaimer />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #d8ded8", borderRadius: 8, padding: "4px 10px" }}>
            <Calendar size={13} color="#667066" />
            <label style={{ fontSize: 10, color: "#667066" }}>
              From
              <input
                type="date"
                value={periodStart}
                max={periodEnd}
                onChange={(e) => setPeriodStart(e.target.value)}
                style={{ border: "none", fontSize: 11, marginLeft: 5, background: "transparent", color: "#141f18" }}
              />
            </label>
            <span style={{ color: "#c3c9c3" }}>–</span>
            <label style={{ fontSize: 10, color: "#667066" }}>
              To
              <input
                type="date"
                value={periodEnd}
                min={periodStart}
                onChange={(e) => setPeriodEnd(e.target.value)}
                style={{ border: "none", fontSize: 11, marginLeft: 5, background: "transparent", color: "#141f18" }}
              />
            </label>
          </div>
          <button
            onClick={() => runAnalysis(selectedFacility?.id, periodStart, periodEnd)}
            disabled={loading || !selectedFacility}
            className="primary-button small"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={13} className="spin" /> : <PlayCircle size={13} />}
            {loading ? "Analyzing…" : "Run analysis"}
          </button>
          {report && !loading && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5e9", border: "1px solid #a5d6a7",
              color: "#1b5e20", borderRadius: 14, padding: "4px 12px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2e7d32", display: "inline-block" }}></span>
              Supabase-backed analysis
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div>
          <div className="eyebrow">FACILITY INTELLIGENCE</div>
          <h1>Your carbon position at a glance.</h1>
          <p>
            Running the real emission-calculation and ML-attribution pipeline against ingested
            measurements for {selectedFacility?.name || "your factory"}
            {selectedFacility?.location ? ` (${selectedFacility.location})` : ""}.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/data-intake" className="secondary-button">
            <Database size={15} />
            Add data
          </Link>
          <Link href="/recommendations" className="primary-button">
            <Sparkles size={15} />
            View recommendations
          </Link>
        </div>
      </section>

      {loading && (
        <Panel>
          <div style={{ padding: "40px 21px", textAlign: "center", color: "#667066" }}>
            <Loader2 size={22} className="spin" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Running the 10-stage analysis pipeline for {selectedFacility?.name}…
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#8a968a" }}>
              Calculating emissions, source contribution, ML attribution (SHAP), and MCDA-ranked
              alternatives from real Supabase measurements. First run can take up to a minute.
            </div>
          </div>
        </Panel>
      )}

      {!loading && error && (
        <Panel>
          <div style={{ padding: "24px 21px", display: "flex", alignItems: "flex-start", gap: 10, color: "#8a5a3a" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Analysis incomplete</div>
              <div style={{ fontSize: 12 }}>{error}</div>
            </div>
          </div>
        </Panel>
      )}

      {!loading && report && contribution && (
        <>
          {/* KPI Cards */}
          <section className="metrics-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <MetricCard
              label="Total Emissions Analyzed"
              value={totalTCO2e.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              unit="tCO₂e"
              change=""
              direction="down"
              icon={Waves}
              note={`${periodStart} → ${periodEnd}`}
            />
            <MetricCard
              label="Emission Hotspot"
              value={contribution.hotspot_source_name || "—"}
              unit=""
              change={`${contribution.hotspot_contribution_pct}%`}
              direction="down"
              icon={Gauge}
              note="Of total analyzed emissions"
            />
            <MetricCard
              label="Records Analyzed"
              value={report.emission_records_count}
              unit="records"
              change=""
              direction="up"
              icon={Layers}
              note={`${report.feature_matrix_rows || 0} daily feature rows`}
            />
            <MetricCard
              label="Top Recommendation"
              value={topRec ? `${topRec.reduction_pct_of_total}%` : "—"}
              unit={topRec ? "reduction" : ""}
              change=""
              direction="up"
              icon={Target}
              note={topRec?.name || "No recommendation yet"}
            />
          </section>

          {/* Charts Row */}
          <section className="analytics-grid">
            <Panel>
              <SectionHeader
                eyebrow="EMISSION INTENSITY"
                title="Daily CO₂ intensity trend"
                action={`${trendSeries.length} days`}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#7c857d", fontSize: 9, padding: "10px 21px 0" }}>
                <span style={{ width: 18, height: 2, background: "var(--green)", display: "inline-block" }} />
                <span>kg CO₂e / tonne produced</span>
              </div>
              <div className="large-chart">
                {trendSeries.length > 0 ? (
                  <EmissionsTrendChart data={trendSeries} seriesName="kg CO₂e / tonne" />
                ) : (
                  <div style={{ padding: "30px 21px", color: "#8a968a", fontSize: 12 }}>
                    No emission-intensity feature series available for this period.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="SOURCE BREAKDOWN" title="Where emissions come from" />
              <ScopeDonutChart data={sourceChartData} centerValue={totalTCO2e.toFixed(1)} centerLabel="tCO₂e" />
              <div className="mix-list">
                {sourceChartData.map((item) => (
                  <div className="mix-row" key={item.name}>
                    <span className="mix-indicator" style={{ background: item.color }} />
                    <span style={{ fontSize: 10 }}>{item.name}</span>
                    <strong style={{ fontSize: 10 }}>{((item.value / (totalTCO2e || 1)) * 100).toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          {/* Sources ranked + Alternatives */}
          <section className="two-column">
            <Panel>
              <SectionHeader eyebrow="INTELLIGENCE" title="Emission sources ranked" />
              <div style={{ height: 200, padding: "12px 16px 16px" }}>
                <HotspotBarChart data={hotspotBarData} />
              </div>
              <div className="table-head" style={{ gridTemplateColumns: "minmax(160px,1.5fr) 0.7fr 0.6fr" }}>
                <span>Source</span>
                <span>tCO₂e</span>
                <span>Contribution</span>
              </div>
              {sources.map((s) => (
                <div key={s.source_id} className="table-row" style={{ gridTemplateColumns: "minmax(160px,1.5fr) 0.7fr 0.6fr", display: "grid" }}>
                  <div className="source-cell">
                    <div className="source-icon">
                      <Zap size={14} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 10 }}>{s.source_name}</strong>
                      <span style={{ color: "#929a92", fontSize: 8 }}>{s.source_category}</span>
                    </div>
                  </div>
                  <strong style={{ fontSize: 10 }}>{(s.emission_value / 1000).toFixed(2)}</strong>
                  <span style={{ fontSize: 10 }}>{s.contribution_pct}%</span>
                </div>
              ))}
            </Panel>

            <Panel>
              <SectionHeader eyebrow="ALTERNATIVES" title="MCDA-ranked reduction options" />
              <div style={{ height: 160, padding: "12px 16px 0" }}>
                {altBarData.length > 0 ? (
                  <FacilityBarChart data={altBarData} seriesName="% reduction of total" />
                ) : (
                  <div style={{ color: "#8a968a", fontSize: 12, padding: 12 }}>No alternatives evaluated.</div>
                )}
              </div>
              {topRec && (
                <div style={{ padding: "16px 21px" }}>
                  <div className="recommendation-heading" style={{ padding: 0, marginBottom: 14 }}>
                    <div>
                      <div className="eyebrow">CARBONX INTELLIGENCE</div>
                      <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 14, margin: "5px 0 0" }}>Top recommendation</h2>
                    </div>
                    <div className="spark-icon"><Sparkles size={16} /></div>
                  </div>
                  <div className="recommendation-main">
                    <div className="recommendation-tag">MCDA SCORE {topRec.mcda_score}</div>
                    <h3 style={{ fontFamily: "Manrope,sans-serif", fontSize: 16, margin: "7px 0 5px" }}>{topRec.name}</h3>
                    <p style={{ color: "#727a72", fontSize: 10, lineHeight: 1.65, margin: 0 }}>
                      {topRec.reasoning}
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 8, color: "#969e96" }}>Capex · Payback</span>
                      <strong style={{ fontSize: 11 }}>{topRec.capex_range} · {topRec.payback_years}y</strong>
                    </div>
                    <Link href="/pathways" className="primary-button small">Compare pathways</Link>
                  </div>
                </div>
              )}
            </Panel>
          </section>

          {/* Metrics tracked + Operational patterns */}
          <section className="two-column lower-grid">
            <Panel>
              <SectionHeader eyebrow="FACTORY" title="Metrics tracked" />
              <div style={{ padding: "16px 21px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(report.available_metrics || []).map((m) => (
                  <span key={m} className="source-tag">{m}</span>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="ROOT CAUSE" title="Observed operational patterns" />
              <div className="activity-list">
                {(report.root_cause?.patterns || []).map((p, i) => (
                  <div className="activity-row" key={p.feature + i}>
                    <div className="activity-icon">
                      {p.direction === "increased" ? <Activity size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <div className="activity-copy">
                      <strong>{p.feature}</strong>
                      <span>{p.interpretation}</span>
                    </div>
                  </div>
                ))}
                {(!report.root_cause?.patterns || report.root_cause.patterns.length === 0) && (
                  <div style={{ padding: "8px 0", color: "#8a968a", fontSize: 12 }}>No patterns detected.</div>
                )}
              </div>
            </Panel>
          </section>

          {/* Data & Model Quality Strip */}
          <section className="verification-strip">
            <div className="verification-icon"><CheckCircle2 size={20} /></div>
            <div className="verification-copy">
              <strong>Data &amp; model quality</strong>
              <span>
                {report.emission_records_count} emission records ·{" "}
                {report.ml_attribution
                  ? `RF model R² ${report.ml_attribution.training_metrics?.r2}`
                  : "ML attribution unavailable"}
                . {report.warnings?.[0] || "All emission factors are demonstration assumptions — not site-validated."}
              </span>
            </div>
            <div className="verification-number">
              <strong>{report.ml_attribution?.n_samples ?? report.feature_matrix_rows ?? 0}</strong>
              <span>samples used</span>
            </div>
            <Link href="/emission-factors" className="secondary-button">View factors</Link>
          </section>
        </>
      )}

      <footer className="footer">
        <span>CarbonX · Detect. Optimize. Exchange. Verify.</span>
        <span>{selectedFacility?.name || "—"} · {periodStart} to {periodEnd}</span>
      </footer>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Target,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Settings,
  ShieldAlert,
  ArrowDownRight,
  Sparkles,
  Info
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const TRAJECTORY_DATA = [
  { year: "2023 (Base)", actual: 18420, target: 18420, bau: 18420 },
  { year: "2024", actual: 16100, target: 17100, bau: 19200 },
  { year: "2025 (Current)", actual: 13950, target: 15780, bau: 20100 },
  { year: "2026", actual: null, target: 14460, bau: 21000 },
  { year: "2027", actual: null, target: 13150, bau: 21950 },
  { year: "2028", actual: null, target: 11840, bau: 22900 },
  { year: "2029", actual: null, target: 10525, bau: 23900 },
  { year: "2030", actual: null, target: 9210, bau: 25000 },
];

const FACILITY_TARGETS = [
  {
    id: "GIF-001",
    name: "Gujarat Industrial Facility",
    sector: "Agro-processing",
    baseEmissions: 10500,
    currentEmissions: 8426,
    target2030: 5250,
    reduction: -19.7,
    status: "on-track",
    budgetShare: "57%",
  },
  {
    id: "PCP-003",
    name: "Pune Chemical Park",
    sector: "Specialty Chemicals",
    baseEmissions: 7200,
    currentEmissions: 6180,
    target2030: 3600,
    reduction: -14.1,
    status: "requires-review",
    budgetShare: "39%",
  },
  {
    id: "MBP-002",
    name: "Mumbai Bioprocessing Plant",
    sector: "Biotechnology",
    baseEmissions: 4100,
    currentEmissions: 3210,
    target2030: 2050,
    reduction: -21.7,
    status: "on-track",
    budgetShare: "22%",
  },
];

export default function CarbonBaselinePage() {
  const [targetPace, setTargetPace] = useState("1.5c");

  return (
    <>
      <DemoDisclaimer compact />
      <PageHeader
        eyebrow="MEASURE"
        title="Carbon Baseline & Science-Based Targets"
        subtitle="Establish organizational GHG base years, budget allocations across assets, and track progress against SBTi 1.5°C reduction corridors."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/simulator" className="secondary-button">
              <Sliders size={14} />
              Simulate Pathways
            </Link>
            <button className="primary-button">
              <Settings size={14} />
              Recalculate Policy
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Base Year Footprint (FY23)"
          value="18,420"
          unit="tCO₂e"
          trend="neutral"
          change="Audited & locked"
          icon={Calendar}
        />
        <MetricCard
          label="2030 Interim Target"
          value="9,210"
          unit="tCO₂e"
          trend="down"
          change="-50.0% net cut"
          icon={Target}
        />
        <MetricCard
          label="Achieved Reduction"
          value="-24.2"
          unit="%"
          trend="down"
          change="-4,470 tCO₂e vs base"
          icon={TrendingDown}
        />
        <MetricCard
          label="Corridor Alignment"
          value="1.5°C"
          unit="SBTi"
          trend="up"
          change="Ahead of pace by 1,830 t"
          icon={CheckCircle2}
        />
      </div>

      {/* Trajectory Chart Panel */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="panel-title">Decarbonization Trajectory vs Baseline Corridors</div>
            <div className="panel-subtitle">Comparing Actual Emissions against SBTi 1.5°C Glide Path and Business-As-Usual (BAU)</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setTargetPace("1.5c")}
              className={`filter-pill ${targetPace === "1.5c" ? "active" : ""}`}
            >
              SBTi 1.5°C (-4.2%/yr)
            </button>
            <button
              onClick={() => setTargetPace("well2c")}
              className={`filter-pill ${targetPace === "well2c" ? "active" : ""}`}
            >
              Well Below 2°C (-2.5%/yr)
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 20px 24px" }}>
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={TRAJECTORY_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#355c45" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#355c45" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebefec" vertical={false} />
              <XAxis dataKey="year" stroke="#8a968a" fontSize={12} tickLine={false} />
              <YAxis stroke="#8a968a" fontSize={12} tickLine={false} unit=" t" />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #d8ded8",
                  borderRadius: 6,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Incurred (tCO₂e)"
                stroke="#355c45"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#actualGrad)"
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target Glide Path (tCO₂e)"
                stroke="#2a7a58"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: "#2a7a58" }}
              />
              <Line
                type="monotone"
                dataKey="bau"
                name="BAU Counterfactual (tCO₂e)"
                stroke="#c45353"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Facility Budget Allocation Table */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title">Facility-Level Carbon Budgets & Glide Paths</div>
          <div className="panel-subtitle">Annual emissions caps and 2030 targets distributed across industrial assets</div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Sector</th>
              <th>Base Year (FY23)</th>
              <th>Current (FY25 Run-rate)</th>
              <th>Progress vs Base</th>
              <th>2030 Cap</th>
              <th>Budget Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {FACILITY_TARGETS.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/facilities/${f.id}`} style={{ fontWeight: 600, color: "#355c45" }}>
                    {f.name}
                  </Link>
                  <div style={{ fontSize: 11, color: "#667066" }}>ID: {f.id}</div>
                </td>
                <td>{f.sector}</td>
                <td>{f.baseEmissions.toLocaleString()} tCO₂e</td>
                <td style={{ fontWeight: 600 }}>{f.currentEmissions.toLocaleString()} tCO₂e</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowDownRight size={14} color="#2e7d32" />
                    <span style={{ fontWeight: 600, color: "#2e7d32" }}>{Math.abs(f.reduction)}%</span>
                  </div>
                  <ScoreBar score={Math.round((f.currentEmissions / f.baseEmissions) * 100)} max={100} color="#355c45" />
                </td>
                <td>{f.target2030.toLocaleString()} tCO₂e</td>
                <td>
                  <StatusBadge status={f.status} />
                </td>
                <td>
                  <Link
                    href={`/facilities/${f.id}?tab=hotspots`}
                    className="secondary-button"
                    style={{ padding: "4px 8px", fontSize: 11 }}
                  >
                    Drill-down
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recalculation Rules Banner */}
      <div
        style={{
          border: "1px solid #d8ded8",
          borderRadius: 8,
          padding: "16px 20px",
          background: "#f9faf9",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <Info size={20} color="#355c45" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "#475247", lineHeight: 1.5 }}>
          <strong style={{ color: "#141f18" }}>Base Year Recalculation Policy:</strong> In accordance with the GHG Protocol Corporate Standard, base year figures will be recalculated in case of structural changes (mergers, acquisitions, divestitures), significant changes in calculation methodologies (e.g. updated emission factor sets), or cumulative errors resulting in a &gt; 5% variation on base year footprint.
        </div>
      </div>
    </>
  );
}

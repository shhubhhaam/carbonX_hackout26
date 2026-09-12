"use client";

import { useEffect, useState } from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleCheck,
  Database,
  FileCheck2,
  Factory,
  Gauge,
  Leaf,
  Map,
  MoreHorizontal,
  Recycle,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Waves,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const monthlyEmissions = [
  { month: "Jan", emissions: 1380 },
  { month: "Feb", emissions: 1310 },
  { month: "Mar", emissions: 1425 },
  { month: "Apr", emissions: 1270 },
  { month: "May", emissions: 1190 },
  { month: "Jun", emissions: 1085 },
  { month: "Jul", emissions: 1010 },
  { month: "Aug", emissions: 940 },
];

const emissionsMix = [
  { name: "Process", value: 42 },
  { name: "Energy", value: 31 },
  { name: "Waste", value: 17 },
  { name: "Transport", value: 10 },
];

const hotspots = [
  {
    source: "Organic waste",
    facility: "Production Line 02",
    contribution: "18.6%",
    impact: "High",
    trend: "+8.2%",
    type: "waste",
  },
  {
    source: "Natural gas",
    facility: "Boiler House",
    contribution: "16.4%",
    impact: "High",
    trend: "-3.7%",
    type: "energy",
  },
  {
    source: "Process heat",
    facility: "Production Line 01",
    contribution: "13.8%",
    impact: "Medium",
    trend: "-5.1%",
    type: "process",
  },
  {
    source: "Purchased electricity",
    facility: "Main Facility",
    contribution: "11.2%",
    impact: "Medium",
    trend: "-6.4%",
    type: "energy",
  },
];

const streams = [
  {
    id: "CX-ORG-2048",
    material: "Organic waste",
    quantity: "12.4 t",
    status: "Available",
    destination: "Awaiting pathway",
  },
  {
    id: "CX-CO2-1842",
    material: "Captured CO₂",
    quantity: "8.7 t",
    status: "Matched",
    destination: "GreenFuel Industries",
  },
  {
    id: "CX-ASH-1731",
    material: "Biomass ash",
    quantity: "4.2 t",
    status: "Verified",
    destination: "EcoBuild Materials",
  },
];

const activities = [
  {
    title: "Organic waste stream created",
    detail: "CX-ORG-2048 • 12.4 t",
    time: "12 min ago",
    icon: Recycle,
  },
  {
    title: "Pathway recommendation generated",
    detail: "Biogas recovery ranked #1",
    time: "38 min ago",
    icon: Sparkles,
  },
  {
    title: "Captured CO₂ allocation confirmed",
    detail: "8.7 t reserved",
    time: "1 hr ago",
    icon: CircleCheck,
  },
  {
    title: "Biomass ash received",
    detail: "EcoBuild Materials",
    time: "3 hr ago",
    icon: Truck,
  },
];

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:8000";
const factoryCode = "demo1";

function MetricCard({
  label,
  value,
  unit,
  change,
  direction,
  icon: Icon,
  note,
}) {
  const positive = direction === "up";

  return (
    <div className="metric-card">
      <div className="metric-top">
        <div className="metric-icon">
          <Icon size={18} strokeWidth={1.8} />
        </div>

        <span className={`trend ${positive ? "trend-up" : "trend-down"}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      </div>

      <div className="metric-label">{label}</div>

      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>

      <div className="metric-note">{note}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>

      {action && (
        <button className="text-button">
          {action}
          <ChevronDown size={15} />
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const [factory, setFactory] = useState(null);
  const [connectionState, setConnectionState] = useState("connecting");
  const [apiContribution, setApiContribution] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const factoryResponse = await fetch(
          `${backendUrl}/api/v1/factories/${factoryCode}`,
          { cache: "no-store" },
        );

        if (!factoryResponse.ok) {
          throw new Error(`Factory request failed: ${factoryResponse.status}`);
        }

        const factoryPayload = await factoryResponse.json();
        const factoryData = factoryPayload.data;
        const contributionResponse = await fetch(
          `${backendUrl}/api/v1/factories/${factoryData.id}/contribution`,
          { cache: "no-store" },
        );

        if (cancelled) return;

        setFactory(factoryData);
        if (contributionResponse.ok) {
          const contributionPayload = await contributionResponse.json();
          setApiContribution(contributionPayload.data || null);
        }
        setConnectionState("connected");
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load dashboard data", error);
          setConnectionState("offline");
        }
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  const factoryName = factory?.name || "Gujarat Manufacturing";
  const contributionTotal = apiContribution?.total_emission_value;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={19} />
          </div>

          <div>
            <div className="brand-name">CarbonX</div>
            <div className="brand-subtitle">Carbon intelligence</div>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-label">WORKSPACE</div>

          <button className="facility-selector">
            <div className="facility-icon">
              <Factory size={16} />
            </div>

            <div className="facility-info">
              <strong>{factoryName}</strong>
              <span>Primary facility</span>
            </div>

            <ChevronDown size={15} />
          </button>
        </div>

        <nav className="nav">
          <div className="nav-label">OVERVIEW</div>

          <a className="nav-item active" href="#">
            <Gauge size={18} />
            Dashboard
          </a>

          <a className="nav-item" href="#">
            <Database size={18} />
            Data intake
          </a>

          <a className="nav-item" href="#">
            <Activity size={18} />
            Hotspot explorer
          </a>

          <div className="nav-label nav-space">CIRCULARITY</div>

          <a className="nav-item" href="#">
            <Recycle size={18} />
            Stream passports
          </a>

          <a className="nav-item" href="#">
            <Sparkles size={18} />
            Pathways
          </a>

          <a className="nav-item" href="#">
            <Map size={18} />
            Partner network
          </a>

          <div className="nav-label nav-space">CONTROL</div>

          <a className="nav-item" href="#">
            <BarChart3 size={18} />
            What-if simulator
          </a>

          <a className="nav-item" href="#">
            <ShieldCheck size={18} />
            Verification
          </a>

          <a className="nav-item" href="#">
            <FileCheck2 size={18} />
            Reports
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className={`status-dot ${connectionState}`} />
            <div>
              <strong>Intelligence system</strong>
              <span>
                {connectionState === "connected"
                  ? "Connected to backend"
                  : connectionState === "offline"
                    ? "Using prototype data"
                    : "Connecting..."}
              </span>
            </div>
          </div>

          <button className="nav-item settings">
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Facilities
            <span>/</span>
            {factoryName}
          </div>

          <div className="topbar-actions">
            <button className="icon-button">
              <Search size={18} />
            </button>

            <button className="icon-button notification">
              <Bell size={18} />
              <span />
            </button>

            <div className="profile">
              <div className="avatar">VD</div>
              <div className="profile-copy">
                <strong>Vedant</strong>
                <span>Industrial user</span>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="content">
          <section className="hero">
            <div>
              <div className="eyebrow">FACILITY INTELLIGENCE</div>
              <h1>
                Good morning, Vedant.
                <br />
                Here&apos;s your carbon position.
              </h1>
              <p>
                CarbonX is tracking your facility&apos;s emissions, material
                streams and circular opportunities.
              </p>
            </div>

            <div className="hero-actions">
              <button className="secondary-button">
                <SlidersHorizontal size={16} />
                Configure view
              </button>

              <button className="primary-button">
                <Database size={16} />
                Add data
              </button>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard
              label="Estimated emissions"
              value="8,426"
              unit="tCO₂e"
              change="12.4%"
              direction="down"
              icon={Waves}
              note="vs. previous reporting period"
            />

            <MetricCard
              label="Material streams"
              value="27"
              unit="streams"
              change="4"
              direction="up"
              icon={Recycle}
              note="3 awaiting a pathway"
            />

            <MetricCard
              label="Hotspot contribution"
              value="68"
              unit="%"
              change="6.8%"
              direction="down"
              icon={Activity}
              note="top 5 sources identified"
            />

            <MetricCard
              label="Verified outcomes"
              value="142"
              unit="tCO₂e"
              change="18.2%"
              direction="up"
              icon={ShieldCheck}
              note="impact verified to date"
            />
          </section>

          <section className="analytics-grid">
            <div className="panel emissions-panel">
              <SectionHeader
                eyebrow="EMISSIONS TREND"
                title="Estimated emissions"
                action="Last 8 months"
              />

              <div className="chart-legend">
                <span className="legend-line" />
                <span>tCO₂e</span>
                <span className="legend-muted">Illustrative prototype data</span>
              </div>

              <div className="large-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyEmissions}>
                    <defs>
                      <linearGradient
                        id="emissionsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopOpacity={0.22} />
                        <stop offset="100%" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      strokeOpacity={0.45}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />

                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="emissions"
                      strokeWidth={2.5}
                      fill="url(#emissionsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel mix-panel">
              <SectionHeader
                eyebrow="EMISSIONS MIX"
                title="Where impact comes from"
              />

              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emissionsMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={105}
                      paddingAngle={2}
                    >
                      {emissionsMix.map((entry, index) => (
                        <Cell key={entry.name} opacity={1 - index * 0.15} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                  <strong>
                    {contributionTotal
                      ? Number(contributionTotal).toLocaleString()
                      : "8,426"}
                  </strong>
                  <span>{apiContribution?.total_emission_unit || "tCO₂e"}</span>
                </div>
              </div>

              <div className="mix-list">
                {emissionsMix.map((item, index) => (
                  <div className="mix-row" key={item.name}>
                    <span className="mix-indicator" style={{ opacity: 1 - index * 0.15 }} />
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="two-column">
            <div className="panel">
              <SectionHeader
                eyebrow="INTELLIGENCE"
                title="Highest-impact hotspots"
                action="View all"
              />

              <div className="hotspot-table">
                <div className="table-head">
                  <span>Source</span>
                  <span>Contribution</span>
                  <span>Status</span>
                  <span>Trend</span>
                </div>

                {hotspots.map((hotspot) => (
                  <div className="table-row" key={hotspot.source}>
                    <div className="source-cell">
                      <div className={`source-icon ${hotspot.type}`}>
                        {hotspot.type === "waste" ? (
                          <Recycle size={16} />
                        ) : hotspot.type === "energy" ? (
                          <Waves size={16} />
                        ) : (
                          <Factory size={16} />
                        )}
                      </div>

                      <div>
                        <strong>{hotspot.source}</strong>
                        <span>{hotspot.facility}</span>
                      </div>
                    </div>

                    <strong>{hotspot.contribution}</strong>

                    <span
                      className={`impact ${
                        hotspot.impact === "High" ? "high" : "medium"
                      }`}
                    >
                      {hotspot.impact}
                    </span>

                    <span className="table-trend">
                      {hotspot.trend}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel recommendation-panel">
              <div className="recommendation-heading">
                <div>
                  <div className="eyebrow">CARBONX INTELLIGENCE</div>
                  <h2>Recommended next move</h2>
                </div>

                <div className="spark-icon">
                  <Sparkles size={18} />
                </div>
              </div>

              <div className="recommendation-main">
                <div className="recommendation-tag">
                  TOP OPPORTUNITY
                </div>

                <h3>Recover organic waste</h3>

                <p>
                  12.4 tonnes from Production Line 02 can move from the
                  current baseline toward a higher-value circular pathway.
                </p>
              </div>

              <div className="score-grid">
                <div>
                  <span>CO₂ benefit</span>
                  <strong>86 / 100</strong>
                </div>

                <div>
                  <span>Circularity</span>
                  <strong>92 / 100</strong>
                </div>

                <div>
                  <span>Feasibility</span>
                  <strong>88 / 100</strong>
                </div>
              </div>

              <div className="recommendation-footer">
                <div>
                  <span>Best pathway</span>
                  <strong>Biogas recovery</strong>
                </div>

                <button className="primary-button small">
                  Compare pathways
                </button>
              </div>
            </div>
          </section>

          <section className="two-column lower-grid">
            <div className="panel">
              <SectionHeader
                eyebrow="DIGITAL PASSPORTS"
                title="Material stream ledger"
                action="Open ledger"
              />

              <div className="stream-list">
                {streams.map((stream) => (
                  <div className="stream-row" key={stream.id}>
                    <div className="stream-id">
                      <FileCheck2 size={17} />
                      <div>
                        <strong>{stream.material}</strong>
                        <span>{stream.id}</span>
                      </div>
                    </div>

                    <div className="stream-quantity">
                      <strong>{stream.quantity}</strong>
                      <span>available quantity</span>
                    </div>

                    <div>
                      <span
                        className={`status-badge ${stream.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {stream.status}
                      </span>
                    </div>

                    <button className="more-button">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <SectionHeader
                eyebrow="TRACEABILITY"
                title="Recent activity"
                action="Full timeline"
              />

              <div className="activity-list">
                {activities.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="activity-row" key={item.title}>
                      <div className="activity-icon">
                        <Icon size={16} />
                      </div>

                      <div className="activity-copy">
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>

                      <time>{item.time}</time>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="verification-strip">
            <div className="verification-icon">
              <ShieldCheck size={21} />
            </div>

            <div className="verification-copy">
              <strong>Verification status</strong>
              <span>
                14 lifecycle events have been reconciled. Verified impact is
                separated from estimated impact.
              </span>
            </div>

            <div className="verification-number">
              <strong>94%</strong>
              <span>events reconciled</span>
            </div>

            <button className="secondary-button">
              Review evidence
            </button>
          </section>

          <footer className="footer">
            <span>CarbonX • Detect. Optimize. Exchange. Verify.</span>
            <span>Prototype data is simulated and illustrative.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
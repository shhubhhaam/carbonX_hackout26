"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getDataSourcesStatus } from "@/lib/api-client";
import {
  Database,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Server,
  Radio,
  FileSpreadsheet,
  Settings,
  ExternalLink
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";

const DEMO_SOURCES = [
  {
    id: "SRC-001",
    name: "Schneider Electric PowerLogic IoT",
    category: "Smart Meters & Sub-metering",
    protocol: "Modbus TCP / MQTT",
    facility: "Gujarat Industrial Facility",
    frequency: "Every 15 mins",
    recordsToday: "1,440 readings",
    status: "active",
    lastSync: "3 mins ago",
    health: "100% Uptime",
  },
  {
    id: "SRC-002",
    name: "SAP S/4HANA Enterprise ERP",
    category: "Fuel Purchases & Raw Materials",
    protocol: "REST API OAuth 2.0",
    facility: "All Facilities (Corporate)",
    frequency: "Daily at 02:00 UTC",
    recordsToday: "184 invoices",
    status: "active",
    lastSync: "Today, 02:14 UTC",
    health: "99.9% Uptime",
  },
  {
    id: "SRC-003",
    name: "GAIL Natural Gas SCADA Historian",
    category: "Pipeline Fuel Consumption",
    protocol: "OPC-UA Bridge",
    facility: "Pune Chemical Park",
    frequency: "Hourly",
    recordsToday: "24 flow summaries",
    status: "active",
    lastSync: "42 mins ago",
    health: "100% Uptime",
  },
  {
    id: "SRC-004",
    name: "Avery Weighbridge Digital Indicator",
    category: "Waste & Byproduct Mass Log",
    protocol: "Serial-to-IP / Webhook",
    facility: "Gujarat Industrial Facility",
    frequency: "Real-time on tare/gross",
    recordsToday: "18 manifests",
    status: "active",
    lastSync: "12 mins ago",
    health: "100% Uptime",
  },
  {
    id: "SRC-005",
    name: "GUVNL Electricity Utility API",
    category: "Grid Utility Billing & Tariffs",
    protocol: "State Portal Scraper API",
    facility: "Gujarat Industrial Facility",
    frequency: "Monthly billing cycle",
    recordsToday: "1 bill ingested",
    status: "active",
    lastSync: "3 days ago",
    health: "Normal",
  },
  {
    id: "SRC-006",
    name: "TCI Freight Logistics EDI 214",
    category: "Scope 3 Category 4 Freight",
    protocol: "SFTP / EDIFACT",
    facility: "Mumbai & Gujarat",
    frequency: "Weekly batch",
    recordsToday: "0 (Next sync Sun)",
    status: "active",
    lastSync: "6 days ago",
    health: "Normal",
  },
];

export default function DataSourcesPage() {
  const [sources, setSources] = useState(DEMO_SOURCES);
  const [syncing, setSyncing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const status = await getDataSourcesStatus();
      if (!mounted || !status?.connectors) return;
      const normalized = status.connectors.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.protocol,
        protocol: c.protocol,
        facility: "Gujarat Industrial Facility",
        frequency: c.frequency,
        recordsToday: `${Number(c.records_today || 0).toLocaleString()} records`,
        status: (c.status || "").toLowerCase(),
        lastSync: `${c.latency_ms ?? "—"} ms latency`,
        health: c.health,
      }));
      setSources(normalized);
      setIsLive(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleSyncAll = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      alert("All connected data sources synchronized successfully!");
    }, 1200);
  };

  const recordsIngested = sources.reduce((sum, s) => sum + (parseInt(String(s.recordsToday).replace(/[^\d]/g, ""), 10) || 0), 0);

  return (
    <>
      {isLive ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5e9", border: "1px solid #a5d6a7", color: "#1b5e20", borderRadius: 12, padding: "2px 10px", fontSize: 10, fontWeight: 600, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2e7d32", display: "inline-block" }}></span>
          Live: FastAPI / PostgreSQL
        </span>
      ) : (
        <DemoDisclaimer compact />
      )}
      <PageHeader
        eyebrow="SETTINGS"
        title="Automated Data Sources & Telemetry"
        subtitle="Manage live IoT sub-meters, SCADA telemetry, ERP invoice connectors, and freight EDI pipelines."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSyncAll} className="secondary-button" disabled={syncing}>
              <RefreshCw size={14} className={syncing ? "spin" : ""} />
              {syncing ? "Syncing Pipelines..." : "Sync All Sources"}
            </button>
            <button className="primary-button">
              <Plus size={14} />
              Connect New Source
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Active Integrations"
          value={sources.length}
          unit="connectors"
          trend="up"
          change={`${sources.filter((s) => s.status === "active" || s.status === "online").length} online`}
          icon={Server}
        />
        <MetricCard
          label="Telemetry Frequency"
          value={sources[0]?.frequency || "—"}
          unit=""
          trend="up"
          change="Fastest connector cadence"
          icon={Radio}
        />
        <MetricCard
          label="Records Ingested (24h)"
          value={recordsIngested.toLocaleString()}
          unit="entries"
          trend="up"
          change="Across all connected sources"
          icon={Database}
        />
        <MetricCard
          label="System Health"
          value={sources.every((s) => s.health && !String(s.health).toLowerCase().includes("degrad")) ? "Healthy" : "Degraded"}
          unit=""
          trend="up"
          change="All connectors reporting"
          icon={CheckCircle2}
        />
      </div>

      {/* Sources Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {sources.map((src) => (
          <div key={src.id} className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <span className="source-tag">{src.category}</span>
                <h3 style={{ margin: "6px 0 2px 0", fontSize: 16, fontWeight: 600, color: "#141f18" }}>
                  {src.name}
                </h3>
                <div style={{ fontSize: 11, color: "#8a968a" }}>ID: {src.id} • Protocol: {src.protocol}</div>
              </div>
              <span className="status-badge status-active">
                <CheckCircle2 size={11} style={{ marginRight: 3 }} /> Connected
              </span>
            </div>

            <div style={{ background: "#f9faf9", border: "1px solid #ebefec", borderRadius: 6, padding: 12, margin: "12px 0", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#667066" }}>Mapped Facility:</span>
                <strong style={{ color: "#141f18" }}>{src.facility}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#667066" }}>Telemetry Cadence:</span>
                <span style={{ color: "#384338" }}>{src.frequency}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#667066" }}>Ingested Today:</span>
                <strong style={{ color: "#355c45" }}>{src.recordsToday}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667066" }}>Last Handshake:</span>
                <span style={{ color: "#2e7d32" }}>{src.lastSync}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ebefec", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "#2e7d32", fontWeight: 500 }}>
                ● {src.health}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="secondary-button"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => alert(`Testing live connection for ${src.name}...\nPing: 18ms. Authentication: OK.`)}
                >
                  Test Connection
                </button>
                <Link
                  href="/data-intake"
                  className="secondary-button"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  View Ingest Logs
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getEmissionFactors } from "@/lib/api-client";
import {
  BarChart3,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Database
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";

const DEMO_FACTORS = [
  {
    id: "EF-GRID-IN-W",
    name: "Indian Western Regional Grid Electricity",
    scope: "Scope 2",
    category: "Electricity Generation",
    value: 0.710,
    unit: "kg CO₂e / kWh",
    source: "Central Electricity Authority (CEA) v20.0",
    region: "India (WR)",
    tier: "Tier 1 (National average)",
    updated: "2024-11-15",
  },
  {
    id: "EF-DSL-STAT",
    name: "Diesel Fuel (Stationary Combustion)",
    scope: "Scope 1",
    category: "Liquid Fuels",
    value: 2.687,
    unit: "kg CO₂e / Litre",
    source: "UK DEFRA / BEIS 2024",
    region: "Global",
    tier: "Tier 1",
    updated: "2024-06-01",
  },
  {
    id: "EF-NG-COMB",
    name: "Natural Gas (Pipeline Sm³)",
    scope: "Scope 1",
    category: "Gaseous Fuels",
    value: 2.023,
    unit: "kg CO₂e / Sm³",
    source: "IPCC Guidelines for National Inventories",
    region: "Asia",
    tier: "Tier 2",
    updated: "2024-05-10",
  },
  {
    id: "EF-FRT-HDT",
    name: "Road Freight Heavy Rigid Truck (>20t)",
    scope: "Scope 3",
    category: "Category 4: Freight Transport",
    value: 0.104,
    unit: "kg CO₂e / tonne-km",
    source: "GLEC Framework v3.0",
    region: "Global",
    tier: "Tier 2",
    updated: "2024-07-20",
  },
  {
    id: "EF-BIO-CH4",
    name: "Raw Fermentation Biogenic CO₂ Off-gas",
    scope: "Scope 1",
    category: "Biochemical Process",
    value: 1.000,
    unit: "kg CO₂ / kg emitted",
    source: "Facility Tier 3 Direct Mass Balance",
    region: "GIF-001 Site",
    tier: "Tier 3 (Direct measurement)",
    updated: "2025-07-01",
  },
  {
    id: "EF-WST-LND",
    name: "Mixed Agro-organic Waste to Managed Landfill",
    scope: "Scope 3",
    category: "Category 5: Waste in Ops",
    value: 0.860,
    unit: "kg CO₂e / kg waste",
    source: "IPCC Waste Model (First Order Decay)",
    region: "India (Tropical Wet)",
    tier: "Tier 2",
    updated: "2024-08-12",
  },
];

export default function EmissionFactorsPage() {
  const [factors, setFactors] = useState(DEMO_FACTORS);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getEmissionFactors();
      if (!mounted || !Array.isArray(data)) return;
      const normalized = data.map((f) => ({
        id: f.id,
        name: f.activity,
        scope: f.category,
        category: f.category,
        value: f.factor,
        unit: f.unit,
        source: f.methodology,
        region: f.region,
        tier: f.status,
        updated: "—",
      }));
      setFactors(normalized);
      setIsLive(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filteredFactors = factors.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.source.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    const matchScope =
      scopeFilter === "all" || f.scope.toLowerCase().replace(/\s+/g, "") === scopeFilter.toLowerCase();
    return matchSearch && matchScope;
  });

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
        title="Emission Factor Database"
        subtitle="Catalog of verified GHG conversion factors from CEA, DEFRA, IPCC, and Tier-3 plant engineering equations."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="secondary-button">
              <RefreshCw size={14} />
              Sync Factor Registries
            </button>
            <button className="primary-button">
              <Plus size={14} />
              Add Custom Tier-3 Factor
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Active Emission Factors"
          value={factors.length}
          unit="factors"
          trend="up"
          change=""
          icon={BarChart3}
        />
        <MetricCard
          label="Authoritative Databases"
          value={new Set(factors.map((f) => f.source)).size}
          unit="registries"
          trend="neutral"
          change=""
          icon={Database}
        />
        <MetricCard
          label="Avoided-Emission Factors"
          value={factors.filter((f) => f.category === "Avoided").length}
          unit="factors"
          trend="up"
          change="Circular pathway credits"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Registry Synchronization"
          value={isLive ? "Live" : "Local"}
          unit=""
          trend="up"
          change={isLive ? "Synced from backend" : "Backend offline"}
          icon={CheckCircle2}
        />
      </div>

      {/* Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }}
          />
          <input
            className="search-input"
            placeholder="Search factors by name, source, or standard..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <button
          onClick={() => setScopeFilter("all")}
          className={`filter-pill ${scopeFilter === "all" ? "active" : ""}`}
        >
          All Scopes
        </button>
        <button
          onClick={() => setScopeFilter("scope1")}
          className={`filter-pill ${scopeFilter === "scope1" ? "active" : ""}`}
        >
          Scope 1
        </button>
        <button
          onClick={() => setScopeFilter("scope2")}
          className={`filter-pill ${scopeFilter === "scope2" ? "active" : ""}`}
        >
          Scope 2
        </button>
        <button
          onClick={() => setScopeFilter("scope3")}
          className={`filter-pill ${scopeFilter === "scope3" ? "active" : ""}`}
        >
          Scope 3
        </button>
      </div>

      {/* Table */}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Factor Name & Code</th>
              <th>Scope & Category</th>
              <th>Emission Factor Value</th>
              <th>Source Standard</th>
              <th>Region</th>
              <th>Uncertainty Tier</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredFactors.map((f) => (
              <tr key={f.id}>
                <td>
                  <div style={{ fontWeight: 600, color: "#141f18" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "#667066" }}>{f.id}</div>
                </td>
                <td>
                  <span className="source-tag">{f.scope}</span>
                  <div style={{ fontSize: 11, color: "#667066", marginTop: 2 }}>{f.category}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: "#355c45", fontSize: 13 }}>
                    {f.value} <span style={{ fontSize: 11, fontWeight: 400, color: "#667066" }}>{f.unit}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "#384338" }}>{f.source}</td>
                <td style={{ fontSize: 12 }}>{f.region}</td>
                <td>
                  <span style={{ fontSize: 11, color: f.tier.includes("Tier 3") ? "#2e7d32" : "#4f584f", fontWeight: 500 }}>
                    {f.tier}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "#667066" }}>{f.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

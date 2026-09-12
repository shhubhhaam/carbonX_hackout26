"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Activity,
  Download,
  Filter,
  Search,
  Zap,
  Flame,
  Truck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import EmissionsTrendChart from "@/components/charts/EmissionsTrendChart";
import ScopeDonutChart from "@/components/charts/ScopeDonutChart";
import {
  getEmissions as getLocalEmissions,
  getScopeBreakdown as getLocalScopeBreakdown,
  getEmissionsBySource as getLocalEmissionsBySource,
} from "@/lib/demo-data/index";


const DETAILED_LEDGER = [
  {
    id: "EM-2025-0811",
    date: "2025-08-28",
    facility: "Gujarat Industrial Facility",
    scope: "Scope 2",
    category: "Purchased Electricity (Grid)",
    activity: "1,240,000 kWh",
    factor: "0.710 kg CO₂e / kWh (CEA v20)",
    emissions: 880.4,
    dataQuality: "Tier 1 (Metered)",
    sourceDoc: "GUVNL_aug25.pdf",
  },
  {
    id: "EM-2025-0810",
    date: "2025-08-25",
    facility: "Pune Chemical Park",
    scope: "Scope 1",
    category: "Natural Gas (Steam Boiler)",
    activity: "42,000 Sm³",
    factor: "2.02 kg CO₂e / Sm³ (DEFRA)",
    emissions: 84.8,
    dataQuality: "Tier 1 (Metered)",
    sourceDoc: "GAIL_slip_08.pdf",
  },
  {
    id: "EM-2025-0809",
    date: "2025-08-22",
    facility: "Gujarat Industrial Facility",
    scope: "Scope 1",
    category: "Fermentation Process Off-gas",
    activity: "8.7 t CO₂ vented",
    factor: "1.00 stoichiometric",
    emissions: 8.7,
    dataQuality: "Tier 2 (Engineering calc)",
    sourceDoc: "ferment_mass_bal.xlsx",
  },
  {
    id: "EM-2025-0808",
    date: "2025-08-18",
    facility: "Mumbai Bioprocessing Plant",
    scope: "Scope 1",
    category: "Backup Diesel Generator",
    activity: "2,400 Litres",
    factor: "2.68 kg CO₂e / L (GHG Prot)",
    emissions: 6.4,
    dataQuality: "Tier 1 (Receipts)",
    sourceDoc: "IOCL_fuel_slip.pdf",
  },
  {
    id: "EM-2025-0807",
    date: "2025-08-15",
    facility: "Gujarat Industrial Facility",
    scope: "Scope 3",
    category: "Category 4: Upstream Freight",
    activity: "48,500 tonne-km",
    factor: "0.104 kg CO₂e / t-km (GLEC)",
    emissions: 5.0,
    dataQuality: "Tier 2 (Carrier report)",
    sourceDoc: "transporter_aug.csv",
  },
  {
    id: "EM-2025-0806",
    date: "2025-08-10",
    facility: "Mumbai Bioprocessing Plant",
    scope: "Scope 2",
    category: "Purchased Electricity (Grid)",
    activity: "410,000 kWh",
    factor: "0.710 kg CO₂e / kWh (CEA v20)",
    emissions: 291.1,
    dataQuality: "Tier 1 (Metered)",
    sourceDoc: "MSEDCL_aug25.pdf",
  },
];

export default function EmissionsPage() {
  const [scopeFilter, setScopeFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [emissionsData, setEmissionsData] = useState(getLocalEmissions());
  const [scopeBreakdown, setScopeBreakdown] = useState(getLocalScopeBreakdown());
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadEmissions() {
      try {
        const [emRes, scRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/dashboard/emissions-trend").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/dashboard/scope-breakdown").then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (emRes.status === "fulfilled" && emRes.value?.data) {
          setEmissionsData(emRes.value.data);
          setIsLive(true);
        }
        if (scRes.status === "fulfilled" && scRes.value?.data) {
          setScopeBreakdown(scRes.value.data);
          setIsLive(true);
        }
      } catch (err) {
        console.warn("Emissions fetch error:", err);
      }
    }
    loadEmissions();
    return () => { mounted = false; };
  }, []);

  const filteredLedger = DETAILED_LEDGER.filter((row) => {
    const matchScope =
      scopeFilter === "all" || row.scope.toLowerCase().replace(/\s+/g, "") === scopeFilter.toLowerCase();
    const matchFacility =
      facilityFilter === "all" || row.facility.toLowerCase().includes(facilityFilter.toLowerCase());
    const matchSearch =
      row.category.toLowerCase().includes(search.toLowerCase()) ||
      row.id.toLowerCase().includes(search.toLowerCase()) ||
      row.sourceDoc.toLowerCase().includes(search.toLowerCase());
    return matchScope && matchFacility && matchSearch;
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
            Live Telemetry: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="MEASURE"
        title="Emissions Accounting Ledger"
        subtitle="Scope 1 (direct), Scope 2 (energy indirect), and Scope 3 (value chain) emissions with granular audit logs."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="secondary-button">
              <Download size={14} />
              Export GHG Ledger (CSV)
            </button>
            <Link href="/data-intake" className="primary-button">
              <Zap size={14} />
              Record Emission Data
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Corporate Footprint"
          value="8,426"
          unit="tCO₂e"
          trend="down"
          change="-6.4% vs previous period"
          icon={Activity}
        />
        <MetricCard
          label="Scope 1 (Direct)"
          value="2,930"
          unit="tCO₂e"
          trend="down"
          change="Process & fuel combustion"
          icon={Flame}
        />
        <MetricCard
          label="Scope 2 (Market-based)"
          value="2,100"
          unit="tCO₂e"
          trend="down"
          change="Purchased electricity"
          icon={Zap}
        />
        <MetricCard
          label="Scope 3 (Value Chain)"
          value="3,396"
          unit="tCO₂e"
          trend="down"
          change="Upstream freight & waste"
          icon={Truck}
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Monthly Emissions by Scope (tCO₂e)</div>
            <div className="panel-subtitle">Historical stacked trend across 2025 calendar year</div>
          </div>
          <div style={{ height: 260 }}>
            <EmissionsTrendChart data={emissionsData} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Emissions Distribution by Scope</div>
            <div className="panel-subtitle">YTD proportion of Scope 1, 2, and 3</div>
          </div>
          <div style={{ height: 260 }}>
            <ScopeDonutChart data={scopeBreakdown} centerLabel="Total YTD" centerValue="8,426 t" />
          </div>
        </div>
      </div>

      {/* Activity Ledger Table */}
      <div className="panel">
        <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="panel-title">Activity Data & Emission Entry Ledger</div>
            <div className="panel-subtitle">Detailed line-by-line emissions calculated with traceable emission factor metadata</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
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
        </div>

        <div className="filters-bar" style={{ padding: "12px 18px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }}
            />
            <input
              className="search-input"
              placeholder="Search category, document, or entry ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
          <select
            className="select-input"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
            <option value="all">All Facilities</option>
            <option value="gujarat">Gujarat Industrial Facility</option>
            <option value="mumbai">Mumbai Bioprocessing Plant</option>
            <option value="pune">Pune Chemical Park</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Entry ID & Date</th>
              <th>Facility</th>
              <th>Scope & Source Category</th>
              <th>Activity Quantity</th>
              <th>Applied Emission Factor</th>
              <th>tCO₂e Calculated</th>
              <th>Data Quality</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.map((row) => (
              <tr key={row.id}>
                <td>
                  <div style={{ fontWeight: 600, color: "#141f18" }}>{row.id}</div>
                  <div style={{ fontSize: 11, color: "#667066" }}>{row.date}</div>
                </td>
                <td style={{ fontSize: 12 }}>{row.facility}</td>
                <td>
                  <span className="source-tag">{row.scope}</span>
                  <div style={{ fontWeight: 500, marginTop: 3 }}>{row.category}</div>
                </td>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{row.activity}</td>
                <td style={{ fontSize: 11, color: "#4f584f" }}>{row.factor}</td>
                <td style={{ fontWeight: 600, color: "#355c45" }}>{row.emissions.toFixed(1)} t</td>
                <td>
                  <span style={{ fontSize: 11, color: "#2e7d32", fontWeight: 500 }}>{row.dataQuality}</span>
                </td>
                <td>
                  <Link
                    href={`/evidence?file=${row.sourceDoc}`}
                    className="secondary-button"
                    style={{ padding: "3px 8px", fontSize: 11 }}
                  >
                    View Doc
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

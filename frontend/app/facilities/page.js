"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Factory, MapPin, ArrowRight, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { getFacilities as getLocalFacilities } from "@/lib/demo-data/index";

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState(getLocalFacilities());
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadFacilities() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/facilities/overview");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && json.data.length > 0) {
            setFacilities(json.data);
            setIsLive(true);
          }
        }
      } catch (err) {
        console.warn("Backend facilities fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFacilities();
    return () => { mounted = false; };
  }, []);

  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase()) ||
      f.sector.toLowerCase().includes(search.toLowerCase())
  );

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
        title="Facilities"
        subtitle="All registered facilities under your CarbonX workspace."
        actions={
          <Link href="/data-intake" className="primary-button">
            <Factory size={15} />
            Add facility
          </Link>
        }
      />

      <div className="filters-bar">
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }} />
          <input
            className="search-input"
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <button className="filter-pill active">All</button>
        <button className="filter-pill">Active</button>
        <button className="filter-pill">Inactive</button>
      </div>

      <div className="panel" style={{ marginBottom: 15 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Sector</th>
              <th>Location</th>
              <th>Reporting Period</th>
              <th>Production</th>
              <th>Total Emissions</th>
              <th>Intensity</th>
              <th>Completeness</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div className="source-icon">
                      <Factory size={14} />
                    </div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 2 }}>{f.name}</strong>
                      <span style={{ color: "#929a92", fontSize: 9 }}>{f.id}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "#687168" }}>{f.sector}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#687168" }}>
                    <MapPin size={11} />
                    {f.location}
                  </div>
                </td>
                <td style={{ color: "#687168", fontSize: 10 }}>{f.reportingPeriod}</td>
                <td>
                  <strong>{f.production.toLocaleString()}</strong>
                  <span style={{ color: "#929a92", fontSize: 9, marginLeft: 3 }}>{f.productionUnit}</span>
                </td>
                <td>
                  <strong>{f.totalEmissions.toLocaleString()}</strong>
                  <span style={{ color: "#929a92", fontSize: 9, marginLeft: 3 }}>tCO₂e</span>
                </td>
                <td>
                  <strong>{f.emissionIntensity}</strong>
                  <span style={{ color: "#929a92", fontSize: 9, marginLeft: 3 }}>tCO₂e/t</span>
                </td>
                <td style={{ minWidth: 100 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div className="completeness-bar" style={{ flex: 1 }}>
                      <div className="completeness-fill" style={{ width: `${f.dataCompleteness}%` }} />
                    </div>
                    <span style={{ fontSize: 9, color: "#687168", whiteSpace: "nowrap" }}>{f.dataCompleteness}%</span>
                  </div>
                </td>
                <td><StatusBadge status={f.status} /></td>
                <td>
                  <Link href={`/facilities/${f.id}`} className="text-button">
                    View <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="footer">
        <span>CarbonX · Facilities</span>
        <span>{facilities.length} facilities registered</span>
      </footer>
    </>
  );
}

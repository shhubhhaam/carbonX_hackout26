"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Recycle,
  Search,
  Plus,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  ExternalLink,
  CircuitBoard,
  CheckCircle2,
  Database
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import { getPartners as getLocalPartners } from "@/lib/demo-data/index";

export default function PartnersDirectoryPage() {
  const [partners, setPartners] = useState(getLocalPartners());
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/partners");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && json.data.length > 0) {
            setPartners(json.data);
            setIsLive(true);
          }
        }
      } catch (e) {
        console.warn("Backend fetch failed, using local cache:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const filteredPartners = partners.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type.toLowerCase().includes(typeFilter.toLowerCase());
    return matchSearch && matchType;
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
            Live Data: FastAPI / PostgreSQL
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="OFF-TAKERS"
        title="Circular Partners & Off-takers Directory"
        subtitle="Network of audited industrial off-takers, bioenergy producers, and recyclers eligible for byproduct exchange."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/facility-map" className="secondary-button">
              <MapPin size={14} />
              Geospatial View
            </Link>
            <button className="primary-button">
              <Plus size={14} />
              Onboard Off-taker
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Registered Off-takers"
          value={partners.length.toString()}
          unit="verified"
          trend="up"
          change="Western India cluster"
          icon={Recycle}
        />
        <MetricCard
          label="Total Aggregated Capacity"
          value="930"
          unit="t / month"
          trend="up"
          change="Available offtake headroom"
          icon={CircuitBoard}
        />
        <MetricCard
          label="Compliance Audited"
          value="100"
          unit="%"
          trend="up"
          change="CPCB & ISO certified"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Average Compatibility"
          value="73.5"
          unit="fit score"
          trend="neutral"
          change="Across all streams"
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
            placeholder="Search partners by name, facility type, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select className="select-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Facility Types</option>
          <option value="biogas">Biogas Plants</option>
          <option value="composting">Composting</option>
          <option value="pyrolysis">Pyrolysis Plants</option>
          <option value="agricultural">Agricultural Co-ops</option>
        </select>
      </div>

      {/* Partners Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {filteredPartners.map((partner) => (
          <div key={partner.id} className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span className="source-tag">{partner.type}</span>
                <h3 style={{ margin: "6px 0 2px 0", fontSize: 16, fontWeight: 600, color: "#141f18" }}>
                  {partner.name}
                </h3>
                <div style={{ fontSize: 12, color: "#667066", display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin size={12} /> {partner.location} ({partner.distance} km away)
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="status-badge status-active">
                  <ShieldCheck size={11} style={{ marginRight: 3 }} /> Verified
                </span>
              </div>
            </div>

            <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "#475247", lineHeight: 1.5 }}>
              {partner.reason}
            </p>

            <div style={{ background: "#f9faf9", border: "1px solid #ebefec", borderRadius: 6, padding: 12, marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#667066" }}>Offtake Processing Capacity:</span>
                <strong style={{ color: "#141f18" }}>{partner.capacity} tonnes / month</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#667066" }}>Road Transit Emissions:</span>
                <strong style={{ color: "#c45353" }}>+{partner.transportEmissions} tCO₂e</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#667066" }}>Compatibility Index:</span>
                <strong style={{ color: "#2e7d32" }}>{partner.fitScore}%</strong>
              </div>
              <div style={{ marginTop: 6 }}>
                <ScoreBar score={partner.fitScore} max={100} color="#355c45" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ebefec", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "#667066", display: "flex", alignItems: "center", gap: 4 }}>
                <Mail size={12} /> {partner.contact}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/matching?partner=${partner.id}`}
                  className="secondary-button"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Match Streams
                </Link>
                <Link
                  href={`/allocations?partner=${partner.id}`}
                  className="primary-button"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Allocate
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

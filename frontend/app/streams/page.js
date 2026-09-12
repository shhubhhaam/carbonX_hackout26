"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Layers,
  Search,
  Plus,
  ArrowRight,
  Filter,
  Recycle,
  Sparkles,
  Zap,
  Clock,
  Calendar,
  Factory
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import { getStreams as getLocalStreams } from "@/lib/demo-data/index";
import { getStreams } from "@/lib/api-client";
import { useFacility } from "@/lib/FacilityContext";

export default function StreamsPage() {
  const { selectedFacility } = useFacility();
  const [streams, setStreams] = useState(getLocalStreams());
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function loadStreams() {
      try {
        const data = await getStreams();
        if (!mounted) return;
        const normalized = data.map((item) => ({
          ...item,
          facilityName: item.facility_name || item.facilityName || "Gujarat Industrial Facility",
          facilityId: item.facility_id || item.facilityId || "GIF-001",
          generatedDate: item.generated_date || item.generatedDate || "2025-07-01",
          expiryDate: item.expiry_date || item.expiryDate || "2025-10-31",
          available: Number(item.available !== undefined ? item.available : item.quantity),
          reserved: Number(item.reserved || 0),
          quantity: Number(item.quantity || 0),
        }));
        setStreams(normalized);
        setIsLive(true);
      } catch (err) {
        console.warn("Backend stream fetch error, using fallback:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStreams();
    return () => { mounted = false; };
  }, []);

  const facilityStreams = selectedFacility
    ? streams.filter((s) => s.facilityId === selectedFacility.id)
    : streams;

  const filteredStreams = facilityStreams.filter((s) => {
    const facility = s.facilityName || s.facility_name || "";
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      facility.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || s.type.toLowerCase() === typeFilter.toLowerCase();
    const matchStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchType && matchStatus;
  });

  const grossAvailable = facilityStreams.reduce((sum, s) => sum + (Number(s.available) || 0), 0);
  const committedDiverted = facilityStreams.reduce((sum, s) => sum + (Number(s.reserved) || 0), 0);

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
        eyebrow="ACT"
        title="Byproduct & Waste Streams"
        subtitle="Catalog of industrial side-streams, residues, and captured emissions characterized for circular symbiosis and off-take matching."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/matching" className="secondary-button">
              <Sparkles size={14} />
              AI Match Engine
            </Link>
            <button className="primary-button">
              <Plus size={15} />
              Register Stream
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Active Byproduct Streams"
          value={facilityStreams.length}
          unit="streams"
          trend="up"
          change=""
          icon={Layers}
        />
        <MetricCard
          label="Gross Available Volume"
          value={grossAvailable.toFixed(1)}
          unit="tonnes"
          trend="neutral"
          change="Available for offtake"
          icon={Factory}
        />
        <MetricCard
          label="Committed / Diverted"
          value={committedDiverted.toFixed(1)}
          unit="tonnes"
          trend="up"
          change=""
          icon={Recycle}
        />
        <MetricCard
          label="Net Avoidance Potential"
          value="—"
          unit=""
          trend="up"
          change="Not tracked per stream yet"
          icon={Zap}
        />
      </div>

      {/* Filter controls */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }}
          />
          <input
            className="search-input"
            placeholder="Search streams, facilities, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select className="select-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Material Types</option>
          <option value="organic">Organic / Biomass</option>
          <option value="captured-co2">Captured CO₂</option>
          <option value="ash">Inorganic Ash</option>
        </select>

        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="allocated">Allocated</option>
          <option value="matched">Matched</option>
        </select>
      </div>

      {/* Streams Table */}
      <div className="panel">
        {facilityStreams.length === 0 ? (
          <div style={{ padding: "32px 21px", color: "#8a968a", fontSize: 13, textAlign: "center" }}>
            No byproduct streams recorded for {selectedFacility?.name || "this facility"}.
          </div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Stream ID & Name</th>
              <th>Facility Origin</th>
              <th>Type</th>
              <th>Quantity & Availability</th>
              <th>Circularity Feasibility</th>
              <th>Expiry Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStreams.map((stream) => (
              <tr key={stream.id}>
                <td>
                  <Link href={`/streams/${stream.id}`} style={{ fontWeight: 600, color: "#355c45" }}>
                    {stream.name}
                  </Link>
                  <div style={{ fontSize: 11, color: "#667066" }}>{stream.id}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{stream.facilityName}</div>
                  <div style={{ fontSize: 11, color: "#8a968a" }}>ID: {stream.facilityId}</div>
                </td>
                <td>
                  <span className="source-tag">{stream.type}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {stream.available} {stream.unit} avail
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    of {stream.quantity} {stream.unit} total ({stream.reserved} reserved)
                  </div>
                </td>
                <td style={{ minWidth: 120 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span>High Quality</span>
                    <strong>88%</strong>
                  </div>
                  <ScoreBar score={88} max={100} color="#355c45" />
                </td>
                <td>
                  <div style={{ fontSize: 12, color: "#4f584f", display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} /> {stream.expiryDate}
                  </div>
                </td>
                <td>
                  <StatusBadge status={stream.status} />
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/streams/${stream.id}`}
                      className="secondary-button"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/matching?stream=${stream.id}`}
                      className="primary-button"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      Match
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </>
  );
}

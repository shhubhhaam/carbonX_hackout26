"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  CircuitBoard,
  Sparkles,
  MapPin,
  Truck,
  Layers,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import { getPartners as getLocalPartners, getStreams as getLocalStreams } from "@/lib/demo-data/index";

export default function MatchingPage() {
  const [partners, setPartners] = useState(getLocalPartners());
  const [streams, setStreams] = useState(getLocalStreams());
  const [selectedStreamId, setSelectedStreamId] = useState(getLocalStreams()[0]?.id || "CX-ORG-2048");
  const [search, setSearch] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadMatchingData() {
      try {
        const [ptRes, stRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/partners").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/streams").then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (ptRes.status === "fulfilled" && ptRes.value?.data && ptRes.value.data.length > 0) {
          setPartners(ptRes.value.data);
          setIsLive(true);
        }
        if (stRes.status === "fulfilled" && stRes.value?.data && stRes.value.data.length > 0) {
          setStreams(stRes.value.data);
        }
      } catch (err) {
        console.warn("Matching data fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMatchingData();
    return () => { mounted = false; };
  }, []);

  const selectedStream = streams.find((s) => s.id === selectedStreamId) || streams[0];

  const filteredPartners = partners.filter((p) => {
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
    );
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
            Live Symbiosis Engine: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="CONNECT"
        title="Industrial Symbiosis & Partner Matching"
        subtitle="Match raw byproduct streams with verified industrial off-takers based on biochemical compatibility, road transport emissions, and economics."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/facility-map" className="secondary-button">
              <MapPin size={14} />
              View Geospatial Map
            </Link>
            <button className="primary-button">
              <Sparkles size={14} />
              Re-run Match Algorithm
            </button>
          </div>
        }
      />

      {/* Stream Selector Strip */}
      <div
        className="panel"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#fafcfb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Layers size={18} color="#355c45" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#141f18" }}>
            Target Byproduct Stream:
          </span>
        </div>
        <select
          className="select-input"
          value={selectedStreamId}
          onChange={(e) => setSelectedStreamId(e.target.value)}
          style={{ maxWidth: 380, fontWeight: 500 }}
        >
          {streams.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.available} {s.unit} avail — {s.facilityName})
            </option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: "#667066", marginLeft: "auto" }}>
          Showing <strong>{partners.length} qualified off-takers</strong> within 100 km radius
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Top Matched Partner"
          value="GreenLoop"
          unit="91% fit"
          trend="up"
          change="34 km transport radius"
          icon={Sparkles}
        />
        <MetricCard
          label="Total Offtake Capacity"
          value="930"
          unit="tonnes/mo"
          trend="up"
          change="Sufficient for 100% volume"
          icon={CircuitBoard}
        />
        <MetricCard
          label="Average Transit Distance"
          value="51.2"
          unit="km"
          trend="neutral"
          change="Western industrial corridor"
          icon={Truck}
        />
        <MetricCard
          label="Verified Off-takers"
          value="4 of 4"
          unit="NABL / ISO"
          trend="up"
          change="All compliance verified"
          icon={ShieldCheck}
        />
      </div>

      {/* Filter Bar */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }}
          />
          <input
            className="search-input"
            placeholder="Filter partners by name, technology, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
      </div>

      {/* Partners Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredPartners.map((partner) => (
          <div
            key={partner.id}
            className="panel"
            style={{
              padding: 20,
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 190px",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="source-tag">{partner.type}</span>
                <span style={{ fontSize: 11, color: "#8a968a" }}>ID: {partner.id}</span>
              </div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 600, color: "#141f18" }}>
                {partner.name}
              </h3>
              <div style={{ fontSize: 12, color: "#667066", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                <MapPin size={12} /> {partner.location} ({partner.distance} km from facility)
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#4f584f", lineHeight: 1.5 }}>
                {partner.reason}
              </p>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>Match Compatibility</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: partner.fitScore >= 80 ? "#2e7d32" : "#b26a1b" }}>
                {partner.fitScore}% <span style={{ fontSize: 12, fontWeight: 400 }}>Fit Score</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <ScoreBar score={partner.fitScore} max={100} color={partner.fitScore >= 80 ? "#355c45" : "#b26a1b"} />
              </div>
              <div style={{ fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                Capacity: {partner.capacity} t/mo
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#667066", marginBottom: 2 }}>Logistics & Carbon</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18" }}>
                {partner.distance} km haulage
              </div>
              <div style={{ fontSize: 12, color: "#667066", marginTop: 2 }}>
                Transit footprint: <strong>+{partner.transportEmissions} tCO₂e</strong>
              </div>
              <div style={{ fontSize: 11, color: "#2e7d32", marginTop: 4 }}>
                Cost Value: {partner.costValue}/100
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href={`/allocations?partner=${partner.id}&stream=${selectedStream.id}`}
                className="primary-button"
                style={{ justifyContent: "center", fontSize: 12 }}
              >
                Allocate Stream
              </Link>
              <Link
                href={`/facility-map?partner=${partner.id}`}
                className="secondary-button"
                style={{ justifyContent: "center", fontSize: 12 }}
              >
                <MapPin size={13} /> View Route
              </Link>
              <a
                href={`mailto:${partner.contact}`}
                className="secondary-button"
                style={{ justifyContent: "center", fontSize: 11, color: "#667066" }}
              >
                <Mail size={12} /> {partner.contact}
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

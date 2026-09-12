"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Truck,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  MapPin
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import {
  getAllocations as getLocalAllocations,
  getStreams as getLocalStreams,
  getPartners as getLocalPartners
} from "@/lib/demo-data/index";

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState(getLocalAllocations());
  const [streams, setStreams] = useState(getLocalStreams());
  const [partners, setPartners] = useState(getLocalPartners());
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function loadAllocations() {
      try {
        const [alcRes, stRes, ptRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/allocations").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/streams").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/partners").then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (alcRes.status === "fulfilled" && alcRes.value?.data && alcRes.value.data.length > 0) {
          const norm = alcRes.value.data.map(a => ({
            ...a,
            streamId: a.stream_id || a.streamId,
            partnerId: a.partner_id || a.partnerId,
            partnerName: a.partner_name || a.partnerName || "Partner",
            allocatedDate: a.allocated_date || a.allocatedDate || "2025-07-15"
          }));
          setAllocations(norm);
          setIsLive(true);
        }
        if (stRes.status === "fulfilled" && stRes.value?.data) {
          setStreams(stRes.value.data);
        }
        if (ptRes.status === "fulfilled" && ptRes.value?.data) {
          setPartners(ptRes.value.data);
        }
      } catch (err) {
        console.warn("Allocations fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAllocations();
    return () => { mounted = false; };
  }, []);

  const filteredAllocations = allocations.filter((a) => {
    const sId = a.streamId || a.stream_id || "";
    const pName = a.partnerName || a.partner_name || "";
    const matchSearch =
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      sId.toLowerCase().includes(search.toLowerCase()) ||
      pName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
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
            Live Registry: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="CONNECT"
        title="Stream Allocations & Offtake Contracts"
        subtitle="Manage legally binding byproduct allocations, dispatch schedules, and transport chain of custody."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/traceability" className="secondary-button">
              <ShieldCheck size={14} />
              Traceability Audit Trail
            </Link>
            <button className="primary-button">
              <Plus size={14} />
              New Allocation Contract
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Contracted Allocations"
          value={allocations.length.toString()}
          unit="contracts"
          trend="up"
          change="GreenLoop Biogas"
          icon={FileText}
        />
        <MetricCard
          label="Allocated Volume"
          value="38"
          unit="tonnes"
          trend="neutral"
          change="38% of Q3 organic stream"
          icon={Layers}
        />
        <MetricCard
          label="Dispatched & Received"
          value="37.8"
          unit="tonnes"
          trend="up"
          change="99.5% weight reconciliation"
          icon={Truck}
        />
        <MetricCard
          label="Offtake Verification"
          value="100"
          unit="%"
          trend="up"
          change="All delivery proofs locked"
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
            placeholder="Search allocation ID, stream, or partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select
          className="select-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="verified">Verified Delivery</option>
          <option value="in-transit">In Transit</option>
          <option value="pending">Pending Dispatch</option>
        </select>
      </div>

      {/* Allocations Table */}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Allocation ID</th>
              <th>Byproduct Stream</th>
              <th>Receiving Off-taker</th>
              <th>Committed Volume</th>
              <th>Allocation Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: "#141f18" }}>{item.id}</div>
                  <div style={{ fontSize: 11, color: "#667066" }}>Contract #CX-CTR-9821</div>
                </td>
                <td>
                  <Link href={`/streams/${item.streamId}`} style={{ fontWeight: 600, color: "#355c45" }}>
                    {item.streamId}
                  </Link>
                  <div style={{ fontSize: 11, color: "#667066" }}>Organic Waste – Q3 2025</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{item.partnerName}</div>
                  <div style={{ fontSize: 11, color: "#667066" }}>Partner ID: {item.partnerId}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {item.quantity} {item.unit}
                  </div>
                  <div style={{ fontSize: 11, color: "#2e7d32" }}>Dispatched: 38 t (100%)</div>
                </td>
                <td>
                  <div style={{ fontSize: 12, color: "#4f584f", display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} /> {item.allocatedDate}
                  </div>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/traceability?stream=${item.streamId}`}
                      className="secondary-button"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      Audit Trail
                    </Link>
                    <Link
                      href={`/passports?stream=${item.streamId}`}
                      className="primary-button"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                    >
                      Passport
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

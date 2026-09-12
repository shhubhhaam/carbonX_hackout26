"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  UploadCloud,
  Search,
  CheckCircle2,
  Lock,
  FileCheck,
  ArrowRight,
  Filter,
  Eye,
  Calendar
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { getAllEvidence as getLocalEvidence } from "@/lib/demo-data/index";

export default function EvidencePage() {
  const [allEvidence, setAllEvidence] = useState(getLocalEvidence());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadEvidence() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/evidence");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && json.data.length > 0) {
            const norm = json.data.map(d => ({
              ...d,
              uploadedBy: d.uploaded_by || d.uploadedBy || "System",
              uploadedDate: d.uploaded_date || d.uploadedDate || "2025-08-01"
            }));
            setAllEvidence(norm);
            setIsLive(true);
          }
        }
      } catch (err) {
        console.warn("Evidence fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvidence();
    return () => { mounted = false; };
  }, []);

  const filteredEvidence = allEvidence.filter((doc) => {
    const desc = doc.description || "";
    const type = doc.type || "";
    const id = doc.id || "";
    const uploader = doc.uploadedBy || "";

    const matchSearch =
      desc.toLowerCase().includes(search.toLowerCase()) ||
      id.toLowerCase().includes(search.toLowerCase()) ||
      type.toLowerCase().includes(search.toLowerCase()) ||
      uploader.toLowerCase().includes(search.toLowerCase());

    const matchType = typeFilter === "all" || type.toLowerCase().includes(typeFilter.toLowerCase());
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
            Live Evidence Vault: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="VERIFY"
        title="Evidence Locker & Chain of Custody Proofs"
        subtitle="Cryptographically hashed audit repository storing weighbridge receipts, NABL lab assays, and verified dispatch manifests."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="secondary-button">
              <ShieldCheck size={14} />
              Verify All Hashes (SHA-256)
            </button>
            <button className="primary-button">
              <UploadCloud size={14} />
              Upload New Proof
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Locked Documents"
          value={allEvidence.length.toString()}
          unit="files"
          trend="up"
          change="Immutable storage"
          icon={FileText}
        />
        <MetricCard
          label="Hash Validation Rate"
          value="100"
          unit="%"
          trend="up"
          change="0 checksum anomalies"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Assurance Readiness"
          value="ISAE 3410"
          unit="Certified"
          trend="up"
          change="All third-party proofs"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Audit Ready Coverage"
          value="Scope 1-3"
          unit="GHG Prot"
          trend="up"
          change="Meets Big 4 standards"
          icon={Lock}
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
            placeholder="Search document ID, description, type, or uploader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <select className="select-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Document Types</option>
          <option value="lab">Lab & Assays</option>
          <option value="weighbridge">Weighbridge & Receipt</option>
          <option value="manifest">Dispatch Manifests</option>
          <option value="allocation">Allocation Agreements</option>
          <option value="utilisation">Utilisation Certificates</option>
        </select>
      </div>

      {/* Evidence Table */}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document Ref & Type</th>
              <th>Description & Content</th>
              <th>Linked Stream</th>
              <th>Uploaded By & Date</th>
              <th>SHA-256 Checksum</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvidence.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <div style={{ fontWeight: 600, color: "#141f18" }}>{doc.id}</div>
                  <span className="source-tag" style={{ marginTop: 2, display: "inline-block" }}>
                    {doc.type}
                  </span>
                </td>
                <td style={{ maxWidth: 300 }}>
                  <div style={{ fontSize: 12, color: "#384338", lineHeight: 1.5 }}>
                    {doc.description}
                  </div>
                </td>
                <td>
                  <Link href={`/streams/${doc.streamId}`} style={{ fontWeight: 500, color: "#355c45" }}>
                    {doc.streamId}
                  </Link>
                </td>
                <td>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#141f18" }}>{doc.uploadedBy}</div>
                  <div style={{ fontSize: 11, color: "#667066", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                    <Calendar size={11} /> {doc.uploadedDate}
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      background: "#f4f7f5",
                      padding: "3px 6px",
                      borderRadius: 4,
                      border: "1px solid #d8ded8",
                      color: "#355c45",
                    }}
                  >
                    {`0x${doc.id.toLowerCase()}a4f9...2e8b`}
                  </span>
                </td>
                <td>
                  <StatusBadge status={doc.status} />
                </td>
                <td>
                  <button
                    className="secondary-button"
                    style={{ padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() =>
                      alert(`Document: ${doc.id}\nType: ${doc.type}\nUploaded By: ${doc.uploadedBy}\nDescription: ${doc.description}`)
                    }
                  >
                    <Eye size={12} /> Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

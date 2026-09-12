"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  Printer,
  Sparkles
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { getVerifiedOutcomes as getLocalOutcomes, getVerificationSummary as getLocalSummary } from "@/lib/demo-data/index";

export default function VerifiedOutcomesPage() {
  const [outcomes, setOutcomes] = useState(getLocalOutcomes());
  const [summary, setSummary] = useState(getLocalSummary());
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadVerification() {
      try {
        const [outRes, sumRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/verification/outcomes").then(r => r.ok ? r.json() : null),
          fetch("http://127.0.0.1:8000/api/v1/verification/summary").then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (outRes.status === "fulfilled" && outRes.value?.data && outRes.value.data.length > 0) {
          const norm = outRes.value.data.map(o => ({
            ...o,
            streamId: o.stream_id || o.streamId,
            streamName: o.stream_name || o.streamName || "Stream",
            co2Avoided: Number(o.co2_avoided !== undefined ? o.co2_avoided : o.co2Avoided || 0),
            verifiedDate: o.verified_date || o.verifiedDate || "2025-09-01",
            checklist: o.checklist || [],
            issues: o.issues || []
          }));
          setOutcomes(norm);
          setIsLive(true);
        }
        if (sumRes.status === "fulfilled" && sumRes.value?.data) {
          setSummary(sumRes.value.data);
        }
      } catch (err) {
        console.warn("Verification fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadVerification();
    return () => { mounted = false; };
  }, []);

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
            Live Auditor Engine: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="VERIFY"
        title="Verified Outcomes & Avoidance Assurance"
        subtitle="Audited greenhouse gas avoidance certificates generated following automated 6-step reconciliation checks."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="secondary-button">
              <Printer size={14} />
              Print Audit Pack
            </button>
            <button className="primary-button">
              <Download size={14} />
              Export Assurance Certificates
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Certified GHG Avoidance"
          value="86.0"
          unit="tCO₂e"
          trend="up"
          change="GreenLoop Biogas verified"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Pending Audit Resolution"
          value="18.0"
          unit="tCO₂e"
          trend="neutral"
          change="Biomass ash proof missing"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Verification Pass Rate"
          value="91.7"
          unit="%"
          trend="up"
          change="10 of 12 checks passed"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Assurance Standard"
          value="ISAE 3410"
          unit="Limited"
          trend="up"
          change="Audit-ready export pack"
          icon={FileCheck2}
        />
      </div>

      {/* Outcomes Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {outcomes.map((outcome) => {
          const isVerified = outcome.status === "verified";

          return (
            <div
              key={outcome.id}
              className="panel"
              style={{
                padding: 24,
                border: isVerified ? "1px solid #b7dfb9" : "1px solid #e0c897",
                background: "#ffffff",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  borderBottom: "1px solid #ebefec",
                  paddingBottom: 14,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="source-tag">{outcome.id}</span>
                    <span style={{ fontSize: 12, color: "#667066" }}>
                      Verified on {outcome.verifiedDate} by {outcome.verifier}
                    </span>
                  </div>
                  <h3 style={{ margin: "4px 0 0 0", fontSize: 17, fontWeight: 600, color: "#141f18" }}>
                    {outcome.streamName} ({outcome.streamId})
                  </h3>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: isVerified ? "#2e7d32" : "#b26a1b" }}>
                      +{outcome.co2Avoided} tCO₂e
                    </div>
                    <div style={{ fontSize: 11, color: "#667066" }}>Avoidance Certified</div>
                  </div>
                  <StatusBadge status={outcome.status} />
                </div>
              </div>

              {/* 2-Column: Checklist on left, Issues/Resolution on right */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 600, color: "#141f18" }}>
                    Automated Verification Checkpoints
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {outcome.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          color: "#384338",
                        }}
                      >
                        <CheckCircle2 size={15} color="#2e7d32" style={{ flexShrink: 0 }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 13, fontWeight: 600, color: "#141f18" }}>
                    Audit Exceptions & Status
                  </h4>
                  {outcome.issues && outcome.issues.length > 0 ? (
                    <div
                      style={{
                        background: "#fff9f0",
                        border: "1px solid #f5dfb8",
                        borderRadius: 6,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b26a1b", fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                        <AlertTriangle size={15} />
                        Action Required for Certification:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#73430c", lineHeight: 1.5 }}>
                        {outcome.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                      <div style={{ marginTop: 10 }}>
                        <Link
                          href={`/evidence?stream=${outcome.streamId}`}
                          className="secondary-button"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Request Recipient Proof
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#edf7ee",
                        border: "1px solid #b7dfb9",
                        borderRadius: 6,
                        padding: 14,
                        fontSize: 12,
                        color: "#1e4620",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={16} color="#2e7d32" />
                        Complete Audit Clearance
                      </div>
                      <div>
                        All weighbridge gross/tare receipts reconcile with &lt; 0.5% tolerance. Third-party digester biogas injection confirmed.
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <Link
                      href={`/traceability?stream=${outcome.streamId}`}
                      className="secondary-button"
                      style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                    >
                      Inspect Audit Trail
                    </Link>
                    <Link
                      href={`/passports?stream=${outcome.streamId}`}
                      className="primary-button"
                      style={{ flex: 1, justifyContent: "center", fontSize: 11 }}
                    >
                      View Passport
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

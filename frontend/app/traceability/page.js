"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Globe,
  Layers,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  MapPin,
  ExternalLink,
  Search,
  Filter
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { getStreams as getLocalStreams, getLifecycleEvents as getLocalLifecycleEvents } from "@/lib/demo-data/index";

export default function TraceabilityPage() {
  const [streams, setStreams] = useState(getLocalStreams());
  const [selectedStreamId, setSelectedStreamId] = useState(getLocalStreams()[0]?.id || "CX-ORG-2048");
  const [events, setEvents] = useState(getLocalLifecycleEvents("CX-ORG-2048"));
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadTraceability() {
      try {
        const [stRes, evRes] = await Promise.allSettled([
          fetch("http://127.0.0.1:8000/api/v1/streams").then(r => r.ok ? r.json() : null),
          fetch(`http://127.0.0.1:8000/api/v1/traceability/events?stream_id=${selectedStreamId}`).then(r => r.ok ? r.json() : null)
        ]);
        if (!mounted) return;

        if (stRes.status === "fulfilled" && stRes.value?.data && stRes.value.data.length > 0) {
          setStreams(stRes.value.data);
        }
        if (evRes.status === "fulfilled" && evRes.value?.data && evRes.value.data.length > 0) {
          const norm = evRes.value.data.map(e => ({
            ...e,
            streamId: e.stream_id || e.streamId,
            evidenceRef: e.evidence_ref || e.evidenceRef
          }));
          setEvents(norm);
          setIsLive(true);
        }
      } catch (err) {
        console.warn("Traceability fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTraceability();
    return () => { mounted = false; };
  }, [selectedStreamId]);

  const selectedStream = streams.find((s) => s.id === selectedStreamId) || streams[0];

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
            Live DPP Audit Trail: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="VERIFY"
        title="Byproduct Lifecycle Traceability & Audit Trail"
        subtitle="Chronological, tamper-evident audit trail capturing every physical and digital touchpoint from source creation to verified circular reuse."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/passports?stream=${selectedStreamId}`} className="secondary-button">
              <FileText size={14} />
              Digital Passport
            </Link>
            <Link href="/evidence" className="primary-button">
              <ShieldCheck size={14} />
              Open Evidence Locker
            </Link>
          </div>
        }
      />

      {/* Stream Selector Bar */}
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
            Select Trace Stream:
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
              {s.name} ({s.id})
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#667066" }}>
          Status: <strong style={{ color: "#2e7d32" }}>{events.length} Verified Checkpoints</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Traceable Lifecycle Events"
          value={events.length.toString()}
          unit="milestones"
          trend="up"
          change="Generation to valorization"
          icon={Globe}
        />
        <MetricCard
          label="Weighbridge Reconciliation"
          value="99.5"
          unit="%"
          trend="up"
          change="37.8 t recv / 38.0 t disp"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Chain of Custody Custodians"
          value="3"
          unit="organizations"
          trend="neutral"
          change="GIF → Transporter → GreenLoop"
          icon={MapPin}
        />
        <MetricCard
          label="Evidence Integrity"
          value="Cryptographic"
          unit="SHA-256"
          trend="up"
          change="100% hashes validated"
          icon={ShieldCheck}
        />
      </div>

      {/* Vertical Timeline Card */}
      <div className="panel" style={{ padding: 24 }}>
        <div className="panel-title" style={{ marginBottom: 4 }}>
          Lifecycle Event Stream — {selectedStream.name}
        </div>
        <div className="panel-subtitle" style={{ marginBottom: 24 }}>
          Each milestone is bound to signed weighbridge slips, lab assays, or bill of lading certificates
        </div>

        <div style={{ position: "relative", paddingLeft: 10 }}>
          {events.map((evt, index) => {
            const isLast = index === events.length - 1;
            const dateFormatted = new Date(evt.timestamp).toLocaleString();

            return (
              <div
                key={evt.id}
                style={{
                  display: "flex",
                  gap: 20,
                  position: "relative",
                  paddingBottom: isLast ? 0 : 28,
                }}
              >
                {/* Timeline vertical bar */}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      left: 17,
                      top: 36,
                      bottom: 0,
                      width: 2,
                      background: "#d1ded4",
                    }}
                  />
                )}

                {/* Timeline Node Badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#355c45",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    zIndex: 2,
                    boxShadow: "0 0 0 4px #edf7ee",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>

                {/* Event Card Content */}
                <div
                  style={{
                    flex: 1,
                    border: "1px solid #d8ded8",
                    borderRadius: 8,
                    padding: "16px 18px",
                    background: "#ffffff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#141f18" }}>
                          {evt.event}
                        </h4>
                        <span className="source-tag">{evt.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#667066", marginTop: 2 }}>
                        Actor: <strong>{evt.actor}</strong> • Facility/Node: <strong>{evt.location}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="status-badge status-active">
                        <CheckCircle2 size={11} style={{ marginRight: 4 }} />
                        {evt.status}
                      </span>
                      <div style={{ fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                        {dateFormatted}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #ebefec",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      Quantity Verified: <strong>{evt.quantity} {evt.unit}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={13} color="#355c45" />
                      <Link
                        href={`/evidence?ref=${evt.evidenceRef}`}
                        style={{ color: "#355c45", fontWeight: 500 }}
                      >
                        Inspect Evidence ({evt.evidenceRef})
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

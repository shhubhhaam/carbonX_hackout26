"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FileCheck2,
  QrCode,
  ShieldCheck,
  Download,
  Share2,
  ExternalLink,
  Layers,
  Factory,
  Recycle,
  Truck,
  CheckCircle2,
  Copy,
  Check
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { getStreams as getLocalStreams } from "@/lib/demo-data/index";

export default function DigitalPassportsPage() {
  const [streams, setStreams] = useState(getLocalStreams());
  const [selectedStreamId, setSelectedStreamId] = useState(getLocalStreams()[0]?.id || "CX-ORG-2048");
  const [copied, setCopied] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadStreams() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/streams");
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data && json.data.length > 0) {
            setStreams(json.data);
            setIsLive(true);
          }
        }
      } catch (e) {
        console.warn("Passport streams fetch error:", e);
      }
    }
    loadStreams();
    return () => { mounted = false; };
  }, []);

  const passportData = {
    uid: "CX-DPP-2025-ORG-008912",
    merkleRoot: "0x4a8f9c2d1b7e3f05a6e84d29c3b1e7f9a2d4c6b8",
    standard: "CIRPASS / EU DPP Battery & Waste Byproduct Spec v1.2",
    issuedAt: "2025-07-03T11:45:00Z",
    validThrough: "2026-07-03",
    generator: {
      name: "Gujarat Industrial Facility",
      facilityId: "GIF-001",
      location: "Ahmedabad Industrial Zone, Gujarat",
      vatGst: "24AAACG1234F1Z8",
    },
    material: {
      streamName: "Organic Agro-processing Waste (Q3 2025)",
      streamId: "CX-ORG-2048",
      mass: "100 tonnes",
      moisture: "72.4%",
      bmp: "280 L CH₄/kg VS",
      hazardousStatus: "Non-hazardous (CPCB Schedule II exempt)",
    },
    circularity: {
      destinationPartner: "GreenLoop Biogas Facility (PTR-001)",
      pathway: "Biogas Recovery via Anaerobic Digestion",
      avoidedLandfillEmissions: "-86.0 tCO₂e",
      logisticsFootprint: "+2.8 tCO₂e",
      netClimateImpact: "-83.2 tCO₂e avoided",
      circularityRate: "92%",
    },
    verification: {
      verifier: "CarbonX Automated Assurance Engine v2.4",
      status: "Cryptographically Verified",
      timestamp: "2025-09-01T14:30:00Z",
    },
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(passportData.merkleRoot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DemoDisclaimer compact />
      <PageHeader
        eyebrow="VERIFY"
        title="Digital Product & Byproduct Passports (DPP)"
        subtitle="Cryptographically sealed digital passports conforming to CIRPASS standards, encoding byproduct provenance, chemical assays, and verified climate benefits."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="secondary-button" onClick={handleCopyHash}>
              {copied ? <Check size={14} color="#2e7d32" /> : <Copy size={14} />}
              {copied ? "Hash Copied!" : "Copy Verification Root"}
            </button>
            <button className="primary-button">
              <Download size={14} />
              Export W3C JSON-LD
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Issued Passports"
          value="4"
          unit="active DPPs"
          trend="up"
          change="All streams covered"
          icon={FileCheck2}
        />
        <MetricCard
          label="Verification Standard"
          value="CIRPASS"
          unit="v1.2"
          trend="up"
          change="EU DPP compliant"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Chain of Custody Completeness"
          value="100"
          unit="%"
          trend="up"
          change="6 verified lifecycle steps"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Cryptographic Proof"
          value="SHA-256"
          unit="Merkle Tree"
          trend="up"
          change="Immutable audit seal"
          icon={QrCode}
        />
      </div>

      {/* Main Passport Visual Document Card */}
      <div
        className="panel"
        style={{
          padding: 26,
          background: "#ffffff",
          border: "1px solid #c9d6cc",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Passport Header Strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #355c45",
            paddingBottom: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="source-tag" style={{ background: "#355c45", color: "#ffffff", fontWeight: 600 }}>
                CERTIFIED DPP
              </span>
              <span style={{ fontSize: 12, color: "#667066" }}>{passportData.standard}</span>
            </div>
            <h2 style={{ margin: "4px 0 2px 0", fontSize: 20, fontWeight: 700, color: "#141f18" }}>
              Digital Byproduct Passport: {passportData.uid}
            </h2>
            <div style={{ fontSize: 12, color: "#667066", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Issued: {new Date(passportData.issuedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span style={{ fontFamily: "monospace", color: "#355c45" }}>Merkle: {passportData.merkleRoot}</span>
            </div>
          </div>

          {/* QR Code Simulation Badge */}
          <div
            style={{
              border: "1px solid #d8ded8",
              borderRadius: 8,
              padding: 10,
              background: "#f9faf9",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                background: "#141f18",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
                padding: 4,
                borderRadius: 4,
              }}
            >
              {/* Simulated QR matrix pattern */}
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: (i % 2 === 0 || i === 5 || i === 10) ? "#ffffff" : "#141f18",
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#667066", fontWeight: 600 }}>SCAN TO VERIFY</span>
          </div>
        </div>

        {/* 3-Column Detailed Data Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 24 }}>
          {/* Col 1: Origin & Producer */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Factory size={16} color="#355c45" />
              <strong style={{ fontSize: 13, color: "#141f18" }}>Origin & Producer Identity</strong>
            </div>
            <div style={{ background: "#f9faf9", border: "1px solid #ebefec", borderRadius: 6, padding: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                <span style={{ color: "#667066" }}>Producing Facility:</span>
                <div style={{ fontWeight: 600, color: "#141f18" }}>{passportData.generator.name}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Facility Code:</span>
                <div style={{ fontWeight: 500 }}>{passportData.generator.facilityId}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Location:</span>
                <div style={{ color: "#4f584f" }}>{passportData.generator.location}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Tax Registration:</span>
                <div style={{ fontFamily: "monospace", fontSize: 11 }}>{passportData.generator.vatGst}</div>
              </div>
            </div>
          </div>

          {/* Col 2: Material Chemistry */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Layers size={16} color="#355c45" />
              <strong style={{ fontSize: 13, color: "#141f18" }}>Material Chemistry & Assay</strong>
            </div>
            <div style={{ background: "#f9faf9", border: "1px solid #ebefec", borderRadius: 6, padding: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                <span style={{ color: "#667066" }}>Stream Title:</span>
                <div style={{ fontWeight: 600, color: "#141f18" }}>{passportData.material.streamName}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Assayed Moisture:</span>
                <div style={{ fontWeight: 600, color: "#355c45" }}>{passportData.material.moisture}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Biochemical Methane Potential:</span>
                <div style={{ fontWeight: 600 }}>{passportData.material.bmp}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Hazardous Classification:</span>
                <div style={{ color: "#2e7d32", fontWeight: 500 }}>{passportData.material.hazardousStatus}</div>
              </div>
            </div>
          </div>

          {/* Col 3: Circularity & Climate Impact */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Recycle size={16} color="#355c45" />
              <strong style={{ fontSize: 13, color: "#141f18" }}>Circularity & Avoided GHG</strong>
            </div>
            <div style={{ background: "#f9faf9", border: "1px solid #ebefec", borderRadius: 6, padding: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div>
                <span style={{ color: "#667066" }}>Offtake Destination:</span>
                <div style={{ fontWeight: 600, color: "#141f18" }}>{passportData.circularity.destinationPartner}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Valorization Pathway:</span>
                <div style={{ fontWeight: 500 }}>{passportData.circularity.pathway}</div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Net Avoided Carbon:</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2e7d32" }}>
                  {passportData.circularity.netClimateImpact}
                </div>
              </div>
              <div>
                <span style={{ color: "#667066" }}>Circularity Efficiency:</span>
                <div style={{ fontWeight: 600, color: "#355c45" }}>{passportData.circularity.circularityRate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Footer Bar */}
        <div
          style={{
            background: "#edf7ee",
            border: "1px solid #b7dfb9",
            borderRadius: 6,
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={20} color="#2e7d32" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e4620" }}>
                Cryptographically Sealed & Verified by CarbonX Engine
              </div>
              <div style={{ fontSize: 11, color: "#4f584f" }}>
                All 6 lifecycle checkpoints validated • Weighbridge reconciliation deviation 0.5% (PASS)
              </div>
            </div>
          </div>
          <Link href="/traceability" className="primary-button" style={{ fontSize: 12 }}>
            Inspect Full Traceability Log
          </Link>
        </div>
      </div>
    </>
  );
}

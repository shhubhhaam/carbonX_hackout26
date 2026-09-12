"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Filter,
  Search,
  Check,
  RefreshCw,
  FileText
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import Tabs from "@/components/ui/Tabs";
import { getFactoryMeasurements, getFactoryMetrics, ingestFactoryBatch } from "@/lib/api-client";
import { useFacility } from "@/lib/FacilityContext";
import { useRole } from "@/lib/RoleContext";

export default function DataIntakePage() {
  const { facilities, selectedFacility: activeFacility } = useFacility();
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState("Batches");
  const [search, setSearch] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function loadMeasurements() {
      const results = await Promise.all(
        facilities.map(async (facility) => ({
          facility,
          rows: await getFactoryMeasurements(facility.id, 1000),
        }))
      );
      if (mounted) {
        setMeasurements(results.flatMap(({ facility, rows }) => rows.map((row) => ({ ...row, facility }))));
        setLoading(false);
      }
    }
    loadMeasurements();
    return () => { mounted = false; };
  }, [facilities]);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeFacility?.id) return;
    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("The CSV must contain a header and at least one data row.");
      const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
      const dateIndex = headers.findIndex((header) => ["recorded_at", "date", "timestamp", "recorded date"].includes(header));
      const valueIndex = headers.findIndex((header) => ["value", "numeric_value", "amount", "quantity"].includes(header));
      const metricIndex = headers.findIndex((header) => ["metric", "metric_name", "metric name", "parameter"].includes(header));
      if (dateIndex < 0 || valueIndex < 0 || metricIndex < 0) throw new Error("CSV needs metric, value, and recorded_at/date columns.");

      const metrics = await getFactoryMetrics(activeFacility.id);
      const metricNames = new Map(metrics.map((metric) => [metric.name.toLowerCase(), metric.name]));
      const measurements = lines.slice(1).map((line, index) => {
        const cells = line.split(",").map((cell) => cell.trim());
        const metric = metricNames.get(cells[metricIndex]?.toLowerCase());
        const value = Number(cells[valueIndex]);
        if (!metric || !Number.isFinite(value) || !cells[dateIndex]) throw new Error(`Invalid row ${index + 2}: metric, value, or date is invalid.`);
        return { metric_name_or_id: metric, value, recorded_at: new Date(cells[dateIndex]).toISOString() };
      });
      const result = await ingestFactoryBatch(activeFacility.id, measurements);
      if (!result) throw new Error("The backend could not ingest this CSV.");
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (error) {
      setUploadSuccess(false);
      window.alert(error.message || "CSV upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    }, 1500);
  };

  const filteredBatches = measurements.filter((b) => {
    const matchSearch =
      b.filename.toLowerCase().includes(search.toLowerCase()) ||
      b.facility.name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const matchFacility =
      selectedFacility === "all" || b.facility.name.toLowerCase().includes(selectedFacility.toLowerCase());
    return matchSearch && matchFacility;
  });

  return (
    <>
      <DemoDisclaimer compact />
      <PageHeader
        eyebrow="MEASURE"
        title="Data Intake & Ingestion"
        subtitle="Ingest utility invoices, fuel slips, IoT energy meters, and supply chain bills with automatic schema mapping."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/data-sources" className="secondary-button">
              <RefreshCw size={14} />
              Connected Sources
            </Link>
            {role === "SME_OWNER" && <>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} className="primary-button" disabled={isUploading || !activeFacility}>
              <UploadCloud size={15} />
              {isUploading ? "Validating & Ingesting..." : "Upload CSV"}
            </button>
            </>}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Activity Records"
          value={measurements.length.toLocaleString()}
          unit="entries"
          trend="up"
          change="+1,240 this month"
          icon={Database}
        />
        <MetricCard
          label="Automated Ingestion"
          value={measurements.length ? ((measurements.filter((m) => m.quality_status === "VALIDATED").length / measurements.length) * 100).toFixed(1) : "0"}
          unit="%"
          trend="up"
          change="+3.1% via IoT & API"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Pending Validation"
          value={measurements.filter((m) => m.quality_status !== "VALIDATED").length.toLocaleString()}
          unit="batches"
          trend="neutral"
          change="3 flagged anomalies"
          icon={Clock}
        />
        <MetricCard
          label="Data Coverage Quality"
          value={measurements.length ? ((measurements.filter((m) => m.quality_status === "VALIDATED").length / measurements.length) * 100).toFixed(1) : "0"}
          unit="%"
          trend="up"
          change="Tier 1-2 primary data"
          icon={FileSpreadsheet}
        />
      </div>

      {uploadSuccess && (
        <div
          style={{
            background: "#edf7ee",
            border: "1px solid #b7dfb9",
            borderRadius: 6,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#1e4620",
            fontSize: 13,
          }}>
          <CheckCircle2 size={18} color="#2e7d32" />
          <span>
            <strong>Batch successfully uploaded!</strong> 128 emission records parsed, mapped against GHG Protocol factors, and verified.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="panel" style={{ padding: 0, marginBottom: 20 }}>
        <Tabs
          tabs={["Batches", "Direct Manual Entry", "Supported Schemas"]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "Batches" && (
          <div style={{ padding: "18px 20px" }}>
            {/* Drag & Drop simulated area */}
            <div
              style={{
                border: "2px dashed #d1ded4",
                borderRadius: 8,
                padding: "28px 20px",
                textAlign: "center",
                background: "#fafcfb",
                marginBottom: 20,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => role === "SME_OWNER" && fileInputRef.current?.click()}
            >
              <UploadCloud size={32} color="#355c45" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 600, fontSize: 14, color: "#141f18", marginBottom: 4 }}>
                Drop a CSV activity file here
              </div>
              <div style={{ fontSize: 12, color: "#667066" }}>
                Required columns: metric, value, and recorded_at/date. Columns are matched to this factory&apos;s metric definitions.
              </div>
            </div>

            {/* Filter bar */}
            <div className="filters-bar" style={{ marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#929a92",
                  }}
                />
                <input
                  className="search-input"
                  placeholder="Search file, facility, or batch ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
              <select
                className="select-input"
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
              >
                <option value="all">All Facilities</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.name}>{facility.name}</option>
                ))}
              </select>
            </div>

            {/* Batches Table */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch ID & File</th>
                  <th>Facility</th>
                  <th>Scope</th>
                  <th>Records</th>
                  <th>Uploaded By</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: "center" }}>Loading measurements...</td></tr>
                ) : filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>{batch.id}</div>
                      <div style={{ fontSize: 11, color: "#667066", display: "flex", alignItems: "center", gap: 4 }}>
                        <FileText size={11} /> {batch.metric_name || "Measurement"} · {batch.raw_unit || "unit not specified"}
                      </div>
                    </td>
                    <td>{batch.facility.name}</td>
                    <td>
                      <span className="source-tag">{batch.quality_status || "unknown"}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{batch.numeric_value ?? batch.value ?? "—"}</td>
                    <td style={{ fontSize: 12, color: "#4f584f" }}>{batch.raw_unit || "—"}</td>
                    <td style={{ fontSize: 12, color: "#667066" }}>{batch.recorded_at ? new Date(batch.recorded_at).toLocaleString() : "—"}</td>
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    <td>
                      <Link
                        href={`/emissions?measurement=${batch.id}`}
                        className="secondary-button"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Direct Manual Entry" && (
          <div style={{ padding: "24px 22px" }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 600 }}>Single Activity Record</h4>
            <p style={{ margin: "0 0 18px 0", fontSize: 13, color: "#667066" }}>
              Manually record meter readings, fuel procurement slips, or supplier transport logs when automated ingestion is unavailable.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Target Facility</label>
                <select className="select-input" style={{ width: "100%" }}>
                  {facilities.map((facility) => (
                    <option key={facility.id}>{facility.name} ({facility.code || facility.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Emission Scope & Category</label>
                <select className="select-input" style={{ width: "100%" }}>
                  <option>Scope 1 — Stationary Combustion (Natural Gas / Diesel)</option>
                  <option>Scope 1 — Mobile Combustion (Company Fleet)</option>
                  <option>Scope 1 — Process Emissions (Fermentation / Calcination)</option>
                  <option>Scope 2 — Purchased Electricity (Grid / Wheeling)</option>
                  <option>Scope 3 — Upstream Transportation & Freight</option>
                  <option>Scope 3 — Waste Generated in Operations</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Quantity / Activity Value</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="search-input" style={{ flex: 1 }} type="number" placeholder="e.g. 14500" defaultValue="14500" />
                  <select className="select-input" style={{ width: 110 }}>
                    <option>kWh</option>
                    <option>MWh</option>
                    <option>Litres</option>
                    <option>Tonnes</option>
                    <option>Sm³</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Reporting Date / Period</label>
                <input className="search-input" style={{ width: "100%" }} type="date" defaultValue="2025-08-15" />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Associated Invoice / Meter ID</label>
                <input className="search-input" style={{ width: "100%" }} placeholder="e.g. GUVNL-INV-2025-08-9921" />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Evidence Attachment</label>
                <input className="search-input" style={{ width: "100%" }} type="file" />
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="secondary-button">Cancel</button>
              <button className="primary-button">Save & Calculate CO₂e</button>
            </div>
          </div>
        )}

        {activeTab === "Supported Schemas" && (
          <div style={{ padding: "24px 22px" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 600 }}>Standardized Ingestion Schemas</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { title: "GHG Protocol Corporate Standard", formats: "CSV, XLSX, REST API", fields: 14, status: "Active" },
                { title: "India CEA Grid Electricity Factors v20", formats: "Automated sync", fields: 8, status: "Connected" },
                { title: "ISO 14064-1 Activity Template", formats: "XLSX, JSON", fields: 22, status: "Active" },
                { title: "Smart Meter DLMS/COSEM", formats: "MQTT, Modbus TCP", fields: 6, status: "Live Stream" },
                { title: "SAP / Oracle ERP Invoices", formats: "Webhook connector", fields: 18, status: "Connected" },
                { title: "Logistics Waybill EDI 214", formats: "EDIFACT, JSON", fields: 12, status: "Active" },
              ].map((schema, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #d8ded8",
                    borderRadius: 6,
                    padding: 14,
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{schema.title}</div>
                  <div style={{ fontSize: 11, color: "#667066", marginBottom: 8 }}>Formats: {schema.formats}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#8a968a" }}>{schema.fields} mapped fields</span>
                    <span className="status-badge status-active">{schema.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

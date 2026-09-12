"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function DataIntakePage() {
  const [activeTab, setActiveTab] = useState("Batches");
  const [search, setSearch] = useState("");
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Demo batches
  const batches = [
    {
      id: "BTCH-8821",
      filename: "GIF_grid_electricity_q3_invoices.xlsx",
      facility: "Gujarat Industrial Facility",
      scope: "Scope 2",
      records: 124,
      fileSize: "2.4 MB",
      date: "2025-08-28 14:32",
      user: "A. Patel (Energy Lead)",
      status: "completed",
    },
    {
      id: "BTCH-8820",
      filename: "MBP_biomass_feedstock_august.csv",
      facility: "Mumbai Bioprocessing Plant",
      scope: "Scope 1",
      records: 86,
      fileSize: "1.1 MB",
      date: "2025-08-25 09:15",
      user: "R. Sharma (Operations)",
      status: "completed",
    },
    {
      id: "BTCH-8819",
      filename: "PCP_diesel_genset_logs_aug.csv",
      facility: "Pune Chemical Park",
      scope: "Scope 1",
      records: 42,
      fileSize: "680 KB",
      date: "2025-08-21 16:45",
      user: "K. Deshmukh (Plant Ops)",
      status: "requires-review",
    },
    {
      id: "BTCH-8818",
      filename: "logistics_freight_manifests_w32.xlsx",
      facility: "Gujarat Industrial Facility",
      scope: "Scope 3",
      records: 310,
      fileSize: "4.8 MB",
      date: "2025-08-16 11:04",
      user: "M. Verma (Supply Chain)",
      status: "completed",
    },
    {
      id: "BTCH-8817",
      filename: "water_treatment_chemical_receipts.csv",
      facility: "Mumbai Bioprocessing Plant",
      scope: "Scope 3",
      records: 19,
      fileSize: "340 KB",
      date: "2025-08-12 18:20",
      user: "S. Rao (EHS Manager)",
      status: "pending",
    },
  ];

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    }, 1500);
  };

  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      b.filename.toLowerCase().includes(search.toLowerCase()) ||
      b.facility.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const matchFacility =
      selectedFacility === "all" || b.facility.toLowerCase().includes(selectedFacility.toLowerCase());
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
            <button onClick={handleSimulateUpload} className="primary-button" disabled={isUploading}>
              <UploadCloud size={15} />
              {isUploading ? "Validating & Ingesting..." : "Upload Activity Batch"}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Activity Records"
          value="14,280"
          unit="entries"
          trend="up"
          change="+1,240 this month"
          icon={Database}
        />
        <MetricCard
          label="Automated Ingestion"
          value="92.4"
          unit="%"
          trend="up"
          change="+3.1% via IoT & API"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Pending Validation"
          value="18"
          unit="batches"
          trend="neutral"
          change="3 flagged anomalies"
          icon={Clock}
        />
        <MetricCard
          label="Data Coverage Quality"
          value="98.2"
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
          }}
        >
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
              onClick={handleSimulateUpload}
            >
              <UploadCloud size={32} color="#355c45" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 600, fontSize: 14, color: "#141f18", marginBottom: 4 }}>
                Drop Excel (.xlsx), CSV, or PDF utility bills here
              </div>
              <div style={{ fontSize: 12, color: "#667066" }}>
                Automatic column mapping for Electricity, Diesel, Natural Gas, Biomass, and Water. Max file size: 50MB.
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
                <option value="gujarat">Gujarat Industrial</option>
                <option value="mumbai">Mumbai Bioprocessing</option>
                <option value="pune">Pune Chemical</option>
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
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>{batch.id}</div>
                      <div style={{ fontSize: 11, color: "#667066", display: "flex", alignItems: "center", gap: 4 }}>
                        <FileText size={11} /> {batch.filename} ({batch.fileSize})
                      </div>
                    </td>
                    <td>{batch.facility}</td>
                    <td>
                      <span className="source-tag">{batch.scope}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{batch.records}</td>
                    <td style={{ fontSize: 12, color: "#4f584f" }}>{batch.user}</td>
                    <td style={{ fontSize: 12, color: "#667066" }}>{batch.date}</td>
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    <td>
                      <Link
                        href={`/emissions?batch=${batch.id}`}
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
                  <option>Gujarat Industrial Facility (GIF-001)</option>
                  <option>Mumbai Bioprocessing Plant (MBP-002)</option>
                  <option>Pune Chemical Park (PCP-003)</option>
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

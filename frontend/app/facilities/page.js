"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Factory, MapPin, Search, Plus, Trash2, X, Loader2, AlertTriangle, UploadCloud } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import { useFacility } from "@/lib/FacilityContext";
import { useRole } from "@/lib/RoleContext";
import { createFactoryWithCsv, deleteFactory } from "@/lib/api-client";

function ModalShell({ title, onClose, children, width = 460 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(20,31,24,0.45)", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 10, width: "100%", maxWidth: width,
          maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(20,31,24,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #edf0ed" }}>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          <button onClick={onClose} className="text-button" style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function AddFactoryModal({ onClose, onCreated, onNeedsReplace }) {
  const [name, setName] = useState("");
  const [industryType, setIndustryType] = useState("Manufacturing");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !file) {
      setError("Factory name and a CSV file are both required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setConflict(null);
    try {
      const result = await createFactoryWithCsv(name.trim(), industryType, file, true);
      onCreated(result);
    } catch (err) {
      if (err.status === 409 && err.existingFactories?.length) {
        setConflict({ message: err.message, existing: err.existingFactories[0] });
      } else {
        setError(err.message || "Could not create the factory.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (conflict) {
    return (
      <ModalShell title="Only one factory allowed" onClose={onClose}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={18} color="#a05a2c" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "#4f584f", margin: 0, lineHeight: 1.6 }}>{conflict.message}</p>
        </div>
        <div style={{ background: "#f7f8f6", border: "1px solid #e2e6e2", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13 }}>
          Existing factory: <strong>{conflict.existing.name}</strong>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button
            className="primary-button"
            style={{ background: "#a03a3a" }}
            onClick={() => onNeedsReplace(conflict.existing)}
          >
            <Trash2 size={14} /> Delete existing & add new
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Add a new factory" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Factory name</label>
        <input
          className="search-input"
          style={{ width: "100%", marginBottom: 14 }}
          placeholder="e.g. Chennai Fabrication Unit"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Industry type</label>
        <input
          className="search-input"
          style={{ width: "100%", marginBottom: 14 }}
          placeholder="e.g. Steel, Textile, Chemicals"
          value={industryType}
          onChange={(e) => setIndustryType(e.target.value)}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Measurement data (CSV)</label>
        <div
          style={{
            border: "2px dashed #d1ded4", borderRadius: 8, padding: "20px 14px", textAlign: "center",
            marginBottom: 16, background: "#fafcfb", cursor: "pointer",
          }}
          onClick={() => document.getElementById("add-factory-file-input")?.click()}
        >
          <UploadCloud size={22} color="#355c45" style={{ margin: "0 auto 6px" }} />
          <div style={{ fontSize: 12, color: "#141f18", fontWeight: 600 }}>
            {file ? file.name : "Click to choose a .csv file"}
          </div>
          <input
            id="add-factory-file-input"
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {error && (
          <div style={{ color: "#a03a3a", fontSize: 12, marginBottom: 14, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {submitting ? "Creating & analyzing…" : "Create factory"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteConfirmModal({ facility, onClose, onConfirm, deleting }) {
  return (
    <ModalShell title="Delete factory" onClose={onClose} width={420}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <AlertTriangle size={18} color="#a03a3a" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: "#4f584f", margin: 0, lineHeight: 1.6 }}>
          Permanently delete <strong>{facility.name}</strong> and all of its measurements, emission records,
          and recommendations? This cannot be undone.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="secondary-button" onClick={onClose} disabled={deleting}>Cancel</button>
        <button className="primary-button" style={{ background: "#a03a3a" }} onClick={onConfirm} disabled={deleting}>
          {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          {deleting ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </ModalShell>
  );
}

export default function FacilitiesPage() {
  const { facilities, facilitiesLoading, refreshFacilities, setSelectedFacilityId } = useFacility();
  const { role } = useRole();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState(null);

  const canManage = role !== "SUSTAINABILITY_CONSULTANT";

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  const filtered = facilities.filter(
    (f) =>
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.location?.toLowerCase().includes(search.toLowerCase()) ||
      f.industry_type?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreated(result) {
    setShowAdd(false);
    await refreshFacilities();
    if (result?.factory_id) setSelectedFacilityId(result.factory_id);
    setBanner({
      type: "success",
      text: `"${result?.factory_name}" created — ${result?.measurements_ingested ?? 0} measurements ingested.`,
    });
  }

  async function handleReplace(existing) {
    setShowAdd(false);
    setDeleting(true);
    try {
      await deleteFactory(existing.id);
      await refreshFacilities();
      setBanner({ type: "info", text: `Deleted "${existing.name}". Add the new factory now.` });
      setShowAdd(true);
    } catch (err) {
      setBanner({ type: "error", text: err.message || "Could not delete the existing factory." });
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFactory(deleteTarget.id);
      await refreshFacilities();
      setBanner({ type: "success", text: `"${deleteTarget.name}" was deleted.` });
      setDeleteTarget(null);
    } catch (err) {
      setBanner({ type: "error", text: err.message || "Could not delete this factory." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <DemoDisclaimer compact />
        {!facilitiesLoading && (
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
            Live Facilities: Supabase Postgres
          </span>
        )}
      </div>
      <PageHeader
        eyebrow="MEASURE"
        title="Facilities"
        subtitle={
          canManage
            ? "All registered facilities under your CarbonX workspace. Add or remove factories here."
            : "All registered facilities visible to your Sustainability Consultant account (read-only)."
        }
        actions={
          canManage && (
            <button className="primary-button" onClick={() => setShowAdd(true)}>
              <Plus size={15} />
              Add Factory
            </button>
          )
        }
      />

      {banner && (
        <div
          style={{
            background: banner.type === "error" ? "#fdecea" : "#edf7ee",
            border: `1px solid ${banner.type === "error" ? "#f0b8b0" : "#b7dfb9"}`,
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: banner.type === "error" ? "#8a2e22" : "#1e4620",
          }}
        >
          {banner.text}
        </div>
      )}

      <div className="filters-bar">
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#929a92" }} />
          <input
            className="search-input"
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <button className="filter-pill active">All</button>
        <button className="filter-pill">Active</button>
        <button className="filter-pill">Inactive</button>
      </div>

      <div className="panel" style={{ marginBottom: 15, maxHeight: 520, overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Sector</th>
              <th>Location</th>
              <th>Reporting Period</th>
              <th>Status</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {facilitiesLoading ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} style={{ padding: 32, textAlign: "center", color: "#8a968a" }}>
                  Loading facilities...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} style={{ padding: 32, textAlign: "center", color: "#8a968a" }}>
                  No facilities {canManage ? "yet — add one to get started." : "visible to your account."}
                </td>
              </tr>
            ) : filtered.map((f) => (
              <tr key={f.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div className="source-icon">
                      <Factory size={14} />
                    </div>
                    <div>
                      <strong style={{ display: "block", marginBottom: 2 }}>{f.name}</strong>
                      <span style={{ color: "#929a92", fontSize: 9 }}>{f.code || f.id}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "#687168" }}>{f.industry_type || "—"}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#687168" }}>
                    <MapPin size={11} />
                    {f.location || "—"}
                  </div>
                </td>
                <td style={{ color: "#687168", fontSize: 10 }}>
                  {f.commissioned_at ? new Date(f.commissioned_at).toLocaleDateString() : "—"}
                </td>
                <td><StatusBadge status={f.is_active === false ? "inactive" : "active"} /></td>
                {canManage && (
                  <td>
                    <button
                      className="text-button"
                      style={{ color: "#a03a3a" }}
                      onClick={() => setDeleteTarget(f)}
                      title={`Delete ${f.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="footer">
        <span>CarbonX · Facilities</span>
        <span>{facilities.length} facilities registered</span>
      </footer>

      {showAdd && (
        <AddFactoryModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
          onNeedsReplace={handleReplace}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          facility={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </>
  );
}

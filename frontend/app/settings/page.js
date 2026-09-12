"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getOrgSettings } from "@/lib/api-client";
import {
  Settings,
  Building,
  ShieldCheck,
  Bell,
  Users,
  Save,
  Check,
  Layers,
  Globe,
  Lock,
  Mail
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import Tabs from "@/components/ui/Tabs";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Organization");
  const [saved, setSaved] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState("Gujarat Bio-Agro Industrial Group");
  const [consolidation, setConsolidation] = useState("operational-control");
  const [gwpSet, setGwpSet] = useState("ar6");
  const [currency, setCurrency] = useState("USD");
  const [unitSystem, setUnitSystem] = useState("metric");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const org = await getOrgSettings();
      if (!mounted || !org) return;
      if (org.organizationName) setOrgName(org.organizationName);
      if (org.defaultCurrency) setCurrency(org.defaultCurrency);
      setIsLive(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const users = [
    { name: "Aarav Patel", email: "aarav.patel@carbonx-demo.com", role: "Sustainability Director", access: "Admin" },
    { name: "Meera Sharma", email: "meera.sharma@carbonx-demo.com", role: "Plant Operations Lead", access: "Editor" },
    { name: "Rohan Deshmukh", email: "rohan.d@carbonx-demo.com", role: "EHS Manager", access: "Editor" },
    { name: "Deloitte External Assurance", email: "audit-team@deloitte.com", role: "Independent Verifier", access: "Read-Only (Audit)" },
  ];

  return (
    <>
      {isLive ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e8f5e9", border: "1px solid #a5d6a7", color: "#1b5e20", borderRadius: 12, padding: "2px 10px", fontSize: 10, fontWeight: 600, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2e7d32", display: "inline-block" }}></span>
          Live: FastAPI / PostgreSQL
        </span>
      ) : (
        <DemoDisclaimer compact />
      )}
      <PageHeader
        eyebrow="SETTINGS"
        title="Platform & Workspace Settings"
        subtitle="Manage corporate accounting boundaries, IPCC GWP datasets, unit standards, and access control."
        actions={
          <button onClick={handleSave} className="primary-button">
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Settings Saved!" : "Save Changes"}
          </button>
        }
      />

      {saved && (
        <div
          style={{
            background: "#edf7ee",
            border: "1px solid #b7dfb9",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 16,
            color: "#1e4620",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={16} color="#2e7d32" />
          Workspace configuration updated successfully.
        </div>
      )}

      {/* Tabs Layout */}
      <div className="panel" style={{ padding: 0 }}>
        <Tabs
          tabs={["Organization", "GHG Accounting Boundaries", "Notifications & Alerts", "Team & Permissions"]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "Organization" && (
          <div style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 600 }}>Corporate Entity Profile</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 800 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Organization Legal Name
                </label>
                <input
                  className="search-input"
                  style={{ width: "100%" }}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Enterprise Tax / GSTIN
                </label>
                <input
                  className="search-input"
                  style={{ width: "100%" }}
                  defaultValue="24AAACG1234F1Z8"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Primary Industrial Sector
                </label>
                <select className="select-input" style={{ width: "100%" }}>
                  <option>Agro-processing & Bioproducts</option>
                  <option>Chemicals & Refining</option>
                  <option>Heavy Manufacturing</option>
                  <option>Consumer Packaged Goods</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Base Reporting Currency
                </label>
                <select
                  className="select-input"
                  style={{ width: "100%" }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="EUR">EUR (€) — Euro</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Units of Measurement
                </label>
                <select
                  className="select-input"
                  style={{ width: "100%" }}
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value)}
                >
                  <option value="metric">Metric (tonnes, kg, kWh, Sm³)</option>
                  <option value="imperial">Imperial (short tons, lbs, therms)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Corporate Base Year
                </label>
                <input
                  className="search-input"
                  style={{ width: "100%" }}
                  defaultValue="FY 2023-24"
                  disabled
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "GHG Accounting Boundaries" && (
          <div style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 600 }}>Protocol & Methodology Boundaries</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 800 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Consolidation Approach (GHG Protocol)
                </label>
                <select
                  className="select-input"
                  style={{ width: "100%" }}
                  value={consolidation}
                  onChange={(e) => setConsolidation(e.target.value)}
                >
                  <option value="operational-control">Operational Control (100% of controlled assets)</option>
                  <option value="financial-control">Financial Control</option>
                  <option value="equity-share">Equity Share Proportional</option>
                </select>
                <div style={{ fontSize: 11, color: "#667066", marginTop: 4 }}>
                  Applied across Gujarat, Mumbai, and Pune industrial complexes.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Global Warming Potential (GWP) Set
                </label>
                <select
                  className="select-input"
                  style={{ width: "100%" }}
                  value={gwpSet}
                  onChange={(e) => setGwpSet(e.target.value)}
                >
                  <option value="ar6">IPCC Sixth Assessment Report (AR6 100-yr: CH₄ = 27.9, N₂O = 273)</option>
                  <option value="ar5">IPCC Fifth Assessment Report (AR5 100-yr: CH₄ = 28, N₂O = 265)</option>
                </select>
                <div style={{ fontSize: 11, color: "#667066", marginTop: 4 }}>
                  Standard recommended by SBTi and ISO 14064-1.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, borderTop: "1px solid #ebefec", paddingTop: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Included Scope 3 Categories</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  "Category 1: Purchased Goods & Raw Feedstock",
                  "Category 3: Fuel- and Energy-Related Activities (FERA)",
                  "Category 4: Upstream Transportation & Distribution",
                  "Category 5: Waste Generated in Operations",
                ].map((cat, idx) => (
                  <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#141f18" }}>
                    <input type="checkbox" defaultChecked />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Notifications & Alerts" && (
          <div style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 600 }}>Automated Alert Triggers</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 }}>
              {[
                { title: "Anomaly Detection Alerts", desc: "Notify when monthly sub-meter energy or fuel varies by > 15% from moving average" },
                { title: "Byproduct Expiry Warnings", desc: "Notify 7 days before organic waste stream exceeds storage biodegradation limit" },
                { title: "Partner Offtake Reconciliation", desc: "Alert when weighbridge delivery discrepancy exceeds 1.0%" },
                { title: "Assurance Review Flags", desc: "Instant alert when external auditor flags an evidence file or calculation rule" },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #ebefec", borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#667066" }}>{item.desc}</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: "#355c45" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Team & Permissions" && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h4 style={{ margin: "0 0 2px 0", fontSize: 15, fontWeight: 600 }}>Workspace Team & Access Roles</h4>
                <div style={{ fontSize: 12, color: "#667066" }}>Role-based permissions for plant operators and external verifiers</div>
              </div>
              <button className="primary-button" style={{ fontSize: 12 }}>
                <Users size={13} /> Invite User
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>User & Email</th>
                  <th>Title / Role</th>
                  <th>Workspace Access</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#141f18" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#667066" }}>{u.email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.role}</td>
                    <td>
                      <span className="source-tag">{u.access}</span>
                    </td>
                    <td>
                      <span className="status-badge status-active">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

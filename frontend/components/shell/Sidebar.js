"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFacility } from "@/lib/FacilityContext";
import { useRole } from "@/lib/RoleContext";
import {
  Activity,
  BarChart3,
  ChevronDown,
  CircuitBoard,
  Database,
  Factory,
  FileCheck2,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  Layers,
  Map,
  Recycle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Truck,
  Zap,
} from "lucide-react";

const NAV = [
  {
    label: "OVERVIEW",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge }],
  },
  {
    label: "MEASURE",
    items: [
      { href: "/facilities", label: "Facilities", icon: Factory },
      { href: "/data-intake", label: "Data Intake", icon: Database },
      { href: "/carbon-baseline", label: "Carbon Baseline", icon: Target },
      { href: "/emissions", label: "Emissions", icon: Activity },
      { href: "/hotspots", label: "Hotspots", icon: Zap },
    ],
  },
  {
    label: "ACT",
    items: [
      { href: "/streams", label: "Streams", icon: Layers },
      { href: "/recommendations", label: "Recommendations", icon: Sparkles },
      { href: "/pathways", label: "Pathways", icon: GitBranch },
      { href: "/simulator", label: "What-If Simulator", icon: SlidersHorizontal },
    ],
  },
  {
    label: "CONNECT",
    items: [
      { href: "/matching", label: "Partner Matching", icon: CircuitBoard },
      { href: "/facility-map", label: "Facility Map", icon: Map },
      { href: "/allocations", label: "Allocations", icon: Truck },
    ],
  },
  {
    label: "VERIFY",
    items: [
      { href: "/passports", label: "Digital Passports", icon: FileCheck2 },
      { href: "/traceability", label: "Traceability", icon: Globe },
      { href: "/evidence", label: "Evidence", icon: FileText },
      { href: "/verified-outcomes", label: "Verified Outcomes", icon: ShieldCheck },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/emission-factors", label: "Emission Factors", icon: BarChart3 },
      { href: "/partners", label: "Partners", icon: Recycle },
      { href: "/data-sources", label: "Data Sources", icon: Database },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { facilities, selectedFacility, setSelectedFacilityId } = useFacility();
  const { roleConfig } = useRole();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href) =>
    href === "/dashboard" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      {/* Brand — links back to the landing page */}
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="brand-mark">
          <img
            src="/logo 2.0.png"
            alt="CarbonX"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
        <div>
          <div className="brand-name">CarbonX</div>
        </div>
      </Link>

      {/* Workspace */}
      <div className="workspace" style={{ position: "relative" }} ref={wrapRef}>
        <div className="workspace-label">WORKSPACE</div>
        <button className="facility-selector" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="facility-icon">
            <Factory size={15} />
          </div>
          <div className="facility-info">
            <strong>{selectedFacility?.name || "Select facility"}</strong>
            <span>
              {selectedFacility?.code || selectedFacility?.id}
              {selectedFacility?.industry_type ? ` · ${selectedFacility.industry_type}` : ""}
            </span>
          </div>
          <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "#fff",
              border: "1px solid #e2e6e2",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(20,31,24,0.12)",
              zIndex: 20,
              overflow: "hidden",
            }}
          >
            {facilities.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedFacilityId(f.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: f.id === selectedFacility?.id ? "#f2f7f3" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong style={{ fontSize: 12, color: "#141f18" }}>{f.name}</strong>
                <span style={{ fontSize: 10, color: "#8a968a" }}>
                  {f.code || f.id} · {f.location || f.industry_type || ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="nav" style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map((section) => {
          const items = section.items.filter((item) => roleConfig.nav.includes(item.href.slice(1)));
          if (!items.length) return null;
          return (
          <div key={section.label} className="nav-space">
            <div className="nav-label">{section.label}</div>
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item${isActive(href) ? " active" : ""}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </div>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

const BREADCRUMB_MAP = {
  "/dashboard": ["Overview", "Dashboard"],
  "/facilities": ["Measure", "Facilities"],
  "/data-intake": ["Measure", "Data Intake"],
  "/carbon-baseline": ["Measure", "Carbon Baseline"],
  "/emissions": ["Measure", "Emissions"],
  "/hotspots": ["Measure", "Hotspots"],
  "/streams": ["Act", "Streams"],
  "/recommendations": ["Act", "Recommendations"],
  "/pathways": ["Act", "Pathways"],
  "/simulator": ["Act", "What-If Simulator"],
  "/matching": ["Connect", "Partner Matching"],
  "/facility-map": ["Connect", "Facility Map"],
  "/allocations": ["Connect", "Allocations"],
  "/passports": ["Verify", "Digital Passports"],
  "/traceability": ["Verify", "Traceability"],
  "/evidence": ["Verify", "Evidence"],
  "/verified-outcomes": ["Verify", "Verified Outcomes"],
  "/emission-factors": ["Settings", "Emission Factors"],
  "/partners": ["Settings", "Partners"],
  "/data-sources": ["Settings", "Data Sources"],
  "/settings": ["Settings", "Settings"],
};

export default function Topbar() {
  const pathname = usePathname();

  // Find best match breadcrumb
  const match = Object.keys(BREADCRUMB_MAP)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  const crumbs = BREADCRUMB_MAP[match] || ["Overview", "Dashboard"];

  return (
    <header className="topbar">
      <div className="breadcrumb">
        {crumbs[0]}
        <span>/</span>
        {crumbs[1]}
      </div>

      <div className="topbar-actions">
        <UserMenu />
      </div>
    </header>
  );
}

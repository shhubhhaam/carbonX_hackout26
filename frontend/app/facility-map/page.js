"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Map as MapIcon,
  MapPin,
  Factory,
  Recycle,
  Truck,
  ArrowRight,
  Filter,
  Navigation,
  ExternalLink,
  Layers
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import StatusBadge from "@/components/ui/StatusBadge";
import { getFacilities, getPartners } from "@/lib/demo-data/index";

const FacilityLeafletMap = dynamic(() => import("@/components/map/FacilityLeafletMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a968a", fontSize: 12 }}>
      Loading map…
    </div>
  ),
});

// Hardcoded real-world coordinates for the demo network.
const nodes = [
  {
    id: "GIF-001",
    name: "Gujarat Industrial Facility",
    type: "facility",
    lat: 23.0225,
    lng: 72.5714,
    city: "Ahmedabad, Gujarat",
    streams: "Organic Waste, Captured CO₂, Ash",
    emissions: "8,426 tCO₂e",
  },
  {
    id: "MBP-002",
    name: "Mumbai Bioprocessing Plant",
    type: "facility",
    lat: 19.2183,
    lng: 72.9781,
    city: "Thane, Maharashtra",
    streams: "Biogas Digestate",
    emissions: "3,210 tCO₂e",
  },
  {
    id: "PCP-003",
    name: "Pune Chemical Park",
    type: "facility",
    lat: 18.5204,
    lng: 73.8567,
    city: "Pune, Maharashtra",
    streams: "Solvent Residue",
    emissions: "6,180 tCO₂e",
  },
  {
    id: "PTR-001",
    name: "GreenLoop Biogas Facility",
    type: "partner",
    lat: 22.965,
    lng: 72.63,
    city: "Vatva GIDC, Ahmedabad",
    distance: "34 km",
    capacity: "200 t/mo",
  },
  {
    id: "PTR-002",
    name: "EcoCycle Composting",
    type: "partner",
    lat: 23.0728,
    lng: 72.66,
    city: "Naroda, Ahmedabad",
    distance: "28 km",
    capacity: "150 t/mo",
  },
  {
    id: "PTR-003",
    name: "BioCarbon Processing",
    type: "partner",
    lat: 22.9917,
    lng: 72.3833,
    city: "Sanand, Ahmedabad",
    distance: "48 km",
    capacity: "80 t/mo",
  },
  {
    id: "PTR-004",
    name: "AgriGrow Fertilisers",
    type: "partner",
    lat: 23.588,
    lng: 72.3693,
    city: "Mehsana, Gujarat",
    distance: "95 km",
    capacity: "500 t/mo",
  },
];

export default function FacilityMapPage() {
  const facilities = getFacilities();
  const partners = getPartners();

  const [selectedNode, setSelectedNode] = useState(nodes[0]);
  const [filterType, setFilterType] = useState("all");

  const filteredNodes = nodes.filter((n) => {
    if (filterType === "all") return true;
    return n.type === filterType;
  });

  return (
    <>
      <DemoDisclaimer compact />
      <PageHeader
        eyebrow="CONNECT"
        title="Geospatial Network & Transit Corridors"
        subtitle="Geographic clustering of company manufacturing facilities, circular off-takers, and multi-modal transit corridors."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/matching" className="secondary-button">
              <Recycle size={14} />
              Partner Directory
            </Link>
            <Link href="/allocations" className="primary-button">
              <Truck size={14} />
              Active Allocations
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Mapped Nodes"
          value="7"
          unit="sites"
          trend="up"
          change="3 facilities + 4 off-takers"
          icon={MapIcon}
        />
        <MetricCard
          label="Average Corridor Radius"
          value="51.2"
          unit="km"
          trend="neutral"
          change="Optimal &lt; 60 km zone"
          icon={Navigation}
        />
        <MetricCard
          label="Freight Emissions"
          value="14.2"
          unit="tCO₂e / yr"
          trend="down"
          change="GLEC framework verified"
          icon={Truck}
        />
        <MetricCard
          label="Network Density"
          value="High"
          unit="Western Cluster"
          trend="up"
          change="Gujarat & Maharashtra"
          icon={Factory}
        />
      </div>

      {/* Main Map + Inspector Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* Map Visualization Panel */}
        <div className="panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Map Controls */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid #ebefec",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fafcfb",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18" }}>
              Western India Industrial Corridor
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setFilterType("all")}
                className={`filter-pill ${filterType === "all" ? "active" : ""}`}
              >
                All Sites (7)
              </button>
              <button
                onClick={() => setFilterType("facility")}
                className={`filter-pill ${filterType === "facility" ? "active" : ""}`}
              >
                Facilities (3)
              </button>
              <button
                onClick={() => setFilterType("partner")}
                className={`filter-pill ${filterType === "partner" ? "active" : ""}`}
              >
                Off-takers (4)
              </button>
            </div>
          </div>

          {/* Real geographic map (OpenStreetMap via Leaflet) with hardcoded facility/partner locations */}
          <div style={{ height: 440, position: "relative" }}>
            <FacilityLeafletMap
              nodes={filteredNodes}
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
            />
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="panel" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span className="source-tag" style={{ textTransform: "uppercase" }}>
                {selectedNode.type}
              </span>
              <span style={{ fontSize: 11, color: "#8a968a" }}>ID: {selectedNode.id}</span>
            </div>

            <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 600, color: "#141f18" }}>
              {selectedNode.name}
            </h3>

            <div style={{ fontSize: 12, color: "#667066", display: "flex", alignItems: "center", gap: 5, marginBottom: 16 }}>
              <MapPin size={13} /> {selectedNode.city}
            </div>

            <div style={{ borderTop: "1px solid #ebefec", paddingTop: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedNode.type === "facility" ? (
                <>
                  <div style={{ background: "#f9faf9", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Annual Corporate GHG Footprint</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#355c45" }}>{selectedNode.emissions}</div>
                  </div>
                  <div style={{ background: "#f9faf9", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Generated Side-streams</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18", marginTop: 2 }}>
                      {selectedNode.streams}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: "#f9faf9", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Offtake Processing Capacity</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#2e7d32" }}>{selectedNode.capacity}</div>
                  </div>
                  <div style={{ background: "#f9faf9", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#667066" }}>Distance from Main Facility</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18", marginTop: 2 }}>
                      {selectedNode.distance} (Road Freight)
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedNode.type === "facility" ? (
                <Link
                  href={`/facilities/${selectedNode.id}`}
                  className="primary-button"
                  style={{ justifyContent: "center" }}
                >
                  <Factory size={14} /> Open Facility Details
                </Link>
              ) : (
                <Link
                  href={`/matching?partner=${selectedNode.id}`}
                  className="primary-button"
                  style={{ justifyContent: "center" }}
                >
                  <Recycle size={14} /> View Matching Rationale
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

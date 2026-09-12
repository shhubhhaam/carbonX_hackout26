"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function makeIcon(color, size) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const FACILITY_ICON = makeIcon("#355c45", 22);
const FACILITY_ICON_SELECTED = makeIcon("#141f18", 26);
const PARTNER_ICON = makeIcon("#2e7d32", 16);
const PARTNER_ICON_SELECTED = makeIcon("#141f18", 20);

// Recenters the map whenever the selected node changes.
function FlyToSelected({ node }) {
  const map = useMap();
  useEffect(() => {
    if (node) map.flyTo([node.lat, node.lng], map.getZoom(), { duration: 0.6 });
  }, [node, map]);
  return null;
}

export default function FacilityLeafletMap({ nodes, selectedNode, onSelect }) {
  const center = selectedNode ? [selectedNode.lat, selectedNode.lng] : [22.9, 72.8];
  const facilities = nodes.filter((n) => n.type === "facility");
  const routeLines = facilities.length > 1
    ? facilities.map((f) => [f.lat, f.lng])
    : [];

  return (
    <MapContainer
      center={center}
      zoom={8}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected node={selectedNode} />
      {routeLines.length > 1 && (
        <Polyline positions={routeLines} pathOptions={{ color: "#2a7a58", weight: 2, dashArray: "4 4" }} />
      )}
      {nodes.map((node) => {
        const isFacility = node.type === "facility";
        const isSelected = selectedNode?.id === node.id;
        const icon = isFacility
          ? (isSelected ? FACILITY_ICON_SELECTED : FACILITY_ICON)
          : (isSelected ? PARTNER_ICON_SELECTED : PARTNER_ICON);
        return (
          <Marker
            key={node.id}
            position={[node.lat, node.lng]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(node) }}
          >
            <Popup>
              <strong>{node.name}</strong>
              <br />
              {node.city}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

/** @import {Hotspot} from '../types.js' */

/** @type {Hotspot[]} */
const HOTSPOTS = [
  {
    id: "HS-001",
    facilityId: "GIF-001",
    process: "Organic Waste Processing",
    source: "Organic waste decomposition",
    emissions: 1568,
    contribution: 18.6,
    trend: "+8.2%",
    anomaly: true,
    opportunityScore: 92,
    priority: "critical",
    description:
      "Organic waste from Production Line 02 is currently landfilled, generating significant methane emissions. Diversion to biogas or composting pathways could recover 86 tCO₂e annually and generate revenue from byproducts.",
  },
  {
    id: "HS-002",
    facilityId: "GIF-001",
    process: "Natural Gas Boiler",
    source: "Natural gas combustion",
    emissions: 1382,
    contribution: 16.4,
    trend: "-3.7%",
    anomaly: false,
    opportunityScore: 74,
    priority: "high",
    description:
      "The boiler house consumes 1,200 GJ/month of natural gas. Fuel switching to biomethane or installing waste-heat recovery systems could reduce emissions by up to 35%.",
  },
  {
    id: "HS-003",
    facilityId: "GIF-001",
    process: "Production Line 01 – Heat",
    source: "Process heat losses",
    emissions: 1162,
    contribution: 13.8,
    trend: "-5.1%",
    anomaly: false,
    opportunityScore: 68,
    priority: "high",
    description:
      "High-temperature process heat on Production Line 01 is vented without recovery. Heat exchanger installation is estimated to recover 420 GJ/month and reduce Scope 1 by 13%.",
  },
  {
    id: "HS-004",
    facilityId: "GIF-001",
    process: "Grid Electricity",
    source: "Purchased electricity",
    emissions: 943,
    contribution: 11.2,
    trend: "-6.4%",
    anomaly: false,
    opportunityScore: 61,
    priority: "medium",
    description:
      "Grid electricity purchased from coal-heavy regional grid. Renewable Power Purchase Agreement (PPA) or on-site solar installation could eliminate this Scope 2 contribution.",
  },
  {
    id: "HS-005",
    facilityId: "GIF-001",
    process: "Refrigeration Units",
    source: "F-gas leakage",
    emissions: 714,
    contribution: 8.5,
    trend: "+2.1%",
    anomaly: true,
    opportunityScore: 55,
    priority: "medium",
    description:
      "Refrigerant leakage detected on cold-storage units. Anomalous increase in HFC-134a consumption suggests seal failures. Urgent maintenance and switch to low-GWP refrigerants recommended.",
  },
  {
    id: "HS-006",
    facilityId: "GIF-001",
    process: "Fleet & Transport",
    source: "Diesel fleet",
    emissions: 588,
    contribution: 7.0,
    trend: "-1.8%",
    anomaly: false,
    opportunityScore: 42,
    priority: "low",
    description:
      "Eight diesel trucks operate on logistics routes within a 150 km radius. Electric vehicle conversion for short-haul routes could reduce transport emissions by 60% over 3 years.",
  },
  {
    id: "HS-007",
    facilityId: "GIF-001",
    process: "Wastewater Treatment",
    source: "Biological treatment",
    emissions: 420,
    contribution: 5.0,
    trend: "-0.5%",
    anomaly: false,
    opportunityScore: 38,
    priority: "low",
    description:
      "Wastewater treatment plant uses aerobic digestion releasing N₂O and CO₂. Biogas capture from anaerobic pre-treatment could offset 40% of this impact.",
  },
];

/**
 * Get all hotspots
 * @returns {Hotspot[]}
 */
export function getHotspots() {
  return HOTSPOTS;
}

/**
 * Get a hotspot by ID
 * @param {string} id
 * @returns {Hotspot|undefined}
 */
export function getHotspotById(id) {
  return HOTSPOTS.find((h) => h.id === id);
}

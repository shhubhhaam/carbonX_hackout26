/** @import {Pathway} from '../types.js' */

/** @type {Pathway[]} */
const PATHWAYS = [
  {
    id: "PWY-001",
    name: "Biogas Recovery",
    streamId: "CX-ORG-2048",
    partnerId: "PTR-001",
    partnerName: "GreenLoop Biogas Facility",
    type: "biogas",
    co2Benefit: 86,
    circularity: 92,
    economicValue: 82,
    feasibility: 88,
    logistics: 84,
    distance: 34,
    transportEmissions: 2.8,
    cost: 45000,
    revenue: 73000,
    payback: 18,
    overallScore: 88,
    rejected: false,
  },
  {
    id: "PWY-002",
    name: "In-vessel Composting",
    streamId: "CX-ORG-2048",
    partnerId: "PTR-002",
    partnerName: "EcoCycle Composting",
    type: "composting",
    co2Benefit: 54,
    circularity: 78,
    economicValue: 74,
    feasibility: 82,
    logistics: 90,
    distance: 28,
    transportEmissions: 2.2,
    cost: 18000,
    revenue: 32000,
    payback: 9,
    overallScore: 76,
    rejected: false,
  },
  {
    id: "PWY-003",
    name: "Pyrolysis – Biochar",
    streamId: "CX-ORG-2048",
    partnerId: "PTR-003",
    partnerName: "BioCarbon Processing",
    type: "biochar",
    co2Benefit: 112,
    circularity: 88,
    economicValue: 68,
    feasibility: 64,
    logistics: 72,
    distance: 48,
    transportEmissions: 3.9,
    cost: 95000,
    revenue: 133000,
    payback: 36,
    overallScore: 73,
    rejected: false,
  },
  {
    id: "PWY-004",
    name: "Landfill (Baseline)",
    streamId: "CX-ORG-2048",
    partnerId: "",
    partnerName: "Municipal Landfill",
    type: "landfill",
    co2Benefit: 0,
    circularity: 0,
    economicValue: 10,
    feasibility: 95,
    logistics: 78,
    distance: 18,
    transportEmissions: 1.5,
    cost: 8000,
    revenue: 0,
    payback: 0,
    overallScore: 18,
    rejected: false,
  },
  {
    id: "PWY-005",
    name: "Direct Agricultural Reuse",
    streamId: "CX-ORG-2048",
    partnerId: "PTR-004",
    partnerName: "AgriGrow Fertilisers",
    type: "composting",
    co2Benefit: 22,
    circularity: 45,
    economicValue: 38,
    feasibility: 30,
    logistics: 28,
    distance: 95,
    transportEmissions: 7.8,
    cost: 22000,
    revenue: 12000,
    payback: 48,
    overallScore: 31,
    rejected: true,
    rejectedReason:
      "Purity too low for organic certification — moisture content 72% exceeds 50% threshold. Transport distance (95 km) makes unit economics unviable.",
  },
];

/**
 * Get all pathways
 * @returns {Pathway[]}
 */
export function getPathways() {
  return PATHWAYS;
}

/**
 * Get pathways for a stream
 * @param {string} streamId
 * @returns {Pathway[]}
 */
export function getPathwaysByStream(streamId) {
  return PATHWAYS.filter((p) => p.streamId === streamId);
}

/**
 * Get pathway by ID
 * @param {string} id
 * @returns {Pathway|undefined}
 */
export function getPathwayById(id) {
  return PATHWAYS.find((p) => p.id === id);
}

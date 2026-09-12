/** @import {Stream} from '../types.js' */

/** @type {Stream[]} */
const STREAMS = [
  {
    id: "CX-ORG-2048",
    name: "Organic Waste – Q3 2025",
    facilityId: "GIF-001",
    facilityName: "Gujarat Industrial Facility",
    type: "organic",
    quantity: 100,
    unit: "tonnes",
    available: 62,
    reserved: 38,
    status: "allocated",
    generatedDate: "2025-07-01",
    expiryDate: "2025-10-31",
    description:
      "Mixed organic waste stream from agro-processing operations including fruit pulp, vegetable matter, and process washings. Moisture content ~72%. BMP (biochemical methane potential) 280 L CH₄/kg VS.",
  },
  {
    id: "CX-CO2-1842",
    name: "Captured CO₂ – Fermentation",
    facilityId: "GIF-001",
    facilityName: "Gujarat Industrial Facility",
    type: "captured-co2",
    quantity: 8.7,
    unit: "tonnes",
    available: 0,
    reserved: 8.7,
    status: "matched",
    generatedDate: "2025-08-01",
    expiryDate: "2025-11-30",
    description:
      "High-purity CO₂ (99.5%) captured from fermentation vessels. Food-grade quality. Suitable for carbonation, greenhouses, or enhanced oil recovery.",
  },
  {
    id: "CX-ASH-1731",
    name: "Biomass Ash – Boiler",
    facilityId: "GIF-001",
    facilityName: "Gujarat Industrial Facility",
    type: "ash",
    quantity: 4.2,
    unit: "tonnes",
    available: 4.2,
    reserved: 0,
    status: "available",
    generatedDate: "2025-08-15",
    expiryDate: "2026-02-28",
    description:
      "Wood biomass ash from the boiler house. High potassium content (12% K₂O). Suitable as agricultural soil amendment or cement supplementary cementitious material.",
  },
  {
    id: "CX-BIO-0991",
    name: "Biogas Digestate",
    facilityId: "MBP-002",
    facilityName: "Mumbai Bioprocessing Plant",
    type: "organic",
    quantity: 24,
    unit: "tonnes",
    available: 24,
    reserved: 0,
    status: "available",
    generatedDate: "2025-08-20",
    expiryDate: "2025-12-31",
    description:
      "Digested slurry from biogas plant. Rich in ammonia-N (2.1 kg/tonne). Suitable as liquid biofertiliser. Transport required within 50 km to avoid nitrogen losses.",
  },
];

/**
 * Get all streams
 * @returns {Stream[]}
 */
export function getStreams() {
  return STREAMS;
}

/**
 * Get a stream by ID
 * @param {string} id
 * @returns {Stream|undefined}
 */
export function getStreamById(id) {
  return STREAMS.find((s) => s.id === id);
}

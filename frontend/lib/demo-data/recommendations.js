/** @import {Recommendation} from '../types.js' */

/** @type {Recommendation[]} */
const RECOMMENDATIONS = [
  {
    id: "REC-001",
    streamId: "CX-ORG-2048",
    title: "Biogas Recovery via Anaerobic Digestion",
    category: "recover",
    co2Benefit: 86,
    cost: 45000,
    savings: 28000,
    circularity: 92,
    feasibility: 88,
    confidence: 91,
    reason:
      "Stream biochemical methane potential and moisture content (72%) are ideal for anaerobic digestion. GreenLoop Biogas Facility is 34 km away with sufficient capacity.",
    pathway: "Biogas",
  },
  {
    id: "REC-002",
    streamId: "CX-ORG-2048",
    title: "In-vessel Composting to Soil Amendment",
    category: "reuse",
    co2Benefit: 54,
    cost: 18000,
    savings: 14000,
    circularity: 78,
    feasibility: 82,
    confidence: 85,
    reason:
      "Low-capex alternative. EcoCycle Composting operates an IVC facility 28 km away. Compost output can displace synthetic fertiliser at partner farms.",
    pathway: "Composting",
  },
  {
    id: "REC-003",
    streamId: "CX-ORG-2048",
    title: "Biochar Production via Pyrolysis",
    category: "process-change",
    co2Benefit: 112,
    cost: 95000,
    savings: 38000,
    circularity: 88,
    feasibility: 64,
    confidence: 72,
    reason:
      "Highest carbon sequestration potential. Biochar permanently sequesters ~35% of carbon. BioCarbon Processing can process this stream, but capital investment is high.",
    pathway: "Biochar",
  },
  {
    id: "REC-004",
    streamId: "CX-ORG-2048",
    title: "Reduce Organic Waste at Source",
    category: "reduce",
    co2Benefit: 32,
    cost: 8000,
    savings: 9500,
    circularity: 55,
    feasibility: 76,
    confidence: 80,
    reason:
      "Process optimisation on Production Line 02 can reduce organic waste generation by 20% through better yield management and inventory control.",
    pathway: "N/A",
  },
  {
    id: "REC-005",
    streamId: "CX-ASH-1731",
    title: "Agricultural Soil Amendment Reuse",
    category: "reuse",
    co2Benefit: 18,
    cost: 2000,
    savings: 6500,
    circularity: 85,
    feasibility: 90,
    confidence: 88,
    reason:
      "Biomass ash with 12% K₂O content directly substitutes potassium fertiliser. Local farmers within 25 km can absorb full stream quantity.",
    pathway: "Direct Reuse",
  },
  {
    id: "REC-006",
    streamId: "CX-CO2-1842",
    title: "Greenhouse CO₂ Enrichment",
    category: "substitute",
    co2Benefit: 8.7,
    cost: 12000,
    savings: 15000,
    circularity: 72,
    feasibility: 78,
    confidence: 82,
    reason:
      "Food-grade CO₂ from fermentation can directly supply greenhouse operations within 60 km, substituting commercial CO₂ at market rate of ₹45/kg.",
    pathway: "Direct Supply",
  },
];

/**
 * Get all recommendations
 * @returns {Recommendation[]}
 */
export function getRecommendations() {
  return RECOMMENDATIONS;
}

/**
 * Get recommendations for a stream
 * @param {string} streamId
 * @returns {Recommendation[]}
 */
export function getRecommendationsByStream(streamId) {
  return RECOMMENDATIONS.filter((r) => r.streamId === streamId);
}

/** @import {Partner} from '../types.js' */

/** @type {Partner[]} */
const PARTNERS = [
  {
    id: "PTR-001",
    name: "GreenLoop Biogas Facility",
    type: "Biogas Plant",
    location: "Vatva GIDC, Ahmedabad",
    distance: 34,
    capacity: 200,
    compatibility: 94,
    costValue: 82,
    transportEmissions: 2.8,
    fitScore: 91,
    reason:
      "High organic content match. Anaerobic digestion technology compatible with waste moisture and BMP. Has existing offtake agreement for biogas grid injection.",
    contact: "greenloop@example.com",
  },
  {
    id: "PTR-002",
    name: "EcoCycle Composting",
    type: "Composting Facility",
    location: "Naroda, Ahmedabad",
    distance: 28,
    capacity: 150,
    compatibility: 86,
    costValue: 74,
    transportEmissions: 2.2,
    fitScore: 83,
    reason:
      "In-vessel composting with ISO 17225 certification. Finished compost sold to regional agricultural cooperatives. Shorter transport distance vs. biogas option.",
    contact: "ecocycle@example.com",
  },
  {
    id: "PTR-003",
    name: "BioCarbon Processing",
    type: "Pyrolysis Plant",
    location: "Sanand, Ahmedabad",
    distance: 48,
    capacity: 80,
    compatibility: 71,
    costValue: 68,
    transportEmissions: 3.9,
    fitScore: 72,
    reason:
      "Higher carbon sequestration benefit. However, capacity is constrained at 80 t/month. Would require moisture pre-treatment to reduce from 72% to <50% for efficient pyrolysis.",
    contact: "biocarbon@example.com",
  },
  {
    id: "PTR-004",
    name: "AgriGrow Fertilisers",
    type: "Agricultural Cooperative",
    location: "Mehsana, Gujarat",
    distance: 95,
    capacity: 500,
    compatibility: 45,
    costValue: 55,
    transportEmissions: 7.8,
    fitScore: 41,
    reason:
      "Purity too low for direct organic certification requirements. Transport distance exceeds threshold for cost-effective biomaterial logistics.",
    contact: "agrigrow@example.com",
  },
];

/**
 * Get all partners
 * @returns {Partner[]}
 */
export function getPartners() {
  return PARTNERS;
}

/**
 * Get partner by ID
 * @param {string} id
 * @returns {Partner|undefined}
 */
export function getPartnerById(id) {
  return PARTNERS.find((p) => p.id === id);
}

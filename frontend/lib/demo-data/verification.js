/** @import {VerifiedOutcome, Allocation} from '../types.js' */

/** @type {VerifiedOutcome[]} */
const VERIFIED_OUTCOMES = [
  {
    id: "VFO-001",
    streamId: "CX-ORG-2048",
    streamName: "Organic Waste – Q3 2025",
    co2Avoided: 86,
    verifiedDate: "2025-09-01",
    verifier: "CarbonX Verification Engine",
    status: "verified",
    checklist: [
      "Allocation valid and quantity confirmed",
      "Dispatch manifest recorded and signed",
      "Receipt confirmation within 0.5% of dispatched quantity",
      "Quantities reconcile (37.8 t received vs 38 t dispatched)",
      "Utilisation evidence uploaded and authentic",
      "Recipient confirmation received",
    ],
    issues: [],
  },
  {
    id: "VFO-002",
    streamId: "CX-ASH-1731",
    streamName: "Biomass Ash – Boiler",
    co2Avoided: 18,
    verifiedDate: "2025-08-20",
    verifier: "CarbonX Verification Engine",
    status: "requires-review",
    checklist: [
      "Allocation valid and quantity confirmed",
      "Dispatch manifest recorded and signed",
      "Receipt confirmation within 0.5% of dispatched quantity",
      "Quantities reconcile",
    ],
    issues: [
      "Utilisation evidence not yet uploaded by recipient",
      "Recipient confirmation pending for 11 days",
    ],
  },
];

/** @type {import('../types.js').Allocation[]} */
const ALLOCATIONS = [
  {
    id: "ALC-001",
    streamId: "CX-ORG-2048",
    partnerId: "PTR-001",
    partnerName: "GreenLoop Biogas Facility",
    quantity: 38,
    unit: "tonnes",
    allocatedDate: "2025-07-15",
    status: "verified",
  },
];

/**
 * Get all verified outcomes
 * @returns {VerifiedOutcome[]}
 */
export function getVerifiedOutcomes() {
  return VERIFIED_OUTCOMES;
}

/**
 * Get all allocations
 * @returns {typeof ALLOCATIONS}
 */
export function getAllocations() {
  return ALLOCATIONS;
}

/**
 * Get summary verification stats
 */
export function getVerificationSummary() {
  return {
    totalVerified: 142,
    openAllocations: 3,
    eventsReconciled: 14,
    reconciliationRate: 94,
    requiresReview: 1,
  };
}

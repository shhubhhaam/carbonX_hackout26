/** @import {LifecycleEvent, Evidence} from '../types.js' */

/** @type {LifecycleEvent[]} */
const LIFECYCLE_EVENTS = [
  {
    id: "EVT-001",
    streamId: "CX-ORG-2048",
    event: "Stream Generated",
    timestamp: "2025-07-01T06:30:00Z",
    actor: "Gujarat Industrial Facility",
    quantity: 100,
    unit: "tonnes",
    location: "Production Line 02, GIF-001",
    evidenceRef: "EV-001",
    status: "confirmed",
  },
  {
    id: "EVT-002",
    streamId: "CX-ORG-2048",
    event: "Stream Characterized",
    timestamp: "2025-07-03T10:00:00Z",
    actor: "CarbonX Lab Analysis",
    quantity: 100,
    unit: "tonnes",
    location: "GIF-001 Laboratory",
    evidenceRef: "EV-002",
    status: "confirmed",
  },
  {
    id: "EVT-003",
    streamId: "CX-ORG-2048",
    event: "Pathway Matched",
    timestamp: "2025-07-10T14:20:00Z",
    actor: "CarbonX Platform",
    quantity: 100,
    unit: "tonnes",
    location: "Platform (Digital)",
    evidenceRef: "EV-003",
    status: "confirmed",
  },
  {
    id: "EVT-004",
    streamId: "CX-ORG-2048",
    event: "Allocation Confirmed",
    timestamp: "2025-07-15T09:00:00Z",
    actor: "GreenLoop Biogas Facility",
    quantity: 38,
    unit: "tonnes",
    location: "Vatva GIDC, Ahmedabad",
    evidenceRef: "EV-004",
    status: "confirmed",
  },
  {
    id: "EVT-005",
    streamId: "CX-ORG-2048",
    event: "Dispatch Recorded",
    timestamp: "2025-08-01T05:45:00Z",
    actor: "Gujarat Industrial Facility",
    quantity: 38,
    unit: "tonnes",
    location: "GIF-001 Loading Bay",
    evidenceRef: "EV-005",
    status: "confirmed",
  },
  {
    id: "EVT-006",
    streamId: "CX-ORG-2048",
    event: "Receipt Confirmed",
    timestamp: "2025-08-01T10:30:00Z",
    actor: "GreenLoop Biogas Facility",
    quantity: 38,
    unit: "tonnes",
    location: "Vatva GIDC, Ahmedabad",
    evidenceRef: "EV-006",
    status: "confirmed",
  },
  {
    id: "EVT-007",
    streamId: "CX-ORG-2048",
    event: "Utilisation Evidence Uploaded",
    timestamp: "2025-08-15T08:00:00Z",
    actor: "GreenLoop Biogas Facility",
    quantity: 38,
    unit: "tonnes",
    location: "Biogas Plant, Vatva",
    evidenceRef: "EV-007",
    status: "confirmed",
  },
  {
    id: "EVT-008",
    streamId: "CX-ORG-2048",
    event: "Verification Initiated",
    timestamp: "2025-09-01T09:00:00Z",
    actor: "CarbonX Verification Engine",
    quantity: 38,
    unit: "tonnes",
    location: "Platform (Digital)",
    evidenceRef: "EV-008",
    status: "pending",
  },
];

/** @type {Evidence[]} */
const EVIDENCES = [
  {
    id: "EV-001",
    streamId: "CX-ORG-2048",
    type: "Waste Generation Record",
    description: "Production log showing 100 t organic waste from batch run #2048 on 2025-07-01.",
    uploadedBy: "Priya Mehta, GIF-001 Ops",
    uploadedDate: "2025-07-01",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-002",
    streamId: "CX-ORG-2048",
    type: "Lab Analysis Report",
    description: "Third-party analysis: moisture 72%, organic matter 85%, BMP 280 L CH₄/kg VS.",
    uploadedBy: "EnviroLab India",
    uploadedDate: "2025-07-03",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-003",
    streamId: "CX-ORG-2048",
    type: "Platform Matching Record",
    description: "CarbonX digital matching log confirming GreenLoop fit score 91%.",
    uploadedBy: "CarbonX System",
    uploadedDate: "2025-07-10",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-004",
    streamId: "CX-ORG-2048",
    type: "Allocation Agreement",
    description: "Signed allocation agreement for 38 t at ₹1,920/tonne.",
    uploadedBy: "GreenLoop Admin",
    uploadedDate: "2025-07-15",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-005",
    streamId: "CX-ORG-2048",
    type: "Dispatch Manifest",
    description: "Signed delivery manifest, vehicle reg MH01AB1234, 38 t dispatched.",
    uploadedBy: "GIF-001 Logistics",
    uploadedDate: "2025-08-01",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-006",
    streamId: "CX-ORG-2048",
    type: "Receipt Confirmation",
    description: "GreenLoop weighbridge receipt: 37.8 t received (0.2 t transit loss within threshold).",
    uploadedBy: "GreenLoop Reception",
    uploadedDate: "2025-08-01",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-007",
    streamId: "CX-ORG-2048",
    type: "Utilisation Certificate",
    description: "Biogas plant operations log confirming 37.8 t processed; 9,450 m³ biogas generated.",
    uploadedBy: "GreenLoop Plant Manager",
    uploadedDate: "2025-08-15",
    status: "verified",
    url: "#",
  },
  {
    id: "EV-008",
    streamId: "CX-ORG-2048",
    type: "Verification Report",
    description: "Automated reconciliation report — pending final human review.",
    uploadedBy: "CarbonX System",
    uploadedDate: "2025-09-01",
    status: "pending",
    url: "#",
  },
];

/**
 * Get lifecycle events for a stream
 * @param {string} streamId
 * @returns {LifecycleEvent[]}
 */
export function getLifecycleEvents(streamId) {
  return LIFECYCLE_EVENTS.filter((e) => e.streamId === streamId);
}

/**
 * Get all lifecycle events
 * @returns {LifecycleEvent[]}
 */
export function getTraceability() {
  return LIFECYCLE_EVENTS;
}

/**
 * Get evidence items for a stream
 * @param {string} streamId
 * @returns {Evidence[]}
 */
export function getEvidence(streamId) {
  return EVIDENCES.filter((e) => e.streamId === streamId);
}

/**
 * Get all evidence
 * @returns {Evidence[]}
 */
export function getAllEvidence() {
  return EVIDENCES;
}

/** @import {Facility, Process} from '../types.js' */

/** @type {Facility[]} */
const FACILITIES = [
  {
    id: "GIF-001",
    name: "Gujarat Industrial Facility",
    sector: "Agro-processing",
    location: "Ahmedabad, Gujarat",
    country: "India",
    reportingPeriod: "Jan 2025 – Aug 2025",
    production: 850,
    productionUnit: "tonnes/month",
    totalEmissions: 8426,
    emissionIntensity: 9.9,
    dataCompleteness: 94,
    status: "active",
    lat: "23.0225",
    lng: "72.5714",
  },
  {
    id: "MBP-002",
    name: "Mumbai Bioprocessing Plant",
    sector: "Waste Management",
    location: "Thane, Maharashtra",
    country: "India",
    reportingPeriod: "Jan 2025 – Aug 2025",
    production: 320,
    productionUnit: "tonnes/month",
    totalEmissions: 3210,
    emissionIntensity: 10.0,
    dataCompleteness: 87,
    status: "active",
    lat: "19.2183",
    lng: "72.9781",
  },
  {
    id: "PCP-003",
    name: "Pune Chemical Processing",
    sector: "Chemicals",
    location: "Pune, Maharashtra",
    country: "India",
    reportingPeriod: "Jan 2025 – Aug 2025",
    production: 540,
    productionUnit: "tonnes/month",
    totalEmissions: 6180,
    emissionIntensity: 11.4,
    dataCompleteness: 79,
    status: "active",
    lat: "18.5204",
    lng: "73.8567",
  },
];

/** @type {Process[]} */
const PROCESSES = [
  { id: "P001", facilityId: "GIF-001", name: "Organic Waste Processing", type: "waste", emissions: 1568, contribution: 18.6 },
  { id: "P002", facilityId: "GIF-001", name: "Natural Gas Boiler", type: "energy", emissions: 1382, contribution: 16.4 },
  { id: "P003", facilityId: "GIF-001", name: "Production Line 01 – Heat", type: "process", emissions: 1162, contribution: 13.8 },
  { id: "P004", facilityId: "GIF-001", name: "Purchased Electricity", type: "energy", emissions: 943, contribution: 11.2 },
  { id: "P005", facilityId: "GIF-001", name: "Refrigeration Units", type: "process", emissions: 714, contribution: 8.5 },
  { id: "P006", facilityId: "GIF-001", name: "Fleet & Transport", type: "transport", emissions: 588, contribution: 7.0 },
  { id: "P007", facilityId: "GIF-001", name: "Wastewater Treatment", type: "waste", emissions: 420, contribution: 5.0 },
  { id: "P008", facilityId: "GIF-001", name: "Other Indirect", type: "other", emissions: 1649, contribution: 19.6 },
];

/**
 * Get all facilities
 * @returns {Facility[]}
 */
export function getFacilities() {
  return FACILITIES;
}

/**
 * Get a facility by ID
 * @param {string} id
 * @returns {Facility|undefined}
 */
export function getFacilityById(id) {
  return FACILITIES.find((f) => f.id === id);
}

/**
 * Get processes for a facility
 * @param {string} facilityId
 * @returns {Process[]}
 */
export function getFacilityProcesses(facilityId) {
  return PROCESSES.filter((p) => p.facilityId === facilityId);
}

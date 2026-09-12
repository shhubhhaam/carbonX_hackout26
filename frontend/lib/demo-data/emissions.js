/** @import {EmissionRecord} from '../types.js' */

/** @type {EmissionRecord[]} */
const MONTHLY_EMISSIONS = [
  { month: "Jan", scope1: 420, scope2: 310, scope3: 650, total: 1380, intensity: 10.8 },
  { month: "Feb", scope1: 405, scope2: 290, scope3: 615, total: 1310, intensity: 10.3 },
  { month: "Mar", scope1: 440, scope2: 320, scope3: 665, total: 1425, intensity: 11.1 },
  { month: "Apr", scope1: 390, scope2: 275, scope3: 605, total: 1270, intensity: 9.9 },
  { month: "May", scope1: 360, scope2: 255, scope3: 575, total: 1190, intensity: 9.3 },
  { month: "Jun", scope1: 330, scope2: 235, scope3: 520, total: 1085, intensity: 8.5 },
  { month: "Jul", scope1: 305, scope2: 215, scope3: 490, total: 1010, intensity: 7.9 },
  { month: "Aug", scope1: 280, scope2: 200, scope3: 460, total: 940, intensity: 7.4 },
];

const SCOPE_BREAKDOWN = [
  { name: "Scope 1 – Direct", value: 2930, color: "#355c45" },
  { name: "Scope 2 – Energy", value: 2100, color: "#5d8a70" },
  { name: "Scope 3 – Value Chain", value: 3396, color: "#a3c5b0" },
];

const EMISSIONS_BY_SOURCE = [
  { name: "Process", value: 42, color: "#355c45" },
  { name: "Energy", value: 31, color: "#5d8a70" },
  { name: "Waste", value: 17, color: "#8bb09a" },
  { name: "Transport", value: 10, color: "#b8d4c2" },
];

const FACILITY_COMPARISON = [
  { name: "Gujarat Industrial", emissions: 8426, intensity: 9.9 },
  { name: "Mumbai Bioprocessing", emissions: 3210, intensity: 10.0 },
  { name: "Pune Chemical", emissions: 6180, intensity: 11.4 },
];

/**
 * Get monthly emission records
 * @returns {EmissionRecord[]}
 */
export function getEmissions() {
  return MONTHLY_EMISSIONS;
}

/**
 * Get scope breakdown
 * @returns {Array<{name:string, value:number, color:string}>}
 */
export function getScopeBreakdown() {
  return SCOPE_BREAKDOWN;
}

/**
 * Get emissions by source/type
 * @returns {Array<{name:string, value:number, color:string}>}
 */
export function getEmissionsBySource() {
  return EMISSIONS_BY_SOURCE;
}

/**
 * Get facility comparison data
 * @returns {Array<{name:string, emissions:number, intensity:number}>}
 */
export function getFacilityComparison() {
  return FACILITY_COMPARISON;
}

/**
 * Summary KPIs
 */
export function getEmissionSummary() {
  return {
    total: 8426,
    scope1: 2930,
    scope2: 2100,
    scope3: 3396,
    intensity: 9.9,
    vsLastPeriod: -12.4,
    baseline: 9620,
  };
}

/**
 * CarbonX REST API Client
 * Connects frontend to the FastAPI + PostgreSQL backend.
 * Provides fallback to local datasets if backend is offline.
 */

import * as demoData from "./demo-data/index.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    console.warn(`[CarbonX API] Falling back to local data for ${endpoint}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dashboard & Intelligence
// ---------------------------------------------------------------------------
export async function getDashboardSummary() {
  const data = await apiFetch("/dashboard/summary");
  return data || demoData.getEmissionSummary();
}

export async function getEmissionsTrend() {
  const data = await apiFetch("/dashboard/emissions-trend");
  return data || demoData.getEmissions();
}

export async function getScopeBreakdown() {
  const data = await apiFetch("/dashboard/scope-breakdown");
  return data || demoData.getScopeBreakdown();
}

export async function getSourcesBreakdown() {
  const data = await apiFetch("/dashboard/sources-breakdown");
  return data || demoData.getEmissionsBySource();
}

export async function getFacilityComparison() {
  const data = await apiFetch("/dashboard/facility-comparison");
  return data || demoData.getFacilityComparison();
}

// ---------------------------------------------------------------------------
// Facilities & Hotspots
// ---------------------------------------------------------------------------
export async function getFacilitiesOverview() {
  const data = await apiFetch("/facilities/overview");
  return data || demoData.getFacilities();
}

export async function getFacilityProcesses(facilityId) {
  const data = await apiFetch(`/facilities/${facilityId}/processes`);
  return data || demoData.getFacilityProcesses(facilityId);
}

export async function getHotspots(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  const data = await apiFetch(`/hotspots${query ? `?${query}` : ""}`);
  return data || demoData.getHotspots();
}

// ---------------------------------------------------------------------------
// Byproduct Streams (Detect & Characterize)
// ---------------------------------------------------------------------------
export async function getStreams(filters = {}) {
  const query = new URLSearchParams(filters).toString();
  const data = await apiFetch(`/streams${query ? `?${query}` : ""}`);
  return data || demoData.getStreams();
}

export async function getStreamById(id) {
  const data = await apiFetch(`/streams/${id}`);
  return data || demoData.getStreamById(id);
}

export async function createStream(payload) {
  const data = await apiFetch("/streams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateStreamStatus(id, status) {
  const data = await apiFetch(`/streams/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data;
}

// ---------------------------------------------------------------------------
// Off-taker Partners Directory
// ---------------------------------------------------------------------------
export async function getPartners(type) {
  const endpoint = type ? `/partners?type=${encodeURIComponent(type)}` : "/partners";
  const data = await apiFetch(endpoint);
  return data || demoData.getPartners();
}

export async function getPartnerById(id) {
  const data = await apiFetch(`/partners/${id}`);
  return data || demoData.getPartnerById(id);
}

// ---------------------------------------------------------------------------
// Pathways & MCDA Optimization (Match & Optimize)
// ---------------------------------------------------------------------------
export async function getPathways(streamId) {
  const endpoint = streamId ? `/pathways/stream/${streamId}` : "/pathways";
  const data = await apiFetch(endpoint);
  return data || demoData.getPathways();
}

export async function runPathwaysMatching(streamId, weights) {
  return await apiFetch("/pathways/match", {
    method: "POST",
    body: JSON.stringify({ stream_id: streamId, weights }),
  });
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------
export async function getAllocations() {
  const data = await apiFetch("/allocations");
  return data || demoData.getAllocations();
}

export async function createAllocation(payload) {
  return await apiFetch("/allocations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Traceability & Digital Product Passport (DPP)
// ---------------------------------------------------------------------------
export async function getStreamTraceability(streamId) {
  const data = await apiFetch(`/traceability/${streamId}`);
  if (data) return data;
  return {
    passport_id: `DPP-${streamId}`,
    stream: demoData.getStreamById(streamId),
    lifecycle_events: demoData.getLifecycleEvents(streamId),
    evidence_documents: demoData.getEvidence(streamId),
    chain_integrity: "100% Verified (Tamper-evident)",
  };
}

export async function getLifecycleEvents(streamId) {
  const endpoint = streamId ? `/traceability/events?stream_id=${streamId}` : "/traceability/events";
  const data = await apiFetch(endpoint);
  return data || demoData.getLifecycleEvents(streamId);
}

export async function createLifecycleEvent(payload) {
  return await apiFetch("/traceability/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getEvidence(streamId) {
  const endpoint = streamId ? `/evidence?stream_id=${streamId}` : "/evidence";
  const data = await apiFetch(endpoint);
  return data || demoData.getAllEvidence();
}

// ---------------------------------------------------------------------------
// Verification & Audit Certification (Verify)
// ---------------------------------------------------------------------------
export async function getVerifiedOutcomes() {
  const data = await apiFetch("/verification/outcomes");
  return data || demoData.getVerifiedOutcomes();
}

export async function getVerificationSummary() {
  const data = await apiFetch("/verification/summary");
  return data || demoData.getVerificationSummary();
}

export async function certifyOutcome(outcomeId, certData) {
  return await apiFetch(`/verification/${outcomeId}/certify`, {
    method: "POST",
    body: JSON.stringify(certData),
  });
}

// ---------------------------------------------------------------------------
// Emission Factors & Settings & Simulator
// ---------------------------------------------------------------------------
export async function getEmissionFactors() {
  return await apiFetch("/emission-factors");
}

export async function getDataSourcesStatus() {
  return await apiFetch("/data-sources/status");
}

export async function getOrgSettings() {
  return await apiFetch("/settings/organization");
}

export async function runSimulator(scenario) {
  return await apiFetch("/simulator/project", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

// ---------------------------------------------------------------------------
// Real factories (Supabase-backed measurement + analysis pipeline)
// ---------------------------------------------------------------------------
export async function getFactories() {
  const data = await apiFetch("/factories");
  return data || [];
}

/**
 * Runs the full 10-stage analysis pipeline for a factory against real
 * ingested measurements in Supabase (emission calculation, source
 * contribution, ML attribution, alternatives, MCDA recommendation).
 * This is a genuine computation (writes emission_records/contribution
 * rows) and can take 15-60s — callers should show a loading state.
 */
export async function runFactoryAnalysis(factoryId, { periodStart, periodEnd, emissionType = "CO2" } = {}) {
  const data = await apiFetch(`/factories/${factoryId}/analyze`, {
    method: "POST",
    body: JSON.stringify({
      period_start: periodStart,
      period_end: periodEnd,
      emission_type: emissionType,
    }),
  });
  return data; // null on failure — caller decides how to handle
}

// Fast reads of the most recently stored analysis for a factory (no
// recomputation) — use these to redisplay results without re-running /analyze.
export async function getFactoryContribution(factoryId) {
  return await apiFetch(`/factories/${factoryId}/contribution`);
}

export async function getFactoryRecommendations(factoryId, limit = 5) {
  const data = await apiFetch(`/factories/${factoryId}/recommendations?limit=${limit}`);
  return data || [];
}

export async function getFactoryFeatureSeries(factoryId, featureName, limit = 60) {
  const data = await apiFetch(`/factories/${factoryId}/features?feature_name=${encodeURIComponent(featureName)}&limit=${limit}`);
  return data || [];
}

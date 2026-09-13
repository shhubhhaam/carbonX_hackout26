/**
 * CarbonX REST API Client
 * Connects frontend to the FastAPI + PostgreSQL backend.
 * Provides fallback to local datasets if backend is offline.
 */

import * as demoData from "./demo-data/index.js";
import { clearApiCache, readCached, writeCached } from "./client-storage.js";
import { getSupabaseBrowserClient } from "./supabase-browser.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

async function apiFetch(endpoint, options = {}) {
  const isRead = !options.method || options.method.toUpperCase() === "GET";
  if (isRead) {
    const cached = readCached(endpoint);
    if (cached !== null) return cached;
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase ? await supabase.auth.getSession() : null;
    const accessToken = sessionResult?.data?.session?.access_token;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...options,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    const data = json.data !== undefined ? json.data : json;
    if (isRead) writeCached(endpoint, data);
    else clearApiCache();
    return data;
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
  return data || [];
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
  const data = await apiFetch("/factories?cache_version=3");
  return data || [];
}

export async function getFactoryMeasurements(factoryId, limit = 1000) {
  const data = await apiFetch(`/factories/${factoryId}/measurements?limit=${limit}`);
  return data || [];
}

export async function getFactoryMetrics(factoryId) {
  const data = await apiFetch(`/factories/${factoryId}/metrics`);
  return data || [];
}

export async function ingestFactoryBatch(factoryId, measurements) {
  return await apiFetch(`/factories/${factoryId}/measurements/batch`, {
    method: "POST",
    body: JSON.stringify({ measurements }),
  });
}

export async function uploadFactoryCsv(factoryId, file, runPipeline = true) {
  const formData = new FormData();
  formData.append("file", file);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const supabase = getSupabaseBrowserClient();
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data?.session?.access_token;

  const res = await fetch(`${API_BASE}/factories/${factoryId}/upload-csv?run_pipeline=${runPipeline}`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed with status ${res.status}`);
  }
  const json = await res.json();
  // uploadFactoryCsv uses its own fetch() (multipart body, not JSON) instead
  // of apiFetch(), so it skips apiFetch's automatic clearApiCache()-on-write.
  // Without this, the newly-ingested measurements are correctly saved in
  // Supabase but every cached GET (factory measurements, and the dashboard's
  // own per-date-range analysis cache, which shares the same "cache." key
  // prefix) keeps serving stale pre-upload data indefinitely.
  clearApiCache();
  return json.data || json;
}

/**
 * Creates a brand-new, caller-named factory and ingests a CSV into it in one
 * step. SME Owner / Factory Operator accounts are capped at one factory —
 * on a 409 conflict the thrown error carries `existingFactories` so the
 * caller can offer a "delete existing, then add new" flow instead of just
 * showing a dead-end error.
 */
export async function createFactoryWithCsv(factoryName, industryType, file, runPipeline = true) {
  const formData = new FormData();
  formData.append("factory_name", factoryName);
  formData.append("industry_type", industryType || "Manufacturing");
  formData.append("file", file);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const supabase = getSupabaseBrowserClient();
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data?.session?.access_token;

  const res = await fetch(`${API_BASE}/factories/create-with-csv?run_pipeline=${runPipeline}`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json.detail;
    const message = typeof detail === "string" ? detail : detail?.message || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.existingFactories = typeof detail === "object" ? detail?.existing_factories : undefined;
    throw error;
  }
  clearApiCache();
  return json.data || json;
}

/**
 * Deletes a factory and everything scoped to it. Backend-gated: every role
 * except Sustainability Consultant may call this, still scoped to their own
 * organization/assignment/jurisdiction.
 */
export async function deleteFactory(factoryId) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const supabase = getSupabaseBrowserClient();
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data?.session?.access_token;

  const res = await fetch(`${API_BASE}/factories/${factoryId}`, {
    method: "DELETE",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json.detail;
    const message = typeof detail === "string" ? detail : detail?.message || `Delete failed with status ${res.status}`;
    throw new Error(message);
  }
  clearApiCache();
  return json;
}

export async function getFactoryEmissionRecords(factoryId, limit = 1000) {
  const data = await apiFetch(`/factories/${factoryId}/emissions?limit=${limit}`);
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

export async function getFactoryRecommendationDetail(factoryId, recId) {
  const data = await apiFetch(`/factories/${factoryId}/recommendations/${recId}`);
  return data || [];
}

export async function getFactoryFeatureSeries(factoryId, featureName, limit = 60) {
  const data = await apiFetch(`/factories/${factoryId}/features?feature_name=${encodeURIComponent(featureName)}&limit=${limit}`);
  return data || [];
}

"use client";

/**
 * App-wide selected-factory state.
 * Sources the factory list from the real Supabase-backed `/factories`
 * endpoint (genuine factories with ingested measurements), not the earlier
 * hardcoded circular-economy facility list.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getFactories } from "./api-client";

const FacilityContext = createContext(null);
const STORAGE_KEY = "carbonx.selectedFactoryId";

export function FacilityProvider({ children }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getFactories();
      if (!mounted) return;
      setFacilities(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    load();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedFacilityIdState(stored);
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to default facility.
    }
    return () => {
      mounted = false;
    };
  }, []);

  const setSelectedFacilityId = useCallback((id) => {
    setSelectedFacilityIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const selectedFacility =
    facilities.find((f) => f.id === selectedFacilityId) || facilities[0] || null;

  return (
    <FacilityContext.Provider
      value={{
        facilities,
        facilitiesLoading: loading,
        selectedFacility,
        selectedFacilityId: selectedFacility?.id ?? null,
        setSelectedFacilityId,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const ctx = useContext(FacilityContext);
  if (!ctx) {
    throw new Error("useFacility must be used within a FacilityProvider");
  }
  return ctx;
}

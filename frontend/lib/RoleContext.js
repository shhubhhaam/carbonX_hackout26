"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase-browser";

export const ROLE_CONFIG = {
  SME_OWNER: {
    label: "SME / Factory Owner",
    scope: "Own organization and factories",
    focus: "Factory performance, emissions, ML insights, and recommendations",
    nav: ["dashboard", "facilities", "data-intake", "carbon-baseline", "emissions", "hotspots", "recommendations", "simulator"],
  },
  FACTORY_OPERATOR: {
    label: "Factory Operator",
    scope: "Assigned factory",
    focus: "Operational/process data, alerts, anomalies, and actions",
    nav: ["dashboard", "data-intake", "emissions", "hotspots"],
  },
  SUSTAINABILITY_CONSULTANT: {
    label: "Sustainability Consultant",
    scope: "Assigned client organizations and factories",
    focus: "Detailed analysis, comparisons, scenarios, and recommendations",
    nav: ["dashboard", "facilities", "emissions", "hotspots", "recommendations", "pathways", "simulator", "verified-outcomes"],
  },
  INDUSTRY_REGULATOR: {
    label: "Industry Regulator",
    scope: "All factories in assigned jurisdictions",
    focus: "Industry monitoring, compliance, emissions, risk, and comparisons",
    nav: ["dashboard", "facilities", "emissions", "hotspots", "verified-outcomes"],
  },
};

const RoleContext = createContext({ role: "SME_OWNER", roleConfig: ROLE_CONFIG.SME_OWNER, loading: false });

export function RoleProvider({ children }) {
  const [role, setRole] = useState("SME_OWNER");
  const [loading, setLoading] = useState(() => !getSupabaseBrowserClient());

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return undefined;
    }

    let mounted = true;
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const metadata = data.user?.user_metadata || {};
      const candidate = metadata.user_category || metadata.role;
      if (candidate && ROLE_CONFIG[candidate]) setRole(candidate);
      setLoading(false);
    }
    loadRole();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const candidate = session?.user?.user_metadata?.user_category || session?.user?.user_metadata?.role;
      setRole(candidate && ROLE_CONFIG[candidate] ? candidate : "SME_OWNER");
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <RoleContext.Provider value={{ role, roleConfig: ROLE_CONFIG[role], loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase-browser";

export const ROLE_CONFIG = {
  SME_OWNER: {
    label: "SME / Factory Owner",
    factoryAccess: "Own factory/factories",
    orgAccess: "Own organization",
    scope: "Own factory/factories (Own organization)",
    focus: "Detailed factory performance, emissions, ML insights, recommendations",
    nav: ["dashboard", "facilities", "data-intake", "carbon-baseline", "emissions", "hotspots", "streams", "matching", "recommendations", "simulator"],
  },
  FACTORY_OPERATOR: {
    label: "Factory Operator",
    factoryAccess: "Assigned factory",
    orgAccess: "Own organization",
    scope: "Assigned factory (Own organization)",
    focus: "Operational/process data, alerts, anomalies, actions",
    nav: ["dashboard", "data-intake", "emissions", "hotspots", "streams", "matching"],
  },
  SUSTAINABILITY_CONSULTANT: {
    label: "Sustainability Consultant",
    factoryAccess: "Client factories",
    orgAccess: "Assigned client organizations",
    scope: "Client factories (Assigned client organizations)",
    focus: "Detailed analysis, comparisons, scenarios, recommendations",
    nav: ["dashboard", "facilities", "emissions", "hotspots", "recommendations", "pathways", "simulator", "verified-outcomes"],
  },
  INDUSTRY_REGULATOR: {
    label: "Sustainability / Industry Regulator",
    factoryAccess: "All factories under jurisdiction",
    orgAccess: "All registered organizations/factories in jurisdiction",
    scope: "All factories under jurisdiction (All registered organizations/factories)",
    focus: "Industry-wide monitoring, compliance, emissions, risk, comparisons",
    nav: ["dashboard", "facilities", "data-intake", "emissions", "hotspots", "streams", "matching", "verified-outcomes"],
  },
};

const RoleContext = createContext({ role: "SME_OWNER", roleConfig: ROLE_CONFIG.SME_OWNER, loading: false, email: null });

export function RoleProvider({ children }) {
  const [role, setRole] = useState("SME_OWNER");
  const [email, setEmail] = useState(null);
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
      setEmail(data.user?.email || null);
      setLoading(false);
    }
    loadRole();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const candidate = session?.user?.user_metadata?.user_category || session?.user?.user_metadata?.role;
      setRole(candidate && ROLE_CONFIG[candidate] ? candidate : "SME_OWNER");
      setEmail(session?.user?.email || null);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <RoleContext.Provider value={{ role, roleConfig: ROLE_CONFIG[role], loading, email }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

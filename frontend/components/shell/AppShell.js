"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FacilityProvider } from "@/lib/FacilityContext";
import { RoleProvider } from "@/lib/RoleContext";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname === "/auth";

  // The landing page is a standalone splash screen — no sidebar/topbar chrome.
  if (isLandingPage || isAuthPage) {
    return children;
  }

  return (
    <RoleProvider>
      <FacilityProvider>
        <main className="app-shell">
          <Sidebar />
          <section className="main-content">
            <Topbar />
            <div className="content">{children}</div>
          </section>
        </main>
      </FacilityProvider>
    </RoleProvider>
  );
}

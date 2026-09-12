"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FacilityProvider } from "@/lib/FacilityContext";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  // The landing page is a standalone splash screen — no sidebar/topbar chrome.
  if (isLandingPage) {
    return <FacilityProvider>{children}</FacilityProvider>;
  }

  return (
    <FacilityProvider>
      <main className="app-shell">
        <Sidebar />
        <section className="main-content">
          <Topbar />
          <div className="content">{children}</div>
        </section>
      </main>
    </FacilityProvider>
  );
}

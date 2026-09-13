"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";
import { FacilityProvider } from "@/lib/FacilityContext";
import { RoleProvider } from "@/lib/RoleContext";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname === "/auth";

  // The landing page is a standalone splash screen — no sidebar/topbar
  // chrome, but it still gets the site footer. The auth page gets neither,
  // per an explicit "no footer on login/signup" requirement.
  //
  // Both branches below share one layout shape: a full-height flex column
  // where the page body takes `flex: 1` and Footer is a sibling underneath
  // it, rather than nested inside the scrolling content area. That's what
  // makes the footer (a) span the full viewport width — including under the
  // sidebar, not just the content column — and (b) still sit pinned to the
  // bottom of the screen on pages shorter than the viewport, instead of
  // floating up right under a half-empty page.
  if (isLandingPage) {
    return (
      <div className="page-shell">
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </div>
    );
  }
  if (isAuthPage) {
    return children;
  }

  return (
    <RoleProvider>
      <FacilityProvider>
        <div className="page-shell">
          <main className="app-shell" style={{ flex: 1 }}>
            <Sidebar />
            <section className="main-content">
              <Topbar />
              <div className="content">{children}</div>
            </section>
          </main>
          <Footer />
        </div>
      </FacilityProvider>
    </RoleProvider>
  );
}

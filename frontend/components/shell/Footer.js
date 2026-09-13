"use client";

import Link from "next/link";

const COLUMNS = [
  {
    heading: "Measure",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/facilities", label: "Facilities" },
      { href: "/data-intake", label: "Data Intake" },
      { href: "/emissions", label: "Emissions" },
      { href: "/hotspots", label: "Hotspots" },
    ],
  },
  {
    heading: "Act",
    links: [
      { href: "/recommendations", label: "Recommendations" },
      { href: "/pathways", label: "Pathways" },
      { href: "/simulator", label: "What-If Simulator" },
      { href: "/verified-outcomes", label: "Verified Outcomes" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { href: "/emission-factors", label: "Emission Factors" },
      { href: "/data-sources", label: "Data Sources" },
      { href: "/partners", label: "Partners" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo">
            <img src="/logo 2.0.png" alt="CarbonX" />
            <span>CarbonX</span>
          </Link>
          <p>Detect. Optimize. Exchange. Verify.</p>
        </div>

        {COLUMNS.map((col) => (
          <div className="site-footer-col" key={col.heading}>
            <div className="site-footer-heading">{col.heading}</div>
            {col.links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="site-footer-bottom">
        <span>© {year} CarbonX. All rights reserved.</span>
        <span>Industrial Circular Carbon Intelligence Platform</span>
      </div>
    </footer>
  );
}

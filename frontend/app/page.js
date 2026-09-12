"use client";

import Link from "next/link";
import { ArrowRight, Recycle, ShieldCheck, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #fbfaf5 0%, #f5f6ef 55%, #eef1e7 100%)",
        padding: "24px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Decorative background circles */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="4%" cy="102%" r="260" fill="none" stroke="#355c45" strokeOpacity="0.09" strokeWidth="1.5" />
        <circle cx="4%" cy="102%" r="170" fill="none" stroke="#355c45" strokeOpacity="0.07" strokeWidth="1.5" />
        <circle cx="98%" cy="8%" r="220" fill="none" stroke="#355c45" strokeOpacity="0.08" strokeWidth="1.5" />
        <circle cx="100%" cy="95%" r="140" fill="none" stroke="#355c45" strokeOpacity="0.06" strokeWidth="1.5" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#0c1310",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          overflow: "hidden",
        }}
      >
        <img
          src="/image.png"
          alt="CarbonX"
          style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "screen" }}
        />
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", color: "var(--green, #355c45)", marginBottom: 14 }}>
        CARBONX
      </div>

      <h1
        style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "var(--text, #172019)",
          maxWidth: 780,
          margin: "0 0 18px",
        }}
      >
        AI-Powered Industrial Circular Carbon Intelligence Platform
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--muted, #737c72)",
          maxWidth: 560,
          lineHeight: 1.6,
          margin: "0 0 36px",
        }}
      >
        Detect emission hotspots, optimize circular material pathways, exchange byproducts with
        verified partners, and prove your impact — all from one command center.
      </p>

      <Link
        href="http://localhost:3000/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "var(--green, #355c45)",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          padding: "13px 26px",
          borderRadius: 8,
          textDecoration: "none",
          boxShadow: "0 8px 24px rgba(53,92,69,0.25)",
        }}
      >
        Open Dashboard
        <ArrowRight size={16} />
      </Link>

      <div
        style={{
          display: "flex",
          gap: 32,
          marginTop: 56,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          { icon: Sparkles, label: "AI-ranked reduction pathways" },
          { icon: Recycle, label: "Circular byproduct exchange" },
          { icon: ShieldCheck, label: "Verified outcome tracking" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--muted, #737c72)",
              fontWeight: 500,
            }}
          >
            <Icon size={15} color="var(--green, #355c45)" />
            {label}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

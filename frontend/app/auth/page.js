"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const USER_CATEGORIES = [
  { value: "SME_OWNER", label: "SME / Factory Owner" },
  { value: "FACTORY_OPERATOR", label: "Factory Operator" },
  { value: "SUSTAINABILITY_CONSULTANT", label: "Sustainability Consultant" },
  { value: "INDUSTRY_REGULATOR", label: "Industry Regulator" },
];

const DEMO_ACCOUNTS = [
  {
    role: "SME_OWNER",
    label: "SME / Factory Owner",
    email: "sme_owner@carbonx.demo",
    password: "CarbonX@Demo123",
    icon: "🏭",
    desc: "Own factories & emissions",
  },
  {
    role: "FACTORY_OPERATOR",
    label: "Factory Operator",
    email: "factory_operator@carbonx.demo",
    password: "CarbonX@Demo123",
    icon: "⚙️",
    desc: "Operational data & alerts",
  },
  {
    role: "SUSTAINABILITY_CONSULTANT",
    label: "Sustainability Consultant",
    email: "sustainability_consultant@carbonx.demo",
    password: "CarbonX@Demo123",
    icon: "🌱",
    desc: "All factories, analysis & scenarios",
  },
  {
    role: "INDUSTRY_REGULATOR",
    label: "Industry Regulator",
    email: "industry_regulator@carbonx.demo",
    password: "CarbonX@Demo123",
    icon: "🏛️",
    desc: "Industry-wide compliance view",
  },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState(() => (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup"
      ? "signup"
      : "login"
  ));
  const [category, setCategory] = useState(USER_CATEGORIES[0].value);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(account.password);
    setMode("login");
    setShowDemo(false);
    setMessage({ type: "info", text: `Filled demo credentials for ${account.label}. Click Log In to continue.` });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase environment variables are missing." });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || null,
              user_category: category,
            },
          },
        });
        if (error) throw error;
        if (data.session) router.push("/dashboard");
        else setMessage({ type: "success", text: "Account created. Check your email to confirm it." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Authentication failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="landing-auth-panel auth-page-panel" aria-label="Account access">
        <Link href="/" className="auth-back-link"><ArrowLeft size={14} /> Back to CarbonX</Link>
        <Link href="/" style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <img src="/logo 2.0.png" alt="CarbonX" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </Link>
        <div className="eyebrow">CARBON INTELLIGENCE</div>
        <h1>{mode === "login" ? "Welcome back." : "Create your workspace."}</h1>
        <p>{mode === "login" ? "Sign in to continue to your dashboard." : "Choose your role so your workspace starts with the right access context."}</p>

        <div className="auth-switcher">
          {[{ value: "login", label: "Log in" }, { value: "signup", label: "Create account" }].map((item) => (
            <button
              key={item.value}
              type="button"
              className={mode === item.value ? "active" : ""}
              onClick={() => { setMode(item.value); setMessage(null); }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
              width: "100%",
              justifyContent: "center",
              letterSpacing: "0.01em",
            }}
          >
            <Zap size={14} />
            {showDemo ? "Hide Demo Accounts" : "Try with Demo Account (Quick Login)"}
          </button>
        )}

        {showDemo && mode === "login" && (
          <div style={{
            background: "#f0f7f1",
            border: "1px solid #b8dbb9",
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#355c45", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select a role to demo
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  style={{
                    background: "#fff",
                    border: "1px solid #c8deca",
                    borderRadius: 8,
                    padding: "10px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2e7d32"; e.currentTarget.style.background = "#e8f5e9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#c8deca"; e.currentTarget.style.background = "#fff"; }}
                >
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{acc.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2e1c", lineHeight: 1.2, marginBottom: 2 }}>{acc.label}</div>
                  <div style={{ fontSize: 10, color: "#5a7060" }}>{acc.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: "#7a8c7a", textAlign: "center" }}>
              Password for all demo accounts: <strong>CarbonX@Demo123</strong>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <div className="category-section">
            <div className="category-label">I am signing up as</div>
            <div className="category-switcher">
              {USER_CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={category === item.value ? "active" : ""}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="landing-auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" />
          </label>
          <label>
            Password
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="At least 6 characters" />
          </label>
          {message && <div className={`landing-auth-message ${message.type}`} role="status">{message.text}</div>}
          <button type="submit" className="primary-button landing-auth-submit" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
            {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}


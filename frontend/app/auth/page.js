"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const USER_CATEGORIES = [
  { value: "SME_OWNER", label: "SME / Factory Owner" },
  { value: "FACTORY_OPERATOR", label: "Factory Operator" },
  { value: "SUSTAINABILITY_CONSULTANT", label: "Sustainability Consultant" },
  { value: "INDUSTRY_REGULATOR", label: "Industry Regulator" },
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

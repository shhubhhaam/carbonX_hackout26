"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useRole } from "@/lib/RoleContext";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { clearCarbonXStorage } from "@/lib/client-storage";

export default function UserMenu() {
  const { email, roleConfig } = useRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Proceed with local cleanup regardless of network state.
      }
    }
    clearCarbonXStorage();
    setOpen(false);
    router.push("/");
  }

  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={wrapRef}>
      <button className="user-menu-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu">
        <span className="user-menu-avatar">
          {email ? initial : <User size={15} />}
        </span>
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <span className="user-menu-avatar large">
              {email ? initial : <User size={18} />}
            </span>
            <div>
              <div className="user-menu-email">{email || "Not signed in"}</div>
              <div className="user-menu-role">{roleConfig.label}</div>
            </div>
          </div>
          <div className="user-menu-divider" />
          <button className="user-menu-item" onClick={handleLogout}>
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

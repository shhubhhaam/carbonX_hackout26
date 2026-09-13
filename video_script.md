# CarbonX — Demo Video Script

A complete shooting script for a walkthrough video covering all four user
roles: **SME / Factory Owner**, **Factory Operator**, **Sustainability
Consultant**, and **Industry Regulator**.

- Demo login: use the **"Try with Demo Account (Quick Login)"** button on
  `/auth` and pick the role card — do not type credentials manually on
  camera, it's slower and error-prone.
- Password for all demo accounts (only needed if typing manually):
  `CarbonX@Demo123`
- Recommended screen size: 1440×900 or larger — the sidebar + content
  layout is designed for desktop width.
- Before recording: make sure the backend (`uvicorn`) and frontend
  (`npm run dev`) are both running, and that ABC Steel Works / XYZ Textile
  Mills already have a completed analysis run cached (run it once off-camera
  so the on-camera run is fast, or budget 60–120s of screen time for the
  real pipeline run and narrate over it — see notes below).

---

## Part 1 — All Frontend Routes

| Route | Page | Who sees it in nav | Notes |
|---|---|---|---|
| `/` | Landing page | Everyone (public) | Shows "Signed in as…" + direct dashboard link if already logged in |
| `/auth` | Login / Sign up | Everyone (public) | Demo account quick-login lives here |
| `/dashboard` | Main Dashboard | All 4 roles | Content differs per role (see below) |
| `/facilities` | Facilities directory | SME Owner, Consultant, Regulator | Add/Delete factory UI (not Consultant) |
| `/facilities/[id]` | Facility detail | (linked from facility-map only) | Demo-data only, not wired to real factories |
| `/data-intake` | Data Intake & measurements table | SME Owner, Operator, Regulator | CSV upload happens via Facilities now, this page reads/lists |
| `/carbon-baseline` | Carbon Baseline & SBTi targets | SME Owner | "Recalculate Policy" button is not yet wired |
| `/emissions` | Emissions ledger | All 4 roles | KPI totals + ledger table are real; trend/scope charts fall back to demo data if the live series is empty |
| `/hotspots` | Hotspot Explorer | All 4 roles | Real per-factory source ranking from the analysis pipeline |
| `/hotspots/[id]` | Hotspot detail | (drill-down link) | Demo dataset |
| `/streams` | Byproduct Streams | SME Owner, Operator, Regulator | Old circular-economy demo dataset; "Register Stream" not yet wired |
| `/streams/[id]` | Stream detail | (drill-down link) | Demo dataset |
| `/recommendations` | MCDA Recommendations | SME Owner, Consultant | Fully real — pulls the pipeline's ranked alternatives |
| `/pathways` | Pathway comparison | Consultant | Demo dataset |
| `/simulator` | What-If Simulator | SME Owner, Consultant | UI sliders are local-only, not wired to the backend simulator yet |
| `/matching` | Partner Matching (B2B buyers) | SME Owner, Operator, Regulator | Old circular-economy demo dataset; "Re-run Match" not yet wired |
| `/facility-map` | Geo map of facilities/partners | (not in any role's nav currently) | Hardcoded demo coordinates |
| `/allocations` | Offtake allocation contracts | (not in any role's nav currently) | Demo dataset |
| `/passports` | Digital Product Passports | (not in any role's nav currently) | Demo dataset |
| `/traceability` | Byproduct lifecycle trace | (not in any role's nav currently) | Demo dataset |
| `/evidence` | Evidence locker | (not in any role's nav currently) | Demo dataset |
| `/verified-outcomes` | Verified carbon outcomes | Consultant, Regulator | Demo dataset |
| `/emission-factors` | Emission factor registry | (not in any role's nav currently) | Read-only demo data |
| `/partners` | Off-taker partner directory | (not in any role's nav currently) | Demo dataset |
| `/data-sources` | Connected data sources | (not in any role's nav currently) | Demo dataset |
| `/settings` | Org / team settings | (not in any role's nav currently) | "Save Changes" is currently cosmetic only |

**For the video**, lean on the routes marked "real" above — Dashboard,
Facilities, Data Intake, Emissions, Hotspots, Recommendations — since those
are the ones backed by the live Supabase pipeline you built this session.
Everything else is safe to show briefly as "the platform's broader roadmap"
without demonstrating deep interactivity.

---

## Part 2 — Overall Video Structure

| Segment | Duration (suggested) | Content |
|---|---|---|
| 0. Cold open | 0:00–0:20 | Landing page, logo, tagline |
| 1. SME / Factory Owner | 0:20–3:30 | Full ownership walkthrough — the "main" demo |
| 2. Factory Operator | 3:30–5:30 | Scoped-down operational view |
| 3. Sustainability Consultant | 5:30–7:30 | Cross-client, read-only analysis view |
| 4. Industry Regulator | 7:30–9:30 | Cross-organization compliance view |
| 5. Wrap-up | 9:30–10:00 | Recap of the RBAC model |

Total run time: ~10 minutes. Trim per-role segments evenly if you need it
shorter — each role segment below is written so its first 30–45 seconds
alone still makes the role's point if you have to cut.

---

## Part 0 — Cold Open

### Wireframe
```
[Landing page "/"]
   → point at logo (top center)
   → read tagline
   → click "Log in or create an account" → /auth
```

### Narration
> "This is CarbonX — an industrial circular-carbon intelligence platform.
> It measures a factory's real emissions from ingested operational data,
> runs a genuine machine-learning attribution pipeline to explain *why*
> those emissions look the way they do, and ranks real decarbonization
> options by cost, feasibility, and impact. But the interesting part isn't
> just what it computes — it's *who* gets to see what. CarbonX has four
> distinct user roles, each with a different scope of visibility and a
> different set of privileges. Let's walk through all four."

---

## Part 1 — SME / Factory Owner

### Relevance & Privileges
The SME / Factory Owner is the account that **owns** a manufacturing
facility. In this platform's model, an SME Owner account is capped at
exactly **one factory** — this is the small-business persona: a single
plant they're personally responsible for decarbonizing. They have the
fullest set of privileges of any operational role: they can add a factory
(naming it and uploading its first batch of data in one step), delete it,
upload more data, run the AI analysis, and see every downstream result —
emissions, hotspots, and MCDA-ranked recommendations. Nothing is hidden from
them; they see their own factory end-to-end.

### Wireframe / Flow
```
[Login] → demo card "SME / Factory Owner" → Quick Login
   ↓
[/dashboard]
   - point out: sidebar workspace selector shows "ABC Steel Works"
   - point out: top-right avatar → click → show dropdown (email, role, log out)
   - click "Run analysis" (or narrate over an already-cached result)
   - walk KPI cards: Total Emissions Analyzed / Emission Hotspot / Records Analyzed / Top Recommendation
   - scroll to: Daily CO2 intensity trend chart
   - scroll to: Emission sources ranked (bar chart + table)
   - scroll to: MCDA-ranked alternatives panel, read the top recommendation's reasoning text aloud
   ↓
[/facilities] (sidebar → Facilities)
   - show the two-row table (ABC Steel Works, XYZ Textile Mills)
   - click "Add Factory" → show the modal (name field, industry type, CSV picker)
   - type a factory name, e.g. "Chennai Fabrication Unit", pick sample_custom_data.csv
   - submit → show the "only one factory allowed" conflict dialog
   - narrate the cap, then click Cancel (don't actually replace ABC Steel Works on camera)
   ↓
[/data-intake] (sidebar → Data Intake)
   - show the measurements table (scrollable box, not page-length)
   - point out the "Manage factories & upload data" button → links back to Facilities
   ↓
[/emissions] (sidebar → Emissions)
   - show KPI totals + the ledger table
   ↓
[/hotspots] (sidebar → Hotspots)
   - show the ranked hotspot table, point out the "Critical"/anomaly badge on the top source
   ↓
[/recommendations] (sidebar → Recommendations)
   - show the ranked alternative cards, read one capex/MCDA score aloud
```

### Verbal Script
> "First, the SME / Factory Owner — think of this as the founder of a small
> manufacturing company who owns exactly one plant.
>
> I'm logged in as ABC Steel Works. This is the main dashboard, and
> everything on it is computed live: the pipeline pulls the real
> measurements we've ingested for this factory, calculates emissions
> against emission factors, trains a small Random Forest model with SHAP
> to explain which operational variables drive those emissions, and then
> ranks real decarbonization alternatives using a multi-criteria decision
> model — cost-effectiveness, feasibility, and emission reduction, all
> weighted together.
>
> [point at KPI cards] Here's total emissions analyzed for the period, the
> single biggest emission hotspot — the Blast Furnace — and the top-ranked
> recommendation: renewable electricity procurement, with its actual
> percentage reduction and MCDA score.
>
> Now — as an Owner, I also manage the factory itself, not just its data.
> Let's go to Facilities. [click Facilities] This lists everything I have
> access to. If I try to add a second factory... [click Add Factory, fill
> form, submit] ...the platform stops me. SME accounts are deliberately
> capped at one factory — this mirrors a real small business that owns a
> single plant. To add a different one, I'd have to delete this one first.
> That's a deliberate business rule, not a bug.
>
> Everything downstream — Data Intake, Emissions, Hotspots,
> Recommendations — is scoped to just my factory, and I have full read and
> write access to all of it."

---

## Part 2 — Factory Operator

### Relevance & Privileges
The Factory Operator is **staff, not ownership** — someone who runs the
day-to-day floor operations of one specific, *assigned* factory. Their
privileges are narrower and more operational: they can feed in
measurements and see the operational signals that come out of the
analysis, but the platform gives them a stripped-down, action-oriented
dashboard rather than the full financial/strategic view an Owner gets. They
are also capped at their one assigned factory — they cannot browse or pick
a different one.

### Wireframe / Flow
```
[Log out] → [Login] → demo card "Factory Operator" → Quick Login
   ↓
[/dashboard]
   - point out: the dashboard LOOKS different — "Factory Operations / What needs attention now?"
   - point out: no date-range picker, no "Run analysis" button — this is a passive operational view
   - walk the 4 stat tiles: Records analyzed / Daily feature rows / Coal consumption / Operational status
   - scroll to "Issues to check" — read one operational-signal line aloud
   ↓
[sidebar] — point out the reduced nav: no Facilities, no Carbon Baseline, no Recommendations
   ↓
[/data-intake]
   - show the same measurements table, scoped to just this one factory
   ↓
[/hotspots]
   - show hotspots, same underlying data as the Owner saw, but Operator has no Facilities page to manage the factory itself
```

### Verbal Script
> "Next, the Factory Operator — this is plant floor staff, not the owner.
> Notice the sidebar is shorter: no Facilities page, no Carbon Baseline, no
> Recommendations. This role isn't meant to make strategic decisions — it's
> meant to catch operational problems early.
>
> The dashboard itself is a different component entirely — 'What needs
> attention now?' instead of the Owner's full KPI suite. It surfaces
> operational signals: here, coal intensity improved, but overall coal
> consumption is up twelve percent day over day — worth a floor-level look.
>
> This account is also locked to exactly one factory — the one they're
> assigned to — with no ability to switch, add, or delete factories. If an
> Operator tries to reach a factory-management action outside their scope,
> the backend itself rejects it, not just the UI."

---

## Part 3 — Sustainability Consultant

### Relevance & Privileges
The Consultant is an **external advisor** engaged across multiple client
organizations — think of a decarbonization consultancy hired by several
manufacturers at once. Architecturally this is the "sees everything, owns
nothing" role: a Consultant has visibility into **every factory across
every organization** on the platform (not scoped to one org, unlike every
other role), because their job is comparative analysis across clients. But
critically, **they have zero factory-management privileges** — no Add
Factory, no Delete Factory, no CSV upload. They are explicitly a
monitor-and-analyze role: full read access, zero decision-making /
data-mutating power.

### Wireframe / Flow
```
[Log out] → [Login] → demo card "Sustainability Consultant" → Quick Login
   ↓
[sidebar workspace selector] → click it → show BOTH ABC Steel Works AND XYZ Textile Mills
   - narrate: this is the one role that sees factories across organizations
   ↓
[/facilities]
   - show the table — point out there is NO "Add Factory" button, NO delete icons at all
   - contrast explicitly with what the Owner saw a minute ago
   ↓
[/dashboard] switch factory via sidebar dropdown → XYZ Textile Mills
   - show the dashboard recompute for a completely different factory or org
   ↓
[/recommendations] and [/pathways]
   - show the comparison-oriented pages available to this role only (Pathways isn't in any other role's nav)
```

### Verbal Script
> "Third, the Sustainability Consultant. Watch the workspace selector.
> [click it] Unlike every other role, this account sees every factory
> across every organization on the platform — ABC Steel Works, XYZ Textile
> Mills, and anything else registered. That's because a real consultant is
> typically engaged by multiple client companies at once and needs to
> compare across all of them.
>
> But look at Facilities. [navigate there] There's no 'Add Factory' button.
> There's no delete icon on any row. Compare that to the Owner's view a
> moment ago, which had both. That's deliberate: a Consultant's entire
> value is analysis and recommendation — comparisons, scenarios, ranked
> options — never data ownership or destructive actions. They can look at
> anything, but they can't add, delete, or upload on behalf of a client.
> That boundary is enforced on the backend, not just hidden in the UI —
> even a direct API call from this account to create or delete a factory
> is rejected."

---

## Part 4 — Industry Regulator

### Relevance & Privileges
The Regulator represents a **government or industry-body compliance
office** — jurisdiction-wide oversight, not a single company relationship.
Their access is granted by **jurisdiction** (e.g. "India") rather than by
organization membership: any organization whose registered country/region
matches the regulator's assigned jurisdiction becomes visible to them
automatically, without anyone having to explicitly add them to that
company's account. Unlike the Consultant, a Regulator *does* retain
factory-management privileges (add/delete) within their jurisdiction,
reflecting real regulatory power (e.g. compelling data submission or
deregistering non-compliant facilities) — but their dashboard framing is
compliance-first, not performance-first.

### Wireframe / Flow
```
[Log out] → [Login] → demo card "Industry Regulator" → Quick Login
   ↓
[/dashboard]
   - point out: "Regulatory Monitoring / Environmental performance at a glance"
   - point out: "Authorized facilities: 2" tile — computed from jurisdiction match, not org membership
   - show the "Authorized environmental data" list of factories underneath
   ↓
[/facilities]
   - show Add Factory button IS present (unlike Consultant) — narrate the contrast
   - show Delete icon IS present
   ↓
[/data-intake]
   - show Upload works for this role too (per the explicit access rule: SME, Operator, and Regulator can all ingest data; Consultant cannot)
```

### Verbal Script
> "Finally, the Industry Regulator — a compliance body with authority across
> an entire jurisdiction, not a relationship with one company.
>
> [dashboard] This dashboard is framed completely differently — regulatory
> monitoring, authorized facilities, compliance scope — because this
> account isn't optimizing one factory's costs, it's overseeing an
> industry. Notice 'Authorized facilities: 2.' That number isn't based on
> this account being a member of any organization — it's based on
> jurisdiction matching. Every organization registered under this
> regulator's assigned jurisdiction — India, in this demo — becomes
> visible automatically.
>
> And unlike the Consultant, the Regulator still has real management
> power: [Facilities page] Add Factory and Delete are both here. That
> reflects genuine regulatory authority — a compliance body can require a
> facility to be registered or, in the extreme, delisted — but everything
> else about how they see data stays compliance-oriented rather than
> commercially oriented."

---

## Part 5 — Wrap-Up

### Narration
> "Four roles, one platform, one very deliberate access model:
>
> - **SME Owner** — one factory, full control.
> - **Factory Operator** — one assigned factory, operational view only.
> - **Sustainability Consultant** — every factory, zero management power —
>   pure analysis.
> - **Industry Regulator** — every factory in their jurisdiction, with real
>   compliance authority.
>
> And this isn't just hidden buttons — every one of these boundaries is
> enforced on the backend API itself, so the access model holds even if
> someone bypasses the UI entirely. That's CarbonX."

---

## Appendix — Quick Reference: What Each Role Can Do

| Capability | SME Owner | Factory Operator | Consultant | Regulator |
|---|---|---|---|---|
| See own factory's dashboard/emissions/hotspots/recommendations | ✅ | ✅ | ✅ | ✅ |
| See factories outside their own org | ❌ | ❌ | ✅ (all) | ✅ (jurisdiction only) |
| Add a new factory | ✅ (max 1 total) | ✅ (max 1 assigned) | ❌ | ✅ (no cap) |
| Delete a factory | ✅ (own org) | ✅ (their assigned factory only) | ❌ | ✅ (within jurisdiction) |
| Upload / ingest CSV data | ✅ | ✅ | ❌ | ✅ |
| Manage org members | ✅ | ❌ | ❌ | ❌ |

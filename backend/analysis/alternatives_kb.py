"""
PART 5 & 6 — ALTERNATIVES KNOWLEDGE BASE
==========================================
Structured catalog of emission reduction interventions.
NOT invented by ML or LLM — manually curated domain knowledge.

Each alternative has:
  - Structured applicability rules (industry, process, emission source)
  - Technical requirements and compatibility
  - Quantified impact ranges (reduction %, CAPEX, feasibility)
  - Source/reference and version

⚠️  Impact estimates are ILLUSTRATIVE ASSUMPTIONS for demonstration.
    Real deployment requires site-specific techno-economic assessment.
"""

import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("AlternativesKB")

# ---------------------------------------------------------------------------
# Curated Alternative Catalog (Domain Knowledge — NOT LLM-generated)
# ---------------------------------------------------------------------------
ALTERNATIVES_CATALOG: List[Dict[str, Any]] = [
    {
        "name": "Furnace Efficiency Optimization",
        "category": "efficiency_improvement",
        "description": (
            "Operational improvements to blast furnace: burden distribution optimization, "
            "tuyere condition, injection rate tuning, and heat recovery from top gas. "
            "No capital equipment replacement required."
        ),
        "summary": "Operational efficiency tuning reduces coal consumption per tonne of output.",
        "reference_source": "World Steel Association Best Available Techniques (2023)",
        "target_emission_types": ["CO2"],
        "applicability": {
            "industry_types": ["Steel", "Metal", "Iron"],
            "process_types": ["pyrometallurgical", "blast_furnace"],
            "machine_types": ["Blast Furnace"],
            "emission_source_categories": ["stationary_combustion"],
            "required_metrics": ["Furnace Efficiency", "Coal Consumption", "Production"],
        },
        "impact": {
            "reduction_min_pct": 5.0,
            "reduction_typical_pct": 8.0,
            "reduction_max_pct": 12.0,
            "capex_range_low": 50000,
            "capex_range_high": 500000,
            "capex_currency": "USD",
            "opex_change_pct": -2.0,
            "payback_years_typical": 1.5,
            "implementation_time_months": 3,
            "feasibility_score": 0.90,
            "technical_readiness_level": 9,
            "feasibility_notes": "Mature technology, no major capital expenditure required.",
            "assumptions": Json({
                "baseline_furnace_efficiency": 0.82,
                "target_furnace_efficiency": 0.88,
                "disclaimer": "DEMONSTRATION ASSUMPTION"
            })
        }
    },
    {
        "name": "Natural Gas Substitution for Coal",
        "category": "fuel_switch",
        "description": (
            "Partial or full replacement of metallurgical coal with natural gas "
            "in supplementary heating and injection processes. Reduces Scope 1 CO2 "
            "significantly due to lower carbon content of gas (2.0 vs 2.4 kg CO2/kg equivalent)."
        ),
        "summary": "Switching coal injection to natural gas reduces per-unit CO2 emissions by ~25%.",
        "reference_source": "IEA Steel Sector Roadmap (2021); IPCC AR6 Chapter 11",
        "target_emission_types": ["CO2", "NOx"],
        "applicability": {
            "industry_types": ["Steel", "Metal"],
            "process_types": ["pyrometallurgical", "stationary_combustion"],
            "machine_types": ["Blast Furnace", "Converter"],
            "emission_source_categories": ["stationary_combustion"],
            "required_metrics": ["Coal Consumption", "Natural Gas", "Production"],
        },
        "impact": {
            "reduction_min_pct": 18.0,
            "reduction_typical_pct": 25.0,
            "reduction_max_pct": 35.0,
            "capex_range_low": 500000,
            "capex_range_high": 5000000,
            "capex_currency": "USD",
            "opex_change_pct": 5.0,
            "payback_years_typical": 4.0,
            "implementation_time_months": 12,
            "feasibility_score": 0.70,
            "technical_readiness_level": 8,
            "feasibility_notes": "Requires gas infrastructure. May increase OPEX if gas price > coal.",
            "assumptions": Json({
                "gas_price_usd_per_mmbtu": 5.0,
                "coal_price_usd_per_tonne": 120.0,
                "disclaimer": "DEMONSTRATION ASSUMPTION"
            })
        }
    },
    {
        "name": "Electric Arc Furnace (EAF) Conversion",
        "category": "electrification",
        "description": (
            "Transition from blast furnace + basic oxygen furnace (BF-BOF) route "
            "to electric arc furnace (EAF) using scrap steel or direct reduced iron (DRI). "
            "Eliminates Scope 1 coal combustion emissions entirely from melting stage."
        ),
        "summary": "EAF route eliminates direct coal combustion emissions (~40% total reduction).",
        "reference_source": "Mission Possible Partnership — Heavy Industry Net-Zero (2021)",
        "target_emission_types": ["CO2"],
        "applicability": {
            "industry_types": ["Steel"],
            "process_types": ["pyrometallurgical"],
            "machine_types": ["Blast Furnace"],
            "emission_source_categories": ["stationary_combustion"],
            "required_metrics": ["Coal Consumption", "Electricity", "Production"],
        },
        "impact": {
            "reduction_min_pct": 30.0,
            "reduction_typical_pct": 40.0,
            "reduction_max_pct": 55.0,
            "capex_range_low": 50000000,
            "capex_range_high": 500000000,
            "capex_currency": "USD",
            "opex_change_pct": 15.0,
            "payback_years_typical": 12.0,
            "implementation_time_months": 48,
            "feasibility_score": 0.35,
            "technical_readiness_level": 9,
            "feasibility_notes": (
                "Technology mature but requires massive capital. Practical only at major lifecycle "
                "decision point. Increases electricity demand significantly."
            ),
            "assumptions": Json({
                "scrap_availability_ratio": 0.7,
                "electricity_grid_carbon_intensity": 0.7,
                "disclaimer": "DEMONSTRATION ASSUMPTION"
            })
        }
    },
    {
        "name": "Renewable Electricity Procurement (PPA/REC)",
        "category": "renewable_energy",
        "description": (
            "Power Purchase Agreement (PPA) or Renewable Energy Certificates (RECs) "
            "to decarbonize grid electricity consumption. Reduces Scope 2 emissions "
            "from electricity use without changing processes."
        ),
        "summary": "Green electricity procurement reduces Scope 2 CO2 from grid power.",
        "reference_source": "GHG Protocol Scope 2 Guidance (2015); RE100 Initiative",
        "target_emission_types": ["CO2"],
        "applicability": {
            "industry_types": ["Steel", "Textile", "Chemical", "Cement", "Food", "Manufacturing"],
            "process_types": [],
            "machine_types": [],
            "emission_source_categories": ["electricity_consumption"],
            "required_metrics": ["Electricity"],
        },
        "impact": {
            "reduction_min_pct": 50.0,
            "reduction_typical_pct": 75.0,
            "reduction_max_pct": 100.0,
            "capex_range_low": 10000,
            "capex_range_high": 1000000,
            "capex_currency": "USD",
            "opex_change_pct": 8.0,
            "payback_years_typical": 5.0,
            "implementation_time_months": 6,
            "feasibility_score": 0.75,
            "technical_readiness_level": 9,
            "feasibility_notes": "Highly feasible; premium on electricity cost. No process change needed.",
            "assumptions": Json({
                "current_grid_carbon_intensity_kg_per_kwh": 0.7,
                "renewable_premium_pct": 10.0,
                "disclaimer": "DEMONSTRATION ASSUMPTION"
            })
        }
    },
    {
        "name": "Top Gas Heat Recovery",
        "category": "heat_recovery",
        "description": (
            "Capture and reuse waste heat from blast furnace top gas for preheating "
            "blast air (cowper stoves optimization) or power generation (top pressure "
            "recovery turbine). Reduces supplementary fuel requirements."
        ),
        "summary": "Heat recovery from furnace top gas reduces supplementary fuel consumption by ~10-15%.",
        "reference_source": "EUROFER Low Carbon Roadmap (2019)",
        "target_emission_types": ["CO2"],
        "applicability": {
            "industry_types": ["Steel", "Iron"],
            "process_types": ["pyrometallurgical", "heat_recovery"],
            "machine_types": ["Blast Furnace"],
            "emission_source_categories": ["stationary_combustion"],
            "required_metrics": ["Coal Consumption", "Natural Gas", "Furnace Temperature"],
        },
        "impact": {
            "reduction_min_pct": 8.0,
            "reduction_typical_pct": 12.0,
            "reduction_max_pct": 18.0,
            "capex_range_low": 1000000,
            "capex_range_high": 15000000,
            "capex_currency": "USD",
            "opex_change_pct": -3.0,
            "payback_years_typical": 3.5,
            "implementation_time_months": 18,
            "feasibility_score": 0.65,
            "technical_readiness_level": 8,
            "feasibility_notes": "Well-proven in large steel plants. Requires capital investment for recovery system.",
            "assumptions": Json({
                "top_gas_utilization_rate": 0.8,
                "disclaimer": "DEMONSTRATION ASSUMPTION"
            })
        }
    },
]


class AlternativesKnowledgeBase:
    """
    Manages the curated Alternative catalog in the database.
    Provides lookup, filtering, and applicability matching.
    """

    def __init__(self, conn):
        self.conn = conn

    def seed_alternatives(self) -> List[str]:
        """
        Populates alternatives, alternative_applicability, and alternative_impacts
        tables from ALTERNATIVES_CATALOG. Idempotent (uses ON CONFLICT DO NOTHING).
        Returns list of alternative UUIDs seeded.
        """
        seeded_ids = []

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get CO2 emission type id
            cur.execute("SELECT id FROM emission_types WHERE name='CO2';")
            co2_id = str(cur.fetchone()["id"])

            for alt in ALTERNATIVES_CATALOG:
                # alternatives table
                cur.execute(
                    """
                    INSERT INTO alternatives (
                        name, description, category,
                        target_emission_types, summary, reference_source, version
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 1)
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                    """,
                    (
                        alt["name"], alt["description"],
                        alt["category"], alt["target_emission_types"],
                        alt["summary"], alt["reference_source"]
                    )
                )
                row = cur.fetchone()
                if not row:
                    cur.execute("SELECT id FROM alternatives WHERE name=%s;", (alt["name"],))
                    row = cur.fetchone()
                alt_id = str(row["id"])
                seeded_ids.append(alt_id)

                # Clean prior applicability and impacts to keep seeding strictly idempotent
                cur.execute("DELETE FROM alternative_applicability WHERE alternative_id = %s;", (alt_id,))
                cur.execute("DELETE FROM alternative_impacts WHERE alternative_id = %s;", (alt_id,))

                # alternative_applicability
                app = alt["applicability"]
                cur.execute(
                    """
                    INSERT INTO alternative_applicability (
                        alternative_id, industry_types, process_types,
                        machine_types, emission_source_categories, required_metrics
                    )
                    VALUES (%s, %s, %s, %s, %s::emission_source_category_enum[], %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (
                        alt_id,
                        app.get("industry_types") or [],
                        app.get("process_types") or [],
                        app.get("machine_types") or [],
                        app.get("emission_source_categories") or [],
                        app.get("required_metrics") or []
                    )
                )

                # alternative_impacts
                imp = alt["impact"]
                cur.execute(
                    """
                    INSERT INTO alternative_impacts (
                        alternative_id, emission_type_id,
                        reduction_min_pct, reduction_typical_pct, reduction_max_pct,
                        capex_range_low, capex_range_high, capex_currency,
                        opex_change_pct, payback_years_typical,
                        implementation_time_months, feasibility_score,
                        feasibility_notes, technical_readiness_level,
                        assumptions, reference_source, valid_from, version
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '2024-01-01', 1)
                    ON CONFLICT DO NOTHING;
                    """,
                    (
                        alt_id, co2_id,
                        imp["reduction_min_pct"], imp["reduction_typical_pct"], imp["reduction_max_pct"],
                        imp.get("capex_range_low"), imp.get("capex_range_high"),
                        imp.get("capex_currency", "USD"),
                        imp.get("opex_change_pct"), imp.get("payback_years_typical"),
                        imp.get("implementation_time_months"), imp.get("feasibility_score"),
                        imp.get("feasibility_notes"), imp.get("technical_readiness_level"),
                        imp["assumptions"],
                        alt["reference_source"]
                    )
                )

            self.conn.commit()

        logger.info(f"Seeded {len(seeded_ids)} alternatives into knowledge base")
        return seeded_ids

    def find_applicable(
        self,
        industry_type: str,
        available_metrics: List[str],
        emission_source_category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Filters alternatives applicable to a given factory based on:
        - Industry type match
        - Required metrics availability
        - Emission source category
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                  SELECT DISTINCT ON (a.name)
                      a.id, a.name, a.category, a.description, a.summary,
                       a.reference_source, a.target_emission_types,
                       aa.industry_types, aa.required_metrics,
                       aa.emission_source_categories,
                       ai.reduction_min_pct, ai.reduction_typical_pct, ai.reduction_max_pct,
                       ai.capex_range_low, ai.capex_range_high, ai.capex_currency,
                       ai.opex_change_pct, ai.payback_years_typical,
                       ai.implementation_time_months, ai.feasibility_score,
                       ai.feasibility_notes, ai.technical_readiness_level,
                       ai.assumptions, ai.id as impact_id
                FROM alternatives a
                JOIN alternative_applicability aa ON aa.alternative_id = a.id
                JOIN alternative_impacts ai ON ai.alternative_id = a.id
                WHERE a.is_active = TRUE
                ORDER BY a.name, a.version DESC, ai.created_at DESC, aa.created_at DESC;
                """,
                ()
            )
            all_alts = [dict(r) for r in cur.fetchall()]

        applicable = []
        norm_industry = industry_type.lower().strip()
        norm_metrics = {m.lower().strip() for m in available_metrics}

        for alt in all_alts:
            ind_types = [i.lower() for i in (alt.get("industry_types") or [])]
            req_metrics = [m.lower() for m in (alt.get("required_metrics") or [])]
            src_cats = alt.get("emission_source_categories") or []

            # Industry match: empty means universal
            if ind_types and norm_industry not in ind_types:
                continue

            # Required metrics check
            if req_metrics and not all(m in norm_metrics for m in req_metrics):
                continue

            # Source category match (optional filter)
            if emission_source_category and src_cats:
                if emission_source_category not in src_cats:
                    continue

            applicable.append(alt)

        logger.info(f"Found {len(applicable)} applicable alternatives for {industry_type}")
        return applicable

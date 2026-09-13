"""
Ingest & Analyze Custom CSV Data
================================
Supports user-supplied custom CSV files for any manufacturing facility.
Mirrors seed_demo_data.py dynamic architecture:
  1. Auto-detects / registers Organization & Factory
  2. Auto-discovers and registers new Dynamic Metric Definitions
  3. Batch ingests time-series measurements with validation & unit handling
  4. Automatically executes the 10-stage AI/ML Analysis Pipeline (emissions, SHAP, MCDA recommendations)

Can be imported as a module or executed via CLI:
  python ingest_custom_csv.py path/to/measurements.csv --factory-name "Acme Glass" --industry "Glass"
"""

import os
import sys
import csv
import argparse
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
from dotenv import load_dotenv

from storage_service import DataStorageService
from analysis.pipeline import AnalysisPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CustomCSVIngest")

load_dotenv()


def infer_metric_metadata(metric_name: str, sample_values: List[float]) -> Dict[str, Any]:
    """
    Infers category, units, and validation bounds from the metric column name.
    """
    name_lower = metric_name.lower()

    # Category and unit heuristics
    if any(term in name_lower for term in ["coal", "diesel", "gas", "fuel", "oil", "coke", "petrol"]):
        category = "fuel"
        unit = "kg/day" if "coal" in name_lower or "coke" in name_lower else "m3/day" if "gas" in name_lower else "litre/day"
    elif any(term in name_lower for term in ["electric", "power", "energy", "kwh", "mwh"]):
        category = "energy"
        unit = "kWh/day"
    elif any(term in name_lower for term in ["prod", "output", "steel", "fabric", "goods", "units", "tons", "tonnes"]):
        category = "production"
        unit = "tonne/day" if any(t in name_lower for t in ["tonne", "ton", "steel"]) else "units/day"
    elif any(term in name_lower for term in ["waste", "scrap", "effluent", "sludge"]):
        category = "waste"
        unit = "kg/day"
    elif any(term in name_lower for term in ["water", "discharge"]):
        category = "water"
        unit = "m3/day"
    elif any(term in name_lower for term in ["temp", "temperature"]):
        category = "process"
        unit = "°C"
    elif any(term in name_lower for term in ["press", "pressure"]):
        category = "process"
        unit = "bar"
    elif any(term in name_lower for term in ["efficien", "ratio", "pct", "percent"]):
        category = "efficiency"
        unit = "%"
    else:
        category = "process"
        unit = "units"

    # Derive baseline bounds from sample data if available
    rules = {}
    if sample_values:
        min_v = min(sample_values)
        max_v = max(sample_values)
        padding = (max_v - min_v) * 0.5 if max_v > min_v else max(abs(max_v) * 0.5, 10.0)
        rules = {
            "min": round(max(0.0, min_v - padding), 2) if min_v >= 0 else round(min_v - padding, 2),
            "max": round(max_v + padding, 2),
            "reject_out_of_bounds": False,
        }

    return {
        "name": metric_name.strip(),
        "display_name": metric_name.strip().replace("_", " ").title(),
        "category": category,
        "data_type": "numeric",
        "unit": unit,
        "validation_rules": rules,
        "description": f"Custom metric '{metric_name}' ingested from user CSV dataset.",
    }


def parse_csv(csv_path: str) -> Tuple[str, List[Dict[str, Any]], List[str]]:
    """
    Parses either:
      Format A (Wide/Pivoted Table):
        date, Production, Coal Consumption, Electricity, Furnace Temperature, ...
      Format B (Long/EAV Table):
        date, metric, value, unit (optional)
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = [h.strip() for h in (reader.fieldnames or [])]
        rows = [row for row in reader]

    if not rows:
        raise ValueError(f"CSV '{csv_path}' is empty or has no data rows.")

    headers_lower = [h.lower() for h in headers]

    # Find date / timestamp column
    date_col = None
    for candidate in ["recorded_at", "date", "timestamp", "time", "day", "period_start"]:
        if candidate in headers_lower:
            date_col = headers[headers_lower.index(candidate)]
            break

    if not date_col:
        raise ValueError(
            f"Missing required date column in CSV! Found columns: {headers}. "
            f"Expected one of: date, recorded_at, timestamp, time, day."
        )

    # Check for Long format: has metric/parameter AND value
    has_metric_col = any(c in headers_lower for c in ["metric", "metric_name", "parameter", "variable"])
    has_value_col = any(c in headers_lower for c in ["value", "numeric_value", "amount", "reading"])

    if has_metric_col and has_value_col:
        format_type = "LONG"
        metric_col = headers[headers_lower.index(next(c for c in ["metric", "metric_name", "parameter", "variable"] if c in headers_lower))]
        val_col = headers[headers_lower.index(next(c for c in ["value", "numeric_value", "amount", "reading"] if c in headers_lower))]
        metric_names = sorted(list({r[metric_col].strip() for r in rows if r.get(metric_col)}))
    else:
        format_type = "WIDE"
        metric_names = [h for h in headers if h != date_col]

    return format_type, rows, metric_names


def ingest_and_analyze_csv(
    csv_path: str,
    factory_name: str = "Custom Manufacturing Plant",
    factory_code: Optional[str] = None,
    industry_type: str = "Manufacturing",
    org_name: str = "Enterprise Operations",
    org_slug: str = "enterprise-operations",
    run_analysis: bool = True,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Loads custom CSV, registers metadata, inserts time-series measurements,
    and runs the 10-stage AI/ML analysis pipeline.
    """
    service = DataStorageService()
    logger.info(f"Connecting to database and processing CSV: {csv_path}")

    # Generate clean factory code if not provided
    if not factory_code:
        factory_code = f"custom-{abs(hash(factory_name)) % 10000:04d}"

    # 1. Organization Setup
    org = service.create_organization(
        name=org_name,
        slug=org_slug,
        industry_sector=f"{industry_type} Sector",
        country="India",
        settings={"data_source": "custom_csv_upload"}
    )
    org_id = org["id"]

    # 2. Factory Setup
    factory = service.create_factory(
        organization_id=org_id,
        name=factory_name,
        code=factory_code,
        industry_type=industry_type,
        location="Industrial Facility",
        metadata={"imported_from": os.path.basename(csv_path)}
    )
    factory_id = factory["id"]
    logger.info(f"Target Factory: {factory['name']} (ID: {factory_id}, Code: {factory_code})")

    # 3. Parse CSV Structure
    format_type, rows, metric_names = parse_csv(csv_path)
    logger.info(f"CSV Format: {format_type} with {len(metric_names)} metrics: {metric_names}")

    # Gather sample values to infer dynamic bounds
    headers = list(rows[0].keys())
    date_col = next(h for h in headers if h.lower() in ["recorded_at", "date", "timestamp", "time", "day", "period_start"])

    # 4. Register Dynamic Metric Definitions
    for m_name in metric_names:
        sample_vals = []
        if format_type == "WIDE":
            for r in rows[:50]:
                try:
                    val = float(r.get(m_name, "").strip())
                    sample_vals.append(val)
                except (ValueError, AttributeError):
                    pass
        else:
            metric_col = next(h for h in headers if h.lower() in ["metric", "metric_name", "parameter", "variable"])
            val_col = next(h for h in headers if h.lower() in ["value", "numeric_value", "amount", "reading"])
            for r in rows[:50]:
                if r.get(metric_col, "").strip().lower() == m_name.lower():
                    try:
                        sample_vals.append(float(r.get(val_col, "")))
                    except (ValueError, AttributeError):
                        pass

        meta = infer_metric_metadata(m_name, sample_vals)
        service.create_metric_definition(
            organization_id=org_id,
            factory_id=factory_id,
            name=meta["name"],
            display_name=meta["display_name"],
            category=meta["category"],
            data_type=meta["data_type"],
            unit=meta["unit"],
            validation_rules=meta["validation_rules"],
            description=meta["description"]
        )

    logger.info(f"Registered {len(metric_names)} dynamic metrics for factory {factory_code}")

    # 5. Build Measurements
    measurements_to_ingest = []
    earliest_date = None
    latest_date = None

    for r in rows:
        raw_date_str = r.get(date_col, "").strip()
        if not raw_date_str:
            continue

        # Parse date / day integer
        try:
            if raw_date_str.isdigit():
                # Day offset relative to current month start
                rec_dt = datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc) + timedelta(days=int(raw_date_str) - 1)
            else:
                cleaned_date = raw_date_str.replace("Z", "+00:00")
                if len(cleaned_date) == 10:  # YYYY-MM-DD
                    rec_dt = datetime.fromisoformat(cleaned_date).replace(tzinfo=timezone.utc)
                else:
                    rec_dt = datetime.fromisoformat(cleaned_date)
        except Exception:
            rec_dt = datetime.now(timezone.utc)

        if earliest_date is None or rec_dt < earliest_date:
            earliest_date = rec_dt
        if latest_date is None or rec_dt > latest_date:
            latest_date = rec_dt

        day_start = rec_dt.replace(hour=0, minute=0, second=0).isoformat()
        day_end = (rec_dt.replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat()

        if format_type == "WIDE":
            for m_name in metric_names:
                raw_val = r.get(m_name, "").strip()
                if not raw_val:
                    continue
                try:
                    num_val = float(raw_val)
                    measurements_to_ingest.append({
                        "factory_id": factory_id,
                        "metric_name_or_id": m_name,
                        "value": num_val,
                        "recorded_at": rec_dt.isoformat(),
                        "period_start": day_start,
                        "period_end": day_end,
                        "notes": f"Ingested from custom CSV ({os.path.basename(csv_path)})",
                    })
                except ValueError:
                    continue
        else:
            metric_col = next(h for h in headers if h.lower() in ["metric", "metric_name", "parameter", "variable"])
            val_col = next(h for h in headers if h.lower() in ["value", "numeric_value", "amount", "reading"])
            unit_col = next((h for h in headers if h.lower() in ["unit", "raw_unit"]), None)

            m_name = r.get(metric_col, "").strip()
            raw_val = r.get(val_col, "").strip()
            raw_unit = r.get(unit_col, "").strip() if unit_col else None

            try:
                num_val = float(raw_val)
                item = {
                    "factory_id": factory_id,
                    "metric_name_or_id": m_name,
                    "value": num_val,
                    "recorded_at": rec_dt.isoformat(),
                    "period_start": day_start,
                    "period_end": day_end,
                    "notes": f"Ingested from custom CSV ({os.path.basename(csv_path)})",
                }
                if raw_unit:
                    item["raw_unit"] = raw_unit
                measurements_to_ingest.append(item)
            except ValueError:
                continue

    # 6. Ingest into Measurements Table
    ingest_result = service.batch_ingest(measurements_to_ingest)
    logger.info(
        f"Measurements Ingestion: {ingest_result['succeeded']}/{ingest_result['total']} succeeded "
        f"({ingest_result['failed']} failed)"
    )

    result: Dict[str, Any] = {
        "status": "SUCCESS",
        "factory_id": factory_id,
        "factory_name": factory_name,
        "factory_code": factory_code,
        "industry_type": industry_type,
        "metrics_registered": metric_names,
        "measurements_ingested": ingest_result["succeeded"],
        # Lets callers (e.g. the frontend dashboard) point their date-range
        # picker at the data that was actually just ingested, instead of
        # defaulting to "last 14 days" and finding nothing if the CSV
        # contains historical dates.
        "data_period_start": earliest_date.isoformat() if earliest_date else None,
        "data_period_end": latest_date.isoformat() if latest_date else None,
    }

    # 7. Run AI/ML Analysis Pipeline if requested
    if run_analysis and ingest_result["succeeded"] > 0:
        p_start = period_start or earliest_date or datetime.now(timezone.utc) - timedelta(days=30)
        p_end = period_end or latest_date or datetime.now(timezone.utc)

        logger.info(f"Running 10-Stage Analysis Pipeline for period {p_start.date()} to {p_end.date()}...")
        conn = service.get_connection()
        try:
            pipeline = AnalysisPipeline(conn)
            analysis_output = pipeline.run(
                factory_id=factory_id,
                period_start=p_start,
                period_end=p_end,
                emission_type="CO2"
            )
            summary = analysis_output.get("summary", {})
            contrib = analysis_output.get("contribution", {})
            top_rec = analysis_output.get("recommendation", {}).get("top_recommendation", {})
            result["analysis"] = {
                "total_co2_kg": summary.get("TOTAL_CO2_KG_ANALYZED") or contrib.get("total_emission_kg"),
                "primary_hotspot": summary.get("EMISSION_HOTSPOT") or contrib.get("hotspot_source_name"),
                "hotspot_pct": summary.get("HOTSPOT_CONTRIBUTION_PCT") or contrib.get("hotspot_contribution_pct"),
                "top_recommendation": top_rec,
                "pipeline_stages": analysis_output.get("pipeline_stages"),
            }
            logger.info("10-Stage Analysis Pipeline Completed Successfully!")
        finally:
            conn.close()

    return result


def main():
    parser = argparse.ArgumentParser(description="Ingest custom CSV file and run CarbonX analysis pipeline.")
    parser.add_argument("csv_file", help="Path to your custom CSV file")
    parser.add_argument("--factory-name", default="Custom Facility", help="Name of your factory")
    parser.add_argument("--factory-code", default=None, help="Unique code for the factory (e.g. custom-01)")
    parser.add_argument("--industry", default="Manufacturing", help="Industry sector (e.g. Steel, Textile, Chemicals, Glass)")
    parser.add_argument("--org-name", default="IndusTech Sustainability Global", help="Organization name")
    parser.add_argument("--no-analyze", action="store_true", help="Skip running the 10-stage AI analysis pipeline")

    args = parser.parse_args()

    try:
        output = ingest_and_analyze_csv(
            csv_path=args.csv_file,
            factory_name=args.factory_name,
            factory_code=args.factory_code,
            industry_type=args.industry,
            org_name=args.org_name,
            run_analysis=not args.no_analyze
        )

        print("\n" + "=" * 70)
        print("  CUSTOM CSV INGESTION & ANALYSIS COMPLETED")
        print("=" * 70)
        print(f"Factory:              {output['factory_name']} (ID: {output['factory_id']})")
        print(f"Code:                 {output['factory_code']}")
        print(f"Sector:               {output['industry_type']}")
        print(f"Metrics Registered:   {len(output['metrics_registered'])} ({', '.join(output['metrics_registered'])})")
        print(f"Measurements Stored:  {output['measurements_ingested']}")

        if "analysis" in output:
            analysis = output["analysis"]
            print("\nAI/ML Carbon Analysis:")
            print(f"  • Total CO2:         {analysis.get('total_co2_kg')} kg")
            print(f"  • Primary Hotspot:   {analysis.get('primary_hotspot')}")
            top_rec = analysis.get("top_recommendation")
            if top_rec:
                print(f"  • Top Action:        {top_rec.get('name')}")
                print(f"  • Est Reduction:     {top_rec.get('reduction_pct')}% ({top_rec.get('estimated_reduction_kg')} kg CO2)")
                print(f"  • MCDA Score:        {top_rec.get('mcda_score')}")
        print("=" * 70 + "\n")

    except Exception as e:
        logger.error(f"Execution failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()

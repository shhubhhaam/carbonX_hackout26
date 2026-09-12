"""
Seed Demo Data Script:
Proves the variable industrial data architecture by populating:
  - demo1 (Steel Factory) with 7 distinct steel parameters and 10 days of measurements
  - demo2 (Textile Factory) with 7 completely different textile parameters and 10 days of measurements
All stored using the SAME dynamic platform tables (metric_definitions & measurements).
"""

import sys
import logging
from datetime import datetime, timedelta, timezone
from storage_service import DataStorageService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SeedDemoData")

def seed_all():
    service = DataStorageService()
    logger.info("Initializing Data Storage Layer Seeding...")

    # 1. Organization Creation
    org = service.create_organization(
        name="IndusTech Sustainability Global",
        slug="industech-global",
        industry_sector="Multi-Sector Heavy Industries",
        country="India",
        timezone_str="Asia/Kolkata",
        settings={"currency": "INR", "ghg_protocol": "ISO 14064-1"}
    )
    org_id = org["id"]
    logger.info(f"Created Organization: {org['name']} (ID: {org_id})")

    # 2. Factory demo1: ABC Steel Works
    factory_steel = service.create_factory(
        organization_id=org_id,
        name="ABC Steel Works",
        code="demo1",
        industry_type="Steel",
        location="Jamshedpur Industrial Zone, Jharkhand",
        latitude=22.8046,
        longitude=86.2029,
        commissioned_at="2012-04-15",
        metadata={"production_capacity_tpa": 1200000, "primary_fuel": "Coking Coal & Natural Gas"}
    )
    steel_id = factory_steel["id"]
    logger.info(f"Created Factory demo1: {factory_steel['name']} (ID: {steel_id})")

    # Structure for demo1
    dept_steel_smelt = service.create_department(steel_id, "Iron & Smelting Division", "Blast furnace & raw materials handling")
    dept_steel_roll = service.create_department(steel_id, "Hot Rolling Mill", "Reheating furnace and rolling lines")

    proc_bf1 = service.create_process(steel_id, "Blast Furnace Operation", "pyrometallurgical", dept_steel_smelt["id"])
    proc_roll = service.create_process(steel_id, "Hot Strip Rolling", "mechanical_forming", dept_steel_roll["id"])

    mach_bf1 = service.create_machine(
        steel_id, "Blast Furnace #1", proc_bf1["id"],
        machine_type="Blast Furnace", model_number="BF-5000T", rated_capacity=5000, capacity_unit="tonne/day"
    )
    mach_roll = service.create_machine(
        steel_id, "Rolling Mill Alpha", proc_roll["id"],
        machine_type="Reversing Roughing Mill", model_number="RRM-2000", rated_capacity=3500, capacity_unit="tonne/day"
    )

    ds_scada_steel = service.create_data_source(steel_id, "SCADA_BF1_SYSTEM", "SCADA", {"protocol": "OPC-UA", "polling_sec": 60})
    ds_erp_steel = service.create_data_source(steel_id, "SAP_PLANT_ERP", "ERP", {"endpoint": "https://erp.abcsteel.local"})

    # 3. Dynamic Metric Definitions for demo1 (Steel Factory)
    steel_metrics = [
        {
            "name": "Production",
            "display_name": "Crude Steel Production",
            "category": "production",
            "data_type": "numeric",
            "unit": "tonne/day",
            "validation_rules": {"min": 50.0, "max": 200.0, "reject_out_of_bounds": False},
            "description": "Daily total liquid crude steel output"
        },
        {
            "name": "Coal Consumption",
            "display_name": "Coking Coal Consumption",
            "category": "fuel",
            "data_type": "numeric",
            "unit": "kg/day",
            "validation_rules": {"min": 1000.0, "max": 10000.0, "reject_out_of_bounds": False},
            "description": "Daily metallurgical coking coal consumed in furnace"
        },
        {
            "name": "Natural Gas",
            "display_name": "Natural Gas Consumption",
            "category": "fuel",
            "data_type": "numeric",
            "unit": "m3/day",
            "validation_rules": {"min": 500.0, "max": 5000.0, "reject_out_of_bounds": False},
            "description": "Natural gas used for supplementary heating"
        },
        {
            "name": "Electricity",
            "display_name": "Electricity Consumption",
            "category": "energy",
            "data_type": "numeric",
            "unit": "kWh/day",
            "validation_rules": {"min": 2000.0, "max": 20000.0, "reject_out_of_bounds": False},
            "description": "Total auxiliary and plant power usage"
        },
        {
            "name": "Furnace Temperature",
            "display_name": "Furnace Operating Temperature",
            "category": "process",
            "data_type": "numeric",
            "unit": "°C",
            "validation_rules": {"min": 650.0, "max": 1100.0, "reject_out_of_bounds": False},
            "description": "Blast furnace hearth temperature reading"
        },
        {
            "name": "Furnace Pressure",
            "display_name": "Furnace Top Gas Pressure",
            "category": "process",
            "data_type": "numeric",
            "unit": "bar",
            "validation_rules": {"min": 1.0, "max": 4.0, "reject_out_of_bounds": False},
            "description": "Internal top pressure of blast furnace vessel"
        },
        {
            "name": "Furnace Efficiency",
            "display_name": "Furnace Thermal Efficiency",
            "category": "efficiency",
            "data_type": "numeric",
            "unit": "%",
            "validation_rules": {"min": 50.0, "max": 100.0, "reject_out_of_bounds": False},
            "description": "Calculated thermal and thermodynamic efficiency percentage"
        },
    ]

    for m in steel_metrics:
        service.create_metric_definition(
            organization_id=org_id,
            factory_id=steel_id,
            name=m["name"],
            display_name=m["display_name"],
            category=m["category"],
            data_type=m["data_type"],
            unit=m["unit"],
            validation_rules=m["validation_rules"],
            description=m["description"]
        )
    logger.info(f"Registered {len(steel_metrics)} dynamic metrics for demo1 (Steel)")

    # 4. Factory demo2: XYZ Textile Mills
    factory_textile = service.create_factory(
        organization_id=org_id,
        name="XYZ Textile Mills",
        code="demo2",
        industry_type="Textile",
        location="Surat Mega Textile Park, Gujarat",
        latitude=21.1702,
        longitude=72.8311,
        commissioned_at="2016-09-20",
        metadata={"loom_count": 240, "annual_output_meters": 45000000}
    )
    textile_id = factory_textile["id"]
    logger.info(f"Created Factory demo2: {factory_textile['name']} (ID: {textile_id})")

    # Structure for demo2
    dept_textile_weave = service.create_department(textile_id, "Weaving Department", "High-speed air-jet looms")
    dept_textile_dye = service.create_department(textile_id, "Dyeing & Processing Unit", "Jet dyeing, bleaching and finishing")

    proc_weaving = service.create_process(textile_id, "Air-Jet Weaving", "weaving", dept_textile_weave["id"])
    proc_dyeing = service.create_process(textile_id, "Reactive Fabric Dyeing", "wet_processing", dept_textile_dye["id"])

    mach_loom = service.create_machine(
        textile_id, "Air-Jet Loom Line 1", proc_weaving["id"],
        machine_type="Air-Jet Loom", model_number="AJ-800", rated_capacity=15000, capacity_unit="m/day"
    )
    mach_dye_vat = service.create_machine(
        textile_id, "Dyeing Vessel #3", proc_dyeing["id"],
        machine_type="Overflow Jet Dyeing Machine", model_number="JD-500", rated_capacity=500, capacity_unit="kg/batch"
    )

    ds_iot_textile = service.create_data_source(textile_id, "IOT_FLOW_AND_POWER_SENSORS", "IOT", {"firmware": "v3.2", "network": "MQTT"})
    ds_scada_textile = service.create_data_source(textile_id, "SCADA_DYEING_CONTROL", "SCADA", {"protocol": "Modbus-TCP"})

    # 5. Dynamic Metric Definitions for demo2 (Textile Factory)
    textile_metrics = [
        {
            "name": "Fabric Production",
            "display_name": "Daily Fabric Production",
            "category": "production",
            "data_type": "numeric",
            "unit": "m/day",
            "validation_rules": {"min": 5000.0, "max": 25000.0, "reject_out_of_bounds": False},
            "description": "Total linear meters of fabric woven per day"
        },
        {
            "name": "Water Consumption",
            "display_name": "Process Water Consumption",
            "category": "water",
            "data_type": "numeric",
            "unit": "m3/day",
            "validation_rules": {"min": 50.0, "max": 500.0, "reject_out_of_bounds": False},
            "description": "Total freshwater drawn for dyeing and scouring"
        },
        {
            "name": "Dye Consumption",
            "display_name": "Synthetic Dye Consumption",
            "category": "chemical",
            "data_type": "numeric",
            "unit": "kg/day",
            "validation_rules": {"min": 20.0, "max": 300.0, "reject_out_of_bounds": False},
            "description": "Reactive dye powder utilized in wet processing"
        },
        {
            "name": "Electricity",
            "display_name": "Plant Electricity Consumption",
            "category": "energy",
            "data_type": "numeric",
            "unit": "kWh/day",
            "validation_rules": {"min": 1000.0, "max": 8000.0, "reject_out_of_bounds": False},
            "description": "Total plant power consumption"
        },
        {
            "name": "Humidity",
            "display_name": "Weaving Hall Relative Humidity",
            "category": "environmental",
            "data_type": "numeric",
            "unit": "%",
            "validation_rules": {"min": 40.0, "max": 90.0, "reject_out_of_bounds": False},
            "description": "Ambient relative humidity in weaving department"
        },
        {
            "name": "Machine Speed",
            "display_name": "Average Loom Speed",
            "category": "process",
            "data_type": "numeric",
            "unit": "rpm",
            "validation_rules": {"min": 500.0, "max": 1000.0, "reject_out_of_bounds": False},
            "description": "Average operating speed across active looms"
        },
        {
            "name": "Fabric Waste",
            "display_name": "Selvedge & Defect Fabric Waste",
            "category": "waste",
            "data_type": "numeric",
            "unit": "kg/day",
            "validation_rules": {"min": 5.0, "max": 100.0, "reject_out_of_bounds": False},
            "description": "Discarded edge trimmings and defect fabric cuttings"
        },
    ]

    for m in textile_metrics:
        service.create_metric_definition(
            organization_id=org_id,
            factory_id=textile_id,
            name=m["name"],
            display_name=m["display_name"],
            category=m["category"],
            data_type=m["data_type"],
            unit=m["unit"],
            validation_rules=m["validation_rules"],
            description=m["description"]
        )
    logger.info(f"Registered {len(textile_metrics)} dynamic metrics for demo2 (Textile)")

    # 6. 10-Day Measurements for demo1 (Steel Factory)
    steel_10_days_data = [
        {"day": 1,  "Production": 100.0, "Coal Consumption": 5000.0, "Natural Gas": 2000.0, "Electricity": 8000.0, "Furnace Temperature": 800.0, "Furnace Pressure": 2.1, "Furnace Efficiency": 82.0},
        {"day": 2,  "Production": 105.0, "Coal Consumption": 5200.0, "Natural Gas": 2050.0, "Electricity": 8200.0, "Furnace Temperature": 810.0, "Furnace Pressure": 2.2, "Furnace Efficiency": 82.0},
        {"day": 3,  "Production": 98.0,  "Coal Consumption": 4950.0, "Natural Gas": 1980.0, "Electricity": 7900.0, "Furnace Temperature": 795.0, "Furnace Pressure": 2.0, "Furnace Efficiency": 81.0},
        {"day": 4,  "Production": 102.0, "Coal Consumption": 5100.0, "Natural Gas": 2020.0, "Electricity": 8100.0, "Furnace Temperature": 805.0, "Furnace Pressure": 2.1, "Furnace Efficiency": 83.0},
        {"day": 5,  "Production": 110.0, "Coal Consumption": 5450.0, "Natural Gas": 2100.0, "Electricity": 8500.0, "Furnace Temperature": 820.0, "Furnace Pressure": 2.3, "Furnace Efficiency": 84.0},
        {"day": 6,  "Production": 108.0, "Coal Consumption": 5350.0, "Natural Gas": 2080.0, "Electricity": 8400.0, "Furnace Temperature": 815.0, "Furnace Pressure": 2.2, "Furnace Efficiency": 83.0},
        {"day": 7,  "Production": 112.0, "Coal Consumption": 5500.0, "Natural Gas": 2150.0, "Electricity": 8650.0, "Furnace Temperature": 825.0, "Furnace Pressure": 2.4, "Furnace Efficiency": 85.0},
        {"day": 8,  "Production": 106.0, "Coal Consumption": 5250.0, "Natural Gas": 2060.0, "Electricity": 8250.0, "Furnace Temperature": 812.0, "Furnace Pressure": 2.2, "Furnace Efficiency": 83.0},
        {"day": 9,  "Production": 101.0, "Coal Consumption": 5050.0, "Natural Gas": 2010.0, "Electricity": 8050.0, "Furnace Temperature": 802.0, "Furnace Pressure": 2.1, "Furnace Efficiency": 82.0},
        {"day": 10, "Production": 115.0, "Coal Consumption": 5600.0, "Natural Gas": 2180.0, "Electricity": 8800.0, "Furnace Temperature": 830.0, "Furnace Pressure": 2.4, "Furnace Efficiency": 85.0},
    ]

    base_date = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    steel_measurements = []

    for entry in steel_10_days_data:
        day_offset = entry["day"] - 1
        day_start = base_date + timedelta(days=day_offset)
        day_end = day_start + timedelta(days=1)
        rec_time = day_start + timedelta(hours=18)  # Evening end-of-shift recording

        for param_name, val in entry.items():
            if param_name == "day":
                continue
            steel_measurements.append({
                "factory_id": steel_id,
                "metric_name_or_id": param_name,
                "value": val,
                "recorded_at": rec_time.isoformat(),
                "period_start": day_start.isoformat(),
                "period_end": day_end.isoformat(),
                "machine_id": mach_bf1["id"],
                "process_id": proc_bf1["id"],
                "data_source_id": ds_scada_steel["id"],
                "notes": f"Synthetic 10-day dataset - Day {entry['day']}"
            })

    res_steel = service.batch_ingest(steel_measurements)
    logger.info(f"Ingested demo1 measurements: {res_steel['succeeded']}/{res_steel['total']} succeeded (Failed: {res_steel['failed']})")

    # 7. 10-Day Measurements for demo2 (Textile Factory)
    textile_10_days_data = [
        {"day": 1,  "Fabric Production": 12500.0, "Water Consumption": 180.0, "Dye Consumption": 85.0, "Electricity": 3200.0, "Humidity": 65.0, "Machine Speed": 750.0, "Fabric Waste": 42.0},
        {"day": 2,  "Fabric Production": 12800.0, "Water Consumption": 185.0, "Dye Consumption": 88.0, "Electricity": 3250.0, "Humidity": 66.0, "Machine Speed": 755.0, "Fabric Waste": 39.0},
        {"day": 3,  "Fabric Production": 12200.0, "Water Consumption": 175.0, "Dye Consumption": 82.0, "Electricity": 3150.0, "Humidity": 64.0, "Machine Speed": 740.0, "Fabric Waste": 45.0},
        {"day": 4,  "Fabric Production": 13000.0, "Water Consumption": 190.0, "Dye Consumption": 90.0, "Electricity": 3300.0, "Humidity": 67.0, "Machine Speed": 760.0, "Fabric Waste": 38.0},
        {"day": 5,  "Fabric Production": 13400.0, "Water Consumption": 195.0, "Dye Consumption": 92.0, "Electricity": 3380.0, "Humidity": 68.0, "Machine Speed": 770.0, "Fabric Waste": 36.0},
        {"day": 6,  "Fabric Production": 13100.0, "Water Consumption": 188.0, "Dye Consumption": 89.0, "Electricity": 3320.0, "Humidity": 66.0, "Machine Speed": 765.0, "Fabric Waste": 40.0},
        {"day": 7,  "Fabric Production": 13600.0, "Water Consumption": 200.0, "Dye Consumption": 95.0, "Electricity": 3450.0, "Humidity": 69.0, "Machine Speed": 780.0, "Fabric Waste": 35.0},
        {"day": 8,  "Fabric Production": 12900.0, "Water Consumption": 186.0, "Dye Consumption": 87.0, "Electricity": 3280.0, "Humidity": 65.0, "Machine Speed": 758.0, "Fabric Waste": 41.0},
        {"day": 9,  "Fabric Production": 12600.0, "Water Consumption": 182.0, "Dye Consumption": 86.0, "Electricity": 3220.0, "Humidity": 65.0, "Machine Speed": 750.0, "Fabric Waste": 43.0},
        {"day": 10, "Fabric Production": 13800.0, "Water Consumption": 205.0, "Dye Consumption": 98.0, "Electricity": 3500.0, "Humidity": 70.0, "Machine Speed": 790.0, "Fabric Waste": 34.0},
    ]

    textile_measurements = []
    for entry in textile_10_days_data:
        day_offset = entry["day"] - 1
        day_start = base_date + timedelta(days=day_offset)
        day_end = day_start + timedelta(days=1)
        rec_time = day_start + timedelta(hours=18)

        for param_name, val in entry.items():
            if param_name == "day":
                continue
            textile_measurements.append({
                "factory_id": textile_id,
                "metric_name_or_id": param_name,
                "value": val,
                "recorded_at": rec_time.isoformat(),
                "period_start": day_start.isoformat(),
                "period_end": day_end.isoformat(),
                "machine_id": mach_loom["id"],
                "process_id": proc_weaving["id"],
                "data_source_id": ds_iot_textile["id"],
                "notes": f"Synthetic 10-day dataset - Day {entry['day']}"
            })

    res_textile = service.batch_ingest(textile_measurements)
    logger.info(f"Ingested demo2 measurements: {res_textile['succeeded']}/{res_textile['total']} succeeded (Failed: {res_textile['failed']})")

    # 8. Comparison verification
    comparison = service.compare_factories_schema(steel_id, textile_id)
    logger.info(f"Dynamic Architecture Comparison Result:\n{comparison}")

    return {
        "status": "SUCCESS",
        "organization_id": org_id,
        "demo1_factory_id": steel_id,
        "demo2_factory_id": textile_id,
        "demo1_measurements_ingested": res_steel["succeeded"],
        "demo2_measurements_ingested": res_textile["succeeded"],
        "comparison": comparison
    }

if __name__ == "__main__":
    result = seed_all()
    print("\n=======================================================")
    print("DEMO DATA SEEDING COMPLETE")
    print(f"Status: {result['status']}")
    print(f"Factory demo1 (Steel): {result['demo1_measurements_ingested']} measurements stored")
    print(f"Factory demo2 (Textile): {result['demo2_measurements_ingested']} measurements stored")
    print("=======================================================\n")

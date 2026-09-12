"use client";

import Link from "next/link";
import { useState } from "react";
import {
  SlidersHorizontal,
  TrendingDown,
  RotateCcw,
  Sparkles,
  Save,
  DollarSign,
  Recycle,
  Zap,
  Leaf,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DemoDisclaimer from "@/components/ui/DemoDisclaimer";
import ScoreBar from "@/components/ui/ScoreBar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SimulatorPage() {
  // Slider states
  const [wasteDiversion, setWasteDiversion] = useState(65);
  const [renewablePower, setRenewablePower] = useState(40);
  const [co2Capture, setCo2Capture] = useState(75);
  const [biomassCofiring, setBiomassCofiring] = useState(20);

  // Dynamic calculations based on base corporate footprint = 8,426 tCO2e
  const baseEmissions = 8426;

  // Waste diversion: 100 tonnes organic * diversion% * 0.86 tCO2/t
  const wasteAvoidance = Math.round((wasteDiversion / 100) * 86);
  const wasteSavings = Math.round((wasteDiversion / 100) * 28000);

  // Renewable power: Scope 2 is 2,100 tCO2e. Each 10% cut = 210 tCO2e
  const powerAvoidance = Math.round((renewablePower / 100) * 2100);
  const powerSavings = Math.round((renewablePower / 100) * 45000);

  // CO2 capture: 8.7 tonnes * 75% = ~6.5 tCO2e
  const co2Avoidance = Math.round((co2Capture / 100) * 8.7 * 10) / 10;
  const co2Revenue = Math.round((co2Capture / 100) * 6500);

  // Biomass co-firing in boiler: replaces 500 t coal/gas = ~450 tCO2e max
  const boilerAvoidance = Math.round((biomassCofiring / 50) * 450);
  const boilerSavings = Math.round((biomassCofiring / 50) * 18000);

  const totalAvoidance = Math.round(wasteAvoidance + powerAvoidance + co2Avoidance + boilerAvoidance);
  const totalFinancialImpact = wasteSavings + powerSavings + co2Revenue + boilerSavings;
  const netFootprint = Math.max(0, baseEmissions - totalAvoidance);
  const percentCut = ((totalAvoidance / baseEmissions) * 100).toFixed(1);

  const scenarioChartData = [
    { name: "Current Baseline", emissions: baseEmissions, avoided: 0 },
    { name: "Simulated Scenario", emissions: netFootprint, avoided: totalAvoidance },
  ];

  const applyPreset = (preset) => {
    if (preset === "conservative") {
      setWasteDiversion(30);
      setRenewablePower(20);
      setCo2Capture(40);
      setBiomassCofiring(10);
    } else if (preset === "balanced") {
      setWasteDiversion(65);
      setRenewablePower(50);
      setCo2Capture(75);
      setBiomassCofiring(25);
    } else if (preset === "netzero") {
      setWasteDiversion(100);
      setRenewablePower(90);
      setCo2Capture(100);
      setBiomassCofiring(50);
    }
  };

  const handleReset = () => {
    setWasteDiversion(65);
    setRenewablePower(40);
    setCo2Capture(75);
    setBiomassCofiring(20);
  };

  return (
    <>
      <DemoDisclaimer compact />
      <PageHeader
        eyebrow="ACT"
        title="What-If Decarbonization Simulator"
        subtitle="Simulate circular byproduct valorization, renewable power wheeling, and boiler co-firing to forecast avoided emissions and cost payback."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset} className="secondary-button">
              <RotateCcw size={14} />
              Reset Defaults
            </button>
            <button className="primary-button">
              <Save size={14} />
              Save Scenario Model
            </button>
          </div>
        }
      />

      {/* Preset Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#667066" }}>Preset Scenarios:</span>
        <button onClick={() => applyPreset("conservative")} className="filter-pill">
          Conservative (Low Capex)
        </button>
        <button onClick={() => applyPreset("balanced")} className="filter-pill active">
          Balanced (Optimal ROI)
        </button>
        <button onClick={() => applyPreset("netzero")} className="filter-pill">
          Aggressive Net-Zero (SBTi 1.5°C)
        </button>
      </div>

      {/* Live Calculated Impact Metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="Projected Annual Avoidance"
          value={totalAvoidance.toLocaleString()}
          unit="tCO₂e / yr"
          trend="down"
          change={`-${percentCut}% corporate footprint`}
          icon={TrendingDown}
        />
        <MetricCard
          label="Net Post-Intervention Footprint"
          value={netFootprint.toLocaleString()}
          unit="tCO₂e"
          trend="down"
          change={`From ${baseEmissions.toLocaleString()} baseline`}
          icon={Leaf}
        />
        <MetricCard
          label="Annual Economic Benefit"
          value={`$${(totalFinancialImpact / 1000).toFixed(1)}k`}
          unit="/ year"
          trend="up"
          change="Power + off-take revenues"
          icon={DollarSign}
        />
        <MetricCard
          label="SBTi Trajectory Compliance"
          value={percentCut > 20 ? "On Track" : "Lagging"}
          unit=""
          trend="up"
          change="Surpasses 2025 target"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Simulator Grid: Controls on Left, Chart & Breakdown on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        {/* Sliders Panel */}
        <div className="panel" style={{ padding: 22 }}>
          <div className="panel-title" style={{ marginBottom: 16 }}>
            Intervention Levers & Sliders
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Lever 1 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>
                    Organic Waste Circular Diversion
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    Diverts agro-waste from landfill to anaerobic digestion / composting
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#355c45" }}>
                  {wasteDiversion}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={wasteDiversion}
                onChange={(e) => setWasteDiversion(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#355c45", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                <span>Avoidance: -{wasteAvoidance} tCO₂e</span>
                <span>Savings: +${wasteSavings.toLocaleString()}/yr</span>
              </div>
            </div>

            {/* Lever 2 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>
                    Renewable Electricity Wheeling (PPA / Solar)
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    Displaces state grid electricity (0.710 kg/kWh) with open-access solar
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#355c45" }}>
                  {renewablePower}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={renewablePower}
                onChange={(e) => setRenewablePower(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#355c45", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                <span>Scope 2 Cut: -{powerAvoidance} tCO₂e</span>
                <span>Savings: +${powerSavings.toLocaleString()}/yr</span>
              </div>
            </div>

            {/* Lever 3 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>
                    Fermentation CO₂ Capture & Utilization
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    Captures 99.5% high-purity biogenic CO₂ for food-grade reuse
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#355c45" }}>
                  {co2Capture}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={co2Capture}
                onChange={(e) => setCo2Capture(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#355c45", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                <span>Captured: {co2Avoidance} tCO₂</span>
                <span>Offtake Rev: +${co2Revenue.toLocaleString()}/yr</span>
              </div>
            </div>

            {/* Lever 4 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#141f18" }}>
                    Boiler Biomass Co-firing Substitution
                  </div>
                  <div style={{ fontSize: 11, color: "#667066" }}>
                    Replaces fossil fuels in process boilers with agricultural briquettes
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#355c45" }}>
                  {biomassCofiring}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={biomassCofiring}
                onChange={(e) => setBiomassCofiring(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#355c45", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8a968a", marginTop: 4 }}>
                <span>Boiler Cut: -{boilerAvoidance} tCO₂e</span>
                <span>Fuel Cost Diff: +${boilerSavings.toLocaleString()}/yr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart & Summary Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="panel-title" style={{ marginBottom: 4 }}>
              Baseline vs Simulated Footprint
            </div>
            <div className="panel-subtitle" style={{ marginBottom: 14 }}>
              Net corporate GHG impact with current slider positions
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scenarioChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebefec" vertical={false} />
                <XAxis dataKey="name" stroke="#8a968a" fontSize={11} tickLine={false} />
                <YAxis stroke="#8a968a" fontSize={11} tickLine={false} unit=" t" />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #d8ded8",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="emissions" name="Net Emissions (tCO₂e)" fill="#355c45" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avoided" name="Avoided / Diverted" fill="#8bb09a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel" style={{ padding: 18, background: "#fafcfb" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#141f18", marginBottom: 10 }}>
              Simulated Mitigation Portfolio
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #ebefec" }}>
                <span style={{ color: "#4f584f" }}>1. Organic Waste Diversion</span>
                <strong style={{ color: "#2e7d32" }}>-{wasteAvoidance} tCO₂e</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #ebefec" }}>
                <span style={{ color: "#4f584f" }}>2. Renewable Electricity Wheeling</span>
                <strong style={{ color: "#2e7d32" }}>-{powerAvoidance} tCO₂e</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #ebefec" }}>
                <span style={{ color: "#4f584f" }}>3. Fermentation CO₂ Valorization</span>
                <strong style={{ color: "#2e7d32" }}>-{co2Avoidance} tCO₂e</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ color: "#4f584f" }}>4. Biomass Co-firing</span>
                <strong style={{ color: "#2e7d32" }}>-{boilerAvoidance} tCO₂e</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

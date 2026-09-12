"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function ScopeDonutChart({ data, centerLabel, centerValue }) {
  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={68}
            outerRadius={96}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color || "#355c45"} opacity={1 - i * 0.1} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              border: "1px solid #dfe3d8",
              borderRadius: 6,
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <strong style={{ fontFamily: "Manrope, sans-serif", fontSize: 21, letterSpacing: "-0.7px" }}>
          {centerValue}
        </strong>
        <span style={{ color: "#919991", fontSize: 9, marginTop: 2 }}>{centerLabel}</span>
      </div>
    </div>
  );
}

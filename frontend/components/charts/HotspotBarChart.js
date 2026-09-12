"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function HotspotBarChart({ data, seriesName = "Emissions (tCO₂e)" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        barSize={14}
        margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
      >
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#929a92" }} />
        <YAxis
          type="category"
          dataKey="process"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: "#687168" }}
          width={130}
        />
        <Tooltip
          contentStyle={{ border: "1px solid #dfe3d8", borderRadius: 6, fontSize: 11 }}
        />
        <Bar dataKey="emissions" name={seriesName} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={`${entry.process}-${i}`} fill={entry.anomaly ? "#ad6959" : "#355c45"} opacity={1 - i * 0.08} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

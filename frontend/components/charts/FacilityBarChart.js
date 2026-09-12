"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function FacilityBarChart({ data, seriesName = "Emissions (tCO₂e)" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={22} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} stroke="#dfe3d8" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: "#929a92" }}
          interval={0}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: "#929a92" }}
          tickMargin={6}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #dfe3d8",
            borderRadius: 6,
            fontSize: 11,
          }}
        />
        <Bar dataKey="emissions" name={seriesName} radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={`${entry.name}-${i}`} fill={i === 0 ? "#355c45" : "#a3c5b0"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

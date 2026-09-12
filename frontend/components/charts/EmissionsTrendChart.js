"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EmissionsTrendChart({ data, dataKey = "total", xKey = "month", seriesName = "Total (tCO₂e)" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="emFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#355c45" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#355c45" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} stroke="#dfe3d8" />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tick={{ fontSize: 10, fill: "#929a92" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tick={{ fontSize: 10, fill: "#929a92" }}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #dfe3d8",
            borderRadius: 6,
            fontSize: 11,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={seriesName}
          stroke="#355c45"
          strokeWidth={2}
          fill="url(#emFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

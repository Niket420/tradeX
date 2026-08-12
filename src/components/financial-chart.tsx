"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { QuarterlyMetric } from "@/lib/types";

interface FinancialChartProps {
  data: QuarterlyMetric[];
  dataKey: keyof QuarterlyMetric;
  type?: "bar" | "line";
  format?: "cr" | "pct";
  height?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format?: "cr" | "pct" }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono font-medium tabular-nums text-popover-foreground">
        {format === "pct" ? `${value.toFixed(1)}%` : `₹${value.toLocaleString("en-IN")} Cr`}
      </div>
    </div>
  );
}

export function FinancialChart({ data, dataKey, type = "bar", format = "cr", height = 200, color = "var(--chart-1)" }: FinancialChartProps) {
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip format={format} />} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip format={format} />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

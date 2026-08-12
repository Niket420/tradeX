"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

interface ScoreBreakdownProps {
  data: { dimension: string; value: number }[];
  height?: number;
}

export function ScoreBreakdown({ data, height = 280 }: ScoreBreakdownProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.28} isAnimationActive={false} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

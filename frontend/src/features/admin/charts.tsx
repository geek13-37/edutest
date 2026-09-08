import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WeeklyPoint } from "@/api/types";
import { useTheme } from "@/lib/theme";

export type TrendKey = "new_schools" | "new_teachers" | "attempts";

function readVar(name: string): string {
  if (typeof window === "undefined") return "#8884d8";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : "#8884d8";
}

export function useChartColors() {
  const { theme } = useTheme();
  return useMemo(
    () => ({
      primary: readVar("--primary"),
      ai: readVar("--ai"),
      success: readVar("--success"),
      muted: readVar("--muted-foreground"),
      border: readVar("--border"),
      card: readVar("--card"),
      fg: readVar("--foreground"),
    }),
    // пересчитываем при смене темы: значения переменных меняются
    [theme],
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const fmtWeek = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
};

function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  colors,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  unit?: string;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-2.5 py-1.5 text-xs shadow-sm"
      style={{ background: colors.card, borderColor: colors.border, color: colors.fg }}
    >
      {label && <div className="mb-0.5 font-medium">{label}</div>}
      <div style={{ fontVariantNumeric: "tabular-nums" }}>
        {payload[0].value}
        {unit}
      </div>
    </div>
  );
}

export function TrendArea({
  data,
  dataKey,
  tone = "primary",
}: {
  data: WeeklyPoint[];
  dataKey: TrendKey;
  tone?: "primary" | "ai" | "success";
}) {
  const colors = useChartColors();
  const reduced = usePrefersReducedMotion();
  const color = colors[tone];
  const gid = `grad-${dataKey}`;

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="week_start"
            tickFormatter={fmtWeek}
            tick={{ fill: colors.muted, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis hide domain={[0, "dataMax + 1"]} />
          <Tooltip
            cursor={{ stroke: colors.border }}
            content={(p) => (
              <ChartTooltip {...p} label={p.label ? fmtWeek(String(p.label)) : ""} colors={colors} />
            )}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
            isAnimationActive={!reduced}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SchoolPercentBars({
  data,
}: {
  data: { name: string; avg_percent: number | null; attempts: number }[];
}) {
  const colors = useChartColors();
  const reduced = usePrefersReducedMotion();
  const rows = data
    .filter((d) => d.avg_percent != null)
    .map((d) => ({ ...d, avg_percent: d.avg_percent as number }));

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Пока нет сданных работ.</p>;
  }

  return (
    <div style={{ height: rows.length * 40 + 24 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={colors.border} strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: colors.muted, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: colors.fg, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: colors.border, fillOpacity: 0.4 }}
            content={(p) => <ChartTooltip {...p} unit="%" colors={colors} />}
          />
          <Bar dataKey="avg_percent" radius={[0, 4, 4, 0]} isAnimationActive={!reduced} maxBarSize={22}>
            {rows.map((_, i) => (
              <Cell key={i} fill={colors.primary} />
            ))}
            <LabelList
              dataKey="attempts"
              position="right"
              formatter={(v: number) => `${v} работ`}
              style={{ fill: colors.muted, fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

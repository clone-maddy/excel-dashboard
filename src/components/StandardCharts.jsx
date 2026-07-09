import React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

const chartColors = ["#6366f1", "#06b6d4", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6", "#ec4899"];

const tooltipStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#f8fafc",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  fontSize: "0.82rem",
  padding: "8px 12px",
};

const truncate = (str, max) => {
  if (!str) return "";
  const s = String(str);
  return s.length > max ? s.slice(0, max) + "…" : s;
};

const maxSeries = 6;

function filterNumericColumns(columns, columnTypes) {
  if (!columnTypes || Object.keys(columnTypes).length === 0) return columns;
  const xCol = columns[0];
  const numericSeries = columns.slice(1).filter((col) => columnTypes[col] === "numeric");
  if (numericSeries.length === 0) return [];
  return [xCol, ...numericSeries.slice(0, maxSeries)];
}

export function AreaChartSection({ data, columns, columnTypes }) {
  const filtered = filterNumericColumns(columns, columnTypes);
  if (!data || data.length === 0 || filtered.length < 2) {
    return <p className="chart-empty">No numeric columns available for charting. Select numeric columns to visualize.</p>;
  }

  const series = filtered.slice(1);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.slice(0, 100)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          {series.map((col, i) => {
            const color = chartColors[i % chartColors.length];
            return (
              <linearGradient key={`grad-${col}`} id={`grad-${col}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey={filtered[0]} stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => truncate(v, 12)} interval="preserveStartEnd" />
        <YAxis stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 10 }} width={55} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="top" height={36} formatter={(v) => truncate(v, 14)} />
        {series.map((col, i) => {
          const color = chartColors[i % chartColors.length];
          return (
            <Area key={col} type="monotone" dataKey={col} stroke={color} strokeWidth={2.5} fillOpacity={1} fill={`url(#grad-${col})`} activeDot={{ r: 5, strokeWidth: 0 }} dot={false} />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartSection({ data, columns, columnTypes }) {
  const filtered = filterNumericColumns(columns, columnTypes);
  if (!data || data.length === 0 || filtered.length < 2) {
    return <p className="chart-empty">No numeric columns available for charting. Select numeric columns to visualize.</p>;
  }

  const series = filtered.slice(1);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.slice(0, 50)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey={filtered[0]} stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => truncate(v, 12)} interval="preserveStartEnd" />
        <YAxis stroke="var(--text-sub)" tickLine={false} tick={{ fontSize: 10 }} width={55} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="top" height={36} formatter={(v) => truncate(v, 14)} />
        {series.map((col, i) => (
          <Bar key={col} dataKey={col} fill={chartColors[i % chartColors.length]} radius={[6, 6, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartSection({ data, columns, columnTypes }) {
  const filtered = filterNumericColumns(columns, columnTypes);
  if (!data || data.length === 0 || filtered.length < 2) {
    return <p className="chart-empty">No numeric data for donut chart.</p>;
  }

  const pieData = data.slice(0, 10).map((row, idx) => ({
    name: truncate(row[filtered[0]] || `Item ${idx + 1}`, 18),
    value: Math.abs(Number(row[filtered[1]])) || 0,
  })).filter((d) => d.value > 0);

  if (pieData.length === 0) return <p className="chart-empty">No numeric data for donut chart</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(v) => truncate(v, 20)} />
        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={3} labelLine={false}>
          {pieData.map((_, i) => (
            <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScriptableContext,
  ChartOptions,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const barBackground = (ctx: ScriptableContext<"bar">) => {
  const { chart } = ctx;
  const { ctx: canvas, chartArea } = chart;
  if (!chartArea) return "rgba(52, 211, 153, 0.9)";
  const gradient = canvas.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.55)");
  gradient.addColorStop(0.45, "rgba(52, 211, 153, 0.82)");
  gradient.addColorStop(1, "rgba(52, 211, 153, 1)");
  return gradient;
};

const options: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 320,
    easing: "easeOutQuart",
  },
  layout: {
    padding: { top: 4, right: 4, bottom: 0, left: 0 },
  },
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      backgroundColor: "rgba(8, 12, 22, 0.96)",
      borderColor: "rgba(52, 211, 153, 0.45)",
      borderWidth: 1,
      titleColor: "#f8fafc",
      bodyColor: "#e2e8f0",
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: (ctx) => `${ctx.parsed.y.toLocaleString()} blocks`,
      },
    },
  },
  scales: {
    y: {
      display: true,
      type: "logarithmic" as const,
      grid: { color: "rgba(148, 163, 184, 0.18)" },
      border: { display: false },
      ticks: {
        color: "#cbd5e1",
        font: { size: 11, weight: 500 },
        maxTicksLimit: 5,
        padding: 6,
        callback: (value: any) => Number(value).toLocaleString(),
      },
    },
    x: {
      grid: {
        display: true,
        color: "rgba(148, 163, 184, 0.12)",
      },
      border: { color: "rgba(148, 163, 184, 0.35)" },
      ticks: {
        color: "#cbd5e1",
        font: { size: 11, family: "monospace", weight: 500 },
      },
    },
  },
};

export function BlockPropagationGraph({
  data,
}: {
  data: Record<string, number> | undefined;
}) {
  const labels = data ? Object.keys(data) : [];
  const values = data ? Object.values(data) : [];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Block Count",
        data: values,
        backgroundColor: barBackground,
        hoverBackgroundColor: "rgba(52, 211, 153, 1)",
        borderRadius: 6,
        borderSkipped: false as const,
        maxBarThickness: 40,
        borderWidth: 1,
        borderColor: "rgba(52, 211, 153, 0.55)",
      },
    ],
  };

  return (
    <div className="chart-plot min-w-0 max-w-full h-[190px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}

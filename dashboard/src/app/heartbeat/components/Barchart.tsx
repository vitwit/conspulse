'use client';

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChartData, ChartOptions, ScriptableContext } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  data: any[];
  labels: (string | number)[];
  label: string;
  color?: string;
  showIntegersOnly?: boolean;
};

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function barGradient(ctx: ScriptableContext<'bar'>, color: string) {
  const { chart } = ctx;
  const { ctx: canvas, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.9);
  const gradient = canvas.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, hexToRgba(color, 0.65));
  gradient.addColorStop(0.5, hexToRgba(color, 0.88));
  gradient.addColorStop(1, hexToRgba(color, 1));
  return gradient;
}

export default function BarChart({
  data,
  labels,
  label,
  color = '#22d3ee',
  showIntegersOnly = false,
}: BarChartProps) {
  const chartData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: (ctx) => barGradient(ctx, color),
        hoverBackgroundColor: hexToRgba(color, 1),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 28,
        borderWidth: 1,
        borderColor: hexToRgba(color, 0.55),
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 320,
      easing: 'easeOutQuart',
    },
    layout: {
      padding: { top: 4, right: 4, bottom: 0, left: 0 },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: 'rgba(8, 12, 22, 0.96)',
        borderColor: hexToRgba(color, 0.45),
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          autoSkip: true,
          maxTicksLimit: 8,
          color: '#cbd5e1',
          font: { size: 11, family: 'monospace', weight: 500 },
        },
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.12)',
        },
        border: { color: 'rgba(148, 163, 184, 0.35)' },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
        border: { display: false },
        ticks: {
          color: '#cbd5e1',
          font: { size: 11, weight: 500 },
          padding: 6,
          ...(showIntegersOnly
            ? {
              callback: function (value: any) {
                return Number.isInteger(value as number) ? value : '';
              },
              stepSize: 1,
            }
            : {}),
        },
        suggestedMin: showIntegersOnly ? 0 : undefined,
        min: showIntegersOnly ? 0 : undefined,
        afterDataLimits: scale => {
          if (showIntegersOnly && scale.max < 5) {
            scale.max = 5;
          }
        },
      },
    },
  };

  return (
    <div className="chart-plot min-w-0 max-w-full h-[190px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}

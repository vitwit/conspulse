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
import { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  data: any[];
  labels: (string | number)[];
  label: string;
  color?: string;
  showIntegersOnly?: boolean;
};

export default function BarChart({ data, labels, label, color = '#4C78A8', showIntegersOnly = false }: BarChartProps) {
  const chartData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: color,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        display: true,
        ticks: { autoSkip: true, maxTicksLimit: 100 },
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          display: false
        },
        ticks: showIntegersOnly
          ? {
            callback: function (value) {
              return Number.isInteger(value as number) ? value : '';
            },
            stepSize: 1,
          }
          : {},
        suggestedMin: showIntegersOnly ? 0 : undefined,
        min: showIntegersOnly ? 0 : undefined,
        afterDataLimits: scale => {
          if (showIntegersOnly) {
            if (scale.max < 5) {
              scale.max = 5;
            }
          }
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

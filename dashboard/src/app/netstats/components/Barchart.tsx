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
};

export default function BarChart({ data, labels, label, color = '#4C78A8',  }: BarChartProps) {
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
        display: false,
        ticks: { autoSkip: true, maxTicksLimit: 100 },
        grid: {
            display: false
        }
      },
      y: {
        display: false,
        beginAtZero: true,
        grid: {
            display: false
        }
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

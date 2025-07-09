import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { BlockPropagation } from "@/app/lib/api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function BlockPropagationGraph({
  data,
}: {
  data: BlockPropagation | undefined;
}) {
  if (!data) {
    const emptyChartData = {
      labels: [],
      datasets: [
        {
          label: "Block Count",
          data: [],
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };

    return <Bar data={emptyChartData} />;
  }

  const labels = Object.keys(data);
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Block Count",
        data: values,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Block Propagation Delay Distribution (in seconds)",
      },
    },
    scales: {
      y: {
        display: false,
        beginAtZero: true,
        ticks: {
          stepSize: 100,
        },
        grid: {
          display: false,
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
  };

  return <Bar data={chartData} options={options} />;
}
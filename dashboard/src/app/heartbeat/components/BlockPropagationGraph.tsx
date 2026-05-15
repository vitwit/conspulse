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
  data: Record<string, number> | undefined;
}) {
  if (!data) {
    const emptyChartData = {
      labels: [],
      datasets: [
        {
          label: "Block Count",
          data: [],
          backgroundColor: "rgba(0, 255, 136, 0.7)", // 70% opacity
          borderColor: "rgba(0, 255, 136, 1)",       // fully opaque

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
        backgroundColor: "rgba(0, 255, 136, 0.7)", // 70% opacity
        borderColor: "rgba(0, 255, 136, 1)",       // fully opaque
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
        display: false,
        text: "Block Propagation Delay Distribution (in seconds)",
      },
    },
    scales: {
      y: {
        display: true,
        beginAtZero: true,
        ticks: {
          maxTicksLimit: 10,
        },
        grid: {
          display: false,
        }
      },
      x: {
        grid: {
          display: true
        }
      }
    },
  };

  return <Bar data={chartData} options={options} />;
}
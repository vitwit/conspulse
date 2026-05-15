import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { useMemo } from 'react';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface NodeVersionsChartProps {
  versions: string[];
}

type VersionData = {
  version: string;
  count: number;
  percentage: number;
};

const colors = [
  '#A5B4FC', '#FCD34D', '#6EE7B7', '#C4B5FD', '#93C5FD',
  '#F87171', '#60A5FA', '#34D399', '#F9A8D4', '#FDBA74',
  '#4ADE80', '#22D3EE', '#818CF8', '#FBBF24', '#FACC15',
  '#38BDF8', '#F472B6', '#E879F9', '#10B981', '#FDE68A',
];

const NodeVersionsChart: React.FC<NodeVersionsChartProps> = ({ versions }) => {
  const versionData: VersionData[] = useMemo(() => {
    const countMap: Record<string, number> = {};

    versions.forEach((v) => {
      const key = v || 'Unknown';
      countMap[key] = (countMap[key] || 0) + 1;
    });

    const total = versions.length;

    return Object.entries(countMap)
      .map(([version, count]) => ({
        version,
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [versions]);

  const total = versions.length;

  const chartData = useMemo(
    () => ({
      labels: versionData.map((d) => d.version),
      datasets: [
        {
          data: versionData.map((d) => d.count),
          backgroundColor: colors,
          borderWidth: 2,
          cutout: '65%',
          spacing: 4,
          borderRadius: 10,
          hoverOffset: 10,
        },
      ],
    }),
    [versionData]
  );

  const options: ChartOptions<'doughnut'> = {
    layout: { padding: 20 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || '';
            const count = ctx.raw as number;
            const pct = versionData.find((d) => d.version === label)?.percentage ?? 0;
            return `${label}: ${count} nodes (${pct.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-[#1a1e24] text-white p-6 rounded-xl shadow-md border border-[#2a2f3a]">
      <h2 className="text-xl font-semibold mb-5 text-cyan-300">
        Node Versions Distribution
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {versionData.map((d, i) => (
          <div key={d.version} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-gray-300 truncate">{d.version} ({d.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-sm aspect-square mx-auto mt-8">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-white opacity-80">
            {total.toLocaleString()} nodes
          </span>
        </div>
      </div>
    </div>
  );
};

export default NodeVersionsChart;

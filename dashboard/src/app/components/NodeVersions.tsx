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
  '#22d3ee', '#34d399', '#818cf8', '#fbbf24', '#f472b6',
  '#60a5fa', '#a78bfa', '#4ade80', '#fb923c', '#e879f9',
  '#38bdf8', '#facc15', '#f87171', '#10b981', '#c4b5fd',
  '#fde68a', '#93c5fd', '#6ee7b7', '#f9a8d4', '#fdba74',
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
          borderColor: '#05080f',
          borderWidth: 3,
          cutout: '72%',
          spacing: 2,
          borderRadius: 8,
          hoverOffset: 12,
        },
      ],
    }),
    [versionData]
  );

  const options: ChartOptions<'doughnut'> = {
    layout: { padding: 16 },
    animation: { animateRotate: true, duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(8, 12, 22, 0.95)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 10,
        cornerRadius: 8,
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
    <div className="card p-6">
      <h2 className="section-title mb-6">
        Node Versions Distribution
      </h2>

      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
        <div className="relative w-full max-w-[320px] aspect-square">
          <Doughnut data={chartData} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-mono font-bold text-white">
              {total.toLocaleString()}
            </span>
            <span className="text-xs uppercase tracking-widest text-slate-500">nodes</span>
          </div>
        </div>

        <div className="grid w-full max-w-md grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {versionData.map((d, i) => (
            <div
              key={d.version}
              className="flex items-center gap-3 rounded-lg border border-[var(--edge)] bg-white/[0.02] px-3 py-2 transition-colors hover:border-[var(--edge-strong)]"
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}55` }}
              />
              <span className="truncate font-mono text-xs text-slate-300">{d.version}</span>
              <span className="ml-auto shrink-0 font-mono text-xs text-slate-500">
                {d.count} · {d.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NodeVersionsChart;

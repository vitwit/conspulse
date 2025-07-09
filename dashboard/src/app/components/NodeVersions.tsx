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
    '#A5B4FC', '#FCD34D', '#6EE7B7', '#C4B5FD', '#93C5FD', '#F87171', '#60A5FA', '#34D399',
    '#F9A8D4', '#FDBA74', '#4ADE80', '#22D3EE', '#818CF8', '#FBBF24', '#FACC15', '#38BDF8',
    '#F472B6', '#E879F9', '#10B981', '#FDE68A',
];

const NodeVersionsChart: React.FC<NodeVersionsChartProps> = ({ versions }) => {
    const versionData: VersionData[] = useMemo(() => {
        const countMap: Record<string, number> = {};

        versions.forEach(v => {
            const key = v || 'Unknown';
            countMap[key] = (countMap[key] || 0) + 1;
        });

        const total = versions.length;

        return Object.entries(countMap).map(([version, count]) => ({
            version,
            count,
            percentage: (count / total) * 100,
        })).sort((a, b) => b.count - a.count);
    }, [versions]);

    const total = versions.length;

    const chartData = useMemo(() => ({
        labels: versionData.map(d => d.version),
        datasets: [
            {
                data: versionData.map(d => d.count),
                backgroundColor: colors,
                borderWidth: 0,
                cutout: '60%',
                spacing: 2,
                borderRadius: 8,
                hoverOffset: 8,
            },
        ],
    }), [versionData]);

    const options: ChartOptions<'doughnut'> = {
        layout: { padding: 20 },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (ctx) => {
                        const label = ctx.label || '';
                        const count = ctx.raw as number;
                        const pct = versionData.find(d => d.version === label)?.percentage ?? 0;
                        return `${label}: ${count} nodes (${pct.toFixed(2)}%)`;
                    },
                },
            },
        },
    };

    return (
        <div className="flex flex-col bg-white p-6 rounded-xl shadow-md pb-8">
            <h2 className="text-xl font-semibold mb-4">Node Versions Distribution</h2>

            <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm text-gray-700">
                    {versionData.map((d, i) => (
                        <div key={d.version} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span>{d.version} ({d.percentage.toFixed(2)}%)</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="relative w-full max-w-md aspect-square mx-auto transition-shadow duration-300 mt-8">
                    <Doughnut data={chartData} options={options} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-lg font-semibold text-gray-700">
                            Total: {total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NodeVersionsChart;

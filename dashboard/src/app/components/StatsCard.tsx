import CopyButton from "./CopyButton";

interface StatCardProps {
    label: string;
    value: string | number;
    color: string;
    copyable?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, color, copyable }) => (
    <div className={`flex flex-col items-center bg-${color}-900/10 rounded-lg p-4 border border-${color}-700`}>
        <span className="text-gray-400 text-sm">{label}</span>
        <span className={`text-lg font-bold text-${color}-300 flex items-center gap-1`}>
            {value ?? "—"}
            {copyable && value && <CopyButton value={`${value}`} />}
        </span>
    </div>
);

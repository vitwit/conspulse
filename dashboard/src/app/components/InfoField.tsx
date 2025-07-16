import CopyButton from "./CopyButton";

interface InfoFieldProps {
    label: string;
    value: string | number;
    copy?: boolean;
}

export const InfoField: React.FC<InfoFieldProps> = ({ label, value, copy }) => (
    <div>
        <span className="text-gray-500 text-sm">{label}</span>
        <div className="font-mono text-gray-200 flex items-center gap-1 break-all">
            {value}
            {copy && <CopyButton value={`${value}`} />}
        </div>
    </div>
);

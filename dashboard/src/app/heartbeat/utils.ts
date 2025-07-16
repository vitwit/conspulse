
export function formatLatency(ms: number): string {
    if (ms < 1000) {
        return `${ms.toLocaleString()}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
    }
}

export function timeAgo(date: Date | null, now: number) {
    if (!date) return "—";
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff <= 0) return `1s ago`;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}
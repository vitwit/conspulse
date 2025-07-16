
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
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export function timeDifference(x: Date | null, y: Date | null): string {
  if (!x || !y) return '0 ms';

  const diffMs = Math.abs(x.getTime() - y.getTime());

  if (diffMs < 1000) {
    return `${diffMs} ms`;
  }

  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes} min ${seconds} sec`;
}

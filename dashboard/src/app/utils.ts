
export function formatLatency(ms: number): string {
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (ms < SECOND) {
    return `${ms.toLocaleString()}ms`;
  } else if (ms < MINUTE) {
    return `${(ms / SECOND).toFixed(2)}s`;
  } else if (ms < HOUR) {
    const minutes = Math.floor(ms / MINUTE);
    const seconds = ((ms % MINUTE) / SECOND).toFixed(1);
    return `${minutes}m ${seconds}s`;
  } else if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    return `${hours}h ${minutes}m`;
  } else {
    const days = Math.floor(ms / DAY);
    const hours = Math.floor((ms % DAY) / HOUR);
    return `${days}d ${hours}h`;
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

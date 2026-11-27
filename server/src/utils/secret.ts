import { timingSafeEqual } from 'crypto';

// Constant-time comparison for shared secrets / API tokens so request handling
// time does not leak information about how many leading characters matched.
export function secretsMatch(provided: string, expected: string): boolean {
    if (typeof provided !== 'string' || typeof expected !== 'string') {
        return false;
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);

    // timingSafeEqual requires equal-length buffers. Comparing lengths first
    // leaks only the length (not the content); for a fixed-length server secret
    // this reveals nothing useful.
    if (a.length !== b.length) {
        return false;
    }

    return timingSafeEqual(a, b);
}

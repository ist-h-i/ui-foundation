export interface ProgressValue {
    value: number | null;
    total: number;
    percent: number | null;
}
export function progressValue(value: number | null, total: number): ProgressValue {
    if (!Number.isFinite(total) || total <= 0 || value !== null && !Number.isFinite(value))
        throw new Error('Progress needs a positive finite total and a finite value or null.');
    const bounded = value === null ? null : Math.max(0, Math.min(total, value));
    return { value: bounded, total, percent: bounded === null ? null : bounded / total * 100 };
}

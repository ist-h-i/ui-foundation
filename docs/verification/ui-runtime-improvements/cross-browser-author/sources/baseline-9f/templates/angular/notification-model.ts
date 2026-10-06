export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';
export type NotificationDismissReason = 'close' | 'action' | 'timeout';
export interface NotificationRequest {
    message: string;
    severity?: NotificationSeverity;
    autoDismiss?: boolean;
    durationSeconds?: number;
    position?: NotificationPosition;
    actionLabel?: string;
    showCloseButton?: boolean;
    pauseOnHover?: boolean;
    pauseOnFocus?: boolean;
    dedupKey?: string;
}
export interface NotificationRecord extends NotificationRequest {
    id: string;
    revision: number;
}
export type NotificationDedup = 'allow' | 'ignore' | 'replace';
export function validateNotification(request: NotificationRequest): void {
    if (!request.message.trim())
        throw new Error('Notification message must be nonempty.');
    const seconds = request.durationSeconds ?? 5;
    if (request.autoDismiss !== false && (!Number.isFinite(seconds) || seconds <= 0 || seconds * 1000 > Number.MAX_SAFE_INTEGER))
        throw new Error('An auto-dismiss notification requires positive finite durationSeconds representable in milliseconds.');
}
export function notificationKey(request: NotificationRequest): string { return request.dedupKey ?? JSON.stringify([request.message, request.severity ?? 'info', request.position ?? null]); }
export interface DeadlineClock {
    now: () => number;
    set: (callback: () => void, ms: number) => unknown;
    clear: (handle: unknown) => void;
}
/** Pauses overlap; resume uses remaining visible time and never a fresh duration. */
export class PausableDeadline {
    private remaining: number;
    private started: number | null = null;
    private handle: unknown = null;
    private cancelled = false;
    private readonly pauses = new Set<string>();
    constructor(milliseconds: number, private readonly elapsed: () => void, private readonly clock: DeadlineClock) { if (!Number.isFinite(milliseconds) || milliseconds <= 0)
        throw new Error('A deadline requires a positive finite duration.'); this.remaining = milliseconds; this.resumeTimer(); }
    pause(reason: string): void { if (this.cancelled || this.pauses.has(reason))
        return; this.pauses.add(reason); if (this.started !== null) {
        this.remaining = Math.max(0, this.remaining - (this.clock.now() - this.started));
        this.started = null;
        this.clock.clear(this.handle);
        this.handle = null;
    } }
    resume(reason: string): void { if (this.cancelled)
        return; this.pauses.delete(reason); if (!this.pauses.size)
        this.resumeTimer(); }
    cancel(): void { this.cancelled = true; if (this.handle !== null)
        this.clock.clear(this.handle); this.handle = null; this.started = null; this.pauses.clear(); }
    private resumeTimer(): void { if (this.cancelled || this.started !== null || this.pauses.size)
        return; this.started = this.clock.now(); this.handle = this.clock.set(() => { if (this.cancelled || this.pauses.size)
        return; this.remaining = Math.max(0, this.remaining - (this.clock.now() - this.started!)); this.handle = null; this.started = null; if (this.remaining > 0) {
        this.resumeTimer();
        return;
    } this.cancelled = true; this.elapsed(); }, Math.min(this.remaining, 2147483647)); }
}

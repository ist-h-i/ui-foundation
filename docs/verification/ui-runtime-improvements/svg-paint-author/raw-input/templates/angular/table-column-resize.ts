import { afterRenderEffect, booleanAttribute, DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
/** Border-box widths are measured layout data, not theme values. Native range remains an alternative. */
@Directive({ selector: '[uiTableColumnResize]', standalone: true, host: { role: 'separator', tabindex: '0', 'aria-orientation': 'vertical', '[attr.aria-label]': 'label()', '[attr.aria-valuemin]': 'minimum()', '[attr.aria-valuemax]': 'maximum()', '[attr.aria-valuenow]': 'value()', '[attr.aria-disabled]': 'disabled()', '[attr.tabindex]': 'disabled()?-1:0', '(pointerdown)': 'start($event)', '(pointermove)': 'move($event)', '(pointerup)': 'finish($event)', '(pointercancel)': 'cancel($event)', '(lostpointercapture)': 'lost($event)', '(keydown)': 'key($event)' } })
export class TableColumnResize {
    readonly label = input.required<string>();
    readonly value = input.required<number>();
    readonly minimum = input.required<number>();
    readonly maximum = input.required<number>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly resizeChange = output<number>();
    readonly resizeCancelled = output<void>();
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly destroy = inject(DestroyRef);
    private drag: {
        id: number;
        startX: number;
        width: number;
        direction: number;
    } | null = null;
    private valid(): boolean { return !!this.label().trim() && Number.isFinite(this.value()) && Number.isFinite(this.minimum()) && Number.isFinite(this.maximum()) && this.minimum() > 0 && this.maximum() >= this.minimum(); }
    private clamp(value: number): number { return Math.max(this.minimum(), Math.min(this.maximum(), value)); }
    protected start(event: PointerEvent): void {
        if (event.defaultPrevented || event.button !== 0 || !event.isPrimary || this.disabled() || !this.valid() || this.drag)
            return;
        event.preventDefault();
        const direction = getComputedStyle(this.host).direction === 'rtl' ? -1 : 1;
        this.drag = { id: event.pointerId, startX: event.clientX, width: this.value(), direction };
        try {
            this.host.setPointerCapture(event.pointerId);
        }
        catch {
            this.drag = null;
        }
    }
    protected move(event: PointerEvent): void {
        if (!this.drag || event.pointerId !== this.drag.id || this.disabled())
            return;
        event.preventDefault();
        this.resizeChange.emit(this.clamp(this.drag.width + (event.clientX - this.drag.startX) * this.drag.direction));
    }
    protected finish(event: PointerEvent): void {
        if (event.pointerId === this.drag?.id)
            this.release();
    }
    protected cancel(event: PointerEvent): void {
        if (event.pointerId !== this.drag?.id)
            return;
        const original = this.drag.width;
        this.release();
        if (!this.destroy.destroyed) {
            this.resizeChange.emit(this.clamp(original));
            this.resizeCancelled.emit();
        }
    }
    protected lost(event: PointerEvent): void {
        if (event.pointerId === this.drag?.id)
            this.drag = null;
    }
    private release(): void {
        const drag = this.drag;
        this.drag = null;
        if (drag && this.host.hasPointerCapture(drag.id))
            try {
                this.host.releasePointerCapture(drag.id);
            }
            catch { }
    }
    protected key(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || this.disabled() || !this.valid())
            return;
        const rtl = getComputedStyle(this.host).direction === 'rtl', step = event.shiftKey ? 1 : 10;
        let value: number;
        switch (event.key) {
            case 'ArrowRight':
                value = this.value() + (rtl ? -step : step);
                break;
            case 'ArrowLeft':
                value = this.value() + (rtl ? step : -step);
                break;
            case 'Home':
                value = this.minimum();
                break;
            case 'End':
                value = this.maximum();
                break;
            default: return;
        }
        event.preventDefault();
        this.resizeChange.emit(this.clamp(value));
    }
    constructor() {
        afterRenderEffect(() => {
            if (this.disabled() || !this.valid())
                this.release();
        });
        this.destroy.onDestroy(() => this.release());
    }
}

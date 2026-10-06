import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
export interface PanelRect {
    left: number;
    top: number;
    width: number;
    height: number;
}
@Directive({ standalone: true })
abstract class PanelHandle {
    readonly target = input.required<HTMLElement>();
    readonly uiHandleDisabled = input(false, { transform: booleanAttribute });
    readonly rectChange = output<PanelRect>();
    protected abstract readonly operation: 'move' | 'resize';
    private readonly handle = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
    private drag: {
        pointer: number;
        x: number;
        y: number;
        rect: PanelRect;
    } | null = null;
    constructor() { inject(DestroyRef).onDestroy(() => this.release()); }
    private rect(): PanelRect { const box = this.target().getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }
    protected start(event: PointerEvent): void { if (this.uiHandleDisabled() || event.button !== 0)
        return; event.preventDefault(); this.handle.focus(); this.drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, rect: this.rect() }; this.handle.setPointerCapture(event.pointerId); }
    protected move(event: PointerEvent): void { if (!this.drag || this.drag.pointer !== event.pointerId)
        return; if (this.uiHandleDisabled()) {
        this.release();
        return;
    } this.adjust(this.drag.rect, event.clientX - this.drag.x, event.clientY - this.drag.y); }
    protected release(): void { if (this.drag && this.handle.hasPointerCapture(this.drag.pointer))
        this.handle.releasePointerCapture(this.drag.pointer); this.drag = null; }
    protected key(event: KeyboardEvent): void {
        if (this.uiHandleDisabled())
            return;
        const style = this.handle.ownerDocument.defaultView?.getComputedStyle(this.handle);
        const step = (parseFloat(style?.paddingInlineStart ?? '') || 1) * (event.shiftKey ? 4 : 1);
        const x = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, y = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        if (!x && !y)
            return;
        event.preventDefault();
        this.adjust(this.rect(), x, y);
    }
    private adjust(rect: PanelRect, x: number, y: number): void {
        const element = this.target(), view = element.ownerDocument.defaultView;
        if (!view)
            return;
        const style = view.getComputedStyle(element);
        const maxWidth = view.innerWidth, maxHeight = view.innerHeight, minWidth = Math.min(maxWidth, parseFloat(style.minWidth) || 0), minHeight = Math.min(maxHeight, parseFloat(style.minHeight) || 0);
        const width = this.operation === 'resize' ? Math.max(minWidth, Math.min(rect.width + x, maxWidth - rect.left)) : rect.width;
        const height = this.operation === 'resize' ? Math.max(minHeight, Math.min(rect.height + y, maxHeight - rect.top)) : rect.height;
        this.rectChange.emit({ left: Math.max(0, Math.min(rect.left + (this.operation === 'move' ? x : 0), maxWidth - width)), top: Math.max(0, Math.min(rect.top + (this.operation === 'move' ? y : 0), maxHeight - height)), width, height });
    }
}
const events = { '(pointerdown)': 'start($event)', '(pointermove)': 'move($event)', '(pointerup)': 'release()', '(pointercancel)': 'release()', '(lostpointercapture)': 'release()', '(keydown)': 'key($event)', '[style.touch-action]': '"none"' };
@Directive({ selector: 'button[uiMoveHandle]', standalone: true, host: events })
export class MoveHandle extends PanelHandle {
    protected readonly operation = 'move';
}
@Directive({ selector: 'button[uiResizeHandle]', standalone: true, host: events })
export class ResizeHandle extends PanelHandle {
    protected readonly operation = 'resize';
}

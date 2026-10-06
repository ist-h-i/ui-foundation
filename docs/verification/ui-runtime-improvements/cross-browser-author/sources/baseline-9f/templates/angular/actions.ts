import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { DOCUMENT } from '@angular/common';
import { afterNextRender, afterRenderEffect, type AfterRenderRef, Injector, untracked, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, forwardRef, inject, InjectionToken, input, linkedSignal, output, signal } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { ActionControl, type ActionSize } from './action-control';
import { Icon } from './icon';
import { Menu, type MenuItem, type MenuSelection } from './menu';
import { type OverlayPlacement } from './overlay';
import { layoutSpace, type LayoutSpace } from './layout-model';
import { PausableDeadline } from './notification-model';
import { ValueControl } from './value-control';
import { focusBeforeHiding } from './layout';
import { restoreFocus } from './focus';
@Component({ selector: 'button[uiIconButton]', standalone: true, imports: [Icon,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ui-icon [name]="icon()!" />@if(busy()){<span class="ui-sr-only">{{'処理中' | uiMessage}}</span>}`,
    host: { class: 'ui-action ui-icon-button', '[attr.aria-label]': 'label()', '[attr.aria-pressed]': 'selected()===null?null:selected()', '[attr.data-shape]': 'shape()' } })
export class IconButton extends ActionControl {
    override readonly icon = input.required<string | null>();
    readonly label = input.required<string>();
    readonly shape = input<'square' | 'round'>('square');
    readonly selected = input<boolean | null>(null);
    constructor() {
        super();
        effect(() => {
            if (!this.icon()?.trim() || !this.label().trim())
                throw new Error('IconButton requires icon and an accessible label.');
        });
    }
}
@Component({ selector: 'ui-button-group', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<ng-content />', host: { class: 'ui-button-group', role: 'group', '[attr.aria-label]': 'label()', '[attr.data-direction]': 'direction()', '[attr.data-connected]': 'connected()', '[attr.data-size]': 'size()', '[style.gap]': 'connected()?"0":gapValue()' } })
export class ButtonGroup {
    readonly label = input.required<string>();
    readonly direction = input<'horizontal' | 'vertical'>('horizontal');
    readonly gap = input<LayoutSpace>('compact');
    readonly connected = input(false, { transform: booleanAttribute });
    readonly size = input<ActionSize>('medium');
    protected readonly gapValue = computed(() => layoutSpace(this.gap()));
}
@Component({ selector: 'button[uiToggleButton]', standalone: true, imports: [Icon,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@if(selectedIcon()){<ui-icon [name]="selectedIcon()!" [style.order]="iconPosition()==='end'?2:0" />}<span class="ui-action-label" style="order:1">{{label()}}</span>@if(stateLabel()){<span aria-hidden="true" style="order:3">{{stateLabel()}}</span>}@if(busy()){<span class="ui-action-busy">{{'処理中' | uiMessage}}</span>}`,
    host: { class: 'ui-action ui-toggle-button', '[attr.aria-label]': 'label()', '[attr.aria-pressed]': 'toggled()', '(click)': 'toggle()' } })
export class ToggleButton extends ActionControl {
    readonly label = input.required<string>();
    readonly checked = input(false, { transform: booleanAttribute });
    readonly checkedChange = output<boolean>();
    readonly onLabel = input('ON');
    readonly offLabel = input('OFF');
    readonly onIcon = input<string | null>(null);
    readonly offIcon = input<string | null>(null);
    protected readonly toggled = linkedSignal(() => this.checked());
    protected readonly selectedIcon = computed(() => (this.toggled() ? this.onIcon() : this.offIcon()) ?? this.icon());
    protected readonly stateLabel = computed(() => this.toggled() ? this.onLabel() : this.offLabel());
    protected toggle(): void {
        if (this.blocked())
            return;
        this.toggled.update(value => !value);
        this.checkedChange.emit(this.toggled());
    }
}
export interface SegmentOption {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}
export type SegmentValue = string | null | readonly string[];
@Component({ selector: 'ui-segmented-control', standalone: true, imports: [Icon,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SegmentedControl), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => SegmentedControl), multi: true }],
    template: `<fieldset tabindex="-1" [id]="controlId()" [disabled]="blocked()||readonly()" [attr.aria-describedby]="descriptionIds()" [attr.aria-busy]="busy()?'true':null" [attr.aria-invalid]="error()?'true':null" (focusout)="leave($event)"><legend>{{label()}}{{required()?(' (必須)' | uiMessage):''}}</legend><div class="ui-segments" [attr.data-direction]="direction()" [attr.data-equal]="equalWidth()">@for(option of options();track option.value){<label class="ui-segment" [attr.data-selected]="selected(option.value)"><input [type]="multiple()?'checkbox':'radio'" [name]="name()||controlId()" [value]="option.value" [checked]="selected(option.value)" [disabled]="!!option.disabled||blocked()||readonly()" (change)="choose(option,checked($event))">@if(option.icon){<ui-icon [name]="option.icon" />}<span>{{option.label}}</span></label>}</div>@if(hint()){<p [id]="controlId()+'-hint'">{{hint()}}</p>}@if(error()){<p class="ui-segment-error" role="alert" [id]="controlId()+'-error'">{{error()}}</p>}</fieldset>`,
    styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}:host([hidden]){display:none;}fieldset{margin:0;padding:var(--ui-space-control-gap);min-inline-size:0;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);}legend{font-weight:var(--ui-weight-control);}.ui-segments{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}.ui-segments[data-direction="vertical"]{flex-direction:column;}.ui-segments[data-equal="true"]>.ui-segment{flex:1 1 0;}.ui-segment{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);min-inline-size:0;padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);cursor:pointer;overflow-wrap:anywhere;}.ui-segment[data-selected="true"]{background:var(--ui-color-surface);color:var(--ui-color-tab-selected);}.ui-segment:has(:disabled){color:var(--ui-color-muted);cursor:default;}input{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);flex:0 0 auto;accent-color:var(--ui-color-action);}.ui-segment:focus-within{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}.ui-segment-error{color:var(--ui-color-danger);}p{margin-block:var(--ui-space-control-gap) 0;}` })
export class SegmentedControl extends ValueControl<SegmentValue> implements Validator {
    protected readonly emptyValue: SegmentValue = null;
    readonly options = input.required<readonly SegmentOption[]>();
    readonly multiple = input(false, { transform: booleanAttribute });
    readonly direction = input<'horizontal' | 'vertical'>('horizontal');
    readonly equalWidth = input(true, { transform: booleanAttribute });
    private validatorChanged: () => void = () => { };
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    private focusJob: AfterRenderRef | null = null;
    constructor() {
        super();
        effect(() => {
            const ids = new Set<string>();
            for (const option of this.options()) {
                if (!option.value || !option.label.trim() || ids.has(option.value))
                    throw new Error('Segment options require unique nonempty values and labels.');
                ids.add(option.value);
            }
            this.multiple();
            this.required();
            this.validatorChanged();
        });
        effect(() => { const options = this.options(), multiple = this.multiple(), blocked = this.blocked(), readonly = this.readonly(); untracked(() => { const active = this.element.ownerDocument.activeElement as HTMLInputElement | null; if (!active || !this.element.contains(active) || active.tagName !== 'INPUT')
            return; if (blocked || readonly) {
            this.focusJob?.destroy();
            this.focusJob = null;
            focusBeforeHiding(this.element);
            return;
        } if (active.type === (multiple ? 'checkbox' : 'radio') && options.some(option => option.value === active.value && !option.disabled))
            return; const fieldset = this.element.querySelector('fieldset'); fieldset?.focus(); this.focusJob?.destroy(); this.focusJob = afterNextRender(() => { this.focusJob = null; if (this.element.ownerDocument.activeElement !== fieldset)
            return; const inputs = Array.from(this.element.querySelectorAll<HTMLInputElement>('input')).filter(input => !input.disabled); (inputs.find(input => input.checked) ?? inputs[0])?.focus(); }, { injector: this.injector }); }); });
        inject(DestroyRef).onDestroy(() => this.focusJob?.destroy());
    }
    protected coerce(value: unknown): SegmentValue { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : typeof value === 'string' ? value : null; }
    protected selected(value: string): boolean { const current = this.current(); return Array.isArray(current) ? current.includes(value) : current === value; }
    protected choose(option: SegmentOption, selected: boolean): void {
        if (option.disabled || this.blocked() || this.readonly())
            return;
        if (this.multiple()) {
            const current = this.current(), values = Array.isArray(current) ? current : [];
            this.commit(selected ? [...new Set([...values, option.value])] : values.filter(value => value !== option.value));
        }
        else if (selected)
            this.commit(option.value);
    }
    protected leave(event: FocusEvent): void {
        if (!(event.relatedTarget instanceof Node) || (event.currentTarget as HTMLElement).contains(event.relatedTarget) === false)
            this.touch();
    }
    registerOnValidatorChange(callback: () => void): void { this.validatorChanged = callback; }
    validate(control: AbstractControl): ValidationErrors | null {
        const value = control.value as SegmentValue;
        const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
        if (this.required() && !values.length)
            return { required: true };
        if (value !== null && this.multiple() !== Array.isArray(value))
            return { selectionMode: true };
        return values.some(item => !this.options().some(option => option.value === item && !option.disabled)) ? { option: true } : null;
    }
}
@Component({ selector: 'ui-split-button', standalone: true, imports: [ActionControl, Menu], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<div class="ui-split-button" role="group" [attr.aria-label]="label()"><button uiAction [variant]="variant()" [size]="size()" [icon]="icon()" [disabled]="disabled()" [busy]="busy()" (click)="activate()">{{label()}}</button><ui-menu [menuId]="controlId()+'-menu'" [label]="uiEffective_menuLabel()" [items]="items()" [disabled]="disabled()||busy()" [placement]="placement()" [closeOnSelect]="closeOnSelect()" [open]="open()" (openChange)="openChange.emit($event)" (selected)="selected.emit($event)" /></div>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}.ui-split-button{display:flex;flex-wrap:wrap;align-items:start;gap:var(--ui-space-control-gap);}` })
export class SplitButton {
 protected readonly uiText_SplitButton=injectUiText();
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly menuLabel = input<string>();
 protected readonly uiEffective_menuLabel=uiLocaleComputed(()=>this.menuLabel()??this.uiText_SplitButton('その他の操作'));
    readonly items = input<readonly MenuItem[]>([]);
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly size = input<ActionSize>('medium');
    readonly variant = input<'primary' | 'secondary' | 'danger'>('primary');
    readonly icon = input<string | null>(null);
    readonly placement = input<OverlayPlacement>('bottom-end');
    readonly closeOnSelect = input(true, { transform: booleanAttribute });
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly action = output<void>();
    readonly selected = output<MenuSelection>();
    protected activate(): void {
        if (!this.disabled() && !this.busy())
            this.action.emit();
    }
}
@Component({ selector: 'ui-floating-action-button,ui-speed-dial', standalone: true, imports: [ActionControl, Menu], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[attr.data-position]': 'position()', '[attr.data-direction]': 'direction()' },
    template: `<div class="ui-floating-actions" role="group" [attr.aria-label]="label()"><button uiAction [icon]="icon()" [busy]="busy()" [disabled]="disabled()" variant="primary" (click)="activate()">{{label()}}</button>@if(items().length){<ui-menu [menuId]="controlId()+'-menu'" [label]="uiEffective_menuLabel()" [items]="items()" [disabled]="disabled()||busy()" [placement]="placement()" [open]="open()" (openChange)="openChange.emit($event)" (selected)="selected.emit($event)" />}</div>`,
    styles: `:host{position:fixed;z-index:1;max-inline-size:calc(100vw - 2*var(--ui-space-page));inset-block-end:var(--ui-space-page);inset-inline-end:var(--ui-space-page);}:host([hidden]){display:none;}:host([data-position="top-start"]),:host([data-position="top-end"]){inset-block-start:var(--ui-space-page);inset-block-end:auto;}:host([data-position="top-start"]),:host([data-position="bottom-start"]){inset-inline-start:var(--ui-space-page);inset-inline-end:auto;}.ui-floating-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);padding:var(--ui-space-control-gap);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow);}` })
export class FloatingActionButton {
 protected readonly uiText_FloatingActionButton=injectUiText();
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly icon = input('plus');
    readonly menuLabel = input<string>();
 protected readonly uiEffective_menuLabel=uiLocaleComputed(()=>this.menuLabel()??this.uiText_FloatingActionButton('補助操作'));
    readonly items = input<readonly MenuItem[]>([]);
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly position = input<'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'>('bottom-end');
    readonly direction = input<'up' | 'down' | 'left' | 'right'>('up');
    readonly open = input(false, { transform: booleanAttribute });
    readonly openChange = output<boolean>();
    readonly action = output<void>();
    readonly selected = output<MenuSelection>();
    protected readonly placement = computed<OverlayPlacement>(() => this.direction() === 'up' ? 'top-end' : this.direction() === 'down' ? 'bottom-end' : this.direction() === 'left' ? 'left-start' : 'right-start');
    protected activate(): void {
        if (!this.disabled() && !this.busy())
            this.action.emit();
    }
}
export type ClipboardWriter = (text: string) => Promise<void>;
export const UI_CLIPBOARD_WRITER = new InjectionToken<ClipboardWriter>('UI_CLIPBOARD_WRITER', { providedIn: 'root', factory: () => {
        const document = inject(DOCUMENT);
        return async (text) => {
            const clipboard = document.defaultView?.navigator.clipboard;
            if (!clipboard)
                throw new Error('Clipboard API is unavailable.');
            await clipboard.writeText(text);
        };
    } });
@Component({ selector: 'ui-copy-button', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    host: { tabindex: '-1' },
    template: `<button uiAction icon="copy" [disabled]="disabled()" [busy]="pending()||busy()" (click)="copy()">{{uiEffective_label()}}</button><p role="status" aria-atomic="true" class="ui-copy-result" [attr.data-result]="state()">{{state()==='success'?uiEffective_successMessage():state()==='error'?uiEffective_errorMessage():''}}</p>`,
    styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}:host(:focus-visible){outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}.ui-copy-result{margin-block:var(--ui-space-control-gap) 0;font-size:var(--ui-text-small);overflow-wrap:anywhere;}.ui-copy-result[data-result="success"]{color:var(--ui-color-success);}.ui-copy-result[data-result="error"]{color:var(--ui-color-danger);}` })
export class CopyButton {
 protected readonly uiText_CopyButton=injectUiText();
    readonly text = input.required<string>();
    readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_CopyButton('コピー'));
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly busy = input(false, { transform: booleanAttribute });
    readonly durationSeconds = input(3);
    readonly successMessage = input<string>();
 protected readonly uiEffective_successMessage=uiLocaleComputed(()=>this.successMessage()??this.uiText_CopyButton('コピーしました。'));
    readonly errorMessage = input<string>();
 protected readonly uiEffective_errorMessage=uiLocaleComputed(()=>this.errorMessage()??this.uiText_CopyButton('コピーできませんでした。再試行してください。'));
    readonly copied = output<void>();
    readonly failed = output<unknown>();
    protected readonly pending = signal(false);
    protected readonly state = signal<'idle' | 'success' | 'error'>('idle');
    private readonly writer = inject(UI_CLIPBOARD_WRITER);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private deadline: PausableDeadline | null = null;
    private alive = true;
    constructor() {
        effect(() => {
            const seconds = this.durationSeconds();
            if (!Number.isFinite(seconds) || seconds <= 0 || seconds * 1000 > Number.MAX_SAFE_INTEGER)
                throw new Error('CopyButton durationSeconds must be positive and representable in milliseconds.');
        });
        effect(() => {
            if ((this.pending() || this.busy() || this.disabled()) && this.element.ownerDocument.activeElement === this.element.querySelector(':scope > button')) restoreFocus(this.element);
        });
        afterRenderEffect(() => {
            if (!this.pending() && !this.busy() && !this.disabled() && this.element.ownerDocument.activeElement === this.element) restoreFocus(this.element.querySelector<HTMLElement>(':scope > button'));
        });
        inject(DestroyRef).onDestroy(() => { this.alive = false; this.deadline?.cancel(); });
    }
    protected async copy(): Promise<void> {
        if (this.pending() || this.disabled() || this.busy())
            return;
        this.deadline?.cancel();
        this.state.set('idle');
        this.pending.set(true);
        try {
            await this.writer(this.text());
            if (!this.alive)
                return;
            this.state.set('success');
            this.copied.emit();
        }
        catch (error) {
            if (!this.alive)
                return;
            this.state.set('error');
            this.failed.emit(error);
        }
        finally {
            if (this.alive) {
                this.pending.set(false);
                this.deadline = new PausableDeadline(this.durationSeconds() * 1000, () => this.state.set('idle'), { now: () => Date.now(), set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) });
            }
        }
    }
}

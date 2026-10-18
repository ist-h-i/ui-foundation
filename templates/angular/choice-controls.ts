import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, Directive, effect, ElementRef, forwardRef, input, signal, viewChild } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { ActionControl } from './action-control';
import { FormField, FieldControl } from './form-field';
import { ValueControl } from './value-control';
import { formatColor, numberDomain, numericRangeError, numericValueError, parseColor, snapNumber, type ColorFormat, type NumberDomain, type NumericRange } from './choice-model';

export interface SliderTick { value: number; label?: string; }
export interface ColorChoice { value: string; label?: string; }
const styles = `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}fieldset{min-inline-size:0;border:0;padding:0;margin:0;}legend{font-weight:var(--ui-weight-control);overflow-wrap:anywhere;}label{display:block;overflow-wrap:anywhere;}input[type='range']{box-sizing:border-box;inline-size:100%;min-inline-size:0;min-block-size:var(--ui-size-control);padding:0;accent-color:var(--ui-color-link);}.ui-choice-row{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}.ui-choice-value{display:block;overflow-wrap:anywhere;}.ui-choice-hint{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}.ui-choice-error{color:var(--ui-color-danger);margin-block:var(--ui-space-control-gap);}.ui-choice-required{color:var(--ui-color-danger);}.ui-choice-ticks{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);padding:0;list-style:none;font-size:var(--ui-text-small);}.ui-choice-ticks li{overflow-wrap:anywhere;}`;

@Directive({ standalone: true })
export abstract class NumericFieldControl<T> extends ValueControl<T> implements Validator {
 private readonly uiRuntimeText_NumericFieldControl=injectUiRuntimeText();

  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly unit = input('');
  readonly ticks = input<readonly SliderTick[]>([]);
  protected readonly domain = computed<NumberDomain | null>(() => {
    try { return numberDomain({ min: this.min(), max: this.max(), step: this.step() }); } catch { return null; }
  });
  protected readonly configurationError = computed(() => {
    const domain = this.domain();
    if (!domain) return this.uiRuntimeText_NumericFieldControl('最小値・最大値・正の刻みを確認してください。');
    const ticks = this.ticks(), seen = new Set<number>();
    for (const tick of ticks) {
      if (!Number.isFinite(tick.value) || tick.value < domain.min || tick.value > domain.max || seen.has(tick.value)) return this.uiRuntimeText_NumericFieldControl('目盛りには範囲内の重複しない数値を指定してください。');
      seen.add(tick.value);
    }
    return null;
  });
  protected readonly problem = computed(() => this.configurationError() ?? this.valueProblem(this.current()));
  protected readonly nativeMin = computed(() => this.domain()?.min ?? 0);
  protected readonly nativeMax = computed(() => this.domain()?.max ?? 1);
  protected readonly nativeStep = computed(() => this.domain()?.step ?? 1);
  protected nativeValue(value: number): number { return this.domain() && Number.isFinite(value) ? snapNumber(value, this.domain()!) : this.nativeMin(); }
  protected override readonly descriptionIds = computed(() => [this.hint() ? this.controlId()+'-hint' : '', this.error()||this.problem() ? this.controlId()+'-error' : ''].filter(Boolean).join(' ') || null);
  protected readonly unavailable = computed(() => this.blocked() || this.readonly() || !!this.configurationError());
  protected readonly sortedTicks = computed(() => [...this.ticks()].sort((a, b) => a.value - b.value));
  private validatorChanged: () => void = () => {};
  constructor() {
    super();
    effect(() => { this.min(); this.max(); this.step(); this.ticks(); this.required(); this.validatorChanged(); });
  }
  protected abstract valueProblem(value: unknown): string | null;
  protected numberText(value: number): string { return Number.isFinite(value) ? value + (this.unit() ? ' ' + this.unit() : '') : this.uiRuntimeText_NumericFieldControl('値を確認してください。'); }
  protected snap(value: number): number { return this.domain() ? snapNumber(value, this.domain()!) : value; }
  registerOnValidatorChange(callback: () => void): void { this.validatorChanged = callback; }
  validate(control: AbstractControl): ValidationErrors | null {
    if (this.configurationError()) return { numericConfiguration: true };
    const error = this.valueProblem(control.value);
    return error ? { numericValue: { message: error, actual: control.value } } : null;
  }
}

@Component({ selector: 'ui-slider', standalone: true, imports: [FormField, FieldControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Slider), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => Slider), multi: true }],
  template: `<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hint]="hint()" [error]="error() || problem()" [required]="required()"><input uiFieldControl type="range" [name]="name()" [min]="nativeMin()" [max]="nativeMax()" [step]="nativeStep()" [value]="nativeValue(current())" [disabled]="unavailable()" [attr.aria-valuetext]="numberText(current())" [attr.list]="sortedTicks().length?controlId()+'-ticks':null" (input)="changed($event)" (blur)="touch()"><output class="ui-choice-value" [for]="controlId()">{{numberText(current())}}</output>@if(sortedTicks().length){<datalist [id]="controlId()+'-ticks'">@for(tick of sortedTicks();track tick.value){<option [value]="tick.value" [label]="tick.label??numberText(tick.value)"></option>}</datalist><ul class="ui-choice-ticks" [attr.aria-label]="'目盛り' | uiMessage">@for(tick of sortedTicks();track tick.value){<li>{{tick.label??numberText(tick.value)}}</li>}</ul>}</ui-form-field>`, styles })
export class Slider extends NumericFieldControl<number> {
  readonly labelPosition = input<'inherit' | 'above' | 'inline'>('inherit');
  protected get emptyValue(): number { return this.min(); }
  protected coerce(value: unknown): number { return typeof value === 'number' ? value : NaN; }
  protected valueProblem(value: unknown): string | null { return this.domain() ? numericValueError(value, this.domain()!) : null; }
  protected changed(event: Event): void { if (this.unavailable()) return; this.commit(this.snap(Number(this.text(event)))); }
}

@Component({ selector: 'ui-range-slider', standalone: true, imports: [UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RangeSlider), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => RangeSlider), multi: true }],
  template: `<fieldset [attr.aria-describedby]="descriptionIds()"><legend>{{label()}}@if(required()){<span class="ui-choice-required">  {{'(必須)' | uiMessage}}</span>}</legend>@if(hint()){<p class="ui-choice-hint" [id]="controlId()+'-hint'">{{hint()}}</p>}<label [for]="controlId()+'-start'">{{uiEffective_startLabel()}}: {{numberText(current().start)}}</label><input type="range" [id]="controlId()+'-start'" [name]="name()?name()+'-start':''" [min]="nativeMin()" [max]="endLimit()" [step]="nativeStep()" [value]="nativeValue(current().start)" [disabled]="unavailable()" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptionIds()" [attr.list]="sortedTicks().length?controlId()+'-ticks':null" [attr.aria-valuetext]="numberText(current().start)" (input)="changed($event,'start')" (blur)="touch()"><label [for]="controlId()+'-end'">{{uiEffective_endLabel()}}: {{numberText(current().end)}}</label><input type="range" [id]="controlId()+'-end'" [name]="name()?name()+'-end':''" [min]="startLimit()" [max]="nativeMax()" [step]="nativeStep()" [value]="nativeValue(current().end)" [disabled]="unavailable()" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptionIds()" [attr.list]="sortedTicks().length?controlId()+'-ticks':null" [attr.aria-valuetext]="numberText(current().end)" (input)="changed($event,'end')" (blur)="touch()">@if(sortedTicks().length){<datalist [id]="controlId()+'-ticks'">@for(tick of sortedTicks();track tick.value){<option [value]="tick.value" [label]="tick.label??numberText(tick.value)"></option>}</datalist><ul class="ui-choice-ticks" [attr.aria-label]="'目盛り' | uiMessage">@for(tick of sortedTicks();track tick.value){<li>{{tick.label??numberText(tick.value)}}</li>}</ul>}@if(error()||problem()){<p class="ui-choice-error" [id]="controlId()+'-error'">{{error()||problem()}}</p>}</fieldset>`, styles })
export class RangeSlider extends NumericFieldControl<NumericRange> {
 protected readonly uiText_RangeSlider=injectUiText();
  readonly startLabel = input<string>();
 protected readonly uiEffective_startLabel=uiLocaleComputed(()=>this.startLabel()??this.uiText_RangeSlider('開始値'));
  readonly endLabel = input<string>();
 protected readonly uiEffective_endLabel=uiLocaleComputed(()=>this.endLabel()??this.uiText_RangeSlider('終了値'));
  protected get emptyValue(): NumericRange { return { start: this.min(), end: this.snap(this.max()) }; }
  protected readonly startLimit = computed(() => this.valueProblem(this.current()) ? this.nativeMin() : this.current().start);
  protected readonly endLimit = computed(() => this.valueProblem(this.current()) ? this.nativeMax() : this.current().end);
  protected coerce(value: unknown): NumericRange {
    const candidate = value as Partial<NumericRange> | null;
    return { start: typeof candidate?.start === 'number' ? candidate.start : NaN, end: typeof candidate?.end === 'number' ? candidate.end : NaN };
  }
  protected valueProblem(value: unknown): string | null { return this.domain() ? numericRangeError(value, this.domain()!) : null; }
  protected changed(event: Event, endpoint: 'start' | 'end'): void {
    if (this.unavailable()) return;
    const next = this.snap(Number(this.text(event))), range = this.valueProblem(this.current()) ? this.emptyValue : this.current();
    this.commit(endpoint === 'start' ? { start: Math.min(next, range.end), end: range.end } : { start: range.start, end: Math.max(next, range.start) });
  }
}

@Component({ selector: 'ui-knob', standalone: true, imports: [FormField, FieldControl, ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Knob), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => Knob), multi: true }],
  template: `<ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hint]="hint()" [error]="error() || problem()" [required]="required()"><div #dial class="ui-knob" (pointerdown)="begin($event)" (pointermove)="move($event)" (pointerup)="end($event)" (pointercancel)="end($event)" (lostpointercapture)="end($event)"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="ui-knob-track" cx="50" cy="50" r="40" pathLength="100" stroke-dasharray="75 25" transform="rotate(135 50 50)" /><circle class="ui-knob-value" cx="50" cy="50" r="40" pathLength="100" [attr.stroke-dasharray]="fraction()*75+' 100'" transform="rotate(135 50 50)" /><line class="ui-knob-value" x1="50" y1="50" x2="82" y2="50" [attr.transform]="'rotate('+(135+fraction()*270)+' 50 50)'" /></svg><input #editor uiFieldControl type="range" [name]="name()" [min]="nativeMin()" [max]="nativeMax()" [step]="nativeStep()" [value]="nativeValue(current())" [disabled]="unavailable()" [attr.aria-valuetext]="numberText(current())" (input)="changed($event)" (blur)="touch()"></div><output class="ui-choice-value" [for]="controlId()">{{numberText(current())}}</output><div class="ui-choice-row"><button uiAction type="button" [attr.aria-label]="label()+('を減らす' | uiMessage)" [disabled]="unavailable()||current()<=min()" (click)="adjust(-1)">−</button><button uiAction type="button" [attr.aria-label]="label()+('を増やす' | uiMessage)" [disabled]="unavailable()||current()>=snap(max())" (click)="adjust(1)">＋</button></div></ui-form-field>`,
  styles: [styles, `.ui-knob{position:relative;inline-size:var(--ui-size-knob);max-inline-size:100%;aspect-ratio:1;touch-action:none;}.ui-knob:focus-within{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);border-radius:50%;}.ui-knob svg{display:block;inline-size:100%;block-size:100%;}.ui-knob input{position:absolute;inset:0;inline-size:100%;block-size:100%;opacity:0;cursor:pointer;}.ui-knob-track,.ui-knob-value{fill:none;stroke-width:var(--ui-border-focus);}.ui-knob-track{stroke:var(--ui-color-border);}.ui-knob-value{stroke:var(--ui-color-link);}`] })
export class Knob extends NumericFieldControl<number> {
  readonly labelPosition = input<'inherit' | 'above' | 'inline'>('inherit');
  protected get emptyValue(): number { return this.min(); }
  private readonly editor = viewChild<unknown, ElementRef<HTMLInputElement>>('editor', {read: ElementRef});
  private readonly dial = viewChild<ElementRef<HTMLElement>>('dial');
  private pointer: number | null = null;
  protected readonly fraction = computed(() => this.domain() && Number.isFinite(this.current()) ? Math.max(0, Math.min(1, (this.current() - this.min()) / (this.max() - this.min()))) : 0);
  protected coerce(value: unknown): number { return typeof value === 'number' ? value : NaN; }
  protected valueProblem(value: unknown): string | null { return this.domain() ? numericValueError(value, this.domain()!) : null; }
  protected changed(event: Event): void { if (this.unavailable()) return; this.commit(this.snap(Number(this.text(event)))); }
  protected adjust(direction: number): void { if (this.unavailable()) return; this.commit(this.snap((Number.isFinite(this.current()) ? this.current() : this.min()) + direction * this.step())); }
  protected begin(event: PointerEvent): void {
    if (this.unavailable() || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); this.pointer = event.pointerId; this.editor()?.nativeElement.focus();
    this.dial()?.nativeElement.setPointerCapture(event.pointerId); this.fromPoint(event);
  }
  protected move(event: PointerEvent): void { if (event.pointerId === this.pointer && !this.unavailable()) this.fromPoint(event); }
  protected end(event: PointerEvent): void {
    if (event.pointerId !== this.pointer) return;
    const dial = this.dial()?.nativeElement; if (dial?.hasPointerCapture(event.pointerId)) dial.releasePointerCapture(event.pointerId);
    this.pointer = null; this.touch();
  }
  private fromPoint(event: PointerEvent): void {
    const box = this.dial()?.nativeElement.getBoundingClientRect(); if (!box) return;
    const angle = (Math.atan2(event.clientY - box.y - box.height / 2, event.clientX - box.x - box.width / 2) * 180 / Math.PI - 135 + 360) % 360;
    const fraction = (angle > 270 ? angle > 315 ? 0 : 270 : angle) / 270;
    this.commit(this.snap(this.min() + fraction * (this.max() - this.min())));
  }
}

@Component({ selector: 'ui-rating', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Rating), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => Rating), multi: true }],
  template: `<fieldset [attr.aria-describedby]="descriptionIds()"><legend>{{label()}}@if(required()){<span class="ui-choice-required">  {{'(必須)' | uiMessage}}</span>}</legend>@if(hint()){<p class="ui-choice-hint" [id]="controlId()+'-hint'">{{hint()}}</p>}<div class="ui-choice-row">@for(choice of choices();track choice){<label class="ui-rating-choice"><input type="radio" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptionIds()" [name]="name()||controlId()" [value]="choice" [checked]="current()===choice" [disabled]="blocked()||readonly()||!!configurationError()" (change)="commit(choice)" (blur)="touch()"><span aria-hidden="true">★</span><bdi dir="ltr">{{choice}} / {{stars()}}</bdi></label>}</div><output class="ui-choice-value"><bdi dir="ltr">{{ratingText()}}</bdi></output>@if(clearable()){<button uiAction type="button" [disabled]="blocked()||readonly()||!!configurationError()||current()===0" (click)="commit(0)">{{uiEffective_clearLabel()}}</button>}@if(error()||problem()){<p class="ui-choice-error" [id]="controlId()+'-error'">{{error()||problem()}}</p>}</fieldset>`,
  styles: [styles, `.ui-rating-choice{box-sizing:border-box;display:flex;gap:var(--ui-space-control-gap);align-items:center;min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);}.ui-rating-choice:has(:checked){border-color:var(--ui-color-focus);background:var(--ui-color-background);}.ui-rating-choice>span[aria-hidden]{color:var(--ui-color-link);}`] })
export class Rating extends ValueControl<number> implements Validator {
 private readonly uiRuntimeText_Rating=injectUiRuntimeText();

 protected readonly uiText_Rating=injectUiText();
  protected readonly emptyValue = 0;
  readonly stars = input(5);
  readonly halfSteps = input(false, { transform: booleanAttribute });
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly clearLabel = input<string>();
 protected readonly uiEffective_clearLabel=uiLocaleComputed(()=>this.clearLabel()??this.uiText_Rating('評価を解除'));
  protected readonly configurationError = computed(() => Number.isSafeInteger(this.stars()) && this.stars() > 0 && this.stars() <= 20 && this.uiEffective_clearLabel().trim() ? null : this.uiRuntimeText_Rating('評価数は1から20の整数とし、解除操作の説明を指定してください。'));
  protected readonly ratingText = computed(() => Number.isFinite(this.current()) ? this.current() === 0 ? this.uiRuntimeText_Rating('未評価') : this.current() + ' / ' + this.stars() : this.uiRuntimeText_Rating('評価を確認してください。'));
  protected readonly choices = computed(() => this.configurationError() ? [] : Array.from({ length: this.stars() * (this.halfSteps() ? 2 : 1) }, (_, index) => (index + 1) / (this.halfSteps() ? 2 : 1)));
  protected readonly problem = computed(() => this.configurationError() ?? this.valueProblem(this.current()));
  protected override readonly descriptionIds = computed(() => [this.hint() ? this.controlId()+'-hint' : '', this.error()||this.problem() ? this.controlId()+'-error' : ''].filter(Boolean).join(' ') || null);
  private validatorChanged: () => void = () => {};
  constructor() { super(); effect(() => { this.stars(); this.halfSteps(); this.required(); this.uiEffective_clearLabel(); this.validatorChanged(); }); }
  protected coerce(value: unknown): number { return typeof value === 'number' ? value : NaN; }
  private valueProblem(value: unknown): string | null {
    if (this.configurationError()) return null;
    if (this.required() && value === 0) return this.uiRuntimeText_Rating('評価を選んでください。');
    return numericValueError(value, { min: 0, max: this.stars(), step: this.halfSteps() ? .5 : 1 });
  }
  registerOnValidatorChange(callback: () => void): void { this.validatorChanged = callback; }
  validate(control: AbstractControl): ValidationErrors | null { const error = this.configurationError() ?? this.valueProblem(control.value); return error ? { rating: error } : null; }
}

@Component({ selector: 'ui-color-picker', standalone: true, imports: [ActionControl,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ColorPicker), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => ColorPicker), multi: true }],
  template: `<fieldset [attr.aria-describedby]="descriptionIds()"><legend>{{label()}}@if(required()){<span class="ui-choice-required">  {{'(必須)' | uiMessage}}</span>}</legend>@if(hint()){<p class="ui-choice-hint" [id]="controlId()+'-hint'">{{hint()}}</p>}<label [for]="controlId()+'-text'">{{uiEffective_valueLabel()}}</label><input class="ui-field-control" type="text" [id]="controlId()+'-text'" [name]="name()" [value]="display()" [disabled]="blocked()||!!configurationError()" [readOnly]="readonly()||!freeSelection()" [attr.aria-invalid]="error()||problem()?'true':null" [attr.aria-describedby]="descriptionIds()" (focus)="entered($event)" (input)="edit($event)" (blur)="left()">@if(freeSelection()){<label [for]="controlId()+'-native'">{{uiEffective_freeLabel()}}</label><input type="color" [id]="controlId()+'-native'" [value]="nativeColor()" [disabled]="blocked()||readonly()||!!configurationError()" (input)="chooseNative($event)" (blur)="touch()">@if(allowAlpha()){<label [for]="controlId()+'-alpha'">{{uiEffective_alphaLabel()}}: {{alphaPercent()}}%</label><input type="range" [id]="controlId()+'-alpha'" min="0" max="100" step="1" [value]="alphaPercent()" [disabled]="blocked()||readonly()||!!configurationError()||!color()" (input)="chooseAlpha($event)" (blur)="touch()">}}@if(!configurationError()&&palette().length){<div class="ui-choice-row" role="group" [attr.aria-label]="uiEffective_paletteLabel()">@for(choice of palette();track choice.value){<button uiAction type="button" [disabled]="blocked()||readonly()||!!configurationError()" [attr.aria-label]="choice.label??choice.value" [attr.aria-pressed]="selected(choice.value)" (click)="choose(choice.value)"><span class="ui-color-swatch" aria-hidden="true" [style.background-color]="choice.value"></span>{{choice.label??choice.value}}</button>}</div>}<output class="ui-choice-value">{{current()||('未選択' | uiMessage)}}</output>@if(error()||problem()){<p class="ui-choice-error" [id]="controlId()+'-error'">{{error()||problem()}}</p>}</fieldset>`,
  styles: [styles, `input[type='color']{box-sizing:border-box;inline-size:var(--ui-size-control);block-size:var(--ui-size-control);padding:0;border:var(--ui-border-control) solid var(--ui-color-border);background:var(--ui-color-surface);}.ui-color-swatch{display:inline-block;inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);border:var(--ui-border-control) solid var(--ui-color-border);margin-inline-end:var(--ui-space-control-gap);}`] })
export class ColorPicker extends ValueControl<string> implements Validator {
 private readonly uiRuntimeText_ColorPicker=injectUiRuntimeText();

 protected readonly uiText_ColorPicker=injectUiText();
  protected readonly emptyValue = '';
  readonly format = input<ColorFormat>('hex');
  readonly allowAlpha = input(true, { transform: booleanAttribute });
  readonly freeSelection = input(true, { transform: booleanAttribute });
  readonly palette = input<readonly ColorChoice[]>([]);
  readonly valueLabel = input<string>();
 protected readonly uiEffective_valueLabel=uiLocaleComputed(()=>this.valueLabel()??this.uiText_ColorPicker('色の値'));
  readonly freeLabel = input<string>();
 protected readonly uiEffective_freeLabel=uiLocaleComputed(()=>this.freeLabel()??this.uiText_ColorPicker('自由に色を選ぶ'));
  readonly alphaLabel = input<string>();
 protected readonly uiEffective_alphaLabel=uiLocaleComputed(()=>this.alphaLabel()??this.uiText_ColorPicker('不透明度'));
  readonly paletteLabel = input<string>();
 protected readonly uiEffective_paletteLabel=uiLocaleComputed(()=>this.paletteLabel()??this.uiText_ColorPicker('色の候補'));
  protected readonly editing = signal(false);
  private readonly editorText = signal('');
  private editingValue = '';
  protected readonly color = computed(() => parseColor(this.current()));
  protected readonly nativeColor = computed(() => this.color() ? formatColor({ ...this.color()!, alpha: 1 }, 'hex') : '#000000');
  protected readonly alphaPercent = computed(() => Math.round((this.color()?.alpha ?? 1) * 100));
  protected readonly display = computed(() => this.editing() ? this.editorText() : this.color() ? formatColor(this.color()!, this.format()) : this.current());
  protected readonly configurationError = computed(() => {
    if (![this.uiEffective_valueLabel(), this.uiEffective_freeLabel(), this.uiEffective_alphaLabel(), this.uiEffective_paletteLabel()].every(value => value.trim()) || !['hex', 'rgb', 'hsl'].includes(this.format())) return this.uiRuntimeText_ColorPicker('色の書式と操作の説明を確認してください。');
    const seen = new Set<string>();
    for (const choice of this.palette()) {
      const color = parseColor(choice.value);
      if (!color || !this.allowAlpha() && color.alpha < 1 || choice.label !== undefined && !choice.label.trim() || seen.has(choice.value)) return this.uiRuntimeText_ColorPicker('パレットの書式・透明度・説明と重複を確認してください。');
      seen.add(choice.value);
    }
    return null;
  });
  protected readonly problem = computed(() => this.configurationError() ?? this.valueProblem(this.current()));
  protected override readonly descriptionIds = computed(() => [this.hint() ? this.controlId()+'-hint' : '', this.error()||this.problem() ? this.controlId()+'-error' : ''].filter(Boolean).join(' ') || null);
  private validatorChanged: () => void = () => {};
  constructor() {
    super();
    effect(() => { this.configurationError(); this.allowAlpha(); this.required(); this.validatorChanged(); });
    effect(() => {
      const current = this.current();
      if (this.editing() && current !== this.editingValue) { this.editingValue = current; this.editorText.set(current); }
    });
  }
  protected entered(event: Event): void {
    // Keep the actual text that received focus; do not replace it beneath a
    // native selection or rapid paste. External model replacement is explicit.
    this.editingValue = this.current(); this.editorText.set(this.text(event)); this.editing.set(true);
  }
  protected coerce(value: unknown): string { return value === null || value === undefined ? '' : String(value); }
  private valueProblem(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return this.required() ? this.uiRuntimeText_ColorPicker('色を選んでください。') : null;
    if (typeof value !== 'string' || !parseColor(value)) return this.uiRuntimeText_ColorPicker('hex・rgb・hsl形式の色を確認してください。');
    return !this.allowAlpha() && parseColor(value)!.alpha < 1 ? this.uiRuntimeText_ColorPicker('透明度を含まない色を選んでください。') : null;
  }
  protected selected(value: string): boolean { const choice = parseColor(value); return !!this.color() && !!choice && formatColor(this.color()!, 'hex') === formatColor(choice, 'hex'); }
  protected edit(event: Event): void {
    if (this.blocked() || this.readonly() || !this.freeSelection() || this.configurationError()) return;
    const text = this.text(event); this.editingValue = text; this.editorText.set(text); this.commit(text);
  }
  protected left(): void {
    this.editing.set(false); this.touch();
    if (!this.blocked() && !this.readonly() && this.freeSelection() && !this.configurationError() && this.color()) this.commit(formatColor(this.color()!, this.format()));
  }
  protected choose(value: string): void {
    if (this.blocked() || this.readonly() || this.configurationError()) return;
    const color = parseColor(value); if (!color) return;
    this.commit(formatColor(color, this.format()));
  }
  protected chooseNative(event: Event): void {
    if (!this.freeSelection()) return;
    const color = parseColor(this.text(event)); if (!color) return;
    this.choose(formatColor({ ...color, alpha: this.allowAlpha() ? this.color()?.alpha ?? 1 : 1 }, this.format()));
  }
  protected chooseAlpha(event: Event): void {
    if (!this.freeSelection() || !this.allowAlpha() || !this.color()) return;
    this.choose(formatColor({ ...this.color()!, alpha: Number(this.text(event)) / 100 }, this.format()));
  }
  registerOnValidatorChange(callback: () => void): void { this.validatorChanged = callback; }
  validate(control: AbstractControl): ValidationErrors | null {
    const error = this.configurationError() ?? this.valueProblem(control.value);
    return error ? { color: error } : null;
  }
}

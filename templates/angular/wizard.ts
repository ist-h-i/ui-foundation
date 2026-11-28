import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText} from './locale';
import { AfterContentChecked, OnDestroy, afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, DestroyRef, ElementRef, forwardRef, inject, input, linkedSignal, output, signal, untracked, viewChild } from '@angular/core';
import { ActionControl } from './action-control';
import { canFocus } from './focus';
export interface WizardTransition { requestId: number; from: string; to: string | null; reason: 'next' | 'back' | 'jump' | 'complete'; }
@Component({ selector: 'ui-wizard-step', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h3 #heading [id]="headingId()" tabindex="-1">{{label()}}</h3><ng-content />`,
  host: { '[attr.id]': 'panelId()', role: 'group', '[attr.aria-labelledby]': 'headingId()', '[hidden]': '!active()' },
  styles: `:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}h3{font-size:var(--ui-text-section-title);font-weight:var(--ui-weight-heading);overflow-wrap:anywhere;}h3:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}` })
export class WizardStep implements OnDestroy {
  readonly stepId = input.required<string>();
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly canProceed = input(true, { transform: booleanAttribute });
  /** undefined follows the next enabled projected step; null is completion. */
  readonly next = input<string | null>();
  private readonly wizard = inject<Wizard>(forwardRef(() => Wizard));
  private readonly heading = viewChild<ElementRef<HTMLHeadingElement>>('heading');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly panelId = computed(() => this.wizard.controlId() + '-step-' + encodeURIComponent(this.stepId()));
  readonly headingId = computed(() => this.panelId() + '-heading');
  protected readonly active = computed(() => this.wizard.activeStepId() === this.stepId());
  ngOnDestroy(): void { this.wizard.stepRemoved(this.element); }
  belongsTo(wizard: Wizard): boolean { return this.wizard === wizard; }
  focusStart(): void { const target = this.heading()?.nativeElement; if (canFocus(target ?? null)) target!.focus({ preventScroll: true }); }
}
/** Projected panels remain mounted. Branching and transition approval are explicit. */
@Component({ selector: 'ui-wizard,ui-stepper', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.aria-label]="label()" [attr.aria-busy]="busy()||!!pending()"><ol [attr.aria-label]="uiEffective_stepsLabel()" [attr.data-direction]="direction()">@for(step of steps();track step.stepId();let index=$index){<li><button uiAction type="button" [attr.aria-current]="activeStepId()===step.stepId()?'step':null" [attr.aria-controls]="step.panelId()" [disabled]="unavailable()||step.disabled()||!reachable(step.stepId())" (click)="jump(step.stepId())">{{index+1}}. {{step.label()}}</button></li>}</ol><ng-content />@if(!activeStep()){<p role="status">{{uiEffective_emptyLabel()}}</p>}@if(problem()){<p class="ui-wizard-error" role="alert">{{problem()}}</p>}<div class="ui-wizard-actions"><button uiAction type="button" [disabled]="unavailable()||!backTarget()" (click)="back()">{{uiEffective_backLabel()}}</button><button uiAction type="button" [disabled]="unavailable()||!activeStep()?.canProceed()||finished()||!nextAvailable()" (click)="advance()">{{nextTarget()===null?uiEffective_completeLabel():uiEffective_nextLabel()}}</button></div>@if(pending()){<p role="status">{{uiEffective_pendingLabel()}}</p>}@if(finished()){<p role="status">{{uiEffective_completedLabel()}}</p>}</section>`,
  styles: `:host{display:block;min-inline-size:0;color:var(--ui-color-text);font:inherit;}:host([hidden]){display:none;}section{min-inline-size:0;}ol{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);list-style:none;padding:0;margin-block:var(--ui-space-field);}ol[data-direction='vertical']{flex-direction:column;}li{min-inline-size:0;max-inline-size:100%;}button[aria-current='step']{border-color:var(--ui-color-focus);color:var(--ui-color-tab-selected);font-weight:var(--ui-weight-heading);}.ui-wizard-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-field);}.ui-wizard-error{color:var(--ui-color-danger);overflow-wrap:anywhere;}` })
export class Wizard implements AfterContentChecked {
 private readonly uiRuntimeText_Wizard=injectUiRuntimeText();

 protected readonly uiText_Wizard=injectUiMessageText();
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly current = input('');
  readonly currentChange = output<string>();
  readonly direction = input<'horizontal' | 'vertical'>('horizontal');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly deferTransitions = input(false, { transform: booleanAttribute });
  readonly nonlinear = input(false, { transform: booleanAttribute });
  readonly stepsLabel = input<string>();
 protected readonly uiEffective_stepsLabel=uiLocaleComputed(()=>this.stepsLabel()??this.uiText_Wizard("uiFoundation.wizard.formSteps"));
  readonly backLabel = input<string>();
 protected readonly uiEffective_backLabel=uiLocaleComputed(()=>this.backLabel()??this.uiText_Wizard("uiFoundation.wizard.back"));
  readonly nextLabel = input<string>();
 protected readonly uiEffective_nextLabel=uiLocaleComputed(()=>this.nextLabel()??this.uiText_Wizard("uiFoundation.wizard.next"));
  readonly completeLabel = input<string>();
 protected readonly uiEffective_completeLabel=uiLocaleComputed(()=>this.completeLabel()??this.uiText_Wizard("uiFoundation.wizard.finish"));
  readonly emptyLabel = input<string>();
 protected readonly uiEffective_emptyLabel=uiLocaleComputed(()=>this.emptyLabel()??this.uiText_Wizard("uiFoundation.wizard.thereAreNoAvailableSteps"));
  readonly pendingLabel = input<string>();
 protected readonly uiEffective_pendingLabel=uiLocaleComputed(()=>this.pendingLabel()??this.uiText_Wizard("uiFoundation.wizard.checkingWhetherYouCanContinue"));
  readonly completedLabel = input<string>();
 protected readonly uiEffective_completedLabel=uiLocaleComputed(()=>this.completedLabel()??this.uiText_Wizard("uiFoundation.wizard.stepCompleted"));
  readonly transitionRequested = output<WizardTransition>();
  readonly completionAccepted = output<string>();
  private readonly projected = contentChildren(WizardStep, { descendants: true });
  protected readonly steps = computed(() => this.projected().filter(step => step.belongsTo(this)));
  private readonly chosen = linkedSignal(() => this.current());
  readonly activeStepId = computed(() => this.steps().find(step => step.stepId() === this.chosen() && !step.disabled())?.stepId() ?? this.steps().find(step => !step.disabled())?.stepId() ?? '');
  protected readonly activeStep = computed(() => this.steps().find(step => step.stepId() === this.activeStepId()));
  protected readonly nextTarget = computed<string | null>(() => {
    const active = this.activeStep(); if (!active) return null;
    if (active.next() !== undefined) return active.next()!;
    const index = this.steps().indexOf(active); return this.steps().slice(index + 1).find(step => !step.disabled())?.stepId() ?? null;
  });
  protected readonly nextAvailable = computed(() => !!this.activeStep() && (this.nextTarget() === null || this.steps().some(step => step.stepId() === this.nextTarget() && !step.disabled())));
  private readonly history = signal<readonly string[]>([]);
  protected readonly backTarget = computed(() => [...this.history()].reverse().find(id => id !== this.activeStepId() && this.steps().some(step => step.stepId() === id && !step.disabled())) ?? null);
  protected readonly pending = signal<WizardTransition | null>(null);
  protected readonly finished = signal(false);
  protected readonly problem = uiMessageState('');
  protected readonly unavailable = computed(() => this.disabled() || this.busy() || !!this.pending());
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  private sequence = 0;
  private pendingFocus = false;
  private ownedFocus: HTMLElement | null = null;
  private previous = '';
  constructor() {
    const document = this.element.ownerDocument;
    const remember = () => { const active = document.activeElement; this.ownedFocus = this.element.contains(active) ? active as HTMLElement : null; };
    document.addEventListener('focusin', remember);
    this.destroy.onDestroy(() => document.removeEventListener('focusin', remember));
    afterRenderEffect(() => {
      const id = this.activeStepId(), request = this.pending(); this.steps(); this.nextTarget(); this.backTarget(); this.activeStep()?.canProceed(); this.nextAvailable();
      untracked(() => {
        if (request && !this.validTransition(request)) { this.pending.set(null); this.problem.setMessage([() => this.uiRuntimeText_Wizard("uiFoundation.wizard.theConditionsForThisStepHaveChangedReviewItAgain")]); }
        const active = this.element.ownerDocument.activeElement;
        const hiddenOwned = this.element.contains(active) && !(active as HTMLElement).getClientRects().length;
        if ((this.pendingFocus && (active === this.element.ownerDocument.body || this.element.contains(active))) || hiddenOwned) this.activeStep()?.focusStart();
        this.pendingFocus = false;
        if (this.previous !== id) this.finished.set(false);
        this.previous = id;
      });
    });
  }
  ngAfterContentChecked(): void {
    if (!this.controlId().trim() || /\s/.test(this.controlId()) || ![this.label(), this.uiEffective_stepsLabel(), this.uiEffective_backLabel(), this.uiEffective_nextLabel(), this.uiEffective_completeLabel(), this.uiEffective_emptyLabel(), this.uiEffective_pendingLabel(), this.uiEffective_completedLabel()].every(value => value.trim())) throw new Error('Wizard requires nonempty labels and a controlId without whitespace.');
    const seen = new Set<string>();
    for (const step of this.steps()) { if (!step.stepId().trim() || !step.label().trim() || seen.has(step.stepId())) throw new Error('Wizard step IDs must be unique and labels nonempty.'); seen.add(step.stepId()); }
  }
  /** Remember owned focus before Angular removes a projected panel. */
  stepRemoved(panel: HTMLElement): void {
    const active = panel.ownerDocument.activeElement;
    if (panel.contains(active) || panel.contains(this.ownedFocus) && (active === panel.ownerDocument.body || active === this.ownedFocus)) this.pendingFocus = true;
  }
  protected reachable(id: string): boolean { return id === this.activeStepId() || this.nonlinear() || this.history().includes(id); }
  protected jump(id: string): void { if (id !== this.activeStepId() && this.reachable(id)) this.request(id, 'jump'); }
  protected back(): void { const to = this.backTarget(); if (to) this.request(to, 'back'); }
  protected advance(): void { if (!this.activeStep()?.canProceed() || !this.nextAvailable() || this.finished()) return; const to = this.nextTarget(); this.request(to, to === null ? 'complete' : 'next'); }
  private request(to: string | null, reason: WizardTransition['reason']): void {
    if (this.unavailable() || !this.activeStep() || to !== null && !this.steps().some(step => step.stepId() === to && !step.disabled())) return;
    const request = { requestId: ++this.sequence, from: this.activeStepId(), to, reason };
    if (this.element.contains(this.element.ownerDocument.activeElement)) this.activeStep()?.focusStart();
    this.problem.set(''); this.pending.set(request); this.transitionRequested.emit(request);
    if (!this.deferTransitions()) this.approve(request.requestId);
  }
  private validTransition(request: WizardTransition): boolean {
    if (!this.activeStep() || request.from !== this.activeStepId() || request.to !== null && !this.steps().some(step => step.stepId() === request.to && !step.disabled())) return false;
    if (request.reason === 'next' || request.reason === 'complete') return !!this.activeStep()?.canProceed() && this.nextAvailable() && request.to === this.nextTarget();
    if (request.reason === 'back') return request.to === this.backTarget();
    return request.to !== null && this.reachable(request.to);
  }
  /** App approval concerns UI progression; it does not promise backend completion. */
  approve(requestId: number): boolean {
    const request = this.pending();
    if (this.destroy.destroyed || !request || request.requestId !== requestId) return false;
    if (!this.validTransition(request)) { this.pending.set(null); this.problem.setMessage([() => this.uiRuntimeText_Wizard("uiFoundation.wizard.theConditionsForThisStepHaveChangedReviewItAgain")]); return false; }
    this.pending.set(null); this.problem.set('');
    if (request.to === null) { this.finished.set(true); this.completionAccepted.emit(request.from); return true; }
    const history = [...this.history()];
    if (request.reason === 'back' || request.reason === 'jump' && history.includes(request.to)) { const index = history.lastIndexOf(request.to); this.history.set(history.slice(0, index)); }
    else this.history.set([...history, request.from]);
    this.pendingFocus = this.element.contains(this.element.ownerDocument.activeElement); this.finished.set(false); this.chosen.set(request.to); this.currentChange.emit(request.to); return true;
  }
  reject(requestId: number, message: string): boolean {
    if (this.destroy.destroyed || this.pending()?.requestId !== requestId || !message.trim()) return false;
    this.pending.set(null); this.problem.set(message); return true;
  }
  restart(): void {
    if (this.destroy.destroyed) return;
    this.pending.set(null); this.history.set([]); this.finished.set(false); this.problem.set('');
    const id = this.steps().find(step => !step.disabled())?.stepId() ?? ''; this.chosen.set(id); this.currentChange.emit(id);
  }
}

import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  ElementRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

@Component({
  selector: 'ui-tab-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    role: 'tabpanel',
    '[attr.id]': 'panelId()',
    '[attr.aria-labelledby]': 'tabId()',
    '[hidden]': '!isSelected()',
    tabindex: '0',
  },
  styles: `
    :host { display: block; min-inline-size: 0; padding-block: var(--ui-space-field); }
    :host([hidden]) { display: none; }
    :host:focus-visible { outline: var(--ui-border-focus) solid var(--ui-color-focus); outline-offset: var(--ui-border-focus-offset); }
  `,
})
export class TabPanel {
  readonly panelId = input.required<string>();
  readonly label = input.required<string>();
  readonly tabId = computed(() => `${this.panelId()}-tab`);
  private readonly tabs = inject<Tabs>(forwardRef(() => Tabs));
  protected readonly isSelected = computed(() => this.tabs.activePanelId() === this.panelId());

  /** Internal ownership check for descendants projected into nested tab sets. */
  belongsTo(tabs: Tabs): boolean {
    return this.tabs === tabs;
  }
}

/** Horizontal, manual-activation tabs. Selection is controlled by the app. */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="tablist" [attr.aria-label]="label()" aria-orientation="horizontal"
      (focusout)="onFocusOut($event)">
      @for (panel of panels(); track panel.panelId(); let index = $index) {
        <button #tabButton type="button" role="tab" [id]="panel.tabId()"
          [attr.aria-controls]="panel.panelId()"
          [attr.aria-selected]="activePanelId() === panel.panelId()"
          [attr.tabindex]="focusPanelId() === panel.panelId() ? 0 : -1"
          (focus)="onTabFocus(panel.panelId())"
          (keydown)="onKeydown($event, index)"
          (click)="selectPanel(panel.panelId())">{{ panel.label() }}</button>
      }
    </div>
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      min-inline-size: 0;
      color: var(--ui-color-text);
      font-family: var(--ui-font-body);
      font-size: var(--ui-text-body);
      font-weight: var(--ui-weight-body);
      line-height: var(--ui-leading-body);
    }
    :host([hidden]) { display: none; }
    [role='tablist'] {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ui-space-control-gap);
      border-block-end: var(--ui-border-control) solid var(--ui-color-border);
    }
    [role='tab'] {
      box-sizing: border-box;
      min-block-size: var(--ui-size-control);
      min-inline-size: var(--ui-size-control);
      max-inline-size: 100%;
      padding: var(--ui-space-control-y) var(--ui-space-control-x);
      border: var(--ui-border-control) solid transparent;
      border-block-end: var(--ui-border-focus) solid transparent;
      background: var(--ui-color-surface);
      color: var(--ui-color-text);
      font: inherit;
      font-weight: var(--ui-weight-control);
      line-height: var(--ui-leading-control);
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    [role='tab'][aria-selected='true'] {
      border-block-end-color: var(--ui-color-action);
      color: var(--ui-color-action);
      font-weight: var(--ui-weight-heading);
    }
    [role='tab']:focus-visible { outline: var(--ui-border-focus) solid var(--ui-color-focus); outline-offset: var(--ui-border-focus-offset); }
  `,
})
export class Tabs implements AfterContentChecked {
  readonly label = input.required<string>();
  readonly selected = input('');
  readonly selectedChange = output<string>();
  private readonly projectedPanels = contentChildren(TabPanel, { descendants: true });
  // A descendants query sees all panels declared in this usage template,
  // including those projected into an inner ui-tabs. DI identifies the owner.
  readonly panels = computed(() => this.projectedPanels().filter((panel) => panel.belongsTo(this)));
  readonly activePanelId = computed(() => this.selected() || this.panels()[0]?.panelId() || '');

  private readonly focusedPanel = signal<string | null>(null);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  protected readonly focusPanelId = computed(() => {
    const focused = this.focusedPanel();
    return this.panels().some((panel) => panel.panelId() === focused) ? focused : this.activePanelId();
  });

  ngAfterContentChecked(): void {
    const panels = this.panels();
    if (!this.label().trim()) throw new Error('ui-tabs label must be nonempty.');
    if (!panels.length) throw new Error('ui-tabs requires at least one ui-tab-panel.');
    const ids = panels.map((panel) => panel.panelId());
    if (ids.some((id) => !id.trim() || /\s/.test(id)) || new Set(ids).size !== ids.length) {
      throw new Error('ui-tab-panel panelId values must be nonempty, contain no whitespace and be unique.');
    }
    const allIds = [...ids, ...panels.map((panel) => panel.tabId())];
    if (new Set(allIds).size !== allIds.length) {
      throw new Error('ui-tab-panel panelId must not collide with another generated tab ID (panelId + "-tab").');
    }
    if (panels.some((panel) => !panel.label().trim())) {
      throw new Error('ui-tab-panel label must be nonempty.');
    }
    if (this.selected() && !ids.includes(this.selected())) {
      throw new Error('ui-tabs selected must match a ui-tab-panel panelId.');
    }
  }

  protected onTabFocus(panelId: string): void {
    this.focusedPanel.set(panelId);
  }

  protected onFocusOut(event: FocusEvent): void {
    const tablist = event.currentTarget as HTMLElement;
    if (!tablist.contains(event.relatedTarget as Node | null)) this.focusedPanel.set(null);
  }

  protected selectPanel(panelId: string): void {
    this.focusedPanel.set(panelId);
    if (panelId !== this.activePanelId()) this.selectedChange.emit(panelId);
  }

  protected onKeydown(event: KeyboardEvent, currentIndex: number): void {
    const count = this.panels().length;
    let index: number;
    switch (event.key) {
      case 'ArrowRight': index = (currentIndex + 1) % count; break;
      case 'ArrowLeft': index = (currentIndex - 1 + count) % count; break;
      case 'Home': index = 0; break;
      case 'End': index = count - 1; break;
      default: return; // Native Enter/Space clicks provide manual activation.
    }
    event.preventDefault();
    event.stopPropagation();
    this.buttons()[index]?.nativeElement.focus();
  }
}

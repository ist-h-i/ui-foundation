import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessage,UiStableMessagePipe} from './locale';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, linkedSignal, output, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import type { FeedbackSeverity } from './feedback';
export interface CenterNotification {
    id: string;
    title: string;
    message: string;
    category?: string;
    read?: boolean;
    severity?: FeedbackSeverity;
    disabled?: boolean;
    busy?: boolean;
}
export interface NotificationReadChange {
    id: string;
    read: boolean;
}
@Component({ selector: 'ui-notification-center', standalone: true, imports: [ActionControl,UiStableMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<section [attr.aria-label]="label()"><h2>{{label()}}</h2><div class="ui-notification-filters"><div class="ui-notification-filter"><label [for]="controlId()+'-filter'">{{'uiFoundation.notificationCenter.statusFilter' | uiStableMessage}}</label><span class="ui-select-control"><select class="ui-field-control" [id]="controlId()+'-filter'" [value]="filterValue()" (change)="setFilter($event)"><option value="all">{{'uiFoundation.notificationCenter.allStatuses' | uiStableMessage}}</option><option value="unread">{{'uiFoundation.notificationCenter.unread' | uiStableMessage}}</option><option value="read">{{'uiFoundation.notificationCenter.read' | uiStableMessage}}</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div><div class="ui-notification-filter"><label [for]="controlId()+'-category'">{{'uiFoundation.notificationCenter.categoryFilter' | uiStableMessage}}</label><span class="ui-select-control"><select class="ui-field-control" [id]="controlId()+'-category'" [value]="categoryValue()" (change)="setCategory($event)"><option value="">{{'uiFoundation.notificationCenter.allCategories' | uiStableMessage}}</option>@for(category of categories();track category){<option [value]="category" [selected]="category===categoryValue()">{{category}}</option>}</select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div></div><p tabindex="-1" role="status" aria-atomic="true">{{uiText_NotificationCenter({id: 'uiFoundation.notificationCenter.status', parameters: {visible: visible().length, unread: unread(), loading: loading() ? uiEffective_loadingMessage() : null } }) }}</p><ul>@for(notice of visible();track notice.id){<li [attr.data-notice]="notice.id" [attr.data-read]="!!notice.read" [attr.data-severity]="notice.severity??'info'"><h3>{{notice.title}}</h3><p>{{notice.message}}</p><p class="ui-notification-meta">@if(notice.category){<span>{{notice.category}}</span>}<span>{{notice.read?('uiFoundation.notificationCenter.read' | uiStableMessage):('uiFoundation.notificationCenter.unread' | uiStableMessage)}}</span></p><div class="ui-notification-actions"><button uiAction [disabled]="disabled()||!!notice.disabled" [busy]="!!notice.busy" [attr.aria-label]="uiText_NotificationCenter({id: notice.read ? 'uiFoundation.notificationCenter.markUnreadLabel' : 'uiFoundation.notificationCenter.markReadLabel', parameters: {title: notice.title}})" (click)="requestRead(notice)">{{notice.read?('uiFoundation.notificationCenter.markUnread' | uiStableMessage):('uiFoundation.notificationCenter.markRead' | uiStableMessage)}}</button><button uiAction class="ui-notification-delete" [disabled]="disabled()||!!notice.disabled" [busy]="!!notice.busy" [attr.aria-label]="uiText_NotificationCenter({id: 'uiFoundation.notificationCenter.deleteLabel', parameters: {title: notice.title}})" (click)="requestDelete(notice)">{{'uiFoundation.notificationCenter.delete' | uiStableMessage}}</button></div></li>}</ul>@if(!visible().length){<p>{{uiEffective_emptyMessage()}}</p>}@if(error()){<p class="ui-notification-error" role="alert">{{error()}}</p>}@if(hasMore()){<button uiAction [busy]="loading()" [disabled]="disabled()" (click)="requestMore()">{{error()?uiEffective_retryLabel():uiEffective_loadMoreLabel()}}</button>}</section>`,
    styles: `:host{box-sizing:border-box;display:block;min-inline-size:0;max-inline-size:100%;font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);overflow-wrap:anywhere;}:host([hidden]){display:none;}section{min-inline-size:0;}h2{font-size:var(--ui-text-section-title);line-height:var(--ui-leading-heading);margin-block:0 var(--ui-space-control-gap);}h3,p{margin-block:0 var(--ui-space-control-gap);}ul{list-style:none;margin:0;padding:0;}li{margin-block:var(--ui-space-control-gap);padding:var(--ui-space-field);border-block-start:var(--ui-border-control) solid var(--ui-color-border);background:var(--ui-color-surface);}li[data-read="false"]{border-inline-start:var(--ui-border-focus) solid var(--ui-color-action);}li[data-severity="warning"]{background:var(--ui-color-warning-surface);color:var(--ui-color-warning);}li[data-severity="error"]{background:var(--ui-color-error-surface);color:var(--ui-color-danger);}li[data-severity="success"]{background:var(--ui-color-success-surface);color:var(--ui-color-success);}.ui-notification-meta{display:flex;flex-wrap:wrap;gap:var(--ui-space-field);font-size:var(--ui-text-small);}.ui-notification-filters,.ui-notification-actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}.ui-notification-filters{align-items:end;margin-block:var(--ui-space-field);}.ui-notification-filter{display:grid;gap:var(--ui-space-control-gap);min-inline-size:0;max-inline-size:100%;flex:1 1 var(--ui-size-form-label);}select,button{max-inline-size:100%;}.ui-notification-delete{background:transparent;border-color:transparent;}.ui-notification-delete:hover{text-decoration:underline;}.ui-notification-error{color:var(--ui-color-danger);}` })
export class NotificationCenter {
 protected readonly uiText_NotificationCenter=injectUiMessage();
    readonly controlId = input.required<string>();
    readonly label = input.required<string>();
    readonly items = input<readonly CenterNotification[]>([]);
    readonly filter = input<'all' | 'unread' | 'read'>('all');
    readonly filterChange = output<'all' | 'unread' | 'read'>();
    readonly category = input('');
    readonly categoryChange = output<string>();
    readonly disabled = input(false, { transform: booleanAttribute });
    readonly loading = input(false, { transform: booleanAttribute });
    readonly hasMore = input(false, { transform: booleanAttribute });
    readonly error = input('');
    readonly emptyMessage = input<string>();
 protected readonly uiEffective_emptyMessage=uiLocaleComputed(()=>this.emptyMessage()??this.uiText_NotificationCenter({id:'uiFoundation.notificationCenter.empty'}));
    readonly loadMoreLabel = input<string>();
 protected readonly uiEffective_loadMoreLabel=uiLocaleComputed(()=>this.loadMoreLabel()??this.uiText_NotificationCenter({id:'uiFoundation.notificationCenter.loadMore'}));
    readonly loadingMessage = input<string>();
 protected readonly uiEffective_loadingMessage=uiLocaleComputed(()=>this.loadingMessage()??this.uiText_NotificationCenter({id:'uiFoundation.notificationCenter.loading'}));
    readonly retryLabel = input<string>();
 protected readonly uiEffective_retryLabel=uiLocaleComputed(()=>this.retryLabel()??this.uiText_NotificationCenter({id:'uiFoundation.notificationCenter.retry'}));
    readonly readRequested = output<NotificationReadChange>();
    readonly deleteRequested = output<string>();
    readonly loadMoreRequested = output<void>();
    protected readonly filterValue = linkedSignal(() => this.filter());
    protected readonly categoryValue = linkedSignal(() => this.category());
    protected readonly categories = computed(() => [...new Set([this.categoryValue(), ...this.items().map(item => item.category)].filter((value): value is string => !!value))]);
    protected readonly unread = computed(() => this.items().filter(item => !item.read).length);
    protected readonly visible = computed(() => this.items().filter(item => (this.filterValue() === 'all' || (this.filterValue() === 'read') === !!item.read) && (!this.categoryValue() || item.category === this.categoryValue())));
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    constructor() {
        effect(() => {
            const ids = new Set<string>();
            for (const item of this.items()) {
                if (!item.id.trim() || ids.has(item.id) || !item.title.trim())
                    throw new Error('NotificationCenter needs unique nonempty IDs and titles.');
                ids.add(item.id);
            }
        });
        effect(() => {
            const items = this.visible(), disabled = this.disabled(), loading = this.loading(), hasMore = this.hasMore();
            untracked(() => {
                const active = this.element.ownerDocument.activeElement as HTMLElement | null;
                if (!active || !this.element.contains(active))
                    return;
                const id = active.closest<HTMLElement>('[data-notice]')?.dataset['notice'];
                if (!id) {
                    if (active.tagName === 'BUTTON' && (disabled || loading || !hasMore))
                        this.element.querySelector<HTMLElement>('[role="status"]')?.focus();
                    return;
                }
                if (!disabled && items.some(item => item.id === id && !item.disabled && !item.busy))
                    return;
                const next = items.find(item => !item.disabled && !item.busy);
                const target = next && !disabled ? this.element.querySelector<HTMLElement>('[data-notice="' + CSS.escape(next.id) + '"] button:not(:disabled)') : null;
                (target ?? this.element.querySelector<HTMLElement>('select'))?.focus();
            });
        });
    }
    protected setFilter(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        if (value === 'all' || value === 'read' || value === 'unread') {
            this.filterValue.set(value);
            this.filterChange.emit(value);
        }
    }
    protected setCategory(event: Event): void { const value = (event.target as HTMLSelectElement).value; this.categoryValue.set(value); this.categoryChange.emit(value); }
    protected requestRead(item: CenterNotification): void {
        if (!this.disabled() && !item.disabled && !item.busy)
            this.readRequested.emit({ id: item.id, read: !item.read });
    }
    protected requestDelete(item: CenterNotification): void {
        if (!this.disabled() && !item.disabled && !item.busy)
            this.deleteRequested.emit(item.id);
    }
    protected requestMore(): void {
        if (this.hasMore() && !this.loading() && !this.disabled())
            this.loadMoreRequested.emit();
    }
}

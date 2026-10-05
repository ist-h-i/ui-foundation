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
@Component({ selector: 'ui-notification-center', standalone: true, imports: [ActionControl], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<section [attr.aria-label]="label()"><h2>{{label()}}</h2><div class="ui-notification-filters"><label [for]="controlId()+'-filter'">通知の状態</label><select [id]="controlId()+'-filter'" [value]="filterValue()" (change)="setFilter($event)"><option value="all">すべて</option><option value="unread">未読</option><option value="read">既読</option></select><label [for]="controlId()+'-category'">通知の分類</label><select [id]="controlId()+'-category'" [value]="categoryValue()" (change)="setCategory($event)"><option value="">すべて</option>@for(category of categories();track category){<option [value]="category">{{category}}</option>}</select></div><p tabindex="-1" role="status" aria-atomic="true">{{visible().length}}件表示、未読 {{unread()}}件{{loading()?"、"+loadingMessage():""}}</p><ul>@for(notice of visible();track notice.id){<li [attr.data-notice]="notice.id" [attr.data-read]="!!notice.read" [attr.data-severity]="notice.severity??'info'"><h3>{{notice.title}}</h3><p>{{notice.message}}</p>@if(notice.category){<p class="ui-notification-category">{{notice.category}}</p>}<p>{{notice.read?'既読':'未読'}}</p><div class="ui-notification-actions"><button uiAction [disabled]="disabled()||!!notice.disabled" [busy]="!!notice.busy" (click)="requestRead(notice)">{{notice.read?'未読に戻す':'既読にする'}}: {{notice.title}}</button><button uiAction [disabled]="disabled()||!!notice.disabled" [busy]="!!notice.busy" (click)="requestDelete(notice)">削除: {{notice.title}}</button></div></li>}</ul>@if(!visible().length){<p>{{emptyMessage()}}</p>}@if(error()){<p class="ui-notification-error" role="alert">{{error()}}</p>}@if(hasMore()){<button uiAction [busy]="loading()" [disabled]="disabled()" (click)="requestMore()">{{error()?retryLabel():loadMoreLabel()}}</button>}</section>`,
    styles: `:host{box-sizing:border-box;display:block;min-inline-size:0;max-inline-size:100%;font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);overflow-wrap:anywhere;}:host([hidden]){display:none;}section{padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);}h2{font-size:var(--ui-text-heading);line-height:var(--ui-leading-heading);margin-block:0 var(--ui-space-control-gap);}h3,p{margin-block:0 var(--ui-space-control-gap);}ul{list-style:none;margin:0;padding:0;}li{margin-block:var(--ui-space-field);padding:var(--ui-space-field);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);background:var(--ui-color-surface);}li[data-read="false"]{border-inline-start-width:var(--ui-border-focus);}li[data-severity="warning"]{background:var(--ui-color-warning-surface);color:var(--ui-color-warning);}li[data-severity="error"]{background:var(--ui-color-error-surface);color:var(--ui-color-danger);}li[data-severity="success"]{background:var(--ui-color-success-surface);color:var(--ui-color-success);}.ui-notification-category{font-size:var(--ui-text-small);}.ui-notification-filters,.ui-notification-actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);}select,button{max-inline-size:100%;}.ui-notification-error{color:var(--ui-color-danger);}` })
export class NotificationCenter {
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
    readonly emptyMessage = input('条件に合う通知はありません。');
    readonly loadMoreLabel = input('通知を追加取得');
    readonly loadingMessage = input('通知を取得しています。');
    readonly retryLabel = input('通知の取得を再試行');
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

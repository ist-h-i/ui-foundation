import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Card, TextInput, ActionControl, Menu, OverlayHost, FlowEditor, Chart } from './.ui/generated/angular/index';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
export class IndependentFinalConsumer {
    opened = signal(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "opened" }] : /* istanbul ignore next */ []));
    value = new FormControl('保持する raw input');
    items = [{ id: 'raw-parent', label: '親', children: [{ id: 'raw-child', label: '子', children: [{ id: 'raw-leaf', label: '葉' }] }] }];
    diagram = { nodes: [{ id: 'raw-node', label: '申請', x: 10, y: 20 }], edges: [] };
    series = [{ id: 'raw-series', label: '件数', points: [{ id: 'raw-point', label: '確認', value: 42 }] }];
    lastIntent = null;
    intent(change) { this.lastIntent = change; }
    static ɵfac = function IndependentFinalConsumer_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || IndependentFinalConsumer)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: IndependentFinalConsumer, selectors: [["independent-final-consumer"]], decls: 8, vars: 6, consts: [["cardId", "independent-card", "title", "\u4FDD\u6301\u3059\u308B\u7533\u8ACB"], ["controlId", "independent-field", "label", "\u4FDD\u6301\u3059\u308B\u5165\u529B", 3, "formControl"], ["uiAction", "", "type", "button", 3, "click"], ["menuId", "independent-menu", "label", "\u516C\u958B\u3059\u308B\u968E\u5C64\u30E1\u30CB\u30E5\u30FC", 3, "openChange", "items", "open", "closeOnSelect"], ["label", "\u516C\u958B\u56F3", 3, "changeRequested", "model"], ["label", "\u516C\u958B\u96C6\u8A08", "kind", "gauge", 3, "series"]], template: function IndependentFinalConsumer_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "ui-card", 0)(1, "ui-text-input", 1);
            i0.ɵɵcontrolCreate();
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵlistener("click", function IndependentFinalConsumer_Template_button_click_2_listener() { return ctx.opened.set(!ctx.opened()); });
            i0.ɵɵtext(3, "\u30E1\u30CB\u30E5\u30FC\u3092\u5207\u308A\u66FF\u3048\u308B");
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(4, "ui-overlay-host")(5, "ui-menu", 3);
            i0.ɵɵlistener("openChange", function IndependentFinalConsumer_Template_ui_menu_openChange_5_listener($event) { return ctx.opened.set($event); });
            i0.ɵɵelementEnd()();
            i0.ɵɵelementStart(6, "ui-flow-editor", 4);
            i0.ɵɵlistener("changeRequested", function IndependentFinalConsumer_Template_ui_flow_editor_changeRequested_6_listener($event) { return ctx.intent($event); });
            i0.ɵɵelementEnd();
            i0.ɵɵelement(7, "ui-chart", 5);
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵproperty("formControl", ctx.value);
            i0.ɵɵcontrol();
            i0.ɵɵadvance(4);
            i0.ɵɵproperty("items", ctx.items)("open", ctx.opened())("closeOnSelect", false);
            i0.ɵɵadvance();
            i0.ɵɵproperty("model", ctx.diagram);
            i0.ɵɵadvance();
            i0.ɵɵproperty("series", ctx.series);
        } }, dependencies: [Card, TextInput, ActionControl, Menu, OverlayHost, FlowEditor, Chart, ReactiveFormsModule, i1.NgControlStatus, i1.FormControlDirective], encapsulation: 2 });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(IndependentFinalConsumer, [{
        type: Component,
        args: [{ selector: 'independent-final-consumer', standalone: true, imports: [Card, TextInput, ActionControl, Menu, OverlayHost, FlowEditor, Chart, ReactiveFormsModule],
                template: `<ui-card cardId="independent-card" title="保持する申請"><ui-text-input controlId="independent-field" label="保持する入力" [formControl]="value"/><button uiAction type="button" (click)="opened.set(!opened())">メニューを切り替える</button></ui-card><ui-overlay-host><ui-menu menuId="independent-menu" label="公開する階層メニュー" [items]="items" [open]="opened()" (openChange)="opened.set($event)" [closeOnSelect]="false"/></ui-overlay-host><ui-flow-editor label="公開図" [model]="diagram" (changeRequested)="intent($event)"/><ui-chart label="公開集計" kind="gauge" [series]="series"/>` }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(IndependentFinalConsumer, { className: "IndependentFinalConsumer", filePath: "public-menu-final-consumer.ts", lineNumber: 7 }); })();

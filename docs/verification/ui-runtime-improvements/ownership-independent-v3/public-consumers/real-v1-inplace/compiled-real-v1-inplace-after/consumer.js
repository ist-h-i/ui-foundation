import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Card, TextInput, ActionControl } from './relocated/ui/angular/index';
import * as i0 from "@angular/core";
import * as i1 from "@angular/forms";
export class OwnershipConsumer {
    title = '移動した公開consumer';
    value = new FormControl('raw保持');
    typedNodes = [{ id: 'a', label: 'A', data: { amount: 1 } }];
    static ɵfac = function OwnershipConsumer_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || OwnershipConsumer)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: OwnershipConsumer, selectors: [["ownership-consumer"]], decls: 4, vars: 2, consts: [["cardId", "ownership-card", 3, "title"], ["controlId", "ownership-field", "label", "\u4FDD\u6301\u3059\u308B\u5165\u529B", 3, "formControl"], ["uiAction", "", "type", "button"]], template: function OwnershipConsumer_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelementStart(0, "ui-card", 0)(1, "ui-text-input", 1);
            i0.ɵɵcontrolCreate();
            i0.ɵɵelementEnd();
            i0.ɵɵelementStart(2, "button", 2);
            i0.ɵɵtext(3, "\u4FDD\u5B58");
            i0.ɵɵelementEnd()();
        } if (rf & 2) {
            i0.ɵɵproperty("title", ctx.title);
            i0.ɵɵadvance();
            i0.ɵɵproperty("formControl", ctx.value);
            i0.ɵɵcontrol();
        } }, dependencies: [Card, TextInput, ActionControl, ReactiveFormsModule, i1.NgControlStatus, i1.FormControlDirective], encapsulation: 2 });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(OwnershipConsumer, [{
        type: Component,
        args: [{ selector: 'ownership-consumer', standalone: true, imports: [Card, TextInput, ActionControl, ReactiveFormsModule], template: `<ui-card cardId="ownership-card" [title]="title"><ui-text-input controlId="ownership-field" label="保持する入力" [formControl]="value"/><button uiAction type="button">保存</button></ui-card>` }]
    }], null, null); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(OwnershipConsumer, { className: "OwnershipConsumer", filePath: "consumer.ts", lineNumber: 5 }); })();

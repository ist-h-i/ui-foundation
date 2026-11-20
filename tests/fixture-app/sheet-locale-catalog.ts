import {Component,computed,signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {Spreadsheet,UiLocaleScope,type UiLocaleOptions,type SheetModel} from '../../.ui/generated/angular/index';

export const sheetLibraryFailure='計算結果を確認できませんでした。セルの原文は保持されています。再計算してください。';
export const sheetAppFailure='The application refused this calculation.';
@Component({selector:'fixture-app',standalone:true,imports:[Spreadsheet,UiLocaleScope,JsonPipe],template:`
<main [attr.data-ui-profile]="profile()" [uiLocale]="options()">
 <h1>計算エラーの言語境界</h1>
 <label>プロファイル<span class="ui-select-control fixture-select"><select class="ui-field-control" [value]="profile()" (change)="changeProfile($event)"><option value="guided">guided</option><option value="dense">dense</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label>
 <label>計算worker<span class="ui-select-control fixture-select"><select class="ui-field-control" [value]="worker()" (change)="changeWorker($event)"><option value="/assets/sheet-formula.worker.js">実数式worker</option><option value="/assets/invalid-library-worker.mjs">構造エラー</option><option value="/assets/app-domain-worker.mjs">アプリ提供エラー</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></label>
 <button type="button" (click)="second.set(!second())">辞書を切り替え</button>
 <ui-spreadsheet label="保持する数式" [sheet]="sheet" [workerUrl]="worker()" />
 <output id="sheet-source">{{sheet | json}}</output>
</main>`})
export class SheetLocaleCatalog {
 readonly profile=signal('guided');readonly worker=signal('/assets/sheet-formula.worker.js');readonly second=signal(false);
 readonly sheet:SheetModel={rows:[[2,3,'=SUM(A1:B1)']]};
 readonly options=computed<UiLocaleOptions>(()=>({locale:this.second()?'de-DE':'en-US',translate:request=>request.id==='uiFoundation.spreadsheet.calculationUnconfirmed'?(this.second()?'Die Berechnung konnte nicht bestätigt werden.':'The calculation could not be confirmed.'):undefined}));
 changeProfile(event:Event):void{this.profile.set((event.target as HTMLSelectElement).value);}
 changeWorker(event:Event):void{this.worker.set((event.target as HTMLSelectElement).value);}
}

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scheduler-catalog.spec.ts >> scheduler catalog guided >> exact gap/fold native time-band controls, agenda and preserved errors/drafts: forced temporal-polyfill 1.0.5
- Location: tests/ui/scheduler-catalog.spec.ts:35:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.elementHandle: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#schedule-start-gap-cross')

```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "予定の確認と移動" [level=1] [ref=e4]
  - generic [ref=e5]:
    - generic [ref=e6]: 利用profile
    - combobox "利用profile" [ref=e7]:
      - option "guided" [selected]
      - option "dense"
    - generic [ref=e8]:
      - checkbox "RTL" [ref=e9]
      - text: RTL
    - generic [ref=e10]:
      - checkbox "処理中" [ref=e11]
      - text: 処理中
    - generic [ref=e12]:
      - checkbox "読み取り専用" [ref=e13]
      - text: 読み取り専用
    - generic [ref=e14]:
      - checkbox "移動を拒否" [ref=e15]
      - text: 移動を拒否
    - button "formと部品を無効切替" [ref=e16]
    - button "formと移動をreset" [ref=e17]
  - text: 表示タイムゾーン
  - combobox "表示タイムゾーン" [ref=e18]:
    - option "America/New_York" [selected]
    - option "Asia/Tokyo"
    - option "UTC"
    - option "Australia/Lord_Howe"
    - option "Pacific/Apia"
    - option "America/St_Johns"
    - option "Missing/Zone"
  - text: 表示時間帯
  - combobox "表示時間帯" [ref=e19]:
    - option "全日"
    - option "09:00–17:00"
    - option "01:20–01:40"
    - option "02:15–02:45"
    - option "01:45–03:15" [selected]
    - option "02:05–02:25"
    - option "02:25–02:35"
    - option "23:00–24:00"
    - option "14:20–14:40"
  - text: 実時間帯の予定例
  - combobox "実時間帯の予定例" [ref=e20]:
    - option "既定の予約"
    - option "重複時刻"
    - option "欠落時刻" [selected]
    - option "30分の欠落"
    - option "全日のスキップ"
    - option "深夜に前日へ戻る"
    - option "合法な予定IDの境界"
  - region "会議室の予定" [ref=e22]:
    - generic [ref=e23]:
      - heading "会議室の予定" [level=2] [ref=e24]
      - generic [ref=e25]: 表示日
      - textbox "表示日" [ref=e26]: 2026-03-08
      - generic [ref=e27]: 予定の表示
      - combobox "予定の表示" [ref=e28]:
        - option "日" [selected]
        - option "週"
        - option "月"
        - option "一覧"
      - button "前の期間" [ref=e29]
      - button "次の期間" [ref=e30]
    - paragraph [ref=e31]: "表示タイムゾーン: America/New_York · 時間帯: 01:45–03:15 · 2026-03-08–2026-03-08 · 4 件"
    - group "表示するリソース" [ref=e32]:
      - generic [ref=e34]:
        - checkbox "東会議室" [checked] [ref=e35]
        - text: 東会議室
      - generic [ref=e36]:
        - checkbox "西会議室" [checked] [ref=e37]
        - text: 西会議室
      - generic [ref=e38]:
        - checkbox "閉鎖中の会議室" [checked] [ref=e39]
        - text: 閉鎖中の会議室
      - button "全リソースを表示" [ref=e40]
      - generic [ref=e41]: 未割当の予定も表示します。
    - status [ref=e42]: 予定移動は各予定の「移動先を編集」から開始できます。
    - region "会議室の予定の予定表示" [ref=e43]:
      - list [ref=e44]:
        - listitem [ref=e45]:
          - heading "2026年3月8日日曜日" [level=3] [ref=e46]
          - paragraph [ref=e47]: 3 件
        - listitem [ref=e48]:
          - heading "欠落時間をまたぐ予定" [level=3] [ref=e49]
          - paragraph [ref=e50]:
            - time [ref=e51]: 2026/03/08 1:30
            - text: ～
            - time [ref=e52]: 2026/03/08 3:30
          - paragraph [ref=e53]: 東会議室
          - paragraph [ref=e54]: UTCオフセットの変化をまたぐ予定です。表示時刻は指定したタイムゾーンで確認してください。
          - paragraph [ref=e55]: 受付担当
          - text: 欠落時間をまたぐ予定のメモ
          - textbox "欠落時間をまたぐ予定のメモ" [ref=e56]: 時間帯の回帰
          - button "欠落時間をまたぐ予定の移動先を編集" [expanded] [active] [ref=e57]: 移動先を編集
          - region "欠落時間をまたぐ予定の移動入力" [ref=e58]:
            - group "欠落時間をまたぐ予定の移動先" [ref=e59]:
              - generic [ref=e61]: 開始の現地日時
              - textbox "開始の現地日時" [ref=e62]: 2026-03-08T01:30
              - paragraph [ref=e63]:
                - text: "移動先の開始:"
                - generic [ref=e64]: 2026-03-08 01:30:00
              - generic [ref=e65]: 終了の現地日時
              - textbox "終了の現地日時" [ref=e66]: 2026-03-08T03:30
              - paragraph [ref=e67]:
                - text: "移動先の終了:"
                - generic [ref=e68]: 2026-03-08 03:30:00
              - generic [ref=e69]: 移動先タイムゾーン
              - textbox "移動先タイムゾーン" [ref=e70]: America/New_York
              - generic [ref=e71]: 開始の重複時刻
              - combobox "開始の重複時刻" [ref=e72]:
                - option "重複時は確認を求める" [selected]
                - option "先に発生する時刻"
                - option "後に発生する時刻"
              - generic [ref=e73]: 終了の重複時刻
              - combobox "終了の重複時刻" [ref=e74]:
                - option "重複時は確認を求める" [selected]
                - option "先に発生する時刻"
                - option "後に発生する時刻"
              - group "移動先のリソース" [ref=e75]:
                - generic [ref=e77]:
                  - checkbox "東会議室" [checked] [ref=e78]
                  - text: 東会議室
                - generic [ref=e79]:
                  - checkbox "西会議室" [ref=e80]
                  - text: 西会議室
                - generic [ref=e81]:
                  - checkbox "閉鎖中の会議室（移動先として無効）" [disabled] [ref=e82]
                  - text: 閉鎖中の会議室（移動先として無効）
            - paragraph [ref=e83]: 入力した現地日時を保持して要求します。DSTの欠落・重複時刻、開始と終了の順序、業務上の移動許可はアプリが確認します。
            - status
            - generic [ref=e84]:
              - button "移動を要求" [ref=e85]
              - button "現在の予定で入力を戻す" [ref=e86]
              - button "移動入力を閉じる" [ref=e87]
        - listitem [ref=e88]:
          - heading "欠落直前の帯内" [level=3] [ref=e89]
          - paragraph [ref=e90]:
            - time [ref=e91]: 2026/03/08 1:40
            - text: ～
            - time [ref=e92]: 2026/03/08 1:50
          - paragraph [ref=e93]: 東会議室
          - paragraph [ref=e94]: 受付担当
          - text: 欠落直前の帯内のメモ
          - textbox "欠落直前の帯内のメモ" [ref=e95]: 時間帯の回帰
          - button "欠落直前の帯内の移動先を編集" [ref=e96]: 移動先を編集
        - listitem [ref=e97]:
          - heading "欠落直後の帯内" [level=3] [ref=e98]
          - paragraph [ref=e99]:
            - time [ref=e100]: 2026/03/08 3:10
            - text: ～
            - time [ref=e101]: 2026/03/08 3:20
          - paragraph [ref=e102]: 東会議室
          - paragraph [ref=e103]: 受付担当
          - text: 欠落直後の帯内のメモ
          - textbox "欠落直後の帯内のメモ" [ref=e104]: 時間帯の回帰
          - button "欠落直後の帯内の移動先を編集" [ref=e105]: 移動先を編集
        - listitem [ref=e106]:
          - heading "元のエラー予定を保持" [level=3] [ref=e107]
          - paragraph [ref=e108]:
            - time [ref=e109]: 2026-03-08T02:30:00
            - text: ～
            - time [ref=e110]: 2026-03-08T03:30:00
          - paragraph [ref=e111]: 東会議室
          - alert [ref=e112]: 予定の日時には有効なオフセット付きISO文字列を指定してください。元の予定を保持しています。
          - paragraph [ref=e113]: 受付担当
          - text: 元のエラー予定を保持のメモ
          - textbox "元のエラー予定を保持のメモ" [ref=e114]: 時間帯の回帰
          - button "元のエラー予定を保持の移動先を編集" [disabled] [ref=e115]: 移動先を編集
  - status [ref=e116]: "\"最初のメモ\""
  - status [ref=e117]: "null"
  - generic [ref=e118]:
    - button "最新の移動を失敗" [ref=e119]
    - button "最新の移動を完了" [ref=e120]
    - button "最初の旧要求を完了" [ref=e121]
    - button "外部から予定を変更" [ref=e122]
    - button "編集中の予定を除去" [ref=e123]
    - button "Schedulerを破棄" [ref=e124]
    - button "移動要求を失効" [ref=e125]
  - status
  - status [ref=e126]: "0"
  - status
  - status [ref=e127]: "null"
  - status [ref=e128]: "0"
  - region "一覧の予定" [ref=e130]:
    - generic [ref=e131]:
      - heading "一覧の予定" [level=2] [ref=e132]
      - generic [ref=e133]: 表示日
      - textbox "表示日" [ref=e134]: 2026-03-08
      - button "前の期間" [ref=e135]
      - button "次の期間" [ref=e136]
    - paragraph [ref=e137]: "表示タイムゾーン: America/New_York · 時間帯: 01:45–03:15 · 2026-03-08–2026-03-10 · 4 件"
    - group "表示するリソース" [ref=e138]:
      - generic [ref=e140]:
        - checkbox "東会議室" [checked] [ref=e141]
        - text: 東会議室
      - generic [ref=e142]:
        - checkbox "西会議室" [checked] [ref=e143]
        - text: 西会議室
      - generic [ref=e144]:
        - checkbox "閉鎖中の会議室" [checked] [ref=e145]
        - text: 閉鎖中の会議室
      - button "全リソースを表示" [ref=e146]
      - generic [ref=e147]: 未割当の予定も表示します。
    - status [ref=e148]: 予定移動は各予定の「移動先を編集」から開始できます。
    - region "一覧の予定の予定表示" [ref=e149]:
      - list [ref=e150]:
        - listitem [ref=e151]:
          - heading "欠落時間をまたぐ予定" [level=3] [ref=e152]
          - paragraph [ref=e153]:
            - time [ref=e154]: 2026/03/08 1:30
            - text: ～
            - time [ref=e155]: 2026/03/08 3:30
          - paragraph [ref=e156]: 東会議室
          - paragraph [ref=e157]: UTCオフセットの変化をまたぐ予定です。表示時刻は指定したタイムゾーンで確認してください。
          - button "欠落時間をまたぐ予定の移動先を編集" [disabled] [ref=e158]: 移動先を編集
        - listitem [ref=e159]:
          - heading "欠落直前の帯内" [level=3] [ref=e160]
          - paragraph [ref=e161]:
            - time [ref=e162]: 2026/03/08 1:40
            - text: ～
            - time [ref=e163]: 2026/03/08 1:50
          - paragraph [ref=e164]: 東会議室
          - button "欠落直前の帯内の移動先を編集" [disabled] [ref=e165]: 移動先を編集
        - listitem [ref=e166]:
          - heading "欠落直後の帯内" [level=3] [ref=e167]
          - paragraph [ref=e168]:
            - time [ref=e169]: 2026/03/08 3:10
            - text: ～
            - time [ref=e170]: 2026/03/08 3:20
          - paragraph [ref=e171]: 東会議室
          - button "欠落直後の帯内の移動先を編集" [disabled] [ref=e172]: 移動先を編集
        - listitem [ref=e173]:
          - heading "元のエラー予定を保持" [level=3] [ref=e174]
          - paragraph [ref=e175]:
            - time [ref=e176]: 2026-03-08T02:30:00
            - text: ～
            - time [ref=e177]: 2026-03-08T03:30:00
          - paragraph [ref=e178]: 東会議室
          - alert [ref=e179]: 予定の日時には有効なオフセット付きISO文字列を指定してください。元の予定を保持しています。
          - button "元のエラー予定を保持の移動先を編集" [disabled] [ref=e180]: 移動先を編集
  - button "次の確認へ" [ref=e181]
```

# Test source

```ts
  1  | import assert from 'node:assert/strict';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import type {Page} from '@playwright/test';
  4  | import {test,expect} from './catalog-test';
  5  | const title='重複する時刻の会議と長い予約名ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  6  | const service=async(page:Page,id:string)=>page.locator(id).dispatchEvent('click');
  7  | const schedule=(page:Page)=>page.locator('ui-scheduler');
  8  | const card=(page:Page)=>schedule(page).locator('[data-scheduler-event="fold"]');
  9  | const openEdit=async(page:Page)=>{await page.locator('#schedule-view').selectOption('day');await card(page).getByRole('button',{name:title+'の移動先を編集',exact:true}).click();await expect(page.locator('#schedule-start-fold')).toBeVisible();};
  10 | for(const profile of ['guided','dense'])test.describe('scheduler catalog '+profile,()=>{
  11 | test("fresh-review: asynchronous move completion preserves projected memo focus/value/DOM and owned editor Escape",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  12 |    const note=page.locator('#booking-note'),native=await note.elementHandle();
  13 |    for(const narrow of [false,true]){
  14 |     if(narrow){await page.setViewportSize({width:320,height:720});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#rtl').check();}
  15 |     await openEdit(page);const start=page.locator('#schedule-start-fold');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(start).toBeDisabled();
  16 |     const memo=narrow?'狭幅で完了通知を待ちながら入力':'完了通知を待ちながら入力';await note.fill(memo);await note.focus();await expect(note).toBeFocused();await service(page,'#move-complete');
  17 |     await expect(page.locator('#result')).toHaveText('true');await expect(start).not.toBeVisible();await expect(note).toBeFocused();await expect(note).toHaveValue(memo);await expect(page.locator('#note-model')).toContainText(memo);await expect(page.locator('#note-errors')).toHaveText('null');assert(await note.evaluate((element,previous)=>element===previous,native));
  18 |     await card(page).locator('[data-move-editor]').click();await expect(start).toBeVisible();await start.focus();await page.keyboard.press('Escape');await expect(start).not.toBeVisible();await expect(card(page).locator('[data-move-editor]')).toBeFocused();await expect(note).toHaveValue(memo);assert(await note.evaluate((element,previous)=>element===previous,native));
  19 |    }
  20 |   });
  21 | test("4 views, actual calendar cells/continuations and typed CVA input identity",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  22 |    await expect(schedule(page).locator('.ui-scheduler-plane')).toHaveAttribute('data-scheduler-view','week');await expect(schedule(page).locator('[data-scheduler-day]:visible')).toHaveCount(7);const note=page.locator('#booking-note');await note.fill('ビューを変えても保持するメモ');const native=await note.elementHandle();for(const view of ['day','month','list','week']){await page.locator('#schedule-view').selectOption(view);await expect(schedule(page).locator('.ui-scheduler-plane')).toHaveAttribute('data-scheduler-view',view);await expect(schedule(page).locator('[data-scheduler-day]:visible')).toHaveCount(view==='day'?1:view==='week'?7:view==='month'?42:0);await expect(note).toHaveValue('ビューを変えても保持するメモ');assert(await note.evaluate((element,previous)=>element===previous,native));}
  23 |    await page.locator('#schedule-view').selectOption('month');await expect(schedule(page).locator('[data-scheduler-day="2026-11-02"]')).toContainText('継続中: 継続する複数日の予約');await expect(schedule(page).locator('[data-scheduler-event="invalid"]')).toContainText('オフセット付き');await expect(schedule(page).locator('[data-scheduler-event="locked"] [data-move-editor]')).toBeDisabled();const agenda=page.locator('ui-agenda');await expect(agenda.locator('.ui-scheduler-plane')).toHaveAttribute('data-scheduler-view','list');await expect(page.locator('#agenda-view')).toHaveCount(0);await expect(agenda.locator('[data-move-editor]').first()).toBeDisabled();await expect(page.locator('#note-model')).toContainText('ビューを変えても保持するメモ');
  24 |   });
  25 | test("offset/DST display, timezone/date navigation and resource/time-band controls",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  26 |    await page.locator('#schedule-view').selectOption('day');await expect(card(page).locator('time').first()).toHaveAttribute('datetime','2026-11-01T01:30:00-04:00');await expect(card(page).locator('time').first()).toContainText('1:30');await expect(schedule(page).locator('[data-scheduler-event="later"] time').first()).toHaveAttribute('datetime','2026-11-01T01:30:00-05:00');await page.locator('#zone').selectOption('Asia/Tokyo');await expect(card(page).locator('time').first()).toContainText('14:30');await expect(schedule(page).locator('[data-scheduler-event="later"] time').first()).toContainText('15:30');await page.locator('#zone').selectOption('America/New_York');await page.locator('#band').selectOption('office');await expect(schedule(page).locator('[data-scheduler-event="later"]')).not.toBeVisible();await expect(card(page)).not.toBeVisible();await page.locator('#band').selectOption('all');await expect(card(page)).toContainText('オフセットの変化');await schedule(page).getByLabel('東会議室',{exact:true}).uncheck();await expect(card(page)).not.toBeVisible();await schedule(page).getByRole('button',{name:'全リソースを表示',exact:true}).click();await expect(card(page)).toBeVisible();await page.locator('#schedule-date').fill('2026-11-03');await page.locator('#schedule-date').dispatchEvent('change');await expect(schedule(page).locator('[data-scheduler-day="2026-11-03"]')).toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-11-04');await page.locator('#zone').selectOption('Missing/Zone');await expect(schedule(page)).toContainText('タイムゾーンを確認');
  27 |   });
  28 | test("exact gap/fold native time-band controls, agenda and preserved errors/drafts: host default Temporal",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  29 |     const visible=async(expected)=>{for(const selector of ['ui-scheduler','ui-agenda']){const ids=await page.locator(selector).locator('[data-scheduler-event]:visible').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-scheduler-event')).sort());assert.deepEqual(ids,[...expected].sort(),selector);}};
  30 |     await page.locator('#dataset').selectOption('fold');await page.locator('#schedule-view').selectOption('day');await page.locator('#band').selectOption('fold');await visible(['earlier','later','across']);await expect(schedule(page).locator('[data-scheduler-event]')).toHaveCount(6);await expect(schedule(page).locator('[data-scheduler-day="2026-11-01"]')).toContainText('3 件');
  31 |     await page.locator('#band').selectOption('office');await visible([]);await expect(schedule(page)).toContainText('表示できる予定はありません');await page.locator('#band').selectOption('fold');await page.locator('#zone').selectOption('Asia/Tokyo');await visible([]);await page.locator('#band').selectOption('tokyo-fold');await visible(['earlier','across']);
  32 |     await page.locator('#dataset').selectOption('gap');await page.locator('#band').selectOption('gap');await visible(['gap-invalid']);await expect(schedule(page).locator('[data-scheduler-event="gap-invalid"]')).toContainText('オフセット付き');await expect(schedule(page).locator('[data-scheduler-event="gap-invalid"] time').first()).toHaveAttribute('datetime','2026-03-08T02:30:00');
  33 |     await page.locator('#band').selectOption('gap-edges');await visible(['gap-cross','gap-before','gap-after','gap-invalid']);const crossing=schedule(page).locator('[data-scheduler-event="gap-cross"]');await crossing.locator('[data-move-editor]').click();const start=page.locator('#schedule-start-gap-cross'),native=await start.elementHandle();await expect(start).toHaveAttribute('type','datetime-local');await start.fill('2026-03-08T02:30');await page.locator('#band').selectOption('gap');await expect(start).not.toBeVisible();await page.locator('#band').selectOption('gap-edges');await expect(start).toHaveValue('2026-03-08T02:30');assert(await start.evaluate((element,previous)=>element===previous,native));await crossing.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await expect(page.locator('#request')).toContainText('2026-03-08T02:30');await service(page,'#move-fail');await expect(start).toHaveValue('2026-03-08T02:30');await expect(crossing).toContainText('DSTで欠落');
  34 |    });
  35 | test("exact gap/fold native time-band controls, agenda and preserved errors/drafts: forced temporal-polyfill 1.0.5",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},true);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  36 |     const visible=async(expected)=>{for(const selector of ['ui-scheduler','ui-agenda']){const ids=await page.locator(selector).locator('[data-scheduler-event]:visible').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-scheduler-event')).sort());assert.deepEqual(ids,[...expected].sort(),selector);}};
  37 |     await page.locator('#dataset').selectOption('fold');await page.locator('#schedule-view').selectOption('day');await page.locator('#band').selectOption('fold');await visible(['earlier','later','across']);await expect(schedule(page).locator('[data-scheduler-event]')).toHaveCount(6);await expect(schedule(page).locator('[data-scheduler-day="2026-11-01"]')).toContainText('3 件');
  38 |     await page.locator('#band').selectOption('office');await visible([]);await expect(schedule(page)).toContainText('表示できる予定はありません');await page.locator('#band').selectOption('fold');await page.locator('#zone').selectOption('Asia/Tokyo');await visible([]);await page.locator('#band').selectOption('tokyo-fold');await visible(['earlier','across']);
  39 |     await page.locator('#dataset').selectOption('gap');await page.locator('#band').selectOption('gap');await visible(['gap-invalid']);await expect(schedule(page).locator('[data-scheduler-event="gap-invalid"]')).toContainText('オフセット付き');await expect(schedule(page).locator('[data-scheduler-event="gap-invalid"] time').first()).toHaveAttribute('datetime','2026-03-08T02:30:00');
> 40 |     await page.locator('#band').selectOption('gap-edges');await visible(['gap-cross','gap-before','gap-after','gap-invalid']);const crossing=schedule(page).locator('[data-scheduler-event="gap-cross"]');await crossing.locator('[data-move-editor]').click();const start=page.locator('#schedule-start-gap-cross'),native=await start.elementHandle();await expect(start).toHaveAttribute('type','datetime-local');await start.fill('2026-03-08T02:30');await page.locator('#band').selectOption('gap');await expect(start).not.toBeVisible();await page.locator('#band').selectOption('gap-edges');await expect(start).toHaveValue('2026-03-08T02:30');assert(await start.evaluate((element,previous)=>element===previous,native));await crossing.getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await expect(page.locator('#request')).toContainText('2026-03-08T02:30');await service(page,'#move-fail');await expect(start).toHaveValue('2026-03-08T02:30');await expect(crossing).toContainText('DSTで欠落');
     |                                                                                                                                                                                                                                                                                                                                         ^ Error: locator.elementHandle: Test timeout of 30000ms exceeded.
  41 |    });
  42 | test("non-hour band, wholly skipped day, midnight fold and civil week/month moves: host default Temporal",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  43 |     const day=(date)=>schedule(page).locator('[data-scheduler-day="'+date+'"]');
  44 |     await page.locator('#dataset').selectOption('half');await page.locator('#schedule-view').selectOption('day');await page.locator('#band').selectOption('half-gap');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).not.toBeVisible();await expect(day('2026-10-04')).toContainText('0 件');await page.locator('#band').selectOption('half-edge');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).toBeVisible();await expect(day('2026-10-04')).toContainText('1 件');await page.locator('#schedule-view').selectOption('week');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-10-11');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await page.locator('#schedule-view').selectOption('month');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-11-04');await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-10-04');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).toBeVisible();
  45 |     await page.locator('#dataset').selectOption('skip');await page.locator('#schedule-view').selectOption('day');await expect(page.locator('#schedule-date')).toHaveValue('2011-12-30');await expect(day('2011-12-30')).toContainText('0 件');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await page.locator('#band').selectOption('office');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-29');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-30');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-31');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await page.locator('#schedule-view').selectOption('week');await expect(day('2011-12-29')).toContainText('1 件');await expect(day('2011-12-30')).toContainText('0 件');await expect(day('2011-12-31')).toContainText('1 件');await page.locator('#schedule-view').selectOption('month');await expect(day('2011-12-30')).toContainText('0 件');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2012-01-31');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await expect(day('2011-12-30')).toContainText('0 件');await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-31');await expect(day('2011-12-30')).toContainText('0 件');
  46 |     await page.locator('#dataset').selectOption('midnight');await page.locator('#schedule-view').selectOption('week');await expect(day('2010-11-06')).toContainText('1 件');await expect(day('2010-11-07')).toContainText('1 件');await page.locator('#band').selectOption('late');await expect(day('2010-11-06')).toContainText('1 件');await expect(day('2010-11-07')).toContainText('0 件');await page.locator('#schedule-view').selectOption('day');await expect(schedule(page).locator('[data-scheduler-event="midnight-cross"]')).toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2010-11-07');await expect(schedule(page).locator('[data-scheduler-event="midnight-cross"]')).not.toBeVisible();
  47 |    });
  48 | test("non-hour band, wholly skipped day, midnight fold and civil week/month moves: forced temporal-polyfill 1.0.5",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},true);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  49 |     const day=(date)=>schedule(page).locator('[data-scheduler-day="'+date+'"]');
  50 |     await page.locator('#dataset').selectOption('half');await page.locator('#schedule-view').selectOption('day');await page.locator('#band').selectOption('half-gap');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).not.toBeVisible();await expect(day('2026-10-04')).toContainText('0 件');await page.locator('#band').selectOption('half-edge');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).toBeVisible();await expect(day('2026-10-04')).toContainText('1 件');await page.locator('#schedule-view').selectOption('week');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-10-11');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await page.locator('#schedule-view').selectOption('month');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-11-04');await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2026-10-04');await expect(schedule(page).locator('[data-scheduler-event="half-cross"]')).toBeVisible();
  51 |     await page.locator('#dataset').selectOption('skip');await page.locator('#schedule-view').selectOption('day');await expect(page.locator('#schedule-date')).toHaveValue('2011-12-30');await expect(day('2011-12-30')).toContainText('0 件');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await page.locator('#band').selectOption('office');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-29');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-30');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).not.toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-31');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await page.locator('#schedule-view').selectOption('week');await expect(day('2011-12-29')).toContainText('1 件');await expect(day('2011-12-30')).toContainText('0 件');await expect(day('2011-12-31')).toContainText('1 件');await page.locator('#schedule-view').selectOption('month');await expect(day('2011-12-30')).toContainText('0 件');await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2012-01-31');await expect(schedule(page).locator('[data-scheduler-event="skip-span"]')).toBeVisible();await expect(day('2011-12-30')).toContainText('0 件');await schedule(page).getByRole('button',{name:'前の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2011-12-31');await expect(day('2011-12-30')).toContainText('0 件');
  52 |     await page.locator('#dataset').selectOption('midnight');await page.locator('#schedule-view').selectOption('week');await expect(day('2010-11-06')).toContainText('1 件');await expect(day('2010-11-07')).toContainText('1 件');await page.locator('#band').selectOption('late');await expect(day('2010-11-06')).toContainText('1 件');await expect(day('2010-11-07')).toContainText('0 件');await page.locator('#schedule-view').selectOption('day');await expect(schedule(page).locator('[data-scheduler-event="midnight-cross"]')).toBeVisible();await schedule(page).getByRole('button',{name:'次の期間',exact:true}).click();await expect(page.locator('#schedule-date')).toHaveValue('2010-11-07');await expect(schedule(page).locator('[data-scheduler-event="midnight-cross"]')).not.toBeVisible();
  53 |    });
  54 | test("native move keeps DST gap/fold drafts, failure/retry and old results",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  55 |    await openEdit(page);const start=page.locator('#schedule-start-fold'),end=page.locator('#schedule-end-fold'),native=await start.elementHandle();await start.fill('2026-03-08T02:30');await end.fill('2026-03-08T03:30');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await expect(page.locator('#request')).toContainText('2026-03-08T02:30');await expect(start).toBeDisabled();await service(page,'#move-fail');await expect(start).toBeEnabled();await expect(start).toHaveValue('2026-03-08T02:30');await expect(card(page)).toContainText('DSTで欠落');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('2');await service(page,'#move-old');await expect(page.locator('#result')).toHaveText('false');await service(page,'#move-fail');await start.fill('2026-11-01T01:30');await end.fill('2026-11-01T01:15');await page.locator('#schedule-start-fold-fold').selectOption('earlier');await page.locator('#schedule-end-fold-fold').selectOption('later');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('3');await expect(page.locator('#request')).toContainText('"startDisambiguation": "earlier"');await expect(page.locator('#request')).toContainText('"endDisambiguation": "later"');await service(page,'#move-complete');await expect(page.locator('#result')).toHaveText('true');await expect(card(page).locator('time').first()).toHaveAttribute('datetime','2026-11-01T02:45:00-05:00');await expect(start).not.toBeVisible();assert(await start.evaluate((element,previous)=>element===previous,native));
  56 |   });
  57 | test("external source invalidates pending, retains draft and explicit reset/permissions",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  58 |    await openEdit(page);const start=page.locator('#schedule-start-fold');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await service(page,'#replace');await expect(page.locator('#cancel-count')).toHaveText('1');await service(page,'#move-old');await expect(page.locator('#result')).toHaveText('false');await expect(start).toHaveValue('2026-11-01T01:30');await expect(card(page)).toContainText('予定が外部で変更');await card(page).getByRole('button',{name:'現在の予定で入力を戻す',exact:true}).click();await expect(start).toHaveValue('2026-11-01T04:00');await page.locator('#deny').check();await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(card(page)).toContainText('この移動は許可されていません');await expect(page.locator('#request-count')).toHaveText('1');await page.locator('#readonly').check();await expect(start).toBeDisabled();await expect(start).toHaveValue('2026-11-01T04:00');
  59 |   });
  60 | test("view/profile/empty input preservation, native Escape and busy focus recovery",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  61 |    await openEdit(page);const start=page.locator('#schedule-start-fold'),native=await start.elementHandle();await start.fill('');await page.locator('#schedule-view').selectOption('list');await expect(start).toHaveValue('');await page.locator('#profile').selectOption(profile==='guided'?'dense':'guided');await expect(start).toHaveValue('');assert(await start.evaluate((element,previous)=>element===previous,native));await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('0');await expect(card(page)).toContainText('現地日時を確認');await start.fill('2026-11-01T03:00');await start.focus();await page.keyboard.press('Escape');await expect(start).not.toBeVisible();await expect(card(page).locator('[data-move-editor]')).toBeFocused();await card(page).locator('[data-move-editor]').click();await expect(start).toHaveValue('2026-11-01T03:00');await start.focus();await page.locator('#busy').evaluate(element=>{element.checked=true;element.dispatchEvent(new Event('change',{bubbles:true}));});await expect(start).toBeDisabled();await expect(schedule(page).locator('[data-scheduler-status]')).toBeFocused();await expect(start).toHaveValue('2026-11-01T03:00');
  62 |   });
  63 | test("projected app form reset/disable and own focus after event removal",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  64 |    await page.locator('#schedule-view').selectOption('day');const note=page.locator('#booking-note');await note.fill('アプリ所有のフォーム値');await service(page,'#disable');await expect(note).toBeDisabled();await expect(schedule(page).locator('[data-scheduler-status]')).toBeFocused();await service(page,'#disable');await expect(note).toBeEnabled();await expect(note).toHaveValue('アプリ所有のフォーム値');await service(page,'#reset');await expect(note).toHaveValue('');await expect(page.locator('#note-errors')).toContainText('required');await note.fill('除去してもアプリの値を保持');await service(page,'#remove');await expect(note).toHaveCount(0);await expect(schedule(page).locator('[data-scheduler-status]')).toBeFocused();await expect(page.locator('#note-model')).toContainText('除去してもアプリの値を保持');
  65 |   });
  66 | test("destroyed owner rejects its old move response",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  67 |    await openEdit(page);await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await service(page,'#destroy');await expect(schedule(page)).toHaveCount(0);await service(page,'#move-old');await expect(page.locator('#result')).toHaveText('false');await expect(page.locator('#cancel-count')).toHaveText('0');
  68 |   });
  69 | test("320px/200%/RTL/reduced motion actual move editor and axe",async({page},testInfo)=>{await page.addInitScript((force:boolean)=>{if(force)Object.defineProperty(globalThis,'Temporal',{value:undefined,writable:true,configurable:true});},false);await page.goto('/catalog/scheduler');await expect(page.getByRole('heading',{name:'予定の確認と移動',exact:true})).toBeVisible();await page.locator('#profile').selectOption(profile);await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);
  70 |    await page.setViewportSize({width:320,height:720});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#rtl').check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await noOverflow();const closed=await new AxeBuilder({page}).analyze();assert.deepEqual(closed.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[]);await openEdit(page);await noOverflow();await page.locator('#schedule-start-fold').fill('2026-03-08T02:30');await page.locator('#schedule-end-fold').fill('2026-03-08T03:30');await card(page).getByRole('button',{name:'移動を要求',exact:true}).click();await expect(page.locator('#request-count')).toHaveText('1');await service(page,'#move-fail');await expect(card(page)).toContainText('DSTで欠落');const failed=await new AxeBuilder({page}).analyze();assert.deepEqual(failed.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[]);await expect(page.locator('#schedule-start-preview-fold')).toContainText('2026-03-08 02:30');assert.equal(await page.locator('#schedule-start-preview-fold bdi').evaluate(element=>getComputedStyle(element).direction),'ltr');await expect(page.locator('#schedule-end-preview-fold')).toContainText('2026-03-08 03:30');await page.locator('#schedule-start-fold').focus();const fit=await page.locator('#schedule-start-fold').evaluate(element=>{const field=element.getBoundingClientRect(),viewport=element.closest('.ui-scheduler-viewport').getBoundingClientRect();return {left:field.left,right:field.right,viewportLeft:viewport.left,viewportRight:viewport.right};});assert(fit.left>=fit.viewportLeft-1&&fit.right<=fit.viewportRight+1,JSON.stringify(fit));await page.screenshot({path:testInfo.outputPath('scheduler-'+profile+'-320-200-rtl-viewport.png')});const screenshot='evidence/images/scheduler-'+profile+'-320-200-rtl.png';await page.screenshot({path:testInfo.outputPath('scheduler-'+profile+'-320-200-rtl.png'),fullPage:true});await page.locator('#schedule-view').selectOption('month');await noOverflow();await schedule(page).screenshot({path:testInfo.outputPath('scheduler-'+profile+'-month.png')});
  71 |   });
  72 | });
  73 | 
```
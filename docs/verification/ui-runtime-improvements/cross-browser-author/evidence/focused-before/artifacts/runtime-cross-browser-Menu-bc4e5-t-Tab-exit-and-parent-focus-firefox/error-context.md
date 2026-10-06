# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runtime-cross-browser.spec.ts >> Menu guided: recursive RTL keys, disabled intent, Tab exit and parent focus
- Location: tests/cross-browser/runtime-cross-browser.spec.ts:28:2

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 52

- Array []
+ Array [
+   Object {
+     "description": "Ensure elements that have scrollable content are accessible by keyboard in Safari",
+     "help": "Scrollable region must have keyboard access",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/scrollable-region-focusable?application=playwright",
+     "id": "scrollable-region-focusable",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "focusable-content",
+             "impact": "serious",
+             "message": "Element should have focusable content",
+             "relatedNodes": Array [],
+           },
+           Object {
+             "data": null,
+             "id": "focusable-element",
+             "impact": "serious",
+             "message": "Element should be focusable",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element should have focusable content
+   Element should be focusable",
+         "html": "<ul _ngcontent-ng-c3533522288=\"\" role=\"menu\" class=\"ui-menu__submenu\" id=\"recursive-menu-item-file-children\" aria-labelledby=\"recursive-menu-item-file\" data-menu-parent=\"file\" style=\"left: 12px; top: 36.5px;\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#recursive-menu-item-file-children",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.keyboard",
+       "wcag2a",
+       "wcag211",
+       "wcag213",
+       "TTv5",
+       "TT4.a",
+       "EN-301-549",
+       "EN-9.2.1.1",
+       "EN-9.2.1.3",
+       "RGAAv4",
+       "RGAA-7.3.2",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "共通部品の操作確認" [level=1] [ref=e4]
  - link "状態表示の確認" [ref=e5] [cursor=pointer]:
    - /url: /catalog/feedback
  - link "操作部品の確認" [ref=e6] [cursor=pointer]:
    - /url: /catalog/actions
  - link "配置部品の操作確認" [ref=e7] [cursor=pointer]:
    - /url: /catalog/layout
  - generic [ref=e8]:
    - text: 表示設定
    - combobox "表示設定" [ref=e9]:
      - option "一覧と入力を繰り返し使う"
      - option "手順を確認しながら使う" [selected]
  - generic [ref=e10]:
    - generic [ref=e11]:
      - checkbox "RTL" [checked] [ref=e12]
      - text: RTL
    - generic [ref=e13]:
      - checkbox "ソートを有効にする" [checked] [ref=e14]
      - text: ソートを有効にする
    - generic [ref=e15]:
      - checkbox "複数列ソート" [ref=e16]
      - text: 複数列ソート
    - generic [ref=e17]:
      - checkbox "列フィルターを有効にする" [checked] [ref=e18]
      - text: 列フィルターを有効にする
    - generic [ref=e19]:
      - checkbox "全体検索を有効にする" [checked] [ref=e20]
      - text: 全体検索を有効にする
    - generic [ref=e21]:
      - checkbox "ページ送りを有効にする" [checked] [ref=e22]
      - text: ページ送りを有効にする
    - generic [ref=e23]:
      - checkbox "ヘッダーを固定する" [checked] [ref=e24]
      - text: ヘッダーを固定する
    - generic [ref=e25]:
      - checkbox "自動列幅" [checked] [ref=e26]
      - text: 自動列幅
    - generic [ref=e27]:
      - text: 自動幅の方式
      - combobox "自動幅の方式" [ref=e28]:
        - option "表示領域" [selected]
        - option "内容"
    - generic [ref=e29]:
      - text: 列幅の境界条件
      - combobox "列幅の境界条件" [ref=e30]:
        - option "標準" [selected]
        - option "最小400・最大450"
        - option "単一列・最大100"
    - generic [ref=e31]:
      - text: 行選択
      - combobox "行選択" [ref=e32]:
        - option "なし"
        - option "単一"
        - option "複数" [selected]
    - generic [ref=e33]:
      - text: 一覧の状態
      - combobox "一覧の状態" [ref=e34]:
        - option "通常" [selected]
        - option "取得中"
        - option "更新中"
        - option "エラー"
        - option "部分欠損"
    - generic [ref=e35]:
      - checkbox "サーバー処理" [ref=e36]
      - text: サーバー処理
  - region "表の検証" [ref=e37]:
    - generic "申請一覧" [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]:
          - text: 全体検索
          - searchbox "全体検索" [ref=e41]
        - button "検索を解除" [disabled] [ref=e42]
        - group [ref=e44]:
          - generic "列の設定" [ref=e45] [cursor=pointer]
          - option "固定しない" [selected]
          - option "先頭側"
          - option "末尾側"
          - option "固定しない" [selected]
          - option "先頭側"
          - option "末尾側"
          - option "固定しない" [selected]
          - option "先頭側"
          - option "末尾側"
          - option "固定しない" [selected]
          - option "先頭側"
          - option "末尾側"
      - status [ref=e46]
      - region "申請一覧の表領域" [ref=e47]:
        - table [ref=e48]:
          - caption [ref=e49]: 申請一覧
          - rowgroup [ref=e58]:
            - row [ref=e59]:
              - columnheader [ref=e60]:
                - checkbox "このページをすべて選択" [ref=e61]
              - columnheader "詳細" [ref=e62]
              - columnheader [ref=e63]:
                - button "申請名で並べ替え" [ref=e64] [cursor=pointer]:
                  - generic [ref=e65]: 申請名
                - separator "申請名の列境界" [ref=e66]
              - columnheader [ref=e67]:
                - button "金額で並べ替え" [ref=e68] [cursor=pointer]:
                  - generic [ref=e69]: 金額
                - separator "金額の列境界" [ref=e70]
              - columnheader [ref=e71]:
                - button "申請日で並べ替え" [ref=e72] [cursor=pointer]:
                  - generic [ref=e73]: 申請日
                - separator "申請日の列境界" [ref=e74]
              - columnheader [ref=e75]:
                - button "状態で並べ替え" [ref=e76] [cursor=pointer]:
                  - generic [ref=e77]: 状態
                - separator "状態の列境界" [ref=e78]
              - columnheader "操作" [ref=e79]
            - row [ref=e80]:
              - cell [ref=e81]
              - cell [ref=e82]
              - cell [ref=e83]:
                - generic "申請名の列条件" [ref=e84]:
                  - group "申請名の列条件" [ref=e85]:
                    - generic [ref=e87]:
                      - generic [ref=e88]:
                        - text: 申請名の比較方法
                        - combobox "申請名の比較方法" [ref=e89]:
                          - option "含む" [selected]
                          - option "で始まる"
                          - option "等しい"
                          - option "未取得"
                      - generic [ref=e90]:
                        - text: 申請名の条件
                        - searchbox "申請名の条件" [ref=e91]
                      - button "申請名の条件 1 を解除" [ref=e92] [cursor=pointer]:
                        - generic [ref=e93]: 条件を解除
                    - button "申請名の条件を追加" [ref=e94] [cursor=pointer]
              - cell [ref=e96]:
                - generic "金額の列条件" [ref=e97]:
                  - group "金額の列条件" [ref=e98]:
                    - generic [ref=e100]:
                      - generic [ref=e101]:
                        - text: 金額の比較方法
                        - combobox "金額の比較方法" [ref=e102]:
                          - option "等しい" [selected]
                          - option "以上"
                          - option "以下"
                          - option "未取得"
                      - generic [ref=e103]:
                        - text: 金額の条件
                        - spinbutton "金額の条件" [ref=e104]
                      - button "金額の条件 1 を解除" [ref=e105] [cursor=pointer]:
                        - generic [ref=e106]: 条件を解除
                    - button "金額の条件を追加" [ref=e107] [cursor=pointer]
              - cell [ref=e109]:
                - generic "申請日の列条件" [ref=e110]:
                  - group "申請日の列条件" [ref=e111]:
                    - generic [ref=e113]:
                      - generic [ref=e114]:
                        - text: 申請日の比較方法
                        - combobox "申請日の比較方法" [ref=e115]:
                          - option "等しい" [selected]
                          - option "より後"
                          - option "より前"
                          - option "未取得"
                      - generic [ref=e116]:
                        - text: 申請日の条件
                        - textbox "申請日の条件" [ref=e117]
                      - button "申請日の条件 1 を解除" [ref=e118] [cursor=pointer]:
                        - generic [ref=e119]: 条件を解除
                    - button "申請日の条件を追加" [ref=e120] [cursor=pointer]
              - cell [ref=e122]:
                - generic "状態の列条件" [ref=e123]:
                  - group "状態の列条件" [ref=e124]:
                    - generic [ref=e126]:
                      - generic [ref=e127]:
                        - text: 状態の比較方法
                        - combobox "状態の比較方法" [ref=e128]:
                          - option "等しい" [selected]
                          - option "未取得"
                      - generic [ref=e129]:
                        - text: 状態の条件
                        - combobox "状態の条件" [ref=e130]:
                          - option "条件なし" [selected]
                          - option "下書き"
                          - option "確認中"
                          - option "承認済み"
                      - button "状態の条件 1 を解除" [ref=e131] [cursor=pointer]:
                        - generic [ref=e132]: 条件を解除
                    - button "状態の条件を追加" [ref=e133] [cursor=pointer]
              - cell [ref=e135]
          - rowgroup [ref=e136]:
            - row [ref=e137]:
              - cell [ref=e138]:
                - 'checkbox "行を選択: 備品購入" [ref=e139]'
              - cell [ref=e140]:
                - 'button "詳細: 備品購入" [ref=e141] [cursor=pointer]':
                  - generic [ref=e142]: 開く
              - cell [ref=e143]:
                - strong [ref=e144]: 備品購入
              - cell "3,000" [ref=e145]
              - cell "2026-10-01" [ref=e146]
              - cell "下書き" [ref=e147]
              - cell [ref=e148]:
                - button "確認する" [ref=e150] [cursor=pointer]
            - row [ref=e152]:
              - cell [ref=e153]:
                - 'checkbox "行を選択: 出張旅費" [ref=e154]'
              - cell [ref=e155]:
                - 'button "詳細: 出張旅費" [ref=e156] [cursor=pointer]':
                  - generic [ref=e157]: 開く
              - cell [ref=e158]:
                - strong [ref=e159]: 出張旅費
              - cell "未取得" [ref=e160]
              - cell "2026-10-02" [ref=e161]
              - cell "確認中" [ref=e162]
              - cell [ref=e163]:
                - button "確認する" [ref=e165] [cursor=pointer]
      - navigation "申請一覧のページ" [ref=e168]:
        - button "最初のページ" [disabled] [ref=e169]:
          - generic [ref=e170]: 最初
        - button "前のページ" [disabled] [ref=e171]:
          - generic [ref=e172]: 前へ
        - paragraph [ref=e173]: 1 / 3 ページ · 6 件
        - button "次のページ" [ref=e174] [cursor=pointer]:
          - generic [ref=e175]: 次へ
        - button "最後のページ" [ref=e176] [cursor=pointer]:
          - generic [ref=e177]: 最後
        - generic [ref=e178]:
          - text: 表示件数
          - combobox "表示件数" [ref=e179]:
            - option "2 件" [selected]
            - option "4 件"
            - option "8 件"
    - paragraph [ref=e180]: "選択:"
    - paragraph [ref=e181]: "操作:"
    - paragraph [ref=e182]: "状態変更: 0"
    - button "表示状態を保存" [ref=e183] [cursor=pointer]
    - button "表示状態を復元" [disabled] [ref=e185]
    - button "検索とソートを初期化" [ref=e187] [cursor=pointer]
  - region "入力部品の検証" [ref=e190]:
    - heading "申請内容を入力する" [level=2] [ref=e191]
    - button "入力を無効にする" [ref=e192] [cursor=pointer]
    - button "フォームを初期化" [ref=e194] [cursor=pointer]
    - generic [ref=e196]:
      - checkbox "非同期候補" [ref=e197]
      - text: 非同期候補
    - generic [ref=e198]:
      - checkbox "自由入力を許可" [ref=e199]
      - text: 自由入力を許可
    - generic [ref=e200]:
      - checkbox "読取り専用" [ref=e201]
      - text: 読取り専用
    - button "金額の上限を変更" [ref=e202] [cursor=pointer]
    - generic [ref=e204]:
      - generic [ref=e206]:
        - generic [ref=e207]: 件名 必須
        - generic [ref=e208]:
          - textbox "件名 必須" [ref=e209]:
            - /placeholder: ""
          - button "件名をクリア" [disabled] [ref=e210]:
            - generic [ref=e211]: クリア
        - paragraph [ref=e212]: 0 / 30 文字
        - paragraph [ref=e213]: 30文字以内で入力してください。
      - generic [ref=e215]:
        - generic [ref=e216]: 申請の説明 任意
        - textbox "申請の説明 任意" [ref=e217]:
          - /placeholder: ""
        - paragraph [ref=e218]: 0 / 200 文字
      - generic [ref=e220]:
        - generic [ref=e221]: 申請金額 必須
        - generic [ref=e222]:
          - spinbutton "申請金額 必須" [ref=e223]
          - generic [ref=e224]: 円
      - generic [ref=e226]:
        - generic [ref=e227]: 確認用パスワード 任意
        - generic [ref=e228]:
          - textbox "確認用パスワード 任意" [ref=e229]
          - button "パスワードを表示" [ref=e230] [cursor=pointer]:
            - generic [ref=e231]: 表示
        - paragraph [ref=e232]: "強度: 中程度"
        - paragraph [ref=e233]: 強度の判定は利用するアプリが提供します。
      - generic [ref=e235]:
        - generic [ref=e236]: 申請先 必須
        - combobox "申請先 必須" [ref=e237]:
          - option "選択してください" [selected]
          - text: 社内
          - option "営業部"
          - option "総務部"
          - option "受付停止中" [disabled]
      - group "確認担当者" [ref=e239]:
        - text: 確認担当者の候補を検索
        - searchbox "確認担当者の候補を検索" [ref=e241]
        - button "表示中をすべて選択" [disabled] [ref=e242]
        - button "選択を解除" [disabled] [ref=e244]
        - group "東京" [ref=e246]:
          - generic [ref=e248]:
            - generic [ref=e249]:
              - checkbox "山田" [ref=e250]
              - text: 山田
            - generic [ref=e251]:
              - checkbox "佐藤" [ref=e252]
              - text: 佐藤
        - group "大阪" [ref=e253]:
          - generic [ref=e255]:
            - generic [ref=e256]:
              - checkbox "田中" [ref=e257]
              - text: 田中
            - generic [ref=e258]:
              - checkbox "確認不可" [disabled] [ref=e259]
              - text: 確認不可
        - status [ref=e260]: 0 件選択 / 最大 2 件
        - paragraph [ref=e261]: 最大2名まで選択できます。
      - generic [ref=e263]:
        - generic [ref=e264] [cursor=pointer]:
          - text: 入力内容を確認した
          - generic [ref=e265]: 任意
        - checkbox "入力内容を確認した 任意" [ref=e266]
      - generic [ref=e268]:
        - generic [ref=e269] [cursor=pointer]:
          - text: 更新を通知する
          - generic [ref=e270]: 任意
        - switch "更新を通知する 任意" [checked] [ref=e271]
      - generic [ref=e273]:
        - generic [ref=e274]: 担当部署 任意
        - combobox "担当部署 任意" [ref=e276]
        - button "担当部署をクリア" [disabled] [ref=e277]:
          - generic [ref=e278]: クリア
        - paragraph [ref=e279]: 候補から選択してください。
        - status
      - generic [ref=e281]:
        - generic [ref=e282]: 関連申請を検索 任意
        - generic [ref=e283]:
          - searchbox "関連申請を検索 任意" [ref=e284]
          - button "関連申請を検索をクリア" [disabled] [ref=e285]:
            - generic [ref=e286]: クリア
          - button "検索" [ref=e287] [cursor=pointer]
        - status
      - generic [ref=e289]:
        - generic [ref=e290]: 操作
        - button "申請内容を確認" [ref=e291] [cursor=pointer]
        - button "入力を戻す" [ref=e293] [cursor=pointer]
    - button "中間状態を切替" [ref=e295] [cursor=pointer]
    - button "通知設定の処理中を切替" [ref=e297] [cursor=pointer]
    - button "古い候補応答を適用" [ref=e299] [cursor=pointer]
    - button "現在の候補応答を適用" [ref=e301] [cursor=pointer]
    - button "同じ条件の古い応答を適用" [ref=e303] [cursor=pointer]
    - button "利用不可の担当者を復元" [ref=e305] [cursor=pointer]
    - group "離脱時に確定する担当者" [ref=e308]:
      - text: 離脱時に確定する担当者の候補を検索
      - searchbox "離脱時に確定する担当者の候補を検索" [ref=e310]
      - button "表示中をすべて選択" [ref=e311] [cursor=pointer]
      - button "選択を解除" [ref=e313] [cursor=pointer]
      - generic [ref=e315]:
        - button "山田の選択を解除" [ref=e316] [cursor=pointer]:
          - generic [ref=e317]: 山田 ×
        - button "佐藤の選択を解除" [ref=e318] [cursor=pointer]:
          - generic [ref=e319]: 佐藤 ×
      - group "東京" [ref=e320]:
        - generic [ref=e322]:
          - generic [ref=e323]:
            - checkbox "山田" [checked] [ref=e324]
            - text: 山田
          - generic [ref=e325]:
            - checkbox "佐藤" [checked] [ref=e326]
            - text: 佐藤
      - group "大阪" [ref=e327]:
        - generic [ref=e329]:
          - generic [ref=e330]:
            - checkbox "田中" [ref=e331]
            - text: 田中
          - generic [ref=e332]:
            - checkbox "確認不可" [disabled] [ref=e333]
            - text: 確認不可
      - status [ref=e334]: 2 件選択
    - paragraph [ref=e335]: "離脱時: [\"a\",\"b\"] / false"
    - generic [ref=e336]: "{\"title\":\"\",\"note\":\"\",\"amount\":null,\"password\":\"\",\"department\":null,\"reviewers\":[],\"consent\":false,\"notifications\":true,\"owner\":null,\"search\":\"\"}"
    - paragraph [ref=e337]: "フォーム: 要確認 / 未操作 / 未確認"
    - paragraph [ref=e338]: "検索:"
  - region "日付部品の検証" [ref=e340]:
    - heading "日付と期間を選ぶ" [level=2] [ref=e341]
    - text: 日付の入力書式
    - combobox "日付の入力書式" [ref=e342]:
      - option "ブラウザ標準" [selected]
      - option "yyyy/MM/dd"
      - option "dd/MM/yyyy"
      - option "MM/dd/yyyy"
    - generic [ref=e343]:
      - checkbox "月曜から表示" [ref=e344]
      - text: 月曜から表示
    - generic [ref=e345]:
      - checkbox "日付の初期表示を3月にする" [ref=e346]
      - text: 日付の初期表示を3月にする
    - generic [ref=e347]:
      - checkbox "日時を9:10起点の15分間隔にする" [ref=e348]
      - text: 日時を9:10起点の15分間隔にする
    - button "日付入力を無効にする" [ref=e349] [cursor=pointer]
    - button "日付を初期化" [ref=e351] [cursor=pointer]
    - generic [ref=e353]:
      - generic [ref=e355]:
        - generic [ref=e356]: 予定日 必須
        - generic [ref=e357]:
          - textbox "予定日 必須" [ref=e358]: 2026-10-05
          - button "予定日のカレンダーを開く" [ref=e359] [cursor=pointer]:
            - generic [ref=e360]: カレンダー
          - button "予定日をクリア" [ref=e361] [cursor=pointer]:
            - generic [ref=e362]: クリア
        - paragraph [ref=e363]: 2026年10月5日月曜日
        - paragraph [ref=e364]: 10月3日は選択できません。
      - generic [ref=e366]:
        - generic [ref=e367]: 開始時刻 任意
        - generic [ref=e368]:
          - textbox "開始時刻 任意" [ref=e369]: 09:00
          - button "開始時刻をクリア" [ref=e370] [cursor=pointer]:
            - generic [ref=e371]: クリア
        - paragraph [ref=e372]: 午前9:00
      - generic [ref=e374]:
        - generic [ref=e375]: 現地日時 任意
        - generic [ref=e376]:
          - textbox "現地日時 任意" [ref=e377]
          - button "現地日時をクリア" [disabled] [ref=e378]:
            - generic [ref=e379]: クリア
        - paragraph [ref=e380]: Asia/Tokyo の現地日時
        - paragraph [ref=e381]: この値は現地日時です。Instantへの変換は利用アプリが行います。
      - generic [ref=e383]:
        - generic [ref=e384]: 対象月 任意
        - generic [ref=e385]:
          - textbox "対象月 任意" [ref=e386]: 2026-10
          - button "対象月をクリア" [ref=e387] [cursor=pointer]:
            - generic [ref=e388]: クリア
        - paragraph [ref=e389]: 2026年10月
      - generic [ref=e391]:
        - generic [ref=e392]: 対象年 任意
        - generic [ref=e393]:
          - spinbutton "対象年 任意" [ref=e394]: "2026"
          - button "対象年をクリア" [ref=e395] [cursor=pointer]:
            - generic [ref=e396]: クリア
        - paragraph [ref=e397]: 2026年
      - region "予定カレンダー" [ref=e399]:
        - generic [ref=e400]:
          - button "予定カレンダーの前の月" [ref=e401] [cursor=pointer]:
            - generic [ref=e402]: 前月
          - heading "2026年10月" [level=3] [ref=e403]
          - button "予定カレンダーの次の月" [ref=e404] [cursor=pointer]:
            - generic [ref=e405]: 次月
        - region "予定カレンダーの日付一覧" [ref=e406]:
          - grid "2026年10月" [ref=e407]:
            - rowgroup [ref=e408]:
              - row [ref=e409]:
                - columnheader "日" [ref=e410]
                - columnheader "月" [ref=e411]
                - columnheader "火" [ref=e412]
                - columnheader "水" [ref=e413]
                - columnheader "木" [ref=e414]
                - columnheader "金" [ref=e415]
                - columnheader "土" [ref=e416]
            - rowgroup [ref=e417]:
              - row [ref=e418]:
                - gridcell [ref=e419]:
                  - button "2026年9月27日日曜日" [ref=e420]: "27"
                - gridcell [ref=e421]:
                  - button "2026年9月28日月曜日" [ref=e422]: "28"
                - gridcell [ref=e423]:
                  - button "2026年9月29日火曜日" [ref=e424]: "29"
                - gridcell [ref=e425]:
                  - button "2026年9月30日水曜日" [ref=e426]: "30"
                - gridcell [ref=e427]:
                  - button "2026年10月1日木曜日" [ref=e428]: "1"
                - gridcell [ref=e429]:
                  - button "2026年10月2日金曜日" [ref=e430]: "2"
                - gridcell [ref=e431]:
                  - button "2026年10月3日土曜日" [disabled] [ref=e432]: "3"
              - row [ref=e433]:
                - gridcell [ref=e434]:
                  - button "2026年10月4日日曜日" [ref=e435]: "4"
                - gridcell [selected] [ref=e436]:
                  - button "2026年10月5日月曜日、予定あり" [ref=e437]:
                    - text: "5"
                    - generic [ref=e438]: 予定
                - gridcell [ref=e439]:
                  - button "2026年10月6日火曜日" [ref=e440]: "6"
                - gridcell [ref=e441]:
                  - button "2026年10月7日水曜日" [ref=e442]: "7"
                - gridcell [ref=e443]:
                  - button "2026年10月8日木曜日" [ref=e444]: "8"
                - gridcell [ref=e445]:
                  - button "2026年10月9日金曜日" [ref=e446]: "9"
                - gridcell [ref=e447]:
                  - button "2026年10月10日土曜日" [ref=e448]: "10"
              - row [ref=e449]:
                - gridcell [ref=e450]:
                  - button "2026年10月11日日曜日" [ref=e451]: "11"
                - gridcell [ref=e452]:
                  - button "2026年10月12日月曜日" [ref=e453]: "12"
                - gridcell [ref=e454]:
                  - button "2026年10月13日火曜日" [ref=e455]: "13"
                - gridcell [ref=e456]:
                  - button "2026年10月14日水曜日" [ref=e457]: "14"
                - gridcell [ref=e458]:
                  - button "2026年10月15日木曜日" [ref=e459]: "15"
                - gridcell [ref=e460]:
                  - button "2026年10月16日金曜日" [ref=e461]: "16"
                - gridcell [ref=e462]:
                  - button "2026年10月17日土曜日" [ref=e463]: "17"
              - row [ref=e464]:
                - gridcell [ref=e465]:
                  - button "2026年10月18日日曜日" [ref=e466]: "18"
                - gridcell [ref=e467]:
                  - button "2026年10月19日月曜日" [ref=e468]: "19"
                - gridcell [ref=e469]:
                  - button "2026年10月20日火曜日" [ref=e470]: "20"
                - gridcell [ref=e471]:
                  - button "2026年10月21日水曜日" [ref=e472]: "21"
                - gridcell [ref=e473]:
                  - button "2026年10月22日木曜日" [ref=e474]: "22"
                - gridcell [ref=e475]:
                  - button "2026年10月23日金曜日" [ref=e476]: "23"
                - gridcell [ref=e477]:
                  - button "2026年10月24日土曜日" [ref=e478]: "24"
              - row [ref=e479]:
                - gridcell [ref=e480]:
                  - button "2026年10月25日日曜日" [ref=e481]: "25"
                - gridcell [ref=e482]:
                  - button "2026年10月26日月曜日" [ref=e483]: "26"
                - gridcell [ref=e484]:
                  - button "2026年10月27日火曜日" [ref=e485]: "27"
                - gridcell [ref=e486]:
                  - button "2026年10月28日水曜日" [ref=e487]: "28"
                - gridcell [ref=e488]:
                  - button "2026年10月29日木曜日" [ref=e489]: "29"
                - gridcell [ref=e490]:
                  - button "2026年10月30日金曜日" [ref=e491]: "30"
                - gridcell [ref=e492]:
                  - button "2026年10月31日土曜日" [ref=e493]: "31"
              - row [ref=e494]:
                - gridcell [ref=e495]:
                  - button "2026年11月1日日曜日" [ref=e496]: "1"
                - gridcell [ref=e497]:
                  - button "2026年11月2日月曜日" [ref=e498]: "2"
                - gridcell [ref=e499]:
                  - button "2026年11月3日火曜日" [ref=e500]: "3"
                - gridcell [ref=e501]:
                  - button "2026年11月4日水曜日" [ref=e502]: "4"
                - gridcell [ref=e503]:
                  - button "2026年11月5日木曜日" [ref=e504]: "5"
                - gridcell [ref=e505]:
                  - button "2026年11月6日金曜日" [ref=e506]: "6"
                - gridcell [ref=e507]:
                  - button "2026年11月7日土曜日" [ref=e508]: "7"
        - paragraph [ref=e509]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
      - group "対象期間" [ref=e511]:
        - generic [ref=e513]:
          - generic [ref=e515]:
            - generic [ref=e516]: 対象期間の開始日 任意
            - generic [ref=e517]:
              - textbox "対象期間の開始日 任意" [ref=e518]
              - button "対象期間の開始日のカレンダーを開く" [ref=e519] [cursor=pointer]:
                - generic [ref=e520]: カレンダー
              - button "対象期間の開始日をクリア" [disabled] [ref=e521]:
                - generic [ref=e522]: クリア
            - paragraph
          - generic [ref=e524]:
            - generic [ref=e525]: 対象期間の終了日 任意
            - generic [ref=e526]:
              - textbox "対象期間の終了日 任意" [ref=e527]
              - button "対象期間の終了日のカレンダーを開く" [ref=e528] [cursor=pointer]:
                - generic [ref=e529]: カレンダー
              - button "対象期間の終了日をクリア" [disabled] [ref=e530]:
                - generic [ref=e531]: クリア
            - paragraph
        - generic [ref=e532]:
          - button "翌週の平日" [ref=e533] [cursor=pointer]
          - button "選択不可日を含む期間" [disabled] [ref=e535]
          - button "期間をクリア" [ref=e537] [cursor=pointer]
        - generic [ref=e539]:
          - button "開始日を選ぶ" [pressed] [ref=e540] [cursor=pointer]
          - button "終了日を選ぶ" [ref=e542] [cursor=pointer]
        - generic [ref=e544]:
          - region "対象期間の1か月目" [ref=e546]:
            - generic [ref=e547]:
              - button "対象期間の1か月目の前の月" [ref=e548] [cursor=pointer]:
                - generic [ref=e549]: 前月
              - heading "2026年10月" [level=3] [ref=e550]
              - button "対象期間の1か月目の次の月" [ref=e551] [cursor=pointer]:
                - generic [ref=e552]: 次月
            - region "対象期間の1か月目の日付一覧" [ref=e553]:
              - grid "2026年10月" [ref=e554]:
                - rowgroup [ref=e555]:
                  - row [ref=e556]:
                    - columnheader "日" [ref=e557]
                    - columnheader "月" [ref=e558]
                    - columnheader "火" [ref=e559]
                    - columnheader "水" [ref=e560]
                    - columnheader "木" [ref=e561]
                    - columnheader "金" [ref=e562]
                    - columnheader "土" [ref=e563]
                - rowgroup [ref=e564]:
                  - row [ref=e565]:
                    - gridcell [ref=e566]:
                      - button "2026年9月27日日曜日" [ref=e567]: "27"
                    - gridcell [ref=e568]:
                      - button "2026年9月28日月曜日" [ref=e569]: "28"
                    - gridcell [ref=e570]:
                      - button "2026年9月29日火曜日" [ref=e571]: "29"
                    - gridcell [ref=e572]:
                      - button "2026年9月30日水曜日" [ref=e573]: "30"
                    - gridcell [ref=e574]:
                      - button "2026年10月1日木曜日" [ref=e575]: "1"
                    - gridcell [ref=e576]:
                      - button "2026年10月2日金曜日" [ref=e577]: "2"
                    - gridcell [ref=e578]:
                      - button "2026年10月3日土曜日" [disabled] [ref=e579]: "3"
                  - row [ref=e580]:
                    - gridcell [ref=e581]:
                      - button "2026年10月4日日曜日" [ref=e582]: "4"
                    - gridcell [ref=e583]:
                      - button "2026年10月5日月曜日" [ref=e584]: "5"
                    - gridcell [ref=e585]:
                      - button "2026年10月6日火曜日" [ref=e586]: "6"
                    - gridcell [ref=e587]:
                      - button "2026年10月7日水曜日" [ref=e588]: "7"
                    - gridcell [ref=e589]:
                      - button "2026年10月8日木曜日" [ref=e590]: "8"
                    - gridcell [ref=e591]:
                      - button "2026年10月9日金曜日" [ref=e592]: "9"
                    - gridcell [ref=e593]:
                      - button "2026年10月10日土曜日" [ref=e594]: "10"
                  - row [ref=e595]:
                    - gridcell [ref=e596]:
                      - button "2026年10月11日日曜日" [ref=e597]: "11"
                    - gridcell [ref=e598]:
                      - button "2026年10月12日月曜日" [ref=e599]: "12"
                    - gridcell [ref=e600]:
                      - button "2026年10月13日火曜日" [ref=e601]: "13"
                    - gridcell [ref=e602]:
                      - button "2026年10月14日水曜日" [ref=e603]: "14"
                    - gridcell [ref=e604]:
                      - button "2026年10月15日木曜日" [ref=e605]: "15"
                    - gridcell [ref=e606]:
                      - button "2026年10月16日金曜日" [ref=e607]: "16"
                    - gridcell [ref=e608]:
                      - button "2026年10月17日土曜日" [ref=e609]: "17"
                  - row [ref=e610]:
                    - gridcell [ref=e611]:
                      - button "2026年10月18日日曜日" [ref=e612]: "18"
                    - gridcell [ref=e613]:
                      - button "2026年10月19日月曜日" [ref=e614]: "19"
                    - gridcell [ref=e615]:
                      - button "2026年10月20日火曜日" [ref=e616]: "20"
                    - gridcell [ref=e617]:
                      - button "2026年10月21日水曜日" [ref=e618]: "21"
                    - gridcell [ref=e619]:
                      - button "2026年10月22日木曜日" [ref=e620]: "22"
                    - gridcell [ref=e621]:
                      - button "2026年10月23日金曜日" [ref=e622]: "23"
                    - gridcell [ref=e623]:
                      - button "2026年10月24日土曜日" [ref=e624]: "24"
                  - row [ref=e625]:
                    - gridcell [ref=e626]:
                      - button "2026年10月25日日曜日" [ref=e627]: "25"
                    - gridcell [ref=e628]:
                      - button "2026年10月26日月曜日" [ref=e629]: "26"
                    - gridcell [ref=e630]:
                      - button "2026年10月27日火曜日" [ref=e631]: "27"
                    - gridcell [ref=e632]:
                      - button "2026年10月28日水曜日" [ref=e633]: "28"
                    - gridcell [ref=e634]:
                      - button "2026年10月29日木曜日" [ref=e635]: "29"
                    - gridcell [ref=e636]:
                      - button "2026年10月30日金曜日" [ref=e637]: "30"
                    - gridcell [ref=e638]:
                      - button "2026年10月31日土曜日" [ref=e639]: "31"
                  - row [ref=e640]:
                    - gridcell [ref=e641]:
                      - button "2026年11月1日日曜日" [ref=e642]: "1"
                    - gridcell [ref=e643]:
                      - button "2026年11月2日月曜日" [ref=e644]: "2"
                    - gridcell [ref=e645]:
                      - button "2026年11月3日火曜日" [ref=e646]: "3"
                    - gridcell [ref=e647]:
                      - button "2026年11月4日水曜日" [ref=e648]: "4"
                    - gridcell [ref=e649]:
                      - button "2026年11月5日木曜日" [ref=e650]: "5"
                    - gridcell [ref=e651]:
                      - button "2026年11月6日金曜日" [ref=e652]: "6"
                    - gridcell [ref=e653]:
                      - button "2026年11月7日土曜日" [ref=e654]: "7"
            - paragraph [ref=e655]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
          - region "対象期間の2か月目" [ref=e657]:
            - generic [ref=e658]:
              - button "対象期間の2か月目の前の月" [ref=e659] [cursor=pointer]:
                - generic [ref=e660]: 前月
              - heading "2026年11月" [level=3] [ref=e661]
              - button "対象期間の2か月目の次の月" [ref=e662] [cursor=pointer]:
                - generic [ref=e663]: 次月
            - region "対象期間の2か月目の日付一覧" [ref=e664]:
              - grid "2026年11月" [ref=e665]:
                - rowgroup [ref=e666]:
                  - row [ref=e667]:
                    - columnheader "日" [ref=e668]
                    - columnheader "月" [ref=e669]
                    - columnheader "火" [ref=e670]
                    - columnheader "水" [ref=e671]
                    - columnheader "木" [ref=e672]
                    - columnheader "金" [ref=e673]
                    - columnheader "土" [ref=e674]
                - rowgroup [ref=e675]:
                  - row [ref=e676]:
                    - gridcell [ref=e677]:
                      - button "2026年11月1日日曜日" [ref=e678]: "1"
                    - gridcell [ref=e679]:
                      - button "2026年11月2日月曜日" [ref=e680]: "2"
                    - gridcell [ref=e681]:
                      - button "2026年11月3日火曜日" [ref=e682]: "3"
                    - gridcell [ref=e683]:
                      - button "2026年11月4日水曜日" [ref=e684]: "4"
                    - gridcell [ref=e685]:
                      - button "2026年11月5日木曜日" [ref=e686]: "5"
                    - gridcell [ref=e687]:
                      - button "2026年11月6日金曜日" [ref=e688]: "6"
                    - gridcell [ref=e689]:
                      - button "2026年11月7日土曜日" [ref=e690]: "7"
                  - row [ref=e691]:
                    - gridcell [ref=e692]:
                      - button "2026年11月8日日曜日" [ref=e693]: "8"
                    - gridcell [ref=e694]:
                      - button "2026年11月9日月曜日" [ref=e695]: "9"
                    - gridcell [ref=e696]:
                      - button "2026年11月10日火曜日" [ref=e697]: "10"
                    - gridcell [ref=e698]:
                      - button "2026年11月11日水曜日" [ref=e699]: "11"
                    - gridcell [ref=e700]:
                      - button "2026年11月12日木曜日" [ref=e701]: "12"
                    - gridcell [ref=e702]:
                      - button "2026年11月13日金曜日" [ref=e703]: "13"
                    - gridcell [ref=e704]:
                      - button "2026年11月14日土曜日" [ref=e705]: "14"
                  - row [ref=e706]:
                    - gridcell [ref=e707]:
                      - button "2026年11月15日日曜日" [ref=e708]: "15"
                    - gridcell [ref=e709]:
                      - button "2026年11月16日月曜日" [ref=e710]: "16"
                    - gridcell [ref=e711]:
                      - button "2026年11月17日火曜日" [ref=e712]: "17"
                    - gridcell [ref=e713]:
                      - button "2026年11月18日水曜日" [ref=e714]: "18"
                    - gridcell [ref=e715]:
                      - button "2026年11月19日木曜日" [ref=e716]: "19"
                    - gridcell [ref=e717]:
                      - button "2026年11月20日金曜日" [ref=e718]: "20"
                    - gridcell [ref=e719]:
                      - button "2026年11月21日土曜日" [ref=e720]: "21"
                  - row [ref=e721]:
                    - gridcell [ref=e722]:
                      - button "2026年11月22日日曜日" [ref=e723]: "22"
                    - gridcell [ref=e724]:
                      - button "2026年11月23日月曜日" [ref=e725]: "23"
                    - gridcell [ref=e726]:
                      - button "2026年11月24日火曜日" [ref=e727]: "24"
                    - gridcell [ref=e728]:
                      - button "2026年11月25日水曜日" [ref=e729]: "25"
                    - gridcell [ref=e730]:
                      - button "2026年11月26日木曜日" [ref=e731]: "26"
                    - gridcell [ref=e732]:
                      - button "2026年11月27日金曜日" [ref=e733]: "27"
                    - gridcell [ref=e734]:
                      - button "2026年11月28日土曜日" [ref=e735]: "28"
                  - row [ref=e736]:
                    - gridcell [ref=e737]:
                      - button "2026年11月29日日曜日" [ref=e738]: "29"
                    - gridcell [ref=e739]:
                      - button "2026年11月30日月曜日" [ref=e740]: "30"
                    - gridcell [ref=e741]:
                      - button "2026年12月1日火曜日" [ref=e742]: "1"
                    - gridcell [ref=e743]:
                      - button "2026年12月2日水曜日" [ref=e744]: "2"
                    - gridcell [ref=e745]:
                      - button "2026年12月3日木曜日" [ref=e746]: "3"
                    - gridcell [ref=e747]:
                      - button "2026年12月4日金曜日" [ref=e748]: "4"
                    - gridcell [ref=e749]:
                      - button "2026年12月5日土曜日" [ref=e750]: "5"
                  - row [ref=e751]:
                    - gridcell [ref=e752]:
                      - button "2026年12月6日日曜日" [ref=e753]: "6"
                    - gridcell [ref=e754]:
                      - button "2026年12月7日月曜日" [ref=e755]: "7"
                    - gridcell [ref=e756]:
                      - button "2026年12月8日火曜日" [ref=e757]: "8"
                    - gridcell [ref=e758]:
                      - button "2026年12月9日水曜日" [ref=e759]: "9"
                    - gridcell [ref=e760]:
                      - button "2026年12月10日木曜日" [ref=e761]: "10"
                    - gridcell [ref=e762]:
                      - button "2026年12月11日金曜日" [ref=e763]: "11"
                    - gridcell [ref=e764]:
                      - button "2026年12月12日土曜日" [ref=e765]: "12"
            - paragraph [ref=e766]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
    - button "年の月一覧を切替" [ref=e767] [cursor=pointer]
    - generic [ref=e769]:
      - checkbox "端末日付の既定値を表示" [ref=e770]
      - text: 端末日付の既定値を表示
    - generic [ref=e771]: "{\"date\":\"2026-10-05\",\"time\":\"09:00\",\"datetime\":null,\"month\":\"2026-10\",\"year\":\"2026\",\"calendar\":\"2026-10-05\",\"range\":{\"start\":null,\"end\":null}}"
    - paragraph [ref=e772]: "日付: 有効"
  - region "グリッドとアイコンの検証" [ref=e774]:
    - heading "申請をカード一覧で確認する" [level=2] [ref=e775]
    - text: グリッド列数
    - combobox "グリッド列数" [ref=e776]:
      - option "領域に合わせる" [selected]
      - option "1"
      - option "3"
    - text: グリッド選択
    - combobox "グリッド選択" [ref=e777]:
      - option "なし"
      - option "単一"
      - option "複数" [selected]
    - generic [ref=e778]:
      - checkbox "狭い間隔" [ref=e779]
      - text: 狭い間隔
    - generic [ref=e780]:
      - checkbox "空一覧" [ref=e781]
      - text: 空一覧
    - generic [ref=e782]:
      - checkbox "一覧の処理中" [ref=e783]
      - text: 一覧の処理中
    - region "申請カード" [ref=e785]:
      - generic [ref=e786]:
        - button "一覧をすべて選択" [ref=e787] [cursor=pointer]
        - button "一覧の選択を解除" [disabled] [ref=e789]
      - list [ref=e791]:
        - listitem [ref=e792]:
          - generic [ref=e793]:
            - checkbox "備品購入を選択" [ref=e794]
            - text: 備品購入を選択
          - heading "備品購入" [level=3] [ref=e795]
          - paragraph [ref=e803]: 下書き
          - paragraph
          - generic [ref=e804]:
            - text: "追記: 備品購入"
            - 'textbox "追記: 備品購入" [ref=e805]': 保持する入力
          - button "申請を開く" [ref=e806] [cursor=pointer]
        - listitem [ref=e808]:
          - generic [ref=e809]:
            - checkbox "出張旅費を選択" [ref=e810]
            - text: 出張旅費を選択
          - heading "出張旅費" [level=3] [ref=e811]
          - paragraph [ref=e819]: 確認中
          - paragraph
          - generic [ref=e820]:
            - text: "追記: 出張旅費"
            - 'textbox "追記: 出張旅費" [ref=e821]': 保持する入力
          - button "申請を開く" [ref=e822] [cursor=pointer]
        - listitem [ref=e824]:
          - generic [ref=e825]:
            - checkbox "確認済みの申請を選択" [disabled] [ref=e826]
            - text: 確認済みの申請を選択
          - heading "確認済みの申請" [level=3] [ref=e827]
          - paragraph [ref=e835]: 承認済み
          - paragraph
          - generic [ref=e836]:
            - text: "追記: 確認済みの申請"
            - 'textbox "追記: 確認済みの申請" [ref=e837]': 保持する入力
          - button "申請を開く" [ref=e838] [cursor=pointer]
    - paragraph [ref=e840]: "選択:"
    - paragraph [ref=e841]: "申請:"
    - generic [ref=e842]:
      - img "確認済み" [ref=e844]
      - img "確認が必要" [ref=e848]
      - button "申請を追加" [ref=e856] [cursor=pointer]
  - region "Card・Menu・Dialog・通知の検証" [ref=e863]:
    - heading "領域と浮動表示の操作確認" [level=2] [ref=e864]
    - generic [ref=e865]:
      - generic [ref=e866]:
        - generic [ref=e867]:
          - checkbox "Card見出し" [checked] [ref=e868]
          - text: Card見出し
        - generic [ref=e869]:
          - checkbox "Card本文" [checked] [ref=e870]
          - text: Card本文
        - generic [ref=e871]:
          - checkbox "Card画像" [checked] [ref=e872]
          - text: Card画像
        - generic [ref=e873]:
          - checkbox "Cardフッター" [checked] [ref=e874]
          - text: Cardフッター
        - generic [ref=e875]:
          - checkbox "Card操作" [checked] [ref=e876]
          - text: Card操作
        - generic [ref=e877]:
          - checkbox "Card取得中" [ref=e878]
          - text: Card取得中
        - generic [ref=e879]:
          - checkbox "Card横向き" [ref=e880]
          - text: Card横向き
      - generic "申請内容" [ref=e881]:
        - article "編集用Card" [ref=e882]:
          - generic [ref=e884]:
            - strong [ref=e885]: "見出しテンプレート: 申請内容"
            - 'button "折り畳む: 申請内容" [expanded] [ref=e886] [cursor=pointer]'
          - generic [ref=e888]:
            - img "申請の図" [ref=e890]: 画像テンプレート
            - generic [ref=e891]:
              - generic [ref=e892]:
                - text: Card内メモ
                - textbox "Card内メモ" [ref=e893]: 保持する入力
              - button "本文を隠す" [ref=e894] [cursor=pointer]
              - button "本文から折り畳む" [ref=e896] [cursor=pointer]
            - paragraph [ref=e899]: フッターテンプレート
            - button "Cardの操作を実行" [ref=e901] [cursor=pointer]
          - status
      - generic "投影領域の例" [ref=e903]:
        - article "投影領域の例" [ref=e904]:
          - generic [ref=e906]:
            - generic [ref=e907]: 投影見出し
            - heading "投影領域の例" [level=2] [ref=e908]
          - generic [ref=e909]:
            - generic [ref=e910]: 投影メディア
            - generic [ref=e912]: 投影本文
            - generic [ref=e914]: 投影フッター
            - button "投影操作" [ref=e918] [cursor=pointer]
          - status
      - paragraph [ref=e920]: "Card操作: 0"
      - generic [ref=e921]:
        - generic [ref=e922]:
          - checkbox "選択後Menuを閉じる" [checked] [ref=e923]
          - text: 選択後Menuを閉じる
        - generic [ref=e924]:
          - checkbox "Menu無効" [ref=e925]
          - text: Menu無効
      - generic [ref=e926]:
        - button "申請の操作" [expanded] [ref=e927] [cursor=pointer]
        - menu "申請の操作" [ref=e930]:
          - menuitem "ファイル" [expanded] [ref=e931] [cursor=pointer]:
            - generic [aria-hidden] [ref=e936]: ›
          - menu "ファイル" [ref=e937]:
            - menuitem "新規" [expanded] [ref=e938] [cursor=pointer]:
              - generic [aria-hidden] [ref=e940]: ›
            - menu "新規" [ref=e941]:
              - menuitem "申請を作成" [active] [ref=e942] [cursor=pointer]
              - menuitem "テンプレートから作成" [ref=e944] [cursor=pointer]
              - menuitem "親メニューに戻る" [ref=e946] [cursor=pointer]
            - menuitem "保存" [disabled] [ref=e947]
            - menuitem "ファイルを隠す" [ref=e949] [cursor=pointer]
            - separator [ref=e951]
            - group "表示" [ref=e952]:
              - text: 表示
              - menuitemcheckbox "Hints 補助説明" [ref=e953] [cursor=pointer]:
                - generic [aria-hidden] [ref=e954]: ○
              - menuitemradio "簡潔" [checked] [ref=e956] [cursor=pointer]:
                - generic [aria-hidden] [ref=e957]: ✓
              - menuitemradio "Details 詳細" [ref=e959] [cursor=pointer]:
                - generic [aria-hidden] [ref=e960]: ○
            - menuitem "親メニューに戻る" [ref=e962] [cursor=pointer]
          - menuitem "出力" [ref=e963] [cursor=pointer]
          - menuitem "実行不可" [disabled] [ref=e965]
      - button "Menuの次の操作" [ref=e967] [cursor=pointer]
      - button "hoverメニュー" [ref=e970] [cursor=pointer]
      - generic [ref=e972]:
        - button "対象の操作" [ref=e973] [cursor=pointer]
        - generic "対象の操作の対象" [ref=e975]: 右クリック・長押し・Shift+F10の対象
      - button "別scopeの操作" [ref=e977] [cursor=pointer]
      - paragraph [ref=e979]: "Menu選択:"
      - generic [ref=e980]:
        - generic [ref=e981]:
          - checkbox "Modal" [checked] [ref=e982]
          - text: Modal
        - generic [ref=e983]:
          - checkbox "外側クリック終了" [ref=e984]
          - text: 外側クリック終了
        - generic [ref=e985]:
          - checkbox "Escape終了" [checked] [ref=e986]
          - text: Escape終了
        - generic [ref=e987]:
          - checkbox "未保存の終了を保留" [ref=e988]
          - text: 未保存の終了を保留
        - generic [ref=e989]: Dialog位置
        - combobox "Dialog位置" [ref=e990]:
          - option "中央" [selected]
          - option "上"
          - option "下"
          - option "開始側"
          - option "終端側"
      - button "編集Dialogを開く" [ref=e991] [cursor=pointer]
      - button "Dialogを連続で開く" [ref=e993] [cursor=pointer]
      - paragraph [ref=e995]: "終了保留: 0"
      - paragraph [ref=e996]: "終了: /"
    - button "独立scopeの起動" [ref=e998] [cursor=pointer]
    - generic [ref=e1000]:
      - generic [ref=e1001]:
        - checkbox "通知を自動消去" [checked] [ref=e1002]
        - text: 通知を自動消去
      - generic [ref=e1003]: 通知位置
      - combobox "通知位置" [ref=e1004]:
        - option "top-start" [selected]
        - option "top-center"
        - option "top-end"
        - option "bottom-start"
        - option "bottom-center"
        - option "bottom-end"
      - generic [ref=e1005]: 通知の秒数
      - spinbutton "通知の秒数" [ref=e1006]: "5"
      - button "単独通知を表示" [ref=e1007] [cursor=pointer]
      - button "長い通知を表示" [ref=e1009] [cursor=pointer]
    - paragraph [ref=e1011]: "単独通知: / 操作: 0"
    - generic [ref=e1012]:
      - generic [ref=e1013]: 同時表示数
      - combobox "同時表示数" [ref=e1014]:
        - option "1" [selected]
        - option "2"
      - generic [ref=e1015]: 重複処理
      - combobox "重複処理" [ref=e1016]:
        - option "無視" [selected]
        - option "置換"
        - option "すべて"
      - button "キューに通知を追加" [ref=e1017] [cursor=pointer]
      - button "同じ通知を追加" [ref=e1019] [cursor=pointer]
      - button "内容を更新して置換" [ref=e1021] [cursor=pointer]
      - button "通知をすべて閉じる" [ref=e1023] [cursor=pointer]
    - paragraph [ref=e1025]: "通知総数: 0"
    - paragraph [ref=e1026]: "ホスト終了:"
    - region "Dialog各種の検証" [ref=e1028]:
      - heading "確認・入力・動的Dialog" [level=2] [ref=e1029]
      - button "確認Dialogを開く" [ref=e1030] [cursor=pointer]
      - button "重要通知を開く" [ref=e1032] [cursor=pointer]
      - generic [ref=e1034]:
        - checkbox "保存を失敗させる" [checked] [ref=e1035]
        - text: 保存を失敗させる
      - button "FormDialogを開く" [ref=e1036] [cursor=pointer]
      - button "動的入力名を更新" [ref=e1038] [cursor=pointer]
      - button "DynamicDialogを開く" [ref=e1040] [cursor=pointer]
      - paragraph [ref=e1042]: "Dialog結果: /"
      - paragraph [ref=e1043]: "動的結果:"
```

# Test source

```ts
  1  | import {test,expect} from './runtime-test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import type {Page,TestInfo} from '@playwright/test';
  4  | type Profile='guided'|'dense';
  5  | const other=(profile:Profile):Profile=>profile==='guided'?'dense':'guided';
  6  | async function narrow(page:Page){await page.setViewportSize({width:320,height:800});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');}
  7  | async function foundation(page:Page,profile:Profile){
  8  |  await page.goto('/catalog/foundation');await expect(page.locator('#range-status')).toHaveText('VALID');await narrow(page);
  9  |  await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'ja-JP',direction:'rtl',timeZone:'UTC',dateInputFormat:'dd/MM/yyyy'});},profile);
  10 |  await expect(page.locator('main')).toHaveAttribute('data-ui-profile',profile);await expect(page.locator('main')).toHaveAttribute('dir','rtl');
  11 | }
  12 | async function catalog(page:Page,profile:Profile){await page.goto('/catalog');await page.locator('#catalog-profile').selectOption(profile);await narrow(page);await page.getByLabel('RTL',{exact:true}).check();await expect(page.locator('main')).toHaveAttribute('dir','rtl');}
  13 | async function evidence(page:Page,info:TestInfo,selector:string){
  14 |  const target=page.locator(selector),geometry=await target.evaluate(element=>{const r=element.getBoundingClientRect(),style=getComputedStyle(element);return {x:r.x,right:r.right,width:r.width,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,direction:style.direction,profile:element.closest('[data-ui-profile]')?.getAttribute('data-ui-profile')};});
  15 |  await info.attach('native-geometry',{body:JSON.stringify(geometry,null,2),contentType:'application/json'});
  16 |  expect(geometry.documentWidth,'320px/200% document overflow').toBeLessThanOrEqual(321);
> 17 |  const accessibility=await new AxeBuilder({page}).include(selector).analyze();await info.attach('axe-target',{body:JSON.stringify(accessibility),contentType:'application/json'});expect(accessibility.violations).toEqual([]);
     |                                                                                                                                                                                                                    ^ Error: expect(received).toEqual(expected) // deep equality
  18 |  await info.attach('aria-target',{body:await target.ariaSnapshot(),contentType:'text/plain'});
  19 | }
  20 | for(const profile of ['guided','dense'] as const){
  21 |  test(`Card ${profile}: collapse/body visibility, profile and input identity`,async({page},info)=>{
  22 |   await catalog(page,profile);const input=page.getByRole('textbox',{name:'Card内メモ',exact:true}),card=page.locator('ui-card').filter({has:page.locator('#verification-card-content')});await input.fill('再開する未保存の下書き');await input.evaluate(element=>(window as any).__crossCardInput=element);
  23 |   const inside=page.getByRole('button',{name:'本文から折り畳む',exact:true});await inside.focus();await inside.press('Enter');await expect(input).toBeHidden();const expand=page.getByRole('button',{name:'展開: 申請内容',exact:true});await expect(expand).toBeFocused();await expand.press('Enter');await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  24 |   await page.locator('#catalog-profile').selectOption(other(profile));await expect(page.locator('main')).toHaveAttribute('data-ui-profile',other(profile));await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  25 |   const hide=page.getByRole('button',{name:'本文を隠す',exact:true});await hide.focus();await hide.press('Enter');await expect(input).toBeHidden();await expect(page.getByRole('button',{name:'折り畳む: 申請内容',exact:true})).toBeFocused();await page.getByLabel('Card本文',{exact:true}).check();await expect(input).toHaveValue('再開する未保存の下書き');expect(await input.evaluate(element=>element===(window as any).__crossCardInput)).toBe(true);
  26 |   await page.getByLabel('Card取得中',{exact:true}).check();await expect(card.locator('article')).toHaveAttribute('aria-busy','true');await expect(card.getByRole('status')).toHaveText('内容を読み込んでいます。');await expect(input).toHaveValue('再開する未保存の下書き');await evidence(page,info,'ui-card:has(#verification-card-content)');
  27 |  });
  28 |  test(`Menu ${profile}: recursive RTL keys, disabled intent, Tab exit and parent focus`,async({page},info)=>{
  29 |   await catalog(page,profile);const trigger=page.getByRole('button',{name:'申請の操作',exact:true}),root=page.locator('#recursive-menu');await trigger.focus();await trigger.press('ArrowDown');const file=root.getByRole('menuitem',{name:'ファイル',exact:true});await expect(file).toBeFocused();await file.press('ArrowLeft');const next=root.getByRole('menuitem',{name:'新規',exact:true});await expect(next).toBeFocused();await next.press('ArrowLeft');await expect(root.getByRole('menuitem',{name:'申請を作成',exact:true})).toBeFocused();await evidence(page,info,'#recursive-menu');
  30 |   await page.keyboard.press('Escape');await expect(next).toBeFocused();await page.keyboard.press('Escape');await expect(file).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(root).toBeHidden();
  31 |   await trigger.press('ArrowUp');await expect(root.getByRole('menuitem',{name:'実行不可',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByTestId('menu-selected')).toHaveText('Menu選択: ');await expect(root).toBeVisible();await page.keyboard.press('Home');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Menuの次の操作',exact:true})).toBeFocused();await expect(root).toBeHidden();
  32 |  });
  33 |  test(`DateRange ${profile}: invalid draft, locale/profile, keyboard calendar and focus`,async({page},info)=>{
  34 |   await foundation(page,profile);const range=page.locator('#range-case'),start=range.locator('input').first(),picker=range.locator('ui-date-picker').first();
  35 |   await start.fill('31/02/2026');await start.focus();await start.evaluate(element=>{(window as any).__crossDateEditor=element;(element as HTMLInputElement).setSelectionRange(2,5);});
  36 |   await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'en-US',direction:'rtl',timeZone:'UTC',dateInputFormat:'yyyy-MM-dd'});},other(profile));
  37 |   await expect(start).toHaveValue('31/02/2026');await expect(start).toHaveAttribute('placeholder','dd/MM/yyyy');await expect(start).toBeFocused();expect(await start.evaluate(element=>element===(window as any).__crossDateEditor)).toBe(true);expect(await start.evaluate(element=>[(element as HTMLInputElement).selectionStart,(element as HTMLInputElement).selectionEnd])).toEqual([2,5]);
  38 |   await expect(page.locator('#range-status')).toHaveText('INVALID');await expect(page.locator('#range-value')).toHaveText('{"start":"2026-02-01","end":"2026-02-07"}');
  39 |   await start.fill('02/02/2026');await expect(start).toHaveValue('2026-02-02');await expect(page.locator('#range-status')).toHaveText('VALID');
  40 |   const trigger=picker.getByRole('button',{name:'期間の開始日のカレンダーを開く',exact:true});await trigger.focus();await trigger.press('Enter');const popup=page.locator('dialog:modal');await expect(popup).toBeVisible();const day=popup.locator('button[data-date="2026-02-03"]');await day.focus();await day.press('Enter');await expect(popup).toHaveCount(0);await expect(start).toHaveValue('2026-02-03');await expect(trigger).toBeFocused();
  41 |   await evidence(page,info,'#range-case');
  42 |  });
  43 |  test(`Composer ${profile}: pending/reset keeps input and CodeMirror native editing`,async({page},info)=>{
  44 |   await foundation(page,profile);const textarea=page.locator('#composer-case textarea');await textarea.fill('保持するnative下書き');await textarea.focus();await textarea.evaluate(element=>{(window as any).__crossComposer=element;(element as HTMLTextAreaElement).setSelectionRange(2,6);});
  45 |   await page.evaluate(profile=>{const app=(window as any).__stage;app.profile.set(profile);app.rootLocale.set({locale:'de-DE',direction:'rtl',dateInputFormat:'dd/MM/yyyy',timeZone:'UTC',messages:{メッセージを入力:'Draft message',送信:'Send'}});},other(profile));
  46 |   await expect(page.locator('#root-locale .ui-input-format')).toContainText('1.234,5');await expect(textarea).toHaveValue('保持するnative下書き');await expect(textarea).toBeFocused();expect(await textarea.evaluate(element=>element===(window as any).__crossComposer)).toBe(true);expect(await textarea.evaluate(element=>[(element as HTMLTextAreaElement).selectionStart,(element as HTMLTextAreaElement).selectionEnd])).toEqual([2,6]);
  47 |   const submit=page.locator('#composer-case button[type=submit]');await expect(submit).toHaveText('Send');await submit.focus();await submit.press('Enter');await expect(page.locator('#composer-intents')).toHaveText('1');await expect(textarea).toBeDisabled();
  48 |   expect(await page.evaluate(()=>{const app=(window as any).__stage.newForms();return app.composer().markSendUnknown(app.requests()[0].requestId);})).toBe(true);await expect(textarea).toHaveValue('保持するnative下書き');await expect(submit).toBeDisabled();
  49 |   await page.evaluate(()=>(window as any).__stage.newForms().composerControl.reset('保持するnative下書き'));await expect(submit).toBeEnabled();expect(await page.evaluate(()=>{const app=(window as any).__stage.newForms();return app.composer().completeSend(app.requests()[0].requestId,true);})).toBe(false);
  50 |   await evidence(page,info,'#composer-case');
  51 |   const code=page.locator('[data-editor=code] .cm-content');await code.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('const crossBrowser = 7;');await expect(page.locator('#code-value')).toHaveText('const crossBrowser = 7;');await code.evaluate(element=>(window as any).__crossCode=element);await page.evaluate(profile=>(window as any).__stage.profile.set(profile),profile);await expect(code).toBeFocused();expect(await code.evaluate(element=>element===(window as any).__crossCode)).toBe(true);await expect(page.locator('#code-value')).toHaveText('const crossBrowser = 7;');
  52 |   await info.attach('codemirror-native',{body:JSON.stringify({value:await page.locator('#code-value').textContent(),sameEditor:true,focused:true}),contentType:'application/json'});
  53 |  });
  54 |  test(`Dialog ${profile}: busy/veto, nested RTL Menu, retained input and close return`,async({page},info)=>{
  55 |   await catalog(page,profile);const opener=page.getByRole('button',{name:'編集Dialogを開く',exact:true});await opener.focus();await opener.press('Enter');const dialog=page.getByRole('dialog',{name:'申請の編集',exact:true}),input=dialog.getByRole('textbox',{name:'Dialogの入力',exact:true});await expect(input).toBeFocused();expect(await dialog.evaluate(element=>element.matches(':modal'))).toBe(true);await input.fill('閉じ戻っても保持');await input.evaluate(element=>(window as any).__crossDialogInput=element);
  56 |   // Scoped profile is an application-controlled DOM scope; the native modal background stays inert.
  57 |   await dialog.evaluate((element,profile)=>element.setAttribute('data-ui-profile',profile),other(profile));await expect(input).toHaveValue('閉じ戻っても保持');await expect(input).toBeFocused();expect(await input.evaluate(element=>element===(window as any).__crossDialogInput)).toBe(true);
  58 |   await dialog.getByLabel('終了保留を解除',{exact:true}).check();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(page.getByTestId('dialog-held')).toHaveText('終了保留: 1');await dialog.getByLabel('終了保留を解除',{exact:true}).uncheck();await dialog.getByLabel('処理中',{exact:true}).check();await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'ダイアログを閉じる',exact:true})).toBeDisabled();await dialog.getByLabel('処理中',{exact:true}).uncheck();
  59 |   const menu=dialog.getByRole('button',{name:'Dialog内Menu',exact:true});await menu.focus();await menu.press('ArrowDown');const file=page.locator('#dialog-menu').getByRole('menuitem',{name:'ファイル',exact:true});await expect(file).toBeFocused();await file.press('ArrowLeft');await expect(page.locator('#dialog-menu').getByRole('menuitem',{name:'新規',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(file).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(dialog).toBeVisible();
  60 |   await evidence(page,info,'dialog[open]');await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('dialog-result')).toHaveText('終了: escape / ');
  61 |   await opener.press('Enter');await expect(input).toHaveValue('閉じ戻っても保持');expect(await input.evaluate(element=>element===(window as any).__crossDialogInput)).toBe(true);await dialog.getByRole('button',{name:'編集を確定',exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('dialog-result')).toHaveText('終了: confirm / saved');
  62 |  });
  63 |  test(`Snackbar ${profile}: exact timeout, OFF, overlapping pause and owned focus return`,async({page},info)=>{
  64 |   await catalog(page,profile);await page.clock.install({time:new Date('2026-10-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-06T12:00:01Z'));await page.mouse.move(0,0);const opener=page.getByRole('button',{name:'単独通知を表示',exact:true}),notice=page.locator('ui-snackbar').filter({hasText:'申請を保存しました'}).locator('.ui-snackbar');
  65 |   await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await expect(notice).toBeVisible();await page.clock.runFor(4950);await expect(notice).toBeVisible();await page.clock.runFor(100);await expect(notice).toBeHidden();await expect(page.getByTestId('notice-dismiss')).toContainText('timeout');
  66 |   await page.getByLabel('通知を自動消去',{exact:true}).uncheck();await page.locator('#notice-seconds').fill('0');await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await page.clock.runFor(60000);await expect(notice).toBeVisible();
  67 |   // Axe owns asynchronous timers. Resume only while autoDismiss=OFF, then pause again before timed assertions.
  68 |   await page.clock.resume();await evidence(page,info,'ui-snackbar');await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
  69 |   await notice.getByRole('button',{name:'内容を確認',exact:true}).focus();await page.keyboard.press('Enter');await page.clock.runFor(20);await expect(notice).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByTestId('notice-dismiss')).toHaveText('単独通知: action / 操作: 1');
  70 |   await page.getByLabel('通知を自動消去',{exact:true}).check();await page.locator('#notice-seconds').fill('5');await opener.focus();await opener.press('Enter');await page.clock.runFor(20);await page.clock.runFor(2000);await notice.hover();await notice.getByRole('button',{name:'内容を確認',exact:true}).focus();await page.clock.runFor(10000);await page.mouse.move(0,0);await page.clock.runFor(10000);await expect(notice).toBeVisible();await opener.focus();await page.clock.runFor(2900);await expect(notice).toBeVisible();await page.clock.runFor(100);await expect(notice).toBeHidden();
  71 |  });
  72 | }
  73 | 
```
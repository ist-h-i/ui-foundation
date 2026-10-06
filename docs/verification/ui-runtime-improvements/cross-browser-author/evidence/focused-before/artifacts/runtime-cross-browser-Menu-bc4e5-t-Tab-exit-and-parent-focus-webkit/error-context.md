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
+         "html": "<ul _ngcontent-ng-c3533522288=\"\" role=\"menu\" class=\"ui-menu__submenu\" id=\"recursive-menu-item-file-children\" aria-labelledby=\"recursive-menu-item-file\" data-menu-parent=\"file\" style=\"left: 12px; top: 36px;\">",
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
  - link "状態表示の確認" [ref=e5]:
    - /url: /catalog/feedback
  - link "操作部品の確認" [ref=e6]:
    - /url: /catalog/actions
  - link "配置部品の操作確認" [ref=e7]:
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
          - rowgroup [ref=e50]:
            - row [ref=e51]:
              - columnheader [ref=e52]:
                - checkbox "このページをすべて選択" [ref=e53]
              - columnheader "詳細" [ref=e54]
              - columnheader [ref=e55]:
                - button "申請名で並べ替え" [ref=e56] [cursor=pointer]:
                  - generic [ref=e57]: 申請名
                - separator "申請名の列境界" [ref=e58]
              - columnheader [ref=e59]:
                - button "金額で並べ替え" [ref=e60] [cursor=pointer]:
                  - generic [ref=e61]: 金額
                - separator "金額の列境界" [ref=e62]
              - columnheader [ref=e63]:
                - button "申請日で並べ替え" [ref=e64] [cursor=pointer]:
                  - generic [ref=e65]: 申請日
                - separator "申請日の列境界" [ref=e66]
              - columnheader [ref=e67]:
                - button "状態で並べ替え" [ref=e68] [cursor=pointer]:
                  - generic [ref=e69]: 状態
                - separator "状態の列境界" [ref=e70]
              - columnheader "操作" [ref=e71]
            - row [ref=e72]:
              - cell [ref=e73]
              - cell [ref=e74]
              - cell [ref=e75]:
                - generic "申請名の列条件" [ref=e76]:
                  - group "申請名の列条件" [ref=e77]:
                    - generic [ref=e79]:
                      - generic [ref=e80]:
                        - text: 申請名の比較方法
                        - combobox "申請名の比較方法" [ref=e81]:
                          - option "含む" [selected]
                          - option "で始まる"
                          - option "等しい"
                          - option "未取得"
                      - generic [ref=e82]:
                        - text: 申請名の条件
                        - searchbox "申請名の条件" [ref=e83]
                      - button "申請名の条件 1 を解除" [ref=e84] [cursor=pointer]:
                        - generic [ref=e85]: 条件を解除
                    - button "申請名の条件を追加" [ref=e86] [cursor=pointer]
              - cell [ref=e88]:
                - generic "金額の列条件" [ref=e89]:
                  - group "金額の列条件" [ref=e90]:
                    - generic [ref=e92]:
                      - generic [ref=e93]:
                        - text: 金額の比較方法
                        - combobox "金額の比較方法" [ref=e94]:
                          - option "等しい" [selected]
                          - option "以上"
                          - option "以下"
                          - option "未取得"
                      - generic [ref=e95]:
                        - text: 金額の条件
                        - spinbutton "金額の条件" [ref=e96]
                      - button "金額の条件 1 を解除" [ref=e97] [cursor=pointer]:
                        - generic [ref=e98]: 条件を解除
                    - button "金額の条件を追加" [ref=e99] [cursor=pointer]
              - cell [ref=e101]:
                - generic "申請日の列条件" [ref=e102]:
                  - group "申請日の列条件" [ref=e103]:
                    - generic [ref=e105]:
                      - generic [ref=e106]:
                        - text: 申請日の比較方法
                        - combobox "申請日の比較方法" [ref=e107]:
                          - option "等しい" [selected]
                          - option "より後"
                          - option "より前"
                          - option "未取得"
                      - generic [ref=e108]:
                        - text: 申請日の条件
                        - textbox "申請日の条件" [ref=e109]
                      - button "申請日の条件 1 を解除" [ref=e110] [cursor=pointer]:
                        - generic [ref=e111]: 条件を解除
                    - button "申請日の条件を追加" [ref=e112] [cursor=pointer]
              - cell [ref=e114]:
                - generic "状態の列条件" [ref=e115]:
                  - group "状態の列条件" [ref=e116]:
                    - generic [ref=e118]:
                      - generic [ref=e119]:
                        - text: 状態の比較方法
                        - combobox "状態の比較方法" [ref=e120]:
                          - option "等しい" [selected]
                          - option "未取得"
                      - generic [ref=e121]:
                        - text: 状態の条件
                        - combobox "状態の条件" [ref=e122]:
                          - option "条件なし" [selected]
                          - option "下書き"
                          - option "確認中"
                          - option "承認済み"
                      - button "状態の条件 1 を解除" [ref=e123] [cursor=pointer]:
                        - generic [ref=e124]: 条件を解除
                    - button "状態の条件を追加" [ref=e125] [cursor=pointer]
              - cell [ref=e127]
          - rowgroup [ref=e128]:
            - row [ref=e129]:
              - cell [ref=e130]:
                - 'checkbox "行を選択: 備品購入" [ref=e131]'
              - cell [ref=e132]:
                - 'button "詳細: 備品購入" [ref=e133] [cursor=pointer]':
                  - generic [ref=e134]: 開く
              - cell [ref=e135]:
                - strong [ref=e136]: 備品購入
              - cell "3,000" [ref=e137]
              - cell "2026-10-01" [ref=e138]
              - cell "下書き" [ref=e139]
              - cell [ref=e140]:
                - button "確認する" [ref=e142] [cursor=pointer]
            - row [ref=e144]:
              - cell [ref=e145]:
                - 'checkbox "行を選択: 出張旅費" [ref=e146]'
              - cell [ref=e147]:
                - 'button "詳細: 出張旅費" [ref=e148] [cursor=pointer]':
                  - generic [ref=e149]: 開く
              - cell [ref=e150]:
                - strong [ref=e151]: 出張旅費
              - cell "未取得" [ref=e152]
              - cell "2026-10-02" [ref=e153]
              - cell "確認中" [ref=e154]
              - cell [ref=e155]:
                - button "確認する" [ref=e157] [cursor=pointer]
      - navigation "申請一覧のページ" [ref=e160]:
        - button "最初のページ" [disabled] [ref=e161]:
          - generic [ref=e162]: 最初
        - button "前のページ" [disabled] [ref=e163]:
          - generic [ref=e164]: 前へ
        - paragraph [ref=e165]: 1 / 3 ページ · 6 件
        - button "次のページ" [ref=e166] [cursor=pointer]:
          - generic [ref=e167]: 次へ
        - button "最後のページ" [ref=e168] [cursor=pointer]:
          - generic [ref=e169]: 最後
        - generic [ref=e170]:
          - text: 表示件数
          - combobox "表示件数" [ref=e171]:
            - option "2 件" [selected]
            - option "4 件"
            - option "8 件"
    - paragraph [ref=e172]: "選択:"
    - paragraph [ref=e173]: "操作:"
    - paragraph [ref=e174]: "状態変更: 0"
    - button "表示状態を保存" [ref=e175] [cursor=pointer]
    - button "表示状態を復元" [disabled] [ref=e177]
    - button "検索とソートを初期化" [ref=e179] [cursor=pointer]
  - region "入力部品の検証" [ref=e182]:
    - heading "申請内容を入力する" [level=2] [ref=e183]
    - button "入力を無効にする" [ref=e184] [cursor=pointer]
    - button "フォームを初期化" [ref=e186] [cursor=pointer]
    - generic [ref=e188]:
      - checkbox "非同期候補" [ref=e189]
      - text: 非同期候補
    - generic [ref=e190]:
      - checkbox "自由入力を許可" [ref=e191]
      - text: 自由入力を許可
    - generic [ref=e192]:
      - checkbox "読取り専用" [ref=e193]
      - text: 読取り専用
    - button "金額の上限を変更" [ref=e194] [cursor=pointer]
    - generic [ref=e196]:
      - generic [ref=e198]:
        - generic [ref=e199]: 件名 必須
        - generic [ref=e200]:
          - textbox "件名 必須" [ref=e201]:
            - /placeholder: ""
          - button "件名をクリア" [disabled] [ref=e202]:
            - generic [ref=e203]: クリア
        - paragraph [ref=e204]: 0 / 30 文字
        - paragraph [ref=e205]: 30文字以内で入力してください。
      - generic [ref=e207]:
        - generic [ref=e208]: 申請の説明 任意
        - textbox "申請の説明 任意" [ref=e209]:
          - /placeholder: ""
        - paragraph [ref=e210]: 0 / 200 文字
      - generic [ref=e212]:
        - generic [ref=e213]: 申請金額 必須
        - generic [ref=e214]:
          - spinbutton "申請金額 必須" [ref=e215]
          - generic [ref=e216]: 円
      - generic [ref=e218]:
        - generic [ref=e219]: 確認用パスワード 任意
        - generic [ref=e220]:
          - textbox "確認用パスワード 任意" [ref=e221]
          - button "パスワードを表示" [ref=e222] [cursor=pointer]:
            - generic [ref=e223]: 表示
        - paragraph [ref=e224]: "強度: 中程度"
        - paragraph [ref=e225]: 強度の判定は利用するアプリが提供します。
      - generic [ref=e227]:
        - generic [ref=e228]: 申請先 必須
        - combobox "申請先 必須" [ref=e229]:
          - option "選択してください" [selected]
          - group:
            - option "営業部"
            - option "総務部"
            - option "受付停止中" [disabled]
      - group "確認担当者" [ref=e231]:
        - text: 確認担当者の候補を検索
        - searchbox "確認担当者の候補を検索" [ref=e233]
        - button "表示中をすべて選択" [disabled] [ref=e234]
        - button "選択を解除" [disabled] [ref=e236]
        - group "東京" [ref=e238]:
          - generic [ref=e240]:
            - generic [ref=e241]:
              - checkbox "山田" [ref=e242]
              - text: 山田
            - generic [ref=e243]:
              - checkbox "佐藤" [ref=e244]
              - text: 佐藤
        - group "大阪" [ref=e245]:
          - generic [ref=e247]:
            - generic [ref=e248]:
              - checkbox "田中" [ref=e249]
              - text: 田中
            - generic [ref=e250]:
              - checkbox "確認不可" [disabled] [ref=e251]
              - text: 確認不可
        - status [ref=e252]: 0 件選択 / 最大 2 件
        - paragraph [ref=e253]: 最大2名まで選択できます。
      - generic [ref=e255]:
        - generic [ref=e256] [cursor=pointer]:
          - text: 入力内容を確認した
          - generic [ref=e257]: 任意
        - checkbox "入力内容を確認した 任意" [ref=e258]
      - generic [ref=e260]:
        - generic [ref=e261] [cursor=pointer]:
          - text: 更新を通知する
          - generic [ref=e262]: 任意
        - switch "更新を通知する 任意" [checked] [ref=e263]
      - generic [ref=e265]:
        - generic [ref=e266]: 担当部署 任意
        - combobox "担当部署 任意" [ref=e268]
        - button "担当部署をクリア" [disabled] [ref=e269]:
          - generic [ref=e270]: クリア
        - paragraph [ref=e271]: 候補から選択してください。
        - status
      - generic [ref=e273]:
        - generic [ref=e274]: 関連申請を検索 任意
        - generic [ref=e275]:
          - searchbox "関連申請を検索 任意" [ref=e276]
          - button "関連申請を検索をクリア" [disabled] [ref=e277]:
            - generic [ref=e278]: クリア
          - button "検索" [ref=e279] [cursor=pointer]
        - status
      - generic [ref=e281]:
        - generic [ref=e282]: 操作
        - button "申請内容を確認" [ref=e283] [cursor=pointer]
        - button "入力を戻す" [ref=e285] [cursor=pointer]
    - button "中間状態を切替" [ref=e287] [cursor=pointer]
    - button "通知設定の処理中を切替" [ref=e289] [cursor=pointer]
    - button "古い候補応答を適用" [ref=e291] [cursor=pointer]
    - button "現在の候補応答を適用" [ref=e293] [cursor=pointer]
    - button "同じ条件の古い応答を適用" [ref=e295] [cursor=pointer]
    - button "利用不可の担当者を復元" [ref=e297] [cursor=pointer]
    - group "離脱時に確定する担当者" [ref=e300]:
      - text: 離脱時に確定する担当者の候補を検索
      - searchbox "離脱時に確定する担当者の候補を検索" [ref=e302]
      - button "表示中をすべて選択" [ref=e303] [cursor=pointer]
      - button "選択を解除" [ref=e305] [cursor=pointer]
      - generic [ref=e307]:
        - button "山田の選択を解除" [ref=e308] [cursor=pointer]:
          - generic [ref=e309]: 山田 ×
        - button "佐藤の選択を解除" [ref=e310] [cursor=pointer]:
          - generic [ref=e311]: 佐藤 ×
      - group "東京" [ref=e312]:
        - generic [ref=e314]:
          - generic [ref=e315]:
            - checkbox "山田" [checked] [ref=e316]
            - text: 山田
          - generic [ref=e317]:
            - checkbox "佐藤" [checked] [ref=e318]
            - text: 佐藤
      - group "大阪" [ref=e319]:
        - generic [ref=e321]:
          - generic [ref=e322]:
            - checkbox "田中" [ref=e323]
            - text: 田中
          - generic [ref=e324]:
            - checkbox "確認不可" [disabled] [ref=e325]
            - text: 確認不可
      - status [ref=e326]: 2 件選択
    - paragraph [ref=e327]: "離脱時: [\"a\",\"b\"] / false"
    - generic [ref=e328]: "{\"title\":\"\",\"note\":\"\",\"amount\":null,\"password\":\"\",\"department\":null,\"reviewers\":[],\"consent\":false,\"notifications\":true,\"owner\":null,\"search\":\"\"}"
    - paragraph [ref=e329]: "フォーム: 要確認 / 未操作 / 未確認"
    - paragraph [ref=e330]: "検索:"
  - region "日付部品の検証" [ref=e332]:
    - heading "日付と期間を選ぶ" [level=2] [ref=e333]
    - text: 日付の入力書式
    - combobox "日付の入力書式" [ref=e334]:
      - option "ブラウザ標準" [selected]
      - option "yyyy/MM/dd"
      - option "dd/MM/yyyy"
      - option "MM/dd/yyyy"
    - generic [ref=e335]:
      - checkbox "月曜から表示" [ref=e336]
      - text: 月曜から表示
    - generic [ref=e337]:
      - checkbox "日付の初期表示を3月にする" [ref=e338]
      - text: 日付の初期表示を3月にする
    - generic [ref=e339]:
      - checkbox "日時を9:10起点の15分間隔にする" [ref=e340]
      - text: 日時を9:10起点の15分間隔にする
    - button "日付入力を無効にする" [ref=e341] [cursor=pointer]
    - button "日付を初期化" [ref=e343] [cursor=pointer]
    - generic [ref=e345]:
      - generic [ref=e347]:
        - generic [ref=e348]: 予定日 必須
        - generic [ref=e349]:
          - textbox "予定日 必須" [ref=e350]: 2026-10-05
          - button "予定日のカレンダーを開く" [ref=e351] [cursor=pointer]:
            - generic [ref=e352]: カレンダー
          - button "予定日をクリア" [ref=e353] [cursor=pointer]:
            - generic [ref=e354]: クリア
        - paragraph [ref=e355]: 2026年10月5日 月曜日
        - paragraph [ref=e356]: 10月3日は選択できません。
      - generic [ref=e358]:
        - generic [ref=e359]: 開始時刻 任意
        - generic [ref=e360]:
          - textbox "開始時刻 任意" [ref=e361]: 09:00
          - button "開始時刻をクリア" [ref=e362] [cursor=pointer]:
            - generic [ref=e363]: クリア
        - paragraph [ref=e364]: 午前9:00
      - generic [ref=e366]:
        - generic [ref=e367]: 現地日時 任意
        - generic [ref=e368]:
          - textbox "現地日時 任意" [ref=e369]
          - button "現地日時をクリア" [disabled] [ref=e370]:
            - generic [ref=e371]: クリア
        - paragraph [ref=e372]: Asia/Tokyo の現地日時
        - paragraph [ref=e373]: この値は現地日時です。Instantへの変換は利用アプリが行います。
      - generic [ref=e375]:
        - generic [ref=e376]: 対象月 任意
        - generic [ref=e377]:
          - textbox "対象月 任意" [ref=e378]: 2026-10
          - button "対象月をクリア" [ref=e379] [cursor=pointer]:
            - generic [ref=e380]: クリア
        - paragraph [ref=e381]: 2026年10月
      - generic [ref=e383]:
        - generic [ref=e384]: 対象年 任意
        - generic [ref=e385]:
          - spinbutton "対象年 任意" [ref=e386]: "2026"
          - button "対象年をクリア" [ref=e387] [cursor=pointer]:
            - generic [ref=e388]: クリア
        - paragraph [ref=e389]: 2026年
      - region "予定カレンダー" [ref=e391]:
        - generic [ref=e392]:
          - button "予定カレンダーの前の月" [ref=e393] [cursor=pointer]:
            - generic [ref=e394]: 前月
          - heading "2026年10月" [level=3] [ref=e395]
          - button "予定カレンダーの次の月" [ref=e396] [cursor=pointer]:
            - generic [ref=e397]: 次月
        - region "予定カレンダーの日付一覧" [ref=e398]:
          - grid "2026年10月" [ref=e399]:
            - rowgroup [ref=e400]:
              - row [ref=e401]:
                - columnheader "日" [ref=e402]
                - columnheader "月" [ref=e403]
                - columnheader "火" [ref=e404]
                - columnheader "水" [ref=e405]
                - columnheader "木" [ref=e406]
                - columnheader "金" [ref=e407]
                - columnheader "土" [ref=e408]
            - rowgroup [ref=e409]:
              - row [ref=e410]:
                - gridcell [ref=e411]:
                  - button "2026年9月27日 日曜日" [ref=e412]: "27"
                - gridcell [ref=e413]:
                  - button "2026年9月28日 月曜日" [ref=e414]: "28"
                - gridcell [ref=e415]:
                  - button "2026年9月29日 火曜日" [ref=e416]: "29"
                - gridcell [ref=e417]:
                  - button "2026年9月30日 水曜日" [ref=e418]: "30"
                - gridcell [ref=e419]:
                  - button "2026年10月1日 木曜日" [ref=e420]: "1"
                - gridcell [ref=e421]:
                  - button "2026年10月2日 金曜日" [ref=e422]: "2"
                - gridcell [ref=e423]:
                  - button "2026年10月3日 土曜日" [disabled] [ref=e424]: "3"
              - row [ref=e425]:
                - gridcell [ref=e426]:
                  - button "2026年10月4日 日曜日" [ref=e427]: "4"
                - gridcell [selected] [ref=e428]:
                  - button "2026年10月5日 月曜日、予定あり" [ref=e429]:
                    - text: "5"
                    - generic [ref=e430]: 予定
                - gridcell [ref=e431]:
                  - button "2026年10月6日 火曜日" [ref=e432]: "6"
                - gridcell [ref=e433]:
                  - button "2026年10月7日 水曜日" [ref=e434]: "7"
                - gridcell [ref=e435]:
                  - button "2026年10月8日 木曜日" [ref=e436]: "8"
                - gridcell [ref=e437]:
                  - button "2026年10月9日 金曜日" [ref=e438]: "9"
                - gridcell [ref=e439]:
                  - button "2026年10月10日 土曜日" [ref=e440]: "10"
              - row [ref=e441]:
                - gridcell [ref=e442]:
                  - button "2026年10月11日 日曜日" [ref=e443]: "11"
                - gridcell [ref=e444]:
                  - button "2026年10月12日 月曜日" [ref=e445]: "12"
                - gridcell [ref=e446]:
                  - button "2026年10月13日 火曜日" [ref=e447]: "13"
                - gridcell [ref=e448]:
                  - button "2026年10月14日 水曜日" [ref=e449]: "14"
                - gridcell [ref=e450]:
                  - button "2026年10月15日 木曜日" [ref=e451]: "15"
                - gridcell [ref=e452]:
                  - button "2026年10月16日 金曜日" [ref=e453]: "16"
                - gridcell [ref=e454]:
                  - button "2026年10月17日 土曜日" [ref=e455]: "17"
              - row [ref=e456]:
                - gridcell [ref=e457]:
                  - button "2026年10月18日 日曜日" [ref=e458]: "18"
                - gridcell [ref=e459]:
                  - button "2026年10月19日 月曜日" [ref=e460]: "19"
                - gridcell [ref=e461]:
                  - button "2026年10月20日 火曜日" [ref=e462]: "20"
                - gridcell [ref=e463]:
                  - button "2026年10月21日 水曜日" [ref=e464]: "21"
                - gridcell [ref=e465]:
                  - button "2026年10月22日 木曜日" [ref=e466]: "22"
                - gridcell [ref=e467]:
                  - button "2026年10月23日 金曜日" [ref=e468]: "23"
                - gridcell [ref=e469]:
                  - button "2026年10月24日 土曜日" [ref=e470]: "24"
              - row [ref=e471]:
                - gridcell [ref=e472]:
                  - button "2026年10月25日 日曜日" [ref=e473]: "25"
                - gridcell [ref=e474]:
                  - button "2026年10月26日 月曜日" [ref=e475]: "26"
                - gridcell [ref=e476]:
                  - button "2026年10月27日 火曜日" [ref=e477]: "27"
                - gridcell [ref=e478]:
                  - button "2026年10月28日 水曜日" [ref=e479]: "28"
                - gridcell [ref=e480]:
                  - button "2026年10月29日 木曜日" [ref=e481]: "29"
                - gridcell [ref=e482]:
                  - button "2026年10月30日 金曜日" [ref=e483]: "30"
                - gridcell [ref=e484]:
                  - button "2026年10月31日 土曜日" [ref=e485]: "31"
              - row [ref=e486]:
                - gridcell [ref=e487]:
                  - button "2026年11月1日 日曜日" [ref=e488]: "1"
                - gridcell [ref=e489]:
                  - button "2026年11月2日 月曜日" [ref=e490]: "2"
                - gridcell [ref=e491]:
                  - button "2026年11月3日 火曜日" [ref=e492]: "3"
                - gridcell [ref=e493]:
                  - button "2026年11月4日 水曜日" [ref=e494]: "4"
                - gridcell [ref=e495]:
                  - button "2026年11月5日 木曜日" [ref=e496]: "5"
                - gridcell [ref=e497]:
                  - button "2026年11月6日 金曜日" [ref=e498]: "6"
                - gridcell [ref=e499]:
                  - button "2026年11月7日 土曜日" [ref=e500]: "7"
        - paragraph [ref=e501]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
      - group "対象期間" [ref=e503]:
        - generic [ref=e505]:
          - generic [ref=e507]:
            - generic [ref=e508]: 対象期間の開始日 任意
            - generic [ref=e509]:
              - textbox "対象期間の開始日 任意" [ref=e510]
              - button "対象期間の開始日のカレンダーを開く" [ref=e511] [cursor=pointer]:
                - generic [ref=e512]: カレンダー
              - button "対象期間の開始日をクリア" [disabled] [ref=e513]:
                - generic [ref=e514]: クリア
            - paragraph
          - generic [ref=e516]:
            - generic [ref=e517]: 対象期間の終了日 任意
            - generic [ref=e518]:
              - textbox "対象期間の終了日 任意" [ref=e519]
              - button "対象期間の終了日のカレンダーを開く" [ref=e520] [cursor=pointer]:
                - generic [ref=e521]: カレンダー
              - button "対象期間の終了日をクリア" [disabled] [ref=e522]:
                - generic [ref=e523]: クリア
            - paragraph
        - generic [ref=e524]:
          - button "翌週の平日" [ref=e525] [cursor=pointer]
          - button "選択不可日を含む期間" [disabled] [ref=e527]
          - button "期間をクリア" [ref=e529] [cursor=pointer]
        - generic [ref=e531]:
          - button "開始日を選ぶ" [pressed] [ref=e532] [cursor=pointer]
          - button "終了日を選ぶ" [ref=e534] [cursor=pointer]
        - generic [ref=e536]:
          - region "対象期間の1か月目" [ref=e538]:
            - generic [ref=e539]:
              - button "対象期間の1か月目の前の月" [ref=e540] [cursor=pointer]:
                - generic [ref=e541]: 前月
              - heading "2026年10月" [level=3] [ref=e542]
              - button "対象期間の1か月目の次の月" [ref=e543] [cursor=pointer]:
                - generic [ref=e544]: 次月
            - region "対象期間の1か月目の日付一覧" [ref=e545]:
              - grid "2026年10月" [ref=e546]:
                - rowgroup [ref=e547]:
                  - row [ref=e548]:
                    - columnheader "日" [ref=e549]
                    - columnheader "月" [ref=e550]
                    - columnheader "火" [ref=e551]
                    - columnheader "水" [ref=e552]
                    - columnheader "木" [ref=e553]
                    - columnheader "金" [ref=e554]
                    - columnheader "土" [ref=e555]
                - rowgroup [ref=e556]:
                  - row [ref=e557]:
                    - gridcell [ref=e558]:
                      - button "2026年9月27日 日曜日" [ref=e559]: "27"
                    - gridcell [ref=e560]:
                      - button "2026年9月28日 月曜日" [ref=e561]: "28"
                    - gridcell [ref=e562]:
                      - button "2026年9月29日 火曜日" [ref=e563]: "29"
                    - gridcell [ref=e564]:
                      - button "2026年9月30日 水曜日" [ref=e565]: "30"
                    - gridcell [ref=e566]:
                      - button "2026年10月1日 木曜日" [ref=e567]: "1"
                    - gridcell [ref=e568]:
                      - button "2026年10月2日 金曜日" [ref=e569]: "2"
                    - gridcell [ref=e570]:
                      - button "2026年10月3日 土曜日" [disabled] [ref=e571]: "3"
                  - row [ref=e572]:
                    - gridcell [ref=e573]:
                      - button "2026年10月4日 日曜日" [ref=e574]: "4"
                    - gridcell [ref=e575]:
                      - button "2026年10月5日 月曜日" [ref=e576]: "5"
                    - gridcell [ref=e577]:
                      - button "2026年10月6日 火曜日" [ref=e578]: "6"
                    - gridcell [ref=e579]:
                      - button "2026年10月7日 水曜日" [ref=e580]: "7"
                    - gridcell [ref=e581]:
                      - button "2026年10月8日 木曜日" [ref=e582]: "8"
                    - gridcell [ref=e583]:
                      - button "2026年10月9日 金曜日" [ref=e584]: "9"
                    - gridcell [ref=e585]:
                      - button "2026年10月10日 土曜日" [ref=e586]: "10"
                  - row [ref=e587]:
                    - gridcell [ref=e588]:
                      - button "2026年10月11日 日曜日" [ref=e589]: "11"
                    - gridcell [ref=e590]:
                      - button "2026年10月12日 月曜日" [ref=e591]: "12"
                    - gridcell [ref=e592]:
                      - button "2026年10月13日 火曜日" [ref=e593]: "13"
                    - gridcell [ref=e594]:
                      - button "2026年10月14日 水曜日" [ref=e595]: "14"
                    - gridcell [ref=e596]:
                      - button "2026年10月15日 木曜日" [ref=e597]: "15"
                    - gridcell [ref=e598]:
                      - button "2026年10月16日 金曜日" [ref=e599]: "16"
                    - gridcell [ref=e600]:
                      - button "2026年10月17日 土曜日" [ref=e601]: "17"
                  - row [ref=e602]:
                    - gridcell [ref=e603]:
                      - button "2026年10月18日 日曜日" [ref=e604]: "18"
                    - gridcell [ref=e605]:
                      - button "2026年10月19日 月曜日" [ref=e606]: "19"
                    - gridcell [ref=e607]:
                      - button "2026年10月20日 火曜日" [ref=e608]: "20"
                    - gridcell [ref=e609]:
                      - button "2026年10月21日 水曜日" [ref=e610]: "21"
                    - gridcell [ref=e611]:
                      - button "2026年10月22日 木曜日" [ref=e612]: "22"
                    - gridcell [ref=e613]:
                      - button "2026年10月23日 金曜日" [ref=e614]: "23"
                    - gridcell [ref=e615]:
                      - button "2026年10月24日 土曜日" [ref=e616]: "24"
                  - row [ref=e617]:
                    - gridcell [ref=e618]:
                      - button "2026年10月25日 日曜日" [ref=e619]: "25"
                    - gridcell [ref=e620]:
                      - button "2026年10月26日 月曜日" [ref=e621]: "26"
                    - gridcell [ref=e622]:
                      - button "2026年10月27日 火曜日" [ref=e623]: "27"
                    - gridcell [ref=e624]:
                      - button "2026年10月28日 水曜日" [ref=e625]: "28"
                    - gridcell [ref=e626]:
                      - button "2026年10月29日 木曜日" [ref=e627]: "29"
                    - gridcell [ref=e628]:
                      - button "2026年10月30日 金曜日" [ref=e629]: "30"
                    - gridcell [ref=e630]:
                      - button "2026年10月31日 土曜日" [ref=e631]: "31"
                  - row [ref=e632]:
                    - gridcell [ref=e633]:
                      - button "2026年11月1日 日曜日" [ref=e634]: "1"
                    - gridcell [ref=e635]:
                      - button "2026年11月2日 月曜日" [ref=e636]: "2"
                    - gridcell [ref=e637]:
                      - button "2026年11月3日 火曜日" [ref=e638]: "3"
                    - gridcell [ref=e639]:
                      - button "2026年11月4日 水曜日" [ref=e640]: "4"
                    - gridcell [ref=e641]:
                      - button "2026年11月5日 木曜日" [ref=e642]: "5"
                    - gridcell [ref=e643]:
                      - button "2026年11月6日 金曜日" [ref=e644]: "6"
                    - gridcell [ref=e645]:
                      - button "2026年11月7日 土曜日" [ref=e646]: "7"
            - paragraph [ref=e647]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
          - region "対象期間の2か月目" [ref=e649]:
            - generic [ref=e650]:
              - button "対象期間の2か月目の前の月" [ref=e651] [cursor=pointer]:
                - generic [ref=e652]: 前月
              - heading "2026年11月" [level=3] [ref=e653]
              - button "対象期間の2か月目の次の月" [ref=e654] [cursor=pointer]:
                - generic [ref=e655]: 次月
            - region "対象期間の2か月目の日付一覧" [ref=e656]:
              - grid "2026年11月" [ref=e657]:
                - rowgroup [ref=e658]:
                  - row [ref=e659]:
                    - columnheader "日" [ref=e660]
                    - columnheader "月" [ref=e661]
                    - columnheader "火" [ref=e662]
                    - columnheader "水" [ref=e663]
                    - columnheader "木" [ref=e664]
                    - columnheader "金" [ref=e665]
                    - columnheader "土" [ref=e666]
                - rowgroup [ref=e667]:
                  - row [ref=e668]:
                    - gridcell [ref=e669]:
                      - button "2026年11月1日 日曜日" [ref=e670]: "1"
                    - gridcell [ref=e671]:
                      - button "2026年11月2日 月曜日" [ref=e672]: "2"
                    - gridcell [ref=e673]:
                      - button "2026年11月3日 火曜日" [ref=e674]: "3"
                    - gridcell [ref=e675]:
                      - button "2026年11月4日 水曜日" [ref=e676]: "4"
                    - gridcell [ref=e677]:
                      - button "2026年11月5日 木曜日" [ref=e678]: "5"
                    - gridcell [ref=e679]:
                      - button "2026年11月6日 金曜日" [ref=e680]: "6"
                    - gridcell [ref=e681]:
                      - button "2026年11月7日 土曜日" [ref=e682]: "7"
                  - row [ref=e683]:
                    - gridcell [ref=e684]:
                      - button "2026年11月8日 日曜日" [ref=e685]: "8"
                    - gridcell [ref=e686]:
                      - button "2026年11月9日 月曜日" [ref=e687]: "9"
                    - gridcell [ref=e688]:
                      - button "2026年11月10日 火曜日" [ref=e689]: "10"
                    - gridcell [ref=e690]:
                      - button "2026年11月11日 水曜日" [ref=e691]: "11"
                    - gridcell [ref=e692]:
                      - button "2026年11月12日 木曜日" [ref=e693]: "12"
                    - gridcell [ref=e694]:
                      - button "2026年11月13日 金曜日" [ref=e695]: "13"
                    - gridcell [ref=e696]:
                      - button "2026年11月14日 土曜日" [ref=e697]: "14"
                  - row [ref=e698]:
                    - gridcell [ref=e699]:
                      - button "2026年11月15日 日曜日" [ref=e700]: "15"
                    - gridcell [ref=e701]:
                      - button "2026年11月16日 月曜日" [ref=e702]: "16"
                    - gridcell [ref=e703]:
                      - button "2026年11月17日 火曜日" [ref=e704]: "17"
                    - gridcell [ref=e705]:
                      - button "2026年11月18日 水曜日" [ref=e706]: "18"
                    - gridcell [ref=e707]:
                      - button "2026年11月19日 木曜日" [ref=e708]: "19"
                    - gridcell [ref=e709]:
                      - button "2026年11月20日 金曜日" [ref=e710]: "20"
                    - gridcell [ref=e711]:
                      - button "2026年11月21日 土曜日" [ref=e712]: "21"
                  - row [ref=e713]:
                    - gridcell [ref=e714]:
                      - button "2026年11月22日 日曜日" [ref=e715]: "22"
                    - gridcell [ref=e716]:
                      - button "2026年11月23日 月曜日" [ref=e717]: "23"
                    - gridcell [ref=e718]:
                      - button "2026年11月24日 火曜日" [ref=e719]: "24"
                    - gridcell [ref=e720]:
                      - button "2026年11月25日 水曜日" [ref=e721]: "25"
                    - gridcell [ref=e722]:
                      - button "2026年11月26日 木曜日" [ref=e723]: "26"
                    - gridcell [ref=e724]:
                      - button "2026年11月27日 金曜日" [ref=e725]: "27"
                    - gridcell [ref=e726]:
                      - button "2026年11月28日 土曜日" [ref=e727]: "28"
                  - row [ref=e728]:
                    - gridcell [ref=e729]:
                      - button "2026年11月29日 日曜日" [ref=e730]: "29"
                    - gridcell [ref=e731]:
                      - button "2026年11月30日 月曜日" [ref=e732]: "30"
                    - gridcell [ref=e733]:
                      - button "2026年12月1日 火曜日" [ref=e734]: "1"
                    - gridcell [ref=e735]:
                      - button "2026年12月2日 水曜日" [ref=e736]: "2"
                    - gridcell [ref=e737]:
                      - button "2026年12月3日 木曜日" [ref=e738]: "3"
                    - gridcell [ref=e739]:
                      - button "2026年12月4日 金曜日" [ref=e740]: "4"
                    - gridcell [ref=e741]:
                      - button "2026年12月5日 土曜日" [ref=e742]: "5"
                  - row [ref=e743]:
                    - gridcell [ref=e744]:
                      - button "2026年12月6日 日曜日" [ref=e745]: "6"
                    - gridcell [ref=e746]:
                      - button "2026年12月7日 月曜日" [ref=e747]: "7"
                    - gridcell [ref=e748]:
                      - button "2026年12月8日 火曜日" [ref=e749]: "8"
                    - gridcell [ref=e750]:
                      - button "2026年12月9日 水曜日" [ref=e751]: "9"
                    - gridcell [ref=e752]:
                      - button "2026年12月10日 木曜日" [ref=e753]: "10"
                    - gridcell [ref=e754]:
                      - button "2026年12月11日 金曜日" [ref=e755]: "11"
                    - gridcell [ref=e756]:
                      - button "2026年12月12日 土曜日" [ref=e757]: "12"
            - paragraph [ref=e758]: 矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。
    - button "年の月一覧を切替" [ref=e759] [cursor=pointer]
    - generic [ref=e761]:
      - checkbox "端末日付の既定値を表示" [ref=e762]
      - text: 端末日付の既定値を表示
    - generic [ref=e763]: "{\"date\":\"2026-10-05\",\"time\":\"09:00\",\"datetime\":null,\"month\":\"2026-10\",\"year\":\"2026\",\"calendar\":\"2026-10-05\",\"range\":{\"start\":null,\"end\":null}}"
    - paragraph [ref=e764]: "日付: 有効"
  - region "グリッドとアイコンの検証" [ref=e766]:
    - heading "申請をカード一覧で確認する" [level=2] [ref=e767]
    - text: グリッド列数
    - combobox "グリッド列数" [ref=e768]:
      - option "領域に合わせる" [selected]
      - option "1"
      - option "3"
    - text: グリッド選択
    - combobox "グリッド選択" [ref=e769]:
      - option "なし"
      - option "単一"
      - option "複数" [selected]
    - generic [ref=e770]:
      - checkbox "狭い間隔" [ref=e771]
      - text: 狭い間隔
    - generic [ref=e772]:
      - checkbox "空一覧" [ref=e773]
      - text: 空一覧
    - generic [ref=e774]:
      - checkbox "一覧の処理中" [ref=e775]
      - text: 一覧の処理中
    - region "申請カード" [ref=e777]:
      - generic [ref=e778]:
        - button "一覧をすべて選択" [ref=e779] [cursor=pointer]
        - button "一覧の選択を解除" [disabled] [ref=e781]
      - list [ref=e783]:
        - listitem [ref=e784]:
          - generic [ref=e785]:
            - checkbox "備品購入を選択" [ref=e786]
            - text: 備品購入を選択
          - heading "備品購入" [level=3] [ref=e787]
          - paragraph [ref=e792]: 下書き
          - paragraph
          - generic [ref=e793]:
            - text: "追記: 備品購入"
            - 'textbox "追記: 備品購入" [ref=e794]': 保持する入力
          - button "申請を開く" [ref=e795] [cursor=pointer]
        - listitem [ref=e797]:
          - generic [ref=e798]:
            - checkbox "出張旅費を選択" [ref=e799]
            - text: 出張旅費を選択
          - heading "出張旅費" [level=3] [ref=e800]
          - paragraph [ref=e805]: 確認中
          - paragraph
          - generic [ref=e806]:
            - text: "追記: 出張旅費"
            - 'textbox "追記: 出張旅費" [ref=e807]': 保持する入力
          - button "申請を開く" [ref=e808] [cursor=pointer]
        - listitem [ref=e810]:
          - generic [ref=e811]:
            - checkbox "確認済みの申請を選択" [disabled] [ref=e812]
            - text: 確認済みの申請を選択
          - heading "確認済みの申請" [level=3] [ref=e813]
          - paragraph [ref=e818]: 承認済み
          - paragraph
          - generic [ref=e819]:
            - text: "追記: 確認済みの申請"
            - 'textbox "追記: 確認済みの申請" [ref=e820]': 保持する入力
          - button "申請を開く" [ref=e821] [cursor=pointer]
    - paragraph [ref=e823]: "選択:"
    - paragraph [ref=e824]: "申請:"
    - generic [ref=e825]:
      - img "確認済み" [ref=e827]
      - img "確認が必要" [ref=e831]
      - button "申請を追加" [ref=e837] [cursor=pointer]
  - region "Card・Menu・Dialog・通知の検証" [ref=e842]:
    - heading "領域と浮動表示の操作確認" [level=2] [ref=e843]
    - generic [ref=e844]:
      - generic [ref=e845]:
        - generic [ref=e846]:
          - checkbox "Card見出し" [checked] [ref=e847]
          - text: Card見出し
        - generic [ref=e848]:
          - checkbox "Card本文" [checked] [ref=e849]
          - text: Card本文
        - generic [ref=e850]:
          - checkbox "Card画像" [checked] [ref=e851]
          - text: Card画像
        - generic [ref=e852]:
          - checkbox "Cardフッター" [checked] [ref=e853]
          - text: Cardフッター
        - generic [ref=e854]:
          - checkbox "Card操作" [checked] [ref=e855]
          - text: Card操作
        - generic [ref=e856]:
          - checkbox "Card取得中" [ref=e857]
          - text: Card取得中
        - generic [ref=e858]:
          - checkbox "Card横向き" [ref=e859]
          - text: Card横向き
      - generic "申請内容" [ref=e860]:
        - article "編集用Card" [ref=e861]:
          - generic [ref=e863]:
            - strong [ref=e864]: "見出しテンプレート: 申請内容"
            - 'button "折り畳む: 申請内容" [expanded] [ref=e865] [cursor=pointer]'
          - generic [ref=e867]:
            - img "申請の図" [ref=e869]: 画像テンプレート
            - generic [ref=e870]:
              - generic [ref=e871]:
                - text: Card内メモ
                - textbox "Card内メモ" [ref=e872]: 保持する入力
              - button "本文を隠す" [ref=e873] [cursor=pointer]
              - button "本文から折り畳む" [ref=e875] [cursor=pointer]
            - paragraph [ref=e878]: フッターテンプレート
            - button "Cardの操作を実行" [ref=e880] [cursor=pointer]
          - status
      - generic "投影領域の例" [ref=e882]:
        - article "投影領域の例" [ref=e883]:
          - generic [ref=e885]:
            - generic [ref=e886]: 投影見出し
            - heading "投影領域の例" [level=2] [ref=e887]
          - generic [ref=e888]:
            - generic [ref=e889]: 投影メディア
            - generic [ref=e891]: 投影本文
            - generic [ref=e893]: 投影フッター
            - button "投影操作" [ref=e897] [cursor=pointer]
          - status
      - paragraph [ref=e899]: "Card操作: 0"
      - generic [ref=e900]:
        - generic [ref=e901]:
          - checkbox "選択後Menuを閉じる" [checked] [ref=e902]
          - text: 選択後Menuを閉じる
        - generic [ref=e903]:
          - checkbox "Menu無効" [ref=e904]
          - text: Menu無効
      - generic [ref=e905]:
        - button "申請の操作" [expanded] [ref=e906] [cursor=pointer]
        - menu "申請の操作" [ref=e909]:
          - menuitem "ファイル" [expanded] [ref=e910] [cursor=pointer]:
            - generic [aria-hidden] [ref=e915]: ›
          - menu "ファイル" [ref=e916]:
            - menuitem "新規" [expanded] [ref=e917] [cursor=pointer]:
              - generic [aria-hidden] [ref=e919]: ›
            - menu "新規" [ref=e920]:
              - menuitem "申請を作成" [active] [ref=e921] [cursor=pointer]
              - menuitem "テンプレートから作成" [ref=e923] [cursor=pointer]
              - menuitem "親メニューに戻る" [ref=e925] [cursor=pointer]
            - menuitem "保存" [disabled] [ref=e926]
            - menuitem "ファイルを隠す" [ref=e928] [cursor=pointer]
            - separator [ref=e930]
            - group "表示" [ref=e931]:
              - text: 表示
              - menuitemcheckbox "Hints 補助説明" [ref=e932] [cursor=pointer]:
                - generic [aria-hidden] [ref=e933]: ○
              - menuitemradio "簡潔" [checked] [ref=e935] [cursor=pointer]:
                - generic [aria-hidden] [ref=e936]: ✓
              - menuitemradio "Details 詳細" [ref=e938] [cursor=pointer]:
                - generic [aria-hidden] [ref=e939]: ○
            - menuitem "親メニューに戻る" [ref=e941] [cursor=pointer]
          - menuitem "出力" [ref=e942] [cursor=pointer]
          - menuitem "実行不可" [disabled] [ref=e944]
      - button "Menuの次の操作" [ref=e946] [cursor=pointer]
      - button "hoverメニュー" [ref=e949] [cursor=pointer]
      - generic [ref=e951]:
        - button "対象の操作" [ref=e952] [cursor=pointer]
        - generic "対象の操作の対象" [ref=e954]: 右クリック・長押し・Shift+F10の対象
      - button "別scopeの操作" [ref=e956] [cursor=pointer]
      - paragraph [ref=e958]: "Menu選択:"
      - generic [ref=e959]:
        - generic [ref=e960]:
          - checkbox "Modal" [checked] [ref=e961]
          - text: Modal
        - generic [ref=e962]:
          - checkbox "外側クリック終了" [ref=e963]
          - text: 外側クリック終了
        - generic [ref=e964]:
          - checkbox "Escape終了" [checked] [ref=e965]
          - text: Escape終了
        - generic [ref=e966]:
          - checkbox "未保存の終了を保留" [ref=e967]
          - text: 未保存の終了を保留
        - generic [ref=e968]: Dialog位置
        - combobox "Dialog位置" [ref=e969]:
          - option "中央" [selected]
          - option "上"
          - option "下"
          - option "開始側"
          - option "終端側"
      - button "編集Dialogを開く" [ref=e970] [cursor=pointer]
      - button "Dialogを連続で開く" [ref=e972] [cursor=pointer]
      - paragraph [ref=e974]: "終了保留: 0"
      - paragraph [ref=e975]: "終了: /"
    - button "独立scopeの起動" [ref=e977] [cursor=pointer]
    - generic [ref=e979]:
      - generic [ref=e980]:
        - checkbox "通知を自動消去" [checked] [ref=e981]
        - text: 通知を自動消去
      - generic [ref=e982]: 通知位置
      - combobox "通知位置" [ref=e983]:
        - option "top-start" [selected]
        - option "top-center"
        - option "top-end"
        - option "bottom-start"
        - option "bottom-center"
        - option "bottom-end"
      - generic [ref=e984]: 通知の秒数
      - spinbutton "通知の秒数" [ref=e985]: "5"
      - button "単独通知を表示" [ref=e986] [cursor=pointer]
      - button "長い通知を表示" [ref=e988] [cursor=pointer]
    - paragraph [ref=e990]: "単独通知: / 操作: 0"
    - generic [ref=e991]:
      - generic [ref=e992]: 同時表示数
      - combobox "同時表示数" [ref=e993]:
        - option "1" [selected]
        - option "2"
      - generic [ref=e994]: 重複処理
      - combobox "重複処理" [ref=e995]:
        - option "無視" [selected]
        - option "置換"
        - option "すべて"
      - button "キューに通知を追加" [ref=e996] [cursor=pointer]
      - button "同じ通知を追加" [ref=e998] [cursor=pointer]
      - button "内容を更新して置換" [ref=e1000] [cursor=pointer]
      - button "通知をすべて閉じる" [ref=e1002] [cursor=pointer]
    - paragraph [ref=e1004]: "通知総数: 0"
    - paragraph [ref=e1005]: "ホスト終了:"
    - region "Dialog各種の検証" [ref=e1007]:
      - heading "確認・入力・動的Dialog" [level=2] [ref=e1008]
      - button "確認Dialogを開く" [ref=e1009] [cursor=pointer]
      - button "重要通知を開く" [ref=e1011] [cursor=pointer]
      - generic [ref=e1013]:
        - checkbox "保存を失敗させる" [checked] [ref=e1014]
        - text: 保存を失敗させる
      - button "FormDialogを開く" [ref=e1015] [cursor=pointer]
      - button "動的入力名を更新" [ref=e1017] [cursor=pointer]
      - button "DynamicDialogを開く" [ref=e1019] [cursor=pointer]
      - paragraph [ref=e1021]: "Dialog結果: /"
      - paragraph [ref=e1022]: "動的結果:"
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
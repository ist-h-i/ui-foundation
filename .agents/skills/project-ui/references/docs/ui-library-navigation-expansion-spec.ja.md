# ナビゲーション9要求

対象はnavigation-01..06/10..12。既存のnavigation-07..09（再帰Menu/Dropdown/Context）は回帰対象で、全181要求の原文/制御項目を保持する。

| 要求 | 実装する契約 | 検証の観測 |
| --- | --- | --- |
| Navigation/NavigationBar | native nav/list/link、移動先と現在地、縦横、Icon投影、狭幅のwrap/局所scroll | href/aria-current、両方向と320px/200%、全文字とkeyboard focus、native遷移 |
| SideNav/NavigationRail | 再帰的なnative list/details、展開状態、全体の折畳みとsemantic幅、現在地 | 多階層の開閉、親summaryへの復帰、外部collapse/項目差替え、自前focusだけを保持、RTL/railの説明 |
| BottomNavigation/Dock | 項目/選択、ラベルとアイコン、上下左右の位置/固定、完全なaccessible name | nativeリンク、外部選択、ラベル非表示でも名前保持、200%/固定の局所scroll |
| Breadcrumb | native nav/ol、階層と区切り、長い中間階層の折畳み | 全階層のリンクへ到達、現在地、summary/外部変更のfocus、狭幅で横overflowなし |
| Tabs | manual activation、縦横/RTL、tablistの局所scroll、個別disabled、閉じる/並べ替え意思と実アプリ反映 | Arrow/Home/End/Enter/Space、Delete/移動操作、最後のタブと外部除去、入力を保持した並べ替え/選択、入れ子所有、rapid keys |
| AnchorNavigation | 実targetへのnativeページ内href、位置追跡、固定/sticky、移動余白とreduced motion | 実scroll/hash/現在位置、scroll root、対象喪失/破棄/属性復元、320px/200%、target focus |
| Menubar | 常時見える横方向のroot menu、再帰Menu、check/radio/command、rovingとmenu間の移動 | rootと入れ子のArrow/Home/End/Enter/Space/Tab/Escape、disabledとtypeahead、parent/next focus、rapid keys、RTL |
| MegaMenu | 複数列とgroup/headings/description、native navigationと明示開閉、幅に応じた列 | Tabで全リンクへ到達、狭幅で列を折返し、modal scope、外側/Escape/対象喪失、nativehref |
| CommandPalette | native modal Dialog、検索/グループ/keyboard shortcut/履歴、選択の意思とアプリ結果 | 入力の保持、候補上下/Enter/IME、履歴の実反映、実shortcut、busy/error/retry、閉じ戻る、外部状態、320px/200% |

アプリがルーティング、未保存判断、tabデータの除去/並べ替え、commandの実行/保存結果、履歴の永続化を所有する。ライブラリは閉じる/順序/選択の意図を返し、fixtureと別生成consumerではアプリが実データへ反映して入力保持を観測する。backend成功や実Undoを先取りしない。

サイトの階層リンクはnative nav/list/disclosureを使い、Menubarの複合widgetだけAPG menu操作を持つ。Tabsはmanual activationを維持して方向/disabled/close/reorderを追加する。名前/ラベルや新機能だけを登録し、汎用wrapper/未実装stub/静的カタログをverifiedへ数えない。

生成元、public exports、設定正本/semantic roles/profile、Skill、/catalog/navigationデモ、モデル/strictTemplates/AOT、生成後の別production consumer、操作/axe/描画を一貫して更新する。各profileの狭幅/200%/RTL/reduced motion、動的変更、focus/入力、rapid keysを実ブラウザで確認し、固定HEAD全npm testとfresh-context独立reviewを分けて記録する。

参照一次資料: [APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)、[APG Menu/Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)、[APG disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)、[APG Breadcrumb](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)。実screen reader/browser/touchと利用者理解は別の検証であり、pattern参照だけで認証と扱わない。

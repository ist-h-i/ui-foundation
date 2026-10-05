---
name: project-ui
description: Design and implement UI for this project using its persona profiles, two-layer design tokens, generated Angular components and Tailwind theme. Use for UI changes or explicit UI configuration work.
---

# プロジェクトのUI開発

## 最初に読む

生成先では隣の`project-context.md`を読み、利用者の目的、利用状況、制約、default_profile、各profileのguidanceとトークン対応を確認する。このSkillの生成元を変更している場合は`examples/ui.config.example.yaml`と`docs/design.md`を読む。設定は判断材料であり、自然言語を勝手に機械設定へ確定しない。

## 設計と設定

1. 今回の利用者、達成したい判断・操作、端末と利用状況、必要情報を確認する。年齢や役割だけから書体・情報量・操作方法を決めない。
2. 既存の画面と部品を読み、採用するプロファイルを明示する。初期設定で固定するか、利用者が切り替えるかも決める。
3. 必要ならプリミティブの配色/文字/余白の体系と、用途別セマンティックへの対応を提案する。新しい値や体系も作れる。同じ具体値でも役割が違えば意味を分ける。
4. プレビューで目的適合性を比較し、採用する設定をYAMLの正本へ反映する。通常/hover/focus/無効/処理中/エラー/欠損の組合せを確認する。コントラストの数値合格だけで採用を決めない。
5. sync --dry-runで差分を確認し、syncで生成する。生成物を手編集せず、機能コードを生成専用ディレクトリへ置かない。

## 画面実装

生成されたangular部品と、同じセマンティックに接続したTailwind utilityを使う。具体的な色/余白の値やプリミティブを部品・画面から直接参照しない。必要な新しい役割は設定と部品契約へ追加する。

output内のtailwind.cssで生成したテーマを確認する。色はbg-color-action／text-color-on-action、書体はfont-family-body、文字サイズはtext-size-body、太さはfont-weight-bodyのように用途を区別する。余白はpx-control-x、角丸はrounded-control等の役割名を使う。

guidanceと機能の目的から情報階層、構成、補助説明、操作経路を設計する。全部の画面を同じレイアウトへ合わせない。YAMLにDOMや全業務仕様を二重管理しない。

プロファイルは有効なIDを選びdata-ui-profileで適用する。切替時にフォームや取得・実行状態を作り直さない。部品はnativeの意味、見えるfocus、処理中の再操作防止、入力保持、失敗と復旧を保つ。HTTP、業務上の安全範囲、実データUndo、更新重複防止は利用アプリが所有する。

## 検証

checkで設定と生成物を照合し、型検査/ビルド/対象操作試験を実行する。リポジトリではnpm run ui:sync / ui:check / typecheck / test:uiを使う。利用アプリでは保存されたプロジェクトコマンド、またはcheckoutのsrc/cli.tsをtsxで実行する。checkは全ソースのAST逸脱やUX全体を確認しない。

各採用profileで狭い画面、文字拡大、キーボード、動きの低減、正常/処理中/エラー/欠損/復旧を確認する。描画・操作・自動アクセシビリティ・意味レビュー・利用者確認を分けて報告する。未実行を合格扱いしない。詳細な判断例は必要時に[参照](references/token-design.md)を読む。

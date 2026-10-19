# 追加UIエンジンの依存・配布資料

追加した直接依存は27件（生成部品のruntime engine25件、型宣言`@types/qrcode`1件、fixtureの独立decoder`@zxing/library`1件）。`package.json`ではdevDependenciesでも、生成テンプレートで利用するruntime engineは利用アプリへ配布される。ロックとinstalledの名前・版、依存/optional/peerの解決を確認し、closure115 instances、114種類の名前/版、186 edgesを記録した。必須依存欠落と版/依存メタデータの不一致は0件。未導入のプラットフォーム別optional依存はこのinstalled closureへ混ぜない。

`assets/third-party/THIRD-PARTY-NOTICES.txt`は126件の原ライセンス/notice、SheetJS SSFとSteven Levithanの内包コード帰属を保持する。完全に同じ原文は1回にまとめ、監査台帳に各instanceの原文SHA256と結合ファイル内byte位置を保存した。原文SHAを確認せずpackageのlicenseフィールドだけでライセンスを確定しない。

- `maplibre-gl@6.12.0`は主部分がBSD-3-Clause、同じ原LICENSEにMapbox/D3のBSDとglfx.jsのMITがある。MapLibre全体をMITとは記さない。
- `@maplibre/maplibre-gl-style-spec@26.4.4`の原LICENSEもBSD-3-ClauseとMITを含む。`@maplibre/geojson-vt@6.1.2`の原LICENSEはMIT。これらのpackage metadataにあるISCとは分けて記録する。
- `echarts@6.1.0`の親LICENSE/NOTICEはApache-2.0、`licenses/LICENSE-d3`は別のBSD-3-Clause。
- `fast-formula-parser@1.0.19`の親MITに加え、runtimeに内包する`ssf/ssf.js`はSheetJS SSF0.10.3由来のApache-2.0帰属、`formulas/functions/math.js`のROMANは2008 Steven LevithanのMIT帰属を保持する。worker source mapで両方の実コード包含を確認した。
- `pdfjs-dist@6.4.299`の親Apache-2.0と、CMaps、Foxit、ICC、Wasmの別noticeはそれぞれ保持する。Liberation4TTFの原LICENSEはGPLv2とLiberation font例外・追加の原条件であり、OFLへ読み替えない。

## PDF standard fontsの対応ソースと正本path

`node_modules/pdfjs-dist/standard_fonts/LiberationSans-*.ttf`4件は、[Debian公式`fonts-liberation_1.07.4-11_all.deb`](https://ftp.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11_all.deb)から読み出した4TTFとバイト/SHA256完全一致した。[原`.dsc`](https://ftp.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11.dsc)のSHAは、実取得したupstream SFD archiveとDebian archiveの両方に一致する。[原buildinfo](https://buildinfos.debian.net/buildinfo-pool/f/fonts-liberation/fonts-liberation_1.07.4-11_all.buildinfo)のSHAも同じ`.deb`へ一致する。

機械的にコピーするソース資産の正本はリポジトリの`assets/pdf-source/`。ここには実archive2件、原`.dsc`とbuildinfo、原LICENSE/COPYING/License.txt/AUTHORS/Debian copyright、source/build recipe、`FONT-MAPPING.json`を保管する。リンクだけで対応sourceを提供した扱いにしない。

`scripts/build.mjs`は既存の`standard_fonts`全copyに加え、`assets/pdf-source/`を`dist/fixture-app/assets/pdf/source/`、`assets/third-party/`を`dist/fixture-app/assets/third-party/`へそのままコピーする。配布先の原TTF、source package files、noticesを同じbuildのSHA一覧に照合する。フォント版・依存版・コピー対象の変更時は、対応sourceの取得と原ライセンスの確認も更新する。

upstream1.07.4のTTF archiveは現物4TTFと異なる。全共有681glyphの輪郭/複合参照/metrics/hintsには差がなかったが、Cyrillic alternate glyphの除去等がある。Debianの宣言済み4patchをpreferred SFDへ順に適用し、各フォント681glyphの名前集合、ModificationTime、UseTypoMetricsが現物と一致することを確認した。sourceにMakefileとFontForgeの`Generate(..., "", 0x800)`手順が含まれる。

[PDF.jsの原README](https://raw.githubusercontent.com/mozilla/pdf.js/v6.4.299/external/standard_fonts/README.md)と[原ライセンス修正PR21750](https://github.com/mozilla/pdf.js/pull/21750)は版/ライセンスとglyph order依存を説明する。単純なOFL2.xフォント差替えで対応ソース問題を隠さない。幅・scale-factorの再生成と描画試験を伴う別の変更として扱う。

## 確認範囲

これらは原バイナリ、preferred source、配布資料の対応を示す実証であり、法律上の完了判断ではない。この環境にはFontForgeがなく、再ビルドとPGP署名検証は未実施。公式バイナリとの完全一致、`.dsc`/buildinfoのSHA一致とpreferred-source patch適用は実施済み。

`@napi-rs/canvas-darwin-arm64@1.0.10`には原LICENSEファイルがなく、親のMIT metadataだけでnative binary配布完了とは扱わない。このoptional Node-native instanceは今回のbrowser配布から除かれている。115 instancesの台帳には欠落をそのまま残した。本監査は追加27 engineのclosureであり、既存19 foundation/tooling全体や全ソースの内包コードを検査済みとは扱わない。


原文noticeのbyte位置・SHA、installed closure、Debianバイナリ比較とpatchログは 監査台帳（開発元の参考資料: `verification/dependency-license-audit/evidence/final-license-notice-inventory.json`。この生成Skillには含めない）、closure（開発元の参考資料: `verification/dependency-license-audit/evidence/declared-closure-final.json`。この生成Skillには含めない）、フォント実証（開発元の参考資料: `verification/dependency-license-audit/evidence/font-source-proof.json`。この生成Skillには含めない）、検査結果（開発元の参考資料: `verification/dependency-license-audit/evidence/deliverable-verification.json`。この生成Skillには含めない）に保管する。各ファイルのコピーは SHA一覧（開発元の参考資料: `verification/dependency-license-audit/copy-manifest.json`。この生成Skillには含めない）で対応付ける。

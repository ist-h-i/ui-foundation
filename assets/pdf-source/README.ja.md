# PDF.js標準フォントに対応するLiberation Sansのソース

[English](README.md)

`pdfjs-dist@6.4.299`と使う4個の`assets/pdf/standard_fonts/LiberationSans-*.ttf`は、公式Debianバイナリーパッケージ`fonts-liberation`の`1:1.07.4-11`とバイト単位で一致します。`FONT-MAPPING.json`には各バイナリーのSHA256、編集用SFDソースのSHA256、ソースアーカイブURL、取得時刻を記録しています。

対応するDebianソースパッケージを、実ファイルとして同梱します。

- `fonts-liberation_1.07.4.orig.tar.gz`: 上流の編集用SFD、全16書体、Makefile、FontForge出力・変換スクリプト、AUTHORS、License.txt、COPYING。
- `fonts-liberation_1.07.4-11.debian.tar.xz`: 全Debianパッチ、適用順の`debian/patches/series`、パッケージ・ビルド手順。
- `fonts-liberation_1.07.4-11.dsc`: 両アーカイブのSHA256を含む元のソース記述子。
- `fonts-liberation_1.07.4-11_all.buildinfo`: 公開された元のビルド環境とバイナリーパッケージのSHA256。

`LICENSE_LIBERATION`、`License.txt`、`COPYING`、`AUTHORS`、`DEBIAN-COPYRIGHT`は原文をそのまま保持します。原ライセンスはGNU GPL version2とLiberationフォントの例外、その他の原条件です。文書への埋め込み例外は文書についての条件で、この配布物ではフォントバイナリーを別ファイルとして配布します。未変更の上流1.07.4 TTFアーカイブは、ここで使うファイルとは異なります。DebianパッチはCyrillic代替字形の削除とmetrics flagを説明しており、上流SFDだけでは対応ソースの一部が欠けます。

## ソース・ビルド手順

`fonts-liberation_1.07.4-11_all.buildinfo`に記録した依存を持つ環境を使います。元の記録はFontForge `1:20190801~dfsg-2`、fonttools `4.2.4-1`、make `4.2.1-1.2`、debhelper `12.9`、`SOURCE_DATE_EPOCH=1582410033`です。この案内はインストールやフォント有効化を自動実行しません。

標準のDebianソースパッケージ手順は、展開と宣言されたquiltパッチ適用を行います。

```sh
dpkg-source -x fonts-liberation_1.07.4-11.dsc
cd fonts-liberation-1.07.4
dpkg-buildpackage -us -uc -b
```

フォントのみの生成はアーカイブのMakefileと`scripts/fontexport.pe`を使います。後者はパッチ後のSFDを開き、`Generate(..., "", 0x800)`を呼びます。

```sh
tar -xzf fonts-liberation_1.07.4.orig.tar.gz
cd liberation-fonts-1.07.4
tar -xJf ../fonts-liberation_1.07.4-11.debian.tar.xz
while IFS= read -r source_patch; do
  patch -p1 < "debian/patches/$source_patch"
done < debian/patches/series
make FONTFORGE=fontforge
```

出力先は`liberation-fonts-ttf-1.07.4/`です。既存監査では4個のパッチを適用して編集用ソースを確認しましたが、FontForge未導入のため実行していません。ローカル再ビルドのバイト一致は主張しません。公開Debianバイナリーと導入PDF.jsフォントの一致、およびソース記述子とbuildinfoのchecksumを確認しました。PGP署名は未検証です。

これは対応ソースと通知の保存を説明する資料で、法律上の見解ではありません。PDF.jsの幅・倍率テーブルは既存TTFの字形順に依存するため、フォント差替えには上流との調整と描画検証が必要です。原ライセンス・通知を翻訳に置き換えないでください。

# Liberation Sans source accompanying PDF.js standard fonts

The four `assets/pdf/standard_fonts/LiberationSans-*.ttf` files used with `pdfjs-dist@6.4.299` are byte-identical to the official Debian `fonts-liberation` binary package version `1:1.07.4-11`. `FONT-MAPPING.json` records each binary SHA256, editable SFD source SHA256, source archive URL and acquisition time.

The corresponding Debian source package is provided here as actual files:

- `fonts-liberation_1.07.4.orig.tar.gz`: upstream editable SFD source, all 16 font styles, Makefile, FontForge export/conversion scripts, AUTHORS, License.txt and COPYING.
- `fonts-liberation_1.07.4-11.debian.tar.xz`: all Debian patches, their ordered `debian/patches/series`, packaging and build instructions.
- `fonts-liberation_1.07.4-11.dsc`: original source descriptor containing both archive SHA256 values.
- `fonts-liberation_1.07.4-11_all.buildinfo`: original published build environment and binary-package SHA256.

`LICENSE_LIBERATION`, `License.txt`, `COPYING`, `AUTHORS`, and `DEBIAN-COPYRIGHT` are retained verbatim. The raw font license is GNU GPL version 2 with the Liberation font exceptions and the additional original terms. The document-embedding exception describes documents; the font binaries are distributed separately here. The unmodified upstream 1.07.4 TTF archive differs from these files. Debian's patches explain the removed Cyrillic alternate glyphs and metrics flag, so the upstream SFD archive alone would omit part of this source package.

## Source/build recipe

Use an existing environment with the build dependencies recorded in `fonts-liberation_1.07.4-11_all.buildinfo`. The original build records FontForge `1:20190801~dfsg-2`, fonttools `4.2.4-1`, make `4.2.1-1.2`, debhelper `12.9`, and `SOURCE_DATE_EPOCH=1582410033`. No installation or font activation is performed by this website.

The standard Debian source-package command unpacks the source and applies the declared quilt patches:

```sh
dpkg-source -x fonts-liberation_1.07.4-11.dsc
cd fonts-liberation-1.07.4
dpkg-buildpackage -us -uc -b
```

The underlying font-only process uses the archive's Makefile and `scripts/fontexport.pe`, which opens the patched SFD and calls `Generate(..., "", 0x800)`:

```sh
tar -xzf fonts-liberation_1.07.4.orig.tar.gz
cd liberation-fonts-1.07.4
tar -xJf ../fonts-liberation_1.07.4-11.debian.tar.xz
while IFS= read -r source_patch; do
  patch -p1 < "debian/patches/$source_patch"
done < debian/patches/series
make FONTFORGE=fontforge
```

The resulting TTFs are written to `liberation-fonts-ttf-1.07.4/`. This audit applied all four source patches and inspected the preferred source; it did not run FontForge because it was not installed. Byte-identical local recompilation is therefore not claimed. Published Debian binaries were compared byte-for-byte to the installed PDF.js fonts, and both source-descriptor and buildinfo checksums were checked. PGP signatures were not verified.

These files document the source correspondence and preserve notices. They are not a legal opinion. PDF.js's width and scale-factor tables depend on the glyph order of the existing TTFs; a font substitution requires coordinated upstream changes and rendering verification.

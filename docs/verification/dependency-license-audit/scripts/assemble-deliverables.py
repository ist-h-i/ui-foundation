from pathlib import Path
import hashlib, json, tarfile, re, collections

OUT = Path('/tmp/ui-foundation-final-font-license-audit')
CURRENT = OUT / 'current-audit'
PROPOSED = OUT / 'proposed-root'
EVIDENCE = OUT / 'evidence'
ROOT = Path('/tmp/ui-foundation-final-integration/repository')
DEBIAN = EVIDENCE / 'upstream/debian'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def write(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw if isinstance(raw, bytes) else raw.encode())

def write_json(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def record(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': sha(raw)}

inventory = json.loads((CURRENT / 'evidence/dependency-inventory.json').read_text())
notices = json.loads((CURRENT / 'evidence/license-notice-inventory.json').read_text())['files']
source_check = json.loads((EVIDENCE / 'patched-source-correspondence.json').read_text())
binary_check = json.loads((EVIDENCE / 'debian-font-byte-comparison.json').read_text())
downloads = json.loads((EVIDENCE / 'upstream/downloads-debian.json').read_text())
downloads += json.loads((EVIDENCE / 'upstream/downloads-buildinfo.json').read_text())
by_name = {Path(row['copy']).name: row for row in downloads if 'copy' in row}
assert len(inventory['roots']) == 27 and len(inventory['instances']) == 115
assert all(row['exitCode'] == 0 for row in source_check['patchApplication'])
assert len([row for row in binary_check['fonts'] if row.get('matchesInstalled')]) == 4

# File content is the authority. Keep original package metadata separately.
corrections = {
    ('maplibre-gl', 'LICENSE.txt'): ('BSD-3-Clause AND MIT', 'MapLibre/Mapbox/D3 BSD-3-Clause grants and the embedded glfx.js MIT grant all appear in the original file.'),
    ('@maplibre/maplibre-gl-style-spec', 'LICENSE.txt'): ('BSD-3-Clause AND MIT', 'Raw file includes BSD-3-Clause and glfx.js MIT, while package metadata says ISC.'),
    ('@maplibre/geojson-vt', 'LICENSE'): ('MIT', 'Raw file has the full MIT grant; package metadata says ISC.'),
    ('echarts', 'licenses/LICENSE-d3'): ('BSD-3-Clause', 'Separate raw D3 file has the three BSD redistribution/non-endorsement clauses; parent package is Apache-2.0.'),
}
corrected = []
for old in notices:
    row = dict(old)
    raw = (CURRENT / row['copy']).read_bytes()
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256']
    package = next(n for n in inventory['instances'] if n['id'] == row['instance'])
    row['declaredPackageLicense'] = package['licenseDeclared']
    if (row['package'], row['file']) in corrections:
        row['spdx'], row['basis'] = corrections[(row['package'], row['file'])]
        row['classificationCorrectedFromPriorAudit'] = True
    row['kind'] = 'attribution-notice' if Path(row['file']).name.upper() == 'NOTICE' else 'license-notice'
    corrected.append(row)

def embedded_row(label, version, filename, raw, license_expression, basis, original):
    target = OUT / 'notices/embedded' / filename
    write(target, raw)
    return {'package': label, 'version': version, 'instance': 'node_modules/fast-formula-parser',
            'file': filename, 'source': original, 'copy': str(target.relative_to(OUT)),
            'bytes': len(raw), 'sha256': sha(raw), 'spdx': license_expression,
            'declaredPackageLicense': 'MIT', 'basis': basis, 'boundary': 'runtime-declared',
            'roles': ['runtime'], 'kind': 'embedded-attribution', 'separateEmbeddedComponent': True}

ssf_license = (OUT / 'inherited/evidence/upstream/looker-ssf-LICENSE').read_bytes()
ssf_raw = (ROOT / 'node_modules/fast-formula-parser/ssf/ssf.js').read_bytes()
assert sha(ssf_raw) == 'cc7bceb97cff8f1a96a3bb6e429cad914ab68303ad26e039b501c4c7d6b6da22'
corrected.append(embedded_row('SheetJS SSF embedded in fast-formula-parser', '0.10.3', 'SSF-APACHE-NOTICE.txt', ssf_license,
    'Apache-2.0', 'Installed ssf.js names SheetJS and the looker/ssf source URL and declares SSF.version 0.10.3; that upstream LICENSE has the Apache-2.0 grant. Full Apache license text is also reproduced in the combined notices.',
    'https://raw.githubusercontent.com/looker/ssf/master/LICENSE'))
math_raw = (ROOT / 'node_modules/fast-formula-parser/formulas/functions/math.js').read_bytes()
assert sha(math_raw) == '984911329e453d515c9dc7ac3cf60e8d903bf5700df5d96527acf8f6d69a2971'
math_text = math_raw.decode()
original_roman_notice = re.search(r'// The MIT License\r?\n\s*// Copyright \(c\) 2008 Steven Levithan', math_text).group(0).encode()
corrected.append(embedded_row('ROMAN implementation embedded in fast-formula-parser', '2008', 'ROMAN-ORIGINAL-ATTRIBUTION.txt', original_roman_notice,
    'MIT', 'Exact installed comments preserved separately from the parent Dishu(Lester) Lyu MIT copyright.',
    'node_modules/fast-formula-parser/formulas/functions/math.js:486'))
parent_mit = (ROOT / 'node_modules/fast-formula-parser/LICENSE').read_bytes()
grant = parent_mit[parent_mit.index(b'Permission is hereby granted'):]
roman_full = b'MIT License\n\nCopyright (c) 2008 Steven Levithan\n\n' + grant
corrected.append(embedded_row('ROMAN implementation embedded in fast-formula-parser', '2008', 'ROMAN-MIT-PERMISSION.txt', roman_full,
    'MIT', 'Supplemental notice assembled from the installed Steven Levithan attribution and the standard full MIT permission/disclaimer already shipped by the parent. This is identified as an assembled notice, not an upstream verbatim file.',
    'assembled from installed ROMAN comments and standard MIT text'))

# The minimal public notice is one combined byte-preserving file. Identical
# complete original files are reproduced once and every instance is mapped.
groups = collections.OrderedDict()
for row in sorted(corrected, key=lambda x: (x['package'], x['version'], x['file'], x['instance'])):
    groups.setdefault(row['sha256'], []).append(row)
body = bytearray(b'UI foundation: additional UI engine copyright and license notices\n\n'
    b'Scope: the exact 27 added direct packages and their installed declared dependency closure (115 instances), including type declarations and fixture-only decoder notices. All original files below are preserved verbatim; identical complete files are reproduced once. Package metadata does not replace the original license text.\n\n'
    b'Liberation Sans preferred source, Debian patches and build recipe accompany this distribution in assets/pdf/source/. These are real archived source files; the FONT-MAPPING.json records the binary/source correspondence.\n\n')
for digest, rows in groups.items():
    header = '\n========================================================================\n'
    header += '\n'.join(f"{row['package']}@{row['version']} — {row['file']} ({row['instance']}; {row['spdx']})" for row in rows)
    header += '\nOriginal file SHA256: ' + digest + '\n------------------------------------------------------------------------\n'
    body.extend(header.encode())
    offset = len(body)
    first = rows[0]
    source = OUT / first['copy'] if first.get('separateEmbeddedComponent') else CURRENT / first['copy']
    raw = source.read_bytes()
    assert sha(raw) == digest
    body.extend(raw)
    body.extend(b'\n')
    for row in rows:
        row['combinedNoticeByteOffset'] = offset
        row['combinedNoticeByteLength'] = len(raw)
        row['distributionFile'] = 'assets/third-party/THIRD-PARTY-NOTICES.txt'
notice_path = PROPOSED / 'assets/third-party/THIRD-PARTY-NOTICES.txt'
write(notice_path, bytes(body))
for row in corrected:
    raw = body[row['combinedNoticeByteOffset']:row['combinedNoticeByteOffset'] + row['combinedNoticeByteLength']]
    assert sha(raw) == row['sha256']

src = PROPOSED / 'assets/pdf-source'
source_names = ['fonts-liberation_1.07.4.orig.tar.gz', 'fonts-liberation_1.07.4-11.debian.tar.xz', 'fonts-liberation_1.07.4-11.dsc', 'fonts-liberation_1.07.4-11_all.buildinfo']
for name in source_names:
    write(src / name, (DEBIAN / name).read_bytes())
license_path = ROOT / 'node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION'
write(src / 'LICENSE_LIBERATION', license_path.read_bytes())
write(src / 'DEBIAN-COPYRIGHT', (DEBIAN / 'packaging/debian/copyright').read_bytes())
archive_members = []
with tarfile.open(src / source_names[0]) as archive:
    for member in archive.getmembers():
        if member.isfile():
            raw = archive.extractfile(member).read()
            archive_members.append({'path': member.name, 'bytes': len(raw), 'sha256': sha(raw)})
            if member.name.rsplit('/', 1)[-1] in ['License.txt', 'COPYING', 'AUTHORS']:
                write(src / member.name.rsplit('/', 1)[-1], raw)

dsc = (DEBIAN / source_names[2]).read_text()
for name in source_names[:2]:
    row = by_name[name]
    assert f"{row['sha256']} {row['bytes']} {name}" in dsc
buildinfo = (DEBIAN / source_names[3]).read_text()
deb = by_name['fonts-liberation_1.07.4-11_all.deb']
assert f"{deb['sha256']} {deb['bytes']} {Path(deb['copy']).name}" in buildinfo
fonts = [{k: v for k, v in row.items() if k != 'glyphOrderMapping'} for row in source_check['fonts']]
for row in fonts:
    name = row['font']
    installed = ROOT / 'node_modules/pdfjs-dist/standard_fonts' / name
    assert sha(installed.read_bytes()) == row['binarySha256']
    row['package'] = 'pdfjs-dist@6.4.299'
    row['installedPath'] = 'node_modules/pdfjs-dist/standard_fonts/' + name
    row['distributedPath'] = 'assets/pdf/standard_fonts/' + name
    row['debianBinaryPath'] = './usr/share/fonts/truetype/liberation/' + name
    row['debianBinaryByteIdentical'] = True
source_proof = {
    'schemaVersion': 1,
    'scope': 'Liberation Sans four standard fonts shipped by pdfjs-dist@6.4.299',
    'sourcePackage': 'Debian fonts-liberation 1:1.07.4-11',
    'correspondence': 'All four installed PDF.js TTF files are byte-identical to the official Debian binary package. Its .dsc binds the unmodified upstream preferred SFD archive and the Debian quilt/packaging archive by SHA256. Its .buildinfo binds that binary .deb by SHA256 and records the build dependencies. All patches apply to the SFD source, producing exactly the installed glyph-name sets, source modification times, and UseTypoMetrics flags.',
    'acquisitions': [{**{key: value for key, value in row.items() if key != 'copy'}, 'file': Path(row['copy']).name} for row in [by_name[name] for name in source_names] + [deb]],
    'sourceDescriptorSha256ChecksMatch': True,
    'buildinfoBinarySha256Matches': True,
    'pgpSignaturesVerified': False,
    'buildRecipe': 'README.md',
    'buildEnvironment': {'fontforge-nox': '1:20190801~dfsg-2', 'fontforge-common': '1:20190801~dfsg-2', 'fonttools': '4.2.4-1', 'make': '4.2.1-1.2', 'debhelper': '12.9', 'dpkg-dev': '1.19.7', 'sourceDateEpoch': '1582410033'},
    'patchApplication': source_check['patchApplication'],
    'fonts': fonts,
    'fontforgeRebuildExecutedHere': False,
    'fontforgeAvailability': 'not installed in this authorized execution environment; no tool or OS installation performed',
    'fontFilesModifiedHere': False,
    'license': {'base': 'GPL-2.0-only', 'exceptionAndTerms': 'LicenseRef-Liberation-GPL-2.0-Font-Exceptions-EULA', 'file': 'LICENSE_LIBERATION', **record(src / 'LICENSE_LIBERATION')},
    'preferredSourceArchiveContents': archive_members,
    'pdfjsOriginalFontCommit': '34a2fa72c70ee8722a740d4d328d68df3c6ecc75',
    'pdfjsLicenseCorrectionCommit': '4315a4be3168373e6c674fbf6723a20c50994f80',
    'officialReferences': [
        'https://github.com/mozilla/pdf.js/pull/21750',
        'https://raw.githubusercontent.com/mozilla/pdf.js/v6.4.299/external/standard_fonts/README.md',
        'https://ftp.debian.org/debian/pool/main/f/fonts-liberation/',
        'https://buildinfos.debian.net/buildinfo-pool/f/fonts-liberation/fonts-liberation_1.07.4-11_all.buildinfo',
    ],
    'legalDetermination': None,
}
write_json(src / 'FONT-MAPPING.json', source_proof)
write_json(EVIDENCE / 'font-source-proof.json', source_proof)
write(src / 'README.md', '''# Liberation Sans source accompanying PDF.js standard fonts

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
''')

summary = {
    'schemaVersion': 2, 'scope': inventory['inputScope'], 'counts': inventory['counts'],
    'inputPackageSha256': inventory['capturedInputs'][0]['sha256'],
    'inputLockSha256': inventory['capturedInputs'][1]['sha256'],
    'directRoots': inventory['roots'],
    'instances': [{k: n[k] for k in ['id', 'name', 'version', 'licenseDeclared', 'effectiveBoundary', 'roles', 'roots']} for n in inventory['instances']],
    'fileNotices': corrected, 'originalFileCount': len(notices), 'embeddedNoticeCount': 3,
    'combinedNoticeUniqueFiles': len(groups), 'combinedNotice': {'path': 'assets/third-party/THIRD-PARTY-NOTICES.txt', **record(notice_path)},
    'rawOriginalBytesPreservedAndOffsetsVerified': True,
    'classificationCorrections': [{'package': k[0], 'file': k[1], 'expression': v[0], 'basis': v[1]} for k, v in corrections.items()],
    'embeddedRuntimeEvidence': {'SSF': {'source': 'node_modules/fast-formula-parser/ssf/ssf.js', **record(ROOT / 'node_modules/fast-formula-parser/ssf/ssf.js')}, 'ROMAN': {'source': 'node_modules/fast-formula-parser/formulas/functions/math.js', **record(ROOT / 'node_modules/fast-formula-parser/formulas/functions/math.js')}, 'sourceMap': 'dist/fixture-app/assets/sheet-formula.worker.js.map'},
    'remainingLimitations': [
        'No FontForge rebuild performed locally; exact correspondence is supported by official Debian binary equality, .dsc/.buildinfo checksums and preferred-source patch inspection.',
        'No PGP signature verification performed.',
        'The original no-license-file gap for @napi-rs/canvas-darwin-arm64@1.0.10 is retained in the inventory. It is an optional Node-native instance excluded from the browser build; do not infer native binary redistribution readiness from the parent MIT metadata.',
        'This is the 27-added-engine closure, not a complete license audit of the 19 baseline tooling/foundation packages or an all-source embedded-code scan.',
        'Parent integration/build must copy and verify these artifacts; the audit did not change the root or its distribution.',
    ],
    'legalDetermination': None,
}
write_json(EVIDENCE / 'final-license-notice-inventory.json', summary)
write_json(EVIDENCE / 'declared-closure-final.json', inventory)
write(OUT / 'build-additions.mjs.txt', "await cp('assets/pdf-source','dist/fixture-app/assets/pdf/source',{recursive:true});\nawait cp('assets/third-party','dist/fixture-app/assets/third-party',{recursive:true});\n")

manifest_rows = []
for path in sorted(PROPOSED.rglob('*')):
    if not path.is_file():
        continue
    relative = str(path.relative_to(PROPOSED))
    dest = 'assets/pdf/source/' + path.name if relative.startswith('assets/pdf-source/') else relative if relative.startswith('assets/') else None
    manifest_rows.append({'from': str(path), 'to': relative, 'distributionPath': dest, **record(path), 'preserveBytes': True})
manifest = {
    'schemaVersion': 1, 'auditRoot': str(OUT), 'targetRoot': str(ROOT),
    'action': 'Proposed immutable files only; parent copies/adopts, adds the two build-copy calls and verifies actual distribution bytes. No root modification performed by this audit.',
    'files': manifest_rows, 'buildAdditions': str(OUT / 'build-additions.mjs.txt'),
    'licenseNoticeInventory': str(EVIDENCE / 'final-license-notice-inventory.json'),
    'fontProof': str(EVIDENCE / 'font-source-proof.json'),
}
write_json(OUT / 'copy-file-manifest.json', manifest)
write(OUT / 'COPY-SHA256SUMS.txt', ''.join(f"{r['sha256']}  {r['to']}\n" for r in manifest_rows))
print(json.dumps({'files': len(manifest_rows), 'totalBytes': sum(r['bytes'] for r in manifest_rows), 'originalLicenseFiles': len(notices), 'embeddedNotices': 3, 'deduplicatedNoticeFiles': len(groups), 'noticeBytes': len(body), 'sourceFontsEqual': 4, 'sourcePatchesApplied': len(source_check['patchApplication']), 'manifestSha256': record(OUT / 'copy-file-manifest.json')['sha256']}, indent=2))

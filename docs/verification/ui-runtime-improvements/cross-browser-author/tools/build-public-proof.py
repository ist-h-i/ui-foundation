from __future__ import annotations

import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
from datetime import datetime, timezone
import zipfile


STAGE = Path('/tmp/ui-foundation-cross-browser-stage')
REPO = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
BASE = '9f5430ca87e249af204cc335a8610d0d8040621f'
FROZEN_ROOT_REPORTED = '37ecf88b05b6cae1510e3291d7fc75e62217892b'
NAME = 'cross-browser-author-proof-b5e186f9-20261006'
OUT = STAGE / NAME
PACK = STAGE / (NAME + '.tar.gz')
if OUT.exists() or PACK.exists():
    raise SystemExit('Refusing to overwrite immutable proof directory/archive')
OUT.mkdir()
origins: dict[str, dict] = {}


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def write(rel: str, raw: bytes, origin: dict) -> None:
    name = PurePosixPath(rel)
    if name.is_absolute() or '..' in name.parts:
        raise ValueError(rel)
    dst = OUT / rel
    if dst.exists():
        raise ValueError('Duplicate destination ' + rel)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(raw)
    origins[rel] = origin


def original(rel: str, dest: str | None = None) -> None:
    p = STAGE / rel
    if p.is_symlink() or not p.is_file():
        raise ValueError('Not an owned regular file ' + str(p))
    write(dest or rel, p.read_bytes(), {'kind': 'existing-owned-artifact', 'stagePath': rel})


for top in ['candidate', 'evidence']:
    for p in sorted((STAGE / top).rglob('*')):
        if p.is_file():
            original(p.relative_to(STAGE).as_posix())
for rel in ['HANDOFF.ja.md', 'HANDOFF-99e404.ja.md',
            'portable-candidate.tar.gz', 'portable-candidate-99e404.tar.gz']:
    original(rel, 'history/' + rel)
for rel in ['browser-availability.mjs', 'diagnostics.mjs', 'diagnostics-full.mjs',
            'diagnostics-full-v2.mjs', 'summarize-run.mjs', 'build-public-proof.py']:
    original(rel, 'tools/' + rel)

# Record exact historical input source; do not read root's modified worktree.
archive = subprocess.run(['git', 'archive', '--format=tar', BASE,
                          'src', 'templates/angular', 'tests/fixture-app',
                          'package.json', 'package-lock.json', 'playwright.config.ts'],
                         cwd=REPO, capture_output=True, check=True)
archive_validation = {'readOnlyCommand': ['git', 'archive', '--format=tar', BASE,
                                        'src', 'templates/angular', 'tests/fixture-app',
                                        'package.json', 'package-lock.json', 'playwright.config.ts'],
                      'actualExit': archive.returncode, 'files': 0}
with tarfile.open(fileobj=io.BytesIO(archive.stdout), mode='r:') as tar:
    for entry in tar.getmembers():
        if entry.isdir():
            continue
        if not entry.isfile():
            raise ValueError('Unexpected link/special file in baseline archive ' + entry.name)
        f = tar.extractfile(entry)
        if f is None:
            raise ValueError(entry.name)
        write('sources/baseline-9f/' + entry.name, f.read(),
              {'kind': 'read-only-git-archive', 'commit': BASE, 'repositoryPath': entry.name})
        archive_validation['files'] += 1

baseline = json.loads((STAGE / 'evidence/baseline.json').read_text())
for item in baseline['entry']:
    rel = item['path']
    dst = 'sources/baseline-9f/' + rel
    if dst in origins:
        if sha((OUT / dst).read_bytes()) != item['sha256']:
            raise ValueError('Baseline manifest mismatch ' + rel)
        continue
    p = STAGE / 'source' / rel
    raw = p.read_bytes()
    if sha(raw) != item['sha256']:
        raise ValueError('Measured baseline input changed ' + rel)
    write(dst, raw, {'kind': 'measured-input-snapshot', 'baseline': BASE,
                     'baselineEntrySha256': item['sha256'], 'stagePath': 'source/' + rel})

# Trace bundles contain the exact own spec/helper used at each failed phase.
# Keep bundled third-party sources in the unmodified original traces only.
trace_sources: list[dict] = []
for phase in ['focused-before', 'focused-after']:
    observed: dict[str, dict] = {}
    for path in sorted((STAGE / 'evidence' / phase).rglob('trace.zip')):
        with zipfile.ZipFile(path) as z:
            for member in z.namelist():
                if not member.startswith('src/') or not member.endswith('.ts'):
                    continue
                raw = z.read(member)
                if raw.startswith(b"import {test as base,expect} from '@playwright/test';"):
                    rel = 'tests/cross-browser/runtime-test.ts'
                elif raw.startswith(b"import {test,expect} from './runtime-test';"):
                    rel = 'tests/cross-browser/runtime-cross-browser.spec.ts'
                else:
                    continue
                k = rel
                h = sha(raw)
                obs = observed.setdefault(k, {'phase': phase, 'repositoryPath': rel,
                                              'sha256': h, 'bytes': len(raw), 'traces': []})
                if obs['sha256'] != h:
                    raise ValueError('Inconsistent trace source in same phase ' + phase + '/' + rel)
                obs['traces'].append({'stagePath': path.relative_to(STAGE).as_posix(),
                                      'zipMember': member})
                dst = 'sources/from-trace/' + phase + '/' + rel
                if dst not in origins:
                    write(dst, raw, {'kind': 'byte-extraction-from-owned-original-trace',
                                     'phase': phase, 'trace': path.relative_to(STAGE).as_posix(),
                                     'zipMember': member})
    if len(observed) != 2:
        raise ValueError('Missing spec/helper trace source ' + phase)
    trace_sources.extend(observed.values())

def summary(name: str) -> dict:
    return json.loads((STAGE / 'evidence' / (name + '-summary.json')).read_text())

phase_specs = {
    'focused-before': 'sources/from-trace/focused-before/tests/cross-browser/runtime-cross-browser.spec.ts',
    'focused-after': 'sources/from-trace/focused-after/tests/cross-browser/runtime-cross-browser.spec.ts',
    'focused-final': 'evidence/candidate-99e404/tests/cross-browser/runtime-cross-browser.spec.ts',
    'focused-same-level-native': 'candidate/tests/cross-browser/runtime-cross-browser.spec.ts',
}
phase_menus = {
    'focused-before': 'sources/baseline-9f/templates/angular/menu.ts',
    'focused-after': 'evidence/menu-roving-first.ts',
    'focused-final': 'evidence/candidate-99e404/templates/angular/menu.ts',
    'focused-same-level-native': 'candidate/templates/angular/menu.ts',
}
phases = []
for name in ['focused-before', 'focused-after', 'focused-final', 'focused-same-level-native']:
    s = summary(name)
    raw_result = json.loads((OUT / ('evidence/' + name + '/results.json')).read_text())
    if raw_result['stats'] != s['stats']:
        raise ValueError('Raw result/summary discrepancy ' + name)
    actual_exit = int((OUT / ('evidence/' + name + '.exit')).read_text().strip())
    receipt = json.loads((OUT / ('evidence/' + name + '/run-receipt.json')).read_text())
    if actual_exit != s['exit'] or receipt['native']['code'] != actual_exit:
        raise ValueError('Actual exit disagreement ' + name)
    spec_path = phase_specs[name]
    menu_path = phase_menus[name]
    phases.append({'name': name, 'status': 'historical' if name != 'focused-same-level-native' else 'latest-author-targeted',
                   'baseline': BASE, 'actualExit': actual_exit, 'stats': raw_result['stats'],
                   'rawResult': 'evidence/' + name + '/results.json',
                   'rawExit': 'evidence/' + name + '.exit', 'receipt': 'evidence/' + name + '/run-receipt.json',
                   'summary': 'evidence/' + name + '-summary.json',
                   'bundleSha256': receipt['bundleSha256'], 'serverClosed': receipt['serverClosed'],
                   'menuSource': {'path': menu_path, 'sha256': sha((OUT / menu_path).read_bytes())},
                   'actualSpec': {'path': spec_path, 'sha256': sha((OUT / spec_path).read_bytes())},
                   'claims': 'This author phase only; does not certify later root integrated source'})

scope = {
    'schema': 1, 'createdAtUtc': datetime.now(timezone.utc).isoformat(),
    'immutableDirectory': NAME, 'baseline': BASE,
    'rootAdoptionCommitReportedByParent': FROZEN_ROOT_REPORTED,
    'rootAdoptionQualification': 'Metadata only. Root source/engine36/generation tests are separately owned and were not run/copied by this pack author.',
    'menuFinalSha256': 'b5e186f9d573867b9a2353269a24597064c9a06ea85e484041e776a38faef2c8',
    'authorNativePhases': phases,
    'allNativeArtifacts': 'Unmodified results.json, exit files, receipts, logs, failure PNG/trace.zip/error contexts are included under evidence/',
    'causeDiagnostics': {'initialSignalObservation': 'evidence/diagnostics-before.json',
                        'firstFullAttemptActualExit': 1, 'firstFullAttempt': 'evidence/diagnostics-full-clock-before-navigation.json',
                        'correctedFullAttemptActualExit': 0, 'correctedFullAttempt': 'evidence/diagnostics-full-clock-before-navigation-v2.json',
                        'cause': 'Native Firefox pointer hover legitimately paused Snackbar after settings clicks; clock initialization/effect flush was recorded. Product Snackbar source was unchanged.'},
    'warningScope': 'Exact Firefox engine advisory is retained verbatim with UA/count and distinguished from runtime exceptions, console.error and unknown warnings.',
    'axeScope': 'Raw incomplete is retained; violation0 is not full accessibility conformance or screen-reader speech.',
    'traceSourceExtraction': trace_sources, 'baselineRead': archive_validation,
    'sourceEntrances': {'finalCandidate': 'candidate/minimal-integration.json',
                        'rawBaseline': 'sources/baseline-9f/',
                        'initialCandidate': 'evidence/candidate-initial/minimal-integration.json',
                        'intermediateMenu': 'evidence/menu-roving-first-delta.json',
                        'historical99Candidate': 'evidence/candidate-99e404/minimal-integration.json',
                        'latestGuard': 'candidate/menu-minimal-delta.json',
                        'latestSameLevelGuard': 'candidate/menu-same-level-focus-delta.json'},
    'environment': ['evidence/baseline.json', 'evidence/browser-inventory.json', 'evidence/browser-availability.json',
                     'evidence/browser-install-firefox-webkit.txt', 'evidence/browser-install-firefox-webkit.exit'],
    'cleanup': 'evidence/own-cleanup-final.json',
    'oldPacketHistory': ['history/HANDOFF-99e404.ja.md', 'history/portable-candidate-99e404.tar.gz'],
    'newCandidateOnlyPacket': ['history/HANDOFF.ja.md', 'history/portable-candidate.tar.gz'],
    'notIncluded': ['browser executables/cache', 'node_modules', 'dist bundles', 'unrelated historic repository proof', 'root later proof', 'personal browser profile/authentication'],
    'notMeasuredByThisAuthor': ['root final source whole36', 'Safari real device', 'screen-reader speech', 'actual clipboard I/O', 'MapLibre draw', 'default980 native run'],
    'writeScope': 'Only task-owned /tmp; shared repo/root-private/Git/GH untouched',
    'publicAdoption': 'Root may copy this complete relative tree under docs/verification and link README; preserve files and use exact whitelist.'
}
write('proof-scope.json', (json.dumps(scope, ensure_ascii=False, indent=2) + '\n').encode(),
      {'kind': 'new-support-only-scope-ledger'})

readme = '''# クロスブラウザー作者実測の保存入口

このパックは base `9f5430ca87e249af204cc335a8610d0d8040621f` から追加 Menu b5 までの作者証拠を保存する。統合 root `37ecf88b05b6cae1510e3291d7fc75e62217892b` は親から通知された取り込み先の識別子であり、後続の root 検証をこのパックの実測へ合算しない。

| 段階 | actual exit | 実数 | 保存したMenu |
| --- | --- | --- | --- |
| [初回生結果](evidence/focused-before/results.json) | 1 | 30/36 | base 15b497… |
| [中間生結果](evidence/focused-after/results.json) | 1 | 35/36 | 3a2303… |
| [旧候補生結果](evidence/focused-final/results.json) | 0 | 36/36 | 99e404… |
| [追加修正の生結果](evidence/focused-same-level-native/results.json) | 0 | Chromium guided Menu 1/1 | b5e186… |

各段階の `.exit`・`run-receipt.json`・ログ・summary、失敗の trace/PNG/error context を改変せず同梱した。新しい試験やbuildは、このパック作成では実行していない。旧99の36件をb5の全36件へ読み替えない。retry/skipは全段階0。actual結果・bundle SHA・engine versionは [proof-scope.json](proof-scope.json) と元rawを参照する。

[初回clock観測](evidence/diagnostics-before.json)、[最初の全経路診断の失敗](evidence/diagnostics-full-clock-before-navigation.json) と [訂正した全経路診断](evidence/diagnostics-full-clock-before-navigation-v2.json) を保存した。Firefoxのnative hoverが通知を正当にpauseする観測と同時刻effect flushを記録し、Snackbar製品sourceを変更しなかった。

[環境](evidence/browser-inventory.json)・[3エンジン起動](evidence/browser-availability.json)・[実インストールログ](evidence/browser-install-firefox-webkit.txt)・[所有サーバー終了](evidence/own-cleanup-final.json) を同梱した。Firefoxの [警告全文](evidence/focused-final-warnings.json)、Axeの [raw incomplete](evidence/focused-final-incomplete.json) も保持する。WebKitはSafari実機ではなく、ARIA snapshotはscreen reader音声ではない。Clipboard実I/O、MapLibre描画、通常980件nativeは作者測定の範囲外。

[最終候補入口](candidate/minimal-integration.json) と [baseline source入口](sources/baseline-9f/) のSHAをmanifestへ記録した。失敗trace内に保存された初回・中間の実spec/helperは `sources/from-trace/` に元byteのまま抽出し、zip内memberとの対応を `proof-scope.json` に記録した。旧packとHANDOFFは `history/` に保存し、現候補へ適用する指示と区別する。

[files-manifest.json](files-manifest.json) はこのツリーの各通常ファイルについて相対path・SHA256・bytes・出所を列挙する。manifest自身のSHAとtar SHAは外部 `public-proof-pack-receipt.json` が持つ。rootはこの完全な相対ツリーを公開docsの選んだ場所へコピーし、入口リンクと厳密なwhitelistで採用できる。生成物・個人profile・認証情報・browser実行ファイル・node_modules・無関係な過去証拠は同梱しない。
'''
write('README.ja.md', readme.encode(), {'kind': 'new-support-only-entry-document'})

files = []
for path in sorted(OUT.rglob('*')):
    if path.is_file():
        raw = path.read_bytes()
        rel = path.relative_to(OUT).as_posix()
        files.append({'path': rel, 'sha256': sha(raw), 'bytes': len(raw), 'origin': origins[rel]})
manifest = {'schema': 1, 'immutableDirectory': NAME, 'scope': 'All files in this proof tree except this manifest itself',
            'fileCount': len(files), 'totalBytes': sum(x['bytes'] for x in files), 'files': files}
manifest_raw = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
(OUT / 'files-manifest.json').write_bytes(manifest_raw)

# Deterministic metadata for the new archive; original trace and other content bytes are untouched.
with PACK.open('xb') as raw_file:
    with gzip.GzipFile(filename='', mode='wb', compresslevel=6, fileobj=raw_file, mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode='w|', format=tarfile.PAX_FORMAT) as tar:
            for path in sorted(OUT.rglob('*')):
                if not path.is_file():
                    continue
                data = path.read_bytes()
                info = tarfile.TarInfo(NAME + '/' + path.relative_to(OUT).as_posix())
                info.size = len(data); info.mtime = 0; info.mode = 0o644
                info.uid = 0; info.gid = 0; info.uname = ''; info.gname = ''
                tar.addfile(info, io.BytesIO(data))

actual_members = {}
with tarfile.open(PACK, 'r:gz') as tar:
    for member in tar.getmembers():
        name = PurePosixPath(member.name)
        if not member.isfile() or name.is_absolute() or '..' in name.parts or name.parts[0] != NAME:
            raise ValueError('Unsafe archive member ' + member.name)
        f = tar.extractfile(member)
        if f is None:
            raise ValueError(member.name)
        data = f.read()
        actual_members['/'.join(name.parts[1:])] = {'sha256': sha(data), 'bytes': len(data)}
if len(actual_members) != len(files) + 1:
    raise ValueError('Archive count mismatch')
for item in files:
    if actual_members[item['path']] != {'sha256': item['sha256'], 'bytes': item['bytes']}:
        raise ValueError('Archive manifest mismatch ' + item['path'])
if actual_members['files-manifest.json']['sha256'] != sha(manifest_raw):
    raise ValueError('Archive manifest itself changed')
receipt = {'schema': 1, 'actualValidationExit': 0, 'createdAtUtc': datetime.now(timezone.utc).isoformat(),
           'directory': str(OUT), 'entry': {'path': str(OUT / 'README.ja.md'),
                                           'sha256': sha((OUT / 'README.ja.md').read_bytes()),
                                           'bytes': (OUT / 'README.ja.md').stat().st_size},
           'manifest': {'path': str(OUT / 'files-manifest.json'), 'sha256': sha(manifest_raw), 'bytes': len(manifest_raw)},
           'scopeLedger': {'path': str(OUT / 'proof-scope.json'), 'sha256': sha((OUT / 'proof-scope.json').read_bytes()),
                           'bytes': (OUT / 'proof-scope.json').stat().st_size},
           'archive': {'path': str(PACK), 'sha256': sha(PACK.read_bytes()), 'bytes': PACK.stat().st_size,
                       'regularFileMembers': len(actual_members), 'unsafeMembers': 0},
           'manifestFileCount': len(files), 'manifestContentBytes': manifest['totalBytes'],
           'nativeBuildRunsDuringPacking': 0, 'sourceCandidateChanged': False,
           'scope': 'Immutable author historical proof; root integrated tests remain separately owned'}
(STAGE / 'public-proof-pack-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(receipt, ensure_ascii=False, indent=2))

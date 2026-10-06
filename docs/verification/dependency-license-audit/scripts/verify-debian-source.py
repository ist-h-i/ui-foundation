from pathlib import Path
import tarfile, hashlib, json, re, subprocess, datetime, io

OUT = Path('/tmp/ui-foundation-final-font-license-audit')
BASE = OUT / 'evidence/upstream/debian'
TREE = OUT / 'evidence/patched-source'
TREE.mkdir(exist_ok=True)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def extract_files(archive_path, destination):
    with tarfile.open(archive_path, 'r:*') as archive:
        for member in archive.getmembers():
            target = destination / member.name
            if not target.resolve().is_relative_to(destination.resolve()):
                raise ValueError('Unsafe archive path')
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.extractfile(member).read())
            else:
                raise ValueError('Unexpected archive link or special entry')

extract_files(BASE / 'fonts-liberation_1.07.4.orig.tar.gz', TREE)
ROOT = TREE / 'liberation-fonts-1.07.4'
extract_files(BASE / 'fonts-liberation_1.07.4-11.debian.tar.xz', ROOT)
patch_names = (ROOT / 'debian/patches/series').read_text().splitlines()
patches = []
for name in patch_names:
    patch = ROOT / 'debian/patches' / name
    result = subprocess.run(['/usr/bin/patch', '-p1', '-i', str(patch)], cwd=ROOT, text=True, capture_output=True)
    patches.append({'file': name, 'sha256': sha(patch.read_bytes()), 'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr})
    if result.returncode != 0:
        raise RuntimeError('Source patch application failed: ' + name)

# Reuse only the Font class and Mac post-name setup of the independent
# standard-library sfnt parser. Do not execute its old output-writing tail.
parser = (OUT / 'inherited/scripts/compare-fonts.py').read_text()
setup = parser.split('\nresults=[]\n')[0]
namespace = {}
exec(setup, namespace)
Font = namespace['Font']
rows = []
with tarfile.open(BASE / 'fonts-liberation_1.07.4.orig.tar.gz') as archive:
    for binary in sorted((OUT / 'inherited/evidence/upstream/pdfjs-v6.4.299').glob('LiberationSans-*.ttf')):
        font = Font(binary.read_bytes())
        relative = 'src/' + binary.name.replace('.ttf', '.sfd')
        original = archive.extractfile('liberation-fonts-1.07.4/' + relative).read()
        patched = (ROOT / relative).read_bytes()
        text = patched.decode()
        source_names = re.findall(r'^StartChar: (.+)$', text, re.M)
        modification = int(re.search(r'^ModificationTime: (\d+)$', text, re.M).group(1))
        before_names = re.findall(rb'^StartChar: (.+)$', original, re.M)
        encodings = {}
        for block in re.findall(r'^StartChar: .+?^EndChar\s*$', text, re.M | re.S):
            name = re.search(r'^StartChar: (.+)$', block, re.M).group(1)
            encoding = re.search(r'^Encoding: (-?\d+) (-?\d+) (\d+)$', block, re.M)
            if encoding:
                encodings[name] = {'sourceSlot': int(encoding[1]), 'unicode': int(encoding[2]), 'sourceIndex': int(encoding[3])}
        mapping = [{'installedGid': gid, 'glyphName': name, **encodings.get(name, {})} for gid, name in enumerate(font.names)]
        row = {
            'font': binary.name, 'binaryBytes': len(font.raw), 'binarySha256': sha(font.raw),
            'originalSource': relative, 'originalSourceSha256': sha(original),
            'patchedSourceSha256': sha(patched), 'patchedSourceGlyphCount': len(source_names),
            'installedGlyphCount': font.count,
            'patchedGlyphNamesEqualInstalledSet': set(source_names) == set(font.names),
            'patchedNamesOnlySource': sorted(set(source_names) - set(font.names)),
            'namesOnlyInstalled': sorted(set(font.names) - set(source_names)),
            'removedFromOriginal': sorted(set(n.decode() for n in before_names) - set(source_names)),
            'sourceModificationTimeUnix': modification,
            'binaryModifiedTimeUnix': font.head['modified'] - 2082844800,
            'sourceAndBinaryModificationTimeMatch': modification == font.head['modified'] - 2082844800,
            'sourceOS2UseTypoMetrics': int(re.search(r'^OS2_UseTypoMetrics: (\d+)$', text, re.M).group(1)),
            'binaryOS2UseTypoMetrics': bool(int.from_bytes(font.table('OS/2')[62:64], 'big') & 0x80),
            'fontforgeFFTMDateUtc': (datetime.datetime(1904, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=int.from_bytes(font.table('FFTM')[4:12], 'big'))).isoformat(),
            'glyphOrderMapping': mapping,
        }
        rows.append(row)
        print(json.dumps({k: v for k, v in row.items() if k != 'glyphOrderMapping'}))
        if not row['patchedGlyphNamesEqualInstalledSet'] or not row['sourceAndBinaryModificationTimeMatch']:
            raise RuntimeError('Patched source correspondence check failed')

files = []
for path in sorted(ROOT.rglob('*')):
    if path.is_file():
        data = path.read_bytes()
        files.append({'path': str(path.relative_to(ROOT)), 'bytes': len(data), 'sha256': sha(data)})
(OUT / 'evidence/patched-source-correspondence.json').write_text(json.dumps({
    'schemaVersion': 1,
    'method': 'Original upstream editable SFD source plus all Debian 1:1.07.4-11 quilt patches, applied in declared series order in this audit directory only. Binary metadata/glyph-set mapping read through the independent Python sfnt parser. No FontForge build or rendering execution.',
    'patchApplication': patches, 'fonts': rows, 'sourceTreeFiles': files,
}, indent=2) + '\n')

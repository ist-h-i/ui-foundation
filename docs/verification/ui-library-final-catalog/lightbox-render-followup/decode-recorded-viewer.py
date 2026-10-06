"""Reconstruct selected recorded DOM snapshots without querying application state.

Playwright snapshot nodes use post-order indexing; subtree references contain
[[snapshot_delta, node_index]]. This decoder reads the captured trace only.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

TRACE_SHA = '915e9713886e9d84b0d62acf05896d75f38a93073d0ef21472399303c796c5d5'
SELECTED = {
    'call@12147': {'before', 'action', 'after'},
    'call@12149': {'before', 'after'},
    'call@12151': {'action', 'after'},
    'call@12153': {'before', 'after'},
}

parser = argparse.ArgumentParser()
parser.add_argument('--trace', type=Path, default=Path('evidence/original-root-failure/trace.zip'))
parser.add_argument('--output', type=Path, default=Path('evidence/trace-decoder-replay.json'))
args = parser.parse_args()
assert hashlib.sha256(args.trace.read_bytes()).hexdigest() == TRACE_SHA
frames = []
with zipfile.ZipFile(args.trace) as archive:
    for name in archive.namelist():
        if name.endswith('.trace'):
            for line in archive.read(name).splitlines():
                record = json.loads(line)
                if record.get('type') == 'frame-snapshot':
                    frames.append(record['snapshot'])
frame_id = next(s['frameId'] for s in frames if s.get('callId') == 'call@12151' and s.get('isMainFrame'))
snapshots = [s for s in frames if s.get('frameId') == frame_id]

def node_list(node):
    nodes = []
    def visit(n):
        if isinstance(n, str):
            nodes.append(n)
        elif isinstance(n, list) and n and isinstance(n[0], str):
            for child in n[2:]:
                visit(child)
            nodes.append(n)
    visit(node)
    return nodes

nodes_by_snapshot = [node_list(s['html']) for s in snapshots]

def expand(node, index):
    if isinstance(node, str):
        return node
    if isinstance(node, list) and node and isinstance(node[0], list):
        delta, node_index = node[0]
        reference_index = index - delta
        assert 0 <= reference_index <= index
        assert 0 <= node_index < len(nodes_by_snapshot[reference_index])
        return expand(nodes_by_snapshot[reference_index][node_index], reference_index)
    if isinstance(node, list) and node and isinstance(node[0], str):
        return [node[0], node[1] if len(node) > 1 else {}, *[expand(c, index) for c in node[2:]]]
    raise ValueError('Unrecognized recorded snapshot node')

def elements(node):
    if isinstance(node, list) and node and isinstance(node[0], str):
        yield node
        for child in node[2:]:
            yield from elements(child)

def text_content(node):
    if isinstance(node, str):
        return node
    return ''.join(text_content(c) for c in node[2:])

rows = []
for index, snapshot in enumerate(snapshots):
    call_id, phase = snapshot.get('callId'), snapshot.get('phase')
    if phase not in SELECTED.get(call_id, set()):
        continue
    root = expand(snapshot['html'], index)
    all_nodes = list(elements(root))
    viewer = next(n for n in all_nodes if n[0] == 'UI-IMAGE-VIEWER')
    viewer_nodes = list(elements(viewer))
    viewport = next(n for n in viewer_nodes if n[1].get('class') == 'ui-image-viewport')
    canvas = next(n for n in viewer_nodes if n[1].get('class') == 'ui-image-canvas')
    image = next(n for n in viewer_nodes if n[0] == 'UI-IMAGE')
    img = next(n for n in viewer_nodes if n[0] == 'IMG')
    slider = next(n for n in viewer_nodes if n[0] == 'INPUT' and n[1].get('type') == 'range')
    status = next(n for n in viewer_nodes if n[1].get('role') == 'status')
    main = next(n for n in all_nodes if n[0] == 'MAIN')
    rows.append({
        'callId': call_id, 'phase': phase, 'timestamp': snapshot['timestamp'],
        'profile': main[1].get('data-ui-profile'), 'direction': main[1].get('dir'),
        'status': text_content(status), 'sliderValue': slider[1].get('__playwright_value_'),
        'viewportAttrs': viewport[1], 'canvasStyle': canvas[1].get('style'),
        'imageStyle': image[1].get('style'), 'imageAlt': img[1].get('alt'),
        'positiveScrollLeftMeansHorizontalOverflow': float(viewport[1].get('__playwright_scroll_left_', 0)) > 0,
    })
    saved = Path('evidence') / ('expanded-viewer-' + call_id.replace('@', '-') + '-' + phase + '.json')
    if saved.exists():
        assert json.loads(saved.read_text()) == viewer
expected = Path('evidence/original-recorded-viewer-states.json')
if expected.exists():
    assert json.loads(expected.read_text())['states'] == rows
result = {
    'traceSHA256': TRACE_SHA,
    'method': 'Recorded DOM only; Playwright post-order nodes and per-frame snapshot references',
    'mainFrameSnapshots': len(snapshots), 'states': rows,
    'matchesStoredStates': expected.exists(), 'exit': 0,
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'exit': 0, 'snapshots': len(snapshots), 'selectedStates': len(rows), 'matchesStoredStates': expected.exists()}))

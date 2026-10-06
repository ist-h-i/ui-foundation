"""Apply the reviewed single-line test precondition to an explicitly supplied file."""
import argparse
import hashlib
from pathlib import Path

BEFORE_SHA256 = '784bb0cf44bf5aaf320032298caa9821b38c087132d9c06c9b17a36fab37996e'
AFTER_SHA256 = '3e3b32025f0c3e04cc5d71efadebfe7a5afbb1123dac255e5b07a3d72fe2d4a7'
BEFORE = "  await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();\n  await dialog.locator('.ui-image-viewport').focus();await page.keyboard.press('ArrowLeft');".encode()
AFTER = "  await dialog.getByRole('button',{name:'表示をリセット',exact:true}).click();\n  await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);\n  await dialog.locator('.ui-image-viewport').focus();await page.keyboard.press('ArrowLeft');".encode()

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
original = args.source.read_bytes()
assert hashlib.sha256(original).hexdigest() == BEFORE_SHA256
assert original.count(BEFORE) == 1
candidate = original.replace(BEFORE, AFTER, 1)
assert candidate.count(AFTER) == 1
assert candidate.replace(AFTER, BEFORE, 1) == original
assert hashlib.sha256(candidate).hexdigest() == AFTER_SHA256
args.output.write_bytes(candidate)
print(AFTER_SHA256)

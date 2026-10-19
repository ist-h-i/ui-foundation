import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAudit, noticeContainsOriginal, inventoryMatchesNotice, resolveLockedDependency, dependencyClosure } from '../../scripts/audit-package.mjs';

const response = ({ high = 0, critical = 0, dev = 30 } = {}) => ({ status: high || critical ? 1 : 0, stdout: JSON.stringify({ auditReportVersion: 2, vulnerabilities: high || critical ? { vulnerable: {} } : {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical, total: high + critical }, dependencies: { dev } } }) });

test('failed registry response, malformed JSON and omit-dev scans stay Unknown', () => {
  for (const result of [{ status: 1, stdout: '{"error":{"code":"EAI_AGAIN"}}' }, { status: 0, stdout: 'invalid' }, { ...response(), status: null, error: new Error('timeout') }, response({ dev: 0 })]) assert.equal(classifyAudit(result).status, 'Unknown');
  assert.equal(classifyAudit(response()).status, 'Verified');
});

test('applicable high-severity advisory is actionable even when npm exits 1', () => {
  const audit = classifyAudit(response({ high: 1 }));
  assert.equal(audit.status, 'ActionRequired');
  assert.equal(audit.high, 1);
});

test('original notice byte checks reject changed line endings and absent version headers', () => {
  const original = Buffer.from('Copyright\r\nlicense terms\r\n');
  assert.equal(noticeContainsOriginal(Buffer.concat([Buffer.from('dependency@1.2.3\n'), original]), 'dependency', '1.2.3', original), true);
  assert.equal(noticeContainsOriginal(Buffer.from('dependency@1.2.3\nCopyright\nlicense terms\n'), 'dependency', '1.2.3', original), false);
  assert.equal(noticeContainsOriginal(original, 'dependency', '1.2.3', original), false);
  assert.equal(noticeContainsOriginal(Buffer.concat([Buffer.from('dependency@1.2.30\n'), original]), 'dependency', '1.2.3', original), false);
});

test('bundled inventory rejects missing, duplicate and different-version notice dependencies', () => {
  const dependencies = [{ name: 'a', version: '1.0.0' }, { name: 'b', version: '2.0.0' }];
  assert.equal(inventoryMatchesNotice(dependencies, [...dependencies].reverse()), true);
  assert.equal(inventoryMatchesNotice(dependencies, dependencies.slice(0, 1)), false);
  assert.equal(inventoryMatchesNotice(dependencies, [...dependencies, dependencies[0]]), false);
  assert.equal(inventoryMatchesNotice(dependencies, [{ name: 'a', version: '2.0.0' }, dependencies[1]]), false);
});

test('closure resolves nested fixed versions and required peers without assuming hoisting', () => {
  const packages = { '': {}, 'node_modules/a': { dependencies: { b: '*' }, peerDependencies: { c: '*', optional: '*' }, peerDependenciesMeta: { optional: { optional: true } } }, 'node_modules/a/node_modules/b': {}, 'node_modules/b': {}, 'node_modules/c': {} };
  assert.equal(resolveLockedDependency(packages, 'node_modules/a', 'b'), 'node_modules/a/node_modules/b');
  assert.deepEqual(dependencyClosure(packages, ['a']), { paths: ['node_modules/a', 'node_modules/a/node_modules/b', 'node_modules/c'], missing: [] });
  assert.equal(dependencyClosure(packages, ['missing']).missing.length, 1);
});

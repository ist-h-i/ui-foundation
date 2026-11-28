import { execFileSync, spawn } from 'node:child_process';

function hasLiveGroupMembers(group) {
  const rows = execFileSync('/bin/ps', ['-ax', '-o', 'pgid=,state='], { encoding: 'utf8', timeout: 5000 });
  return rows.trim().split('\n').some(row => {
    const [pgid, state] = row.trim().split(/\s+/);
    return Number(pgid) === group && state && !state.startsWith('Z');
  });
}

// Each invocation owns a process group, including browser descendants. Stop that
// group on timeout/cancellation/failure instead of leaving a child test behind.
export function run(file, args, { cwd, timeout = 120_000, signal, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '', ...env },
    });
    let stdout = '', stderr = '', stopped = false, escalation;
    const kill = (signal, wrapperExited = false) => {
      if (!child.pid) return;
      try { process.kill(-child.pid, signal); }
      catch (error) {
        if (error.code === 'ESRCH') return;
        // macOS can report EPERM for an exited group. Confirm no live member remains.
        if (wrapperExited && process.platform === 'darwin' && error.code === 'EPERM' && !hasLiveGroupMembers(child.pid)) return;
        throw error;
      }
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      // Let Playwright close its independently grouped browser before escalation.
      kill('SIGTERM');
      escalation = setTimeout(() => kill('SIGKILL'), 5_000);
    };
    const timer = setTimeout(stop, timeout);
    signal?.addEventListener('abort', stop, { once: true });
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { clearTimeout(timer); clearTimeout(escalation); signal?.removeEventListener('abort', stop); reject(error); });
    child.on('close', (code, terminationSignal) => {
      clearTimeout(timer); clearTimeout(escalation); signal?.removeEventListener('abort', stop);
      // A normally exited wrapper must not leave its own descendants running.
      try { kill('SIGKILL', true); }
      catch (cause) {
        reject(Object.assign(new Error('Could not verify subprocess group cleanup', { cause }), { code, stdout, stderr }));
        return;
      }
      if (code === 0 && !stopped) resolve(stdout);
      else reject(Object.assign(new Error(`${file} ${args.join(' ')} failed (${stopped ? 'timeout/cancelled' : code ?? terminationSignal})\n${stderr}\n${stdout}`), { code, stdout, stderr }));
    });
    if (signal?.aborted) stop();
  });
}

export function checkoutIsolation(repository) {
  if (process.platform !== 'darwin') throw new Error('Package checkout-denial verification requires macOS sandbox-exec; no enforced isolation is configured on this platform.');
  return `(version 1)(allow default)(deny file-read* (subpath ${JSON.stringify(repository.replace(/\/$/, ''))}))`;
}

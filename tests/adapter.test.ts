import { execFile } from 'child_process';
import { describe, it, expect } from 'vitest';

function runAdapter(mode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const node = process.execPath;
    const args = ['-r', 'ts-node/register', 'tests/adapter_runner.ts', mode];
    const p = execFile(node, args, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve();
    });
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
  });
}

describe('storage adapters', () => {
  it('file adapter should pass', async () => {
    await runAdapter('file');
  });
  it('sql adapter should pass', async () => {
    await runAdapter('sql');
  });
});

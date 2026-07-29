import { execFile } from 'child_process';
import { describe, it } from 'vitest';

// Reuse adapter_runner via child process for integration assertions including services
function runLocalTest(): Promise<void> {
  return new Promise((resolve, reject) => {
    const node = process.execPath;
    const args = ['-r', 'ts-node/register', 'tests/run_tests.ts'];
    const p = execFile(node, args, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve();
    });
    p.stdout?.pipe(process.stdout);
    p.stderr?.pipe(process.stderr);
  });
}

describe('integration', () => {
  it('local integration test passes', async () => {
    await runLocalTest();
  });
});

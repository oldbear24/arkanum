// Starts the built binary on a throwaway data directory for the smoke test.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const port = process.argv[2] ?? '18091';
const exe = process.platform === 'win32' ? 'arkanum.exe' : 'arkanum';
const binary = resolve(import.meta.dirname, '../../bin', exe);

if (!existsSync(binary)) {
  console.error(`Missing ${binary}. Run "make build" first.`);
  process.exit(1);
}

const dataDir = mkdtempSync(join(tmpdir(), 'arkanum-e2e-'));

const seed = spawnSync(binary, ['seed', `--dir=${dataDir}`], {
  stdio: 'inherit',
  env: { ...process.env, SEED_PASSWORD: 'arkanum-dev' },
});
if (seed.status !== 0) process.exit(seed.status ?? 1);

const server = spawn(binary, ['serve', `--http=127.0.0.1:${port}`, `--dir=${dataDir}`], {
  stdio: 'inherit',
});

function shutdown() {
  server.kill();
  rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => process.exit(code ?? 0));

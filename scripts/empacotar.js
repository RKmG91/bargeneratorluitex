import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('dist', { recursive: true });
const verificacao = spawnSync(process.execPath, ['--check', 'servidor.js'], { stdio: 'inherit' });
if (verificacao.status !== 0) process.exit(verificacao.status || 1);
const pacote = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', '--pack-destination', 'dist'], { stdio: 'inherit' });
process.exitCode = pacote.status ?? 1;

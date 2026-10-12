// Builds appus-mart-deploy.tar.gz: source + migrations + public assets, without secrets or local build output.
import { execFileSync } from 'node:child_process';
import { closeSync, copyFileSync, openSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const exclude = ['node_modules', '.next', '.env', '.pgdata', 'app/generated', '.claude', 'tsconfig.tsbuildinfo', 'appus-mart-deploy.tar.gz', 'public/images/grocery-hero.png'];
// Written outside the project first: tar fails if the archive grows inside the folder it is reading.
const temp = path.join(tmpdir(), `appus-mart-deploy-${process.pid}.tar.gz`);
// Streamed through a file handle (`-f -`) so no tar flavour misreads a Windows path like C:\ as a remote host.
const out = openSync(temp, 'w');
try { execFileSync('tar', ['-czf', '-', ...exclude.map(e => `--exclude=./${e}`), '.'], { cwd: root, stdio: ['ignore', out, 'inherit'] }); }
finally { closeSync(out); }
copyFileSync(temp, path.join(root, 'appus-mart-deploy.tar.gz'));
rmSync(temp, { force: true });
console.log('Created appus-mart-deploy.tar.gz (no .env, node_modules, .next or local database).');

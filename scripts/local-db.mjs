// Private PostgreSQL cluster for local VeenaMart development, using an installed PostgreSQL's binaries.
// It has its own data folder (.pgdata), port and generated password, so it never touches any other database.
//   node scripts/local-db.mjs init | start | stop | status
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = path.join(root, '.pgdata');
const port = process.env.LOCAL_PG_PORT ?? '5433';
const user = 'veenamart';
const database = 'veenamart';

function findBin(tool) {
  const exe = process.platform === 'win32' ? `${tool}.exe` : tool;
  if (process.env.PG_BIN) return path.join(process.env.PG_BIN, exe);
  const found = spawnSync(process.platform === 'win32' ? 'where' : 'which', [tool], { encoding: 'utf8' });
  if (found.status === 0) return found.stdout.split(/\r?\n/)[0].trim();
  const base = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const version = readdirSync(base).filter(v => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))[0];
    if (version) return path.join(base, version, 'bin', exe);
  }
  throw new Error(`Cannot find ${tool}. Install PostgreSQL or set PG_BIN to its bin folder.`);
}

// detached: the server started by pg_ctl must not inherit this terminal, or the calling shell never sees EOF.
function run(tool, args, env = {}, detached = false) {
  const result = spawnSync(findBin(tool), args, { stdio: detached ? 'ignore' : 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(`${tool} exited with code ${result.status}${detached ? ` (see ${path.join(data, 'server.log')})` : ''}`);
}

function setEnvUrl(url) {
  const file = path.join(root, '.env');
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const kept = lines.filter(line => !/^(DATABASE_URL|SHADOW_DATABASE_URL)=/.test(line));
  const at = Math.max(0, kept.findIndex(line => line.startsWith('CATALOG_SOURCE=')) + 1);
  kept.splice(at, 0, `DATABASE_URL=${url}`);
  writeFileSync(file, kept.join('\n'));
}

function start() {
  run('pg_ctl', ['-D', data, '-l', path.join(data, 'server.log'), '-o', `-p ${port} -c listen_addresses=localhost`, '-w', 'start'], {}, true);
  console.log(`PostgreSQL for VeenaMart is running on localhost:${port}.`);
}

const commands = {
  init() {
    if (existsSync(data)) return console.log('.pgdata already exists; use "start".');
    const password = randomBytes(18).toString('base64url');
    const pwfile = path.join(tmpdir(), `veenamart-pw-${process.pid}`);
    writeFileSync(pwfile, password, { mode: 0o600 });
    try { run('initdb', ['-D', data, '-U', user, '-A', 'scram-sha-256', `--pwfile=${pwfile}`, '-E', 'UTF8', '--no-locale']); }
    finally { rmSync(pwfile, { force: true }); }
    start();
    run('createdb', ['-h', 'localhost', '-p', port, '-U', user, database], { PGPASSWORD: password });
    setEnvUrl(`postgresql://${user}:${password}@localhost:${port}/${database}`);
    console.log(`Created database "${database}" on port ${port} and wrote DATABASE_URL to .env.\nNext: npm run db:deploy && npm run db:seed`);
  },
  start,
  stop: () => run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']),
  status: () => run('pg_ctl', ['-D', data, 'status'])
};

const command = commands[process.argv[2]];
if (!command) { console.error('Usage: node scripts/local-db.mjs init|start|stop|status'); process.exit(1); }
try { command(); } catch (error) { console.error(error.message); process.exit(1); }

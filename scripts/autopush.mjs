// Watches the entries folder and automatically commits + pushes changes to GitHub.
// Usage: npm run autopush   (leave it running; Ctrl+C to stop)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import config from '../journal.config.js';

const DEBOUNCE_MS = Number(process.env.AUTOPUSH_DELAY_MS) || 5000;
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const entriesDir = path.join(root, config.entriesDir);
const rel = config.entriesDir;

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function describe(lines) {
  const added = [], updated = [], removed = [];
  for (const line of lines) {
    const status = line.slice(0, 2);
    const file = path.basename(line.slice(3).split(' -> ').pop().replace(/"/g, ''));
    if (status.includes('D')) removed.push(file);
    else if (status.includes('?') || status.includes('A')) added.push(file);
    else updated.push(file);
  }
  const parts = [];
  if (added.length) parts.push(`add ${added.join(', ')}`);
  if (updated.length) parts.push(`update ${updated.join(', ')}`);
  if (removed.length) parts.push(`remove ${removed.join(', ')}`);
  return `Journal: ${parts.join('; ')}`;
}

let busy = false;
let again = false;

function sync() {
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  try {
    const status = git('status', '--porcelain', '--untracked-files=all', '--', rel);
    if (status) {
      const message = describe(status.split('\n'));
      git('add', '-A', '--', rel);
      // Commit only the entries folder, leaving any other work-in-progress alone.
      git('commit', '-m', message, '--', rel);
      log(`Committed: ${message}`);
    }

    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    const ahead = Number(git('rev-list', '--count', `@{u}..HEAD`) || 0);
    if (ahead > 0) {
      git('pull', '--rebase', '--autostash', 'origin', branch);
      git('push', 'origin', 'HEAD');
      log(`Pushed ${ahead} commit(s) to origin/${branch}${branch === config.branch ? ' — site will redeploy shortly.' : ''}`);
    }
  } catch (err) {
    log(`Sync failed, will retry on the next change:\n${err.stderr || err.message}`);
  } finally {
    busy = false;
    if (again) {
      again = false;
      schedule();
    }
  }
}

let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(sync, DEBOUNCE_MS);
}

// Preflight: the branch needs an upstream to push to.
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
try {
  git('rev-parse', '--abbrev-ref', '@{u}');
} catch {
  git('branch', `--set-upstream-to=origin/${branch}`);
}
if (branch !== config.branch) {
  log(`Note: you're on "${branch}", but the site deploys from "${config.branch}".`);
}

fs.mkdirSync(entriesDir, { recursive: true });
fs.watch(entriesDir, (event, filename) => {
  if (filename && filename.endsWith('.md')) schedule();
});

log(`Watching ${rel}/ — changes are committed and pushed ${DEBOUNCE_MS / 1000}s after you stop editing. Ctrl+C to stop.`);
sync(); // push anything already pending

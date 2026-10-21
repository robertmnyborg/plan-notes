import fs from 'fs';
import path from 'path';
import os from 'os';

const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
const { permission_mode } = input;

// Fires on the first edit or command after plan mode exits, in any mode
// (accept-edits, auto, default). Still planning: nothing to save yet.
if (permission_mode === 'plan') process.exit(0);

// Config (all optional):
//   CLAUDE_PLANS_DIR        where Claude Code writes plan-mode plans (default ~/.claude/plans)
//   PLAN_NOTES_PLANS_DIR    where to save plans (default <projects>/<project>/plans, else <projects>/_general/plans)
//   PLAN_NOTES_PROJECTS     projects root (default ~/Projects)
//   PLAN_NOTES_BIN          dir holding plan-notes, plan-gap, plan-decisions (default ~/bin)
const expand = p => p.replace(/^~(?=$|\/)/, os.homedir());
const plansDir = expand(process.env.CLAUDE_PLANS_DIR ?? path.join(os.homedir(), '.claude', 'plans'));
const binDir = expand(process.env.PLAN_NOTES_BIN ?? path.join(os.homedir(), 'bin'));
if (!fs.existsSync(plansDir)) process.exit(0);

const latest = fs.readdirSync(plansDir)
  .filter(f => f.endsWith('.md'))
  .map(f => ({ f, mtime: fs.statSync(path.join(plansDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)[0];

// Only a plan written in the last 15 minutes, and each version of it once.
if (!latest || Date.now() - latest.mtime > 15 * 60 * 1000) process.exit(0);
const lockFile = path.join(os.tmpdir(), `claude-plan-saved-${latest.f}-${Math.floor(latest.mtime)}`);
if (fs.existsSync(lockFile)) process.exit(0);
fs.writeFileSync(lockFile, '1');

const content = fs.readFileSync(path.join(plansDir, latest.f), 'utf8');
const title = content.match(/^#\s+(.+)$/m)?.[1]
  ?.trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const outName = title ? `${title}.md` : latest.f;

// Determine the target folder: explicit override, else <projects>/<project>/plans
const projectsRoot = expand(process.env.PLAN_NOTES_PROJECTS ?? path.join(os.homedir(), 'Projects'));
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let outDir;
if (process.env.PLAN_NOTES_PLANS_DIR) {
  outDir = expand(process.env.PLAN_NOTES_PLANS_DIR);
} else if (projectDir.startsWith(projectsRoot + path.sep)) {
  // Extract the project name (first directory under the projects root)
  const relative = projectDir.slice(projectsRoot.length + 1);
  const projectName = relative.split(path.sep)[0];
  outDir = path.join(projectsRoot, projectName, 'plans');
} else {
  // Fallback: save to a general plans folder
  outDir = path.join(projectsRoot, '_general', 'plans');
}

fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, outName);
fs.copyFileSync(path.join(plansDir, latest.f), outPath);

// Cold-read the saved plan and record what a fresh session would still have to ask.
// Runs detached so it never blocks the turn; result lands next to the plan as
// <name>.gaps.md. Read it before /clear — non-empty means clearing costs quality.
// Rationale: measured 2026-08-09, see bin/plan-gap.
try {
  const gapBin = path.join(binDir, 'plan-gap');
  if (fs.existsSync(gapBin)) {
    const gapPath = outPath.replace(/\.md$/, '') + '.gaps.md';
    const out = fs.openSync(gapPath, 'w');
    const { spawn } = await import('child_process');
    spawn(gapBin, [outPath], { detached: true, stdio: ['ignore', out, out] }).unref();
    process.stderr.write(
      `plan saved: ${outPath}\ngap check running -> ${gapPath} (read before /clear)\n`
    );
  }
} catch {
  // A failed gap check must never break plan saving.
}

// Append the plan's decisions to the project's decision-ledger.md and flag any
// that reverse an earlier one. Detached; summary lands in <name>.ledger.md.
try {
  const ledgerBin = path.join(binDir, 'plan-decisions');
  if (fs.existsSync(ledgerBin)) {
    const logPath = outPath.replace(/\.md$/, '') + '.ledger.md';
    const out = fs.openSync(logPath, 'w');
    const { spawn } = await import('child_process');
    spawn(ledgerBin, [outPath], { detached: true, stdio: ['ignore', out, out] }).unref();
    process.stderr.write(`decision ledger updating -> ${logPath}\n`);
  }
} catch {
  // A failed ledger update must never break plan saving.
}

// Open the plan in the visual viewer (Structure + Diff tabs). The viewer exits
// 10 minutes after its tab closes.
try {
  const viewBin = path.join(binDir, 'plan-notes');
  if (fs.existsSync(viewBin)) {
    const { spawn } = await import('child_process');
    spawn(viewBin, ['view', outPath], { detached: true, stdio: 'ignore' }).unref();
  }
} catch {
  // A failed viewer launch must never break plan saving.
}

process.exit(0);

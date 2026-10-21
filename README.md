# plan-notes

Review a markdown plan by writing `@@` notes on its blocks. Claude answers every note in one revision pass, logs what changed, and records the decisions in a ledger.

Why: re-prompting in chat to fix one paragraph of a plan loses the paragraph. A note sits on the block it is about, so the agent edits that block and nothing else. One pass answers all notes, so the plan stays consistent. The ledger exists because a decision reversed months later should show both sides.

Pure Python 3 standard library plus Node for the optional hook. No dependencies. The model-backed pieces (`plan-gap`, `plan-decisions`) call `claude -p`.

## The review loop

1. Open the plan in the viewer: `plan-notes view plan.md`. It shows the last-read version left, the current version right, with changed words highlighted. Click + on a line to add a note, or type a line starting with `@@` in any editor.
2. Run `/plan-notes` in Claude Code. The agent runs `plan-notes list`, answers each note in the block it sits on, deletes the `@@` lines, and appends an entry to a `## Revisions` section.
3. The agent runs `plan-decisions plan.md`. New decisions land in `decision-ledger.md`. A decision that contradicts an active one marks the old entry superseded and prints `REVERSAL`.
4. The viewer reloads live. Read the diff, add more notes if needed, then click Mark read to move the left side forward.

## Before and after

Before (`examples/csv-export.md`):

```
## Approach

Build the CSV in the browser from the rows already loaded on the page.

@@ Rows loaded on the page are paginated at 50. Does this export only page 1?
```

After (`examples/csv-export.revised.md`):

```
## Approach

Fetch all rows for the current filters from the existing `/reports/rows` endpoint
(unpaginated, capped at 50,000 rows), then build the CSV in the browser.

## Revisions

### r1 · 2026-03-07
- N1 "Does this export only page 1?" -> changed Approach: export now fetches all rows
  for the active filters, not the loaded page.
```

An agent that disagrees with a note writes `no change: <reason>` in the revision entry. It never answers in chat only.

## Install

Requires Python 3.9+, the `claude` CLI on PATH, and Node 18+ for the hook.

1. Copy the scripts onto your PATH:
   ```
   mkdir -p ~/bin
   cp bin/* ~/bin/ && chmod +x ~/bin/plan-notes ~/bin/plan-decisions ~/bin/plan-gap
   ```
   `plan-notes` finds `plan-notes-view.html` next to itself, so keep them together.
2. Install the skill:
   ```
   mkdir -p ~/.claude/skills/plan-notes
   cp skills/plan-notes/SKILL.md ~/.claude/skills/plan-notes/
   ```
   The skill calls `~/bin/plan-notes` and `~/bin/plan-decisions`. Edit the paths in `SKILL.md` if you install elsewhere.
3. Optional, auto-save plan-mode plans. Copy the hook and register it in `~/.claude/settings.json`:
   ```
   mkdir -p ~/.claude/hooks && cp hooks/save-plan.mjs ~/.claude/hooks/
   ```
   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Write|Edit|MultiEdit|Bash",
           "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/save-plan.mjs" }]
         }
       ]
     }
   }
   ```
   On the first tool call after plan mode ends, the hook copies the newest plan from `~/.claude/plans/` into your plans directory, named from its title. It then starts `plan-gap`, `plan-decisions`, and the viewer in the background. The gap report lands in `<name>.gaps.md` and the ledger log in `<name>.ledger.md`.
4. Try it: `cp examples/csv-export.md /tmp/ && plan-notes list /tmp/csv-export.md`.

## Configuration

| Variable | Default | Used by |
|---|---|---|
| `PLAN_NOTES_PROJECTS` | `~/Projects` | `plan-decisions`, hook: root whose first-level folders are projects |
| `PLAN_NOTES_PLANS_DIR` | `<projects>/<project>/plans`, else `<projects>/_general/plans` | hook: where plans are saved |
| `PLAN_NOTES_LEDGER` | `<projects>/<project>/decision-ledger.md`, else `<projects>/_general/` | `plan-decisions` (also `--ledger PATH`) |
| `PLAN_NOTES_BIN` | `~/bin` | hook: where it finds the three scripts |
| `CLAUDE_PLANS_DIR` | `~/.claude/plans` | hook: where Claude Code writes plan-mode plans |

Set `PLAN_NOTES_PLANS_DIR=./plans` and `PLAN_NOTES_LEDGER=./decision-ledger.md` for a single-repo setup.

## Commands

| Command | What it does |
|---|---|
| `plan-notes list plan.md` | Print each `@@` note with its heading and block. Exit 1 when there are none. |
| `plan-notes diff plan.md` | Git diff since the last read, then mark the current version read. |
| `plan-notes view plan.md` | Local split-diff viewer with a Structure tab (reorder sections, edit `<!-- purpose: -->` and `<!-- group: -->` comments). Exits 10 minutes after the tab closes. |
| `plan-gap plan.md` | Cold-read the plan with `claude -p` and list what a fresh session would still have to ask. Run it before `/clear`. |
| `plan-decisions plan.md` | Extract decisions with `claude -p` and append them to the ledger. Extraction is a model estimate. IDs, status flips, and file writes are code. |

## Measured

2026-08-09, one real plan: a cleared session had 13 blocking questions. Only 2 were missing rationale. The other 11 were identifiers: commit SHA, repo, branch, run commands, type shapes, current state. `plan-gap` exists to catch those before `/clear`.

## Limits

- The viewer binds to 127.0.0.1 on a random port and has no auth. Do not expose it.
- `plan-decisions` trusts the model to spot duplicates and reversals. Read the Unread reversals section.

MIT license.

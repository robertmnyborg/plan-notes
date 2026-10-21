---
name: plan-notes
description: Revise a markdown plan against the notes the user left on its blocks (lines starting with `@@`), all in one pass, then log the revision and update the decision ledger. Use when the user says "/plan-notes", "I left notes on the plan", "answer my notes", or "revise the plan from my notes".
---

# plan-notes

The user writes notes in the plan file itself, or clicks + on a line in `~/bin/plan-notes view <plan>` (a split diff), which writes the same `@@` line after that line. Each note is a line that starts with `@@`, placed under the block it is about. One run answers every note in one revision.

## Procedure

1. Find the plan path. Use the path the user gave. If the user gave no path, use the newest `.md` file in `$PLAN_NOTES_PLANS_DIR` (default `~/Projects/<project>/plans/`).
2. Run `~/bin/plan-notes list <plan>`. If the script exits 1, tell the user that the plan has no notes and stop.
3. Read the whole plan.
4. Answer every note in the block that the note sits on. Change that block, or another block if the note requires it.
5. Delete each `@@` line after you answer it.
6. Do not change a block that no note asks about, except to keep the plan consistent.
7. Append one entry to a `## Revisions` section at the end of the plan. Create the section if it is missing.
8. Run `~/bin/plan-decisions <plan>`. Report each REVERSAL line to the user.
9. Tell the user to check the open viewer, or to run `~/bin/plan-notes diff <plan>`, to see what changed.

## Outline pass

Use this pass when the user says "outline", "structure", "sections", or asks about the order or flow of a plan. Run it before any line-level revision.

1. Read the whole plan.
2. Add a `<!-- purpose: ... -->` line under each section heading that has none. State in one line why the section exists for the reader.
3. Add a `<!-- group: ... -->` line under each section heading. For a plan, use one role: Goal, Context, Inputs, Logic, Outputs, Validation, Steps, or Risks. For other documents, give the same group name to sections that serve the same goal.
4. Do not change section text or section order.
5. Report flow problems to the user. Name each problem as a section number and a reason, for example: "4 before 2: the reader needs the price before the trade-in."
6. Tell the user to open `~/bin/plan-notes view <plan>`, reorder sections in the Structure tab, and edit the purposes.

## Revision entry format

```
### r<N> · <YYYY-MM-DD>
- N1 "<note, shortened>" -> <what changed, and in which block>
- N2 "<note>" -> no change: <reason>
```

Give every note one line. Write "no change" when you disagree with a note, and give the reason. The user decides the next step.

## Rules

- Do not answer a note in chat only. The answer goes in the plan.
- Do not mark the plan ready or final. The user does that.

---
name: stack-sync
description: Procedure reference for the pr-stack-worker agent's sync-stack action. Has no standalone meaning; must be loaded via Skill, never inferred from this description.
user-invocable: false
---

## Shared subroutines

### Load gh-stack mechanics

Before running any `gh stack` command this turn, invoke `Skill` with `skill: "gh-stack"`. Never guess flags from memory. Re-check the skill's documentation for `sync`'s exact behavior and flags rather than assuming syntax.

### Fill-missing-descriptions loop

Given the `branches` array from a fresh `gh stack view --json`, for each entry that has a `pr.number`:

1. `gh pr view <number> --json body` — if `body` is non-empty and doesn't look like a bare auto-generated stub, **skip this PR**. Never overwrite existing content here — only true gaps get filled.
2. Otherwise, resolve this branch's actual parent **branch name** via `gh pr view <number> --json baseRefName` — do NOT use `gh stack view --json`'s `base` field (that's the parent's HEAD SHA at last sync, not a branch name).
3. Diff against that real base: `git log <baseRefName>...<branch> --oneline`, `git diff <baseRefName>...<branch>`.
4. Invoke `Skill` with `skill: "pr-description"`, `args: "base branch: <baseRefName>"`.
5. Generate a semantic-commit-style title (`type(scope): description`) and apply both: `gh pr edit <number> --title "<title>" --body "$(cat <<'EOF'
<description>

EOF
)"`.

## Procedure

1. `gh stack view --json` for current state.
2. Run `gh stack sync --prune` — the `gh-stack` skill's documented 8-step routine (fetch → reconcile remote stack → fast-forward trunk → cascade rebase → push → sync PR state → sync stack object → prune). No `AskUserQuestion` gate for the happy path — this is routine, high-frequency maintenance. `--prune` is included so merged branches are cleaned up locally rather than silently accumulating.
   - If sync reports a diverged local/remote stack, it aborts non-interactively with `ℹ Sync aborted` — report this to the user rather than retrying; resolving a divergence requires `unstack` + re-`init`, which is a structural decision the user should make explicitly (treat as a `stack-edit` follow-up, not something to do automatically here).
   - If sync exits 3 (rebase conflict), follow the `gh-stack` skill's documented conflict-resolution loop: parse stderr for conflicted file paths, resolve them, `git add`, `gh stack rebase --continue`.
3. Run the fill-missing-descriptions loop afterward — new commits from the rebase don't change already-filled bodies, only genuinely empty ones get generated.
4. Report a final `gh stack view --json` summary, calling out anything pruned or merged.

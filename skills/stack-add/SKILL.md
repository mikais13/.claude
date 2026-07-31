---
name: stack-add
description: Procedure reference for the pr-stack-worker agent's add-to-stack action. Has no standalone meaning; must be loaded via Skill, never inferred from this description.
user-invocable: false
---

## Shared subroutines

### Load gh-stack mechanics

Before running any `gh stack` command this turn, invoke `Skill` with `skill: "gh-stack"`. Never guess flags from memory — bare `gh stack view` or `gh stack submit` (without `--auto`) hang waiting on interactive input, per the skill's own agent-safety rules. Re-check the skill's flag tables for `init`/`add` rather than assuming syntax.

### Fill-missing-descriptions loop

Given the `branches` array from a fresh `gh stack view --json`, for each entry that has a `pr.number`:

1. `gh pr view <number> --json body` — if `body` is non-empty and doesn't look like a bare auto-generated stub (i.e. it has more than just a commit-message dump with no structure), **skip this PR**. Never overwrite existing content here — only true gaps get filled.
2. Otherwise, resolve this branch's actual parent **branch name** — do NOT use the `base` field from `gh stack view --json` for this (that field is the parent's HEAD SHA at last sync, not a branch name). Instead use `gh pr view <number> --json baseRefName` to get the real base branch name GitHub has recorded for this PR.
3. Diff against that real base: `git log <baseRefName>...<branch> --oneline`, `git diff <baseRefName>...<branch>`.
4. Invoke `Skill` with `skill: "pr-description"`, `args: "base branch: <baseRefName>"` — this reuses Mikai's style guide unchanged and skips the skill's own base-detection since you're supplying it explicitly.
5. Generate a semantic-commit-style title (`type(scope): description`, same format/types as `pr-creator`) and apply both: `gh pr edit <number> --title "<title>" --body "$(cat <<'EOF'
<description>

EOF
)"`.

### Branch-chain detection (bootstrap only)

Used when no stack exists yet and you need to figure out which local branches make up the chain from trunk to the current branch.

1. Determine trunk the same way `pr-creator` resolves base branches: for each of `main master develop staging` that exists as `origin/<b>`, compute `git merge-base HEAD origin/<b>`; the closest (most recent) merge-base wins.
2. Enumerate candidate branches: `git for-each-ref refs/heads --format='%(refname:short)'`, filtered to those that are both an ancestor of `HEAD` and a strict descendant of trunk (`git merge-base --is-ancestor <branch> HEAD` and `git merge-base --is-ancestor <trunk> <branch>`).
3. Order the surviving candidates bottom-to-top by ancestor distance from trunk: `git rev-list --count <trunk>..<branch>`, ascending.
4. This ordered list plus the resolved trunk is what you propose to the user in step 2 below — never run `gh stack init` on a guessed chain without confirmation.

## Procedure

Handles both "start a stack" and "add to a stack" — branch internally on whether one already exists. The caller never needs to know which case applies.

1. Run `gh stack view --json`.
2. **If it fails / exit code 2 (no stack yet) — bootstrap path:**
   a. Run branch-chain detection (subroutine above).
   b. `AskUserQuestion`: confirm the detected chain (in order) and trunk before mutating anything. Let the user override the chain or trunk if detection got it wrong.
   c. `gh stack init <branches...> -b <trunk>` — this registers the whole confirmed chain in one call (existing branches are adopted automatically), so no separate `add` call is needed for bootstrap.
3. **If it succeeds (stack already exists) — incremental path:**
   a. From the JSON, confirm the current branch is checked out on top of the stack's current top. `gh stack add` must run from the topmost branch — it exits with code 5 ("can only add branches on top of the stack") otherwise. If not on top, tell the user and stop rather than guessing whether to navigate for them.
   b. Re-check the loaded `gh-stack` skill for `add`'s exact flags before running it: plain `gh stack add <branch>` if the branch already has commits, `-Am "<message>"` only if you need to stage-and-commit uncommitted changes into a brand-new branch. Don't default to `-Am` when the branch already has commits — it isn't needed and changes behavior.
   c. Run the resolved `gh stack add ...` invocation.
4. **Both paths converge here:** `gh stack submit --auto` — no `--open` (draft by default; only add it if the user explicitly asked for ready-for-review PRs this run). This pushes and creates PRs for whatever branches don't have one yet; branches with existing PRs are synced but not recreated.
5. Run the fill-missing-descriptions loop (bootstrap: across the whole new stack; incremental: in practice just the new branch's PR, since older ones should already have real descriptions from a prior run).
6. Report a branch → PR URL → state table from a final `gh stack view --json`.

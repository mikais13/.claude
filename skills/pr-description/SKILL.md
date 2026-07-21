---
name: pr-description
description: Writing pull request descriptions in Mikai Somerville's style. Use when creating PRs, writing PR descriptions, drafting PR body content, or helping write the description for a GitHub pull request. Triggers on requests like "write a PR description", "help me write the PR", "generate a PR description for my changes", or any time a PR description needs to be written.
---

# Skill: Writing PR Descriptions (Mikai's Style)

This skill enables writing pull request descriptions that match Mikai Somerville's voice, tone, and style. Use this when creating PRs in the generatezero/footprint repository or similar codebases.

## Gathering the Diff (Do This First)

Before writing anything, determine the base branch and get the diff.

**If the caller (e.g. the pr-creator agent, or the user) already tells you which base branch to use** — use it as-is and skip detection entirely. This matters: a PR description must compare against the exact same point the PR itself is being opened against, so never re-detect a base branch when one has already been resolved elsewhere in the workflow.

Otherwise, detect it yourself, in this order:

1. Repo's default branch (most reliable — matches what `gh pr create` defaults to):
   ```bash
   git remote show origin 2>/dev/null | grep "HEAD branch" | sed 's/.*: //'
   ```
2. If that fails (no remote, detached, etc.), fall back to the tracked upstream — but only if it doesn't just resolve to this same branch's own push target:
   ```bash
   git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null
   ```
3. If still unresolved, compute the merge-base against each common candidate (`main`, `master`, `develop`, `staging`) and pick the branch with the most recent (closest) merge-base to `HEAD`:
   ```bash
   for b in main master develop staging; do
     git show-ref --verify --quiet "refs/remotes/origin/$b" && \
       echo "$b: $(git merge-base HEAD "origin/$b")"
   done
   ```
4. If it's still ambiguous, ask the user which branch this diverged from — don't guess silently.

Once resolved, use that exact branch for every diff/log command below — don't mix branches mid-workflow.

Get the diff against the resolved base:
```bash
git diff <base-branch>...HEAD          # file-level diff
git log <base-branch>...HEAD --oneline # commit list
```

Use this diff — not uncommitted working tree changes — as the source of truth for the PR description.

## Template Detection

Before writing the PR description, check the repository for a PR template. GitHub recognizes templates in specific spots — check those directly instead of a single filename grep, since a broad-but-shallow search misses multi-template setups and a narrow filename match misses valid templates with other names.

1. **Check GitHub's standard locations, in order:**
   - `.github/PULL_REQUEST_TEMPLATE/` — a directory of multiple templates (e.g. `feature.md`, `bugfix.md`). If present, list its contents. If more than one file exists, ask the user which to use (or pick the one matching the change type — e.g. a bug fix branch → `bugfix.md`) rather than guessing silently.
   - `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md`
   - `docs/PULL_REQUEST_TEMPLATE.md` / `docs/pull_request_template.md`
   - Repo root: `PULL_REQUEST_TEMPLATE.md` / `pull_request_template.md`

   ```bash
   ls .github/PULL_REQUEST_TEMPLATE/ 2>/dev/null
   find .github docs . -maxdepth 1 -iname "pull_request_template.md" 2>/dev/null
   ```

2. **If nothing turns up above, broaden the search** — don't stop at exact-name matches. Some repos use non-standard names or nest templates deeper (e.g. `.github/ISSUE_TEMPLATE/../PULL_REQUEST_TEMPLATE.md`, `.gitlab/merge_request_templates/`, a template referenced from `CONTRIBUTING.md`). Run a repo-wide case-insensitive glob and grep:
   ```bash
   find . -iname "*pull*template*" -o -iname "*pr*template*" -o -iname "*merge*request*template*" 2>/dev/null | grep -v node_modules
   ```
   Also check `CONTRIBUTING.md` and any `.github/*.md` for a mention of a PR checklist or linked template file.

3. **Template found** → Copy the template content verbatim as your starting point. Then fill in each section in-place — replacing placeholder text and instructions with real content written in Mikai's voice — while keeping all headings, checkboxes, labels, and blank structural lines exactly as they appear in the template. The output must be a character-for-character match to the template's skeleton, just with the placeholders replaced.

   **Checkbox preservation is critical.** Unchecked boxes must appear as `- [ ]` and checked boxes as `- [x]`. Never collapse, omit, or reformat them. When outputting the final description, always wrap it in a fenced code block (` ```markdown `) so the raw markdown is visible and copy-pasteable without the renderer eating checkbox syntax.

4. **No template found anywhere** → Use the default structure in "## Structure Template (Fallback — No Template Found)" below.

## Structure Template (Fallback — No Template Found)

```
### Description

[Opening sentence: "This PR {verb}s {what it does}."]
[Optional: Additional context sentence if needed]
- [Bullet point for specific change 1]
- [Bullet point for specific change 2]
  - [Nested detail if complex]
- [Bullet point for specific change N]

[Ticket reference: "Closes GF-XXX" or "Relates to GF-XXX"]

[Optional: Screenshot or video for UI changes]

### How to test this change

[Specific test instructions with exact paths/steps]
[Optional: Screenshots showing expected behavior]
```

## Voice & Tone Rules

### Opening Sentence
- **Always** start with "This PR" followed by a verb
- Use present tense verbs: adds, introduces, fixes, improves, updates, moves, refactors
- Keep it to one sentence that captures the essence of the change

**Examples:**
- "This PR adds the functionality to upload CSV files containing the organisation information."
- "This PR fixes the mismatch between the selected region and the interactive region in the `ListWithSearch` component."
- "This PR introduces new api routes `api/emission-factors/simplified/licensed` and `api/emission-factors/table/licensed`."
- "This PR improves the status filter options in the `/measure/data-processing` page to increase clarity and simplify the ux."

### Tone Characteristics
- **Direct**: No pleasantries, filler phrases, or unnecessary context
- **Technical**: Use precise terminology without over-explaining
- **Practical**: Focus on what changed and why it matters
- **Conversational but professional**: Occasional first-person is fine for reasoning

### Code References
- **Always** use backticks for:
  - Component names: `ListWithSearch`, `SimpleDropdown`
  - File names: `UploadOrganisation.modal.tsx`
  - Function/method names: `useUploadOrganisation()`, `setActivityMappings()`
  - Variables/props: `isDisplayed`, `awaitingInput`
  - API routes: `api/emission-factors/simplified/licensed`
  - Config values: `EF_AC_V2`
  - CSS classes: `p-2`, `bg-tertiary-400`

### Bullet Points Style
- Start with lowercase verb (adds, updates, fixes, introduces, removes, renames)
- Use `-` for bullets, not `*`
- Nest with indentation for sub-details
- Keep each point focused on one logical change

**Example:**
```
- adds `lint:files` and `format:files` scripts to relevant `package.json` files
- updates relevant repository and service methods to allow the querying of only active licensed efs
  - adds cache invalidation to the PATCH api route
- renames the `useEmissionsFactorsTable` hook to `useEmissionsFactorsLicensedTable` to match functionality
```

### Parenthetical Asides
Use "i.e." in parentheses to clarify or give examples:
- "(i.e. tags are turned into an array)"
- "(i.e. all parent organisations exist)"

### Caveats and Notes
Use "Note that..." for important caveats:
- "Note that the filtering and searching of data doesn't work properly currently..."
- "Note that the `api` app does not use the eslint `--cache` directive as the caching does not reliably work with type-aware linting"

For critical warnings, use GitHub alerts:
```
> [!WARNING]
> This PR is deployed in Thanos, but please use one of the two "Mikais Corner x" organisations for testing.

> [!NOTE]
> This should be tested with `EF_AC_V2` as `true` and as `false`
```

## Ticket References

Use one of these patterns at the end of the description section:

| Pattern | When to Use |
|---------|-------------|
| `Closes GF-XXX` | PR fully resolves the ticket |
| `Relates to GF-XXX` | PR is part of a larger effort |
| `Fixes #XXX` | For GitHub issues (non-Jira projects) |
| `Not related to a ticket` | For small fixes, tooling updates |

## Testing Instructions Style

### Format
- Start with the exact location/path where to test
- Use bullet points for multi-step testing
- Include "I would recommend..." for helpful tips
- Provide before/after screenshots for visual changes
- Include code snippets (SQL, console commands) when relevant

### Examples

**Simple UI change:**
```
### How to test this change

In `/reporting/analytics` the `ListWithSearch` component is there on the left.
As there is no data with `awaitingInput=true`, I recommend going into the `src/components/ListWithSearch` file and removing the `{awaitingInput && (` in order to show the dots.

Hovered:
<img width="395" alt="image" src="..." />
```

**Feature with multiple test areas:**
```
### How to test this change

The emissions factors are displayed in the following locations:
- Settings → Factors & Metrics → Emission Factors
- Measure → Data Processing → Manual Entry
- Measure → Supplier → Mapping

Check that each only displays the active, licensed emissions factors as set in the admin portal.
```

**Complex feature with test data:**
```
### How to test this change

I have attached example csv files for organisations and facilities, use these to create a new organisation.

[Organisation Chart.csv](...)
[Facilities.csv](...)

I used the following SQL script to clear existing data:
\`\`\`sql
TRUNCATE TABLE footprint.Facility;
\`\`\`
```

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| "Hey team, just a quick PR to..." | "This PR adds..." |
| "I think this should work..." | State what it does factually |
| "Please let me know if..." | Provide clear test instructions |
| "This is a small change" | Let the diff speak for itself |
| Explaining what the reviewer can see in the code | Explain the "why" not the "what" |
| Generic "Test the feature" | Specific paths and steps |
| Over-explaining obvious changes | Trust the reader's technical knowledge |

## Real Examples

See [references/examples.md](references/examples.md) for full examples of Feature PRs, Bug Fix PRs, Small Fix PRs, and Tooling/Config PRs. Read this file when you need to calibrate tone and style.

## Checklist Before Submitting

- [ ] Opens with "This PR {verb}s..."
- [ ] Uses backticks for all code references
- [ ] Bullet points start with lowercase verbs
- [ ] Includes ticket reference (or "Not related to a ticket")
- [ ] Test instructions include specific paths/steps
- [ ] Screenshots included for UI changes
- [ ] No filler phrases or unnecessary pleasantries
- [ ] Caveats noted with "Note that..." if applicable

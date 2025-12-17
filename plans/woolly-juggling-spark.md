# Fix YAML Syntax Error in claude.yml

## Problem

The workflow file `.github/workflows/claude.yml` has a YAML syntax error on line 49. The issue is in the `claude_args` value:

```yaml
claude_args: '--system-prompt "When the user requests a code review (e.g., \"review this PR\", \"review\", \"code review\"), follow these instructions: 1) Read CLAUDE-REVIEW.md for the standardized review format and follow this structure exactly. 2) Read CLAUDE.md, CLAUDE-FRONTEND.md, and CLAUDE-BACKEND.md for project-specific guidelines. 3) Use gh pr view and gh pr diff to examine the PR. 4) Be constructive and provide concrete examples. 5) Use severity levels (Critical/Important/Minor) appropriately. 6) Include file paths and line numbers for findings. 7) Post your review using gh pr comment. For non-review tasks, respond normally to the user\'s request."'
```

The problem is the `\'` at the end (`user\'s request`). In YAML, you **cannot** escape single quotes inside single-quoted strings. The backslash is treated literally, not as an escape character.

## Solution

Use a YAML literal block scalar (`|`) to avoid quote escaping issues entirely. This is the cleanest approach for multi-line or complex strings:

```yaml
claude_args: |
  --system-prompt "When the user requests a code review (e.g., \"review this PR\", \"review\", \"code review\"), follow these instructions: 1) Read CLAUDE-REVIEW.md for the standardized review format and follow this structure exactly. 2) Read CLAUDE.md, CLAUDE-FRONTEND.md, and CLAUDE-BACKEND.md for project-specific guidelines. 3) Use gh pr view and gh pr diff to examine the PR. 4) Be constructive and provide concrete examples. 5) Use severity levels (Critical/Important/Minor) appropriately. 6) Include file paths and line numbers for findings. 7) Post your review using gh pr comment. For non-review tasks, respond normally to the user's request."
```

## File to Modify

- [.github/workflows/claude.yml](.github/workflows/claude.yml) - Line 49

## Implementation

Replace lines 49 with a block scalar format that avoids the quoting issue.

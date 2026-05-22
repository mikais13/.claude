# Code Search (Semble)

Semble is available via **both MCP tools and CLI**. Prefer MCP for top-level agent work; use CLI via Bash for sub-agents (they cannot call MCP tools directly).

## MCP (preferred)

Use `mcp__semble__search` and `mcp__semble__find_related` tools directly. Pass `repo` as a local directory path or `https://` git URL.

## CLI (Bash / sub-agents)

```bash
semble search "authentication flow" ./my-project
semble search "save_pretrained" ./my-project
semble search "save model to disk" ./my-project --top-k 10
semble find-related src/auth.py 42 ./my-project
```

`path` defaults to current directory when omitted. If `semble` not on `$PATH`, use `uvx --from "semble[mcp]" semble`.

## Workflow

1. Start with `search` (MCP or CLI) to find relevant chunks.
2. Read full files only when returned chunk lacks enough context.
3. Use `find_related` with a result's `file_path` and `line` to discover related implementations.
4. Use grep only for exhaustive literal matches or exact string confirmation.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

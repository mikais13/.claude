#!/usr/bin/env node
// Claude Code Statusline
// Shows: model | dir (branch) | context bar curr/max (pct%)

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// Read JSON from stdin
let input = "";
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name.toUpperCase() || "CLAUDE";
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || "";
    const ctxWindow = data.context_window || {};
    const remaining = ctxWindow.remaining_percentage;
    const inputTokens = ctxWindow.total_input_tokens;
    const maxTokens = ctxWindow.context_window_size;

    // Git branch
    let branch = "";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 1000,
      })
        .toString()
        .trim();
      if (branch === "HEAD") {
        // detached HEAD — show short hash
        branch = execSync("git rev-parse --short HEAD", {
          cwd: dir,
          stdio: ["pipe", "pipe", "pipe"],
          timeout: 1000,
        })
          .toString()
          .trim();
      }
    } catch (e) {
      branch = "";
    }

    // Context window display
    // Claude Code reserves ~16.5% for autocompact buffer, so we normalize to that.
    const AUTO_COMPACT_BUFFER_PCT = 16.5;
    let ctx = "";
    if (remaining != null) {
      const usableRemaining = Math.max(
        0,
        ((remaining - AUTO_COMPACT_BUFFER_PCT) /
          (100 - AUTO_COMPACT_BUFFER_PCT)) *
          100,
      );
      const used = Math.max(
        0,
        Math.min(100, Math.round(100 - usableRemaining)),
      );

      // Write context metrics to bridge file for the context-monitor PostToolUse hook.
      if (session) {
        try {
          const bridgePath = path.join(
            os.tmpdir(),
            `claude-ctx-${session}.json`,
          );
          fs.writeFileSync(
            bridgePath,
            JSON.stringify({
              session_id: session,
              remaining_percentage: remaining,
              used_pct: used,
              timestamp: Math.floor(Date.now() / 1000),
            }),
          );
        } catch (e) {}
      }

      // Build progress bar (10 segments)
      const filled = Math.floor(used / 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);

      // Fraction display (e.g. "32k/200k")
      let fraction = "";
      if (inputTokens != null && maxTokens != null) {
        const fmt = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
        fraction = ` ${fmt(inputTokens)}/${fmt(maxTokens)}`;
      }

      // Color based on usable context thresholds
      const label = `${bar}${fraction} ${used}%`;
      if (used < 50) {
        ctx = ` \x1b[32m${label}\x1b[0m`;
      } else if (used < 65) {
        ctx = ` \x1b[33m${label}\x1b[0m`;
      } else if (used < 80) {
        ctx = ` \x1b[38;5;208m${label}\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${label}\x1b[0m`;
      }
    }

    const dirname = path.basename(dir);
    const location = branch ? `${dirname} \x1b[2m(${branch})\x1b[0m` : dirname;

    // Rate limit line
    const rateLimits = data.rate_limits || {};
    const now = Math.floor(Date.now() / 1000);

    const fmtRateLimit = (window, label) => {
      if (!window) return null;
      const used = window.used_percentage != null ? Math.round(window.used_percentage) : null;
      if (used == null) return null;

      const filled = Math.floor(used / 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);

      let resetStr = "";
      if (window.resets_at) {
        const secs = window.resets_at - now;
        if (secs > 0) {
          const d = Math.floor(secs / 86400);
          const h = Math.floor((secs % 86400) / 3600);
          const m = Math.floor((secs % 3600) / 60);
          resetStr =
            d > 0 ? ` ↻${d}D ${h}H` : h > 0 ? ` ↻${h}H ${m}M` : ` ↻${m}M`;
        }
      }

      const label_str = `${label} ${bar} ${used}%${resetStr}`;
      if (used < 50) return `\x1b[32m${label_str}\x1b[0m`;
      if (used < 75) return `\x1b[33m${label_str}\x1b[0m`;
      return `\x1b[31m${label_str}\x1b[0m`;
    };

    const fiveHr = fmtRateLimit(rateLimits.five_hour, "5HR");
    const sevenDay = fmtRateLimit(rateLimits.seven_day, "7D");
    const rateLine = [fiveHr, sevenDay].filter(Boolean).join("  │  ");

    const suffix = rateLine ? `  │  ${rateLine}` : "";
    process.stdout.write(`\x1b[2m${model}\x1b[0m │ ${location}${ctx}${suffix}`);
  } catch (e) {
    // Silent fail - don't break statusline on parse errors
  }
});

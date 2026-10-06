#!/usr/bin/env node
// Agent capture hook for Claude Code.
// Wired in .claude/settings.json to SessionStart, UserPromptSubmit and Stop.
// Appends the verbatim prompt and the final response of each turn to
// .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md. Never edits existing entries;
// only the frontmatter counters (total_exchanges, last_prompt_time, model) are refreshed.
//
// Usage: node agent-capture.mjs <session-start|prompt|stop>   (hook JSON on stdin)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const event = process.argv[2];

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let input = {};
try {
  input = JSON.parse(readStdin() || "{}");
} catch (e) {
  fail(`bad hook input: ${e.message}`);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const logDir = process.env.AGENT_LOG_DIR || path.join(projectDir, ".agent-logs");
const stateDir = path.join(os.tmpdir(), "agent-capture");
const sessionId = input.session_id || "unknown-session";
const shortId = sessionId.slice(0, 8);

function fail(msg) {
  // Never block the user's turn; record the problem where it can be seen.
  try {
    fs.mkdirSync(path.join(os.tmpdir(), "agent-capture"), { recursive: true });
    fs.appendFileSync(
      path.join(os.tmpdir(), "agent-capture", "errors.log"),
      `${new Date().toISOString()} [${event}] ${msg}\n`
    );
  } catch {}
  process.stderr.write(`agent-capture: ${msg}\n`);
  process.exit(0);
}

// ---------- session state (model seen at SessionStart / last Stop) ----------

function statePath() {
  return path.join(stateDir, `${sessionId}.json`);
}
function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), "utf8"));
  } catch {
    return {};
  }
}
function writeState(patch) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify({ ...readState(), ...patch }));
}

// ---------- transcript parsing ----------

function readTranscript() {
  const p = input.transcript_path;
  if (!p || !fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function isRealUserPrompt(e) {
  if (e.type !== "user" || e.isMeta || e.isSidechain) return false;
  const c = e.message?.content;
  if (Array.isArray(c) && c.some((b) => b.type === "tool_result")) return false;
  return textOf(c).trim().length > 0;
}

function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i].type === "assistant" && entries[i].message?.model;
    if (m && m !== "<synthetic>") return m;
  }
  return null;
}

// Final assistant text of the current turn: the last assistant message (grouped by
// message.id, since one message is split across several JSONL lines) that has text.
function finalResponseFromTranscript(entries) {
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(entries[i])) {
      start = i + 1;
      break;
    }
  }
  const turn = entries.slice(start).filter((e) => e.type === "assistant" && !e.isSidechain);
  for (let i = turn.length - 1; i >= 0; i--) {
    if (textOf(turn[i].message?.content).trim()) {
      const id = turn[i].message?.id;
      const parts = turn.filter((e) => e.message?.id === id).map((e) => textOf(e.message.content));
      return {
        text: parts.filter((t) => t.trim()).join("\n"),
        model: turn[i].message?.model,
        timestamp: turn[i].timestamp,
      };
    }
  }
  return null;
}

// ---------- log file ----------

function author() {
  if (process.env.AGENT_LOG_AUTHOR) return process.env.AGENT_LOG_AUTHOR;
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(projectDir, ".claude", "hooks", "agent-capture.config.json"), "utf8")
    );
    if (cfg.author) return cfg.author;
  } catch {}
  try {
    return execSync("git config user.name", { cwd: projectDir }).toString().trim();
  } catch {
    return "unknown";
  }
}

function findLogFile() {
  if (!fs.existsSync(logDir)) return null;
  const f = fs.readdirSync(logDir).find((n) => n.endsWith(`_${sessionId}.md`));
  return f ? path.join(logDir, f) : null;
}

function header(meta) {
  return [
    "---",
    `session_id: ${sessionId}`,
    `date: ${meta.date}`,
    `author: ${meta.author}`,
    `model: ${meta.model}`,
    `tool: claude-code`,
    `project: ${meta.project}`,
    `total_exchanges: ${meta.total}`,
    `first_prompt_time: ${meta.first}`,
    `last_prompt_time: ${meta.last}`,
    "---",
    "",
    `# Session Log - ${meta.date}`,
    "",
    `Session: \`${shortId}\` | Project: \`${meta.project}\` | Author: \`${meta.author}\``,
    "",
    "---",
    "",
  ].join("\n");
}

function entry(type, num, timestamp, model, body) {
  return `\n[LOG_ENTRY type=${type} num=${num} session=${shortId}]\ntimestamp: ${timestamp}\nmodel: ${model}\n\n${body}\n\n`;
}

const ENTRY_RE = new RegExp(`^\\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\\d+) session=${shortId}\\]$`, "gm");

// Append an entry and refresh the frontmatter. Entries already written are kept byte-for-byte.
function append(type, timestamp, model, body) {
  fs.mkdirSync(logDir, { recursive: true });
  let file = findLogFile();
  let existingBody = "";
  let first = null;
  if (file) {
    const raw = fs.readFileSync(file, "utf8");
    const fm = raw.match(/^---\n[\s\S]*?\n---\n/);
    first = raw.match(/^first_prompt_time: (.*)$/m)?.[1] || null;
    // Body = everything after the "Session: ... \n\n---\n" banner.
    const bannerEnd = raw.indexOf("\n---\n", fm ? fm[0].length : 0);
    existingBody = bannerEnd >= 0 ? raw.slice(bannerEnd + 5) : raw;
  } else {
    const d = new Date(timestamp);
    const stamp = d.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
    file = path.join(logDir, `${stamp}_${sessionId}.md`);
  }

  const kinds = [...existingBody.matchAll(ENTRY_RE)];
  const prompts = kinds.filter((m) => m[1] === "PROMPT");
  const lastKind = kinds.length ? kinds[kinds.length - 1][1] : null;
  const promptCount = prompts.length + (type === "PROMPT" ? 1 : 0);
  const num = Math.max(promptCount, 1);

  const promptTimes = loggedPromptTimes(existingBody);
  if (type === "PROMPT") promptTimes.push(timestamp);
  const lastPromptTime = promptTimes[promptTimes.length - 1] || timestamp;
  first = first || promptTimes[0] || timestamp;

  const meta = {
    date: first.slice(0, 10),
    author: author(),
    model,
    project: path.basename(projectDir),
    total: promptCount,
    first,
    last: lastPromptTime,
  };
  const out = header(meta) + existingBody + entry(type, num, timestamp, model, body);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
  return { file, lastKind };
}

function loggedPromptTimes(text) {
  const re = new RegExp(`^\\[LOG_ENTRY type=PROMPT num=\\d+ session=${shortId}\\]\\ntimestamp: (.*)$`, "gm");
  return [...text.matchAll(re)].map((m) => m[1]);
}

// True when the transcript's latest user prompt has no PROMPT entry in the log
// (hook installed mid-session, or UserPromptSubmit failed). Background
// re-invocations with no new user prompt return false.
function promptMissing(userEntry) {
  if (!userEntry) return false;
  const file = findLogFile();
  if (!file) return true;
  const times = loggedPromptTimes(fs.readFileSync(file, "utf8"));
  if (!times.length) return true;
  const lastLogged = Date.parse(times[times.length - 1]);
  const userTs = Date.parse(userEntry.timestamp);
  // The hook stamps its own clock; allow a few seconds of skew against the transcript.
  return Number.isFinite(userTs) && userTs > lastLogged + 10_000;
}

// ---------- events ----------

try {
  if (event === "session-start") {
    writeState({ sessionStartSeen: new Date().toISOString(), ...(input.model ? { model: input.model } : {}) });
  } else if (event === "prompt") {
    // Headless (-p) sessions don't pass a model to SessionStart, so the first
    // prompt there is labelled "unknown"; the RESPONSE carries the real model.
    const model = lastModel(readTranscript()) || readState().model || "unknown";
    append("PROMPT", new Date().toISOString(), model, input.prompt ?? "");
  } else if (event === "stop") {
    const entries = readTranscript();
    const fromTranscript = finalResponseFromTranscript(entries);
    const model = fromTranscript?.model || lastModel(entries) || readState().model || "unknown";
    writeState({ model });

    // If the prompt for this turn was never logged (e.g. the hook was installed
    // mid-turn), recover it from the transcript so the response isn't orphaned.
    {
      const userEntries = entries.filter(isRealUserPrompt);
      const u = userEntries[userEntries.length - 1];
      if (promptMissing(u)) {
        append(
          "PROMPT",
          u.timestamp || new Date().toISOString(),
          model,
          textOf(u.message.content) + "\n\n<!-- recovered from transcript by Stop hook: UserPromptSubmit did not fire for this prompt -->"
        );
      }
    }

    const text =
      (typeof input.last_assistant_message === "string" && input.last_assistant_message.trim()
        ? input.last_assistant_message
        : fromTranscript?.text) || "(no assistant text found for this turn)";
    append("RESPONSE", new Date().toISOString(), model, text);
  } else {
    fail(`unknown event "${event}"`);
  }
} catch (e) {
  fail(e.stack || String(e));
}

# Capture Test

## Tool and model

- **Tool:** Claude Code 2.1.291, VS Code extension (`anthropic.claude-code-2.1.291-win32-x64`) on Windows 11
- **Model:** `claude-opus-5-5` (Opus 5.5) does both planning and execution. No separate planner model.
- **Automatic mechanism:** yes. Claude Code hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) run a shell command on every prompt and at the end of every turn.

## Mechanism

- **Config file changed:** `.claude/settings.json` (project-level, committed, so it loads in every session opened in this repo)
- **Script:** `.claude/hooks/agent-capture.mjs` (Node, no dependencies)
  - `UserPromptSubmit` appends a `PROMPT` entry with the hook's `prompt` field, verbatim.
  - `Stop` appends a `RESPONSE` entry with the hook's `last_assistant_message` (the text of the final assistant message of the turn). If that field is missing, it falls back to parsing the transcript at `transcript_path`. Thinking, tool calls and intermediate text are not logged.
  - `SessionStart` records the session's model, so the first `PROMPT` entry can be labelled before any response exists.
  - Every entry has a UTC ISO timestamp and the model. Frontmatter (`total_exchanges`, `last_prompt_time`, `model`) is refreshed on each write; existing entries are never rewritten.
  - If a `Stop` happens for a prompt that was never logged (for example, the hook was installed mid-session), the prompt is recovered from the transcript and marked with an HTML comment saying so.
- **Log location:** `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`, one file per session

## Canary log file(s)

_TODO: fill in after canaries are sent_

## Canary entries (raw)

_TODO_

## What I tried first / what did not work

- **Synthetic test, wrong path format:** my first local test passed the transcript path in Git-Bash form (`/c/Users/...`). Node on Windows can't open that, so the transcript fallback returned nothing. Real hooks pass a Windows path, and the rerun with `cygpath -m` worked.
- **Headless pre-check:** before asking for the canaries, I ran a fresh headless session (`claude.exe -p "CAPTURE TEST (headless pre-check run by the agent) ..."`) to prove the hook loads from repo settings in a new process. Both entries landed in `.agent-logs/2026-10-06_14-17-15_f4ed74e6-....md`. That file is left in place, unedited.
- **Known issue found by that run:** its `PROMPT` entry has `model: unknown`, because SessionStart had not recorded the model before the first prompt in `-p` mode. The `RESPONSE` entry has the correct model. I left the entry as written, not edited.
- **Tried to fix `model: unknown`:** I assumed a race between SessionStart and the first prompt and added a 2s wait. A second headless run (`.agent-logs/2026-10-06_14-25-08_d5e89807-....md`) showed SessionStart had fired 5s before the prompt but with no model. In `-p` mode SessionStart doesn't pass one. I reverted the wait. The first PROMPT of a headless session stays `unknown`; its RESPONSE has the real model.
- **Setup session:** the setup prompt (this brief) was sent before any hook existed, so `UserPromptSubmit` could not capture it.

## Audit, 2026-10-07

- **Method:** every user-typed prompt in Claude Code's session transcripts
  (`~/.claude/projects/c--Users-NexGen-Desktop-apex/*.jsonl`; no other project folder has apex sessions)
  was compared with the PROMPT entries in `.agent-logs/`.
  Result: 22 typed prompts across 4 sessions, **0 missing on disk**. The only non-matches were two `/model`
  slash-command outputs, which are not prompts and never reach `UserPromptSubmit`. The hook error log was empty.
- **Why prompts looked missing:** GitHub had only 3 of this session's prompts, because the last push
  (a595cf7) was early in the session and 12 commits are unpushed. The newest prompt and response are never
  in that turn's own commit, because the Stop hook writes the response after the agent's final message.
- **Hardening:** the hook now logs to the repo root even when a session starts in `frontend/` or `backend/`
  (each has a `.claude/settings.json` that calls the root hook). The same prompt delivered by two hook
  registrations is logged once. A hook failure shows a warning in Claude Code
  ("agent-capture: this prompt was NOT logged ...") instead of failing silently.
- **Known extra entry:** after a session restart, Claude Code itself submits "Continue from where you left
  off."; it is logged as a prompt although the user didn't type it (session 39197743, prompt 9).

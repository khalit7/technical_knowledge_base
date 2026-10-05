# Harness atlas research schema (date today: 2026-10-05)

Write ONE JSON file: a list of harness objects. Every claim must come from a page you actually fetched today
(official docs, the product's repo README/LICENSE/CHANGELOG/releases, official blog or pricing page). Never fill
from memory. If you cannot confirm a value, set "v" to "unconfirmed" and say what you tried in "note".
No em-dash characters anywhere (use commas, colons, parentheses). Keep each "d" to one or two short sentences.

Harness object:
{
 "id": "claude_code",                 // snake_case
 "name": "Claude Code",
 "maker": "Anthropic",
 "kind": ["cli","ide","cloud","sdk","desktop","chat"],   // surfaces it ships as (subset)
 "summary": "one sentence: what it is, for someone who has never heard of it",
 "status": "active | renamed | acquired | discontinued | ...",  // with d + src if not plainly active
 "first_release": {"v":"2025-02-24","d":"research preview","src":"url"},
 "latest": {"v":"2.1.289","date":"2026-10-0x","src":"url"},   // latest version or changelog entry seen today
 "axes": {
   "open":   {"tags":["closed"] or ["open"], "v":"Apache-2.0 / MIT / proprietary / source-available", "d":"...", "src":"url"},
   "models": {"tags":["one-vendor"] or ["any"] or ["vendor+some"], "v":"short", "d":"which models or providers; BYO key?", "src":"url"},
   "loop":   {"tags":subset of ["single-loop","plan-mode","subagents","parallel-agents","async-background","todo-list"], "v":"short", "d":"...", "src":"url"},
   "edit":   {"tags":subset of ["exact-replace","search-replace-blocks","patch","unified-diff","whole-file","shell-only"], "v":"short", "d":"name the actual tool, e.g. Edit(old_string,new_string), apply_patch", "src":"url"},
   "context":{"tags":subset of ["agents-md","own-memory-file","repo-map","embedding-index","compaction","skills","subagent-isolation"], "v":"short", "d":"which memory file names, compaction behaviour", "src":"url"},
   "perms":  {"tags":subset of ["approval-modes","allow-deny-rules","os-sandbox-macos","os-sandbox-linux","container","cloud-vm","none"], "v":"short", "d":"approval modes by name; sandbox technology by name (Seatbelt, Landlock, bubblewrap, Docker, microVM)", "src":"url"},
   "ext":    {"tags":subset of ["mcp","hooks","plugins","custom-commands","sdk"], "v":"short", "d":"...", "src":"url"},
   "where":  {"tags":subset of ["local","ide","cloud","ci","chat-apps"], "v":"short", "d":"e.g. GitHub Action, Slack, web", "src":"url"},
   "price":  {"tags":subset of ["free","byo-key","subscription","usage","enterprise"], "v":"short", "d":"plans and what they include, as stated on the pricing page, with the date", "src":"url"}
 },
 "notes": ["anything surprising, corrections to common beliefs, dated news that teaches an idea (with src)"],
 "sources_read": [{"url":"...","what":"..."}]
}
An axis may carry several sources: use "src" as a list then. Use the most specific page (docs page for the
feature) rather than a home page. Record every URL you fetched in sources_read.

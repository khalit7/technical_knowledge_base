LOCAL = "Qwen3-4B-Instruct-2507 4-bit, local model on Apple M1 Pro (mlx-lm 0.32.0)"
HAIKU = "Claude Haiku 4.5 through claude -p (Claude Code 2.1.289, all its tools off)"
AIDER_KINDS = [["commit message", r"commit message|Generate a one-line commit"], ["history summary", r"summarize this partial conversation"]]
OC_KINDS = [["title", r"title generator|Generate a (short )?title|You are a title"], ["subagent", r"file search specialist|You are a .*subagent|explore"]]
META = {
    "aider_diff_1": {"harness": "Aider", "version": "0.86.2", "model": LOCAL, "route": "OpenAI-compatible, direct (logging proxy)",
                     "sandbox": "none (git auto-commit is the safety net)", "setting": "--edit-format diff (SEARCH/REPLACE), --auto-test",
                     "kinds": AIDER_KINDS},
    "aider_whole_1": {"harness": "Aider", "version": "0.86.2", "model": LOCAL, "route": "OpenAI-compatible, direct (logging proxy)",
                      "sandbox": "none (git auto-commit is the safety net)", "setting": "--edit-format whole, --auto-test",
                      "kinds": AIDER_KINDS},
    "opencode_1": {"harness": "opencode", "version": "1.18.34", "model": LOCAL, "route": "@ai-sdk/openai-compatible provider (logging proxy)",
                   "sandbox": "a Docker container we added (opencode has no OS sandbox)", "setting": "opencode run, build agent, default permissions",
                   "kinds": OC_KINDS},
    "codex_1": {"harness": "Codex CLI", "version": "0.160.1", "model": LOCAL,
                "route": "Responses API through a LiteLLM 1.104.0 gateway that translates to chat completions",
                "sandbox": "Codex's own Seatbelt sandbox, workspace-write", "setting": "codex exec -s workspace-write",
                "kinds": [["compaction", r"CONTEXT CHECKPOINT|summar"]]},
}
MSWE_T = "mini_textbased.yaml: one ```mswea_bash_command``` block per reply"
META.update({
    "mswe_local_tool": {"harness": "mini-SWE-agent", "version": "2.4.6", "model": LOCAL, "route": "litellm, OpenAI-compatible (logging proxy)",
                        "sandbox": "Docker container (python:3.13-slim) per run", "setting": "mini.yaml: native tool calling, one bash tool", "label": "tool calling"},
    "mswe_local_text": {"harness": "mini-SWE-agent", "version": "2.4.6", "model": LOCAL, "route": "litellm, OpenAI-compatible (logging proxy)",
                        "sandbox": "Docker container (python:3.13-slim) per run", "setting": MSWE_T, "label": "text actions"},
    "mswe_haiku_free": {"harness": "mini-SWE-agent", "version": "2.4.6", "model": HAIKU, "source": "shim",
                        "route": "our adapter: claude -p behind an OpenAI-compatible endpoint, no stop at the action",
                        "sandbox": "Docker container (python:3.13-slim) per run", "setting": MSWE_T, "label": "text, no stop"},
    "mswe_haiku_cut": {"harness": "mini-SWE-agent", "version": "2.4.6", "model": HAIKU, "source": "shim",
                       "route": "our adapter: claude -p behind an OpenAI-compatible endpoint, reply cut after the first action block",
                       "sandbox": "Docker container (python:3.13-slim) per run", "setting": MSWE_T, "label": "text, cut at action"},
    "aider_haiku_diff": {"harness": "Aider", "version": "0.86.2", "model": HAIKU, "source": "shim", "route": "our adapter: claude -p behind an OpenAI-compatible endpoint",
                         "sandbox": "none (git auto-commit is the safety net)", "setting": "--edit-format diff (SEARCH/REPLACE), --auto-test", "label": "diff",
                         "kinds": AIDER_KINDS},
    "ohs_1": {"harness": "OpenHands SDK", "version": "1.53.0", "model": LOCAL, "route": "LiteLLM inside the SDK, OpenAI-compatible (logging proxy)",
              "sandbox": "a Docker container we started; the SDK's LocalWorkspace inside it", "setting": "get_default_agent(cli_mode=True), NeverConfirm",
              "kinds": [["condenser summary", r"summariz|STATE SUMMARY|USER_CONTEXT"]]},
    "gemini_1": {"harness": "Gemini CLI", "version": "0.62.0", "model": LOCAL,
                 "route": "Gemini API through a LiteLLM 1.104.0 gateway that translates to chat completions",
                 "sandbox": "Gemini CLI's own Seatbelt sandbox (-s, permissive-open)", "setting": "gemini -p --yolo -s",
                 "kinds": [["compression", r"state_snapshot"], ["router or check", r"(classif|router|next.speaker|loop)"]]},
})
for k in ("aider_diff_1", "aider_whole_1"):
    META[k]["label"] = "diff" if "diff" in k else "whole"
META["opencode_1"]["label"] = "build agent"
META["codex_1"]["label"] = "exec, workspace-write"

# Topic: agentic-harnesses

Notion: https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). How a complete agent works inside, taught from zero on one running example (the textstats repository with two planted bugs): the loop, tools, context, control, safety, the products, measuring harnesses and using them for training. Tabs: Reading (`src/read/`), Loop lab (`src/loop/`: a harness built from scratch in seven steps on `claude -p` with tools off), Trace and context lab (`src/trace/`: redacted Claude Code runs), Harness atlas (`src/atlas/`: 23 harnesses, scaffold sensitivity, training harnesses), Further reading.
Real runs: Claude Code 2.1.289 to 2.1.291 headless on the owner's subscription and a local Qwen3-4B on an Apple M1 Pro, 2026-10-05 and 06; every recording is redacted (paths, account, git identity) before it enters the repository.
Seven child pages, each in its own folder: claude_code, building_a_harness, context_engineering, agent_security, other_coding_harnesses, personal_agents, harnesses_for_training.

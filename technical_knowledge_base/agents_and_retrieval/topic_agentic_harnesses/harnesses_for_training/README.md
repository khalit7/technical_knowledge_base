# Harnesses for training and evaluation: scaffold sensitivity, RL environments, trajectories, self-improving harnesses

Notion: https://app.notion.com/p/3f15c17b0d0d815ea579d6c80065aa36 (child of Topic: agentic-harnesses, https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb). HTML-only page: `index.html` is the whole page, built by `src/build.sh`.

Tabs: Reading (in one screen; 1 the score belongs to the pair, a controlled experiment; 2 an RL environment from zero; 3 rewards; 4 groups and advantages; 5 tokens that get loss; 6 trajectories as data; 7 self-improving harnesses; 8 in production; mistakes; interview questions), Scaffold experiment, Environment lab, Rollout to dataset, Self-improvement, Further reading.

Evidence: 240 rollouts recorded on 6 October 2026 in textstats-gym, an environment built for this page (10 tasks, 8 planted bugs, 20 checks run in a fresh container): Qwen3-4B-Instruct-2507 (4-bit, local, Apple M1 Pro) in three harnesses and Claude Haiku 4.5 in four (three via the Claude Agent SDK, one Claude Code itself). Details in `src/README.md`.

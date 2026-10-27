# inputs/: where every input came from

| File | Source | How |
|---|---|---|
| `paper_v1.txt`, `tables_v1.txt`, `anchors.txt` | arXiv HTML v1, https://arxiv.org/html/2609.02749v1 (fetched 3 October 2026) | `extract_paper.py` (text, the six tables, linkable anchors) |
| `release_library.json` | AREX-Skill release at commit `ac3fe1afa80fb9a09775ecfb2b6cc3ba850a2db6`: the `skills/repositories/repo-skills` tree (31,191 files) and the router's `references/index/` (taxonomy, assignments, repositories) | `fetch_release.py`: per graph entry SKILL.md bytes, SKILL.md count, total bytes; router page sizes; memberships; the vLLM and SGLang graphs file by file; three example index rows |
| `release_session.json` | `examples/researcher/disco-researcher-vllm_sglang.html` (base64 JSON session embedded in the export) | `fetch_release.py`: every `read` of a skill file with time and size, and session totals |
| `release_frontiercs.json` | `skills/task-oriented/FrontierCS/algorithmic-problem-solving` | `fetch_release.py`: nodes, SKILL.md sizes, distinct directed Markdown links between the nine SKILL.md files |
| `release_creator_hub.json` | `examples/creator/repo-to-skills/artifacts/huggingface_hub/review/` | `fetch_release.py`: the verification report's checks and the native-test results |
| `release_meta.json` | the GitHub API for the repository (licence, creation date) plus counts above | `fetch_release.py` |
| `recompute.json` | written by `recompute.py` | every derived number and check |

Raw downloads (the 2.6 MB session export, the 15 MB tree listing, index files) stay in the cache directory given to `fetch_release.py`, not in the repository.

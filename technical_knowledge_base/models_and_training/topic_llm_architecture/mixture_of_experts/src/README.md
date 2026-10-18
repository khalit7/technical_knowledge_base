# Mixture of experts: page source

`sh build.sh` writes `../index.html`, the whole Notion page "Mixture of experts: routers, load balancing, fine-grained and
shared experts, expert parallelism" (https://app.notion.com/p/3fd5c17b0d0d81fda06bf955af7c2b58), a child of Topic:
llm-architecture. Built 2026-10-18 with the explainer-page skill (`page-kinds/topic-child.md`); floor: the Topic: llms
"Deeper: inside an MoE" tab (`topic_llms/src/parts/35_*`), every claim accounted for in `coverage.md`.

## Tabs
| Tab | id | What |
|---|---|---|
| Reading | `t-read` | 0 one screen (choices table, measured summary), 1 why experts (to-scale stored vs used), 2 the router (four steps, code, one real token through softmax and sigmoid, gradient check, routing styles, drill), 3 collapse and balancing (measured loads, Switch loss, transformers' pooled loss, device-level loss, z-loss, bias, scope, drill), 4 capacity and drops (measured sweep and batch effect, dropless), 5 fine-grained and shared (DeepSeekMoE evidence, measured, latent experts), 6 dense vs MoE measured, 7 expert parallelism (four-process run, costs, links), 8 serving cost, 9 23 real configs and two totals rebuilt, mistakes, interview |
| Router on the running sequence | `t-route` | before/after animation (8 tokens, no balancing / aux loss / bias), the sequence coloured by expert, expert-to-token table |
| Expert load over training | `t-load` | before/after animation over 151 logged steps, heat map per layer, MaxVio / aux / drop curves |
| Dense vs MoE calculator | `t-calc` | `window.CC` (the root's Config calculator core, injected unchanged by build.sh) on 20 configs: parameters, memory, bytes read per decode step against batch, all-to-all bytes, fine-grained split |
| Further reading | `t-more` | |

## How it is built
- `build.sh`: `make_page_data.py` (data part `parts/22_js_mx_0data.js` and `page_text.json` from the recorded outputs in
  `src/`, never from scratch), concatenates parts, injects the root's `33_js_cc_1core.js`, expands `{{text|link}}`, then
  `fill.py` resolves `[[...]]` placeholders in the HTML: `[[ref:key]]` file:line from `code/out/code_refs.json`,
  `[[snip:key]]` code excerpts with their real line numbers, `[[f:key|fmt]]` facts and `[[name]]` text blocks from
  `page_text.json` (written by `page_text.py`). Every measured number in prose therefore comes from the data.
- Runs: `runs/queue.sh` with `runs/runs.txt` (one run per bench-lock hold, MPS cap, `nice`), logs copied into
  `runs/logs/` by `runs/collect.py`. MoE presets train through `runs/fast_moe.py`: the root's `train.py` unchanged with
  `tiny_gpt.MoE.forward` replaced by a batched forward that is the same arithmetic (`runs/check_fast.py`: same choices,
  drops, bias updates and gradients, logits within 2e-6, and the same parameters left without gradient). Reason: the
  per-expert Python loop calls `nonzero()` per expert per layer, each a GPU sync on MPS; the first moe8top2 run had
  not reached step 125 after 5 minutes (killed; `mx_probe_loop` against `mx_probe_fast` measures the two).
- Analyses (CPU, inference only): `analysis/analyse.py` (held-out loss and loads on the train script's 20 fixed
  validation batches, router outputs on the running sequence, capacity-factor and batch-size sweeps, top-k at inference,
  masking the top expert, the shared expert off, expert-to-token tables; it re-implements `MoE.forward` with these
  interventions and checks the plain case equals the original exactly), `code/grad_check.py`, `code/hf_aux_check.py`,
  `code/hf_checks.py`, `ep/ep_alltoall.py` (four gloo processes), `inputs/moe_configs.py` (router fields of the root
  map's configs), `analysis/router_8tok.py` (the root's 8-token file: `analysis/out/router_probs_8tok.json`, moe8top2, block 2, chosen as the layer with the most distinct first choices among tokens 1 to 8).
- `finish.sh` runs all of the above after the GPU queue and builds.
- Checks: `check_controls.mjs` (every control, 390 px dark, 920 px light, reduced motion), `check_data.py` (the page
  embeds exactly the recorded data; prose numbers match), the repo's `html_utils/checkpage.sh`.

## Departures from the child-page shape, and why
- The Reading tab holds the measured comparison (section 6) rather than a separate runs tab: the runs are few and each
  belongs to the mechanism it measures (collapse in 3, drops in 4, shared experts in 5).
- The network side of expert parallelism (all-to-all algorithms, NVLink and InfiniBand, layouts) is linked, not
  repeated: Interconnects and scaling and Distributed Training own it. This page keeps what the MoE design controls
  (dispatch shapes, k and d, group-limited routing, imbalance) and runs a real expert-parallel layer.
- Training uses an equivalent batched MoE forward (above), stated on the page; the tiny GPT's own code is what is quoted
  because it defines the arithmetic.

# Pipeline lab (tab `t-pipe` of Topic: rag-and-retrieval)

> **Retired tab, kept runs (2026-10-24).** The Pipeline lab tab this folder built was retired when the topic was closed to the teaching contract: every stage it measured is taught, with these runs, on the child page that owns it. The scripts and `out/` stay because the child pages import and read them; `make_data.py`, `check_numbers.py` and `check_tab.mjs` (which built and checked the tab) moved to `../retired/pipe/` and the tab's parts to `../retired/parts/` (paths inside them assume their old folders).

The tab's parts are `../parts/31_tab_pip_*.html` (text and layout), `../parts/31_js_pip_*.js` (behaviour) and `../parts/31_js_pip_0data.js` (data, generated). Every id and class is prefixed `pip-`; CSS is scoped under `#t-pipe`.

## How to rerun

All scripts use the running example's loader (`../data/load.py`) and the shared env:

```sh
export RAG_SCRATCH=<the shared rag setup folder>
P="$RAG_SCRATCH/venv/bin/python -I -B"
# deterministic, no lock
$P fusion.py; $P fusion_tune.py; $P filter.py; $P rerank.py
$P chunk_eval.py --write-chunks           # chunk files for chunkers.STRATEGIES, BM25 scores
# MPS or MLX: hold the bench lock ($RAG_SCRATCH/../inf/lock.sh acquire bench pip)
$P rerank_extra.py qwen3-reranker-0.6b hybrid 30   # pairs the setup did not score
$P prompt_tune.py                         # answer prompt chosen on SciFact train (out/prompt_tune.json)
$P e2e_gen.py; $P e2e_eval.py; $P funnel.py 70
$P qtrans_gen.py; $P qtrans_eval.py bm25; $P qtrans_eval.py bge-small; $P qtrans_eval.py qwen3-emb-0.6b
$P semantic.py; $P embed_chunks.py bge-small <strategies...>; $P embed_chunks.py qwen3-emb-0.6b fixed-256-32 structure-256
$P contextual.py; $P embed_chunks.py bge-small fixed-256-32+ctx; $P chunk_eval.py fixed-256-32+ctx fixed-256-32@sub
$P latency.py
$P chunk_explorer.py; $P make_data.py     # then sh ../build.sh
$P check_numbers.py                       # prose numbers against out/*.json, page embeds the data
node check_tab.mjs ../../index.html <screenshot folder>
```

Small results land in `out/*.json` (committed); large intermediates (chunk files, vectors, generator caches) in `$RAG_SCRATCH/pipe/`.

## Inputs beyond the shared setup

- Original SciFact release (labels and evidence ids of the 300 test claims, which BEIR's qrels drop): `https://scifact.s3-us-west-2.amazonaws.com/release/latest/data.tar.gz`, downloaded 2026-10-14 under the download lock, sha256 `11c621288d41ac144d29b13b0f8503b3820b7d6e8b1f6ff24dff335c196d76be`, extracted to `$RAG_SCRATCH/pipe/scifact_orig/`. BEIR's test qrels equal the release's evidence documents for 175 claims and its cited documents for the other 125 (the 112 NEI claims and 13 more).
- Generator: Qwen3-1.7B GGUF Q4_K_M in llama-server (port 8200) from the inference topic's model store (see `gen.py`; the MLX build was missing from the store on the day of the runs).
- LangChain SemanticChunker defaults checked in langchain-experimental main, `text_splitter.py` (2026-10-14): buffer_size 1, percentile 95. HyDE's SciFact prompt: texttron/hyde `src/hyde/promptor.py`. Contextual retrieval prompt: anthropic.com/news/contextual-retrieval.
- `out/e2e_p1.json` keeps the end-to-end run with the first answer prompt (the model answered NOT ENOUGH INFO almost always), for the record.

Departure from the method: none of substance; the tab follows the brief's section list.

## Notes

See `viz_ideas.md` for the visuals built and rejected.

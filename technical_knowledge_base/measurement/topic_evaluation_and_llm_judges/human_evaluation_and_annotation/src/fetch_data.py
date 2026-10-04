"""Download the raw annotation sets this page uses into a cache directory (not committed; default ./_cache).

  1. MMLU-Redux 2.0 (edinburgh-dawg/mmlu-redux-2.0, CC BY 4.0): re-annotated MMLU questions for six subjects.
  2. Open LLM Leaderboard v1 per-question details (open-llm-leaderboard-old/details_<model>): the 5-shot
     log-likelihoods of 18 open models on the same MMLU subjects (lm-evaluation-harness, hendrycksTest-<subject>).
  3. MT-Bench human judgments (lmsys/mt_bench_human_judgments, split "human", CC BY 4.0): 3,355 expert and author votes.
  4. HelpSteer2 disagreements (nvidia/HelpSteer2, disagreements/disagreements.jsonl.gz, CC BY 4.0): every
     individual 0-4 rating on five attributes.

Run: uv run --with pandas --with pyarrow python3 fetch_data.py [cache_dir]   (then mk_data.py with the same cache_dir)
"""
import json, os, sys, time, urllib.request, urllib.parse

CACHE = sys.argv[1] if len(sys.argv) > 1 else '_cache'
os.makedirs(os.path.join(CACHE, 'oll'), exist_ok=True)
os.makedirs(os.path.join(CACHE, 'redux'), exist_ok=True)

SUBJECTS = ['virology', 'college_chemistry', 'abstract_algebra', 'global_facts', 'conceptual_physics', 'high_school_biology']
MODELS = ["meta-llama/Llama-2-70b-hf", "meta-llama/Llama-2-13b-hf", "mistralai/Mistral-7B-v0.1",
          "mistralai/Mixtral-8x7B-v0.1", "tiiuae/falcon-40b", "tiiuae/falcon-7b", "01-ai/Yi-34B", "Qwen/Qwen-72B",
          "huggyllama/llama-65b", "mosaicml/mpt-30b", "EleutherAI/gpt-j-6b", "google/gemma-7b",
          "deepseek-ai/deepseek-llm-67b-base", "microsoft/phi-2", "Qwen/Qwen-14B",
          "mistralai/Mistral-7B-Instruct-v0.2", "HuggingFaceH4/zephyr-7b-beta", "lmsys/vicuna-13b-v1.5"]


def get(url):
    for k in range(5):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return json.load(r)
        except Exception:
            time.sleep(3 * (k + 1))
    raise RuntimeError(url)


def save(url, path):
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)


# 1. MMLU-Redux rows (100 per subject). The datasets-server rate-limits after about 35 calls: six are fine.
for s in SUBJECTS:
    p = os.path.join(CACHE, 'redux', s + '.json')
    if not os.path.exists(p):
        d = get('https://datasets-server.huggingface.co/rows?dataset=edinburgh-dawg/mmlu-redux-2.0&config=%s&split=test&offset=0&length=100' % s)
        json.dump([r['row'] for r in d['rows']], open(p, 'w'))

# 2. Open LLM Leaderboard v1 details: the latest run folder holding hendrycksTest-virology; other subjects from the same run.
runs = {}
for m in MODELS:
    repo = 'open-llm-leaderboard-old/details_' + m.replace('/', '__')
    tree = get('https://huggingface.co/api/datasets/%s/tree/main' % repo)
    for d in sorted((x['path'] for x in tree if x['type'] == 'directory'), reverse=True):
        t = get('https://huggingface.co/api/datasets/%s/tree/main/%s' % (repo, urllib.parse.quote(d)))
        v = [x['path'] for x in t if 'hendrycksTest-virology' in x['path']]
        if v:
            runs[m] = v[0]
            break
    for s in SUBJECTS:
        q = runs[m].replace('hendrycksTest-virology', 'hendrycksTest-' + s)
        save('https://huggingface.co/datasets/%s/resolve/main/%s' % (repo, urllib.parse.quote(q)),
             os.path.join(CACHE, 'oll', '%s__%s.parquet' % (s, m.replace('/', '__'))))
    print('ok', m, runs[m], flush=True)
json.dump(runs, open(os.path.join(CACHE, 'oll_runs.json'), 'w'), indent=1)

# 3. MT-Bench human judgments; 4. HelpSteer2 disagreements
save('https://huggingface.co/api/datasets/lmsys/mt_bench_human_judgments/parquet/default/human/0.parquet', os.path.join(CACHE, 'mtb_human.parquet'))
save('https://huggingface.co/datasets/nvidia/HelpSteer2/resolve/main/disagreements/disagreements.jsonl.gz', os.path.join(CACHE, 'hs2_disagreements.jsonl.gz'))
print('done')

"""Extract the two real run logs into data/runs.json (for the Reading animation and the log tab), and copy
trimmed logs into data/ (one lm-eval results file, one lm-eval sample record, one Inspect sample).

Usage (harness venv, for the tokenizer): python mk_runs.py <runs dir> data
"""
import glob, json, os, sys
from transformers import AutoTokenizer
RUNS, OUT = sys.argv[1], sys.argv[2]
MODEL = glob.glob(os.path.expanduser('~/.cache/huggingface/hub/models--Qwen--Qwen2.5-0.5B-Instruct/snapshots/*/'))[0]
tok = AutoTokenizer.from_pretrained(MODEL)
ntok = lambda s: len(tok(s)['input_ids'])

t = lambda n: int(open(os.path.join(RUNS, n)).read())
lm_dir = glob.glob(os.path.join(RUNS, 'lmeval', '*'))[0]
res_f = glob.glob(os.path.join(lm_dir, 'results_*.json'))[0]
smp_f = glob.glob(os.path.join(lm_dir, 'samples_gsm8k_*.jsonl'))[0]
results = json.load(open(res_f))
samples = [json.loads(l) for l in open(smp_f)]
ins_f = glob.glob(os.path.join(RUNS, 'inspect', '*.json'))[0]
ilog = json.load(open(ins_f))

items = {}
for r in samples:
    d = items.setdefault(r['doc_id'], {'id': r['doc_id'], 'question': r['doc']['question'], 'gold': r['doc']['answer'].split('####')[-1].strip()})
    d.setdefault('lm', {})
    d['lm']['context'] = r['arguments']['gen_args_0']['arg_0'] if isinstance(r['arguments'], dict) else r['arguments'][0][0]
    d['lm']['gen_kwargs'] = r['arguments']['gen_args_0']['arg_1'] if isinstance(r['arguments'], dict) else r['arguments'][0][1]
    d['lm']['output'] = r['resps'][0][0]
    d['lm'][r['filter']] = {'filtered': r['filtered_resps'][0], 'exact_match': r['exact_match']}
    d['lm']['hashes'] = {k: r[k] for k in ('doc_hash', 'prompt_hash', 'target_hash')}
    d['lm']['record_bytes'] = d['lm'].get('record_bytes', 0) + len(json.dumps(r).encode())
q2 = {v['question']: k for k, v in items.items()}
for s in ilog['samples']:
    inp = s['input'] if isinstance(s['input'], str) else s['input'][-1]['content']
    d = items[q2[inp]]
    msgs = []
    for m in s['messages']:
        c = m['content'] if isinstance(m['content'], str) else ''.join(x.get('text', '') for x in m['content'])
        msgs.append({'role': m['role'], 'content': c})
    u = list(s['model_usage'].values())[0]
    d['in'] = {'messages': msgs, 'output': msgs[-1]['content'], 'score': s['scores']['match']['value'],
               'answer': s['scores']['match'].get('answer'), 'events': [e['event'] for e in s['events']],
               'usage': {'input': u['input_tokens'], 'output': u['output_tokens']},
               'total_time': s.get('total_time'), 'working_time': s.get('working_time'),
               'record_bytes': len(json.dumps(s).encode()), 'id': s['id'],
               'stop_reason': s['output']['choices'][0].get('stop_reason'),
               # Inspect's hf provider logs the padded batch shape as usage; count the real tokens too
               'real': {'input': ntok(tok.apply_chat_template([{'role': m['role'], 'content': m['content']} for m in msgs[:-1]], add_generation_prompt=True, tokenize=False)),
                        'output': ntok(msgs[-1]['content'])}}
for d in items.values():
    d['lm']['prompt_tokens'] = ntok(d['lm']['context'])
    d['lm']['output_tokens'] = ntok(d['lm']['output'])

lm_time = t('lmeval_t1') - t('lmeval_t0'); in_time = t('inspect_t1') - t('inspect_t0')
summary = {
 'lm': {'results': {k: v for k, v in results['results']['gsm8k'].items()}, 'n_samples': results.get('n-samples'),
        'wall_s': lm_time, 'results_bytes': os.path.getsize(res_f), 'samples_bytes': os.path.getsize(smp_f),
        'versions': results.get('versions'), 'n_shot': results.get('n-shot'), 'git_hash': results.get('git_hash'),
        'lm_eval_version': results.get('lm_eval_version'), 'transformers_version': results.get('transformers_version'),
        'chat_template_sha': results.get('chat_template_sha'), 'fewshot_seed': results.get('config', {}).get('fewshot_seed'),
        'model_args': results.get('config', {}).get('model_args')},
 'in': {'results': ilog['results'], 'stats': ilog['stats'], 'wall_s': in_time, 'log_bytes': os.path.getsize(ins_f),
        'eval': {k: ilog['eval'].get(k) for k in ('task', 'task_version', 'task_args', 'model', 'model_args', 'model_generate_config', 'packages', 'revision', 'dataset', 'config', 'created', 'task_file', 'metadata')}}
}
json.dump({'items': [items[k] for k in sorted(items)], 'summary': summary}, open(os.path.join(OUT, 'runs.json'), 'w'), indent=1)
# trimmed raw logs for the log tab (first item only, contexts kept)
json.dump(results, open(os.path.join(OUT, 'lmeval_results.json'), 'w'), indent=1)
open(os.path.join(OUT, 'lmeval_sample0.jsonl'), 'w').write(''.join(json.dumps(r) + '\n' for r in samples if r['doc_id'] == 0))
first = ilog['eval']['dataset']['sample_ids'][0]
ex = dict(ilog); ex['samples'] = [x for x in ilog['samples'] if x['id'] == first]
json.dump(ex, open(os.path.join(OUT, 'inspect_log_sample0.json'), 'w'), indent=1)
print('items', len(items), 'lm wall', lm_time, 'inspect wall', in_time)

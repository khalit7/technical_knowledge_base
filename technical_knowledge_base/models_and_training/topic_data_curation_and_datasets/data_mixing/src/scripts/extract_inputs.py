"""Cut the small published inputs this page uses into src/inputs/ (run once; needs the scratch copies).

Env MX2_SCRATCH = <scratch>/dc (the topic's shared scratch dir). Reads:
  mix2/papers/<arxiv id>.txt  (arXiv HTML converted to text by mix2/h2t.py, fetched 2026-10-14)
  src/regmix (git clone sail-sg/regmix @ dd9d1c3b2d7c1756b1a90f0ad7603068e9856cc6)
  src/doremi (git clone sangmichaelxie/doremi @ 7cde52d1848737aa967ecbdb9e643cf334de160d)
  mix2/smollm/stage*.yaml (huggingface/smollm @ 438be18dae658a638f3a6976fdf5190bb6d68619, text/pretraining/smollm3/)
"""
import json, os, re, csv, shutil
S = os.environ['MX2_SCRATCH']
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
os.makedirs(OUT, exist_ok=True)
def txt(i): return open(f'{S}/mix2/papers/{i}.txt').read()

# 1. The Pile, Table 1 (arXiv 2101.00027v1)
t = txt('2101.00027'); a = t.index('Component |'); b = t.index('Table 1: Overview')
cells = [c.strip() for c in t[a:b].replace('\n', ' ').split('|')]
cells = [c for c in cells if c]
head, rows = cells[:6], []
i = 6
while i + 6 <= len(cells):
    r = cells[i:i+6]; i += 6
    rows.append({'name': r[0].replace('†', '').strip(), 'pmd': r[0].endswith('†'),
                 'raw_gib': float(r[1].split()[0]), 'weight_pct': float(r[2].rstrip('%')) if r[2] else None,
                 'epochs': float(r[3]) if r[3] else None, 'eff_gib': float(r[4].split()[0]), 'mean_doc_kib': float(r[5].split()[0])})
json.dump({'source': 'The Pile, Table 1, arXiv 2101.00027v1 (HTML), read 2026-10-14',
           'note': 'Weight = percent of bytes in the final dataset; Epochs = passes per Pile epoch; sizes in GiB before held-out sets',
           'rows': rows}, open(f'{OUT}/pile_table1.json', 'w'), indent=1)
print('pile rows', len(rows), rows[-1]['name'])

# 2. DoReMi Table 1 and the repo's baseline configs
t = txt('2305.10429'); a = t.index('Table 1:', t.index('Domain weights on The Pile') - 400); b = t.index('Table 2:', a)
seg = t[a:b].replace('\n', ' ')
dr = {m.group(1).replace('Domain Baseline DoReMi (280M) Difference', '').strip(): (float(m.group(2)), float(m.group(3))) for m in re.finditer(r'([A-Za-z][A-Za-z0-9 ()\-]+?) (0\.\d{4}) (0\.\d{4}) [+-]0\.\d{4}', seg)}
cfg = {}
for name in ['pile_baseline_256kvocab', 'pile_baseline_50kvocab', 'pile_baseline_50kvocab_nopack', 'pile_doremi_280M_256kvocab_paper', 'pile_doremi_r1_120M_ref:pile_baseline_50kvocab_nopack_120M']:
    cfg[name] = json.load(open(f'{S}/src/doremi/configs/{name}.json'))['train_domain_weights']
json.dump({'source': 'DoReMi Table 1, arXiv 2305.10429v4 (HTML), read 2026-10-14; configs from github.com/sangmichaelxie/doremi @ 7cde52d (configs/*.json)',
           'table1': {k: {'baseline': v[0], 'doremi280m': v[1]} for k, v in dr.items()}, 'configs': cfg},
          open(f'{OUT}/doremi_weights.json', 'w'), indent=1)
print('doremi domains', len(dr))

# 3. RegMix released data (MIT): copy the CSVs as they are
os.makedirs(f'{OUT}/regmix_data', exist_ok=True)
for f in os.listdir(f'{S}/src/regmix/data'):
    if f.endswith('.csv'): shutil.copy(f'{S}/src/regmix/data/{f}', f'{OUT}/regmix_data/{f}')
mix = {}
import yaml
for f in ['human', 'doremi', 'regmix', 'pile_cc_only']:
    mix[f] = yaml.safe_load(open(f'{S}/src/regmix/mixture_config/config_1b/{f}.yaml'))['train']
json.dump({'source': 'github.com/sail-sg/regmix @ dd9d1c3 mixture_config/config_1b/*.yaml', 'mixtures': mix}, open(f'{OUT}/regmix_1b_mixtures.json', 'w'), indent=1)

# 4. SmolLM3 stage configs: dataset folders and weights per data stage
st = []
for f in ['stage1_8T', 'stage2_8T_9T', 'stage3_9T_11T']:
    y = yaml.safe_load(open(f'{S}/mix2/smollm/{f}.yaml'))
    tok = y['parallelism']['dp'] * y['tokens']['micro_batch_size'] * y['tokens']['sequence_length'] * y['tokens']['batch_accumulation_per_replica']
    for ds in y['data_stages']:
        d = ds['data']['dataset']
        st.append({'file': f, 'name': ds['name'], 'start_step': ds['start_training_step'],
                   'folders': [p.rstrip('/').split('/datasets/')[-1] for p in d['dataset_folder']], 'weights': d['dataset_weights'],
                   'tokens_per_step': tok, 'train_steps': y['tokens']['train_steps'],
                   'lr_decay_start': y['optimizer']['learning_rate_scheduler']['lr_decay_starting_step']})
json.dump({'source': 'github.com/huggingface/smollm @ 438be18 text/pretraining/smollm3/stage*.yaml', 'stages': st}, open(f'{OUT}/smollm3_stages.json', 'w'), indent=1)
print('smollm3 stages', [(s['file'], s['name'], s['start_step'], len(s['folders'])) for s in st])

"""Small seeded samples of public synthetic pretraining sets (one row group per set, no full downloads).
usage: DC_SCRATCH=<scratch>/dc HF_HOME=<scratch>/dc/hf python -I get_synth_samples.py
Writes $DC_SCRATCH/data/syn/samples/<name>.parquet and appends a manifest line per set to
$DC_SCRATCH/data/syn/samples/manifest.jsonl (repo, revision, file, row group, rows, sha256)."""
import os, json, random, hashlib, pyarrow as pa, pyarrow.parquet as pq
from huggingface_hub import HfFileSystem, HfApi
fs, api = HfFileSystem(), HfApi()
OUT = os.path.join(os.environ['DC_SCRATCH'], 'data', 'syn', 'samples'); os.makedirs(OUT, exist_ok=True)
MAN = os.path.join(OUT, 'manifest.jsonl')
N = 1000
# name, repo, pinned revision, path prefix (directory of parquet files)
SETS = [
    ('cosmo_web_v1', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/web_samples_v1/'),
    ('cosmo_web_v2', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/web_samples_v2/'),
    ('cosmo_stanford', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/stanford/'),
    ('cosmo_stories', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/stories/'),
    ('cosmo_wikihow', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/wikihow/'),
    ('cosmo_openstax', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/openstax/'),
    ('cosmo_khanacademy', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/khanacademy/'),
    ('cosmo_auto_math', 'HuggingFaceTB/cosmopedia', '0ae6ec63f91742bd2d1eaef4f02232c55d719385', 'data/auto_math_text/'),
    ('cosmo_v2', 'HuggingFaceTB/smollm-corpus', '3ba9d605774198c5868892d7a8deda78031a781f', 'cosmopedia-v2/'),
    ('tinystories', 'roneneldan/TinyStories', 'f54c09fd23315a6f9c86f9dc80f725de7d8f9c64', 'data/validation'),
    ('megamath_qa_llama', 'LLM360/MegaMath', '3cbc64616594d6bc8759abaa0b2a71858f880f0d', 'megamath-qa/llama-3.3/'),
    ('megamath_trans_code', 'LLM360/MegaMath', '3cbc64616594d6bc8759abaa0b2a71858f880f0d', 'megamath-translated-code/'),
    ('megamath_text_code', 'LLM360/MegaMath', '3cbc64616594d6bc8759abaa0b2a71858f880f0d', 'megamath-text-code-block/'),
]
have = {json.loads(l)['name'] for l in open(MAN)} if os.path.exists(MAN) else set()
for name, repo, rev, prefix in SETS:
    if name in have: print('have', name); continue
    d = prefix.rstrip('/') if prefix.endswith('/') else prefix.rsplit('/', 1)[0]
    fl = sorted(f.path for f in api.list_repo_tree(repo, repo_type='dataset', revision=rev, path_in_repo=d, recursive=True)
                if getattr(f, 'size', None) is not None and f.path.endswith('.parquet') and f.path.startswith(prefix))
    rng = random.Random(name)  # seeded by set name
    path = rng.choice(fl)
    pf = pq.ParquetFile(fs.open(f'datasets/{repo}@{rev}/{path}', block_size=2**22))
    g = rng.randrange(pf.metadata.num_row_groups)
    t = pf.read_row_group(g)
    if t.num_rows > N: t = t.take(sorted(rng.sample(range(t.num_rows), N)))
    out = os.path.join(OUT, name + '.parquet'); pq.write_table(t, out, compression='zstd')
    sha = hashlib.sha256(open(out, 'rb').read()).hexdigest()
    rec = dict(name=name, repo=repo, revision=rev, file=path, row_group=g, row_groups_in_file=pf.metadata.num_row_groups,
               files_in_prefix=len(fl), rows=t.num_rows, columns=t.column_names, sha256=sha, bytes=os.path.getsize(out),
               mode='one seeded random row group of one seeded random file; rows subsampled to %d if larger' % N)
    open(MAN, 'a').write(json.dumps(rec) + '\n'); print(rec, flush=True)

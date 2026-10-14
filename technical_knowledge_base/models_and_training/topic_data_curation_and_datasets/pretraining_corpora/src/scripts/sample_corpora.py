"""Take a small, documented sample of each public corpus the page compares.

Reads only the first N documents of one named file per corpus (row groups by HTTP range for parquet,
a streamed prefix for json.gz / jsonl.zst), so each sample costs megabytes, not the whole shard.
The first N rows of one file are NOT a random sample of the corpus: files are ordered (by crawl dump,
by language, by article id), and the page says so next to every measured number.

Usage (shared venv, CPU only):
  DC_SCRATCH=<scratch>/dc HF_HOME=$DC_SCRATCH/hf python -I sample_corpora.py [name ...]
Writes $DC_SCRATCH/data/pc/samples/<name>.jsonl (text, url, meta) and appends to samples_manifest.json.
"""
import gzip, io, json, os, sys, time, hashlib
from huggingface_hub import HfFileSystem, HfApi

SCR = os.environ['DC_SCRATCH']
OUT = os.path.join(SCR, 'data', 'pc', 'samples')
os.makedirs(OUT, exist_ok=True)

# name: (repo, path in repo, kind, n docs, text column, url column or None, extra columns kept)
SPECS = {
    'c4_en':       ('allenai/c4', 'en/c4-train.00000-of-01024.json.gz', 'jsonl.gz', 2000, 'text', 'url', ['timestamp']),
    'refinedweb':  ('tiiuae/falcon-refinedweb', 'data/train-00000-of-05534-b8fc5348cbe605a5.parquet', 'parquet', 2000, 'content', 'url', ['dump', 'timestamp']),
    'zyda2_dolmacc': ('Zyphra/Zyda-2', 'data/dolma-cc_crossdeduped-filtered/part.0.parquet', 'parquet', 2000, 'text', None, ['source']),
    'comma_cccc':  ('common-pile/comma_v0.1_training_dataset', None, 'jsonl.gz', 2000, 'text', None, ['source', 'metadata']),
    'pile_uncopyrighted': ('monology/pile-uncopyrighted', 'train/00.jsonl.zst', 'jsonl.zst', 3000, 'text', None, ['meta']),
    'finepdfs_en': ('HuggingFaceFW/finepdfs', 'data/eng_Latn/train/000_00000.parquet', 'parquet', 600, 'text', 'url', ['dump', 'token_count', 'page_average_lid_score']),
    'finemath_4plus': ('HuggingFaceTB/finemath', 'finemath-4plus/train-00000-of-00064.parquet', 'parquet', 2000, 'text', 'url', ['score', 'int_score', 'token_count']),
    'open_web_math': ('open-web-math/open-web-math', 'data/train-00000-of-00114-5a023365406cb9c4.parquet', 'parquet', 2000, 'text', 'url', ['date']),
    'pes2o_v2':    ('allenai/peS2o', 'data/v2/train-00000-of-00020.json.gz', 'jsonl.gz', 1000, 'text', None, ['source', 'id']),
    'wikipedia_en': ('wikimedia/wikipedia', '20231101.en/train-00000-of-00041.parquet', 'parquet', 2000, 'text', 'url', ['title']),
    'stackv2_edu': ('common-pile/comma_v0.1_training_dataset', 'stackv2_edu/stackv2_edu.chunk.00.jsonl.gz', 'jsonl.gz', 2000, 'text', None, ['metadata']),
    'fineweb2_fra': ('HuggingFaceFW/fineweb-2', 'data/fra_Latn/train/000_00000.parquet', 'parquet', 2000, 'text', 'url', ['dump', 'language_score', 'minhash_cluster_size']),
    # DCLM-Baseline: crawls end in 2022, so it has no documents from the running example's 2024 crawl; first rows of one shard
    'dclm_baseline': ('mlfoundations/dclm-baseline-1.0-parquet', 'filtered/OH_eli5_vs_rw_v2_bigram_200k_train/fasttext_openhermes_reddit_eli5_vs_rw_v2_bigram_200k_train/processed_data/global-shard_01_of_10/local-shard_0_of_10/shard_00000000_processed.parquet', 'parquet', 2000, 'text', 'url', ['fasttext_openhermes_reddit_eli5_vs_rw_v2_bigram_200k_train_prob', 'language_id_whole_page_fasttext']),
    # Nemotron-CC v1 is hosted by Common Crawl (no Hugging Face copy): first rows of part-00000 of the running example's crawl, per bucket
    'nemo_high': ('CC', 'contrib/Nemotron/Nemotron-CC/data-jsonl/quality=high/kind=actual/kind2=actual/CC-MAIN-2024-30-part-00000.jsonl.zstd', 'url.zstd', 1000, 'text', 'url', ['warc_record_id']),
    'nemo_medium': ('CC', 'contrib/Nemotron/Nemotron-CC/data-jsonl/quality=medium/kind=actual/kind2=actual/CC-MAIN-2024-30-part-00000.jsonl.zstd', 'url.zstd', 1000, 'text', 'url', ['warc_record_id']),
    'nemo_low': ('CC', 'contrib/Nemotron/Nemotron-CC/data-jsonl/quality=low/kind=actual/kind2=actual/CC-MAIN-2024-30-part-00000.jsonl.zstd', 'url.zstd', 1000, 'text', 'url', ['warc_record_id']),
    'nemo_hq_synth_qa': ('CC', 'contrib/Nemotron/Nemotron-CC/data-jsonl/quality=high/kind=synthetic/kind2=diverse_qa_pairs/CC-MAIN-2024-30-part-00000.jsonl.zstd', 'url.zstd', 1000, 'text', 'url', ['warc_record_id']),
}


def first_file(fs, repo, sub):
    files = sorted(x for x in fs.ls(f'datasets/{repo}/{sub}', detail=False) if x.endswith('.gz'))
    return files[0].split(f'datasets/{repo}/', 1)[1]


def rows_parquet(fs, repo, path, n, cols):
    import pyarrow.parquet as pq
    f = fs.open(f'datasets/{repo}/{path}', 'rb', block_size=8 << 20)
    pf = pq.ParquetFile(f)
    have = [c for c in cols if c in pf.schema_arrow.names]
    got = 0
    for rg in range(pf.num_row_groups):
        t = pf.read_row_group(rg, columns=have).to_pylist()
        for r in t:
            yield r
            got += 1
            if got >= n:
                return


def rows_lines(fs, repo, path, n, kind):
    if repo == 'CC':
        import urllib.request
        f = urllib.request.urlopen('https://data.commoncrawl.org/' + path, timeout=120)
    else:
        f = fs.open(f'datasets/{repo}/{path}', 'rb', block_size=4 << 20)
    if kind == 'jsonl.gz':
        stream = gzip.GzipFile(fileobj=f)
    else:
        import zstandard
        stream = zstandard.ZstdDecompressor().stream_reader(f)
    got = 0
    for line in io.TextIOWrapper(stream, encoding='utf-8'):
        if not line.strip():
            continue
        yield json.loads(line)
        got += 1
        if got >= n:
            return


def main(names):
    fs = HfFileSystem()
    api = HfApi()
    man_p = os.path.join(OUT, 'samples_manifest.json')
    man = json.load(open(man_p)) if os.path.exists(man_p) else {}
    for name in names:
        repo, path, kind, n, tcol, ucol, extra = SPECS[name]
        if path is None and name == 'dclm_baseline':
            sub = 'filtered/OH_eli5_vs_rw_v2_bigram_200k_train'
            path = sorted(x for x in fs.find(f'datasets/{repo}/{sub}', maxdepth=3) if x.endswith('.parquet'))[0].split(f'datasets/{repo}/', 1)[1]
        elif path is None:
            path = first_file(fs, repo, 'cccc')
        sha = api.dataset_info(repo).sha if repo != 'CC' else 'Common Crawl contrib (no revision; file name pinned)'
        t0 = time.time()
        cols = [tcol] + ([ucol] if ucol else []) + extra
        it = rows_parquet(fs, repo, path, n, cols) if kind == 'parquet' else rows_lines(fs, repo, path, n, 'jsonl.zst' if kind == 'url.zstd' else kind)
        out_p = os.path.join(OUT, name + '.jsonl')
        k = 0
        h = hashlib.sha256()
        with open(out_p, 'w') as o:
            for r in it:
                rec = {'text': r.get(tcol) or '', 'url': (r.get(ucol) if ucol else None)}
                meta = {c: r.get(c) for c in extra if c in r}
                if ucol is None and isinstance(r.get('metadata'), dict):
                    rec['url'] = r['metadata'].get('url')
                rec['meta'] = meta
                line = json.dumps(rec, ensure_ascii=False, default=str) + '\n'
                h.update(line.encode())
                o.write(line)
                k += 1
        man[name] = {'repo': repo, 'revision': sha, 'file': path, 'kind': kind, 'n_docs': k,
                     'sha256_of_sample': h.hexdigest(), 'bytes': os.path.getsize(out_p),
                     'taken': time.strftime('%Y-%m-%d'), 'seconds': round(time.time() - t0, 1),
                     'note': f'first {k} documents of this one file, in file order (not a random sample)'}
        json.dump(man, open(man_p, 'w'), indent=1)
        print(name, k, 'docs', man[name]['bytes'], 'bytes', man[name]['seconds'], 's', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:] or list(SPECS))

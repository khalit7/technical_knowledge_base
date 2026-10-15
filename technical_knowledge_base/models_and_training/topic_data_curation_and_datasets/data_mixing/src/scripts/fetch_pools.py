"""Stream larger per-domain pools for the proxy experiment (pending GPU run, step 1). Network and CPU only.

Same sources, files and revisions as the topic's running-example samples (scratch data/pc/samples/samples_manifest.json),
read in file order until about --tokens GPT-2 tokens per domain (estimated at 4 characters per token), written as JSONL
to $MX2_WORK/pools/<domain>.jsonl, and $MX2_WORK/domains.json pointed at them. Take the download lock first.
"""
import argparse, json, os
from datasets import load_dataset

SRC = {  # domain: (repo, revision, data file, text field)
    'web': ('mlfoundations/dclm-baseline-1.0-parquet', '817d6752765f6a41261085171dd546b104f60626', 'filtered/OH_eli5_vs_rw_v2_bigram_200k_train/fasttext_openhermes_reddit_eli5_vs_rw_v2_bigram_200k_train/processed_data/global-shard_01_of_10/local-shard_0_of_10/shard_0000000*_processed.parquet', 'text'),
    'wiki': ('wikimedia/wikipedia', 'b04c8d1ceb2f5cd4588862100d08de323dccfbaa', '20231101.en/train-0000[0-1]-of-00041.parquet', 'text'),
    'code': ('common-pile/comma_v0.1_training_dataset', '5afc546db324e7f39f297ba757c9a60547151e7c', 'stackv2_edu/stackv2_edu.chunk.0[0-3].jsonl.gz', 'text'),
    'math': ('HuggingFaceTB/finemath', 'e92b25a616738fe95dc186b64dfb19f9c8525594', 'finemath-4plus/train-0000[0-2]-of-00064.parquet', 'text'),
    'papers': ('allenai/peS2o', '636a503e44a3ca1b58e01fb61eab0825cd574de0', 'data/v2/train-0000[0-1]-of-00020.json.gz', 'text'),
}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--tokens', type=float, default=25e6); ap.add_argument('--only')
    a = ap.parse_args()
    work = os.environ['MX2_WORK']; os.makedirs(f'{work}/pools', exist_ok=True); doms = {}
    for name, (repo, rev, files, field) in SRC.items():
        out = f'{work}/pools/{name}.jsonl'; doms[name] = out
        if a.only and name != a.only: continue
        kind = 'parquet' if files.endswith('.parquet') else 'json'   # generic builders: some repos ship loading scripts that datasets 5 refuses
        ds = load_dataset(kind, data_files=f'hf://datasets/{repo}@{rev}/{files}', split='train', streaming=True)
        chars, n = 0, 0
        with open(out, 'w') as f:
            for row in ds:
                t = row[field]
                if not t: continue
                f.write(json.dumps({'text': t}) + '\n'); chars += len(t); n += 1
                if chars >= 4 * a.tokens: break
        print(name, n, 'docs', chars, 'chars')
    json.dump(doms, open(f'{work}/domains.json', 'w'), indent=1)

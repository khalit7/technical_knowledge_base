# Download the three codec checkpoints (pinned revisions) and one LibriSpeech dummy parquet into ~/.cache/huggingface.
from huggingface_hub import snapshot_download, hf_hub_download
PINS = {
    'facebook/encodec_24khz': 'c1dbe2ae3f1de713481a3b3e7c47f357092ee040',
    'descript/dac_44khz': 'c1bc521685adf9cfe247bc39a5ca58917eda1ac4',
    'kyutai/mimi': '89091b3e466eb6a9d11e537bf26b144f194978f7',
}
for repo, rev in PINS.items():
    p = snapshot_download(repo, revision=rev, allow_patterns=['config.json', 'preprocessor_config.json', 'model.safetensors', 'README.md'])
    print('ok', repo, flush=True)
p = hf_hub_download('hf-internal-testing/librispeech_asr_dummy', 'clean/validation-00000-of-00001.parquet', repo_type='dataset', revision='5be91486e11a2d616f4ec5db8d3fd248585ac07a')
print('ok librispeech', flush=True)

# Download the raw inputs this page is built from into a cache directory outside the repository.
# Usage: python3 fetch_inputs.py [cache_dir]   (default: $HP_CACHE or ~/.cache/kb_human_preference)
# Large files (the 3.7 GB public battle log) stay in the cache; mk_inputs.py reduces them into src/inputs/.
import os, sys, subprocess
C = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('HP_CACHE', os.path.expanduser('~/.cache/kb_human_preference'))
os.makedirs(C, exist_ok=True)
SPACE = 'https://huggingface.co/spaces/lmarena-ai/arena-leaderboard/resolve/main/'
LBDS = 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/'
files = {
    # LMArena's own published results (pickles of the leaderboard app), read 2026-10-04
    'elo_results_20240813.pkl': SPACE + 'elo_results_20240813.pkl',
    'elo_results_20240828.pkl': SPACE + 'elo_results_20240828.pkl',
    'leaderboard_table_20240813.csv': SPACE + 'leaderboard_table_20240813.csv',
    # Public battle logs (anonymous votes with token counts; the 0826 file adds markdown counts)
    'clean_battle_20240814_public.json': 'https://storage.googleapis.com/arena_external_data/public/clean_battle_20240814_public.json',
    'cb0826.json': 'https://storage.googleapis.com/arena_external_data/public/clean_battle_20240826_public.json',
    # Arena leaderboard snapshots (CC-BY-4.0), latest split, published 2026-10-02 (text, vision), 2026-10-01 (webdev), 2026-08-24 (search)
}
for c in ['text', 'text_style_control', 'text_factuality', 'webdev', 'search', 'search_style_control', 'vision_style_control']:
    files['lb_%s.parquet' % c] = LBDS + c + '/latest-00000-of-00001.parquet'
for name, url in files.items():
    p = os.path.join(C, name)
    if os.path.exists(p) and os.path.getsize(p) > 0:
        print('have', name); continue
    print('fetch', name, flush=True)
    subprocess.run(['curl', '-s', '-L', '-C', '-', '--retry', '5', '-o', p, url], check=True)
print('cache:', C)

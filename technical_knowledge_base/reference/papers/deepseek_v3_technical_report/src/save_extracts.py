"""Copy the quoted lines this page relies on, verbatim, from sources other than the paper into inputs/external_extracts.txt.
Fetch first (any scratch directory), then run with that directory:
  curl -sL https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json -o config.json
  curl -sL https://raw.githubusercontent.com/deepseek-ai/DeepSeek-V3/main/README.md -o readme.md
  curl -sL https://planetbanatt.net/articles/v3fermi.html -o fermi.html
  curl -sL https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama3_1/MODEL_CARD.md -o llama31.md
  curl -sL https://arxiv.org/html/2407.21783v3 -o llama3.html
  curl -sL -A Mozilla/5.0 https://www.nvidia.com/en-us/data-center/h100/ -o h100.html
  curl -sL https://raw.githubusercontent.com/NVIDIA/TransformerEngine/main/transformer_engine/common/recipe/__init__.py -o te_recipe.py
  curl -sL https://raw.githubusercontent.com/deepseek-ai/DeepGEMM/main/README.md -o deepgemm.md
  python3 save_extracts.py <dir>"""
import html, os, re, sys
D = sys.argv[1]
def text(f):
    s = open(os.path.join(D, f), encoding='utf-8', errors='replace').read()
    if f.endswith('.html'):
        s = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', s, flags=re.S)
        s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\s+', ' ', s)
def grab(f, needle, before=0, after=300):
    t = text(f); i = t.find(needle)
    if i < 0: raise SystemExit('not found in %s: %s' % (f, needle))
    return t[max(0, i - before): i + after].strip()
J = [
 ('https://github.com/deepseek-ai/DeepSeek-V3 (README)', 'readme.md', ['The total size of DeepSeek-V3 models on Hugging Face is 685B', 'This code repository is licensed under', 'Since FP8 training is natively adopted', 'Multi-Token Prediction (MTP) is in development']),
 ('https://planetbanatt.net/articles/v3fermi.html', 'fermi.html', ['Llama 3.1 405B took Meta a reported 30.84M GPU hours', 'this should take \\(2.67M\\) GPU hours', 'H800s have 44% of the communication bandwidth']),
 ('https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md', 'llama31.md', ['Training utilized a cumulative of', '30.84M', 'Llama 3.1 was pretrained on ~15 trillion tokens']),
 ('https://arxiv.org/html/2407.21783v3 (Llama 3 Herd, sections 1 and 3.3.2, Table 4)', 'llama3.html', ['we pre-trained a flagship model with 405B trainable parameters on 15.6T text tokens', 'we achieve an overall BF16 Model FLOPs Utilization', 'GPUs TP CP PP DP Seq. Len.']),
 ('https://www.nvidia.com/en-us/data-center/h100/ (H100 SXM column; starred figures are with sparsity)', 'h100.html', ['BFLOAT16 Tensor Core *', '* With sparsity']),
 ('https://github.com/NVIDIA/TransformerEngine/blob/main/transformer_engine/common/recipe/__init__.py', 'te_recipe.py', ['class Float8BlockScaling(Recipe):', 'NOTE: FP8 block scaling requires split accumulation', 'x_block_scaling_dim: int = 1', 'class MXFP8BlockScaling(Recipe):']),
 ('https://github.com/deepseek-ai/DeepGEMM (README)', 'deepgemm.md', ['DeepGEMM now achieves up to']),
]
out = ['Verbatim extracts, written by save_extracts.py. Whitespace normalised; HTML tags removed.\n']
for url, f, needles in J:
    out.append('== ' + url)
    for n in needles: out.append('  ... ' + grab(f, n) + ' ...')
    out.append('')
open('inputs/external_extracts.txt', 'w').write('\n'.join(out))
print('extracts written', sum(len(n) for _, _, n in J))

"""Parse the paper's Tables 3 and 4 from the arXiv HTML extracts (inputs/table_S7_T3.txt, table_S7_T4.txt) and
write tables.json together with the hand-transcribed small tables and the printed labels of Figures 11 and 12.
Printed values are kept as printed (strings with their precision); '-' means missing in the paper.
usage: python3 mk_tables.py"""
import json, re


def cells(path):
    s = open(path, encoding='utf-8').read().split('\n', 1)[1]
    s = s[:s.index('Table ')]
    return [c.strip() for c in re.split(r'\t\s*\n', s) if c.strip()]


# Table 3: 10 model/mode columns
c3 = cells('inputs/table_S7_T3.txt')
cols = [('DiffusionGemma', 'TD'), ('DiffusionGemma', 'TD (No-think)'), ('DiffusionGemma', 'AR'), ('DiffusionGemma', 'AR (No-think)'),
        ('Gemma 4 26B A4B', 'AR (MTP)'), ('Gemma 4 26B A4B', 'AR (MTP, No-think)'), ('LLaDA 2.1 Flash 100B', 'TD (S Mode)'),
        ('Nemotron Diffusion 14B', 'TD (Diffusion Mode)'), ('Mercury 2', 'High'), ('Mercury 2', 'Medium')]
i = c3.index('Medium') + 1
rows3 = []
while i < len(c3):
    name, vals = c3[i], c3[i + 1:i + 11]
    assert len(vals) == 10, (name, vals)
    rows3.append({'b': name, 'v': [v.replace('−', '-') for v in vals]})
    i += 11
assert rows3[0]['b'] == 'AIME 2026' and rows3[-1]['b'] == 'Average Total Tokens', rows3[-1]
# Table 4: 7 metrics x (think, no-think)
c4 = cells('inputs/table_S7_T4.txt')
i = c4.index('Benchmark') + 1 + 14
rows4 = []
while i < len(c4):
    rows4.append({'b': c4[i], 'v': c4[i + 1:i + 15]}); i += 15
assert len(rows4) == 15 and rows4[-1]['b'] == 'HiddenMath'
T = {
 'source': 'arXiv 2608.00146v1 HTML; Tables 3 and 4 parsed by mk_tables.py, the rest transcribed from the HTML text and the printed labels of Figures 11 and 12',
 't3': {'cols': cols, 'rows': rows3, 'note': 'TPS excludes prefill. DiffusionGemma and Gemma 4 on 1 x H100 (FP8, batch 1); Nemotron 14B on 1 x H100 (bfloat16, batch 1); LLaDA 2.1 Flash 100B on 8 x B200 (bfloat16, batch 1); Mercury 2 via its public API (Appendix E). TPS, TPF and total tokens are averaged over the 7 benchmarks with full coverage (AIME 2026, GPQA Diamond, LiveCodeBench-v6, MGSM, HumanEval, LBPP, Natural2Code). Gemma 4 (MTP) TPS and TPF are measured on SPEED-Bench. Natural2Code and HiddenMath are proprietary, unleaked evals.'},
 't4': {'metrics': ['Score', 'TPF', 'TPS', 'Effective DNS', 'Total Forwards', 'Total Tokens', 'E2E Time (s)'], 'rows': rows4},
 't1': [['Total', '25.2B'], ['Activated', '3.85B'], ['Vision Encoder', '550M'], ['Embedder', '740M'], ['Self-Conditioning', '7.8M'], ['Active / Total Experts', '8 / 128 + 1 shared']],
 't2': [['Canvas Length', '256'], ['Sampler Maximum Denoising Steps', '48'], ['Adaptive Stopping Entropy Threshold', '0.005'], ['Token Selection Entropy Threshold', '0.1'], ['Temperature Schedule (Linear)', '0.8 to 0.4']],
 't5': [['DiffusionGemma', '40.65', '0.00'], ['+ LoRA finetuning', '10.72', '84.40']],
 't6': [['DiffusionGemma', '18.09', '75.6', '10.76'], ['+ LoRA finetuning', '31.57', '76.62', '20.67']],
 't7': {'cols': ['Sudoku (LoRA)', 'Sudoku (Full)', 'PubMedQA'], 'rows': [
   ['LoRA rank', '8', '-', '4'], ['Canvas size', '256', '256', '128'], ['Number of canvases', '1', '1', '2'], ['Prompt length', '256', '256', '1024'],
   ['Batch size', '2', '8', '2'], ['Peak learning rate', '3e-4', '1.125e-4', '1.0e-4'], ['End learning rate', '3e-5', '1.125e-5', '1.0e-5'],
   ['Training steps', '8,000', '2,000', '2,000'], ['Optimizer', 'Adam', 'Adafactor', 'Adam'], ['LR schedule', 'Cosine with warmup', 'Cosine with warmup', 'Cosine with warmup'],
   ['Warmup iterations', '400', '100', '100'], ['Weight decay', '1e-4', '1e-4', '1e-4'], ['Min. hardware', '2 x A100 80GB', '8 x A100 80GB', '2 x A100 80GB']]},
 'f11': {'ops': ['MoE Experts', 'Sampling', 'Attention', 'Shared Expert', 'Attn Output Proj', 'FFN Norm + Route', 'Other'],
         'ar': [1.08, 0.56, 0.45, 0.74, 0.61, 0.46, None], 'dg': [4.66, 3.06, 1.84, 1.12, 1.06, 0.64, None],
         'ratio': ['4.3', '5.5', '4.1', '1.5', '1.7', '1.4', '2.1'], 'tot_ar': 4.01, 'tot_dg': 12.63,
         'note': 'printed labels of Figure 11 (H100, FP8, batch 1, 4,096 input and 1,024 output tokens); the Other segment has no printed value, so it is the total minus the six printed segments'},
 'f12': {'c': [1, 2, 4, 8, 16], 'per_user': ['4.11', '3.01', '2.28', '1.62', '1.22'], 'total': ['4.11', '3.18', '2.38', '1.73', '1.35'],
         'note': 'printed labels of Figure 12(b): DiffusionGemma (16 TPF) over Gemma 4 AR (MTP, draft length 4), PG-19, H100 FP8'},
}
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables.json: t3 rows', len(rows3), 't4 rows', len(rows4))

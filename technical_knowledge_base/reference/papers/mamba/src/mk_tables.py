"""Transcribe the paper's tables into tables.json (printed precision kept as strings where it matters).

Table 3 (zero-shot) is parsed from the arXiv HTML v2 (bold cells read from the markup); the small tables are typed in
from inputs/paper_v2.txt and inputs/table_*.txt, each with its PDF number and HTML anchor (the arXiv HTML renders
several of the PDF's tables as figures and numbers them differently; this page uses the PDF numbers).

  curl -sL https://arxiv.org/html/2312.00752v2 -o /tmp/mamba.html; python3 mk_tables.py /tmp/mamba.html
"""
import html, json, re, sys
s = open(sys.argv[1]).read()
m = re.search(r'<figure id="S4.T1" class="ltx_table".*?</figure>', s, re.S).group(0)
rows = []
for tr in re.findall(r'<tr.*?</tr>', m, re.S):
    cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.S)
    vals = [(html.unescape(re.sub(r'<[^>]+>', '', c)).strip(), 'ltx_font_bold' in c) for c in cells]
    if len(vals) == 11 and vals[0][0] and not vals[0][0].startswith('Model') and vals[1][0] in ('GPT2', 'NeoX', 'OPT'):
        rows.append(vals)
COLS = ['Pile ppl', 'LAMBADA ppl', 'LAMBADA acc', 'HellaSwag acc', 'PIQA acc', 'Arc-E acc', 'Arc-C acc', 'WinoGrande acc', 'Average acc']
BUCKET = [130, 130, 130, 370, 370, 370, 1000, 1000, 1400, 1400, 1400, 1400, 1400, 1400, 2800, 2800, 2800, 2800, 2800, 2800, 7000, 7000, 7000, 7000]
t3 = []
for i, r in enumerate(rows):
    t3.append({'model': r[0][0], 'tok': r[1][0], 'bucket': BUCKET[i],
               'v': [None if c[0] in ('—', '–', '-') else c[0] for c in r[2:]], 'bold': [c[1] for c in r[2:]]})
assert len(t3) == 24, len(t3)
T = {
 '_doc': 'The paper\'s tables, transcribed by mk_tables.py. pdf = the PDF table number; at = the arXiv HTML v2 anchor.',
 't1': {'pdf': 'Table 1', 'at': 'S4.F5', 'title': 'Selective Copying accuracy (%)',
        'rows': [['S4', 'No gate', 'S4', 18.3], ['-', 'No gate', 'S6', 97.0], ['H3', 'H3', 'S4', 57.0], ['Hyena', 'H3', 'Hyena', 30.1],
                 ['-', 'H3', 'S6', 99.7], ['-', 'Mamba', 'S4', 56.4], ['-', 'Mamba', 'Hyena', 28.4], ['Mamba', 'Mamba', 'S6', 99.8]]},
 't11': {'pdf': 'Table 11', 'at': 'A5.T3', 'title': 'Induction heads test accuracy (%) by test length 2^6 .. 2^20; trained at 2^8',
         'note': 'ok = perfect generalisation (printed as a check mark); oom = out of memory (printed as a cross); attention tested only to 2^14',
         'rows': [['MHA-Abs', '137K', ['ok', '99.6', '100.0', '58.6', '26.6', '18.8', '9.8', '10.9', '7.8', 'oom', 'oom', 'oom', 'oom', 'oom', 'oom']],
                  ['MHA-RoPE', '137K', ['ok', 'ok', '100.0', '83.6', '31.3', '18.4', '8.6', '9.0', '5.5', 'oom', 'oom', 'oom', 'oom', 'oom', 'oom']],
                  ['MHA-xPos', '137K', ['ok', 'ok', '100.0', '99.6', '67.6', '25.4', '7.0', '9.0', '7.8', 'oom', 'oom', 'oom', 'oom', 'oom', 'oom']],
                  ['H3', '153K', ['ok', 'ok', '100.0', '80.9', '39.5', '23.8', '14.8', '8.2', '5.9', '6.6', '8.2', '4.7', '8.2', '6.3', '7.4']],
                  ['Hyena', '69M*', ['97.7', 'ok', '100.0', 'ok', '44.1', '12.5', '6.6', '5.1', '7.0', '5.9', '6.6', '6.6', '5.9', '6.3', '9.8']],
                  ['Mamba', '74K', ['ok', 'ok', '100.0'] + ['ok'] * 12]]},
 't3': {'pdf': 'Table 3', 'at': 'S4.T1', 'title': 'Zero-shot evaluations', 'cols': COLS, 'rows': t3,
        'note': 'Pile ppl only for models trained on the Pile with the GPT-NeoX tokenizer; HellaSwag and Arc-C are length-normalised accuracy (Appendix E.2.3).'},
 't4': {'pdf': 'Table 4', 'at': 'S4.F11', 'title': 'SC09 automated metrics', 'cols': ['Params', 'NLL', 'FID', 'IS', 'mIS', 'AM'],
        'lower': [None, True, True, False, False, True],
        'rows': [['SampleRNN', '35.0M', '2.042', '8.96', '1.71', '3.02', '1.76'], ['WaveNet', '4.2M', '1.925', '5.08', '2.27', '5.80', '1.47'],
                 ['SaShiMi', '5.8M', '1.873', '1.99', '5.13', '42.57', '0.74'], ['WaveGAN', '19.1M', None, '2.03', '4.90', '36.10', '0.80'],
                 ['DiffWave', '24.1M', None, '1.92', '5.26', '51.21', '0.68'], ['DiffWave + SaShiMi', '23.0M', None, '1.42', '5.94', '69.17', '0.59'],
                 ['Mamba', '6.1M', '1.852', '0.94', '6.26', '88.54', '0.52'], ['Mamba', '24.3M', '1.860', '0.67', '7.33', '144.9', '0.36'],
                 ['Train data', None, None, '0.00', '8.56', '292.5', '0.16'], ['Test data', None, None, '0.02', '8.33', '257.6', '0.19']]},
 't5': {'pdf': 'Table 5', 'at': 'S4.F11', 'title': 'SC09 ablations (6M parameters): outer and center U-Net blocks', 'cols': ['NLL', 'FID', 'IS', 'mIS', 'AM'],
        'rows': [['S4+MLP', 'MHA+MLP', '1.859', '1.45', '5.06', '47.03', '0.70'], ['S4+MLP', 'S4+MLP', '1.867', '1.43', '5.42', '53.54', '0.65'],
                 ['S4+MLP', 'Mamba', '1.859', '1.42', '5.71', '56.51', '0.64'], ['Mamba', 'MHA+MLP', '1.850', '1.37', '5.63', '58.23', '0.62'],
                 ['Mamba', 'S4+MLP', '1.853', '1.07', '6.05', '73.34', '0.55'], ['Mamba', 'Mamba', '1.852', '0.94', '6.26', '88.54', '0.52']]},
 't6': {'pdf': 'Table 6', 'at': 'S4.T2', 'title': 'Architecture and SSM layer ablation, perplexity (about 350M, Chinchilla tokens)',
        'rows': [['H3', 'Hyena', 10.24], ['H3', 'S4 (complex)', 10.30], ['H3', 'S4 (real)', 10.34], ['H3', 'S6', 8.95],
                 ['Mamba', 'Hyena', 10.75], ['Mamba', 'S4 (complex)', 10.54], ['Mamba', 'S4 (real)', 10.56], ['Mamba', 'S6', 8.69]]},
 't7': {'pdf': 'Table 7', 'at': 'S4.F14', 'title': 'Selective parameters (perplexity)',
        'rows': [[0, 0, 0, 10.93], [0, 1, 0, 10.15], [0, 0, 1, 9.98], [1, 0, 0, 9.81], [1, 1, 1, 8.71]]},
 't8': {'pdf': 'Table 8', 'at': 'S4.F14', 'title': 'Initialisation of A (perplexity)',
        'rows': [['A_n = -1/2 + n i', 'Complex', 9.16], ['A_n = -1/2', 'Real', 8.85], ['A_n = -(n+1)', 'Real', 8.71], ['A_n ~ exp(N(0,1))', 'Real', 8.71]]},
 't9': {'pdf': 'Table 9', 'at': 'S4.F16', 'title': 'Size of the Delta projection (N = 16)',
        'rows': [['-', 358.9, 9.12], [1, 359.1, 8.97], [2, 359.3, 8.97], [4, 359.7, 8.91], [8, 360.5, 8.83], [16, 362.1, 8.84], [32, 365.2, 8.80], [64, 371.5, 8.71]]},
 't10': {'pdf': 'Table 10', 'at': 'S4.F16', 'title': 'SSM state dimension N (Delta projection 64)',
         'const': [[1, 367.1, 9.88], [2, 367.4, 9.86], [4, 368.0, 9.82], [8, 369.1, 9.82], [16, 371.5, 9.81]],
         'sel': [[1, 367.1, 9.73], [2, 367.4, 9.40], [4, 368.0, 9.09], [8, 369.1, 8.84], [16, 371.5, 8.71]]},
 't12': {'pdf': 'Table 12', 'at': 'A5.T4', 'title': 'Scaling-law model sizes (GPT-3 shapes; Transformer heads only)',
         'rows': [['125M', 12, 768, '12 / 64', 4800, '6e-4', '0.5M', '2.5B'], ['350M', 24, 1024, '16 / 64', 13500, '3e-4', '0.5M', '7B'],
                  ['760M', 24, 1536, '16 / 96', 29000, '2.5e-4', '0.5M', '15B'], ['1.3B', 24, 2048, '32 / 64', 50000, '2e-4', '0.5M', '26B']]},
 't13': {'pdf': 'Table 13', 'at': 'A5.T5', 'title': 'Great Apes DNA classification accuracy (%), random guessing 20%', 'lens': [10, 12, 14, 16, 18, 20],
         'rows': [['HyenaDNA', '1.4M', [28.04, 28.43, 41.17, 42.22, 31.10, 54.87]], ['Mamba', '1.4M', [31.47, 27.50, 27.66, 40.72, 42.41, 71.67]],
                  ['Mamba', '7M', [30.00, 29.01, 31.48, 43.73, 56.60, 81.31]]]},
 't14': {'pdf': 'Table 14', 'at': 'A5.T6', 'title': 'YouTubeMix sequence lengths and batch sizes',
         'rows': [[958464, 1, 958464], [479232, 2, 958464], [239616, 4, 958464], [120832, 8, 966656], [61440, 16, 983040], [30720, 32, 983040], [16384, 64, 1048576], [8192, 128, 1048576]]},
 't15': {'pdf': 'Table 15', 'at': 'A5.T7', 'title': 'Training memory, 125M models, length 2048, one A100 80GB',
         'rows': [[1, 4.6, 4.8], [2, 5.2, 5.8], [4, 6.9, 7.3], [8, 11.5, 12.3], [16, 20.7, 23.1], [32, 34.5, 38.2]]},
}
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables.json written;', len(t3), 'zero-shot rows;', sum(sum(r['bold']) for r in t3), 'bold cells')

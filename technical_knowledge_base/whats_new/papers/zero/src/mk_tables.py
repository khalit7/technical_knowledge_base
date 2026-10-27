"""Build tables.json from the table extracts in inputs/ (made by extract_paper.py from the arXiv HTML v3).
Values are kept as printed strings where precision matters. The bold cells of Table 1 and the figure each
appendix table serves were read from the HTML (ltx_font_bold) and the captions, and are listed here by hand.
usage: python3 mk_tables.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
def cells(f):
    t = open(os.path.join(HERE, 'inputs', f)).read().split('\n', 2)[2]
    return [c.strip() for c in t.replace('\n', '\t').split('\t') if c.strip()]

c = cells('table_S5_T1.txt')
i = c.index('1'); body = c[i:i + 6 * 10]
t1 = {'models': ['7.5B', '128B', '1T'], 'psi': [7.5e9, 128e9, 1e12], 'nd': [int(body[r * 10]) for r in range(6)],
      'cells': [body[r * 10 + 1:r * 10 + 10] for r in range(6)],
      # bold in the HTML: (model, stage, DP degree)
      'bold': [['7.5B', 'os', 64], ['7.5B', 'os_g', 16], ['7.5B', 'os_g_p', 4], ['128B', 'os_g_p', 64], ['1T', 'os_g_p', 1024]],
      'caption': 'Per-device memory consumption of different optimizations in ZeRO-DP as a function of DP degree. Bold-faced text are the combinations for which the model can fit into a cluster of 32GB V100 GPUs.',
      'at': 'S5.T1'}

c = cells('table_S7_T2.txt'); i = c.index('ZeRO-DP (Pos)') + 1
t2 = {'rows': [], 'at': 'S7.T2', 'caption': 'Maximum model size through memory analysis (left) and the measured model size when running with ZeRO-OS (right).'}
for r in range(5):
    x = c[i + r * 8:i + r * 8 + 8]
    t2['rows'].append({'mp': int(x[0]), 'gpus': int(x[1]), 'baseline': x[2], 'os': x[3], 'os_g': x[4], 'os_g_p': x[5], 'meas_base': x[6], 'meas_os': x[7]})

t3 = {'at': 'S10.T3', 'rows': [['C1', 'Pos', 'CB + MD'], ['C2', 'Pos', 'CB + MD + Pa'], ['C3', 'Pos+g', 'CB + MD'], ['C4', 'Pos+g', 'CB + MD + Pa'], ['C5', 'Pos+g', 'CB + MD + Pa+cpu']]}
c3 = cells('table_S10_T3.txt'); assert c3[2:5] == ['1', 'Pos', 'CB+MD'] and c3[-1].startswith('Table 3')

c = cells('table_S10_T4.txt'); i = c.index('1.5B')
t4 = []
for r in range(5):
    x = c[i + r * 6:i + r * 6 + 6]
    t4.append({'fig': 'Figure 2', 'label': x[0], 'layers': [int(v) for v in x[1].split(',')], 'hidden': int(x[2])})
    t4.append({'fig': 'Figures 3, 4', 'label': x[3], 'layers': [int(v) for v in x[4].split(',')], 'hidden': int(x[5])})

# appendix: one row per run; the HTML's "Figure n" headers use an older numbering, mapped to the body's figures here
FIG = {'A0.T5': ('Figure 2', 'throughput against Megatron'), 'A0.T6': ('Figure 3', 'super-linear scaling'),
       'A0.T7': ('Figure 6', 'max model size by configuration'), 'A0.T8': ('Figure 7', 'max cached memory'),
       'A0.T9': ('Figure 8', 'throughput by configuration'), 'A0.T10': ('Figure 4', 'no model parallelism')}
configs = []
for tid, (fig, what) in FIG.items():
    c = cells('table_' + tid.replace('.', '_') + '.txt')
    i = c.index('Total batch size') + 1
    while i + 9 <= len(c) and not c[i].startswith('Table'):
        x = c[i:i + 9]
        size = float(x[0].rstrip('B').replace('p', '.'))
        configs.append({'table': 'Table ' + tid.split('T')[1], 'at': tid, 'fig': fig, 'what': what, 'label': x[0].replace('p', '.'), 'size_B': size, 'who': x[1],
                        'gpus': int(x[2]), 'mp': int(x[3]), 'layers': int(x[4]), 'hidden': int(x[5]), 'heads': int(x[6]), 'batch': int(x[7]), 'total_batch': int(x[8])})
        i += 9
json.dump({'t1': t1, 't2': t2, 't3': t3, 't4': t4, 'configs': configs}, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1)
print('tables.json:', len(configs), 'appendix runs')

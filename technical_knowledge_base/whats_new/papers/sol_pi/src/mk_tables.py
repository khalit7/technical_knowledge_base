"""Transcribe the paper's Tables 1 to 4 (arXiv HTML v1) and the printed labels of Figures 6 to 8 into tables.json,
keeping the printed precision. Every number is asserted to appear in inputs/tables_v1.txt (the extracted tables),
so a typo here fails the build.  usage: python3 mk_tables.py"""
import json, re
T = open('inputs/tables_v1.txt', encoding='utf-8').read()
FIG = json.load(open('inputs/figs.json'))
COLS = ['input', 'cache_read', 'cache_write', 'output', 'total', 'cost', 'score', 'eff']
def row(name, cells, **kw):
    for c in cells:
        if c is not None: assert c in T, (name, c)
    r = {'name': name}
    for k, c in zip(COLS, cells):
        r[k] = None if c is None else float(c.replace(',', ''))
        r[k + '_s'] = c
    r.update(kw)
    return r
SOL = [
 row('Codex', ['0.0053', '3.0287', '0.0145', '0.0052', '3.0537', '1,787', '34.738', '1.0086'], kind='native', ref='[30]'),
 row('OpenSquilla', ['0.0001', '1.2533', '0.0776', '0.0044', '1.3353', '1,243', '24.506', '0.9945'], kind='third', ref='[31]'),
 row('Oh-My-Pi', ['0.1135', '2.0448', '0.0484', '0.0168', '2.2235', '1,832', '26.921', '1.3347'], kind='third', ref='[32]'),
 row('OpenCode', ['0.0012', '2.2625', '0.2865', '0.0164', '2.5668', '3,422', '29.552', '2.2704'], kind='third', ref='[33]'),
 row('Oh-My-Opencode', ['0.0044', '2.4373', '0.1286', '0.0121', '2.5825', '2,678', '38.523', '1.3633'], kind='third', ref='[34]'),
 row('Pi', ['0.0011', '2.1326', '0.0141', '0.0059', '2.1538', '1,339', '44.833', '0.5855'], kind='pi', ref='[35]'),
 row('SoL-Pi [Efficiency]', ['0.0009', '1.0605', '0.0316', '0.0061', '1.0990', '894', '42.003', '0.4174'], kind='sol'),
 row('SoL-Pi [Performance]', ['0.0002', '2.0005', '0.0160', '0.0056', '2.0224', '1,271', '47.208', '0.5280'], kind='solp'),
]
OPUS = [
 row('Claude Code', ['0.0002', '1.8116', '0.1701', '0.0226', '2.0045', '2,535', '43.689', '1.1377'], kind='native', ref='[36]'),
 row('Pi', ['0.0000', '2.3203', '0.0348', '0.0145', '2.3697', '1,741', '44.756', '0.7625'], kind='pi', ref='[35]'),
 row('SoL-Pi [Efficiency]', ['0.0000', '1.2626', '0.0352', '0.0123', '1.3101', '1,158', '42.224', '0.5376'], kind='sol'),
 row('SoL-Pi [Performance]', ['0.0000', '2.0520', '0.0352', '0.0144', '2.1016', '1,605', '50.482', '0.6235'], kind='solp'),
]
ABL = {'GPT-5.6 Sol': [
 row('Pi baseline', ['0.0011', '2.1326', '0.0141', '0.0059', '2.1538', '1,339', '44.833', '0.5855'], kind='pi'),
 row('+ Action Fusion', ['0.0011', '1.8718', '0.0180', '0.0060', '1.8968', '1,235', '46.664', '0.5190'], kind='one'),
 row('+ Online Context Compact', ['0.0008', '1.2602', '0.0217', '0.0055', '1.2881', '935', '41.993', '0.4365'], kind='one'),
 row('+ Evidence-Preserving Reducer', ['0.0051', '1.9089', '0.0181', '0.0055', '1.9375', '1,200', '44.630', '0.5274'], kind='one'),
 row('+ ObservationPack', ['0.0002', '2.0005', '0.0160', '0.0056', '2.0224', '1,271', '47.208', '0.5280'], kind='one', perf=True),
 row('SoL-Pi [Efficiency]', ['0.0009', '1.0605', '0.0316', '0.0061', '1.0990', '894', '42.003', '0.4174'], kind='sol')],
 'Opus 5': [
 row('Pi baseline', ['0.0000', '2.3203', '0.0348', '0.0145', '2.3697', '1,741', '44.756', '0.7625'], kind='pi'),
 row('+ Action Fusion', ['0.0000', '2.0520', '0.0352', '0.0144', '2.1016', '1,605', '50.482', '0.6235'], kind='one', perf=True),
 row('+ Online Context Compact', ['0.0000', '1.8618', '0.0388', '0.0145', '1.9152', '1,537', '49.155', '0.6130'], kind='one'),
 row('+ Evidence-Preserving Reducer', ['0.0000', '1.8685', '0.0315', '0.0131', '1.9131', '1,456', '43.405', '0.6578'], kind='one'),
 row('+ ObservationPack', ['0.0000', '1.3960', '0.0356', '0.0102', '1.4418', '1,176', '47.047', '0.4899'], kind='one'),
 row('SoL-Pi [Efficiency]', ['0.0000', '1.2626', '0.0352', '0.0123', '1.3101', '1,158', '42.224', '0.5376'], kind='sol')]}
T3 = [{'name': n, 'tb_solved': a, 'tb_cost': b, 'tb_per': c, 'imo_pass': d, 'imo_cost': e, 'imo_per': f}
      for n, a, b, c, d, e, f in [('Codex', 18, '272.35', '15.13', 5, '114.47', '22.89'), ('Pi', 18, '286.45', '15.91', 3, '75.95', '25.32'), ('SoL-Pi', 15, '211.12', '14.07', 3, '62.69', '20.90')]]
for r in T3:
    for k in ('tb_cost', 'tb_per', 'imo_cost', 'imo_per'):
        assert r[k] in T, r[k]; r[k] = float(r[k])
SWARM = [{'name': 'Codex coordinator + 20 SoL-Pi workers', 'cycles': 1127, 'cost': 60.11, 'thresholds': 8},
         {'name': 'Single Codex agent', 'cycles': 1333, 'cost': 39.20, 'thresholds': 8},
         {'name': 'Codex coordinator + 20 Pi workers', 'cycles': 1366, 'cost': 82.12, 'thresholds': 7}]
out = {'_doc': 'Tables 1-4 of arXiv 2609.20519v1 (token traffic in billions, cost in USD at API prices of 17 August 2026, score = EdgeBench average, eff = $ per score point as printed), Table 3, the swarm result of section 3.3 and the printed labels of Figures 6-8 (inputs/figs.json).',
       'sol': SOL, 'opus': OPUS, 'abl': ABL, 't3': T3, 'swarm': SWARM, 'starter_cycles': 147734,
       'edge_official_gpt55_2h': 31.2, 'figs': FIG}
json.dump(out, open('tables.json', 'w'), indent=1)
print('tables.json written:', len(SOL), len(OPUS), sum(len(v) for v in ABL.values()), 'rows')

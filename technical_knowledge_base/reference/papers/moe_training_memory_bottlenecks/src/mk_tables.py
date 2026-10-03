"""Transcribe the paper's tables into tables.json, keeping the printed precision, and verify every cell
against the extracts in inputs/table_*.txt (made by extract_paper.py from the arXiv HTML v1).

  python3 mk_tables.py      (build.sh runs it)
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
T = {}
T['t2'] = {'id': 'S3.T2', 'name': 'Table 2', 'title': 'Vocabulary projection at P = 8, H = 7,168, V = 200,000, FP32 (forward + backward)',
           'cols': ['N', 'Schedule', 'Standard peak (GiB)', 'Ring-DTP peak (GiB)', 'Saved', 'Standard (ms)', 'Ring-DTP (ms)', 'Cost'],
           'rows': [['16,384', 'move-activations', '42.462', '7.322', '82.8%', '1001.2', '1052.2', '+5.1%'],
                    ['32,768', 'move-weights', '79.521', '10.622', '86.6%', '2065.2', '2155.8', '+4.4%']]}
T['t10'] = {'id': 'A3.T10', 'name': 'Table 10', 'title': 'Vocabulary projection peak as the Ring-DTP group grows (N = 16,384)',
            'cols': ['P', 'Metric', 'Standard', 'Ring-DTP', 'Change'],
            'rows': [['4', 'Projection weight', '5.3406', '1.3351', '75.0% lower'], ['4', 'Resident weight + input', '5.8409', '1.8353', '68.6% lower'],
                     ['4', 'Projection F+B peak', '42.4620', '11.5194', '72.9% lower'], ['4', 'Increment over resident', '36.6212', '9.6841', '73.6% lower'],
                     ['8', 'Projection weight', '5.3406', '0.6676', '87.5% lower'], ['8', 'Resident weight + input', '5.8409', '1.1678', '80.0% lower'],
                     ['8', 'Projection F+B peak', '42.4620', '7.3222', '82.8% lower'], ['8', 'Increment over resident', '36.6212', '6.1545', '83.2% lower']],
            'unit': 'GiB'}
T['t11'] = {'id': 'A3.T11', 'name': 'Table 11', 'title': 'Matched forward latency at the shape of Table 10',
            'cols': ['Local batch', 'P', 'Standard (ms)', 'Ring-DTP (ms)', 'Slowdown'],
            'rows': [['16,384', '4', '989.8', '1035.7', '4.6%'], ['16,384', '8', '1001.2', '1052.2', '5.1%']]}
T['t3'] = {'id': 'S3.T3', 'name': 'Table 3 with Table 12', 'title': 'SCO host-budget sweep on gpt-oss-20b, 8 H200s, 556,432 tokens per step',
           'cols': ['Host budget', 'Boundaries', 'Logical (GiB)', 'Pinned (GiB)', 'Peak HBM (GiB)', 'Node RAM (GiB)', 'Step (s)', 'Throughput (tok/s/GPU)', 'Largest 10-step batch'],
           'rows': [['Off', '0 / 47', '0', '0', '139.790', '402.517', '26.3412', '2,641', '557,056'],
                    ['8 GiB', '21 / 47', '7.82-7.84', '10.5', '133.546', '487.990', '25.8415', '2,692', '589,824'],
                    ['16 GiB', '42 / 47', '15.63-15.69', '21.0', '125.677', '573.473', '25.8806', '2,687', '622,592'],
                    ['Full', '47 / 47', '17.49-17.55', '23.5', '123.728', '593.410', '25.8844', '2,687', '655,360']]}
T['t13'] = {'id': 'A4.T13', 'name': 'Table 13', 'title': 'SCO capacity on a 32,768-token search grid',
            'cols': ['Policy', 'Largest clean', 'Largest completion', 'First failure', 'Marginal gain', 'Failed alloc.'],
            'rows': [['Off', '458,752', '557,056', '589,824', '-', '27.61 GiB'], ['8 GiB', '557,056', '589,824', '622,592', '5.88%', '29.03 GiB'],
                     ['16 GiB', '557,056', '622,592', '655,360', '11.76%', '30.59 GiB'], ['Full', '622,592', '655,360', '688,128', '17.65%', '32.17 GiB']]}
T['t4'] = {'id': 'S3.T4', 'name': 'Table 4 with Table 14', 'title': 'Offloaded optimizer step on gpt-oss-20b, 8 H200s (CPU Adam of ZeRO-Offload: 3.95 s)',
           'cols': ['Requested bucket', 'Slots', 'Groups', 'Actual maximum', 'Time (s)', 'Staging (GiB)'],
           'rows': [['100M', '2', '26', '142.076M', '1.930', '4.234'], ['100M', '3', '26', '142.076M', '1.951', '6.351'],
                    ['150M', '2', '14', '208.431M', '2.204', '6.212'], ['150M', '3', '14', '208.431M', '2.225', '9.318'],
                    ['200M', '2', '14', '244.938M', '2.240', '7.300'], ['200M', '3', '14', '244.938M', '2.252', '10.950'],
                    ['250M', '2', '10', '308.586M', '2.282', '9.197'], ['250M', '3', '10', '308.586M', '2.282', '13.795']]}
T['t6'] = {'id': 'A2.T6', 'name': 'Table 6', 'title': 'Routing-skew sweep: mean forward latency (ms) / peak allocated memory (GiB)',
           'cols': ['Shape', 'Routing', 'Standard EP', 'LLEP', 'PipelinedLLEP', 'Speed vs LLEP', 'Peak saved'],
           'rows': [['32K, top-4, K = 3', 'Balanced', '40.82 / 21.347', '47.95 / 24.101', '44.74 / 17.606', '1.07×', '26.9%'],
                    ['32K, top-4, K = 3', '30% / 16', '89.39 / 32.549', '53.14 / 24.476', '51.44 / 18.460', '1.03×', '24.6%'],
                    ['32K, top-4, K = 3', '50% / 16', '143.12 / 45.351', '53.74 / 24.476', '54.57 / 18.460', '0.98×', '24.6%'],
                    ['32K, top-4, K = 3', '80% / 16', '225.06 / 64.556', '53.89 / 24.664', '53.90 / 18.553', '1.00×', '24.8%'],
                    ['32K, top-4, K = 3', '95% / 16', '267.08 / 74.154', '54.34 / 24.664', '53.93 / 18.553', '1.01×', '24.8%'],
                    ['32K, top-4, K = 3', '30% / 4', '107.28 / 36.885', '53.49 / 24.664', '52.27 / 18.554', '1.02×', '24.8%'],
                    ['32K, top-4, K = 3', '50% / 4', '157.39 / 48.445', '53.61 / 24.664', '53.97 / 18.554', '0.99×', '24.8%'],
                    ['65K, top-8, K = 10', 'Balanced', '177.82 / 52.660', '177.82 / 52.660', '161.00 / 21.430', '1.10×', '59.3%'],
                    ['65K, top-8, K = 10', '30% / 16', 'OOM', '182.97 / 52.906', '176.62 / 22.772', '1.04×', '57.0%'],
                    ['65K, top-8, K = 10', '50% / 16', 'OOM', '186.07 / 52.906', '182.64 / 22.773', '1.02×', '57.0%'],
                    ['65K, top-8, K = 10', '80% / 16', 'OOM', '189.14 / 52.988', '180.30 / 22.861', '1.05×', '56.9%'],
                    ['65K, top-8, K = 10', '95% / 16', 'OOM', '182.13 / 52.988', '178.57 / 22.855', '1.02×', '56.9%'],
                    ['65K, top-8, K = 10', '30% / 4', 'OOM', '185.78 / 52.906', '180.59 / 22.774', '1.03×', '57.0%'],
                    ['65K, top-8, K = 10', '50% / 4', 'OOM', '186.79 / 52.906', '184.69 / 22.778', '1.01×', '57.0%']]}
T['t7'] = {'id': 'A2.T7', 'name': 'Table 7', 'title': 'Micro-batch ladder at the 65K shape: budget c = 4,096 (K_max = 10) against a fixed K = 10',
           'cols': ['Tokens N', 'K', 'Budget: speedup', 'Budget: peak saved', 'Fixed K: speedup', 'Fixed K: peak saved'],
           'rows': [['128', '1', '1.60-2.96×', '9.0-11.0%', '0.45-0.48×', '9.4-11.4%'], ['1,024', '1', '1.35-2.17×', '10.4-11.1%', '0.47-0.56×', '14.0-15.6%'],
                    ['8,192', '2', '0.98-1.09×', '14.3-17.0%', '0.80-0.82×', '28.6%'], ['32,768', '8', '1.02-1.09×', '44.9-47.6%', '0.98-1.06×', '47.2-49.4%'],
                    ['65,536', '10', '1.04-1.10×', '56.9-59.3%', 'coincides', 'coincides'], ['131,072', '10', '1.07-1.10×', '63.4-65.9%', 'coincides', 'coincides']]}
T['t8'] = {'id': 'A2.T8', 'name': 'Table 8', 'title': 'Chunk membership at 65,536 tokens per rank, K = 10',
           'cols': ['Routing', 'Latency strided (ms)', 'Latency contig. (ms)', 'Peak strided (GiB)', 'Peak contig. (GiB)', 'Send ratio strided', 'Send ratio contig.'],
           'rows': [['Balanced', '161.2', '218.2', '21.430', '21.464', '1.00', '1.02'], ['95% / 16', '178.6', '184.9', '22.855', '23.575', '1.35', '2.63'],
                    ['80% / 16', '180.6', '209.7', '22.861', '23.514', '2.40', '4.00'], ['50% / 4', '190.8', '217.0', '22.778', '24.151', '2.29', '6.00']]}
T['t9'] = {'id': 'A2.T9', 'name': 'Table 9', 'title': 'Forward and backward together, K = 10, balanced / 80% / 16',
           'cols': ['Shape', 'LLEP (GiB)', 'PipelinedLLEP (GiB)', 'Peak saved', 'Speedup'],
           'rows': [['65K tok, H = 7168, top-8', '52.660 / 52.988', '21.430 / 22.861', '59.3 / 56.9%', '1.11 / 1.04×'],
                    ['32K tok, H = 4096, top-4', '23.850 / 24.413', '14.902 / 15.382', '37.5 / 37.0%', '0.87 / 0.90×']]}

SRC = {'t2': 'S3_T2', 't10': 'A3_T10', 't11': 'A3_T11', 't3': ['S3_T3', 'A4_T12'], 't13': 'A4_T13', 't4': 'A5_T14', 't6': 'A2_T6', 't7': 'A2_T7', 't8': 'A2_T8', 't9': 'A2_T9'}


def norm(s):
    s = s.replace('$', '').replace('\\mathbf{', '').replace('\\times', '×').replace('}', '').replace('{,', ',').replace('\\%', '%')
    s = s.replace('–', '-').replace(' ', '').replace('\\,\\mathrm{GiB', 'GiB')
    return s


if __name__ == '__main__':
    miss = []
    for k, t in T.items():
        srcs = SRC[k] if isinstance(SRC[k], list) else [SRC[k]]
        txt = norm(''.join(open(os.path.join(HERE, 'inputs', 'table_%s.txt' % s)).read() for s in srcs))
        for r in t['rows']:
            for c in r:
                for part in c.split(' / ') if '/' in c and k in ('t6', 't9') else [c]:
                    p = norm(part)
                    if p in ('-', 'coincides') or p in txt: continue
                    if k == 't6' and p.startswith(('32K', '65K')): continue
                    if k == 't9' and p.endswith(('top-8', 'top-4')): continue
                    miss.append((k, part))
    json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
    print('tables', len(T), 'cells not found in extracts:', miss)
    if miss: raise SystemExit(1)

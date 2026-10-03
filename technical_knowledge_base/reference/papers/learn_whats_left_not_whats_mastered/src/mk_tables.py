"""Transcribe the paper's four tables into tables.json, keeping the printed strings, and verify every value
against the extracted arXiv table text (inputs/table_S5_T*.txt) in reading order.   python3 mk_tables.py"""
import json, re
BM = ['AIME24', 'Minerva', 'AMC23', 'MATH500', 'Olympiad']
T1cols = ['Base 7B', 'GDPO 7B (3 obj)', 'SA-MRPO 7B (3 obj)', 'Base 3B', 'GDPO 3B (2 obj)', 'SA-MRPO 3B (2 obj)', 'GDPO 3B (3 obj)', 'SA-MRPO 3B (3 obj)']
T1 = {  # benchmark: (Acc row, Exceed row), printed order of columns
 'AIME24':  (['11.7%','11.5%','16.5%','0.6%','5.0%','8.5%','6.7%','8.1%'], ['3.5%','1.2%','1.5%','6.2%','0.0%','0.6%','0.6%','1.7%']),
 'Minerva': (['16.1%','24.2%','24.8%','6.7%','16.2%','16.6%','16.9%','18.1%'], ['0.4%','0.1%','0.0%','0.4%','0.1%','0.1%','0.1%','0.1%']),
 'AMC23':   (['41.1%','44.6%','43.5%','10.7%','33.2%','34.9%','31.5%','35.2%'], ['1.0%','1.2%','1.1%','1.7%','0.0%','0.1%','0.4%','0.6%']),
 'MATH500': (['50.0%','64.2%','67.7%','26.3%','57.1%','58.2%','58.9%','59.5%'], ['0.7%','0.0%','0.1%','0.6%','0.0%','0.1%','0.1%','0.1%']),
 'Olympiad':(['23.8%','25.3%','26.1%','4.5%','20.6%','19.3%','20.6%','20.0%'], ['2.5%','0.2%','0.7%','3.3%','0.1%','0.3%','0.2%','0.6%'])}
T2 = {  # benchmark: SA-MRPO acc, len, GDPO acc, len, delta
 'AIME24': ['7.3','804','5.2','566','+2.1'], 'Minerva': ['15.9','277','15.4','214','+0.5'], 'AMC23': ['37.5','417','28.3','290','+9.2'],
 'MATH500': ['51.5','270','47.1','187','+4.4'], 'Olympiad': ['20.9','529','18.1','406','+2.8'], 'Average': ['26.6','459','22.8','333','+3.8']}
T3 = {  # benchmark: (Pass row, Bug row) Base, GDPO, SA-MRPO
 'APPS': (['43.8%','53.2%','53.8%'], ['19.6%','8.5%','9.9%']), 'CodeCont.': (['12.4%','19.2%','20.6%'], ['32.9%','15.5%','15.5%']),
 'Codeforces': (['8.7%','10.6%','12.9%'], ['34.4%','8.6%','9.0%']), 'TACO': (['29.0%','36.0%','35.6%'], ['23.1%','11.0%','12.4%'])}
T4cols = ['Base', 'γ = 0', 'γ = 0.25', 'γ = 0.5', 'γ = 0.75', 'γ = 1.0']
T4 = {
 'AIME24':  (['0.6%','5.0%','8.5%','9.0%','8.7%','7.4%'], ['6.2%','0.0%','0.6%','0.7%','0.8%','1.1%']),
 'Minerva': (['6.7%','16.2%','16.6%','16.9%','17.0%','16.8%'], ['0.4%','0.1%','0.1%','0.2%','0.1%','0.3%']),
 'AMC23':   (['10.7%','33.2%','34.9%','35.6%','35.3%','34.8%'], ['1.7%','0.0%','0.1%','0.2%','0.2%','0.4%']),
 'MATH500': (['26.3%','57.1%','58.2%','58.6%','58.8%','58.5%'], ['0.6%','0.0%','0.1%','0.1%','0.2%','0.3%']),
 'Olympiad':(['4.5%','20.6%','19.3%','20.1%','19.4%','20.7%'], ['3.3%','0.1%','0.3%','0.1%','0.7%','0.3%'])}
def verify(fname, seq):
    t = open('inputs/' + fname).read(); pos = 0
    for v in seq:
        m = re.search(r'(?<![\d.])' + re.escape(v) + r'(?![\d])', t[pos:])
        if not m: raise SystemExit('not found in order: %s in %s after %d' % (v, fname, pos))
        pos += m.end()
verify('table_S5_T1.txt', [v for b in BM for row in T1[b] for v in row])
verify('table_S5_T2.txt', [v for b in BM + ['Average'] for v in T2[b]])
verify('table_S5_T3.txt', [v for b in T3 for row in T3[b] for v in row])
verify('table_S5_T4.txt', [v for b in BM for row in T4[b] for v in row])
out = {'_doc': 'The paper\'s Tables 1 to 4 (arXiv v1), printed strings kept; verified in reading order against inputs/table_S5_T*.txt by mk_tables.py.',
       'bench': BM, 'bench_n': {'AIME24': 30, 'Minerva': 272, 'AMC23': 40, 'MATH500': 500, 'Olympiad': 674},
       'bench_n_src': 'row counts of the Hugging Face test splits math-ai/aime24, math-ai/minervamath, math-ai/amc23, HuggingFaceH4/MATH-500, math-ai/olympiadbench (datasets-server, 3 Oct 2026); the paper does not state which versions it used',
       'T1': {'cols': T1cols, 'rows': T1}, 'T2': {'cols': ['SA-MRPO Acc.', 'SA-MRPO Len.', 'GDPO Acc.', 'GDPO Len.', 'Δ Acc.'], 'rows': T2},
       'T3': {'cols': ['Base', 'GDPO', 'SA-MRPO'], 'rows': T3}, 'T4': {'cols': T4cols, 'rows': T4}}
json.dump(out, open('tables.json', 'w'), ensure_ascii=False, indent=1)
print('tables.json: 4 tables verified against the arXiv text')

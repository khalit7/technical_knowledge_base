"""Transcribe the paper's tables into tables.json with the printed precision kept, and check every printed
number against the arXiv HTML extract (inputs/tables_v1.txt): each cell must appear, as printed, inside its
table's block. Figures 1, 5 and 6 come from inputs/figs.json (decode_figs.py).
usage: python3 mk_tables.py"""
import json, re

TX = open('inputs/tables_v1.txt', encoding='utf-8').read()
blocks = {m.group(1): m.group(2) for m in re.finditer(r'=== (\S+)  \S+\n(.*?)(?=\n=== |\Z)', TX, re.S)}
FIG = json.load(open('inputs/figs.json'))

T = {}
# Table 2: ALFWorld (In-Dist, OOD, Avg) and WebArena (Reddit, Shopping, Shop Admin, GitLab, Avg); mean and sd of three runs
T['t2'] = {'anchor': 'S4.T2', 'name': 'Table 2', 'cols': ['ALFWorld In-Dist', 'ALFWorld OOD', 'ALFWorld Avg.', 'WebArena Reddit', 'WebArena Shopping', 'WebArena Shop Admin', 'WebArena GitLab', 'WebArena Avg.'],
  'rows': {
    'No Skills':       [['62.6', '1.7'], ['60.7', '5.2'], ['61.7', '3.4'], ['39.6', '2.3'], ['35.2', '3.3'], ['44.1', '2.3'], ['35.8', '8.4'], ['38.7', '2.3']],
    'Original Envs':   [['63.3', '2.8'], ['61.4', '4.3'], ['62.4', '3.4'], ['38.7', '9.7'], ['35.2', '1.3'], ['44.6', '3.0'], ['35.4', '4.0'], ['38.5', '3.1']],
    'GenEnv':          [['63.3', '1.2'], ['61.9', '2.7'], ['62.6', '1.9'], None, None, None, None, None],
    'VeriEnv':         [None, None, None, ['39.6', '4.2'], ['30.2', '0.0'], ['49.7', '2.4'], ['38.9', '5.6'], ['39.6', '1.4']],
    'EnvHarness Envs': [['66.2', '0.3'], ['70.4', '2.3'], ['68.3', '1.3'], ['40.6', '4.7'], ['37.4', '0.3'], ['50.8', '1.5'], ['37.7', '3.1'], ['41.6', '1.8']],
  },
  'improvement': ['+2.9', '+9.0', '+5.9', '+1.9', '+2.2', '+6.2', '+2.3', '+3.1'],
  'note': 'Mean over three independent runs; the gray subscript is the standard deviation. Higher is better.'}
# Table 3: SWE-bench Verified (SR, AS), OfficeQA (EM, F1), SpreadsheetBench (Pass@1, Mean Score)
T['t3'] = {'anchor': 'S4.T3', 'name': 'Table 3', 'cols': ['SWE-bench Verified SR', 'SWE-bench Verified AS (lower is better)', 'OfficeQA EM', 'OfficeQA F1', 'SpreadsheetBench Pass@1', 'SpreadsheetBench Mean Score'],
  'lower_better': [False, True, False, False, False, False],
  'rows': {
    'No Skills':       [['47.67', '0.93'], ['53.58', '2.93'], ['54.23', '2.84'], ['55.77', '2.98'], ['46.44', '0.15'], ['61.32', '0.37']],
    'Original Envs':   [['49.88', '2.59'], ['55.01', '1.69'], ['54.40', '1.84'], ['55.77', '1.59'], ['45.88', '1.19'], ['61.47', '0.59']],
    'SWE-smith':       [['50.12', '1.74'], ['54.72', '2.03'], None, None, None, None],
    'EnvHarness Envs': [['52.58', '2.72'], ['49.61', '2.49'], ['56.20', '2.34'], ['57.73', '2.29'], ['49.15', '0.36'], ['62.48', '0.27']],
  },
  'improvement': ['+2.70', '+5.40', '+1.80', '+1.96', '+3.27', '+1.01'],
  'note': 'Standard deviations as subscripts; the caption does not say how many runs (Table 2 says three). For average steps the printed "+5.40" is a reduction.'}
T['t4'] = {'anchor': 'S5.T4', 'name': 'Table 4', 'cols': ['ALFWorld In-Dist', 'ALFWorld OOD', 'ALFWorld Avg.', 'WebShop Score', 'WebShop SR'],
  'rows': {'Original Envs': ['81.4', '89.6', '85.5', '75.6', '66.0'], 'EnvHarness Envs': ['87.9', '88.8', '88.4', '79.2', '67.4']},
  'note': 'GRPO on Qwen3-8B-base, one training run each (seed 0, Appendix F.1); no standard deviations.'}
T['t5'] = {'anchor': 'S5.T5', 'name': 'Table 5', 'cols': ['SR (%)', 'AS'],
  'rows': {'No Skills': ['47.67', '53.58'], 'Original Envs': ['49.88', '55.01'], 'EnvHarness (Stage/Contract Only)': ['52.58', '49.61'], 'EnvHarness (Chain Only)': ['49.63', '41.96'], 'Combined Skills (Stage/Contract + Chain)': ['54.30', '43.12']},
  'note': 'SWE-bench Verified, skills evaluated on ordinary single-environment test instances. No standard deviations.'}
T['t9'] = {'anchor': 'A6.T9', 'name': 'Table 9', 'models': ['Gemini 3.1 Flash-Lite', 'Qwen3.6 27B', 'Gemini 3.5 Flash', 'Claude Sonnet 4.6'],
  'rows': {'No Skills': [['30.7', '36.7'], ['41.0', '69.8'], ['47.7', '53.6'], ['67.2', '29.3']],
           'Original Envs': [['36.8', '50.0'], ['48.4', '37.1'], ['49.9', '55.0'], ['69.2', '25.4']],
           'EnvHarness Envs': [['40.0', '50.6'], ['52.1', '40.8'], ['52.6', '49.6'], ['72.4', '25.6']]},
  'note': 'SWE-bench Verified, SR and AS per model; policy and EnvRigger share the backbone. The Gemini 3.5 Flash column is Table 3 rounded.'}
T['t10'] = {'anchor': 'A7.T10', 'name': 'Table 10', 'rows': [['clean', '54.8', '71.2', '+16.4'], ['cool', '38.5', '39.3', '+0.8'], ['heat', '61.1', '52.4', '-8.7'], ['look_lamp', '79.0', '82.7', '+3.7'], ['simple', '83.6', '83.6', '0.0'], ['two_obj', '46.4', '52.9', '+6.5'], ['Average', '60.6', '63.7', '+3.1']],
  'note': 'ALFWorld leave-one-out: skills from every task type but one, evaluated on the held-out type. Original against EnvHarness.'}
T['t11'] = {'anchor': 'A7.T11', 'name': 'Table 11', 'rows': [['ALFWorld', 'GenEnv', '38K', '64.2M', '64.2M'], ['ALFWorld', 'EnvHarness', '1.46M', '226.6M', '228.0M'], ['WebArena', 'VeriEnv', '20K', '137.7M', '137.8M'], ['WebArena', 'EnvHarness', '1.58M', '135.7M', '137.3M']],
  'note': 'Estimated tokens: design, rollout, total. GenEnv rollouts are LLM-simulated; the others run the real environment.'}
T['t12'] = {'anchor': 'A7.T12', 'name': 'Table 12', 'rows': [['Success rate (SR)', '[0.4, 0.6]', '6.0', '80.0'], ['Avg. steps (AS)', '[25, 35]', '18.0', '53.0']],
  'note': 'Percentage of 100 ALFWorld tasks whose measured value (K = 10 rollouts) falls in the band, before and after reshaping. Mean SR moved from 0.74 to 0.48.'}
T['t13'] = {'anchor': 'A7.T13', 'name': 'Table 13', 'rows': [
  ['ALFWorld', 'Stage', 'Takes objects from closed containers without opening them', 'Target object starts inside a closed drawer', 'Pre-Interaction State Verification'],
  ['ALFWorld', 'Stage', 'Searches containers in an inefficient order', 'Three drawers pre-opened to stage an ordering', 'Semantic Container Prioritization'],
  ['ALFWorld', 'Stage', 'Forgets the second object in multi-object tasks', 'First sub-goal completed in advance', 'Task-State Verification Loop'],
  ['WebArena', 'Contract f_A', 'Concludes without scrolling to content below the fold', 'Retrieval actions blocked until a scroll happens', 'Incremental Viewport Expansion'],
  ['WebArena', 'Stage', 'Counts paginated rows by hand instead of filtering', 'Episode starts on the order grid, filter bar in view', 'Query-Based Data Filtering'],
  ['WebArena', 'Contract f_A', 'Guesses URLs instead of using the site search', 'Direct navigation blocked', 'Search-First Navigation Protocol'],
  ['SWE-bench Verified', 'Stage, f_A', 'Edits the wrong function without reading test fixtures', 'Test file restructured, git resets blocked', 'Context-Aware Code Modification'],
  ['SWE-bench Verified', 'Contract f_T', 'Submits a patch without running the failing test', 'Submission rejected until the tests have run', 'Verification-Driven Development Loop'],
  ['SWE-bench Verified', 'Contract f_T', 'Uses sed -i and corrupts indentation', 'File silently corrupted when sed is used', 'Safe File Modification via Python Scripting']]}
T['t7'] = {'anchor': 'A5.T7', 'name': 'Table 7', 'rows': [['ALFWorld', '100 tasks from the standard train set', 'all remaining held-out tasks'], ['WebArena', '20 tasks per sub-domain', 'all remaining tasks'], ['SWE-bench', '100 tasks from SWE-bench Lite', '407 Verified issues not in Lite'], ['OfficeQA', '50 tasks (official split)', '172 official test tasks'], ['SpreadsheetBench', '100 of the 400 verified tasks', '299 held-out tasks (897 instances)']]}
T['t8'] = {'anchor': 'A5.T8', 'name': 'Table 8', 'rows': [['Observe', 'Baseline rollouts per task (K)', '5'], ['Write', 'Components per candidate', 'unbounded (designer’s choice)'], ['Validate', 'Fresh rollouts per candidate (K)', '5'], ['Validate', 'Revision budget (write–validate rounds)', '5'], ['General', 'Designer backbone', 'same as policy']]}

# ---- check every printed cell against its table's block of the HTML extract ----
n = 0
def chk(anchor, s):
    global n
    s2 = s.replace('-8.7', '-8.7').replace('[0.4, 0.6]', '[0.4,0.6]').replace('[25, 35]', '[25,35]')
    b = blocks[anchor]
    flat = re.sub(r'\s+', ' ', b)
    cand = [s, s2, s.replace('f_A', '$f_{A}$').replace('f_T', '$f_{T}$')]
    sq = lambda x: re.sub(r'[\s${}_]', '', x)
    if not any(c in b or c in flat or sq(c) in sq(flat) for c in cand):
        raise SystemExit('not found in %s: %r' % (anchor, s))
    n += 1
for k in ('t2', 't3'):
    for r, cells in T[k]['rows'].items():
        chk(T[k]['anchor'], r)
        for c in cells:
            if c: chk(T[k]['anchor'], c[0] + ' ' + c[1])
    for c in T[k]['improvement']: chk(T[k]['anchor'], c)
for k in ('t4', 't5'):
    for r, cells in T[k]['rows'].items():
        for c in cells: chk(T[k]['anchor'], c)
for r, cells in T['t9']['rows'].items():
    for c in cells: chk('A6.T9', c[0]); chk('A6.T9', c[1])
for k in ('t10', 't11', 't12', 't13', 't7', 't8'):
    for row in T[k]['rows']:
        for c in row: chk(T[k]['anchor'], c)
T['figs'] = FIG
T['_doc'] = 'Transcribed by mk_tables.py; %d printed cells checked against inputs/tables_v1.txt.' % n
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables.json written;', n, 'cells checked')

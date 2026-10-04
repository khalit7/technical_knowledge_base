"""Build parts/22_js_data.js from inputs/ (pinned files) and data/ (this page's runs and extraction bench).

python3 mk_data.py   (plain Python 3, stdlib only)
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs'); DAT = os.path.join(HERE, 'data')
SRC = json.load(open(os.path.join(INP, 'sources.json')))

# Panels: (key in sources.json, label, is GSM8K, note, {decision: [line patterns or (start, end) pattern pairs]})
PANELS = [
 ('lmeval_gsm8k', 'lm-eval: gsm8k.yaml', True, 'Declarative: one YAML per variant; the 5-shot, CoT, zero-shot and Llama-style variants are sibling files.',
  {'prompt': ['doc_to_text', 'doc_to_target'], 'shots': ['num_fewshot', 'fewshot_split', 'training_split'],
   'decode': [('generation_kwargs', 'temperature')], 'extract': [('filter_list', 'take_first"\n  - name')], 'metric': [('metric_list', '"\\\\.\\$"')],
   'data': ['dataset_path', 'dataset_name', 'test_split'], 'chat': []}),
 ('inspect_evals_gsm8k', 'inspect_evals: gsm8k.py', True, 'A Python program: a @task function returning Task(dataset, solver, scorer).',
  {'prompt': [('MATH_PROMPT_TEMPLATE = ', '""".strip()'), 'prompt_template(MATH_PROMPT_TEMPLATE)'], 'shots': ['fewshot: int = 10', 'fewshot_seed', 'shuffle_fewshot: bool', ('if fewshot:', '),\n        )'), ('def sample_to_fewshot', '+ f"ANSWER')],
   'decode': ['generate()'], 'extract': ['scorer=match(numeric=True)'], 'metric': ['scorer=match(numeric=True)'],
   'data': ['DATASET_PATH =', 'GSM8K_DATASET_REVISION =', 'revision=GSM8K_DATASET_REVISION', 'split="test"'], 'chat': ['system_message(']}),
 ('lighteval_gsm8k', 'lighteval: gsm8k.py', True, 'Two definitions in one config: the classic prompt function and metrics, and Inspect fields (sample_fields, solver, scorer) for its preferred Inspect backend.',
  {'prompt': [('MATH_PROMPT_TEMPLATE = ', '""".strip()'), 'query=f"Question:', 'solver=[prompt_template'], 'shots': ['few_shots_split', 'few_shots_select', ('def sample_to_fewshot', 'ANSWER: {sample.target}')],
   'decode': ['generation_size', 'stop_sequence', 'generate(cache=True)'], 'extract': ['scorer=math_scorer()', 'Metrics.expr_gold_metric'], 'metric': ['scorer=math_scorer()', 'Metrics.expr_gold_metric'],
   'data': ['hf_repo=', 'hf_subset=', 'evaluation_splits'], 'chat': []}),
 ('helm_gsm_runspec', 'HELM: run spec "gsm"', True, 'A RunSpec: scenario + adapter spec (how to prompt) + metric specs.',
  {'prompt': ['input_noun', 'output_noun'], 'shots': ['max_train_instances'], 'decode': ['max_tokens', 'stop_sequences'],
   'extract': ['final_number_exact_match'], 'metric': [('metric_specs=', 'get_generative_harms_metric_specs')], 'data': ['GSM8KScenario'], 'chat': []}),
 ('helm_gsm_scenario', 'HELM: gsm_scenario.py', True, 'How instances are loaded: from the GitHub repository at master, with "####" turned into "The answer is".',
  {'data': ['base_url =', 'source_url'], 'prompt': ['answer: str ='], 'shots': [], 'decode': [], 'extract': [], 'metric': [], 'chat': []}),
 ('helm_final_number', 'HELM: final_number_exact_match', True, 'The metric: last number in gold and prediction, then exact match. The dot in the regex is unescaped.',
  {'extract': ['matches = re.findall', 'return matches[-1]'], 'metric': ['return exact_match(get_final_number'], 'prompt': [], 'shots': [], 'decode': [], 'data': [], 'chat': []}),
 ('simple_evals_mgsm', 'simple-evals: mgsm_eval.py (MGSM, English)', True, 'Zero-shot chain of thought; the comment says "first number", the code returns the last.',
  {'prompt': [('"en": """Solve', '{input}"""')], 'shots': [], 'decode': [], 'extract': [('def parse_answer', 'return numbers[-1]')], 'metric': [('def score_mgsm', 'return target == prediction')], 'data': ['"en": "https://'], 'chat': []}),
 ('inspect_match', 'Inspect: match_str (the scorer behind match())', True, 'With numeric=True and location "end", the last number in the whole output is compared numerically.',
  {'extract': ['words = re.split', 'words.reverse()', 'v = first_number_normalized(words)'], 'metric': ['strip_numeric_punctuation(v)'], 'prompt': [], 'shots': [], 'decode': [], 'data': [], 'chat': []}),
 ('lighteval_math_scorer', 'lighteval: math_scorer()', True, 'Expression and LaTeX extraction (boxed answers first), first match, 5 s timeout; gold parsed the same way.',
  {'extract': ['gold_extraction_target', 'pred_extraction_target', 'extraction_mode', 'fallback_mode'], 'metric': ['value="C" if'], 'prompt': [], 'shots': [], 'decode': [], 'data': [], 'chat': []}),
 ('openai_evals_yaml', 'openai/evals: multistep-word-problems.yaml (not GSM8K)', False, 'The nearest real file: no GSM8K in the registry. A YAML names a template class and a JSONL of samples.',
  {'extract': ['class: evals.elsuite.basic.match:Match'], 'metric': ['metrics: [accuracy]'], 'data': ['samples_jsonl'], 'prompt': [], 'shots': [], 'decode': [], 'chat': []}),
 ('openai_evals_match', 'openai/evals: record_and_check_match', True, 'The Match template: the sampled text must start with the ideal answer.',
  {'extract': ['if not sampled.startswith(option)'], 'metric': ['match = picked in expected'], 'prompt': [], 'shots': [], 'decode': [], 'data': [], 'chat': []}),
 ('evalchemy_math500', 'Evalchemy: MATH500 eval_instruct.py (not GSM8K)', False, 'A Python benchmark class on lm-eval\'s LM and Instance; note do_sample False next to temperature 0.7.',
  {'prompt': ['PROMPT = '], 'decode': ['"do_sample": False', '"temperature": 0.7', 'max_tokens: int = 32768'], 'extract': ['self.extract_answer(output)', 'last_boxed_only_string'], 'chat': ['_prepare_messages'], 'data': ['data_file: str'], 'shots': [], 'metric': []}),
 ('unitxt_mmlu_card', 'Unitxt: cards/mmlu/abstract_algebra.json (not GSM8K)', False, 'A card: loader, preprocessing, task and a list of templates; the recipe adds format and demos at run time.',
  {'data': ['"path": "cais/mmlu"', '"name": "abstract_algebra"'], 'prompt': ['"templates":'], 'metric': ['"task":'], 'shots': [], 'decode': [], 'extract': [], 'chat': []}),
 ('promptfoo_example', 'promptfoo: getting-started promptfooconfig.yaml (not GSM8K)', False, 'An application config: prompts x providers x tests, each test with assertions.',
  {'prompt': ['prompts:', "- 'Convert"], 'extract': ['assert:', 'type: contains', 'type: icontains'], 'metric': ['assert:'], 'data': ['tests:', 'vars:'], 'shots': [], 'decode': ['providers:'], 'chat': []}),
]
DECISIONS = [('prompt', 'Prompt'), ('shots', 'Few-shot examples'), ('chat', 'Chat template / messages'), ('decode', 'Decoding and budget'),
             ('extract', 'Answer extraction'), ('metric', 'Metric'), ('data', 'Dataset and pinning')]

def lines_for(text, pats):
    L = text.split('\n'); out = set()
    for p in pats:
        if isinstance(p, tuple):
            a = next((i for i, l in enumerate(L) if p[0] in l), None)
            if a is None: raise SystemExit('pattern not found: %r' % (p[0],))
            # end: first line at or after a whose text (joined with next line) contains p[1]
            end_pat = p[1].split('\n')[0]
            b = next((i for i in range(a, len(L)) if end_pat in L[i]), a)
            out.update(range(a, b + 1))
        else:
            hit = [i for i, l in enumerate(L) if p in l]
            if not hit: raise SystemExit('pattern not found: %r in %s' % (p, text[:40]))
            out.update(hit)
    return sorted(out)

panels = []
for key, label, gsm, note, hl in PANELS:
    s = SRC[key]; text = open(os.path.join(INP, s['file']), encoding='utf-8').read().rstrip('\n')
    panels.append(dict(key=key, label=label, gsm=gsm, note=note, repo=s['repo'], commit=s['commit'][:7], date=s['commit_date'],
                       path=s['path'], start=s['lines'][0], url=s['url'], lines=text.split('\n'),
                       hl={d: lines_for(text, hl.get(d, [])) for d, _ in DECISIONS}))

# Field-by-field table (read from the files; defaults as shipped)
FIELDS = [
 ['Prompt', '"Question: {question}\\nAnswer:"', 'Instruction to reason step by step and end with "ANSWER: $ANSWER", then the question, then "Reasoning:"', 'Same template as inspect_evals on the Inspect path; "Question: ... Answer:" on the classic path', '"Q: ... A:" with gold answers rewritten as "... The answer is N."', 'Instruction to give reasoning and end with "Answer:" and the integer'],
 ['Few-shot examples', '5 from train, sampled with seed 1234; gold answers end "#### N"', '10 random train examples (fixed seed), all in one system message', 'Random from train; the number is set at run time', '5 train instances', 'None (zero-shot)'],
 ['Chat template', 'Off unless --apply_chat_template', 'On: messages, formatted by the provider', 'On (Inspect path)', 'Text prompt; the client decides', 'On: a user message'],
 ['Decoding and budget', 'Greedy; stop at "Question:", "</s>", "<|im_end|>"; 256 new tokens (HF default)', 'Provider default (2048 tokens; the local hf provider samples unless do_sample=False)', '256 tokens, stop "Question:" (classic path)', 'Temperature 0, 400 tokens, stop at a blank line', 'Sampler defaults: temperature 0.5, 1024 tokens (ChatCompletionSampler)'],
 ['Answer extraction', 'Two filters: strict "#### N"; flexible: last number-like string', 'Last number in the output (match, numeric, end)', 'Expressions and LaTeX, boxed first, first match', 'Last match of -?[\\d,]+(?:.\\d+)? (dot unescaped)', 'Last number after the last "Answer"'],
 ['Metric', 'exact_match, ignoring case, commas, $, a trailing period', 'accuracy and stderr of C/I', 'Parsed values equal', 'final_number_exact_match plus exact_match_indicator, and HELM\'s generic and harms metrics', 'String equality after removing commas and trailing zeros'],
 ['Dataset and pinning', 'openai/gsm8k "main" from the Hub; no revision', 'openai/gsm8k "main", revision cc7b047 pinned in code', 'openai/gsm8k "main"; no revision', 'train.jsonl and test.jsonl from GitHub master; no pin', '250 problems from a TSV in OpenAI blob storage'],
]
COLS = ['lm-eval', 'inspect_evals', 'lighteval', 'HELM', 'simple-evals (MGSM en)']

out = {'panels': panels, 'decisions': DECISIONS, 'fields': FIELDS, 'cols': COLS}
ex = os.path.join(DAT, 'extract.json')
if os.path.exists(ex):
    out['bench'] = json.load(open(ex))['rows']
runs = os.path.join(DAT, 'runs.json')
if os.path.exists(runs):
    R = json.load(open(runs))
    for x in R['items']:
        c = x['lm']['context']; i = c.rfind('Question:')
        x['lm']['context'] = (c[:700] + ' [... %d more characters of shots]\n\n' % (i - 700) if i > 700 else c[:i]) + c[i:]
        for m in x['in']['messages']:
            if m['role'] == 'system' and len(m['content']) > 800:
                m['content'] = m['content'][:800] + ' [... %d more characters of shots]' % (len(m['content']) - 800)
    out['runs'] = R
def trim(o, n=320, m=14):
    if isinstance(o, str):
        return o if len(o) <= n else o[:n] + ' [... %d chars]' % (len(o) - n)
    if isinstance(o, list):
        t = [trim(x, n, m) for x in o[:m]]
        return t + (['[... %d more]' % (len(o) - m)] if len(o) > m else [])
    if isinstance(o, dict):
        return {k: trim(v, n, m) for k, v in o.items()}
    return o
lr = os.path.join(DAT, 'lmeval_results.json')
if os.path.exists(lr):
    res = json.load(open(lr))
    smp = [json.loads(l) for l in open(os.path.join(DAT, 'lmeval_sample0.jsonl'))]
    ilog = json.load(open(os.path.join(DAT, 'inspect_log_sample0.json')))
    hdr = {k: v for k, v in ilog.items() if k != 'samples'}
    sm = dict(ilog['samples'][0])
    ev = sm.pop('events', [])
    sm2 = trim(sm)
    sm2['events'] = [trim(e, 200, 8) for e in ev[:60]]
    out['logs'] = {'lm_results': trim(res), 'lm_sample': trim(smp[0]), 'in_header': trim(hdr), 'in_sample': sm2,
                   'files': {'lmres': 'results_2026-10-04T...json (lm-eval, one per run)', 'lmsmp': 'samples_gsm8k_...jsonl, first record (problem 1, filter strict-match)',
                             'inhdr': 'Inspect log, everything except samples', 'insmp': 'Inspect log, the sample for problem 1 (samples are stored in completion order)'}}
body = json.dumps(out, ensure_ascii=False, separators=(',', ':')).replace('\u2014', '--')  # quoted sources: em-dash shown as --
js = '// Generated by src/mk_data.py from src/inputs and src/data. Do not edit by hand.\nwindow.HX=' + body + ';\n'
open(os.path.join(HERE, 'parts', '22_js_data.js'), 'w', encoding='utf-8').write(js)
print('wrote', len(js), 'bytes;', len(panels), 'panels')

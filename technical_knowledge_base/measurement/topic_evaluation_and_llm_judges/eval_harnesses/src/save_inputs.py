"""Copy the real task files this page shows into src/inputs/, from shallow clones of each repo.

Usage: python3 save_inputs.py <dir holding the clones> <dir holding fetched web pages>
Every extract records repo, commit, commit date, path and line range in inputs/sources.json,
so the page's permalinks point at the exact lines shown.
"""
import json, subprocess, sys, os, re

CL, WEB = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs')
os.makedirs(OUT, exist_ok=True)

def head(repo):
    d = os.path.join(CL, repo)
    if os.path.exists(os.path.join(d, 'PIN')):  # files fetched from raw.githubusercontent.com at this commit
        return open(os.path.join(d, 'PIN')).read().split()
    sha, date = subprocess.check_output(['git', '-C', d, 'log', '-1', '--format=%H %cs'], text=True).split()
    return sha, date

# (key, local clone dir, github slug, path, first line, last line or None)
FILES = [
    ('lmeval_gsm8k', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'lm_eval/tasks/gsm8k/gsm8k.yaml', 1, None),
    ('lmeval_footguns', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'docs/footguns.md', 1, 25),
    ('inspect_evals_gsm8k', 'inspect_evals', 'UKGovernmentBEIS/inspect_evals', 'src/inspect_evals/gsm8k/gsm8k.py', 1, None),
    ('inspect_match', 'inspect_ai', 'UKGovernmentBEIS/inspect_ai', 'src/inspect_ai/scorer/_common.py', None, None),
    ('inspect_sandboxes', 'inspect_ai', 'UKGovernmentBEIS/inspect_ai', 'docs/sandboxing.qmd', 94, 110),
    ('lighteval_gsm8k', 'lighteval', 'huggingface/lighteval', 'src/lighteval/tasks/tasks/gsm8k.py', 1, None),
    ('lighteval_math_scorer', 'lighteval', 'huggingface/lighteval', 'src/lighteval/metrics/metrics.py', 85, 110),
    ('lighteval_readme_entry', 'lighteval', 'huggingface/lighteval', 'README.md', None, None),
    ('helm_gsm_runspec', 'helm', 'stanford-crfm/helm', 'src/helm/benchmark/run_specs/lite_run_specs.py', 137, 158),
    ('helm_gsm_scenario', 'helm', 'stanford-crfm/helm', 'src/helm/benchmark/scenarios/gsm_scenario.py', 48, 70),
    ('helm_final_number', 'helm', 'stanford-crfm/helm', 'src/helm/benchmark/metrics/evaluate_reference_metrics.py', 145, 161),
    ('helm_readme_note', 'helm', 'stanford-crfm/helm', 'README.md', 25, 25),
    ('simple_evals_mgsm', 'simple-evals', 'openai/simple-evals', 'mgsm_eval.py', 15, 105),
    ('simple_evals_readme', 'simple-evals', 'openai/simple-evals', 'README.md', 1, 6),
    ('simple_evals_background', 'simple-evals', 'openai/simple-evals', 'README.md', 58, 71),
    ('openai_evals_yaml', 'evals', 'openai/evals', 'evals/registry/evals/multistep-word-problems.yaml', 1, None),
    ('openai_evals_match', 'evals', 'openai/evals', 'evals/api.py', 79, 104),
    ('openai_evals_readme', 'evals', 'openai/evals', 'README.md', 66, 74),
    ('evalchemy_math500', 'evalchemy', 'mlfoundations/evalchemy', 'eval/chat_benchmarks/MATH500/eval_instruct.py', 1, 107),
    ('evalchemy_readme', 'evalchemy', 'mlfoundations/evalchemy', 'README.md', 1, 8),
    ('unitxt_mmlu_card', 'unitxt', 'IBM/unitxt', 'src/unitxt/catalog/cards/mmlu/abstract_algebra.json', 1, 33),
    ('unitxt_readme', 'unitxt', 'IBM/unitxt', 'README.md', 36, 60),
    ('inspect_evals_contributing', 'inspect_evals', 'UKGovernmentBEIS/inspect_evals', 'CONTRIBUTING.md', 1, None),
    ('inspect_evals_register', 'inspect_evals', 'UKGovernmentBEIS/inspect_evals', 'EVAL_REGISTER.md', 1, 40),
    ('helm_maintenance', 'helm', 'stanford-crfm/helm', 'docs/maintenance_mode.md', 1, None),
    ('lmeval_interface_chat', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'docs/interface.md', 75, 120),
    ('lmeval_instance_types', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'lm_eval/api/instance.py', 1, 30),
    ('lighteval_inspect_doc', 'lighteval', 'huggingface/lighteval', 'docs/source/inspect-ai.mdx', 1, 30),
    ('helm_exact_match', 'helm', 'stanford-crfm/helm', 'src/helm/benchmark/metrics/evaluate_reference_metrics.py', 67, 71),
    ('lmeval_mc_norm', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'lm_eval/api/task.py', 1490, 1562),
    ('lmeval_regex_filter', 'lm-evaluation-harness', 'EleutherAI/lm-evaluation-harness', 'lm_eval/filters/extraction.py', 1, 80),
    ('inspect_hf_provider', 'inspect_ai', 'UKGovernmentBEIS/inspect_ai', 'src/inspect_ai/model/_providers/hf.py', 100, 125),
    ('inspect_perplexity_doc', 'inspect_ai', 'UKGovernmentBEIS/inspect_ai', 'docs/perplexity.qmd', 1, 30),
    ('simple_evals_sampler', 'simple-evals', 'openai/simple-evals', 'sampler/chat_completion_sampler.py', 15, 40),
    ('promptfoo_example', 'promptfoo', 'promptfoo/promptfoo', 'examples/getting-started/promptfooconfig.yaml', 1, None),
    ('promptfoo_readme', 'promptfoo', 'promptfoo/promptfoo', 'README.md', 1, 25),
]

src = {}
for key, repo, slug, path, a, b in FILES:
    p = os.path.join(CL, repo, path)
    if not os.path.exists(p):
        print('missing', key, p); continue
    sha, date = head(repo)
    lines = open(p, encoding='utf-8').read().split('\n')
    if key == 'inspect_match':  # the match_str function only
        a = next(i for i, l in enumerate(lines) if l.startswith('def match_str')) + 1
        b = a + 125
    if key == 'lighteval_readme_entry':
        a = next(i for i, l in enumerate(lines) if 'entry points for model evaluation' in l) + 1
        b = a + 12
    a = a or 1
    b = min(b or len(lines), len(lines))
    text = '\n'.join(lines[a - 1:b])
    ext = os.path.splitext(path)[1] or '.txt'
    fn = key + ext
    open(os.path.join(OUT, fn), 'w', encoding='utf-8').write(text + '\n')
    src[key] = dict(repo=slug, commit=sha, commit_date=date, path=path, lines=[a, b], file=fn,
                    url=f'https://github.com/{slug}/blob/{sha}/{path}#L{a}-L{b}')
    print(key, slug, sha[:7], date, a, b)

# web pages (text extracts)
def textof(fn):
    s = open(os.path.join(WEB, fn), encoding='utf-8').read()
    s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    import html
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\s+', ' ', s)
if os.path.exists(os.path.join(WEB, 'promptfoo_openai.html')):
    t = textof('promptfoo_openai.html'); i = t.find('Promptfoo is joining OpenAI March')
    open(os.path.join(OUT, 'promptfoo_joining_openai.txt'), 'w').write(t[i:i + 1400] + '\n')
for fn, a, b in [('bt_run-in-code.md', 75, 105), ('bt_evaluate.md', 9, 30), ('bt_evaluate_score-online.md', 1, 40)]:
    p = os.path.join(WEB, fn)
    if os.path.exists(p):
        L = open(p, encoding='utf-8').read().split('\n')
        open(os.path.join(OUT, fn.replace('.md', '.txt')), 'w').write('\n'.join(L[a - 1:b]) + '\n')
json.dump(src, open(os.path.join(OUT, 'sources.json'), 'w'), indent=1)

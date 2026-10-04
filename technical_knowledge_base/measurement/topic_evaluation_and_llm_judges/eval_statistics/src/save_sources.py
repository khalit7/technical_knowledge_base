"""Copy short verbatim passages from the fetched sources (arXiv HTML pages, blog, docs, library code; fetched 2026-10-04
into a scratch folder, not committed) to inputs/source_extracts.json, so every quoted number on the page can be checked.
usage: python3 save_sources.py <scratch dir with the fetched text files>"""
import sys, os, json, re
D = sys.argv[1]
def grab(f, start, length):
    t = open(os.path.join(D, f)).read()
    i = t.find(start)
    assert i >= 0, (f, start)
    return t[i:i + length]
X = {
 'miller_2411.00640v1': {'url': 'https://arxiv.org/html/2411.00640v1', 'passages': [
   grab('miller.txt', 'Table 2: We suggest two new reporting practices', 300),
   grab('miller.txt', '# Questions # Clusters', 700),
   grab('miller.txt', 'Going from K = 1 K=1', 600),
   grab('miller.txt', 'In this case, reducing the sampling temperature', 300),
   grab('miller.txt', 'In this case, using paired differences will reduce', 200),
   grab('miller.txt', 'Eval Model Baseline Model', 420),
   grab('miller.txt', 'Then the eval will need to contain at least', 420),
   grab('miller.txt', 'It follows from Equation 10', 220),
   grab('miller.txt', 'Eval \\ Model', 260)]},
 'anthropic_blog_2024-11-19': {'url': 'https://www.anthropic.com/research/statistical-approach-to-model-evals', 'passages': [
   grab('cd9dc01e.txt', 'In practice, we have found that clustered', 160),
   grab('cd9dc01e.txt', 'In practice, we find the correlation', 200),
   grab('cd9dc01e.txt', 'We are not aware of an open-source', 120)]},
 'madaan_2406.10229v1': {'url': 'https://arxiv.org/html/2406.10229v1', 'passages': [
   grab('2406.10229.txt', 'Benchmark Size Chance', 1100),
   grab('2406.10229.txt', 'Generally, the 7B seed variance is well below', 200)]},
 'bowyer_2503.01747v3': {'url': 'https://arxiv.org/html/2503.01747v3', 'passages': [
   grab('2503.01747.txt', 'As an example, in the N{=}100 column', 330),
   grab('2503.01747.txt', 'we generate 200 independent datasets', 200),
   grab('2503.01747.txt', 'We would, therefore, recommend using WS or Bayesian', 120)]},
 'card_2010.06595': {'url': 'https://arxiv.org/abs/2010.06595', 'passages': [
   grab('2010.06595.txt', 'For machine translation, we find that typical', 140),
   grab('2010.06595.txt', 'By drawing many samples from this distribution of size n=500', 900),
   grab('2010.06595.txt', 'Dataset Size SOTA (%)', 420)]},
 'hochlehnert_2504.07086': {'url': 'https://arxiv.org/html/2504.07086', 'passages': [
   grab('2504.07086.txt', 'Pass@1 values show surprisingly high standard deviation', 330),
   grab('2504.07086.txt', 'Qwen2.5-Math-1.5B achieved', 200)]},
 'heineman_2508.13144': {'url': 'https://arxiv.org/html/2508.13144', 'passages': [
   grab('2508.13144.txt', 'within the final 30 checkpoints of training for 1B models', 140),
   grab('2508.13144.txt', 'we find a strong correlation between SNR and decision accuracy', 120)]},
 'bean_2511.04703': {'url': 'https://arxiv.org/html/2511.04703', 'passages': [
   grab('bean.txt', 'we conduct a systematic review of 445 LLM benchmarks', 120),
   grab('bean.txt', '16.0% used uncertainty estimates', 120)]},
 'statsforevals_2026-10-04': {'url': 'https://statsforevals.com/', 'passages': [
   grab('59d1c59b.txt', 'Last updated', 40), grab('59d1c59b.txt', "I'm Ian Arawjo", 120)]},
 'inspect_std_py_2026-10-04': {'url': 'https://github.com/UKGovernmentBEIS/inspect_ai/blob/main/src/inspect_ai/scorer/_metrics/std.py', 'passages': [
   grab('inspect_std.py', 'def _clustered_stderr', 900)]},
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'source_extracts.json')
json.dump(X, open(out, 'w'), indent=1, ensure_ascii=False)
print(out, os.path.getsize(out))

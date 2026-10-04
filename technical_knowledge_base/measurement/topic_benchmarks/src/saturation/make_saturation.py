"""Build data/saturation.json and parts/33_js_sat_a.js (the Saturation timeline tab's data).

Inputs: inputs/*.json (trimmed by fetch_inputs.py from downloads made on 2026-10-04) plus the
hand-curated points below, each with the source that first states it (verbatim quotes in notes.md).
Run: python3 make_saturation.py   (then python3 check_saturation.py)

Conventions
- One benchmark has one or more series. A series is one version + harness + split + who ran it.
  Points from different series are never joined by a line.
- Each point: d = date the model or system was first public (model release date for tracker runs,
  paper or results date otherwise); v = score in percent; k = who reported it:
    ind   independent tracker or organiser-scored hidden test (Epoch AI, ARC Prize, MathArena,
          EvalPlus, HELM, Artificial Analysis, ILSVRC organisers)
    board leaderboard hosted by the benchmark's maintainers with self-submitted entries
    bench the benchmark's own authors at launch
    lab   the model's developer (vendor-reported)
- Only records are kept inside a series (each point beats every earlier point of that series),
  plus the launch-day point.
"""
import json, pathlib, datetime as dt

HERE = pathlib.Path(__file__).parent
INP = HERE / 'inputs'
AS_OF = '2026-10-04'

S = {}  # source registry: id -> [title, url]
def src(i, t, u): S[i] = [t, u]; return i

# ---------- sources ----------
src('russ', 'Russakovsky et al. 2015, ILSVRC paper (Table 9)', 'https://arxiv.org/abs/1409.0575')
for y in range(2010, 2018): src(f'ilsvrc{y}', f'ILSVRC {y} results', f'https://image-net.org/challenges/LSVRC/{y}/results')
src('ilsvrc17news', 'ILSVRC 2017 news ("Jul 17, 2017: Results announced")', 'https://image-net.org/challenges/LSVRC/2017/index.php')
src('glue1', 'Wang et al., GLUE, arXiv v1 (20 Apr 2018), Table 5', 'https://arxiv.org/abs/1804.07461v1')
src('glue3', 'Wang et al., GLUE, arXiv v3 (22 Feb 2019), Table 4 and footnote 3', 'https://arxiv.org/abs/1804.07461v3')
src('nangia', 'Nangia and Bowman 2019, human performance on GLUE', 'https://arxiv.org/abs/1905.10425')
src('bert', 'Devlin et al., BERT (11 Oct 2018)', 'https://arxiv.org/abs/1810.04805')
src('mtdnnkd', 'Liu et al., MT-DNN-KD (20 Apr 2019), Table 2, leaderboard as of 1 Apr 2019', 'https://arxiv.org/abs/1904.09482')
src('roberta', 'Liu et al., RoBERTa (26 Jul 2019)', 'https://arxiv.org/abs/1907.11692')
src('albert', 'Lan et al., ALBERT (26 Sep 2019)', 'https://arxiv.org/abs/1909.11942')
src('t5', 'Raffel et al., T5 (23 Oct 2019)', 'https://arxiv.org/abs/1910.10683')
src('sglue', 'Wang et al., SuperGLUE (2 May 2019), Table 2', 'https://arxiv.org/abs/1905.00537')
src('deberta', 'He et al., DeBERTa (abstract; leaderboard as of 6 Jan 2021)', 'https://arxiv.org/abs/2006.03654')
src('ernie3', 'Sun et al., ERNIE 3.0 (5 Jul 2021)', 'https://arxiv.org/abs/2107.02137')
src('hswag', 'Zellers et al., HellaSwag (19 May 2019), Table 1', 'https://arxiv.org/abs/1905.07830')
src('helm_hs', 'Stanford HELM Classic, HellaSwag (via Epoch AI hub)', 'https://crfm.stanford.edu/helm/classic/latest/#/groups/hellaswag')
src('mmlu', 'Hendrycks et al., MMLU (7 Sep 2020)', 'https://arxiv.org/abs/2009.03300')
src('gopher', 'Rae et al., Gopher (8 Dec 2021), Table 5', 'https://arxiv.org/abs/2112.11446')
src('chin', 'Hoffmann et al., Chinchilla (29 Mar 2022)', 'https://arxiv.org/abs/2203.15556')
src('flan', 'Chung et al., Flan-PaLM (20 Oct 2022)', 'https://arxiv.org/abs/2210.11416')
src('gpt4', 'OpenAI, GPT-4 technical report (15 Mar 2023), Table 2', 'https://arxiv.org/abs/2303.08774')
src('o1', 'OpenAI, Learning to reason with LLMs (12 Sep 2024)', 'https://openai.com/index/learning-to-reason-with-llms/')
src('helm_mmlu', 'Stanford HELM Lite, MMLU (via Epoch AI hub)', 'https://crfm.stanford.edu/helm/lite/latest/#/leaderboard/mmlu')
src('gsm8k', 'Cobbe et al., GSM8K (27 Oct 2021)', 'https://arxiv.org/abs/2110.14168')
src('palm', 'Chowdhery et al., PaLM (5 Apr 2022), section 6.3', 'https://arxiv.org/abs/2204.02311')
src('helm_gsm', 'Stanford HELM Classic, GSM8K (via Epoch AI hub)', 'https://crfm.stanford.edu/helm/classic/latest/#/groups/gsm')
src('math', 'Hendrycks et al., MATH (5 Mar 2021)', 'https://arxiv.org/abs/2103.03874')
src('minerva', 'Lewkowycz et al., Minerva (29 Jun 2022), Table 3', 'https://arxiv.org/abs/2206.14858')
src('codex', 'Chen et al., Codex and HumanEval (7 Jul 2021)', 'https://arxiv.org/abs/2107.03374')
src('evalplus', 'EvalPlus leaderboard (results.json, read 4 Oct 2026)', 'https://evalplus.github.io/leaderboard.html')
src('gpqa', 'Rein et al., GPQA (20 Nov 2023), Tables 2 and 5', 'https://arxiv.org/abs/2311.12022')
src('ep_gpqa', 'Epoch AI, GPQA Diamond methodology page', 'https://epoch.ai/benchmarks/gpqa-diamond')
src('ep_hub', 'Epoch AI benchmarking hub (benchmark_data.zip, read 4 Oct 2026)', 'https://epoch.ai/benchmarks')
src('ep_swe', 'Epoch AI, SWE-bench Verified methodology page', 'https://epoch.ai/benchmarks/swe-bench-verified')
src('ep_hle', 'Epoch AI hub, Humanity\'s Last Exam (external results)', 'https://epoch.ai/benchmarks/hle')
src('swev', 'OpenAI, Introducing SWE-bench Verified (13 Aug 2024)', 'https://openai.com/index/introducing-swe-bench-verified/')
src('arc1', 'Chollet, On the Measure of Intelligence (5 Nov 2019)', 'https://arxiv.org/abs/1911.01547')
src('arclb', 'ARC Prize leaderboard (data generated 1 Oct 2026)', 'https://arcprize.org/leaderboard')
src('arc2post', 'ARC Prize, Announcing ARC-AGI-2 and ARC Prize 2025 (24 Mar 2025)', 'https://arcprize.org/blog/announcing-arc-agi-2-and-arc-prize-2025')
src('arcblog', 'ARC Prize blog index ("03.25.26 Announcing ARC-AGI-3")', 'https://arcprize.org/blog')
src('arc3astra', 'ARC Prize, GPT-6 Astra results page (harness definitions)', 'https://arcprize.org/results/openai-gpt-6-astra')
src('officechai', 'OfficeChai, ARC-AGI-3 released (26 Mar 2026)', 'https://officechai.com/ai/arc-agi-3/')
src('hle', 'Phan et al., Humanity\'s Last Exam, arXiv v1 (24 Jan 2025), Table 1', 'https://arxiv.org/abs/2501.14249v1')
src('fm', 'Glazer et al., FrontierMath (7 Nov 2024)', 'https://arxiv.org/abs/2411.04872')
src('osw', 'Xie et al., OSWorld (11 Apr 2024)', 'https://arxiv.org/abs/2404.07972')
src('anthcu', 'Anthropic, Introducing computer use (22 Oct 2024)', 'https://www.anthropic.com/news/3-5-models-and-computer-use')
src('oswsite', 'OSWorld-Verified leaderboard (via Epoch AI hub)', 'https://os-world.github.io/')
src('anthopus45', 'Anthropic, Claude Opus 4.5 announcement (via Epoch AI hub)', 'https://www.anthropic.com/news/claude-opus-4-5')
src('osw2', 'OSWorld 2.0 leaderboard (via Epoch AI hub; launch date from Epoch metadata)', 'https://osworld-v2.xlang.ai/')
src('matharena', 'MathArena competition tables (read 4 Oct 2026)', 'https://matharena.ai/')
src('aime25', 'AIME 2025: AIME I on 6 Feb, AIME II on 12 Feb 2025 (AoPS wiki)', 'https://artofproblemsolving.com/wiki/index.php/2025_AIME_II')
src('aime26', 'AIME 2026: AIME I on 5 Feb, AIME II on 11 Feb 2026 (AoPS wiki)', 'https://artofproblemsolving.com/wiki/index.php/2026_AIME_II')
src('tb1', 'Terminal-Bench blog index (Terminal-Bench 1.0 announced 19 May 2025)', 'https://www.tbench.ai/news')
src('tb2', 'Terminal-Bench 2.0 and Harbor (7 Nov 2025)', 'https://www.tbench.ai/news/announcement-2-0')
src('tb2lb', 'Terminal-Bench 2.0 leaderboard (via Epoch AI hub)', 'https://www.tbench.ai/leaderboard/terminal-bench/2.0')
src('tb21', 'Terminal-Bench 2.1 (6 May 2026)', 'https://www.tbench.ai/news/terminal-bench-2-1')
src('tb3', 'Terminal-Bench 3.0 announcement (post dated 30 Jul 2026)', 'https://www.tbench.ai/news/terminal-bench-3-0')
src('tb3gh', 'terminal-bench v3.0.0 release (tagged 23 Jul 2026)', 'https://github.com/harbor-framework/terminal-bench/releases/tag/v3.0.0')
src('tb4', 'Terminal-Bench 4.0 announcement (post dated 28 Aug 2026)', 'https://www.tbench.ai/news/terminal-bench-4-0')
src('tb4gh', 'terminal-bench v4.0.0 release (tagged 26 Aug 2026)', 'https://github.com/harbor-framework/terminal-bench/releases/tag/v4.0.0')
src('unite', 'Unite.AI on Claude Sonnet 5.5 (Anthropic figures)', 'https://www.unite.ai/anthropic-releases-claude-sonnet-5-5-at-unchanged-sonnet-5-')
src('oaastra', 'OpenAI, GPT-6 Astra', 'https://openai.com/index/gpt-6-astra/')
src('mtp', 'MarkTechPost on Grok 4.7 (xAI figures)', 'https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/')
src('tbs', 'Terminal-Bench-Science 0.1 announcement (27 Aug 2026)', 'https://www.tbench.ai/news/terminal-bench-science-0-1')
src('tbsgh', 'terminal-bench-science v0.1.0 release (26 Aug 2026)', 'https://github.com/harbor-framework/terminal-bench-science/releases/tag/v0.1.0')
src('aa', 'Artificial Analysis model pages (read 1 Oct 2026 for Topic: llms)', 'https://artificialanalysis.ai/evaluations/terminal-bench-science')
src('anthfable51', 'Anthropic, Claude Fable and Mythos 5.1', 'https://www.anthropic.com/claude-fable-and-mythos-5-1')
src('anthopus55', 'Anthropic, Claude Opus 5.5 system card', 'https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf')
src('argon', 'Google, Gemini 4 Argon announcement table (image, transcribed)', 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/')
src('llmsbench', 'Topic: llms, Benchmarks tab', 'https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286')

def P(d, v, m, k, s, n=None, **kw):
    p = {'d': d, 'v': round(float(v), 2), 'm': m, 'k': k, 's': s}
    if n: p['n'] = n
    p.update(kw)
    return p

def records(pts):
    """keep the points that beat every earlier point (ties keep the first); launch-day markers kept"""
    pts = sorted(pts, key=lambda p: (p['d'], -p['v']))
    out, best = [], -1e9
    for p in pts:
        if p['v'] > best + 1e-9 or p.get('keep'):
            out.append(p); best = max(best, p['v'])
    for p in out: p.pop('keep', None)
    return out

EP = json.load(open(INP / 'epoch_rows.json'))['files']
NAMES = json.load(open(INP / 'epoch_model_names.json'))
EFF = {'high': 'high', 'xhigh': 'xhigh', 'max': 'max', 'medium': 'medium', 'low': 'low'}
def pretty(mv):
    n = NAMES.get(mv, {}).get('name') or mv
    tail = mv.rsplit('_', 1)[-1] if '_' in mv else ''
    if tail in EFF and EFF[tail] not in n.lower(): n += f' ({EFF[tail]})'
    elif tail.endswith('K') and tail[:-1].isdigit(): n += f' ({tail} thinking)'
    return n

def epoch_series(f, s, scale=100, filt=None, kind=lambda r: 'ind', srcf=None, note=None):
    pts = []
    for r in EP[f]['rows']:
        if not r['release']: continue
        if filt and not filt(r): continue
        n = note(r) if note else None
        extra = {}
        if r.get('Started at'): extra['rd'] = r['Started at'][:10]
        pts.append(P(r['release'], r['v'] * scale, pretty(r['model']), kind(r), srcf(r) if srcf else s, n, **extra))
    return records(pts)

B = []  # benchmarks
def bench(**kw): B.append(kw); return kw

# ---------- ImageNet (ILSVRC) ----------
err = lambda e: round(100 - 100 * e, 2)
bench(id='imagenet', atlas=None, name='ImageNet (ILSVRC) top-5', fam='Vision', era='Perception',
      launch={'d': '2010-09-03', 's': 'ilsvrc2010', 'n': 'First full results of the ILSVRC classification task (the date the ILSVRC 2010 page gives for them).'},
      unit='% top-5 accuracy (100 minus top-5 error)', chance=0.5,
      human={'v': 94.9, 's': 'russ', 'who': 'One trained annotator (A1), 5.1% top-5 error on 1,500 test images of ILSVRC 2012 to 2014'},
      retired={'d': '2017-07-26', 'n': 'The challenge ended in 2017 and passed to Kaggle.', 's': 'ilsvrc17news'},
      series=[
        {'id': 'i10', 'label': 'ILSVRC 2010 test set', 'ver': '2010 data', 'harness': 'competition entry, provided training data', 'by': 'ILSVRC organisers (hidden test labels)', 'pts': [P('2010-09-03', err(0.28191), 'NEC-UIUC', 'ind', 'ilsvrc2010')]},
        {'id': 'i11', 'diff': 'a later test set', 'label': 'ILSVRC 2011 test set', 'ver': '2011 data', 'harness': 'competition entry', 'by': 'ILSVRC organisers', 'pts': [P('2011-10-26', err(0.25770), 'XRCE', 'ind', 'ilsvrc2011')]},
        {'id': 'i12', 'diff': 'a later test set', 'label': 'ILSVRC 2012 to 2017 test set', 'ver': '2012 data, 1,000 classes', 'harness': 'competition entry, provided training data only', 'by': 'ILSVRC organisers', 'pts': records([
            P('2012-10-13', err(0.16422), 'SuperVision (AlexNet)', 'ind', 'ilsvrc2012', 'Provided data only; 15.3% error with extra ImageNet data, not counted here.'),
            P('2013-11-14', err(0.11743), 'Clarifai', 'ind', 'ilsvrc2013', 'Original data only; 11.2% with outside data.'),
            P('2014-08-18', err(0.06656), 'GoogLeNet', 'ind', 'ilsvrc2014'),
            P('2015-12-10', err(0.03567), 'MSRA (ResNet ensemble)', 'ind', 'ilsvrc2015'),
            P('2016-09-26', err(0.02991), 'Trimps-Soushen', 'ind', 'ilsvrc2016'),
            P('2017-07-17', err(0.02251), 'WMW (SENet ensemble)', 'ind', 'ilsvrc2017')])},
      ])

# ---------- GLUE ----------
bench(id='glue', atlas=None, name='GLUE', fam='Language understanding', era='Language',
      launch={'d': '2018-04-20', 's': 'glue1'}, unit='GLUE score (average of 9 tasks)', chance=None,
      human={'v': 87.1, 's': 'nangia', 'who': 'Crowdworkers, conservative estimate (Nangia and Bowman, May 2019)'},
      retired={'d': '2019-05-02', 'n': 'Succeeded by SuperGLUE, launched because GLUE was nearly at human level.', 's': 'sglue'},
      series=[
        {'id': 'g0', 'label': 'GLUE paper v1 baselines', 'ver': 'first release (original QNLI)', 'harness': 'paper baselines', 'by': 'benchmark authors', 'pts': [P('2018-04-20', 60.3, 'BiLSTM + ELMo (single task)', 'bench', 'glue1', 'Best macro-average in v1 Table 5. The v3 paper (Feb 2019) rescored its baselines on revised tasks: the best becomes 70.0, the same models on a different version.')]},
        {'id': 'g1', 'label': 'GLUE leaderboard, original QNLI', 'ver': '2018 leaderboard', 'harness': 'hidden test via evaluation server', 'by': 'model authors, server-scored', 'pts': [
            P('2018-06-11', 72.8, 'OpenAI GPT', 'board', 'bert', 'Quoted by the BERT paper: "OpenAI GPT, which obtains 72.8 as of the date of writing". Date: GPT release.'),
            P('2018-10-11', 80.5, 'BERT-large', 'board', 'bert')]},
        {'id': 'g2', 'diff': 'a later version', 'label': 'GLUE leaderboard after the QNLI re-release', 'ver': '2019 leaderboard (QNLI v2)', 'harness': 'hidden test via evaluation server', 'by': 'model authors, server-scored', 'pts': records([
            P('2019-04-20', 83.7, 'MT-DNN-KD', 'board', 'mtdnnkd', 'Table 2 lists the leaderboard on 1 Apr 2019 with BERT-large still at 80.5.'),
            P('2019-06-19', 88.4, 'XLNet', 'board', 'roberta', 'Quoted by RoBERTa: "matching the 88.4 reported by Yang et al. (2019)".'),
            P('2019-07-26', 88.5, 'RoBERTa', 'board', 'roberta'),
            P('2019-09-26', 89.4, 'ALBERT', 'board', 'albert'),
            P('2019-10-23', 90.3, 'T5-11B', 'board', 't5')])},
      ])

# ---------- SuperGLUE ----------
bench(id='superglue', atlas=None, name='SuperGLUE', fam='Language understanding', era='Language',
      launch={'d': '2019-05-02', 's': 'sglue'}, unit='SuperGLUE score (average of 8 tasks)', chance=None,
      human={'v': 89.8, 's': 'sglue', 'who': 'Crowdworker estimate in the SuperGLUE paper'},
      series=[
        {'id': 'sg', 'label': 'SuperGLUE leaderboard (hidden test)', 'ver': '1.0', 'harness': 'fine-tuned models, server-scored', 'by': 'model authors, server-scored', 'pts': records([
            P('2019-05-02', 71.5, 'BERT++ (paper baseline)', 'bench', 'sglue'),
            P('2019-07-26', 84.6, 'RoBERTa', 'board', 't5', 'Quoted by T5 as the previous state of the art (Liu et al., 2019c). Date: RoBERTa paper.'),
            P('2019-10-23', 88.9, 'T5-11B', 'board', 't5'),
            P('2021-01-06', 90.3, 'DeBERTa (ensemble)', 'board', 'deberta', 'Single model 89.9, the first single model above the 89.8 human estimate.'),
            P('2021-07-05', 90.6, 'ERNIE 3.0', 'board', 'ernie3', 'Paper: first place on 3 July 2021.')])},
      ])

# ---------- HellaSwag ----------
hs_lab = epoch_series('hella_swag_external.csv', 'ep_hub', filt=lambda r: 'HELM' not in r['Source'], kind=lambda r: 'lab',
                      note=lambda r: f"{r['Shots']}-shot; reported in {r['Source']}" if r['Shots'] else f"reported in {r['Source']}")
bench(id='hellaswag', atlas='hellaswag_wino_arc', name='HellaSwag', fam='Language understanding', era='Language',
      launch={'d': '2019-05-19', 's': 'hswag'}, unit='% accuracy, 4 options', chance=25,
      human={'v': 95.6, 's': 'hswag', 'who': 'Human accuracy on the test set (paper Table 1)'},
      series=[
        {'id': 'hs0', 'label': 'Fine-tuned on HellaSwag, test set', 'ver': '1.0', 'harness': 'fine-tuned classifier', 'by': 'benchmark authors', 'pts': [P('2019-05-19', 47.3, 'BERT-large', 'bench', 'hswag')]},
        {'id': 'hs1', 'diff': 'the validation split', 'label': 'Few-shot language models, lab and paper reports', 'ver': '1.0, validation set', 'harness': 'mixed shots (0 to 10)', 'by': 'model developers, compiled by Epoch AI', 'pts': hs_lab},
        {'id': 'hs2', 'label': 'HELM Classic, 0-shot', 'ver': '1.0', 'harness': 'HELM Classic prompt', 'by': 'Stanford CRFM', 'pts': epoch_series('hella_swag_external.csv', 'helm_hs', filt=lambda r: 'HELM' in r['Source'])},
      ])

# ---------- MMLU ----------
bench(id='mmlu', atlas='mmlu', name='MMLU', fam='Knowledge', era='Language',
      launch={'d': '2020-09-07', 's': 'mmlu'}, unit='% accuracy, 4 options', chance=25,
      human={'v': 89.8, 's': 'mmlu', 'who': 'Estimated expert-level accuracy (95th percentile of human test-takers, partly an educated guess)'},
      series=[
        {'id': 'm1', 'label': 'Few-shot, paper and lab reports', 'ver': 'original 14,042 test questions', 'harness': '5-shot unless noted', 'by': 'benchmark authors, then model developers', 'pts': records([
            P('2020-09-07', 43.9, 'GPT-3 175B (5-shot)', 'bench', 'mmlu', 'UnifiedQA (fine-tuned, a different protocol) scored 48.9 in the same paper.'),
            P('2021-12-08', 60.0, 'Gopher (5-shot)', 'lab', 'gopher'),
            P('2022-03-29', 67.5, 'Chinchilla (5-shot)', 'lab', 'chin'),
            P('2022-10-20', 75.2, 'Flan-PaLM 540B', 'lab', 'flan', 'Five-shot with chain of thought and self-consistency.'),
            P('2023-03-14', 86.4, 'GPT-4 (5-shot)', 'lab', 'gpt4'),
            P('2024-09-12', 92.3, 'o1 (pass@1)', 'lab', 'o1')])},
        {'id': 'm2', 'label': 'HELM Lite, 5-shot', 'ver': 'original test set', 'harness': 'HELM Lite prompt', 'by': 'Stanford CRFM', 'pts': epoch_series('mmlu_external.csv', 'helm_mmlu', filt=lambda r: 'CRFM' in r['Source'])},
      ])

# ---------- GSM8K ----------
bench(id='gsm8k', atlas='gsm8k', name='GSM8K', fam='Math', era='Language',
      launch={'d': '2021-10-27', 's': 'gsm8k'}, unit='% of 1,319 test problems', chance=0, human=None,
      humanNote='No measured human score: the paper says "A bright middle school student should be able to solve every problem."',
      series=[
        {'id': 'k1', 'label': 'Paper and lab reports', 'ver': 'test set', 'harness': 'mixed: fine-tuning with verifier, then chain-of-thought prompting', 'by': 'benchmark authors, then model developers', 'pts': records([
            P('2021-10-27', 55, 'GPT-3 175B fine-tuned + verifier', 'bench', 'palm', 'The prior best quoted by PaLM: "the prior SOTA of 55% from Cobbe et al. (2021)".'),
            P('2022-04-05', 58, 'PaLM 540B (8-shot CoT + calculator)', 'lab', 'palm'),
            P('2023-03-14', 92.0, 'GPT-4 (5-shot CoT)', 'lab', 'gpt4', 'Footnoted in the report: part of the GSM8K training set was mixed into GPT-4\'s training.')])},
        {'id': 'k2', 'label': 'HELM Classic, 5-shot', 'ver': 'test set', 'harness': 'HELM Classic prompt', 'by': 'Stanford CRFM', 'pts': epoch_series('gsm8k_external.csv', 'helm_gsm', filt=lambda r: 'HELM' in r['Source'])},
      ])

# ---------- MATH ----------
bench(id='math', atlas='math', name='MATH', fam='Math', era='Language',
      launch={'d': '2021-03-05', 's': 'math'}, unit='% of problems', chance=0,
      human={'v': 90, 's': 'math', 'who': 'One three-time IMO gold medallist (a computer science PhD student scored about 40%)'},
      series=[
        {'id': 'ma1', 'label': 'Full test set (5,000), paper and lab reports', 'ver': 'MATH test', 'harness': 'mixed prompting, pass@1', 'by': 'benchmark authors, then model developers', 'pts': records([
            P('2021-03-05', 6.9, 'GPT-2 1.5B fine-tuned', 'bench', 'math', 'Paper: "accuracies ranging from 3.0% to 6.9%".'),
            P('2022-06-29', 33.6, 'Minerva 540B', 'lab', 'minerva', 'Pass@1; 50.3% with majority voting over samples (maj1@k), a different protocol.'),
            P('2023-03-14', 42.5, 'GPT-4 (4-shot)', 'lab', 'gpt4')])},
        {'id': 'ma2', 'diff': 'a 500-problem subset', 'label': 'MATH-500 subset, lab reports', 'ver': '500-problem split of Lightman et al.', 'harness': 'pass@1', 'by': 'OpenAI', 'pts': [P('2024-09-12', 94.8, 'o1', 'lab', 'o1', 'OpenAI: "Our evaluations used the same 500 problem test split".')]},
        {'id': 'ma3', 'diff': 'the Level 5 subset', 'label': 'MATH Level 5 (1,324 hardest), Epoch AI runs', 'ver': 'Level 5 subset', 'harness': 'Epoch AI prompt', 'by': 'Epoch AI', 'pts': epoch_series('math_level_5.csv', 'ep_hub')},
      ])

# ---------- HumanEval ----------
ev = json.load(open(INP / 'evalplus_humaneval.json'))['rows']
EVD = {'GPT-4 (May 2023)': ('2023-05-15', 'm'), 'GPT-4-Turbo (April 2024)': ('2024-04-09', None), 'GPT 4o (Aug 2024)': ('2024-08-06', None), 'O1 Preview (Sept 2024)': ('2024-09-12', None)}
evpts = [P(d, ev[k]['humaneval'], k, 'ind', 'evalplus', 'Base HumanEval tests, greedy pass@1. Date from the month in EvalPlus\'s model name' + (' (mid-month assumed).' if prec else ' (matched to the model version\'s release).')) for k, (d, prec) in EVD.items()]
bench(id='humaneval', atlas='humaneval', name='HumanEval', fam='Coding', era='Language',
      launch={'d': '2021-07-07', 's': 'codex'}, unit='% pass@1 of 164 problems', chance=0, human=None,
      series=[
        {'id': 'he1', 'label': 'Paper and lab reports', 'ver': '164 problems', 'harness': 'pass@1, 0-shot', 'by': 'OpenAI (benchmark author and model developer)', 'pts': records([
            P('2021-07-07', 28.8, 'Codex-12B', 'bench', 'codex', 'GPT-3 solves 0%; with 100 samples per problem Codex solves 70.2% (pass@100, a different metric).'),
            P('2023-03-14', 67.0, 'GPT-4', 'lab', 'gpt4')])},
        {'id': 'he2', 'label': 'EvalPlus leaderboard, base tests', 'ver': '164 problems', 'harness': 'EvalPlus prompt, greedy', 'by': 'EvalPlus', 'pts': records(evpts)},
      ])

# ---------- GPQA Diamond ----------
bench(id='gpqa', atlas='gpqa', name='GPQA Diamond', fam='Knowledge', era='Reasoning',
      launch={'d': '2023-11-20', 's': 'gpqa'}, unit='% of 198 questions, 4 options', chance=25,
      human={'v': 81.3, 's': 'gpqa', 'who': 'Expert validators on the Diamond set (biased upward: Diamond keeps questions both experts got right)', 'alt': [{'v': 69.7, 's': 'ep_gpqa', 'who': 'PhD experts recruited by OpenAI for the o1 launch (as reported by Epoch AI)'}]},
      series=[
        {'id': 'gp0', 'label': 'Paper baseline', 'ver': 'Diamond', 'harness': 'few-shot chain of thought', 'by': 'benchmark authors', 'pts': [P('2023-11-20', 38.8, 'GPT-4 (few-shot CoT)', 'bench', 'gpqa')]},
        {'id': 'gp1', 'label': 'Epoch AI runs', 'ver': 'Diamond', 'harness': 'simple-evals prompt, strict answer format', 'by': 'Epoch AI', 'pts': epoch_series('gpqa_diamond.csv', 'ep_hub')},
      ])

# ---------- SWE-bench Verified ----------
bench(id='swebench_verified', atlas='swebench_verified', name='SWE-bench Verified', fam='Coding', era='Agents',
      launch={'d': '2024-08-13', 's': 'swev'}, unit='% of issues resolved', chance=0, human=None,
      humanNote='No human score; Epoch AI estimates 5 to 10% of samples may still be flawed.',
      series=[
        {'id': 'sw0', 'label': 'OpenAI launch, 500 samples', 'ver': '500 samples', 'harness': 'Agentless scaffold (best of five open scaffolds)', 'by': 'benchmark authors', 'pts': [P('2024-08-13', 33.2, 'GPT-4o + Agentless', 'bench', 'swev')]},
        {'id': 'sw1', 'label': 'Epoch AI runs, 484 samples', 'ver': '484 samples that run on Epoch\'s infrastructure', 'harness': 'Epoch\'s simple bash and editor loop', 'by': 'Epoch AI', 'pts': epoch_series('swe_bench_verified.csv', 'ep_swe')},
      ])

# ---------- ARC-AGI 1, 2, 3 ----------
ARC = json.load(open(INP / 'arc_prize.json'))['sets']
def arc_series(v, types, label, harness, by_filter=None):
    pts = []
    for r in ARC[v]['rows']:
        if r['modelType'] not in types or not r['modelReleaseDate']: continue
        if by_filter and not by_filter(r): continue
        pts.append(P(r['modelReleaseDate'][:10], r['score'] * 100, r['modelDisplayName'].replace(' ¹', ''), 'ind', 'arclb', (('Cost per task $' + format(round(r['costPerTask'], 2), ',')) if r.get('costPerTask') else ('Cost of the evaluation run $' + format(round(r['cost']), ',') + ' (ARC Prize)') if r.get('cost') else None)))
    return {'label': label, 'harness': harness, 'by': 'ARC Prize Foundation (semi-private set)', 'pts': records(pts)}
a1m = arc_series('v1', ('CoT', 'Base LLM'), 'Models, ARC Prize leaderboard', 'model API, with or without extended reasoning')
a1s = arc_series('v1', ('Refinement', 'CoT + Synthesis'), 'Systems with refinement or search, ARC Prize leaderboard', 'refinement loop or program search around a model')
bench(id='arc_agi_1', atlas='arc_agi_1', name='ARC-AGI-1', fam='Reasoning puzzles', era='Reasoning',
      launch={'d': '2019-11-05', 's': 'arc1'}, unit='% of semi-private tasks (pass@2)', chance=0,
      human={'v': 98, 's': 'arc2post', 'who': 'Human panel: tasks solved by at least two people (average person 64.2%)'},
      series=[dict(id='a1m', ver='semi-private set', **a1m), dict(id='a1s', ver='semi-private set', **a1s)],
      note='Kaggle competition systems are left out: the leaderboard file dates Icecuber, the 2020 winner, to 2023-11-03.')
a2m = arc_series('v2', ('CoT', 'Base LLM'), 'Models, ARC Prize leaderboard', 'model API, with or without extended reasoning')
a2s = arc_series('v2', ('Refinement', 'CoT + Synthesis'), 'Systems with refinement or search, ARC Prize leaderboard', 'refinement loop or program search around a model')
bench(id='arc_agi_2', atlas='arc_agi_2', name='ARC-AGI-2', fam='Reasoning puzzles', era='Reasoning',
      launch={'d': '2025-03-24', 's': 'arc2post'}, unit='% of semi-private tasks (pass@2)', chance=0,
      human={'v': 100, 's': 'arc2post', 'who': 'Every task solved by at least two people in two attempts (average test-taker 60%)'},
      series=[dict(id='a2m', ver='semi-private set', **a2m), dict(id='a2s', ver='semi-private set', **a2s)],
      note='Kaggle systems are left out: the file dates NVARC, the ARC Prize 2025 entry, to 2024-11-03, before ARC-AGI-2 existed.')
a3s = arc_series('v3', ('CoT',), 'Standard harness', 'carries forward notes the model chooses to keep', by_filter=lambda r: 'Provider Adapter' not in r['modelDisplayName'])
a3p = arc_series('v3', ('CoT',), 'Provider Adapter harness', 'keeps the provider\'s opaque reasoning state between requests and compacts long conversations', by_filter=lambda r: 'Provider Adapter' in r['modelDisplayName'])
bench(id='arc_agi_3', atlas='arc_agi_3', name='ARC-AGI-3', fam='Reasoning puzzles', era='Agents',
      launch={'d': '2026-03-25', 's': 'arcblog'}, unit='RHAE score: action efficiency relative to humans, %', chance=0,
      human={'v': 100, 's': 'officechai', 'who': 'Humans solve 100% of the environments; the score is defined relative to human action counts'},
      series=[dict(id='a3s', ver='semi-private set', **a3s), dict(id='a3p', ver='semi-private set', **a3p)],
      note='Best AI at launch: 0.37% (OfficeChai); the leaderboard file now lists Gemini 3.1 Pro at 0.42%.')

# ---------- HLE ----------
bench(id='hle', atlas='hle', name="Humanity's Last Exam", fam='Knowledge', era='Reasoning',
      launch={'d': '2025-01-23', 's': 'hle', 'n': 'Paper v1 posted 24 Jan 2025; site launch 23 Jan.'}, unit='% accuracy, 2,500 questions', chance=0, human=None,
      humanNote='No human baseline: the questions were filtered to stump frontier models and written by experts.',
      series=[
        {'id': 'hl0', 'label': 'Paper v1, full set', 'ver': 'public set at launch', 'harness': 'benchmark authors\' prompt', 'by': 'benchmark authors (CAIS and Scale AI)', 'pts': [P('2025-01-24', 9.1, 'o1', 'bench', 'hle', 'DeepSeek-R1 scored 9.4% on the text-only subset, a different split.')]},
        {'id': 'hl1', 'label': 'External results compiled by Epoch AI', 'ver': 'full set', 'harness': 'as reported by the source (not stated per row in the download)', 'by': 'compiled by Epoch AI', 'pts': epoch_series('hle_external.csv', 'ep_hle')},
      ])

# ---------- FrontierMath ----------
bench(id='frontiermath', atlas='frontiermath', name='FrontierMath Tiers 1-3', fam='Math', era='Reasoning',
      launch={'d': '2024-11-07', 's': 'fm'}, unit='% of private problems', chance=0, human=None,
      series=[
        {'id': 'f0', 'label': 'Launch paper', 'ver': 'Nov 2024 set', 'harness': 'multiple attempts', 'by': 'benchmark authors (Epoch AI)', 'pts': [P('2024-11-07', 2, 'best model at launch', 'bench', 'fm', 'Paper: "Current state-of-the-art AI models solve under 2% of problems." An upper bound, not a score.', ub=True)]},
        {'id': 'f1', 'diff': 'a later snapshot', 'label': 'Private set as of 2025-02-28, Epoch AI runs', 'ver': '2025-02-28 private', 'harness': 'Epoch AI agent with Python', 'by': 'Epoch AI', 'pts': epoch_series('frontiermath.csv', 'ep_hub')},
        {'id': 'f2', 'diff': 'a re-based version (v2)', 'label': 'Tiers 1-3 v2, Epoch AI runs', 'ver': 'v2 private (released 2026-06-12)', 'harness': 'Epoch AI agent with Python', 'by': 'Epoch AI', 'pts': epoch_series('frontiermath_tiers_1_3_v2.csv', 'ep_hub')},
      ])
bench(id='frontiermath_t4', atlas='frontiermath_t4', name='FrontierMath Tier 4', fam='Math', era='Reasoning',
      launch={'d': '2025-07-11', 's': 'ep_hub'}, unit='% of private problems', chance=0, human=None,
      series=[
        {'id': 't41', 'label': 'Tier 4, 2025-07-01 private set, Epoch AI runs', 'ver': '2025-07-01 private', 'harness': 'Epoch AI agent with Python', 'by': 'Epoch AI', 'pts': epoch_series('frontiermath_tier_4.csv', 'ep_hub')},
        {'id': 't42', 'diff': 'a re-based version (v2)', 'label': 'Tier 4 v2, Epoch AI runs', 'ver': 'v2 private (released 2026-06-12)', 'harness': 'Epoch AI agent with Python', 'by': 'Epoch AI', 'pts': epoch_series('frontiermath_tier_4_v2.csv', 'ep_hub')},
      ])

# ---------- OSWorld ----------
osv = []
for r in EP['os_world_external.csv']['rows']:
    if '(100 steps)' not in r['Agent'] and r['Source'] != 'Anthropic annoucement': continue
    d = r['release'] or r['Date added']
    if not d: continue
    lab = r['Source'].startswith('Anthropic')
    nm = pretty(r['model']) if r['model'] else r['Agent'].replace(' (100 steps)', '')
    osv.append(P(d, r['v'], nm, 'lab' if lab else 'board', 'anthopus45' if lab else 'oswsite',
                 ('Step budget not stated in the announcement.' if lab else ('Agent system; dated by when the leaderboard added it.' if not r['release'] else None))))
bench(id='osworld', atlas=None, name='OSWorld', fam='Computer use', era='Agents',
      launch={'d': '2024-04-11', 's': 'osw'}, unit='% of 369 tasks completed', chance=0,
      human={'v': 72.36, 's': 'osw', 'who': 'Human participants on the original task set (not re-measured on OSWorld-Verified)'},
      series=[
        {'id': 'o0', 'label': 'Original OSWorld', 'ver': 'original tasks (2024)', 'harness': 'screenshot input, 15 steps', 'by': 'benchmark authors, then model developers', 'pts': records([
            P('2024-04-11', 12.24, 'best model in the paper', 'bench', 'osw'),
            P('2024-10-22', 14.9, 'Claude 3.5 Sonnet (new)', 'lab', 'anthcu', 'Screenshot-only category; 22.0% "when afforded more steps", a different budget.')])},
        {'id': 'o1', 'diff': 'a later version (Verified)', 'label': 'OSWorld-Verified, 100-step budget', 'ver': 'Verified (task fixes, July 2025)', 'harness': 'up to 100 steps', 'by': 'OSWorld maintainers (self-submitted entries)', 'pts': records(osv)},
      ],
      note='OSWorld 2.0 (June 2026) is a separate benchmark; see Successors.')

# ---------- AIME by vintage ----------
MA = json.load(open(INP / 'matharena_aime.json'))['tables']
REL = {'o3-mini (high)': '2025-01-31', 'o1 (medium)': '2024-12-17', 'o4-mini (high)': '2025-04-16', 'Grok 4': '2025-07-09', 'GLM 4.5': '2025-08-03',
       'GPT-5 (high)': '2025-08-07', 'GPT-5.2 (high)': '2025-12-11', 'Gemini 3.1 Pro Preview': '2026-02-19', 'GPT-5.4 (xhigh)': '2026-03-05', 'GPT-5.5 (xhigh)': '2026-04-23',
       'o3 (high)': '2025-04-16', 'Gemini 2.5 Pro': '2025-06-17', 'DeepSeek-R1-0528': '2025-05-28', 'Gemini 3 Flash': '2025-12-17', 'Step 3.5 Flash': '2026-02-02',
       'Claude-Opus-4.6 (High)': '2026-02-05', 'Claude-Opus-4.8 (max)': '2026-05-28', 'GLM 5': '2026-02-11', 'Gemini 3 Pro (preview)': '2025-11-18', 'Kimi K2.5 (Think)': '2026-01-27'}
def aime(c, launch):
    pts = []
    for r in MA[c]:
        if r['model'] not in REL: continue
        pts.append(P(REL[r['model']], r['acc'], r['model'], 'ind', 'matharena',
                     'Released after the exam: MathArena flags possible contamination.' if r['released_after_competition'] else 'Released before the exam: no contamination possible.', pre=not r['released_after_competition']))
    return records(pts)
for yr, ld, s in (('2025', '2025-02-12', 'aime25'), ('2026', '2026-02-11', 'aime26')):
    bench(id=f'aime_{yr}', atlas='aime', name=f'AIME {yr}', fam='Math', era='Reasoning',
          launch={'d': ld, 's': s, 'n': 'A new AIME exists once both papers (AIME I and II, 30 problems) have been sat.'}, unit='% of 30 problems, average of 4 runs', chance=0, human=None,
          humanNote='Human contestants are scored out of 15 per paper; no comparable average is published for all 30.',
          series=[{'id': f'ai{yr}', 'label': 'MathArena', 'ver': f'AIME {yr} I and II', 'harness': 'MathArena prompt, 4 samples per problem', 'by': 'MathArena (ETH Zurich SRI Lab)', 'pts': aime(f'aime--aime_{yr}', ld)}])

# ---------- Terminal-Bench 2.0 ----------
def tb2(filt, label, harness, kind):
    pts = []
    for r in EP['terminalbench_external.csv']['rows']:
        if not r['release'] or not filt(r): continue
        pts.append(P(r['release'], r['v'] * 100, pretty(r['model']) + ' + ' + r['Agent'].strip(), kind(r), 'tb2lb', f"Leaderboard run date {r['Run date']}." if r['Run date'] else None))
    return records(pts)
bench(id='terminal_bench_2', atlas=None, name='Terminal-Bench 2.0', fam='Agentic coding', era='Agents',
      launch={'d': '2025-11-07', 's': 'tb2'}, unit='% of 89 tasks, mean over trials', chance=0, human=None,
      retired={'d': '2026-05-06', 'n': 'Revised as 2.1 (28 of 89 tasks fixed); scores moved by up to 12.1 points.', 's': 'tb21'},
      series=[
        {'id': 'tb2t', 'label': 'Terminus 2 harness (same agent for every model)', 'ver': '2.0', 'harness': 'Terminus 2', 'by': 'Terminal-Bench leaderboard', 'pts': tb2(lambda r: r['Agent'].strip() == 'Terminus 2', '', '', lambda r: 'board')},
        {'id': 'tb2a', 'label': 'Best agent of any kind', 'ver': '2.0', 'harness': 'each submitter\'s own agent', 'by': 'Terminal-Bench leaderboard (self-submitted)', 'pts': tb2(lambda r: True, '', '', lambda r: 'board')},
      ])

# ---------- Terminal-Bench-Science 0.1 ----------
AA = json.load(open(INP / 'aa_tbs_tb4.json'))['cells']
def aa_pts(bench_id, kind):
    out = []
    for c in AA:
        if c['bench'] != bench_id or c['kind'] != kind: continue
        if kind == 'ind':
            out.append(P(c['release'], c['v'], f"{c['model']} ({c['effort']})" if c['effort'] else c['model'], 'ind', 'aa'))
        else:
            by = c['by']
            sid = ('anthfable51' if 'Fable and Mythos' in by else 'anthopus55' if 'Opus 5.5 system card' in by else 'argon' if 'Google' in by
                   else 'unite' if 'Unite' in by else 'oaastra' if by.startswith('OpenAI') else 'mtp' if 'MarkTechPost' in by else None)
            if not sid: continue
            out.append(P(c['release'], c['v'], c['model'], 'lab', sid, f"Reported by {c['by'].split(',')[0]}" + (f": \"{c['q']}\"" if c.get('q') else '.')))
    return out
tbs_ind = records(aa_pts('tbs', 'ind'))
tbs_lab_all = aa_pts('tbs', 'lab')
bench(id='tbs', atlas=None, name='Terminal-Bench-Science 0.1', fam='Agentic science', era='Agents',
      launch={'d': '2026-08-27', 's': 'tbs', 'n': 'Announced 27 Aug 2026 (the v0.1.0 tag is dated 26 Aug).'}, unit='% of 70 tasks, 3 trials per task', chance=0, human=None,
      series=[
        {'id': 'ts0', 'label': 'Launch leaderboard, each lab\'s own agent', 'ver': '0.1', 'harness': 'Claude Code, Codex and others', 'by': 'Terminal-Bench-Science team', 'pts': records([
            P('2026-07-24', 30.0, 'Claude Opus 5 + Claude Code', 'board', 'tbs', 'Announcement: "Claude Opus 5 with Claude Code achieves the highest resolution rate at 30.0%". Next: GPT-5.6 Sol + Codex 22.4%, Claude Fable 5 + Claude Code 21.4%.')])},
        {'id': 'ts1', 'label': 'Artificial Analysis runs', 'ver': '0.1', 'harness': 'Artificial Analysis harness, one per model', 'by': 'Artificial Analysis', 'pts': tbs_ind},
        {'id': 'ts2', 'label': 'Lab-reported', 'ver': '0.1', 'harness': 'each lab\'s own setup', 'by': 'Anthropic and Google tables', 'pts': records(tbs_lab_all)},
      ])

bench(id='terminal_bench_3', atlas=None, name='Terminal-Bench 3.0', fam='Agentic coding', era='Agents',
      launch={'d': '2026-07-23', 's': 'tb3gh', 'n': 'Tagged 23 Jul 2026; announcement post dated 30 Jul.'}, unit='% of 74 tasks', chance=0, human=None,
      retired={'d': '2026-08-26', 'n': 'Revised as 4.0 (resources recalibrated, 19 tasks fixed, 8 removed); the team calls it a breaking revision, not a sequel.', 's': 'tb4'},
      series=[{'id': 'tb3l', 'label': 'Launch leaderboard, each lab\'s own agent', 'ver': '3.0', 'harness': 'Codex, Claude Code, Cursor CLI', 'by': 'Terminal-Bench team', 'pts': [
          P('2026-07-09', 34.4, 'GPT-5.6 Sol + Codex', 'board', 'tb3', 'Launch chart; next Claude Fable 5 + Claude Code 33.8%. "The best models achieve ~34% on Terminal-Bench 3.0."')]}])
bench(id='terminal_bench_4', atlas=None, name='Terminal-Bench 4.0', fam='Agentic coding', era='Agents',
      launch={'d': '2026-08-26', 's': 'tb4gh', 'n': 'Tagged 26 Aug 2026; announcement post dated 28 Aug.'}, unit='% of tasks', chance=0, human=None,
      series=[
        {'id': 'tb4i', 'label': 'Artificial Analysis runs', 'ver': '4.0', 'harness': 'Artificial Analysis harness', 'by': 'Artificial Analysis', 'pts': records(aa_pts('tb4', 'ind'))},
        {'id': 'tb4l', 'label': 'Lab-reported', 'ver': '4.0', 'harness': 'each lab\'s own setup', 'by': 'Anthropic, OpenAI, Google, xAI', 'pts': records(aa_pts('tb4', 'lab'))},
      ])

# ---------- derived settings, successors and the claim check ----------
CHAINS = [
  {'fam': 'GLUE family', 'items': [['GLUE', '2018-04-20', 'glue1', '60.3 (paper baseline)'], ['SuperGLUE', '2019-05-02', 'sglue', '71.5 (BERT++ baseline)']]},
  {'fam': 'ARC-AGI', 'items': [['ARC-AGI-1', '2019-11-05', 'arc1', 'no model score in the paper; the first AI results came from the 2020 Kaggle competition'], ['ARC-AGI-2', '2025-03-24', 'arc2post', '4% (o3-preview, low compute)'], ['ARC-AGI-3', '2026-03-25', 'arcblog', '0.37% (best model at launch)']]},
  {'fam': 'FrontierMath', 'items': [['Tiers 1-3', '2024-11-07', 'fm', 'under 2%'], ['Tier 4', '2025-07-11', 'ep_hub', '6.3% (o4-mini, Epoch AI run of a model public at launch)'], ['Tiers 1-3 v2 and Tier 4 v2', '2026-06-12', 'ep_hub', 're-based sets; older models re-run']]},
  {'fam': 'OSWorld', 'items': [['OSWorld', '2024-04-11', 'osw', '12.24%'], ['OSWorld-Verified', '2025-07-27', 'oswsite', 'task fixes; leaderboard restarted (date: first entries in the Epoch AI hub copy)'], ['OSWorld 2.0', '2026-06-26', 'osw2', '20.6% binary accuracy (Claude Opus 4.8, batched tools; 18.5% standard tools) among models public at launch']]},
  {'fam': 'Terminal-Bench', 'items': [['1.0', '2025-05-19', 'tb1', '80 tasks at launch'], ['2.0', '2025-11-07', 'tb2', '89 tasks, harder and re-verified'], ['2.1', '2026-05-06', 'tb21', '28 of 89 tasks fixed; same models up to 12.1 points higher'], ['3.0', '2026-07-23', 'tb3gh', '34.4% (GPT-5.6 Sol + Codex)'], ['4.0', '2026-08-26', 'tb4gh', 'a revision of 3.0: resources recalibrated, 19 tasks fixed, 8 removed (2 for saturation)'], ['Science 0.1 (a separate benchmark)', '2026-08-27', 'tbs', '30.0% (Claude Opus 5 + Claude Code)']]},
]
TBS_CHECK = {
  'claim': 'A 30.0% top score at launch in Aug 2026 (Claude Opus 5), 52.6% a week later (Claude Fable 5.1).',
  'cols': ['Model', 'Model public', 'Score', 'Who measured it, and how', 'Kind', 'Source', 'Figure published'],
  'rows': [
    ['Claude Opus 5', '2026-07-24', '30.0', 'Launch leaderboard, Claude Code agent', 'board', 'tbs', '2026-08-27'],
    ['Claude Opus 5', '2026-07-24', '28.6', 'Artificial Analysis harness', 'ind', 'aa', 'by 1 Oct 2026'],
    ['Claude Opus 5', '2026-07-24', '29.0', 'Anthropic, Opus 5.5 system card', 'lab', 'anthopus55', '2026-09-22'],
    ['Claude Fable 5.1', '2026-09-01', '52.6', 'Anthropic ("from 24.7% to 52.6%"), repeated in Google\'s table', 'lab', 'anthfable51', '2026-09-01'],
    ['Claude Fable 5.1', '2026-09-01', '43.3', 'Artificial Analysis harness', 'ind', 'aa', 'by 1 Oct 2026'],
    ['GPT-6 Astra', '2026-09-03', '63.3', 'Artificial Analysis harness', 'ind', 'aa', 'by 1 Oct 2026'],
    ['GPT-6 Astra', '2026-09-03', '64.6', 'Anthropic, Opus 5.5 system card', 'lab', 'anthopus55', '2026-09-22'],
    ['GPT-6 Astra', '2026-09-03', '68.1', 'Google, Gemini 4 Argon table', 'lab', 'argon', '2026-09-30'],
  ],
}

def days(a, b): return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days

def finalize():
    for b in B:
        b.setdefault('human', None)
        for s in b['series']:
            assert s['pts'], (b['id'], s['id'])
            for p in s['pts']:
                assert p['s'] in S, p
                dt.date.fromisoformat(p['d'])
    return {'as_of': AS_OF, 'sources': S, 'benchmarks': B, 'chains': CHAINS, 'tbs_check': TBS_CHECK,
            'rules': {
              'date': 'Date the model or system was first public: model release date for tracker runs, paper or results date otherwise.',
              'ceiling': 'Human baseline where the benchmark publishes one, otherwise 100%.',
              'threshold': 'Threshold = base + f x (ceiling - base), base 0 (or the chance score when "above chance" is on), f = 80% or 90%.',
              'crossing': 'First point in any listed series of the benchmark at or above the threshold; 0 days if a model public at launch already scored that. Upper bounds never count.',
              'open': 'Not yet reached: elapsed time to 4 Oct 2026, or to the date a revision or successor replaced it.'}}

if __name__ == '__main__':
    data = finalize()
    (HERE.parent / 'data').mkdir(exist_ok=True)
    (HERE.parent / 'data' / 'saturation.json').write_text(json.dumps(data, ensure_ascii=False, indent=1))
    js = '// ---- Saturation timeline: data (generated by src/saturation/make_saturation.py; do not edit) ----\nwindow.SAT_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (HERE.parent / 'parts' / '33_js_sat_a.js').write_text(js)
    n = sum(len(s['pts']) for b in B for s in b['series'])
    print(len(B), 'benchmarks,', sum(len(b['series']) for b in B), 'series,', n, 'points,', len(js), 'bytes of JS')

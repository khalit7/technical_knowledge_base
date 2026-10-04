"""Fetch the primary sources quoted on the page and keep short text windows around the facts used, in inputs/excerpts/.
Run: python3 save_excerpts.py  (needs pdftotext for the ARC-AGI-3 technical report)."""
import html, os, re, subprocess, tempfile, urllib.request
os.makedirs('inputs/excerpts', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0'}


def text(url):
    raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90).read()
    if url.endswith('.pdf'):
        with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
            f.write(raw); f.flush()
            return subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout
    s = raw.decode('utf-8', 'ignore')
    s = re.sub(r'(?s)<(script|style)[^>]*>.*?</\1>', ' ', s)
    s = re.sub(r'(?s)<annotation[^>]*>.*?</annotation>', ' ', s)
    s = re.sub(r'</(p|div|tr|h\d|li|table|caption)>', '\n', s); s = re.sub(r'</t[dh]>', ' | ', s)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\n\s*\n+', '\n', re.sub(r'[ \t]+', ' ', s))


JOBS = {
    'hle_verified_2602.13964': ('https://arxiv.org/html/2602.13964', ['This stage yields 668', 'Table 2: Results on Full Set and Revised Subset', 'five independent rollouts']),
    'hle_paper_2501.14249': ('https://arxiv.org/html/2501.14249', ['over 70,000 attempts', 'Prize Pool', 'around 14% of questions', 'o3-mini-2025-01-31', 'expert disagreement rate of 15.4%', 'RMS calibration errors above 70%']),
    'mmlu_redux_2406.04127': ('https://arxiv.org/html/2406.04127', ['We estimate that 6.49%', '57% of the analysed instances', 'Table 2: Comparison of model performance']),
    'gpqa_2311.12022': ('https://arxiv.org/html/2311.12022', ['we collect 564 questions', 'GPQA Diamond (the diamond set', 'reveal examples from this dataset', 'average hourly payment', 'reach 65% accuracy']),
    'simpleqa_2411.04368': ('https://arxiv.org/html/2411.04368', ['Four example questions and reference', 'Performance of various models on SimpleQA', 'the error rate of our benchmark', 'it incentivizes the model to always guess']),
    'simpleqa_verified_2509.07968': ('https://arxiv.org/html/2509.07968', ['a 1,000-prompt benchmark', 'outperforming other frontier models']),
    'mmlu_pro_2406.01574': ('https://arxiv.org/html/2406.01574', ['totaling 12,032 questions', '5,886 questions are', 'Table 3: Accuracy Differences', 'decreased from 4-5%']),
    'mmlu_2009.03300': ('https://arxiv.org/html/2009.03300', ['questions in total, which we split', 'Mechanical Turk obtain', 'expert-level accuracy is approximately']),
    'arc_agi_2_2505.11831': ('https://arxiv.org/html/2505.11831', ['407 unique participants', '100% of ARC-AGI-2 tasks were solved', 'Grand Prize ($700,000)', '120 in the Semi-Private']),
    'bbeh_2502.19187': ('https://arxiv.org/html/2502.19187', ['(harmonic) average accuracy']),
    'global_mmlu_2412.03304': ('https://arxiv.org/html/2412.03304', ['28% of all questions']),
    'include_2411.19799': ('https://arxiv.org/html/2411.19799', ['197,243 MCQA pairs from 1,926']),
    'arc_agi_3_report': ('https://arcprize.org/media/ARC_AGI_3_Technical_Report.pdf', ['The agent views a 64x64 grid', 'Five key actions', 'Table 1: ARC-AGI-3 dataset composition', 'This scoring function is called RHAE', 'Exactly 10 members', 'cap the maximum score for a level at 1.15x', 'Level 1 contributes 1/15th']),
    'arc_agi_3_launch': ('https://arcprize.org/blog/arc-agi-3-launch', ['Frontier AI scores 0.51%', '$2,000,000 in prizes']),
    'futurehouse_hle': ('https://www.futurehouse.org/research-announcements/hle-exam', ['29 ± 3.7%', 'Update (Sep 16, 2025)', '51.3%', 'Grok4 is the top performing', 'more than 5 minutes']),
    'hle_diamond': ('https://lastexam.ai/blog/hle-diamond', ['HLE-Diamond consists of 500', 'Without tools 59.9%']),
    'mvakde_67_cents': ('https://mvakde.github.io/blog/44-on-arc-1/', ['I trained a small transformer', 'Also gets 7%', 'it will still score ~40%', 'totally amounts to 67 cents', 'Performance on ARC-1 public eval']),
}
for name, (url, anchors) in JOBS.items():
    try:
        t = text(url).replace('\n', ' ')
    except Exception as e:
        print('FAIL', name, e); continue
    parts = []
    for a in anchors:
        i = t.find(a)
        parts.append(('[%s]\n' % a) + (t[max(0, i - 300): i + 1500] if i >= 0 else 'NOT FOUND'))
    open('inputs/excerpts/%s.txt' % name, 'w').write('Source: %s\n\n' % url + '\n\n'.join(parts))
    print(name, sum(p.endswith('NOT FOUND') for p in parts), 'missing')

"""Fetch the outside sources this page quotes and keep only the quoted lines, with where each came from.

usage: python3 save_extracts.py   (needs network, pdftotext; writes inputs/later_extracts.txt and inputs/nature_extracts.txt)

Sources: the DeepSeek-R1 GitHub README and repository listing, the Zenodo archive the Nature paper cites for data,
the DeepSeek-R1-0528 model card, arXiv abstracts of the later work the page cites, and the Nature article page,
its peer review file (PDF) and reviewer and author lines the page quotes.
"""
import html, io, json, re, subprocess, tempfile, zipfile

def get(u, ua=True):
    return subprocess.run(['curl', '-sL'] + (['-A', 'Mozilla/5.0'] if ua else []) + [u], capture_output=True, check=True).stdout


def lines_with(text, pats, width=600):
    out = []
    for ln in text.splitlines():
        if any(re.search(p, ln, re.I) for p in pats):
            out.append(ln.strip()[:width])
    return out


later = []
# 1. README: licence, usage recommendations, distilled-model bases
rd = get('https://raw.githubusercontent.com/deepseek-ai/DeepSeek-R1/main/README.md').decode()
later.append('== https://github.com/deepseek-ai/DeepSeek-R1 README.md')
later += lines_with(rd, [r'licensed under', r'support commercial use', r'derived from', r'temperature within', r'system prompt', r'bypass thinking', r'initiate its response', r'maximum generation length', r'\| DeepSeek-R1(-Zero)? +\|'])
# 2. what the repository and the Zenodo archive the Nature paper cites actually contain
ls = json.loads(get('https://api.github.com/repos/deepseek-ai/DeepSeek-R1/contents/'))
later.append('== https://api.github.com/repos/deepseek-ai/DeepSeek-R1/contents/ (top level)')
later += ['%s (%s, %s bytes)' % (x['name'], x['type'], x.get('size')) for x in ls]
z = zipfile.ZipFile(io.BytesIO(get('https://zenodo.org/records/15753193/files/deepseek-ai/DeepSeek-R1-v1.0.0.zip?download=1', ua=False)))
later.append('== https://doi.org/10.5281/zenodo.15753193 (DeepSeek-R1-v1.0.0.zip, cited by the Nature paper for data and weights)')
later += ['%s (%d bytes)' % (i.filename, i.file_size) for i in z.infolist()]
# 3. the R1-0528 update
card = get('https://huggingface.co/deepseek-ai/DeepSeek-R1-0528/raw/main/README.md').decode()
later.append('== https://huggingface.co/deepseek-ai/DeepSeek-R1-0528')
later += lines_with(card, [r'from 70% in the previous version', r'AIME 2025 \(Pass@1\)'])
# 3b. launch prices and the market reaction (beyond the paper)
def flat(u):
    t = get(u).decode('utf-8', 'ignore')
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', t, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))
t = flat('https://api-docs.deepseek.com/news/news250120')
later.append('== https://api-docs.deepseek.com/news/news250120 (DeepSeek-R1 release, 2025/01/20)')
for p in [r'Code and models are released under the MIT License[^!]*!', r'32B & 70B models on par with OpenAI-o1-mini', r'\$0\.55 / million input tokens \(cache miss\)', r'\$2\.19 / million output tokens']:
    m = re.search(p, t); later.append(m.group(0) if m else '(not found: %s)' % p)
t = flat('https://platform.openai.com/docs/models/o1')
later.append('== https://platform.openai.com/docs/models/o1')
m = re.search(r'Text tokens Per 1M tokens .{0,80}Input \$15\.00 Cached input \$7\.50 Output \$60\.00', t); later.append(m.group(0) if m else '(not found)')
t = flat('https://www.cnbc.com/2025/01/27/chinas-deepseek-ai-tops-chatgpt-app-store-what-you-should-know.html')
later.append('== https://www.cnbc.com/2025/01/27/chinas-deepseek-ai-tops-chatgpt-app-store-what-you-should-know.html (27 January 2025)')
m = re.search(r'Global tech stocks sold off, with AI chip giant Nvidia falling 10%\.', t); later.append(m.group(0) if m else '(not found)')
# 4. later work, abstracts from the arXiv API
for aid in ['2503.20783', '2503.14476', '2504.13837', '2503.18892', '2506.04178', '2502.14768']:
    s = get('https://export.arxiv.org/api/query?id_list=' + aid).decode()
    t = ' '.join(re.search(r'<entry>.*?<title>(.*?)</title>', s, re.S).group(1).split())
    a = ' '.join(re.search(r'<summary>(.*?)</summary>', s, re.S).group(1).split())
    d = re.search(r'<published>(.*?)</published>', s).group(1)[:10]
    later.append('== https://arxiv.org/abs/%s (%s) %s' % (aid, d, t))
    later.append(a)
open('inputs/later_extracts.txt', 'w').write('\n'.join(later) + '\n')

nat = []
page = get('https://www.nature.com/articles/s41586-025-09422-z').decode('utf-8', 'ignore')
nat.append('== https://www.nature.com/articles/s41586-025-09422-z (metadata)')
for k in ['citation_title', 'citation_publication_date', 'citation_volume', 'citation_firstpage', 'citation_lastpage', 'dc.date', 'citation_doi']:
    m = re.search(r'name="%s" content="([^"]*)"' % k, page)
    nat.append('%s: %s' % (k, m and m.group(1)))
txt = html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style)[^>]*>.*?</\1>', '', page, flags=re.S)))
txt = re.sub(r'\s+', ' ', txt)
for p in [r'Received\s*:?\s*\d+ \w+ \d{4}', r'Accepted\s*:?\s*\d+ \w+ \d{4}', r'We provide the data samples[^.]*\.', r'Trained weights of DeepSeek-R1-Zero[^.]*\.', r'thanks Edward Beeching[^.]*\.']:
    m = re.search(p, txt)
    nat.append(m.group(0) if m else '(not found: %s)' % p)
pr = page[page.find('MOESM2_ESM.pdf') - 200:page.find('MOESM2_ESM.pdf') + 20]
url = 'https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-025-09422-z/MediaObjects/41586_2025_9422_MOESM2_ESM.pdf'
with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
    f.write(get(url)); f.flush()
    peer = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout
peer = re.sub(r' {2,}', ' ', peer)
nat.append('== ' + url + ' (peer review file; quoted passages)')
flat = re.sub(r'\s+', ' ', peer)
for p in [r'I would like to see the authors design an experiment to disentangle[^.]*\.',
          r'Consensus performance on AIME plateaus[^.]*\.',
          r'In Figure 3 and Table 3, the numbers are statistically significant\.',
          r'the true source of power in R1 seems to be not RL vs\. SFT[^.]*\.',
          r'In particular, an iterative SFT approach may well be competitive with RL\.',
          r'there may not be an a priori guarantee[^.]*\.|there is no a priori guarantee[^.]*\.',
          r'Boldface is just used to highly the largest number[^.]*\.',
          r'We change the max sequence length from 32k to 64k[^.]*\.',
          r'we only track the average response length during training[^.]*\.',
          r'the frequency of reflection words matches the initial quantity shown at Step 0[^.]*\.',
          r'the measurements shown represent token frequency rather than frequency per answer[^.]*\.',
          r'"10-gram sequences" is a very mild decontamination approach!|10-gram sequences” is a very mild decontamination approach!',
          r'Our experiments \(shown in Figure below\) with a 1B model on GSM8K[^.]*\.[^.]*\.',
          r'The distillation technique is not a novel contribution of this work\.',
          r'we have conducted an additional experiment using Qwen2-7B, which was released in June 2024\.',
          r'In Tables 7 and 9, we highlight the top two best-performing models\.',
          r'We removed the ARC-related evaluation in the revised version\.',
          r'the “aha moment” observed in the training of R1-Zero has been replicated at a smaller scale in \[5\][^.]*\.',
          r'The RL component is trained independently and does not rely on outputs or guidance from models such as GPT-4[^.]*\.',
          r'the pre-training data for DeepSeek-V3-Base was collected with a cutoff date of July 2024[^.]*\.']:
    m = re.search(p, flat)
    nat.append(m.group(0) if m else '(not found: %s)' % p)
open('inputs/nature_extracts.txt', 'w').write('\n'.join(nat) + '\n')
print('later', len(later), 'nature', len(nat))

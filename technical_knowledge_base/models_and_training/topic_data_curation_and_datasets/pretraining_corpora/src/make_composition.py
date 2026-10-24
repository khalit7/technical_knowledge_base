"""The hero figure's data: what share of each published pretraining mix came from each kind of source.
Writes data/composition.json. Pure stdlib; shares copied from each source's table (checked 2026-10-24), then summed
into eight categories by the mapping printed beside each row. Run once; build_data.py embeds the result.

Categories: cc = filtered Common Crawl (C4, CCNet, DCLM, Dolma 3's crawl, FineWeb family); cur = curated web and forums
(Reddit-linked pages, Stack Exchange, Hacker News); code; math; papers = papers and PDFs; books; wiki = Wikipedia;
other = law, patents, subtitles, chat logs, e-mail, parliament proceedings.
"""
import json, os

H = os.path.dirname(os.path.abspath(__file__))
CAT = [['cc', 'Filtered Common Crawl'], ['cur', 'Curated web, forums'], ['code', 'Code'], ['math', 'Maths'],
       ['papers', 'Papers, PDFs'], ['books', 'Books'], ['wiki', 'Wikipedia'], ['other', 'Law, patents, subtitles, chat']]
MIX = [
    {'name': 'The Pile', 'year': 2020, 'unit': 'share of bytes', 'src': 'https://arxiv.org/abs/2101.00027', 'table': 'Table 1 (weight)',
     'rows': [['Pile-CC', 18.11, 'cc'], ['PubMed Central', 14.40, 'papers'], ['Books3', 12.07, 'books'], ['OpenWebText2', 10.01, 'cur'],
              ['ArXiv', 8.96, 'papers'], ['GitHub', 7.59, 'code'], ['FreeLaw', 6.12, 'other'], ['Stack Exchange', 5.13, 'cur'],
              ['USPTO Backgrounds', 3.65, 'other'], ['PubMed Abstracts', 3.07, 'papers'], ['Gutenberg (PG-19)', 2.17, 'books'],
              ['OpenSubtitles', 1.55, 'other'], ['Wikipedia (en)', 1.53, 'wiki'], ['DM Mathematics', 1.24, 'math'], ['Ubuntu IRC', 0.88, 'other'],
              ['BookCorpus2', 0.75, 'books'], ['EuroParl', 0.73, 'other'], ['HackerNews', 0.62, 'cur'], ['YoutubeSubtitles', 0.60, 'other'],
              ['PhilPapers', 0.38, 'papers'], ['NIH ExPorter', 0.30, 'papers'], ['Enron Emails', 0.14, 'other']]},
    {'name': 'GPT-3', 'year': 2020, 'unit': 'share of training examples (printed weights sum to 101%)', 'src': 'https://arxiv.org/abs/2005.14165', 'table': 'Table 2.2',
     'rows': [['Common Crawl (filtered)', 60, 'cc'], ['WebText2', 22, 'cur'], ['Books1', 8, 'books'], ['Books2', 8, 'books'], ['Wikipedia', 3, 'wiki']]},
    {'name': 'LLaMA 1', 'year': 2023, 'unit': 'sampling proportion', 'src': 'https://arxiv.org/abs/2302.13971', 'table': 'Table 1',
     'rows': [['CommonCrawl (CCNet)', 67.0, 'cc'], ['C4', 15.0, 'cc'], ['GitHub', 4.5, 'code'], ['Wikipedia', 4.5, 'wiki'], ['Books', 4.5, 'books'],
              ['ArXiv', 2.5, 'papers'], ['StackExchange', 2.0, 'cur']]},
    {'name': 'OLMo 2 7B, stage 1', 'year': 2024, 'unit': 'share of the olmo-mix-1124 pool (as printed, sums to 99.7)', 'src': 'https://huggingface.co/datasets/allenai/olmo-mix-1124', 'table': 'dataset card',
     'rows': [['DCLM-Baseline', 94.9, 'cc'], ['StarCoder code', 2.1, 'code'], ['peS2o papers', 1.5, 'papers'], ['arXiv', 0.5, 'papers'],
              ['OpenWebMath + Algebraic Stack', 0.6, 'math'], ['Wikipedia', 0.1, 'wiki']]},
    {'name': 'Marin 8B, phase 1', 'year': 2025, 'unit': 'share of training tokens, first 2.7T', 'src': 'https://marin.readthedocs.io/en/latest/reports/marin-8b-retro/', 'table': 'retrospective',
     'rows': [['DCLM-Baseline', 92.6, 'cc'], ['StarCoder data', 6.1, 'code'], ['Proof-Pile 2', 1.3, 'math']]},
    {'name': 'SmolLM3 3B, stage 1', 'year': 2025, 'unit': 'share of training tokens, 0 to 8T', 'src': 'https://huggingface.co/blog/smollm3', 'table': 'blog',
     'rows': [['Web: FineWeb-Edu, DCLM, FineWeb2, FineWeb2-HQ', 85, 'cc'], ['Code: Stack v2, then Stack-Edu', 12, 'code'], ['Maths: FineMath 3+, InfiWebMath 3+', 3, 'math']]},
    {'name': 'Olmo 3 7B', 'year': 2025, 'unit': 'share of the 5.93T Dolma 3 Mix', 'src': 'https://huggingface.co/datasets/allenai/dolma3_mix-6T-1025-7B', 'table': 'dataset card',
     'rows': [['Common Crawl (Dolma 3, quality-bucketed)', 76.07, 'cc'], ['olmOCR science PDFs', 13.57, 'papers'], ['Stack-Edu', 6.89, 'code'],
              ['FineMath 3+', 2.56, 'math'], ['arXiv', 0.86, 'papers'], ['Wikipedia', 0.04, 'wiki']]},
]
for m in MIX:
    t = {}
    for _, v, c in m['rows']:
        t[c] = round(t.get(c, 0) + v, 2)
    m['cats'] = t
json.dump({'cats': CAT, 'mixes': MIX}, open(os.path.join(H, 'data', 'composition.json'), 'w'), indent=1, ensure_ascii=False)
for m in MIX:
    print(m['name'], m['cats'], round(sum(m['cats'].values()), 2))

"""Published head-to-head corpus comparisons, cells copied from each paper's table (or released csv), checked
2026-10-14. Writes data/ablations.json. 'own' names the study's own corpus (vendor for it, independent for the rest).
"""
import json, os

H = os.path.dirname(os.path.abspath(__file__))
S = []


def add(**k):
    S.append(k)


add(id='dclm_t4', title='DCLM Table 4: quality filters on the same pool', who='DataComp-LM team', date='2024-06', own='DCLM-Baseline (fastText OH-2.5+ELI5)',
    setup='1B-1x scale: 1.4B parameters, 28.8B tokens, GPT-NeoX tokenizer; Core = 22 tasks, centred accuracy', metric='Core',
    rows=[['RefinedWeb reproduction (no model filter)', 27.5], ['Top 20% by PageRank', 26.1], ['SemDedup', 27.1], ['Classifier on BGE features', 27.2], ['AskLLM', 28.6], ['Perplexity filtering', 29.0], ['Top-k average logits', 29.2], ['fastText OH-2.5 + ELI5 (top 10%)', 30.2]],
    src='https://arxiv.org/abs/2406.11794', note='All filters start from the same RefinedWeb-reproduction pool; extended-suite scores move the same way (14.6 to 15.4).')

add(id='fw_csv', title='FineWeb: seven corpora, same model', who='Hugging Face', date='2024-06', own='FineWeb',
    setup='1.71B (card: 1.8B) Llama-style, 350B tokens, GPT-2 tokenizer, lighteval; final checkpoint (step 167000) from the released eval_results.csv', metric='aggregate score',
    rows=[['FineWeb', 49.00], ['RefinedWeb', 48.61], ['C4', 48.40], ['Dolma v1.6 (CC part)', 48.16], ['SlimPajama', 47.69], ['RedPajama2 (dedup)', 47.10], ['The Pile', 46.45]],
    src='https://huggingface.co/datasets/HuggingFaceFW/fineweb/blob/main/eval_results.csv', note='The paper only plots these (Figure 10, smoothed); the numbers here are the csv\'s last checkpoint. The top four sit within 0.84 points.')

add(id='dclm_t2', title='DCLM Table 2: existing corpora at 7B', who='DataComp-LM team', date='2024-06', own='(none of these)',
    setup='7B-1x: 6.9B parameters, 138B tokens, LLM Foundry, Core score', metric='Core',
    rows=[['C4', 34.2], ['Dolma v1', 35.0], ['RedPajama v1', 35.3], ['RefinedWeb', 36.9]], src='https://arxiv.org/abs/2406.11794', note='Independent of all four corpora.')

add(id='dclm_t8', title='DCLM Table 8: DCLM-Baseline against FineWeb-Edu at 7B', who='DataComp-LM team', date='2024-06', own='DCLM-Baseline',
    setup='7B, 0.28T tokens, LLM Foundry; MMLU 5-shot', metric='MMLU',
    rows=[['FineWeb-Edu', 37.3], ['DCLM-Baseline', 50.8]], src='https://arxiv.org/abs/2406.11794',
    note='Core 41.9 against 48.9. DCLM\'s own appendix G says that under Hugging Face\'s lighteval the two 7B models "perform quite similarly": the harness decides much of the gap.')

add(id='nem_t5', title='Nemotron-CC Table 5: 8B models, 1T tokens', who='NVIDIA', date='2024-12', own='Nemotron-CC',
    setup='8B, 1T tokens, the Common Crawl part (73% of the blend) swapped and the rest fixed; lm-eval-harness; MMLU 5-shot', metric='MMLU',
    rows=[['FineWeb-Edu-2 (score 2+)', 42.4], ['FineWeb-Edu', 42.9], ['DCLM-Baseline', 53.4], ['Nemotron-CC (all)', 53.0], ['Nemotron-CC-HQ', 59.0]],
    alt={'metric': '10-task average', 'rows': [['FineWeb-Edu-2 (score 2+)', 53.2], ['FineWeb-Edu', 53.2], ['DCLM-Baseline', 57.0], ['Nemotron-CC (all)', 57.8], ['Nemotron-CC-HQ', 60.1]]},
    src='https://arxiv.org/abs/2412.02595', note='+5.6 MMLU for HQ over DCLM is exact (59.0 - 53.4); the HQ subset includes synthetic question-answer text, which plausibly helps multiple-choice tests directly.')

add(id='smol_t1', title='SmolLM2 Table 1: FineWeb-Edu against DCLM', who='Hugging Face', date='2025-02', own='FineWeb-Edu',
    setup='1.7B, 350B tokens, GPT-2 tokenizer, lighteval', metric='MMLU',
    rows=[['DCLM-Baseline', 35.5], ['FineWeb-Edu', 37.5], ['60% FineWeb-Edu + 40% DCLM', 37.0]],
    alt={'metric': 'HellaSwag', 'rows': [['DCLM-Baseline', 62.3], ['FineWeb-Edu', 60.1], ['60% FineWeb-Edu + 40% DCLM', 62.2]]},
    src='https://arxiv.org/abs/2502.02737', note='FineWeb-Edu leads on MMLU, ARC (57.5 against 53.5) and OBQA; DCLM on HellaSwag, CommonsenseQA and PIQA; the 60/40 mix keeps most of both, which is what SmolLM2 used.')

add(id='osr_t5', title='open-sci-ref: the third-party run with all three', who='LAION and Juelich Supercomputing Centre', date='2025-09', own='(none of these)',
    setup='1.7B, 1T tokens, GPT-NeoX tokenizer, lm-eval-harness, 11 tasks (average shown)', metric='average accuracy',
    rows=[['FineWeb-Edu', 0.56], ['DCLM-Baseline', 0.57], ['Nemotron-CC-HQ', 0.66]],
    alt={'metric': 'average without MMLU and CommonsenseQA (9 tasks, recomputed here)', 'rows': [['FineWeb-Edu', 0.638], ['DCLM-Baseline', 0.652], ['Nemotron-CC-HQ', 0.679]]},
    src='https://arxiv.org/abs/2509.09009', note='Independent of NVIDIA and Hugging Face; two authors are DCLM co-authors. MMLU .50/.24/.26 and CommonsenseQA .62/.19/.20 (HQ/DCLM/FW-Edu) carry most of the lead.')

add(id='darwin_t3', title='Darwin-CC Table 3: 3B, 500B tokens', who='GAIR, SII, SJTU', date='2026-03', own='Darwin-CC',
    setup='3B (Qwen2.5 architecture), 500B tokens, lm-eval-harness, 18 tasks', metric='average',
    rows=[['Ultra-FineWeb', 36.29], ['FineWeb-Edu', 36.52], ['DCLM-Baseline', 42.42], ['Darwin-CC', 44.13]], src='https://arxiv.org/abs/2603.14420',
    note='Independent for DCLM, FineWeb-Edu and Ultra-FineWeb. TriviaQA alone: DCLM 42.85, FineWeb-Edu 0.67: an encyclopaedic-knowledge gap, not general quality.')

add(id='rw_t4', title='RefinedWeb Table 4: web only against curated', who='TII', date='2023-06', own='RefinedWeb',
    setup='1B on 27B tokens, 6-task zero-shot average', metric='average accuracy %',
    rows=[['RefinedWeb raw', 52.7], ['OSCAR-22.01', 52.7], ['The Pile', 53.4], ['RefinedWeb filtered', 54.3], ['OSCAR-21.09', 55.0], ['C4', 55.7], ['RefinedWeb', 56.2]], src='https://arxiv.org/abs/2306.01116',
    note='Within half a point of C4; C4 through RefinedWeb\'s own pipeline scored 56.4 (Table 5).')

json.dump(S, open(os.path.join(H, 'data', 'ablations.json'), 'w'), indent=1, ensure_ascii=False)
print(len(S), 'studies')

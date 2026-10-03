# 150 random sentence pairs (SST-2 sentences, perturbed: word drops, swaps, repeats, case and punctuation changes)
# scored by sacrebleu, rouge-score and NLTK, so check_core.mjs can test the page's live scorers on text nobody chose.
# Run from src/:  <venv with sacrebleu rouge-score nltk>/python data_text_fuzz.py
import json, random
import sacrebleu
from rouge_score import rouge_scorer
from nltk.translate.meteor_score import meteor_score
from nltk.stem.porter import PorterStemmer
S = json.load(open('inputs/sst2_scores.json'))['text']
rng = random.Random(1)
class NoWordNet:
    def synsets(self, w): return []
tok = sacrebleu.metrics.bleu.BLEU().tokenizer
pm = PorterStemmer(PorterStemmer.MARTIN_EXTENSIONS)
rs = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'])
def perturb(s):
    w = s.split()
    for _ in range(rng.randint(0, 4)):
        op = rng.choice(['drop', 'swap', 'dup', 'case', 'punct'])
        if not w: break
        i = rng.randrange(len(w))
        if op == 'drop' and len(w) > 1: w.pop(i)
        elif op == 'swap': j = rng.randrange(len(w)); w[i], w[j] = w[j], w[i]
        elif op == 'dup': w.insert(i, w[i])
        elif op == 'case': w[i] = w[i].capitalize()
        else: w[i] = w[i] + rng.choice([',', '.', '!', ';', "'s", '-'])
    return ' '.join(w)
out = []
for k in range(150):
    ref = rng.choice(S)
    hyp = perturb(ref) if k % 3 else rng.choice(S)
    r = rs.score(ref, hyp)
    out.append({'ref': ref, 'hyp': hyp, 'bleu': sacrebleu.sentence_bleu(hyp, [ref]).score, 'chrf': sacrebleu.sentence_chrf(hyp, [ref]).score,
                'r1': r['rouge1'].fmeasure, 'r2': r['rouge2'].fmeasure, 'rl': r['rougeL'].fmeasure,
                'met': meteor_score([tok(ref).lower().split()], tok(hyp).lower().split(), stemmer=pm, wordnet=NoWordNet())})
json.dump(out, open('inputs/text_fuzz.json', 'w'))
print(len(out))

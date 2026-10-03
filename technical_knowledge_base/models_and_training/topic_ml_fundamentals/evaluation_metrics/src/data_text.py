# Reference values for the text-metric presets, from the libraries people actually report:
# sacrebleu (sentence BLEU, chrF), rouge-score (ROUGE-1/2/L), NLTK (METEOR, with and without WordNet),
# bert-score (roberta-large layer 17, the English default) plus the token-by-token similarity matrices
# the page's BERTScore view draws. The page's JavaScript recomputes BLEU, chrF, ROUGE and METEOR
# (exact + Porter stem stages) live and check_text.mjs compares it with these numbers.
# Run from src/ (threads capped at 2):
#   uv run --with sacrebleu --with rouge-score --with nltk --with bert-score --with torch --with transformers python data_text.py
import json, os
import torch
torch.set_num_threads(2)
import sacrebleu
from rouge_score import rouge_scorer
import nltk
from nltk.translate.meteor_score import meteor_score
from nltk.stem.porter import PorterStemmer

REF = 'The committee approved the new budget after a long debate on Tuesday.'
CANDS = [
 ('copy', 'Exact copy', REF),
 ('reorder', 'Same words, clauses moved', 'On Tuesday, after a long debate, the committee approved the new budget.'),
 ('para', 'Paraphrase, same meaning', 'After lengthy discussion on Tuesday, the panel passed the new spending plan.'),
 ('syn', 'Synonyms swapped in', 'The committee sanctioned the fresh budget after a lengthy argument on Tuesday.'),
 ('neg', 'One word, opposite meaning', 'The committee rejected the new budget after a long debate on Tuesday.'),
 ('morph', 'Same meaning, other word forms', 'The committees approve the new budgets after long debates on Tuesday.'),
 ('short', 'Correct but short', 'The committee approved the budget.'),
 ('salad', 'Same words, shuffled', 'Debate the budget on committee a new Tuesday approved long the after.'),
]

nltk.download('wordnet', quiet=True)
from nltk.corpus import wordnet
class NoWordNet:
    def synsets(self, w): return []
tok13a = sacrebleu.metrics.bleu.BLEU().tokenizer
def mtoks(s): return tok13a(s).lower().split()
porter_martin = PorterStemmer(PorterStemmer.MARTIN_EXTENSIONS)
rs = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=False)

out = {'ref': REF, 'cands': []}
for key, label, c in CANDS:
    b = sacrebleu.sentence_bleu(c, [REF])
    ch = sacrebleu.sentence_chrf(c, [REF])
    r = rs.score(REF, c)
    m_stem = meteor_score([mtoks(REF)], mtoks(c), stemmer=porter_martin, wordnet=NoWordNet())
    m_full = meteor_score([mtoks(REF)], mtoks(c))  # NLTK defaults: NLTK-mode Porter stemmer and WordNet synonyms
    out['cands'].append({'key': key, 'label': label, 'text': c,
        'bleu': b.score, 'bleu_prec': b.precisions, 'bleu_bp': b.bp, 'bleu_counts': b.counts, 'bleu_totals': b.totals,
        'chrf': ch.score,
        'rouge': {k: {'p': v.precision, 'r': v.recall, 'f': v.fmeasure} for k, v in r.items()},
        'meteor_stem': m_stem, 'meteor_wordnet': m_full})
    print(key, round(b.score, 2), round(ch.score, 2), {k: round(v.fmeasure, 3) for k, v in r.items()}, round(m_stem, 4), round(m_full, 4))

# Porter stemmer (Martin's extensions) on every word of the presets plus a list of tricky words, for the JS port check
words = sorted(set(w for _, _, c in CANDS for w in mtoks(c)) | set(mtoks(REF)) | set(
    'caresses ponies ties caress cats feed agreed plastered motoring sing conflated troubled sized hopping tanned falling hissing fizzed failing filing happy sky relational conditional rational valenci hesitanci digitizer conformabli radicalli differentli vileli analogousli vietnamization predication operator feudalism decisiveness hopefulness callousness formaliti sensitiviti sensibiliti triplicate formative formalize electriciti electrical hopeful goodness revival allowance inference airliner gyroscopic adjustable defensible irritant replacement adjustment dependent adoption homologou communism activate angulariti homologous effective bowdlerize probate rate cease controll roll generalization oscillators debates budgets committees approve approved discussion lengthy passed spending'.split()))
out['porter'] = {w: porter_martin.stem(w) for w in words}

# BERTScore: library score, then the same computation by hand to export the similarity matrices.
from bert_score import score as bscore
from bert_score.utils import model2layers
cands = [c for _, _, c in CANDS]
P, R, F = bscore(cands, [REF] * len(cands), model_type='roberta-large', num_layers=17, idf=False, batch_size=8)
Pb, Rb, Fb = bscore(cands, [REF] * len(cands), model_type='roberta-large', num_layers=17, idf=False, batch_size=8, lang='en', rescale_with_baseline=True)
from transformers import AutoTokenizer, AutoModel
tk = AutoTokenizer.from_pretrained('roberta-large')
mdl = AutoModel.from_pretrained('roberta-large').eval()
mdl.encoder.layer = torch.nn.ModuleList(mdl.encoder.layer[:17])
def emb(s):
    ids = tk(s, return_tensors='pt')['input_ids']
    with torch.no_grad():
        h = mdl(ids).last_hidden_state[0]
    h = h / h.norm(dim=-1, keepdim=True)
    return [tk.convert_tokens_to_string([t]) for t in tk.convert_ids_to_tokens(ids[0])], h
rt, rh = emb(REF)
import bert_score, csv
bl = list(csv.DictReader(open(os.path.join(os.path.dirname(bert_score.__file__), 'rescale_baseline', 'en', 'roberta-large.tsv'))))
bl = [r for r in bl if int(r['LAYER']) == 17][0]
out['bertscore'] = {'model': 'roberta-large, layer 17, no idf (bert-score 0.3.12 default for English)', 'ref_tokens': rt,
                    'baseline': {'P': float(bl['P']), 'R': float(bl['R']), 'F': float(bl['F'])}}
for i, (key, _, c) in enumerate(CANDS):
    ct, ch_ = emb(c)
    S = (ch_ @ rh.T)
    # by hand, as bert-score does: special tokens (first and last) get zero weight but stay candidates for the max
    p = S[1:-1].max(dim=1).values.mean().item(); r_ = S[:, 1:-1].max(dim=0).values.mean().item(); f = 2 * p * r_ / (p + r_)
    d = out['cands'][i]
    d['bertscore'] = {'P': P[i].item(), 'R': R[i].item(), 'F': F[i].item(), 'P_rescaled': Pb[i].item(), 'R_rescaled': Rb[i].item(), 'F_rescaled': Fb[i].item(),
                      'by_hand': {'P': p, 'R': r_, 'F': f}, 'tokens': ct, 'sim': [[round(float(v), 3) for v in row] for row in S]}
    print(key, 'bertscore F', round(F[i].item(), 4), 'by hand', round(f, 4), 'rescaled', round(Fb[i].item(), 4))
json.dump(out, open('inputs/text_presets.json', 'w'), ensure_ascii=False)

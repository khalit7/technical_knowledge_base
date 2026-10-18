# Every distinct fact, number, mechanism step, caveat and link of live.md, where the built page carries it, checked
# against ../index.html (a phrase that must appear in its text or links). Run from src/: python3 mk_coverage.py
import json, re
html = open('../index.html').read()
text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html))
C = [
 # (fact from live.md, where on the page, phrase that must appear, status, note)
 ('5 min read, +6h 35m resources', 'header and Further reading footer', '+6h 35m resources', 'kept', 'resources total recomputed by build.sh from the Best resources list: 6h 35m'),
 ('Karpathy, Let\'s build the GPT Tokenizer (2h 15m)', 'Further reading, Best resources', 'youtube.com/watch?v=zduSFxRajkE', 'kept', ''),
 ('minbpe repo (~30 min)', 'Further reading, Best resources', 'github.com/karpathy/minbpe"', 'kept', ''),
 ('byte-level BPE from scratch; the best single explainer', 'Further reading', 'Byte-level BPE from scratch; the best single explainer', 'kept', ''),
 ('HuggingFace NLP course ch. 6 (1h 30m): BPE vs WordPiece vs Unigram with worked algorithms', 'Further reading; the trainers reproduce it', 'BPE, WordPiece and Unigram with worked algorithms', 'kept', 'link updated to the course\'s current address (llm-course)'),
 ('SentencePiece paper (45 min)', 'Further reading', 'arxiv.org/abs/1808.06226', 'kept', ''),
 ('Unigram LM paper (Kudo 2018) (45 min)', 'Further reading', 'arxiv.org/abs/1804.10959', 'kept', ''),
 ('the originals, both short and readable', 'Further reading', 'Short and readable', 'kept', ''),
 ('tiktoken (~20 min)', 'Further reading', 'github.com/openai/tiktoken"', 'kept', ''),
 ('HF tokenizers (~30 min); the production implementations to know', 'Further reading', 'github.com/huggingface/tokenizers"', 'kept', ''),
 ('A tokenizer maps text to integer ids', 'Reading, In one screen', 'A tokenizer maps text to a list of integer ids', 'kept', ''),
 ('Word-level: huge vocabularies for morphologically rich languages', 'Reading, Words, characters, bytes, subwords', 'morphologically rich languages', 'kept', ''),
 ('Word-level: OOV words are unrepresentable. Historical.', 'same', 'cannot be represented at all', 'kept', ''),
 ('Character-level: tiny vocabulary, no OOV, works without word boundaries (Chinese, Japanese)', 'same', 'Character-level', 'kept', 'Thai added'),
 ('Character-level: sequences very long, more compute per text, each token little semantics', 'same', 'each token carries little meaning on its own', 'kept', ''),
 ('Subword-level: the compromise every modern LLM uses', 'same', 'the compromise every modern LLM uses', 'kept', ''),
 ('Frequent words stay whole; rare words decompose into meaningful pieces; handles OOV', 'same', 'rare words decompose into meaningful pieces', 'kept', ''),
 ('Vocabulary manageable (32k-256k typical)', 'same', '32K to 262K entries in current models', 'corrected', 'Gemma 3 and 4 are 262,144 entries, so the upper end is 262K'),
 ('Negative sampling (word2vec): sample a few negatives, binary classifier real pair vs noise', 'Reading, negative sampling box', 'binary classifier', 'kept', 'sourced to Mikolov et al. 2013 with k ranges'),
 ('It existed purely to avoid a huge-vocabulary softmax', 'same', 'It existed purely to avoid the full softmax', 'kept', ''),
 ('Modern LLMs pay for the full softmax', 'same', 'LLMs simply pay for the full softmax', 'kept', ''),
 ('Idea survives in contrastive objectives (InfoNCE) and embedding-model training', 'same', 'InfoNCE', 'kept', 'sourced to van den Oord et al. 2018'),
 ('BPE: start from characters or bytes, merge the most frequent adjacent pair until target size', 'Reading, The algorithms; trainer animation', 'repeatedly merge the most', 'kept', ''),
 ('BPE guarantees no OOV (falls back to characters/bytes)', 'same', 'It guarantees no OOV', 'kept', ''),
 ('BPE: unfamiliar words shatter into many small fragments', 'same', 'unfamiliar words shatter into many small fragments', 'kept', ''),
 ('BPE encoding applies the learned merges in order', 'Reading, The algorithms and Encoding', 'Encoding applies the learned merges in order', 'kept', ''),
 ('Byte-level BPE over 256 raw bytes (GPT-2 onward, Llama 3, tiktoken vocabularies)', 'Reading, The algorithms', 'BPE over the 256 raw byte values', 'kept', ''),
 ('Byte-level: any Unicode input representable with zero OOV, no normalisation headaches', 'same', 'zero OOV and no normalisation headaches', 'kept', ''),
 ('WordPiece (BERT): same skeleton as BPE, different merge criterion', 'Reading, The algorithms; trainer', 'Same skeleton as BPE, different merge criterion', 'kept', ''),
 ('WordPiece criterion: maximise P(ab)/(P(a)P(b)), i.e. PMI, not raw frequency', 'same', 'pointwise mutual information up to a constant', 'kept', 'nuance added: this is the HF course\'s reconstruction; the original criterion is LM likelihood gain, and the HF library\'s WordPieceTrainer runs plain BPE'),
 ('WordPiece encoding: greedy longest-match-first with ## continuation prefixes', 'Reading, The algorithms and Encoding', 'greedy longest-match-first', 'kept', ''),
 ('Unigram LM (Kudo): start large, fit unigram LM with EM, prune tokens whose removal least hurts likelihood', 'Reading, The algorithms; trainer', 'least hurts corpus likelihood', 'kept', 'the trainer uses the HF course\'s simplified version (no EM), labelled'),
 ('Unigram tokenisation: highest-probability segmentation (Viterbi)', 'same', 'highest-probability segmentation (Viterbi)', 'kept', ''),
 ('Unigram supports sampling segmentations (subword regularisation), training-time augmentation', 'same', 'subword regularization', 'kept', ''),
 ('SentencePiece is a toolkit, not an algorithm', 'Reading, The algorithms', 'A toolkit, not an algorithm', 'kept', ''),
 ('SentencePiece: raw text as character stream incl. whitespace as U+2581; no pre-tokenisation; lossless round trip', 'same', 'U+2581', 'kept', 'quoted from the paper with its example'),
 ('SentencePiece trains BPE or Unigram underneath', 'same', 'trains either BPE or Unigram underneath', 'kept', ''),
 ('SentencePiece used by T5, Llama 1/2, Gemma, many multilingual models', 'same', 'Used by T5, LLaMA 1 and 2, Gemma and many multilingual models', 'kept', ''),
 ('GPT-4/o series: byte-level BPE (tiktoken, o200k ~200k)', 'Reading, What current models use', 'o200k_base', 'corrected', 'GPT-4 itself uses cl100k_base (100,277); o200k_base (200,019) is GPT-4o, o-series, GPT-4.1 and GPT-5 (tiktoken model map)'),
 ('Llama 3 onward: 128k byte-level BPE via tiktoken-style regex (moved off SentencePiece)', 'same', '128,256', 'corrected', 'true for Llama 3; Llama 4 is 202,048 (config) / 201,135 entries'),
 ('Gemma: 256k SentencePiece', 'same', '256,000', 'corrected', '256,000 for Gemma 1 and 2; 262,144 for Gemma 3 and 4'),
 ('Qwen3: ~152k BPE', 'same', '151,669', 'kept', 'exact: 151,643 + 26 special; Qwen3.5 (2026) moved to 248K'),
 ('DeepSeek: ~128k BPE', 'same', '128,815', 'kept', 'exact counts, config 129,280'),
 ('Trend: vocabularies grew from 32k to 128-256k, mostly multilingual and code compression', 'Reading, What current models use; Vocabulary size tab', 'mostly for multilingual and code compression', 'kept', 'measured: English compression flat, other languages carry the saving'),
 ('Larger vocab = fewer tokens per text = cheaper effective context', 'same', 'A larger vocabulary means fewer tokens per text', 'kept', ''),
 ('Cost: bigger embedding/unembedding matrix, a real fraction of small models\' parameters', 'same; calculator', 'a real fraction of a small model', 'kept', 'quantified: Gemma 3 270M 62.6%, reproduces Google\'s 170M'),
 ('Fertility (tokens per word) varies wildly by language', 'Reading, The language tax', 'Fertility', 'kept', ''),
 ('Low-resource languages pay 3-5x more tokens for the same content', 'same', 'is true for some tokenizers and some languages', 'corrected', 'measured over 204 languages: median 2.26 (cl100k), 1.75 (o200k); 65 / 15 / 8 languages above 3x; up to 15x'),
 ('Both a cost and a quality issue', 'same', 'both a cost', 'kept', ''),
 ('Check fertility when picking a tokenizer for domain adaptation', 'same', 'When choosing a tokenizer for domain adaptation, measure the fertility', 'kept', ''),
 ('Blind spots: character-level tasks (counting letters, reversing strings)', 'Reading, Failure modes (letters case)', 'spelling a word backwards', 'kept', 'run on ten real tokenizers'),
 ('Digit chunking: modern tokenizers force 1-3 digit groups for arithmetic', 'Reading, Encoding table and Failure modes', 'Groups of 1 to 3 digits, from the left', 'corrected', 'only the tiktoken family, Llama 3/4 and DeepSeek; LLaMA 2, Gemma and Qwen split single digits'),
 ('Trailing-whitespace sensitivity', 'Reading, Failure modes', 'Trailing whitespace', 'kept', 'sourced to Guidance token healing'),
 ('Glitch tokens (undertrained tokens present in vocab but rare in training data)', 'Reading, Failure modes', 'SolidGoldMagikarp', 'kept', 'GPT-2 ids, LessWrong post, Fishing for Magikarp'),
 ('Special tokens (BOS/EOS, chat roles, tool-call markers) added after training the vocab', 'Reading, Special tokens', 'added on top of the learned vocabulary, after it is trained', 'kept', ''),
 ('Chat-template mismatches between training and inference: a common silent bug in fine-tuning', 'same', 'common silent bug in fine-tuning', 'kept', 'links Alignment, which shows the masking'),
 ('Tokenizer-free/byte-level research (ByT5, MegaByte, BLT patches) keeps resurfacing, not displaced BPE', 'Reading, Beyond subwords', 'keeps resurfacing but has not displaced subword BPE in production', 'kept', 'each sourced, BLT patches drawn'),
 ('Frontier labs experimenting with SuperBPE-style superword tokens (crossing whitespace)', 'same', 'SuperBPE', 'corrected', 'SuperBPE numbers sourced; "frontier labs are experimenting" marked unconfirmed: no released tokenizer measured here has superword tokens'),
 ('Training your own: HF tokenizers or SentencePiece on a corpus matching your target distribution', 'Reading, Training your own', 'on a corpus that matches your target distribution', 'kept', ''),
 ('Details in Topic: data-curation-and-datasets (mention)', 'same; Further reading', '3c65c17b0d0d811fa5ecda8d365ab00f', 'kept', ''),
 ('Parent page Topic: llm-training-and-post-training', 'header, Further reading', '3c65c17b0d0d81b6876ee72b7056793b', 'kept', ''),
]
out = []; miss = 0
for f, w, ph, st, note in C:
    ok = ph in text or ph in html
    if not ok: miss += 1
    out.append({'fact': f, 'where': w, 'phrase': ph, 'found': ok, 'status': st, 'note': note})
json.dump({'source': 'live.md (Notion page as of 2026-09-20, fetched 2026-10-03)', 'items': out,
           'counts': {'items': len(C), 'found': len(C) - miss, 'kept': sum(c[3] == 'kept' for c in C), 'corrected': sum(c[3] == 'corrected' for c in C), 'dropped': 0}},
          open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print(len(C), 'items,', len(C) - miss, 'found;', [c[0] for c, o in zip(C, out) if not o['found']])

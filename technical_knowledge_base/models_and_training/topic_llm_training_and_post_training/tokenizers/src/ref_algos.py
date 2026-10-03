# Reference results for the page's three trainers (parts/22_js_algos.js), computed offline:
#  - BPE: the Hugging Face `tokenizers` library's own BpeTrainer (byte-level, GPT-2 pre-tokenizer), merges and encodings.
#  - WordPiece and Unigram: the Hugging Face LLM course's reference code (chapter 6, sections 6 and 7), copied verbatim
#    below, with the library's own pre-tokenizers (bert-base-cased, xlnet-base-cased). The library has no WordPiece
#    trainer of its own (its WordPieceTrainer runs BPE), and its UnigramTrainer is SentencePiece's EM algorithm, so the
#    course code is the reference for those two. Encodings are also checked against the library's WordPiece and
#    Unigram models loaded with the trained vocabularies.
# Run from src/:  uv run --with tokenizers --with huggingface_hub python ref_algos.py   (writes inputs/ref_algos.json)
import json, copy
from math import log
from collections import defaultdict
from tokenizers import Tokenizer, models, trainers, pre_tokenizers
from huggingface_hub import hf_hub_download

PT = {k: Tokenizer.from_file(hf_hub_download(r, 'tokenizer.json')).pre_tokenizer
      for k, r in [('gpt2', 'openai-community/gpt2'), ('bert', 'google-bert/bert-base-cased'), ('xlnet', 'xlnet/xlnet-base-cased')]}

COURSE = ["This is the Hugging Face Course.", "This chapter is about tokenization.",
          "This section shows several tokenizer algorithms.",
          "Hopefully, you will be able to understand how they are trained and generate tokens."]
CORPORA = {
    'course': COURSE,
    'hug': ['hug ' * 10 + 'pug ' * 5 + 'pun ' * 12 + 'bun ' * 4 + 'hugs ' * 5],
    'mixed': ["The cat sat on the mat. The mat was flat.", "aaa aaaa aaaaa banana bandana",
              "Café naïve façade: déjà vu, 12345 + 678 = 13023!", "Tokenizers split text into tokens; tokens become ids.",
              "lowest lower newer newest wider widest"],
    'unicode': ["日本語のテキストと English text", "Привет мир, привет всем", "emoji 🙂🙂 and more 🙂"],
}
TEST = ["This is not a token.", "This is the Hugging Face course.", "This is the Hugging Face course!", "Hopefully the tokenizer understands hugging.", "unhuggable bandanas, 999!"]

def words_of(pt, corpus):
    wf = defaultdict(int)
    for text in corpus:
        for w, _ in PT[pt].pre_tokenize_str(text): wf[w] += 1
    return wf

# ---------- BPE: the library ----------
def bpe_hf(corpus, n):
    tok = Tokenizer(models.BPE())
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tr = trainers.BpeTrainer(vocab_size=256 + n, initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False)
    tok.train_from_iterator(corpus, tr)
    j = json.loads(tok.to_str())
    merges = [m.split(' ') if isinstance(m, str) else m for m in j['model']['merges']]
    return {'merges': merges, 'enc': [tok.encode(t).tokens for t in TEST]}

# ---------- WordPiece: course code ----------
def wordpiece_course(corpus, vocab_size):
    word_freqs = words_of('bert', corpus)
    alphabet = []
    for word in word_freqs.keys():
        if word[0] not in alphabet: alphabet.append(word[0])
        for letter in word[1:]:
            if f"##{letter}" not in alphabet: alphabet.append(f"##{letter}")
    alphabet.sort()
    vocab = ["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]"] + alphabet.copy()
    splits = {word: [c if i == 0 else f"##{c}" for i, c in enumerate(word)] for word in word_freqs.keys()}
    def compute_pair_scores(splits):
        letter_freqs = defaultdict(int); pair_freqs = defaultdict(int)
        for word, freq in word_freqs.items():
            split = splits[word]
            if len(split) == 1:
                letter_freqs[split[0]] += freq; continue
            for i in range(len(split) - 1):
                pair = (split[i], split[i + 1]); letter_freqs[split[i]] += freq; pair_freqs[pair] += freq
            letter_freqs[split[-1]] += freq
        return {pair: freq / (letter_freqs[pair[0]] * letter_freqs[pair[1]]) for pair, freq in pair_freqs.items()}
    def merge_pair(a, b, splits):
        for word in word_freqs:
            split = splits[word]
            if len(split) == 1: continue
            i = 0
            while i < len(split) - 1:
                if split[i] == a and split[i + 1] == b:
                    merge = a + b[2:] if b.startswith("##") else a + b
                    split = split[:i] + [merge] + split[i + 2:]
                else: i += 1
            splits[word] = split
        return splits
    while len(vocab) < vocab_size:
        scores = compute_pair_scores(splits)
        if not scores: break
        best_pair, max_score = "", None
        for pair, score in scores.items():
            if max_score is None or max_score < score: best_pair = pair; max_score = score
        splits = merge_pair(*best_pair, splits)
        vocab.append(best_pair[0] + best_pair[1][2:] if best_pair[1].startswith("##") else best_pair[0] + best_pair[1])
    def encode_word(word):
        tokens = []
        while len(word) > 0:
            i = len(word)
            while i > 0 and word[:i] not in vocab: i -= 1
            if i == 0: return ["[UNK]"]
            tokens.append(word[:i]); word = word[i:]
            if len(word) > 0: word = f"##{word}"
        return tokens
    enc = [[encode_word(w) for w, _ in PT['bert'].pre_tokenize_str(t)] for t in TEST]
    # the library's WordPiece model with this vocabulary (max_input_chars_per_word large)
    lib = Tokenizer(models.WordPiece({t: i for i, t in enumerate(vocab)}, unk_token='[UNK]', max_input_chars_per_word=1000))
    lib.pre_tokenizer = pre_tokenizers.BertPreTokenizer()
    return {'vocab': vocab, 'enc': enc, 'lib_enc': [lib.encode(t).tokens for t in TEST]}

# ---------- Unigram: course code ----------
def unigram_course(corpus, target, seed=300, percent_to_remove=0.1):
    word_freqs = words_of('xlnet', corpus)
    char_freqs = defaultdict(int); subwords_freqs = defaultdict(int)
    for word, freq in word_freqs.items():
        for i in range(len(word)):
            char_freqs[word[i]] += freq
            for j in range(i + 2, len(word) + 1): subwords_freqs[word[i:j]] += freq
    sorted_subwords = sorted(subwords_freqs.items(), key=lambda x: x[1], reverse=True)
    token_freqs = list(char_freqs.items()) + sorted_subwords[: seed - len(char_freqs)]
    token_freqs = {token: freq for token, freq in token_freqs}
    total_sum = sum([freq for token, freq in token_freqs.items()])
    model = {token: -log(freq / total_sum) for token, freq in token_freqs.items()}
    def encode_word(word, model):
        best_segmentations = [{"start": 0, "score": 1}] + [{"start": None, "score": None} for _ in range(len(word))]
        for start_idx in range(len(word)):
            best_score_at_start = best_segmentations[start_idx]["score"]
            for end_idx in range(start_idx + 1, len(word) + 1):
                token = word[start_idx:end_idx]
                if token in model and best_score_at_start is not None:
                    score = model[token] + best_score_at_start
                    if best_segmentations[end_idx]["score"] is None or best_segmentations[end_idx]["score"] > score:
                        best_segmentations[end_idx] = {"start": start_idx, "score": score}
        segmentation = best_segmentations[-1]
        if segmentation["score"] is None: return ["<unk>"], None
        score = segmentation["score"]; start = segmentation["start"]; end = len(word); tokens = []
        while start != 0:
            tokens.insert(0, word[start:end]); next_start = best_segmentations[start]["start"]; end = start; start = next_start
        tokens.insert(0, word[start:end])
        return tokens, score
    def compute_loss(model):
        loss = 0
        for word, freq in word_freqs.items():
            _, word_loss = encode_word(word, model); loss += freq * word_loss
        return loss
    def compute_scores(model):
        scores = {}; model_loss = compute_loss(model)
        for token, score in model.items():
            if len(token) == 1: continue
            model_without_token = copy.deepcopy(model); _ = model_without_token.pop(token)
            scores[token] = compute_loss(model_without_token) - model_loss
        return scores
    rounds = [list(model.keys())]
    while len(model) > target:
        scores = compute_scores(model)
        sorted_scores = sorted(scores.items(), key=lambda x: x[1])
        for i in range(int(len(model) * percent_to_remove)): _ = token_freqs.pop(sorted_scores[i][0])
        total_sum = sum([freq for token, freq in token_freqs.items()])
        model = {token: -log(freq / total_sum) for token, freq in token_freqs.items()}
        rounds.append(list(model.keys()))
    enc = [[encode_word(w, model)[0] for w, _ in PT['xlnet'].pre_tokenize_str(t)] for t in TEST]
    lib = Tokenizer(models.Unigram([('<unk>', 0.0)] + [(t, -s) for t, s in model.items()], unk_id=0, byte_fallback=False))
    lib.pre_tokenizer = PT['xlnet']
    return {'vocab': list(model.keys()), 'rounds': [len(r) for r in rounds], 'loss': compute_loss(model), 'enc': enc,
            'lib_enc': [lib.encode(t).tokens for t in TEST]}

out = {'test': TEST, 'corpora': {}}
for name, corpus in CORPORA.items():
    out['corpora'][name] = {'corpus': corpus, 'bpe': bpe_hf(corpus, 40), 'wp': wordpiece_course(corpus, 70 if name != 'hug' else 12),
                            'ug': unigram_course(corpus, 100 if name != 'hug' else 10)}
    print(name, 'done')
c = out['corpora']['course']
print('course WordPiece vocab[45:]:', c['wp']['vocab'][45:])
print('course Unigram encode:', c['ug']['enc'][0])
json.dump(out, open('inputs/ref_algos.json', 'w'), ensure_ascii=True, indent=0)

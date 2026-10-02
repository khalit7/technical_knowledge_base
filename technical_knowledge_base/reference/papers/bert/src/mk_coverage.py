"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 ('Reading time line "9 min read, +~2h 40m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Devlin, Chang, Lee, Toutanova (Google AI Language)', R + ', headline card', ['Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova', 'Google AI Language']),
 ('Date: October 2018 (arXiv v1; v2 May 2019, NAACL 2019 best paper)', R + ', headline card', ['October 2018', 'v2 24 May 2019', 'NAACL 2019 (best long paper)']),
 ('Link arXiv:1810.04805 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/1810.04805', '(45 min)']),
 ('Link code + checkpoints (repo, ~20 min for README and entry path)', 'card and Further reading', ['https://github.com/google-research/bert', 'about 20 minutes for the README and entry path']),
 ('Google AI blog (~10 min): concise author framing', 'Further reading, Best resources (listed once; the old page listed it twice)', ['https://research.google/blog/open-sourcing-bert-state-of-the-art-pre-training-for-natural-language-processing/', 'concise author framing of the contribution']),
 ('The Illustrated BERT, ELMo, and co. (Alammar, ~30 min)', 'Further reading', ['https://jalammar.github.io/illustrated-bert/', 'the classic visual walkthrough']),
 ('BERT 101 (Hugging Face, ~25 min)', 'Further reading', ['https://huggingface.co/blog/bert-101', 'practical intro with code']),
 ('ModernBERT blog (Answer.AI, Dec 2024, ~30 min)', 'Further reading', ['https://www.answer.ai/posts/2024-12-19-modernbert.html', 'where the encoder lineage stands today']),
 # problem
 ('By 2018 pretraining then transferring effective (ELMo, ULMFiT, GPT)', R + ', Problem', ['ELMo, ULMFiT and OpenAI GPT']),
 ('Unidirectional handicap; deep bidirectional nets let a word "see itself"', R + ', Problem and Idea (animation)', ['"see itself"', 'could trivially predict the target word']),
 ('GPT attends left only; ELMo concatenates two shallow unidirectional LSTMs', R + ', Problem', ['attend only to tokens on its left', 'merely concatenated']),
 ('Token-level tasks (QA, NER) need right context', R + ', Problem', ['question answering and named entity recognition']),
 ('The gap: deep bidirectional pretraining, minimal task-specific architecture', R + ', Problem', ['genuinely deep bidirectional model', 'minimal task-specific architecture']),
 # method
 ('Transformer encoder stack, two self-supervised objectives, fine-tuned end to end', R + ', Model and input; Fine-tuning', ['multi-layer bidirectional Transformer encoder', 'fine-tuned end to end']),
 ('BERT-Base L=12 H=768 A=12 110M (sized to match GPT-1); Large L=24 H=1024 A=16 340M', R + ', Model and input table (with the recount: 335M)', ['BERT-Base', '110M', '340M', 'same model size as OpenAI GPT', '335M']),
 ('WordPiece 30k vocabulary; [CLS] first; pairs separated by [SEP]', R + ', Model and input', ['30,000-token vocabulary', 'Every sequence starts with', 'separated by']),
 ('Token + learned position + segment embeddings summed', R + ', Model and input; Figure 2 redrawn', ['sum', 'segment']),
 ('[CLS] final state is the aggregate representation', R + ', Model and input', ['aggregate representation for classification']),
 ('MLM: 15% selected, softmax over vocabulary, full bidirectional context', R + ', Masked LM', ['15%', 'softmax over the vocabulary']),
 ('80% [MASK], 10% random, 10% unchanged, to reduce mismatch', R + ', Masked LM table and masking demo', ['80%: replaced by', '10%: replaced by a random word', '10%: left unchanged']),
 ('Only 15% of positions give loss: converges slower but overtakes LTR almost immediately', R + ', Masked LM; Ablations (Figure 5 decoded); toy Figure 5', ['only 15% of positions produce a loss', 'overtakes the left-to-right model']),
 ('NSP: binary IsNext/NotNext from [CLS], 50/50, for QA/NLI', R + ', Next sentence prediction', ['IsNext', 'NotNext', '50% of the time']),
 ('Ablation shows NSP helping QNLI/MNLI/SQuAD by roughly 1-2 points (corrected)', R + ', Next sentence prediction and How much to believe: QNLI 3.5, MNLI 0.5, SQuAD 0.6, MRPC 0.2, SST-2 0.1', ['QNLI loses 3.5 points without it', 'Removing NSP costs 0.5 on MNLI-m']),
 ('Later work (RoBERTa) showed NSP largely unnecessary', R + ', Next sentence prediction; How much to believe', ['matches or slightly improves', 'arxiv.org/html/1907.11692']),
 ('BooksCorpus 800M + Wikipedia 2,500M words, document-level', R + ', Pretraining setup', ['BooksCorpus (800M words)', '2,500M words', 'document-level corpus']),
 ('1M steps, batch 256 x 512 (~40 epochs over 3.3B words)', R + ', Pretraining setup (with the arithmetic: 38.8; about 13 passes with the length schedule)', ['1,000,000 steps', 'approximately 40 epochs over the 3.3 billion word corpus', '38.8']),
 ('Adam lr 1e-4, 10k warmup, linear decay, GELU, dropout 0.1', R + ', Pretraining setup', ['learning rate 10', 'first 10,000 steps then linear decay', 'GELU', 'dropout 0.1']),
 ('90% of steps at length 128, last 10% at 512 for positional embeddings', R + ', Pretraining setup', ['90% of the steps use length 128', 'to learn the positional embeddings']),
 ('4 days on 4 Cloud TPUs (Base) or 16 (Large)', R + ', Pretraining setup', ['4 Cloud TPUs', '16 Cloud TPUs', '4 days']),
 ('Fine-tune all parameters 2-4 epochs at 2e-5 to 5e-5', R + ', Fine-tuning', ['2 to 4 epochs', '5e-5, 3e-5 or 2e-5']),
 ('Classification: one layer over [CLS]; SQuAD: start/end vectors S, E dot products; NER: per-token classifier', R + ', Fine-tuning table', ['start vector', 'end vector', 'a classifier on each word']),
 ('Fine-tuning typically under an hour on a TPU', R + ', Fine-tuning', ['at most 1 hour on a single Cloud TPU']),
 ('Feature-based: top four layers within 0.3 F1 of fine-tuning on NER', R + ', Ablations', ['0.3 behind fine-tuning', 'top four layers']),
 ('LTR hurts badly: MRPC 86.7 to 77.5, SQuAD 88.5 to 77.8 (the old page compared BERT-Base with LTR; the page compares No NSP with LTR, isolating direction; both rows are in Table 5 rebuilt)', R + ', Ablations; Table 5 rebuilt', ['86.5 to 77.5', '87.9 to 77.8']),
 ('BiLSTM on top only partially recovers', R + ', Ablations', ['recovers 7.1 SQuAD F1']),
 ('Bigger models help monotonically even on 3.6k-example MRPC', R + ', Ablations (Table 6)', ['bigger is strictly better', '3,600 labelled examples']),
 # results
 ('New SOTA on 11 tasks', R + ', Results (which eleven, counted)', ['eleven NLP tasks']),
 ('GLUE 80.5 vs GPT 72.8 (+7.7); MNLI 86.7 (+4.6)', R + ', Results; headline card', ['80.5', '72.8', '+7.7', '86.7%, +4.6']),
 ('SQuAD v1.1 93.2 F1 (ensemble+TriviaQA; 91.8 single), above top ensemble and human 91.2', R + ', Results; How much to believe (what "above human" means)', ['93.2', '91.8', '91.2']),
 ('SQuAD v2.0 83.1 F1, +5.1', R + ', Results', ['83.1 test F1, +5.1']),
 ('SWAG 86.3, +8.3 over GPT, roughly expert-human level', R + ', Results; How much to believe (100-sample human)', ['86.3%', '+8.3 over GPT', 'expert humans scored 85.0']),
 ('CoNLL NER 92.8 test F1 fine-tuned, matching task-specific systems', R + ', Results', ['92.8 test F1']),
 ('Large wins every task, especially low-data', R + ', Results', ['Large beats Base on every task']),
 ('Same checkpoint + one-layer head beat specialised architectures: the headline claim', R + ', Results', ['same pretrained checkpoint with a one-layer head']),
 # why it matters
 ('Ended task-specific architectures; pretrain-then-finetune default; MLM canonical', R + ', Why it matters', ['ended the era of task-specific NLP architectures']),
 ('Descendants RoBERTa, ALBERT, ELECTRA, DistilBERT, DeBERTa, XLM-R', R + ', Why it matters', ['ALBERT', 'ELECTRA', 'DistilBERT', 'DeBERTa', 'XLM-R']),
 ('BEiT, MAE; [CLS]-style embeddings', R + ', Why it matters', ['BEiT', 'MAE', 'Sentence-BERT']),
 ('GLUE/SQuAD leaderboard culture; early scaling demonstration', R + ', Why it matters', ['leaderboard culture', 'scaling model size keeps paying']),
 ('Encoder lineage 2026: embeddings, rerankers, ColBERT, classification, moderation, NER', R + ', Why it matters', ['cross-encoder rerankers', 'ColBERT', 'moderation and NER at production scale']),
 ('ModernBERT (Dec 2024: RoPE, GeGLU, local/global attention, unpadding, 8k, 2T tokens)', R + ', Why it matters; Then and now', ['RoPE, GeGLU, alternating local and global attention, unpadding, 8,192-token context, 2 trillion training tokens']),
 ('Ettin (2025) confirms encoders win understanding/retrieval per FLOP (corrected: sourced claim is encoders excel at classification and retrieval; 400M encoder beats 1B decoder on MNLI)', R + ', Why it matters', ['encoders excel at classification and retrieval', '400M encoder beats a 1B decoder']),
 ('Reach for BERT-family to represent or label text', R + ', Why it matters', ['"represent or label text"']),
 # connections
 ('Connections: Attention Is All You Need, Ettin, GPT-3, RAG, RoFormer', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', '3c65c17b0d0d81139cffea35080afe2b', '3c65c17b0d0d8193ac92c7648cfaca12', '3c65c17b0d0d816c889decc342a7ad39', '3c65c17b0d0d81cfa5e9f54459720098']),
 ('Topics: llm-training-and-post-training, rag-and-retrieval, ml-fundamentals', 'Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81b89145c37dfe8a3b0b', '3c65c17b0d0d81d796ccc0a293218c57']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Masked-LM pretraining of a deep bidirectional Transformer encoder plus per-task fine-tuning']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)

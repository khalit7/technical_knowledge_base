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
 ('Reading time line "8 min read, +~1h 30m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Weller, Ricci, Marone, Lawrie, Van Durme (JHU CLSP) with Chaffin (LightOn)', R + ', headline card', ['Orion Weller, Kathryn Ricci, Marc Marone, Antoine Chaffin, Dawn Lawrie, Benjamin Van Durme', 'Johns Hopkins University (CLSP) with LightOn (Antoine Chaffin)']),
 ('Date July 2025, arXiv 2507.11412, ICLR 2026', R + ', headline card', ['July 2025', 'arXiv 2507.11412', 'ICLR 2026']),
 ('Link arXiv (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2507.11412', '(45 min)']),
 ('Link GitHub (code, data, batch order) (~20 min for README and entry path)', 'card, Further reading, What it takes', ['https://github.com/JHU-CLSP/ettin-encoder-vs-decoder', 'about 20 minutes for the README and entry path']),
 ('Link HF models and data jhu-clsp (~10 min)', 'Further reading; What it takes', ['https://huggingface.co/jhu-clsp', '(10 min)']),
 ('Best resource: HF blog Ettin Suite (~15 min), authors\' release post, walkthrough with usage snippets', 'Further reading', ['https://huggingface.co/blog/ettin', '(15 min)', 'usage snippets']),
 # problem
 ('Community defaults to decoder-only LLMs', R + ', Problem', ['decoder-only, GPT-style models']),
 ('Much production NLP (classification, retrieval, embeddings) still on encoders, often 2019-era BERT variants; encoder development stalled', R + ', Problem', ['still runs models from 2019', '90 million downloads', 'Encoder development mostly stalled']),
 ('Prior comparisons (DeBERTa vs GPT-2) confounded parameters, data, tokenizers, recipes', R + ', Problem', ['DeBERTa against GPT-2', 'different parameter counts, architectures, training recipes, pretraining data and tokenizers']),
 ('ModernBERT revived encoders but kept data private', R + ', Problem', ['did not release its training data']),
 ('Ettin: first apples-to-apples testbed plus open-data ModernBERT replication', R + ', Problem, Results 1', ['share everything except the thing being compared', 'first public, open-data replication of ModernBERT']),
 # method
 ('Six sizes 17M-1B, each trained twice from scratch, identical architecture, data, data order, hyperparameters', R + ', Idea; The suite', ['trains each size twice from scratch, with the same architecture, the same data, in the same order, with the same hyperparameters']),
 ('Only differences: attention (bidirectional vs causal) and objective (MLM 30%, 15% decay, vs CLM)', R + ', Idea (animation)', ['bidirectional for the encoder, causal', 'masking 30% of tokens and 15% in the final decay phase']),
 ('Small models MobileLLM deep-and-thin; 1B keeps 28 layers but widens', R + ', The suite', ["MobileLLM's advice to go deep and thin", "the 1B keeps the 400M's 28 layers and widens instead"]),
 ('Recipe: ModernBERT-style, open data, three phases up to 2T tokens, trapezoidal LR', R + ', Recipe (chart)', ['three-phase schedule', 'trapezoidal learning rate']),
 ('Phase 1: 1.7T broad mix (DCLM, Dolma v1.7, StarCoder, peS2o, Reddit, math)', R + ', Recipe; Table 2 rebuilt', ['Base pretraining, 1.7T tokens', 'DCLM (49.1%)', 'StarCoder code, Reddit, peS2o papers']),
 ('Phase 2: 250B, 8k context, RoPE theta 160k, filtered DCLM + Dolmino, inverse-sqrt to half peak', R + ', Recipe', ['Context extension (mid-training), 250B tokens', 'RoPE base to 160,000', 'from the peak learning rate to half of it']),
 ('Phase 3: 50B decay, books, Wikipedia, textbooks, Tulu FLAN, to 0.02 of peak', R + ', Recipe; Table 2 rebuilt (Tulu Flan row)', ['Decay, 50B tokens', 'to 0.02 of the peak', 'Dolma books, Wikipedia and open textbooks', 'Tulu Flan']),
 ('Differences from ModernBERT: open data, no merging, decay during context extension, 15% decay masking, unified local/global RoPE', R + ', Recipe', ['open data; decay during context extension; no model merging', '15% masking in the decay phase instead of 30%', 'the same rotary base for local and global layers']),
 ('236 checkpoints per model every 8.5B tokens plus exact batch order, Pythia-style', R + ', Recipe', ['236 per model', '236 × 8.5B = 2,006B', 'exact batch order', 'Pythia']),
 ('Cross-objective: tests adapt-a-decoder pattern (LLM2Vec etc.)', R + ', Cross-objective', ['LLM2Vec', 'continue pretraining it on the reverse objective']),
 ('50B tokens reverse objective, "about 5x LLM2Vec" (corrected: the paper says ~10B for LLM2Vec; LLM2Vec\'s own MNTP is at most 16.4M tokens, so about 3,000x)', R + ', Cross-objective (correction box)', ['50B tokens each way', '16.4M', '3,000 times']),
 ('MNTP: masked token predicted from previous position hidden state (CLM-aligned MLM)', R + ', Cross-objective; Idea animation', ['read from the hidden state of the <i>previous</i> position', 'one position earlier']),
 ('Decoders get MNTP -> encoders-from-decoders; encoders get CLM -> decoders-from-encoders', R + ', Idea; Cross-objective', ['encoder-from-decoder', 'decoder-from-encoder']),
 ('Same high-quality decay-phase data, fresh trapezoidal schedule', R + ', Cross-objective', ["on the decay phase's high-quality data", '3B tokens of warmup, 10B of decay']),
 ('Eval encoders: GLUE fine-tuned, MTEB v2 English, MLDR, CodeSearchNet, ModernBERT eval setup', R + ', Evaluation', ['GLUE (fine-tuned), MTEB v2 English, MLDR', 'CodeSearchNet', "ModernBERT's exact evaluation setup"]),
 ('Eval decoders: zero-shot lm-eval tasks from Pythia/SmolLM (ARC, HellaSwag, LAMBADA, TriviaQA, Winogrande...)', R + ', Evaluation', ['zero-shot, closed-book tasks of the EleutherAI harness from the Pythia and SmolLM papers', 'HellaSwag, LAMBADA', 'TriviaQA, Winogrande']),
 ('Cross-architecture: encoders generatively via iterative mask filling; decoders on MNLI and MS MARCO', R + ', Evaluation; Train the pairs (animation)', ['append three <code>[MASK]</code> tokens', 'decoders are fine-tuned on MNLI and MS MARCO']),
 # results
 ('Encoders beat ModernBERT: base 88.9 vs 88.4 GLUE, 54.0 MTEB v2; large 90.8 GLUE', R + ', Results 1; Table 3 rebuilt', ['88.9 against 88.4', '54.0 MTEB v2', '90.8 against 90.4']),
 ('68M 87.2 GLUE vs DistilRoBERTa 83.8, no distillation', R + ', Results 1', ['<b>87.2</b> GLUE against DistilRoBERTa', '83.8']),
 ('Decoders: 150M 46.2 vs SmolLM2-135M 45.2; 1B 59.0 vs Llama 3.2 1B 56.6', R + ', Results 1; Table 4 rebuilt', ["46.2 against SmolLM2-135M's 45.2", "59.0 against Llama 3.2 1B's 56.6"]),
 ('MNLI: 150M encoder 89.2 beats 400M decoder 88.2; 400M encoder beats 1B decoder', R + ', Results 2; Figure 1 rebuilt', ["scores 89.2 on MNLI against the 400M decoder's 88.2", "the 400M encoder 91.3 against the 1B decoder's 89.9"]),
 ('Continued MLM pretraining of decoders barely moves MNLI', R + ', Results 2; predict question', ['stays within a point of the decoder it started from']),
 ('"Encoders dominate across an order of magnitude of scale" (corrected: the largest size ratio is 2.7x)', R + ', Results 2 (predict question), How much to believe', ['About 2.7x', 'no row supports a ratio above 2.7']),
 ('Retrieval: MNTP helps decoders on MS MARCO; at 400M encoder still wins 42.2 vs 41.4', R + ', Results 2', ['MNTP lifts the decoder by 1.5 to 1.9', '42.2 against 41.4']),
 ('Generation: decoders-from-encoders match at 68M but fall >6 points behind at 1B', R + ', Results 2', ['42.1 against 41.8 at 68M', '6.8 points behind at 1B']),
 ('Nuance: ARC, SciQ encoders-as-generators beat decoders; decoders win big on HellaSwag, TriviaQA, SIQA (corrected: Table 8 swaps SciQ/SIQA for decoder rows; ARC holds, SciQ is a decoder win, SIQA close)', R + ', Results 2 (warning box); Table 8 rebuilt with toggle', ['ARC 35.6 against 33.6', 'Table 8 swaps two columns for the decoder rows', '91.8 on SciQ']),
 ('1B hard benchmarks: dec-from-enc MMLU 37.0 vs 27.0, GSM8k 18.9 vs 32.0 (MMLU "classification" corrected: the table says "MMLU CS", undefined)', R + ', Results 2; Table 5 rebuilt', ['37.0 against', '27.0', '18.9 against 32.0', 'MMLU CS']),
 ('Gender bias: WinoGender Gotcha split; MLM encoders predict far more neutral pronouns; both skew male; objective alone changes bias (corrected: reverses at 400M and 1B)', R + ', Gender bias (Figure 2 rebuilt)', ['Gotcha', 'neutral 37.0% of answers for encoders against 21.5% for decoders', 'at <b>400M and 1B it reverses</b>']),
 # why it matters
 ('Cleanest evidence in encoder-vs-decoder debate; objective and attention alone create durable advantages; 50B reverse objective does not erase', R + ', Why it matters', ['cleanest evidence to date in the encoder-against-decoder debate', 'do not erase']),
 ('Practical: classification/retrieval at 1B or below a native encoder beats larger decoders; fine-tune encoders for transcript or intent classification', R + ', Why it matters; What it takes', ['transcript or intent classification', 'at 1B or below']),
 ('MTEB leaderboards topped by 7B+ adapted decoders because no large encoders; predicts ~3B encoder would win', R + ', Why it matters (labelled a forecast)', ['adapted decoders of 7B or more', 'encoder of about 3B would beat them', 'That is a forecast, not a measurement']),
 ('Gisserot-Boukhlef caveat: at ~100B tokens CLM-then-MLM looks better, artifact of CLM data efficiency', R + ', Why it matters; Idea (counter)', ['Gisserot-Boukhlef et al. (2025)', 'about 100B tokens', 'per-token data efficiency']),
 ('Suite as Pythia-successor research platform; gender study first example', R + ', Why it matters', ['successor to Pythia', 'first example']),
 # connections
 ('Related KB papers: BERT, GPT-3, OLMo 2, RoFormer, Chinchilla (and Pythia)', 'Connections; Further reading', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', '3c65c17b0d0d8193ac92c7648cfaca12', '3c65c17b0d0d81fb9857fb956165ae1c', '3c65c17b0d0d81cfa5e9f54459720098', '3c65c17b0d0d8116b7ddffba5c599f3f', 'https://arxiv.org/abs/2304.01373']),
 ('External anchors: ModernBERT (Warner 2024), LLM2Vec (BehnamGhader 2024), Pythia (Biderman 2023)', 'Connections; Further reading', ['https://arxiv.org/abs/2412.13663', 'https://arxiv.org/abs/2404.05961', 'Biderman et al. 2023']),
 ('Topics: llm-training-and-post-training, rag-and-retrieval', 'Connections; Further reading', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d81b89145c37dfe8a3b0b']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card (its "order of magnitude" corrected in the verdict and Results 2)', ['Compute-matched paired training (same data, recipe, 17M-1B)']),
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

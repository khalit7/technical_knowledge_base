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
 # header
 ('Authors: Dawid J. Kopiczko, Tijmen Blankevoort, Yuki M. Asano', R + ', headline card and byline', ['Dawid J. Kopiczko', 'Tijmen Blankevoort', 'Yuki M. Asano']),
 ('Affiliation "UvA / Qualcomm AI Research"', 'corrected: v1 lists Vrije Universiteit Amsterdam, Meta, University of Amsterdam; v2 Fundamental AI Lab, University of Technology Nuremberg, and Meta; no Qualcomm affiliation in either version', ['Vrije Universiteit Amsterdam, Meta, University of Amsterdam', 'Fundamental AI Lab, University of Technology Nuremberg']),
 ('arXiv 2405.14862, May 2024, v2 Aug 2025', R + ', byline and card', ['arXiv 2405.14862', 'v1 on 23 May 2024', 'v2 on 28 August 2025']),
 ('Published at EMNLP 2025 (main track, pages 9510-9536)', R + ', byline and card', ['EMNLP 2025', 'pages 9510 to 9536']),
 ('Added to the KB 2026-09-01 from a blog entry', R + ', byline', ['Added to this knowledge base on 2026-09-01 from a blog entry']),
 ('Links: arXiv, ACL Anthology, project page', 'byline, card, Further reading', ['https://arxiv.org/abs/2405.14862', 'https://aclanthology.org/2025.emnlp-main.481/', 'https://dkopi.github.io/bitune/']),
 ('Topics: llms, llm-training-and-post-training', R + ', byline; Connections; Further reading', ['Topics: llms, llm-training-and-post-training', '3c65c17b0d0d812d9e00f6ec89965286', '3c65c17b0d0d81b6876ee72b7056793b']),
 # problem
 ('Decoder-only LLMs use masked causal attention everywhere, including over the prompt', R + ', Problem', ['Decoder-only models apply the causal mask everywhere, prompt included']),
 ('The mask exists for autoregressive generation: a token must not see the future', R + ', Problem', ['The mask exists for generation: a token being predicted must not see the future']),
 ('The prompt is already fully available when processed, so masking it discards information', R + ', Problem; mask explorer', ['already fully available', 'masking it throws information away']),
 ('Every prompt token only attends leftwards; an early instruction token never sees the instruction it belongs to', R + ', Problem; mask explorer; predict question', ['every prompt token\'s features are computed from the tokens to its left only', 'it never sees the choices']),
 ('Known weakness: why BERT and T5 outperform similarly sized GPT models on NLU benchmarks', R + ', Problem (sourced: BERT-base 79.6 against GPT 75.1 on GLUE; the T5 part is not a size-matched comparison, so stated as T5 using bidirectional attention over its input)', ['79.6 against GPT\'s 75.1 on the GLUE average', 'T5 and BERT both use bidirectional attention over the input']),
 ('Embedding work (LLM2Vec, NV-Embed) reintroduces bidirectional attention when repurposing decoders as encoders', R + ', Problem; Why it matters', ['LLM2Vec enables bidirectional attention as its first step', 'NV-Embed removes "the causal attention mask of LLMs during contrastive training"']),
 ('Bitune\'s narrower question: the benefit for ordinary instruction following without changing the pretrained model or its generation behaviour', R + ', Problem', ['can a pretrained decoder get that benefit for ordinary instruction following, without changing the pretrained model or the way it generates?']),
 # method
 ('Two passes over the prompt, then a learned combination', R + ', Idea; animation', ['read the prompt twice, mix the two caches, generate as usual']),
 ('1. Causal pass: the prompt as normal, the causal features the model was pretrained to consume', R + ', Idea step 1; animation', ['A causal pass', 'the features the pretrained model was trained to consume']),
 ('2. Bidirectional pass: same prompt, mask removed, each prompt token sees the whole instruction', R + ', Idea step 2; animation; mask explorer', ['A bidirectional pass', 'every prompt token sees the whole instruction']),
 ('3. Two sets of weights: bidirectional pass with its own W_k^b, W_v^b; causal pass keeps W_k^c, W_v^c, which also generate the answer', R + ', Idea step 3; Method (Eqs. 1, 2; corrected scope: in the experiments a whole separate LoRA adapter on every linear layer, not only K and V)', ['Two sets of weights.', 'K<sub>b</sub> = X<sub>b</sub>W<sub>kb</sub>', 'its own LoRA adapter on every linear layer of attention and MLP']),
 ('So the model can treat the two feature types differently instead of interpreting bidirectional features through weights trained on causal ones', R + ', Idea step 3', ['instead of pushing bidirectional features through weights trained on causal ones']),
 ('4. Mixing per transformer block with learned coefficients; the result conditions autoregressive generation', R + ', Idea step 4; Method Eqs. 6 to 8; mixing widget', ['In every block the two sets of keys and values are averaged with learned weights', 'one learnable θ for keys and one for values in every block']),
 ('Generation stays strictly causal; bidirectional attention only in prompt processing; decoding path unchanged', R + ', Idea step 5; animation', ['Generation is unchanged', 'strictly causal']),
 ('Extra parameters are small; an add-on to existing finetuning rather than a replacement', R + ', Method; What it takes', ['Two adapters, so twice LoRA', 'the default is LoRA']),
 # results
 ('Consistent gains in instruction tuning and QA across commonsense reasoning, arithmetic, and language understanding', R + ', Results; Tables tab', ['Instruction tuning', 'Commonsense: PIQA, CommonsenseQA (CSQA), ARC-Challenge, SIQA; language understanding: MMLU', 'GSM8K']),
 ('Compatible with the PEFT stack: LoRA-style methods and full finetuning', R + ', Results (Tables 6, 7)', ['with DoRA +4.0 and +1.6, with IA3 +2.4 and +1.0', 'full finetuning of two full weight sets']),
 ('Extensive ablations attribute the gain to the design rather than added parameters, in particular the separate weight sets', R + ', Results (LoRA16); Ablations; How much to believe (qualified: two of ten ablation gaps within noise)', ['extra parameters alone do not explain them', 'Shared Weights', 'components not all shown necessary']),
 # why it matters
 ('The causal mask over the prompt is a legacy of the generation objective, not a requirement of it, and its cost is measurable', R + ', Why it matters', ['the causal mask over the prompt is a legacy of the generation objective, not a requirement of it']),
 ('Prefix-LM architectures made the same observation years earlier', R + ', Why it matters; Ablations (Naive Bidir. = prefix-LM)', ['Prefix-LMs made the same observation years earlier', 'turning a pretrained decoder into a prefix-LM']),
 ('Bitune\'s contribution: doing it to an already-pretrained decoder without retraining, and showing the two feature types need separate projections', R + ', Why it matters', ['doing it to an already-pretrained decoder without retraining it', 'need their own weights and a mix with the causal ones']),
 ('Caveat: gains consistent but not transformational', R + ', Why it matters; verdict', ['the gains are consistent but not transformational']),
 ('Caveat: roughly doubles prompt-processing compute; real cost at long context; paper\'s setting is short instructions', R + ', Cost (refined: two passes\' work, measured 9.3 times the prefill time; training 3.1 times); Why it matters', ['doubles prompt-processing work', 'the paper\'s setting is short instructions', '9.3 times longer']),
 ('Caveat: the frontier has largely not adopted it', R + ', Why it matters (marked unconfirmed: no model card or report documents it)', ['Whether frontier labs use anything like it is not documented in any model card or report we know of (unconfirmed)']),
 ('Read it for the diagnosis more than the recipe', R + ', Why it matters', ['Read it for the diagnosis more than the recipe']),
 # connections
 ('The same observation drives encoder repurposing: LLM2Vec, NV-Embed, the bidirectional-encoder half of Encoder-Decoder Gemma', 'Connections; Why it matters; Further reading', ['the bidirectional encoder half of', '3d45c17b0d0d81a9a22ffaada508db5c', 'https://arxiv.org/abs/2504.06225']),
 ('Attention masking and prefix-LM variants: see the llms topic', 'Connections', ['Attention masking and prefix-LM variants', '3c65c17b0d0d812d9e00f6ec89965286']),
 ('Adjacent in this batch: LLM Modules and Trained Persistent Memory; all three attach trainable structure to a frozen pretrained model', 'Connections; Further reading', ['3ce5c17b0d0d810191d0ebcffc54f608', '3ce5c17b0d0d81978137dd8f8cab1c74', 'All three attach trainable structure to a frozen pretrained model rather than retraining it']),
 ('Database property Takeaway', 'stays in the database; the headline card carries an updated one-line takeaway', ['The causal mask is required by generation, not by prompt processing']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:34)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)

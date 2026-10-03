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
 ('Reading time line "7 min read, +~3h 20m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors/lab: Dettmers, Pagnoni, Holtzman, Zettlemoyer (University of Washington)', R + ', headline card', ['Tim Dettmers*', 'Artidoro Pagnoni*', 'Ari Holtzman', 'Luke Zettlemoyer', 'University of Washington']),
 ('Date: May 2023', R + ', headline card', ['23 May 2023']),
 ('Links: arXiv 2305.14314 (~45 min); code artidoro/qlora (~20 min); bitsandbytes (~20 min)', 'card and Further reading', ['https://arxiv.org/abs/2305.14314', '(45 min)', 'https://github.com/artidoro/qlora', 'bitsandbytes', '(20 min)']),
 ('HF blog 4-bit transformers with bitsandbytes and QLoRA (~25 min): canonical guide, co-written with the authors; NF4, DQ, transformers/PEFT API', 'Further reading; Use it; Why it matters', ['https://huggingface.co/blog/4bit-transformers-bitsandbytes', 'co-written with the paper authors', '(25 min)']),
 ('Grootendorst, A Visual Guide to Quantization (~30 min)', 'Further reading', ['https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization', 'absmax and blockwise quantisation, NF4']),
 ('Raschka, Practical Tips for Finetuning LLMs Using LoRA (~30 min)', 'Further reading; Use it', ['https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms', 'adapters-on-all-layers finding']),
 ('Lightning AI, LoRA/QLoRA insights from hundreds of experiments (~30 min)', 'Further reading', ['https://lightning.ai/pages/community/lora-insights/', "QLoRA's memory savings against runtime cost"]),
 ('Problem: full 16-bit finetuning of 65B needs >780 GB; multi-node cluster', R + ', Problem (with the accounting that reproduces it)', ['more than 780 GB of GPU memory', '783 GB']),
 ('Existing 4-bit quantisation (GPTQ, LLM.int8()) only for inference; training through quantised weights broke', R + ', Problem', ['LLM.int8(), GPTQ', 'break down during training']),
 ('Gap: finetune 33B/65B on one GPU without losing 16-bit performance', R + ', Problem', ['at 33B to 65B on one GPU, without losing 16-bit task performance']),
 ('Backprop through a frozen 4-bit base into LoRA adapters', R + ', Idea', ['frozen, 4-bit quantised']),
 ('Storage 4-bit, compute BF16; dequantise on the fly for the matmul', R + ', Idea, Eq. 5', ['one <b>storage</b> data type', 'dequantised to BF16']),
 ('Gradients only to BF16 LoRA parameters; 4-bit weights never updated', R + ', Idea', ['the 4-bit weights are never updated']),
 ('NF4: quantile quantisation, 16 levels = quantiles of N(0,1) rescaled to [-1, 1]', R + ', NF4 (with the code recipe that reproduces Appendix E)', ['Quantile quantisation', 'normalise them into [−1, 1]']),
 ('Weights ~ zero-mean normal; absmax normalisation; equal expected number per bin; information-theoretically optimal', R + ', NF4 (claim qualified: close, not equal, measured)', ['roughly zero-centred normal', 'equal expected number of values in each bin', 'can\'t quite be']),
 ('NF4 asymmetric so zero is exact', R + ', NF4', ['NF4 is <b>asymmetric</b>', 'no exact zero']),
 ('Blocksize 64 per constant', R + ', Idea, NF4, DQ; quantiser tab', ['blocks of 64']),
 ('DQ: FP32 constants quantised to FP8 (block 256), 0.5 -> 0.127 bits, ~3 GB on 65B, no quality loss', R + ', Double quantisation (with the correction that the code uses an 8-bit dynamic map)', ['<b>0.5 bits per parameter</b>', '<b>0.127 bits</b>', 'approximately 3 GB for a 65B model', 'No degradation is observed', 'not FP8']),
 ('Paged optimizers: unified memory, paged to CPU RAM on spikes (long-sequence gradient checkpointing), back for the update', R + ', Paged optimizers (animation)', ['NVIDIA unified memory', 'evicted to CPU RAM', 'gradient checkpointing on mini-batches with long sequences']),
 ('Paged optimizers let 33B/65B train on one 24/48 GB GPU', R + ', Paged optimizers', ['critical for 33B and 65B on one 24 or 48 GB GPU']),
 ('LoRA on all linear layers: Q/V-only does not recover full finetuning; number of adapted layers matters more than r', R + ', All-layer LoRA (Figures 2 and 4 redrawn)', ['does not match full finetuning at scale', 'do not affect performance']),
 ('Adapter memory negligible next to activation gradients; adapting everything nearly free', R + ', All-layer LoRA', ['567 MB', 'only 26 MB', 'adapters can go everywhere']),
 ('Fidelity: GLUE (RoBERTa), Super-NaturalInstructions (T5 80M-11B), 5-shot MMLU LLaMA 7B-65B, 53.1 vs 53.0', R + ', Does 4-bit match 16-bit? (with the T5-11B gap and the recomputed means)', ['RoBERTa-large', 'T5 80M to 11B', '53.1 against 53.0', '52.99']),
 ('FP4 lags by about 1 point', R + ', Results; How much to believe', ['FP4 lags by about one point']),
 ('NF4 beats FP4/Int4 on zero-shot accuracy and perplexity across OPT/BLOOM/Pythia/LLaMA', R + ', Results; reproduced on five small models (quantiser tab)', ['OPT, LLaMA, BLOOM and Pythia', 'Int4 34.34', 'reproducing Table 2']),
 ('Headline: 65B from >780 GB to <48 GB on one professional GPU', R + ', headline card; Problem', ['to finetune LLaMA 65B, from more than 780 GB', 'under 48 GB']),
 ('33B on a 24 GB consumer GPU in under 12 hours', R + ', Guanaco; Use it', ['under 12 hours on a 24 GB consumer GPU']),
 ('Guanaco: LLaMA + QLoRA on 9k OASST1 samples', R + ', Guanaco', ['9,209 examples', 'LLaMA finetuned with QLoRA on OASST1']),
 ('Guanaco 65B 99.3% of ChatGPT on Vicuna after 24h on one GPU; 33B 97.8%', R + ', Guanaco; tournament tab (rebuilt from the released scores)', ['reaches 99.3% of ChatGPT after 24 hours', '33B reaches 97.8%']),
 ('7B (5 GB) beats a 26 GB Alpaca by 20+ points', R + ', Guanaco: corrected (17.6 points over Alpaca 13B at 10 GB; no 26 GB Alpaca in Table 6)', ['Correction: "beats a 26 GB Alpaca by more than 20 points"', '<b>17.6</b>']),
 ('Elo (human and GPT-4): Guanaco 65B/33B rank behind only GPT-4', R + ', The evaluation: qualified (ChatGPT second on OA; human ranks put 7B third)', ['beat every model but GPT-4', 'puts ChatGPT (1,015) second']),
 ('Data quality beats size: 9k OASST1 > 450k FLAN v2 for chat', R + ', Guanaco', ['OASST1\'s 9k examples beat FLAN v2\'s 450k']),
 ('MMLU and chatbot performance partially orthogonal', R + ', Guanaco', ['strong MMLU performance does not imply strong chatbot performance']),
 ('GPT-4 judge agrees with humans at system level (Spearman 0.55) but noisy, order-sensitive', R + ', The evaluation; tournament tab (recomputed)', ['Spearman r = 0.55', 'favours whichever answer comes first']),
 ('Why it matters: democratised 33B-65B finetuning to one GPU', R + ', Why it matters', ['moved 33B to 65B adaptation from cluster budgets to one GPU']),
 ('1,000-model ablation gave the default PEFT recipe (NF4, DQ, all-layer adapters, paged optimizers)', R + ', Why it matters', ['its large ablation gave the field a default recipe']),
 ('Shipped in bitsandbytes and HF PEFT/transformers (load_in_4bit plus LoRA); the standard open path', R + ', Why it matters; Use it', ['shipped directly into bitsandbytes and Hugging Face transformers and PEFT', 'load_in_4bit=True']),
 ('Axolotl, Llama-Factory, torchtune, Unsloth build on it', R + ', Why it matters (each sourced)', ['Axolotl', 'LLaMA-Factory', 'torchtune', 'Unsloth']),
 ('Small high-quality dataset -> near-SoTA chatbot; early systematic GPT-4-as-judge with honest limits', R + ', Why it matters', ['small, high-quality dataset can produce a near state-of-the-art chatbot', 'honest look at its limits']),
 ('NF4 still the default 4-bit training data type in 2026', R + ', Why it matters and Use it: corrected (recommended for QLoRA; the transformers default is fp4)', ['not the library default', 'the library defaults are']),
 ('Advances since: fused kernels (Unsloth), LoftQ, QA-LoRA, better PTQ for inference', R + ', Why it matters', ['LoftQ', 'QA-LoRA', 'fused kernels (Unsloth)', 'better post-training quantisation']),
 ('Connection LoRA: QLoRA makes the base 4-bit and shows all-layer adapters are needed', R + ', Connections; Further reading', ['making the frozen base 4-bit and showing that all-layer adapters are needed at scale']),
 ('Connection InstructGPT: instruction tuning with supervised finetuning only', R + ', Connections', ['applies with supervised finetuning only']),
 ('Connection DPO: contemporaneous; recipe became QLoRA + DPO', R + ', Connections', ['the common open-source recipe became QLoRA plus DPO']),
 ('Topics: llm-training-and-post-training (PEFT, quantization); evaluation-and-llm-judges (GPT-4 judge, tournaments)', R + ', Connections; Further reading', ['llm-training-and-post-training', 'evaluation-and-llm-judges']),
 ('Database property Takeaway', 'stays in the database; also on the headline card', ['NF4 + double quantization + paged optimizers + all-layer LoRA over a frozen 4-bit base']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:38)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)

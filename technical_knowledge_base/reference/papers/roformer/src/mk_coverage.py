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
 ('Reading time line "10 min read, +~3h 10m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: Su, Lu, Pan, Murtadha, Wen, Liu (Zhuiyi Technology, Shenzhen)', R + ', headline card', ['Jianlin Su, Yu Lu, Shengfeng Pan, Ahmed Murtadha, Bo Wen, Yunfeng Liu', 'Zhuiyi Technology, Shenzhen']),
 ('Date: April 2021 arXiv v1; v5 November 2023; Neurocomputing 2024', R + ', headline card', ['April 2021', 'v5 November 2023', 'Neurocomputing 2024']),
 ('Link arXiv:2104.09864 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2104.09864', '(45 min)']),
 ('Link code ZhuiyiTechnology/roformer (~15 min for the README)', 'card and Further reading', ['https://github.com/ZhuiyiTechnology/roformer', 'about 15 minutes for the README']),
 ('Link HF model doc (~10 min)', 'Further reading, Best resources', ['https://huggingface.co/docs/transformers/model_doc/roformer', '(10 min)']),
 # resources
 ('EleutherAI rotary explainer (~30 min): complex-number view, derivation, code, adoption story (GPT-NeoX, GPT-J)', 'Further reading (title corrected to "A Relative Revolution"); its replication numbers in How much to believe and the Tables tab', ['Rotary Embeddings: A Relative Revolution', 'https://blog.eleuther.ai/rotary-embeddings/', 'early adoption story (GPT-NeoX, GPT-J)']),
 ("Jianlin Su's kexue.fm blog (~30 min), predates the paper, Chinese", 'Further reading', ['https://kexue.fm/archives/8265', 'predates and is more readable than the paper (Chinese)']),
 ('Fleetwood, HF blog: You could have designed state of the art positional encoding (~35 min)', 'Further reading', ['https://huggingface.co/blog/designing-positional-encoding', 'why each design choice is forced']),
 ('labml.ai annotated RoPE (~25 min): elementwise form', 'Further reading', ['https://nn.labml.ai/transformers/rope/index.html', 'line-by-line PyTorch of the efficient elementwise form']),
 # problem
 ('Self-attention is position-agnostic; position must be injected', R + ', Problem', ['Self-attention is position-agnostic', 'position must be injected somewhere']),
 ('Prior schemes additive: absolute learned or sinusoidal added before QKV', R + ', Problem (Eq. 3, 4)', ['Every prior choice is additive', 'learned (one trainable row per position', 'fixed sinusoids of Vaswani et al.']),
 ('Relative schemes (Shaw, Transformer-XL, T5 bias, DeBERTa) edit terms of expanded q^T k', R + ', Problem (Eqs. 5 to 10)', ['Shaw et al.', 'Transformer-XL', 'T5 keeps the content term and adds a trainable bias', 'DeBERTa']),
 ('Problem 1: entangles position with content; attention should see only the relative offset', R + ', Problem', ['position is entangled with content', 'only the relative offset']),
 ('Problem 2: relative variants act on the attention matrix, unusable with linear attention', R + ', Problem; Linear attention', ['they cannot be used with linear attention']),
 ('Gap: inner product depends only on embeddings and m - n, each position encoded independently, which makes KV caching cheap', R + ', Problem', ['an absolute operation per token', 'makes KV caching cheap']),
 # method
 ('Constraint <f_q(x_m,m), f_k(x_n,n)> = g(x_m, x_n, m-n)', R + ', Idea (Eq. 11)', ['Eq. 11', 'Each token is encoded using only its own absolute position']),
 ('2D solution: complex rotation e^{imtheta}; Re[(W_q x_m)(W_k x_n)* e^{i(m-n)theta}]; conjugation makes phases subtract', R + ', Rotation (Eq. 12, 13)', ['e i ( m − n ) θ', 'The conjugation makes the phases subtract']),
 ('§3.4.1: radial part position-independent, angle an arithmetic progression mtheta + gamma; rotation is "the solution"', R + ', Rotation, details block (corrected: the angle is forced, the radius and gamma are choices; the paper itself says "a solution")', ['arithmetic progression', 'a straightforward solution', 'So the angle is forced; the rest are choices']),
 ('General form: d/2 pairs, block-diagonal R, R_m^T R_n = R_{n-m}; q^T k = x^T W_q^T R_{n-m} W_k x', R + ', Rotation (Eqs. 14 to 16)', ['block-diagonal', 'satisfies the constraint exactly']),
 ('Multiplicative into q and k only, values untouched, norms preserved', R + ', Rotation', ['Position enters multiplicatively, into', 'values are untouched, norms are preserved']),
 ('Efficient elementwise cos/sin form with pair-swapped negation (Eq. 34)', R + ', Rotation (Eq. 34); toy models use it', ['two elementwise products', 'Eq. 34']),
 ('Frequency spectrum theta_i = 10000^{-2(i-1)/d}, same as sinusoidal; wavelengths 2pi to ~2pi*10000', R + ', Frequency spectrum; Rotation', ['same geometric spectrum as the original sinusoidal encoding', 'Wavelengths run from 2π', 'about 2π × 10000']),
 ('Fast pairs resolve nearby offsets; slow pairs carry coarse long-range order; the knob for context extension', R + ', Frequency spectrum; dials widget; Then and now', ['Fast pairs resolve nearby offsets sharply', 'carry coarse long-range order', 'knob every later context-extension method turns']),
 ('Long-term decay: Abel summation bound decays with |m-n| (Figure 2); matches linguistic prior; paper\'s explanation for long text', R + ', Long-term decay (Figure 2 recomputed; caveat that it is a bound)', ['Abel summation', 'matches the linguistic prior', 'explanation for its long-text advantage']),
 ('Linear attention: rotate feature-mapped q, k in numerator, denominator unrotated (Eq. 19); first relative PE usable with O(N) attention', R + ', Linear attention (stated as the paper\'s argument); toy test in Train short, test long', ['leave the denominator unrotated', 'relative encoding that works with O(', 'Equation 19']),
 # results
 ('WMT14 En-De 27.5 vs 27.3 transformer-base; a sanity check', R + ', Results; Tables tab', ['27.5 BLEU', 'against 27.3 for Transformer-base', 'A sanity check, not the headline']),
 ('BERT-style pretraining: swapping APE for RoPE gives faster MLM convergence under identical settings', R + ', Results (corrected: BERT\'s positions are learned, not sinusoidal; Figure 3 x-axis contradicts §4.2.2)', ['falls faster than BERT', 'BERT\'s is a learned table']),
 ('GLUE: significantly beats bert-base on 3 of 6 (MRPC 89.5, STS-B 87.0, QQP 86.4)', R + ', Results and How much to believe (corrected: loses the other 3; BERT row is test-server, RoFormer validation)', ['MRPC (89.5 against 88.9)', 'STS-B (87.0 against 85.8)', 'QQP (86.4 against 71.2)', 'GLUE compares validation against test']),
 ('Performer + RoPE on Enwik8, 12-layer char-level: faster convergence, lower loss', R + ', Results; Tables tab Figure 3', ['12-layer character-level Performer', 'Enwik8']),
 ('CAIL2019-SCM: accuracy improves with length cap; RoFormer-1024 69.79% vs WoBERT-512 68.10% (+1.5% absolute)', R + ', Results; How much to believe; Tables tab (corrected: the gap to WoBERT is 1.69; 1.5 is the gap to RoFormer-512; about one standard error)', ['69.79%', '68.10%', '69.79 − 68.10 = 1.69']),
 ('Limitations: modest gains, no theoretical account of faster convergence; decay shared with other schemes yet better on long text', R + ', Results (authors\' own limitations)', ['they cannot explain why RoPE converges faster', 'no faithful explanation of why it does better on long texts']),
 # why it matters
 ('Numbers unremarkable; formulation conquered the field', R + ', Why it matters', ['The paper\'s benchmark numbers were unremarkable; the formulation conquered the field anyway']),
 ('Adopted first by EleutherAI GPT-NeoX and GPT-J (2021), then PaLM and Llama', R + ', Why it matters', ['GPT-J that year', 'GPT-NeoX-20B', 'PaLM', 'LLaMA']),
 ('Default since 2023: Llama 1-3, Mistral/Mixtral, Qwen, DeepSeek, Gemma, GPT-OSS', R + ', Why it matters', ['Llama 1 to 3, Mistral and Mixtral, Qwen, DeepSeek, Gemma, gpt-oss']),
 ('Properties that won: exact relative + per-token absolute (cached keys rotated once), zero params, norm preservation, every layer', R + ', Why it matters', ['each cached key is rotated once, at cache time', 'zero parameters, norm preservation, and applicability at every layer']),
 ('Base frequency scaling: Llama 3 500,000; 1M common', R + ', Why it matters; Then and now', ['Llama 3 uses 500,000', '1,000,000 is common']),
 ('Position Interpolation (Meta 2023): m * L_train/L_target; small fine-tune', R + ', Why it matters; Then and now; toy PI test', ['Position Interpolation', 'within 1,000 fine-tuning steps']),
 ('NTK-aware / dynamic NTK: rescale the base; high-frequency dims interpolated less', R + ', Why it matters; Then and now', ['NTK-aware and dynamic NTK scaling', 'high-frequency pairs (local resolution) are interpolated less']),
 ('YaRN: NTK-by-parts plus temperature; standard for 128k+ models incl. DeepSeek', R + ', Why it matters; Then and now', ['NTK-by-parts', 'DeepSeek-V3\'s extension']),
 ('Partial and interleaved RoPE: GPT-NeoX rotary_pct; DeepSeek MLA decoupled RoPE key; Llama 4 iRoPE; Qwen2-VL M-RoPE', R + ', Why it matters; Then and now', ['rotary_pct', 'decoupled RoPE key', 'iRoPE', 'M-RoPE']),
 ('2D-pair rotation became a standard reasoning tool (attention sinks, length generalisation)', R + ', Why it matters', ['attention-sink analyses, length-generalisation theory']),
 # connections
 ('Attention Is All You Need: additive sinusoidal encoding whose spectrum RoPE reuses', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'whose frequency spectrum RoPE reuses multiplicatively']),
 ('BERT: pretraining baseline', 'Connections; Further reading', ['3c65c17b0d0d81e5ad9bd09cbf18ad7c', 'swaps its absolute position embedding out of']),
 ('Llama 3: base 500k plus staged long-context extension', 'Connections; Further reading', ['3c65c17b0d0d81aca58ccb9d720b474e', 'staged long-context extension']),
 ('DeepSeek-V3: MLA decoupled RoPE keys', 'Connections; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'reconciles RoPE with latent KV compression']),
 ('Mixtral: representative RoPE open-weight architecture', 'Connections; Further reading', ['3c65c17b0d0d81eba72af0ac91ddc6b3', 'representative RoPE-based open-weight architecture']),
 ('Topics: llm-training-and-post-training (positional encodings, long-context), llms (architecture gallery)', 'Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d812d9e00f6ec89965286']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Rotate each query/key 2D pair by a position-proportional angle']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:35)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)

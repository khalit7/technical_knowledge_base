"""Labels and keys for src/ledger.json (2026-10-24 rebuild). Run from the repo root: python3 <page>/src/ledger_labels.py"""
import json, pathlib
F = pathlib.Path(__file__).with_name('ledger.json')
C, D, FAT = 'core', 'depth', 'fat'
OWN = 'owned:models_and_training/topic_llm_architecture/normalisation_residuals_and_stability'
L = {
1: (C, 'feature scaling, initialisation schemes'), 2: (C, 'checked against torch.nn'), 3: (C, 'Data as of October 2026'),
4: (FAT, '', 'old reading-time line and tab names'), 5: (FAT, '', 'old section nav'),
6: (C, 'scale of the signal'), 7: (FAT, '', 'restated by the core sentence'), 8: (C, 'fixes the inputs once'),
9: (C, 'neither shrink nor grow the signal at step zero'), 10: (C, 'barely cares about its initialisation'),
11: (D, 'Every tool on one table'), 12: (FAT, '', 'wind-up'), 13: (C, 'Normalisation, residuals and stability'),
14: (D, 'illustrative seeded toy inputs'), 15: (D, 'Everything else carries its source link'),
16: (FAT, '', 'heading'), 17: (C, 'outvotes one measured in fractions'), 18: (C, 'narrow ravine'), 19: (C, 'Tree models split one feature'),
20: (C, 'fitted on the training set only'), 21: (C, 'in raw units proline decides alone'), 22: (C, '278 to 1,680 mg/L'),
23: (C, '20 nearest training wines'), 24: (C, 'Switch to min-max to compare'), 25: (C, 'random_state=42'), 26: (C, '75.93% raw'),
27: (C, '98.15% min-max'), 28: (C, '1.6 × 10 8 raw, 690 min-max'), 29: (C, '35.19%'), 30: (C, 'refits the PCA'), 31: (C, '74.07%'), 32: (C, 'not 61'),
33: (C, 'which numbers share one μ and σ'), 34: (C, 'Figure 2 of the GroupNorm paper'), 35: (C, 'everything outlined shares its statistics'),
36: (C, 'ringed in orange'), 37: (C, 'Only BatchNorm lets one example change'), 38: (C, 'a scale per example'), 39: (C, 'InstanceNorm2d to 10 −14'),
40: (C, 'one group is LayerNorm'), 41: (C, 'padding included'), 42: (C, 'That independence is why transformers use them'),
43: (D, 'G = 32 in the paper'), 44: (C, 'feature scaling per layer, over the batch'), 45: (C, 'in a CNN, across the pixels too'),
46: (C, 'x̂ = (x − μ B ) / √(σ B ² + ε)'), 47: (C, 'one γ and one β per feature'), 48: (C, 'running averages of μ and σ² with a momentum'),
49: (C, 'the layer uses the running averages'), 50: (C, '§3.1, Algorithm 2'), 51: (C, 'folded into the preceding convolution'),
52: (D, 'momentum" conventions are opposite'), 53: (D, 'is different from one used in optimizer classes'), 54: (D, 'default momentum 0.99'),
55: (D, 'keeps only 10%'), 56: (D, 'stores the unbiased one'), 57: (D, 'immediately before the nonlinearity'), 58: (D, '14 times fewer training steps'),
59: (C, 'meets one test batch at inference'), 60: (C, 'Switch to batch size 2, then to LayerNorm'), 61: (C, 'true means 5, −1, 0, 2'),
62: (C, 'running variance at 1'), 63: (C, 'match torch.nn.BatchNorm1d to 10 −14'), 64: (FAT, '', 'heading'), 65: (C, '±d/2'),
66: (C, 'passes on only which value was larger'), 67: (C, 'a recalibrated sensor'), 68: (C, 'allow higher learning rates'),
69: (C, '10.6% lower error'), 70: (C, 'little to do with the success of BatchNorm'), 71: (C, 'listed the original claim as an advantage'),
72: (C, 'Batch Renormalization'), 73: (C, 'normalises each example (each token'), 74: (C, "fixes BatchNorm's three weaknesses"),
75: (C, 'mild regularising noise of batch statistics'), 76: (C, "the 2017 transformer's norm"), 77: (C, 'half the reductions'),
78: (C, '7%~64%'), 79: (C, 'rms_norm_eps'), 80: (C, "leaves each token's mean in place"), 81: (C, 'bounds the output when the input is nearly constant'),
82: (C, '10 −12'), 83: (C, 'statistics in float32'), 84: (D, 'Dynamic Tanh'), 85: (D, 'computes no statistics at all'), 86: (D, 'not yet shown'),
87: (OWN, 'Where the norm goes: post, pre, sandwich, output norm'), 88: (C, 'sections 2 and 6'), 89: (FAT, '', 'wind-up'), 90: (FAT, '', 'heading'),
91: (D, 'practically helpful for avoiding this problem'), 92: (D, 'O(d√(ln d / L))'), 93: (C, '(1 + 3l/2)d'), 94: (D, 'climbs the residual stream block by block'),
95: (D, 'raise the depth'), 96: (D, 'W Q = W K = 0'), 97: (D, '3 × 10 −15 over 24 configurations'), 98: (D, 'Defaults reproduce Lemma 2'),
99: (D, '13.1d at l = 12'), 100: (FAT, '', 'heading'), 101: (D, '3.2 at L = 48'), 102: (D, '1.04, 0.67, 0.53, 0.40'), 103: (D, '√97 = 9.8'),
104: (D, 'Wang et al. 2022'), 105: (D, '×1,041'), 106: (FAT, '', 'heading'), 107: (D, 'a 64-wide toy at initialisation cannot reproduce'),
108: (D, 'Stability explorer'), 109: (OWN, 'Attention-logit growth: QK-norm, soft-capping, qk-clip'),
110: (OWN, 'qk-clip'), 111: (C, 'Two measurements of released models live here'), 112: (FAT, '', 'heading'),
113: (D, 'a logit is at most √d h'), 114: (D, 'RoPE only rotates'), 115: (D, '145-token English passage'), 116: (D, 'q_norm.weight'),
117: (D, '184 to 12,897'), 118: (D, 'd h -sized gain vector'), 119: (D, 'not a claim from the papers'),
120: (C, 'symmetry problem'), 121: (FAT, '', 'wind-up'), 122: (C, 'E[x next ²] = c · n in · Var(w) · E[x²]'), 123: (C, 'their Eq. 16'),
124: (D, 'it is sufficient to use either'), 125: (C, 'Keep the variance constant'), 126: (C, 'activations themselves are on'),
127: (C, 'Set the fan-in and fan-out'), 128: (C, 'how much one layer multiplies the second moment'), 129: (C, 'within a factor 10 after L layers'),
130: (C, 'uniform bound = √(3 Var)'), 131: (C, 'Defaults reproduce PyTorch, independently'), 132: (C, 'kaiming_uniform_(a=√5)'),
133: (C, 'commonly used heuristic'), 134: (C, '1.7 × 10 −16 after 20 layers'), 135: (C, 'kaiming_normal_ explicitly'), 136: (C, 'Embeddings default to N(0, 1)'),
137: (C, 'treats one layer at a time'), 138: (C, 'grows with the number of additions'), 139: (C, '0.00408'), 140: (C, 'with 10,000 layers'),
141: (C, '1.64 at d = 4,096'), 142: (C, 'every branch input is re-normalised'), 143: (C, '0.0417 = 1/√576'), 144: (C, "gives each lab's stated scheme"),
145: (C, 'hyperparameters tuned on a small model do not transfer'), 146: (C, 'Maximal Update Parametrization'),
147: (C, 'each layer is updated on the same order'), 148: (D, 'attention uses 1/d instead of 1/√d'), 149: (C, 'tuning cost only 7%'),
150: (D, 'OLMo 2 §3.2'), 151: (D, 'The released models measured on this page'), 152: (D, 'Gemma 2: soft-cap'),
153: (OWN, 'RMSNorm everywhere'), 154: (D, 'Fitting the scaler on all the data'), 155: (D, '75.9% against 94.4%'),
156: (D, 'Evaluating a BatchNorm network in training mode'), 157: (D, 'recompute running statistics after fine-tuning'),
158: (D, 'mean the same thing from opposite sides'), 159: (D, "Calling OLMo 2's or Gemma's norm"), 160: (D, 'the 2017 post-norm normalises the stream itself'),
161: (D, 'do not assume a √d h bound'), 162: (D, 'ceilings run from 184 to 12,897'), 163: (D, 'Assuming PyTorch layers are He-initialised'),
164: (D, '7.8 × 10 −7 after 20 layers'), 165: (D, 'Using Xavier with ReLU, or He with tanh'), 166: (D, 'Reading σ = 0.02 as a variance-preserving init'),
167: (D, 'Debugging training'), 168: (D, 'last edited 22 September 2026'), 169: (D, 'src/real/real_streams.py'),
170: (FAT, '', 'old tab heading'), 171: (FAT, '', 'old tab wind-up'), 172: (D, 'that page links to them'),
173: (D, "Swept over depth"), 174: (D, 'The dashed line is 1/√L'), 175: (D, 'hover or tap a point'), 176: (D, 'L = 3, 6, 12, 24 and 48'),
177: (D, 'match PyTorch autograd'), 178: (D, 'hide models with their buttons'), 179: (D, "depth as a fraction of each model's layers"),
180: (D, '0.94 to 1.62'), 181: (D, '×531'), 182: (D, 'final norm before the output head'), 183: (D, 'Peri-norm does not stop the growth'),
184: (D, 'typical RMS of 1,073'), 185: (D, 'largest first-token RMS 0.7'), 186: (D, '4,119'), 187: (D, 'excluded from the medians'),
188: (D, 'BERT 31, GPT-2 42, Qwen3 48'), 189: (D, 'not a controlled comparison of placements'),
190: (FAT, '', 'card for the removed Depth and placement tab'), 191: (C, 'five 16-layer networks'), 192: (C, 'Keep the variance constant'),
193: (C, 'swap the init and the norm'), 194: (C, 'standard deviation for 21 models'), 195: (C, 'replaced the "Debugging training" page'),
196: (C, 'why the activation dictates the init scheme'), 197: (C, "Adam's early steps"), 198: (C, 'Weight decay, dropout'),
199: (C, 'feature scaling matters'), 200: (C, 'The owner of the transformer side'), 201: (C, 'N(0, 0.02) init'), 202: (C, 'Then and now'),
203: (C, '1/√(2N) residual init'), 204: (C, 'QK-Norm replacing the QKV bias'), 205: (C, 'MuonClip'), 206: (C, 'where open models put their norms'),
207: (C, 'training and inference algorithms'), 208: (C, 'The batch-independent alternative'), 209: (C, 'The LLM-era default norm'),
210: (C, 'Delving Deep into Rectifiers'), 211: (C, 'derived alongside PReLU'), 212: (C, 'Xavier initialisation. '), 213: (C, 'On Layer Normalization in the Transformer Architecture'),
214: (C, 'the toy on this page is their model'), 215: (C, "four norms' axes"), 216: (C, 'How Does Batch Normalization Help Optimization?'),
217: (C, 'The case against internal covariate shift'), 218: (C, 'Tensor Programs V'), 219: (C, 'scaled together with width'), 220: (C, 'mind the shared PCA object'),
}
units = json.loads(F.read_text())
units = [u for u in units if u['id'] <= 220]
for u in units:
    v = L[u['id']]
    u['label'], u['key'] = v[0], v[1].strip()
    u['where'] = ''
    if v[0] == 'fat': u['note'] = v[2]
# units added in the 2026-10-24 rebuild (new content; they live here)
new = [
 ('hero', 'measured mean square after 20 ReLU layers, one line per init, LayerNorm line flat at 0.51', 'stays at 0.51'),
 ('hero', 'N(0, 0.02) at width 512: factor 0.101 per layer, 1.3e-20 after 20', '0.101 with a fixed N(0, 0.02)'),
 ('hero', 'orthogonal gain sqrt 2 in the ReLU stack: 1.015 per layer, 1.32 after 20', '1.015 with orthogonal weights'),
 ('2 · initialisation', 'He factor 1 derived on the hero network: n_in 512, Var 2/512', 'Var(y) = 2 E[x²]'),
 ('2 · initialisation', 'orthogonal init: all singular values 1; Gaussian 20-layer linear product median 9.2e-4, max 6.4, mean square 0.94', '9.2 × 10 −4'),
 ('2 · initialisation', 'Saxe, McClelland and Ganguli 2013: orthogonal init gives depth-independent learning times (paraphrase)', 'Saxe, McClelland and Ganguli 2013'),
 ('2 · initialisation', 'orthogonal init is the standard for recurrent weight matrices', 'standard init for recurrent weight matrices'),
 ('4 · batchnorm', 'Weight standardisation: per-filter z-score of the weights, paired with GroupNorm for micro-batch training (Qiao et al. 2019, paraphrase)', 'Weight standardisation'),
 ('6 · depth', 'Fixup as the hero from the other side: the norm is optional when the scale is right', 'the norm is optional'),
]
n = 220
for sec, text, key in new:
    n += 1; units.append({'id': n, 'tab': 't-read', 'section': sec, 'text': text, 'label': 'core', 'key': key, 'where': '', 'note': 'added 2026-10-24'})
F.write_text(json.dumps(units, indent=1, ensure_ascii=False) + '\n')
print(len(units), 'units')

#!/usr/bin/env python3
"""Authoring source for data/defaults.json (tab t-defaults, "Defaults across models").

Run: python3 src/defaults/rows.py   (writes ../data/defaults.json), then python3 src/defaults/mk_defaults.py.

Every cell is c(value, kind, source, ...). Kinds:
  pub  stated by the paper, report, official code or official config (the source says which)
  der  computed here from published inputs; f gives the formula (recompute.py checks it)
  inh  the paper says it follows a named predecessor; the value is the predecessor's, with its source
  unc  unconfirmed: only a community mirror, a code default, or a figure that disagrees with the text
  nd   not disclosed by the maker
  na   does not apply to this model (a convnet has no FFN)
fam groups a value into the family the "flip" timeline and the recipe morph use (our grouping, not the labs').
Sources were read on 2026-10-03; small extracts are in src/defaults/inputs/.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'data', 'defaults.json')
READ = '2026-10-03'


def c(v, k, s=None, q=None, note=None, n=None, f=None, fam=None):
    x = {'v': v, 'kind': k}
    if s:
        x['src'], x['sl'], x['sd'] = s
    for key, val in (('q', q), ('note', note), ('n', n), ('f', f), ('fam', fam)):
        if val is not None:
            x[key] = val
    return x


def S(url, label, date):
    return (url, label, date)


N = 'https://app.notion.com/p/'
PAGES = {
    'act': ('Activations', '3c65c17b0d0d819f8049c255e6f206e2', 'Activations page'),
    'norm': ('Normalisation and initialisation', '3c65c17b0d0d81369e1cc38ed4e11d48', 'Norm and init page'),
    'opt': ('Optimisers', '3c65c17b0d0d817080bbc90954681d09', 'Optimisers page'),
    'reg': ('Regularisation', '3c65c17b0d0d81e988b5c3cb5e197f98', 'Regularisation page'),
    'loss': ('Loss functions', '3c65c17b0d0d8161a72bc8c572f37d55', 'Loss functions page'),
    'prec': ('Quantization and Precision', '3c65c17b0d0d817b8f41ff66fba4cd0e', 'Precision page'),
}

COLUMNS = [
    ('act', 'Activation', 'Function', 'act', 'cat', 'The nonlinearity in the feed-forward block (or after each convolution). GLU variants (GeGLU, SwiGLU) multiply two projections, so they use three matrices instead of two.'),
    ('ffn', 'Activation', 'FFN width', 'act', 'num', 'Hidden width of the feed-forward block divided by the model width d. For GLU variants the width of one of the two parallel projections. Sorts by the ratio.'),
    ('norm', 'Normalisation', 'Type', 'norm', 'cat', 'Which normalisation layer: local response normalisation (LRN), BatchNorm, LayerNorm, or RMSNorm (no mean subtraction, no bias).'),
    ('place', 'Normalisation', 'Placement', 'norm', 'cat', 'Post-LN normalises after the residual add; pre-LN normalises the input of each sub-block; OLMo 2 normalises the output of the branch before the add; Gemma does both.'),
    ('neps', 'Normalisation', 'Epsilon', 'norm', 'num', 'The constant added inside the square root. Sorts by value.'),
    ('init', 'Initialisation', 'Scheme', 'norm', 'cat', 'How weights are drawn before step one.'),
    ('istd', 'Initialisation', 'Std', 'norm', 'num', 'Standard deviation of the base weight distribution, where one number describes it. Sorts by value.'),
    ('opt', 'Optimiser', 'Type', 'opt', 'cat', 'SGD with momentum, Adam, Adam with decoupled weight decay (AdamW), Adafactor, or Muon.'),
    ('betas', 'Optimiser', 'Betas or momentum', 'opt', 'num', 'Adam beta1 and beta2, or the SGD momentum. Sorts by beta2 (or momentum).'),
    ('oeps', 'Optimiser', 'Epsilon', 'opt', 'num', "Adam's epsilon in the denominator. Sorts by value."),
    ('lr', 'Learning rate', 'Peak', 'opt', 'num', 'Maximum learning rate of the main pretraining run. Not comparable across optimisers or batch sizes; shown for the record. Sorts by value.'),
    ('warm', 'Learning rate', 'Warmup', 'opt', 'cat', 'How the learning rate starts.'),
    ('sched', 'Learning rate', 'Decay shape', 'opt', 'cat', 'Step drops, inverse square root, linear, cosine, or warmup-stable-decay (WSD).'),
    ('fin', 'Learning rate', 'Final', 'opt', 'num', 'Final learning rate as a percentage of the peak. Sorts by value.'),
    ('wd', 'Regularisation', 'Weight decay', 'reg', 'num', 'Coefficient and whether it is coupled (added to the gradient, L2) or decoupled (applied to the weights directly, AdamW). Sorts by value.'),
    ('drop', 'Regularisation', 'Dropout', 'reg', 'num', 'Dropout probability during pretraining. Sorts by value.'),
    ('clip', 'Stability', 'Grad clipping', 'opt', 'num', 'Global gradient-norm clipping threshold. Sorts by value.'),
    ('loss', 'Stability', 'Loss tweaks', 'loss', 'cat', 'Anything added to plain cross-entropy: label smoothing, z-loss, auxiliary balance or multi-token losses, distillation targets, a learned temperature.'),
    ('batch', 'Scale', 'Batch size', 'opt', 'num', 'Global batch in examples or tokens. Sorts by tokens where tokens apply, else by examples.'),
    ('prec', 'Scale', 'Precision', 'prec', 'cat', 'Number formats used for training compute and for the master weights.'),
]

SHORT = {'act': 'Activation', 'ffn': 'FFN width', 'norm': 'Norm type', 'place': 'Norm placement', 'neps': 'Norm epsilon',
         'init': 'Init scheme', 'istd': 'Init std', 'opt': 'Optimiser', 'betas': 'Betas', 'oeps': 'Adam epsilon', 'lr': 'Peak LR',
         'warm': 'Warmup', 'sched': 'LR decay shape', 'fin': 'Final LR', 'wd': 'Weight decay', 'drop': 'Dropout',
         'clip': 'Grad clipping', 'loss': 'Loss tweaks', 'batch': 'Batch size', 'prec': 'Precision'}

ROWS = []


def row(id, model, lab, date, era, arch, report, page, cells, note=None):
    r = {'id': id, 'model': model, 'lab': lab, 'date': date, 'era': era, 'arch': arch,
         'report': {'title': report[0], 'url': report[1], 'date': report[2]}, 'page': page, 'cells': cells}
    if note:
        r['note'] = note
    ROWS.append(r)


# ---------------------------------------------------------------- AlexNet
A = 'https://papers.nips.cc/paper_files/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf'
a3 = S(A, 'AlexNet paper, section 3', '2012-12-03')
a4 = S(A, 'AlexNet paper, section 4.2', '2012-12-03')
a5 = S(A, 'AlexNet paper, section 5', '2012-12-03')
row('alexnet', 'AlexNet', 'U. Toronto', '2012-12-03', 'cnn', 'Convnet, 60M parameters, 8 layers',
    ('ImageNet Classification with Deep Convolutional Neural Networks', A, '2012-12-03'), None, {
    'act': c('ReLU', 'pub', a3, q='Rectified Linear Units (ReLUs)', fam='relu', note='Section 3.1: a 4-layer convnet with ReLUs reached 25% training error on CIFAR-10 six times faster than with tanh.'),
    'ffn': c('n/a (convnet)', 'na', note='The two fully connected layers are 4096 wide, but there is no residual FFN block to compare.'),
    'norm': c('Local response norm', 'pub', a3, q='we used k = 2, n = 5, alpha = 10^-4, and beta = 0.75', fam='lrn', note='Applied after the ReLU in the first two convolutional layers. It reduced top-1 error by 1.4%. BatchNorm did not exist yet.'),
    'place': c('After ReLU, layers 1 and 2', 'pub', a3, fam='conv'),
    'neps': c('k = 2 (LRN offset)', 'pub', a3, n=2, note='LRN adds k = 2 to the sum of squares before raising it to beta = 0.75; it plays the role epsilon plays in later norms, at a far larger value.'),
    'init': c('Gaussian, biases 1 or 0', 'pub', a5, q='zero-mean Gaussian distribution with standard deviation 0.01', note='Biases of conv layers 2, 4, 5 and the hidden FC layers set to 1 so the ReLUs start with positive inputs; others 0.'),
    'istd': c('0.01', 'pub', a5, n=0.01),
    'opt': c('SGD + momentum', 'pub', a5, fam='sgd'),
    'betas': c('momentum 0.9', 'pub', a5, n=0.9),
    'oeps': c('n/a (SGD)', 'na'),
    'lr': c('0.01', 'pub', a5, n=0.01, q='The learning rate was initialized at 0.01'),
    'warm': c('none', 'pub', a5, note='No warmup: the rate started at 0.01.'),
    'sched': c('Step: divide by 10 on plateau', 'pub', a5, fam='step', q='divide the learning rate by 10 when the validation error rate stopped improving', note='Adjusted by hand, three times, over about 90 epochs.'),
    'fin': c('0.1%', 'der', a5, n=0.1, f='0.01 / 10^3 = 1e-5, 0.1% of the peak', note='Reduced three times prior to termination.'),
    'wd': c('0.0005, coupled', 'pub', a5, n=0.0005, q='v := 0.9 v - 0.0005 eps w - eps dL/dw', note='The update rule puts the decay inside the momentum buffer, scaled by the learning rate: classic L2. The paper adds that it "reduces the model\'s training error", so it is not merely a regulariser.'),
    'drop': c('0.5 (first two FC layers)', 'pub', a4, n=0.5, note='Without dropout the network overfit substantially; dropout roughly doubled the iterations to converge.'),
    'clip': c('none stated', 'nd'),
    'loss': c('none (softmax cross-entropy)', 'nd', note='The paper describes no label smoothing or other term; data augmentation (crops, flips, PCA colour noise) carried the regularisation.'),
    'batch': c('128 images', 'pub', a5, n=128),
    'prec': c('FP32 (not stated)', 'nd', note='Two GTX 580 3GB GPUs, five to six days. The paper does not name a number format; the GTX 580 had no fast half precision.'),
})

# ---------------------------------------------------------------- ResNet-50
R = 'https://arxiv.org/html/1512.03385v1'
r34 = S(R + '#S3.SS4', 'ResNet paper, section 3.4', '2015-12-10')
r42 = S(R + '#S4.SS2', 'ResNet paper, section 4.2 (CIFAR-10)', '2015-12-10')
row('resnet50', 'ResNet-50', 'Microsoft Research', '2015-12-10', 'cnn', 'Residual convnet, 25.6M parameters',
    ('Deep Residual Learning for Image Recognition', 'https://arxiv.org/abs/1512.03385', '2015-12-10'), None, {
    'act': c('ReLU', 'pub', S(R + '#S3.SS2', 'ResNet paper, section 3.2', '2015-12-10'), fam='relu'),
    'ffn': c('n/a (convnet)', 'na', note='Bottleneck blocks go 1x1 down to a quarter of the width, 3x3, then 1x1 back up (64, 64, 256 in the first stage).'),
    'norm': c('BatchNorm', 'pub', r34, fam='bn', q='We adopt batch normalization (BN) right after each convolution and before activation'),
    'place': c('After each conv, before ReLU', 'pub', r34, fam='conv'),
    'neps': c('not stated', 'nd', note='The paper gives no epsilon. Caffe, the framework of the released models, defaults to 1e-5; that is a framework default, not a statement.'),
    'init': c('He (Kaiming) normal', 'pub', r34, q='We initialize the weights as in [13]', note='[13] is He et al. 2015, "Delving Deep into Rectifiers": std = sqrt(2 / fan_in), derived for ReLU.'),
    'istd': c('sqrt(2 / fan_in)', 'pub', r34, note='Depends on the layer, so it sorts with the undisclosed. For a 3x3 conv with 64 inputs: sqrt(2/576) = 0.059.'),
    'opt': c('SGD + momentum', 'pub', r34, fam='sgd'),
    'betas': c('momentum 0.9', 'pub', r34, n=0.9),
    'oeps': c('n/a (SGD)', 'na'),
    'lr': c('0.1', 'pub', r34, n=0.1, q='The learning rate starts from 0.1 and is divided by 10 when the error plateaus'),
    'warm': c('none (ImageNet)', 'pub', r34, note='But the 110-layer CIFAR-10 net used 0.01 until training error fell below 80% (about 400 iterations), then 0.1: a warmup, two years before the Transformer\'s.'),
    'sched': c('Step: divide by 10 on plateau', 'pub', r34, fam='step', note='Up to 600,000 iterations. On CIFAR-10 the drops were fixed at 32k and 48k iterations.'),
    'fin': c('not stated', 'nd', note='The number of drops on ImageNet is not given.'),
    'wd': c('0.0001, coupled', 'pub', r34, n=0.0001, note='SGD weight decay in Caffe adds wd x w to the gradient: L2.'),
    'drop': c('none', 'pub', r34, n=0, q='We do not use dropout, following the practice in [16]', note='[16] is the BatchNorm paper, which found BN made dropout unnecessary.'),
    'clip': c('none stated', 'nd'),
    'loss': c('none stated', 'nd', note='Plain softmax cross-entropy; label smoothing arrived with Inception-v3 (Szegedy et al. 2015, December).'),
    'batch': c('256 images', 'pub', r34, n=256),
    'prec': c('FP32 (not stated)', 'nd'),
})

# ---------------------------------------------------------------- Transformer
T = 'https://arxiv.org/html/1706.03762v7'
t31 = S(T + '#S3.SS1', 'Transformer paper, section 3.1', '2017-06-12')
t33 = S(T + '#S3.SS3', 'Transformer paper, section 3.3', '2017-06-12')
t51 = S(T + '#S5.SS1', 'Transformer paper, section 5.1', '2017-06-12')
t53 = S(T + '#S5.SS3', 'Transformer paper, section 5.3', '2017-06-12')
t54 = S(T + '#S5.SS4', 'Transformer paper, section 5.4', '2017-06-12')
row('transformer', 'Transformer (base)', 'Google', '2017-06-12', 'tf', 'Encoder-decoder, 65M parameters',
    ('Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', '2017-06-12'), '3c65c17b0d0d81999af7f16f8ed8ee9e', {
    'act': c('ReLU', 'pub', t33, fam='relu', q='two linear transformations with a ReLU activation in between'),
    'ffn': c('4 x d (2048 / 512)', 'pub', t33, n=4),
    'norm': c('LayerNorm', 'pub', t31, fam='ln'),
    'place': c('Post-LN', 'pub', t31, fam='post', q='LayerNorm(x + Sublayer(x))'),
    'neps': c('not stated', 'nd', note='tensor2tensor, the released code, defaults to 1e-6; the paper gives no value.'),
    'init': c('not stated', 'nd', note='The paper describes no initialisation. Embeddings are multiplied by sqrt(d_model) (section 3.4).'),
    'istd': c('not stated', 'nd'),
    'opt': c('Adam', 'pub', t53, fam='adam'),
    'betas': c('0.9, 0.98', 'pub', t53, n=0.98),
    'oeps': c('1e-9', 'pub', t53, n=1e-9),
    'lr': c('7.0e-4 (formula)', 'der', t53, n=6.99e-4, f='d^-0.5 x warmup^-0.5 = 512^-0.5 x 4000^-0.5 = 6.99e-4 at step 4,000', note='The paper never prints a peak: it gives a formula. For the big model (d = 1024) the same formula peaks at 4.94e-4.'),
    'warm': c('4,000 steps, linear', 'pub', t53, q='We used warmup_steps = 4000'),
    'sched': c('Inverse square root', 'pub', t53, fam='invsqrt', q='decreasing it thereafter proportionally to the inverse square root of the step number'),
    'fin': c('20% at 100k steps', 'der', t53, n=20, f='sqrt(4000 / 100000) = 0.20 of the peak at the last of 100,000 steps', note='Inverse square root never reaches zero; the final fraction depends on how long you train.'),
    'wd': c('none stated', 'nd'),
    'drop': c('0.1', 'pub', t54, n=0.1, note='On each sub-layer output before the residual add, and on the embedding plus position sums. Big EN-DE model: 0.3; big EN-FR: 0.1.'),
    'clip': c('none stated', 'nd'),
    'loss': c('Label smoothing 0.1', 'pub', t54, q='This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.'),
    'batch': c('~25k + 25k tokens', 'pub', t51, n=50000, q='approximately 25000 source tokens and 25000 target tokens'),
    'prec': c('not stated', 'nd', note='Eight P100 GPUs; no number format given.'),
})

# ---------------------------------------------------------------- GPT-1
G1 = 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf'
g1 = S(G1, 'GPT paper, section 4.1', '2018-06-11')
row('gpt1', 'GPT', 'OpenAI', '2018-06-11', 'tf', 'Decoder-only, 117M parameters',
    ('Improving Language Understanding by Generative Pre-Training', G1, '2018-06-11'), None, {
    'act': c('GELU', 'pub', g1, fam='gelu', q='For the activation function, we used the Gaussian Error Linear Unit (GELU)', note='Four months before BERT, which is usually credited with making GELU standard.'),
    'ffn': c('4 x d (3072 / 768)', 'pub', g1, n=4),
    'norm': c('LayerNorm', 'pub', g1, fam='ln'),
    'place': c('Post-LN', 'inh', S(T + '#S3.SS1', 'Transformer paper, section 3.1 (GPT follows its decoder)', '2017-06-12'), fam='post', note='GPT says it largely follows the original Transformer decoder; GPT-2 is the one that moved the norm to the input.'),
    'neps': c('not stated', 'nd'),
    'init': c('N(0, 0.02)', 'pub', g1, q='a simple weight initialization of N(0, 0.02) was sufficient', note='The paper gives layernorm as the reason a simple scheme suffices.'),
    'istd': c('0.02', 'pub', g1, n=0.02),
    'opt': c('Adam + decoupled decay', 'pub', g1, fam='adamw', note='Adam, with "a modified version of L2 regularization proposed in [37]": [37] is Loshchilov and Hutter, the AdamW paper. AdamW in all but name, in 2018.'),
    'betas': c('not stated', 'nd'),
    'oeps': c('not stated', 'nd'),
    'lr': c('2.5e-4', 'pub', g1, n=2.5e-4),
    'warm': c('2,000 updates, linear', 'pub', g1),
    'sched': c('Cosine to 0', 'pub', g1, fam='cosine', q='annealed to 0 using a cosine schedule'),
    'fin': c('0%', 'pub', g1, n=0),
    'wd': c('0.01, decoupled', 'pub', g1, n=0.01, note='w = 0.01 on all non-bias, non-gain weights.'),
    'drop': c('0.1', 'pub', g1, n=0.1, note='Residual, embedding and attention dropout.'),
    'clip': c('not stated', 'nd'),
    'loss': c('none in pretraining', 'pub', g1, note='Fine-tuning adds the language-model loss as an auxiliary objective with weight 0.5.'),
    'batch': c('64 x 512 tokens', 'pub', g1, n=32768, note='32,768 tokens per batch.'),
    'prec': c('not stated', 'nd'),
})

# ---------------------------------------------------------------- BERT
B = 'https://arxiv.org/html/1810.04805v2'
bA = S(B + '#A1.SS2', 'BERT paper, appendix A.2', '2018-10-11')
bopt = S('https://github.com/google-research/bert/blob/master/optimization.py', 'BERT official code, optimization.py', '2018-10-31')
bcfg = S('https://huggingface.co/google-bert/bert-large-uncased/blob/main/config.json', 'bert-large-uncased config.json', '2018-10-31')
row('bert', 'BERT-Large', 'Google', '2018-10-11', 'tf', 'Encoder-only, 340M parameters',
    ('BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding', 'https://arxiv.org/abs/1810.04805', '2018-10-11'), '3c65c17b0d0d81e5ad9bd09cbf18ad7c', {
    'act': c('GELU', 'pub', bA, fam='gelu', q='We use a gelu activation rather than the standard relu, following OpenAI GPT'),
    'ffn': c('4 x d (4096 / 1024)', 'pub', bcfg, n=4),
    'norm': c('LayerNorm', 'pub', bcfg, fam='ln'),
    'place': c('Post-LN', 'pub', S(B + '#S3', 'BERT paper, section 3 (the original Transformer encoder)', '2018-10-11'), fam='post'),
    'neps': c('1e-12', 'pub', bcfg, n=1e-12, note='Smallest epsilon in the table, by six orders of magnitude.'),
    'init': c('Truncated normal', 'pub', bcfg, note='initializer_range 0.02 in the released config; the TF code draws from a truncated normal.'),
    'istd': c('0.02', 'pub', bcfg, n=0.02),
    'opt': c('Adam + decoupled decay', 'pub', bopt, fam='adamw', note='The paper says "Adam ... L2 weight decay of 0.01", but the released AdamWeightDecayOptimizer decays the weights directly, outside m and v: the code comment says adding the square of the weights to the loss "is *not* the correct way" with Adam. It also has no bias correction.'),
    'betas': c('0.9, 0.999', 'pub', bA, n=0.999),
    'oeps': c('1e-6', 'pub', bopt, n=1e-6, note='Not in the paper; set in the released optimiser.'),
    'lr': c('1e-4', 'pub', bA, n=1e-4),
    'warm': c('10,000 steps, linear', 'pub', bA),
    'sched': c('Linear to 0', 'pub', bA, fam='linear', note='polynomial_decay with power 1.0 and end_learning_rate 0.0 in the code.'),
    'fin': c('0%', 'pub', bopt, n=0),
    'wd': c('0.01, decoupled', 'pub', bopt, n=0.01, note='LayerNorm weights and biases are excluded from decay.'),
    'drop': c('0.1', 'pub', bA, n=0.1, q='We use a dropout probability of 0.1 on all layers'),
    'clip': c('1.0 (global norm)', 'pub', bopt, n=1.0, q='This is how the model was pre-trained.', note='Not in the paper; in the released code, commented as the pretraining setting.'),
    'loss': c('MLM + next-sentence loss', 'pub', bA, note='Not a tweak to cross-entropy, but two summed objectives; no label smoothing.'),
    'batch': c('256 x 512 tokens', 'pub', bA, n=131072, q='256 sequences * 512 tokens = 128,000 tokens/batch', note='The paper rounds 131,072 to 128,000. The first 90% of steps used sequences of 128 tokens.'),
    'prec': c('not stated', 'nd', note='Trained on Cloud TPUs; no number format given.'),
})

# ---------------------------------------------------------------- GPT-2
G2 = 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf'
g2 = S(G2, 'GPT-2 paper, section 2.3', '2019-02-14')
g2code = S('https://github.com/openai/gpt-2/blob/master/src/model.py', 'GPT-2 released code, model.py', '2019-02-14')
g1i = S(G1, 'GPT paper, section 4.1 (GPT-2 "largely follows" GPT)', '2018-06-11')
row('gpt2', 'GPT-2 1.5B', 'OpenAI', '2019-02-14', 'tf', 'Decoder-only, 1.5B parameters',
    ('Language Models are Unsupervised Multitask Learners', G2, '2019-02-14'), None, {
    'act': c('GELU (tanh approx.)', 'pub', g2code, fam='gelu', note='0.5 x (1 + tanh(sqrt(2/pi)(x + 0.044715 x^3))) in the released code.'),
    'ffn': c('4 x d (6400 / 1600)', 'pub', g2code, n=4),
    'norm': c('LayerNorm', 'pub', g2, fam='ln'),
    'place': c('Pre-LN + final LN', 'pub', g2, fam='pre', q='Layer normalization was moved to the input of each sub-block, similar to a pre-activation residual network'),
    'neps': c('1e-5', 'pub', g2code, n=1e-5),
    'init': c('Residual layers scaled by 1/sqrt(N)', 'pub', g2, q='We scale the weights of residual layers at initialization by a factor of 1/sqrt(N) where N is the number of residual layers'),
    'istd': c('0.02 base', 'pub', g2code, n=0.02, note='w_init_stdev = 0.02 in the released code; the residual scaling is described in the paper but the released code is inference-only.'),
    'opt': c('Adam + decoupled decay', 'inh', g1i, fam='adamw', note='The GPT-2 paper names no optimiser; it says the model "largely follows the details of the OpenAI GPT model".'),
    'betas': c('not stated', 'nd'),
    'oeps': c('not stated', 'nd'),
    'lr': c('tuned per model, not given', 'nd', q='The learning rate of each model was manually tuned for the best perplexity on a 5% held-out sample of WebText'),
    'warm': c('not stated', 'nd'),
    'sched': c('not stated', 'nd'),
    'fin': c('not stated', 'nd'),
    'wd': c('not stated', 'nd'),
    'drop': c('0.1 (HF config only)', 'unc', S('https://huggingface.co/openai-community/gpt2-xl/blob/main/config.json', 'gpt2-xl config.json (Hugging Face port)', '2019-11-05'), n=0.1, note='resid, embd and attn pdrop 0.1 in the Hugging Face port; neither the paper nor OpenAI\'s code states a training dropout.'),
    'clip': c('not stated', 'nd'),
    'loss': c('none stated', 'nd'),
    'batch': c('512 x 1024 tokens', 'pub', g2, n=524288, q='a larger batchsize of 512 is used'),
    'prec': c('not stated', 'nd'),
})

# ---------------------------------------------------------------- T5
T5 = 'https://arxiv.org/html/1910.10683v4'
t5a = S(T5 + '#S2.SS1', 'T5 paper, section 2.1', '2019-10-23')
t5b = S(T5 + '#S3.SS1.SSS2', 'T5 paper, section 3.1.2', '2019-10-23')
t5m = S(T5 + '#S3.SS1.SSS1', 'T5 paper, section 3.1.1', '2019-10-23')
t5f = S(T5 + '#S3.SS7', 'T5 paper, section 3.7', '2019-10-23')
t5cfg = S('https://huggingface.co/google-t5/t5-11b/blob/main/config.json', 't5-11b config.json', '2019-10-23')
mtf = S('https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/transformer.py', 'Mesh TensorFlow transformer.py (Unitransformer)', '2019-10-23')
row('t5', 'T5-11B', 'Google', '2019-10-23', 'tf', 'Encoder-decoder, 11B parameters',
    ('Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer', 'https://arxiv.org/abs/1910.10683', '2019-10-23'), '3d45c17b0d0d81ec8ebfec02e953a7fd', {
    'act': c('ReLU', 'pub', t5m, fam='relu', note='T5 v1.1 (2020) switched to GeGLU.'),
    'ffn': c('64 x d (65,536 / 1,024)', 'pub', t5cfg, n=64, note='The 11B is wide, not deep: d_model 1,024 with d_ff 65,536 and 128 heads of 128. The base model uses 3072 / 768 = 4x.'),
    'norm': c('RMS-style LayerNorm', 'pub', t5a, fam='rms', q='We use a simplified version of layer normalization where the activations are only rescaled and no additive bias is applied', note='No mean subtraction either in the code: effectively RMSNorm, four years before Llama made the name common.'),
    'place': c('Pre-LN', 'pub', t5a, fam='pre', q='Layer normalization is applied to the input of each subcomponent'),
    'neps': c('1e-6', 'pub', t5cfg, n=1e-6),
    'init': c('not stated', 'nd', note='Mesh TensorFlow defaults; the paper describes none.'),
    'istd': c('not stated', 'nd'),
    'opt': c('Adafactor', 'pub', t5b, fam='adafactor', note='Factored second moments: memory per matrix grows with rows + columns, not rows x columns.'),
    'betas': c('n/a (Adafactor)', 'na', note='Adafactor uses a decay schedule for the second moment and, in T5, no first moment.'),
    'oeps': c('n/a (Adafactor)', 'na'),
    'lr': c('0.01', 'pub', t5b, n=0.01, q='This sets a constant learning rate of 0.01 for the first 10^4 steps'),
    'warm': c('constant for 10^4 steps', 'pub', t5b, note='Not a ramp: 1/sqrt(max(n, k)) is flat at 0.01 for the first k = 10^4 steps.'),
    'sched': c('Inverse square root', 'pub', t5b, fam='invsqrt', note='The paper says the rate then "exponentially decays"; the formula it gives, 1/sqrt(max(n, k)), is an inverse square root.'),
    'fin': c('10% at 1M steps', 'der', t5b, n=10, f='1/sqrt(10^6) / 1/sqrt(10^4) = 0.001 / 0.01 = 10%'),
    'wd': c('none stated', 'nd'),
    'drop': c('0.1', 'pub', t5m, n=0.1, q='we use a dropout probability of 0.1 everywhere dropout is applied in the model', note='T5 v1.1 turned dropout off for pretraining.'),
    'clip': c('not stated', 'nd'),
    'loss': c('z-loss 1e-4 (code default)', 'unc', mtf, note='Mesh TensorFlow\'s Unitransformer, the code T5 trained with, defaults to z_loss = 1e-4 and T5\'s model gin files do not override it; the paper never mentions it. Usually credited to PaLM (2022).'),
    'batch': c('2^11 x 512 tokens', 'pub', t5f, n=1048576, note='About 1M tokens per batch for the final models; the ablation baseline used 128 x 512 = 2^16.'),
    'prec': c('not stated', 'nd', note='TPU v3 pods; no number format given.'),
})

# ---------------------------------------------------------------- GPT-3
G3 = 'https://arxiv.org/html/2005.14165v4'
g3b = S(G3 + '#A2', 'GPT-3 paper, appendix B', '2020-05-28')
g3m = S(G3 + '#S2.SS1', 'GPT-3 paper, section 2.1', '2020-05-28')
g3t = S(G3 + '#S2.T1', 'GPT-3 paper, Table 2.1', '2020-05-28')
g2i = S(G2, 'GPT-2 paper, section 2.3 (GPT-3 uses "the same model and architecture as GPT-2")', '2019-02-14')
row('gpt3', 'GPT-3 175B', 'OpenAI', '2020-05-28', 'tf', 'Decoder-only, 175B parameters',
    ('Language Models are Few-Shot Learners', 'https://arxiv.org/abs/2005.14165', '2020-05-28'), '3c65c17b0d0d8193ac92c7648cfaca12', {
    'act': c('GELU', 'inh', g2i, fam='gelu'),
    'ffn': c('4 x d (49,152 / 12,288)', 'pub', g3t, n=4, note='Table 2.1: "we always have the feedforward layer four times the size of the bottleneck layer".'),
    'norm': c('LayerNorm', 'inh', g2i, fam='ln'),
    'place': c('Pre-LN', 'pub', g3m, fam='pre', q='including the modified initialization, pre-normalization, and reversible tokenization described therein'),
    'neps': c('not stated', 'nd'),
    'init': c('GPT-2 scaled init', 'inh', g2i, note='"the modified initialization" of GPT-2: residual layers scaled by 1/sqrt(N).'),
    'istd': c('not stated', 'nd'),
    'opt': c('Adam + decoupled decay', 'pub', g3b, fam='adamw', note='"Adam" with "weight decay of 0.1", citing [68], Loshchilov and Hutter\'s decoupled weight decay paper.'),
    'betas': c('0.9, 0.95', 'pub', g3b, n=0.95, note='The first row with beta2 = 0.95, now the LLM default.'),
    'oeps': c('1e-8', 'pub', g3b, n=1e-8),
    'lr': c('0.6e-4', 'pub', g3t, n=6e-5),
    'warm': c('375M tokens, linear', 'pub', g3b),
    'sched': c('Cosine to 10%', 'pub', g3b, fam='cosine', q='cosine decay for learning rate down to 10% of its value, over 260 billion tokens'),
    'fin': c('10%', 'pub', g3b, n=10, note='Training continues at 10% after 260B of the 300B tokens.'),
    'wd': c('0.1, decoupled', 'pub', g3b, n=0.1),
    'drop': c('not stated', 'nd'),
    'clip': c('1.0 (global norm)', 'pub', g3b, n=1.0),
    'loss': c('none stated', 'nd'),
    'batch': c('3.2M tokens (ramped)', 'pub', g3t, n=3.2e6, note='Ramped linearly from 32k tokens over the first 4 to 12 billion tokens (appendix B).'),
    'prec': c('half precision (unconfirmed)', 'unc', S(G3, 'GPT-3 paper, author contributions', '2020-05-28'), note='The only statement is in the author contributions: "memory optimizations for fully half-precision training". The paper gives no format for the 175B run.'),
})

# ---------------------------------------------------------------- ViT
V = 'https://arxiv.org/html/2010.11929v2'
v3 = S(V + '#S3.SS1', 'ViT paper, section 3.1', '2020-10-22')
v41 = S(V + '#S4.SS1', 'ViT paper, section 4.1', '2020-10-22')
vT3 = S(V + '#A2.T3', 'ViT paper, Table 3', '2020-10-22')
vcode = S('https://github.com/google-research/vision_transformer/blob/main/vit_jax/models_vit.py', 'ViT official code, models_vit.py', '2020-10-22')
row('vit', 'ViT-H/14 (JFT)', 'Google', '2020-10-22', 'tf', 'Vision Transformer, 632M parameters',
    ('An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale', 'https://arxiv.org/abs/2010.11929', '2020-10-22'), '3c65c17b0d0d811fa231cfcde6c1954d', {
    'act': c('GELU', 'pub', v3, fam='gelu', q='The MLP contains two layers with a GELU non-linearity'),
    'ffn': c('4 x d (5120 / 1280)', 'pub', S(V + '#S4.T1', 'ViT paper, Table 1', '2020-10-22'), n=4),
    'norm': c('LayerNorm', 'pub', v3, fam='ln'),
    'place': c('Pre-LN', 'pub', v3, fam='pre', q='Layernorm (LN) is applied before every block'),
    'neps': c('1e-6', 'pub', vcode, n=1e-6, note='Flax nn.LayerNorm default in the released model code.'),
    'init': c('Xavier uniform, zero head', 'pub', vcode, note='Dense kernels Xavier uniform, biases N(0, 1e-6), position embeddings N(0, 0.02) ("from BERT"), classifier head zero-initialised.'),
    'istd': c('Xavier (fan-based)', 'pub', vcode, note='Xavier uniform depends on fan-in and fan-out, so no single std.'),
    'opt': c('Adam (+ weight decay 0.1)', 'pub', v41, fam='adam', note='The paper says Adam with "a high weight decay of 0.1". Whether it is decoupled is not stated; at 0.1 with Adam it is far too strong to be plain L2, so decoupled is likely, but unconfirmed. Adam also beat SGD for their ResNets (appendix D.1).'),
    'betas': c('0.9, 0.999', 'pub', v41, n=0.999),
    'oeps': c('not stated', 'nd'),
    'lr': c('3e-4', 'pub', vT3, n=3e-4),
    'warm': c('10k steps, linear', 'pub', vT3),
    'sched': c('Linear decay', 'pub', vT3, fam='linear', note='ImageNet-only runs used cosine.'),
    'fin': c('not stated', 'nd', note='Appendix B.1 does not give the end value of the linear decay.'),
    'wd': c('0.1 (coupling unconfirmed)', 'pub', vT3, n=0.1, note='0.03 on ImageNet-21k, 0.3 on ImageNet.'),
    'drop': c('0.0', 'pub', vT3, n=0, note='0.1 on ImageNet and ImageNet-21k, where data is small enough to overfit.'),
    'clip': c('not on JFT', 'pub', vT3, note='Table 3 caption: gradient clipping at global norm 1 only "for ImageNet".'),
    'loss': c('none in pretraining', 'nd', note='Label smoothing is listed only as one of the knobs for the small-data runs (section 4.2).'),
    'batch': c('4096 images', 'pub', vT3, n=4096),
    'prec': c('not stated', 'nd'),
})

# ---------------------------------------------------------------- CLIP
C = 'https://arxiv.org/html/2103.00020v1'
c25 = S(C + '#S2.SS5', 'CLIP paper, section 2.5', '2021-02-26')
cT = S(C + '#A6', 'CLIP paper, Tables 18 and 20', '2021-02-26')
ccode = S('https://github.com/openai/CLIP/blob/main/clip/model.py', 'CLIP official code, model.py', '2021-01-05')
row('clip', 'CLIP ViT-L/14', 'OpenAI', '2021-02-26', 'tf', 'Image and text encoders, 428M parameters',
    ('Learning Transferable Visual Models From Natural Language Supervision', 'https://arxiv.org/abs/2103.00020', '2021-02-26'), '3c65c17b0d0d8194a85dfc5f3bf3f799', {
    'act': c('QuickGELU', 'pub', ccode, fam='gelu', note='x * sigmoid(1.702 x), a cheaper GELU approximation, in the released model code; checkpoints must be run with it.'),
    'ffn': c('4 x d', 'pub', ccode, n=4),
    'norm': c('LayerNorm (fp32)', 'pub', ccode, fam='ln', note='A LayerNorm subclass that computes in fp32 under fp16 training.'),
    'place': c('Pre-LN (+ ln_pre, ln_post)', 'pub', ccode, fam='pre'),
    'neps': c('1e-5', 'pub', S('https://huggingface.co/openai/clip-vit-large-patch14/blob/main/config.json', 'clip-vit-large-patch14 config.json', '2021-01-05'), n=1e-5, note='PyTorch\'s default, which the released code inherits.'),
    'init': c('Width-scaled normal', 'pub', ccode, note='Text transformer: attention std width^-0.5, MLP in (2 width)^-0.5, output projections width^-0.5 x (2 layers)^-0.5; token embedding 0.02, position 0.01.'),
    'istd': c('width^-0.5 (per layer)', 'pub', ccode),
    'opt': c('AdamW', 'pub', c25, fam='adamw', q='Adam optimizer with decoupled weight decay regularization applied to all weights that are not gains or biases'),
    'betas': c('0.9, 0.98', 'pub', cT, n=0.98, note='0.999 for the ResNet image encoders; 0.98 for the ViTs.'),
    'oeps': c('1e-6', 'pub', cT, n=1e-6, note='1e-8 for the ResNets.'),
    'lr': c('4e-4', 'pub', cT, n=4e-4),
    'warm': c('2,000 iterations', 'pub', cT),
    'sched': c('Cosine', 'pub', c25, fam='cosine'),
    'fin': c('not stated', 'nd'),
    'wd': c('0.2, decoupled', 'pub', cT, n=0.2),
    'drop': c('not stated', 'nd'),
    'clip': c('not stated', 'nd'),
    'loss': c('Learned temperature, capped', 'pub', c25, q='initialized to the equivalent of 0.07 ... and clipped to prevent scaling the logits by more than 100', note='Symmetric contrastive cross-entropy; logit_scale starts at ln(1/0.07) = 2.659.'),
    'batch': c('32,768 pairs', 'pub', cT, n=32768),
    'prec': c('Mixed precision (fp16)', 'pub', c25, note='Plus half-precision Adam statistics and half-precision, stochastically rounded text encoder weights.'),
})

# ---------------------------------------------------------------- Chinchilla
CH = 'https://arxiv.org/html/2203.15556v1'
ch41 = S(CH + '#S4.SS1', 'Chinchilla paper, section 4.1', '2022-03-29')
chT = S(CH + '#S4.T4', 'Chinchilla paper, Table 4', '2022-03-29')
chB = S(CH + '#A2', 'Chinchilla paper, appendix B', '2022-03-29')
GO = 'https://arxiv.org/html/2112.11446v2'
go = S(GO + '#S3.SS2', 'Gopher paper, section 3.2 (Chinchilla keeps Gopher\'s setup)', '2021-12-08')
go1 = S(GO + '#S3.SS1', 'Gopher paper, section 3.1 (Chinchilla keeps Gopher\'s architecture)', '2021-12-08')
row('chinchilla', 'Chinchilla 70B', 'DeepMind', '2022-03-29', 'llm', 'Decoder-only, 70B parameters',
    ('Training Compute-Optimal Large Language Models', 'https://arxiv.org/abs/2203.15556', '2022-03-29'), '3c65c17b0d0d8116b7ddffba5c599f3f', {
    'act': c('GELU (via GPT-2)', 'inh', go1, fam='gelu', note='Gopher uses "the autoregressive Transformer architecture detailed in Radford et al. (2019)" with two changes (RMSNorm, relative positions), so the GELU is inherited, not stated.'),
    'ffn': c('4 x d (32,768 / 8,192)', 'pub', chT, n=4),
    'norm': c('RMSNorm', 'inh', go1, fam='rms', q='we use RMSNorm instead of LayerNorm'),
    'place': c('Pre-norm', 'inh', go1, fam='pre'),
    'neps': c('not stated', 'nd'),
    'init': c('not stated', 'nd'),
    'istd': c('not stated', 'nd'),
    'opt': c('AdamW', 'pub', ch41, fam='adamw', q='We use AdamW for Chinchilla rather than Adam', note='Gopher used plain Adam. AdamW only overtook Adam about 80% of the way through the cosine cycle, but ended notably better.'),
    'betas': c('not stated', 'nd'),
    'oeps': c('not stated', 'nd'),
    'lr': c('1e-4', 'pub', chT, n=1e-4),
    'warm': c('1,500 steps', 'inh', go, note='Gopher: from 1e-7 to the maximum over the first 1,500 steps.'),
    'sched': c('Cosine, 10x decay', 'pub', chB, fam='cosine', note='Cycle length matched to the number of training tokens, the finding that underpins the whole paper.'),
    'fin': c('10%', 'pub', chB, n=10),
    'wd': c('not stated (AdamW)', 'nd', note='AdamW is named but its weight decay value is not.'),
    'drop': c('not stated', 'nd'),
    'clip': c('1.0 (global norm)', 'inh', go, n=1.0),
    'loss': c('none stated', 'nd'),
    'batch': c('1.5M to 3M tokens', 'pub', chT, n=3e6, note='Doubled midway through training.'),
    'prec': c('bf16 compute, fp32 master copy', 'pub', ch41, note='Gopher had trained with bf16 parameters and found layers going stale; Chinchilla keeps a float32 copy in the sharded optimiser state.'),
})

# ---------------------------------------------------------------- Llama 1
L1 = 'https://arxiv.org/html/2302.13971v1'
l1a = S(L1 + '#S2.SS2', 'LLaMA paper, section 2.2', '2023-02-27')
l1o = S(L1 + '#S2.SS3', 'LLaMA paper, section 2.3 and Table 2', '2023-02-27')
l1cfg = S('https://huggingface.co/huggyllama/llama-65b/blob/main/config.json', 'llama-65b config.json (community conversion)', '2023-04-05')
row('llama1', 'LLaMA 65B', 'Meta', '2023-02-27', 'llm', 'Decoder-only, 65B parameters',
    ('LLaMA: Open and Efficient Foundation Language Models', 'https://arxiv.org/abs/2302.13971', '2023-02-27'), None, {
    'act': c('SwiGLU', 'pub', l1a, fam='swiglu', q='We replace the ReLU non-linearity by the SwiGLU activation function'),
    'ffn': c('2.69 x d (22,016 / 8,192)', 'der', l1cfg, n=2.6875, f='22,016 / 8,192 = 2.69; the paper says 2/3 x 4d = 2.67d, rounded up to a multiple of 256', note='Three matrices of 2.69d cost the same parameters as two of 4.03d.'),
    'norm': c('RMSNorm', 'pub', l1a, fam='rms'),
    'place': c('Pre-norm', 'pub', l1a, fam='pre', q='we normalize the input of each transformer sub-layer, instead of normalizing the output'),
    'neps': c('1e-5 (community config)', 'unc', l1cfg, n=1e-5, note='Meta\'s own params.json is not public; this is the widely used conversion.'),
    'init': c('not stated', 'nd'),
    'istd': c('not stated', 'nd'),
    'opt': c('AdamW', 'pub', l1o, fam='adamw'),
    'betas': c('0.9, 0.95', 'pub', l1o, n=0.95),
    'oeps': c('not stated', 'nd'),
    'lr': c('1.5e-4', 'pub', l1o, n=1.5e-4),
    'warm': c('2,000 steps', 'pub', l1o),
    'sched': c('Cosine to 10%', 'pub', l1o, fam='cosine'),
    'fin': c('10%', 'pub', l1o, n=10),
    'wd': c('0.1, decoupled', 'pub', l1o, n=0.1),
    'drop': c('not stated', 'nd'),
    'clip': c('1.0', 'pub', l1o, n=1.0),
    'loss': c('none stated', 'nd'),
    'batch': c('4M tokens', 'pub', l1o, n=4e6),
    'prec': c('not stated', 'nd', note='Section 2.4 describes xformers attention and activation checkpointing but no number format.'),
})

# ---------------------------------------------------------------- Llama 2
L2 = 'https://arxiv.org/html/2307.09288v2'
l2 = S(L2 + '#S2.SS2', 'Llama 2 paper, section 2.2 and Table 1', '2023-07-18')
l2cfg = S('https://huggingface.co/NousResearch/Llama-2-70b-hf/blob/main/config.json', 'Llama-2-70b-hf config.json (mirror of the gated Meta repo)', '2023-07-18')
row('llama2', 'Llama 2 70B', 'Meta', '2023-07-18', 'llm', 'Decoder-only, 70B parameters, GQA',
    ('Llama 2: Open Foundation and Fine-Tuned Chat Models', 'https://arxiv.org/abs/2307.09288', '2023-07-18'), None, {
    'act': c('SwiGLU', 'pub', l2, fam='swiglu'),
    'ffn': c('3.5 x d (28,672 / 8,192)', 'der', l2cfg, n=3.5, f='28,672 / 8,192 = 3.5', note='Wider than LLaMA 65B to keep parameters level after GQA shrank the attention.'),
    'norm': c('RMSNorm', 'pub', l2, fam='rms'),
    'place': c('Pre-norm', 'pub', l2, fam='pre'),
    'neps': c('1e-5', 'pub', l2cfg, n=1e-5),
    'init': c('not stated', 'nd'),
    'istd': c('not stated', 'nd'),
    'opt': c('AdamW', 'pub', l2, fam='adamw'),
    'betas': c('0.9, 0.95', 'pub', l2, n=0.95),
    'oeps': c('1e-5', 'pub', l2, n=1e-5, q='beta1 = 0.9, beta2 = 0.95, eps = 10^-5', note='OLMo 2 later found 1e-5 slows early training against PyTorch\'s 1e-8.'),
    'lr': c('1.5e-4', 'pub', l2, n=1.5e-4),
    'warm': c('2,000 steps', 'pub', l2),
    'sched': c('Cosine to 10%', 'pub', l2, fam='cosine'),
    'fin': c('10%', 'pub', l2, n=10),
    'wd': c('0.1, decoupled', 'pub', l2, n=0.1),
    'drop': c('not stated', 'nd', note='attention_dropout 0.0 in the config describes inference, not training.'),
    'clip': c('1.0', 'pub', l2, n=1.0),
    'loss': c('none stated', 'nd'),
    'batch': c('4M tokens', 'pub', l2, n=4e6),
    'prec': c('not stated', 'nd'),
})

# ---------------------------------------------------------------- Mistral 7B
M = 'https://arxiv.org/html/2310.06825v1'
mcfg = S('https://huggingface.co/mistralai/Mistral-7B-v0.1/blob/main/config.json', 'Mistral-7B-v0.1 config.json', '2023-09-27')
mp = S(M, 'Mistral 7B paper (no training section)', '2023-10-10')
nd_m = 'The paper has an architecture section and evaluations, and no training section at all.'
row('mistral7b', 'Mistral 7B', 'Mistral AI', '2023-10-10', 'llm', 'Decoder-only, 7.2B parameters, sliding window',
    ('Mistral 7B', 'https://arxiv.org/abs/2310.06825', '2023-10-10'), None, {
    'act': c('SwiGLU', 'pub', mcfg, fam='swiglu', note='hidden_act silu with gate, up and down projections.'),
    'ffn': c('3.5 x d (14,336 / 4,096)', 'der', mcfg, n=3.5, f='14,336 / 4,096 = 3.5'),
    'norm': c('RMSNorm', 'pub', mcfg, fam='rms'),
    'place': c('Pre-norm', 'pub', mcfg, fam='pre', note='Llama-style blocks per the released reference code.'),
    'neps': c('1e-5', 'pub', mcfg, n=1e-5),
    'init': c('not disclosed', 'nd', note=nd_m),
    'istd': c('not disclosed', 'nd'),
    'opt': c('not disclosed', 'nd', note=nd_m),
    'betas': c('not disclosed', 'nd'),
    'oeps': c('not disclosed', 'nd'),
    'lr': c('not disclosed', 'nd'),
    'warm': c('not disclosed', 'nd'),
    'sched': c('not disclosed', 'nd'),
    'fin': c('not disclosed', 'nd'),
    'wd': c('not disclosed', 'nd'),
    'drop': c('not disclosed', 'nd'),
    'clip': c('not disclosed', 'nd'),
    'loss': c('not disclosed', 'nd'),
    'batch': c('not disclosed', 'nd'),
    'prec': c('not disclosed', 'nd', note='The config\'s torch_dtype bfloat16 is the release format, not a training statement.'),
}, note='Mixtral 8x7B (same lab, December 2023) discloses no training hyperparameters either.')

# ---------------------------------------------------------------- Llama 3.1 405B
L3 = 'https://arxiv.org/html/2407.21783v3'
l3T = S(L3 + '#S3.T3', 'Llama 3 paper, Table 3', '2024-07-23')
l3p = S(L3 + '#S3.SS4.SSS1', 'Llama 3 paper, section 3.4.1', '2024-07-23')
l3a = S(L3 + '#S3.SS4.SSS3', 'Llama 3 paper, section 3.4.3', '2024-07-23')
l3n = S(L3 + '#S3.SS3.SSS2', 'Llama 3 paper, section 3.3.2', '2024-07-23')
l3s = S(L3 + '#S3.SS2.SSS1', 'Llama 3 paper, section 3.2.1 (scaling-law runs)', '2024-07-23')
l3cfg = S('https://huggingface.co/unsloth/Meta-Llama-3.1-405B-bnb-4bit/blob/main/config.json', 'Llama 3.1 405B config.json (mirror of the gated Meta repo)', '2024-07-23')
row('llama3', 'Llama 3.1 405B', 'Meta', '2024-07-23', 'llm', 'Decoder-only, 405B parameters, GQA',
    ('The Llama 3 Herd of Models', 'https://arxiv.org/abs/2407.21783', '2024-07-23'), '3c65c17b0d0d81aca58ccb9d720b474e', {
    'act': c('SwiGLU', 'pub', l3T, fam='swiglu'),
    'ffn': c('3.25 x d (53,248 / 16,384)', 'der', l3T, n=3.25, f='53,248 / 16,384 = 3.25'),
    'norm': c('RMSNorm', 'pub', l3cfg, fam='rms', note='The paper says the architecture "does not deviate significantly from Llama and Llama 2".'),
    'place': c('Pre-norm', 'inh', l2, fam='pre'),
    'neps': c('1e-5', 'pub', l3cfg, n=1e-5),
    'init': c('not stated', 'nd'),
    'istd': c('not stated', 'nd'),
    'opt': c('AdamW', 'pub', l3p, fam='adamw'),
    'betas': c('not stated', 'nd'),
    'oeps': c('not stated', 'nd'),
    'lr': c('8e-5', 'pub', l3p, n=8e-5),
    'warm': c('8,000 steps, linear', 'pub', l3p),
    'sched': c('Cosine to 1%, then linear to 0', 'pub', l3p, fam='cosine', q='a cosine learning rate schedule decaying to 8 x 10^-7 over 1,200,000 steps', note='Then, over the final 40M tokens, "we linearly annealed the learning rate to 0" (section 3.4.3), averaging checkpoints.'),
    'fin': c('0% (1% before annealing)', 'der', l3a, n=0, f='8e-7 / 8e-5 = 1% at the end of cosine; then annealed to 0'),
    'wd': c('not stated for 405B', 'nd', note='The scaling-law runs set weight decay to 0.1 x the learning rate at each step (section 3.2.1); the 405B value is not given.'),
    'drop': c('not stated', 'nd'),
    'clip': c('not stated', 'nd'),
    'loss': c('none stated', 'nd'),
    'batch': c('4M, 8M, then 16M tokens', 'pub', l3p, n=16e6, note='The paper writes "a batch size of 8M sequences of 8,192 tokens"; that would be 65.5 billion tokens per step, 8,192 times too many. It means 8M tokens (the 4M batch doubled).'),
    'prec': c('BF16, FP32 grad accumulation', 'pub', l3n, note='FP32 gradient accumulation across micro-batches and FP32 reduce-scatter in FSDP.'),
})

# ---------------------------------------------------------------- OLMo 2 7B
O = 'https://arxiv.org/html/2501.00656v3'
oT1 = S(O + '#S2.T1', 'OLMo 2 paper, Table 1', '2024-11-26')
oA = S(O + '#S2.SS1', 'OLMo 2 paper, section 2.1', '2024-11-26')
oT3 = S(O + '#S2.T3', 'OLMo 2 paper, Table 3', '2024-11-26')
oI = S(O + '#S3.SS2', 'OLMo 2 paper, section 3.2', '2024-11-26')
oO = S(O + '#S3.SS4', 'OLMo 2 paper, section 3.4', '2024-11-26')
ocfg = S('https://github.com/allenai/OLMo/blob/main/configs/official-1124/OLMo2-7B-stage1.yaml', 'OLMo 2 7B official training config, stage 1', '2024-11-26')
ocfg2 = S('https://github.com/allenai/OLMo/blob/main/configs/official-1124/OLMo2-7B-stage2-seed42.yaml', 'OLMo 2 7B official training config, stage 2', '2024-11-26')
row('olmo2', 'OLMo 2 7B', 'Ai2', '2024-11-26', 'llm', 'Decoder-only, 7.3B parameters',
    ('2 OLMo 2 Furious', 'https://arxiv.org/abs/2501.00656', '2024-11-26'), '3c65c17b0d0d81fb9857fb956165ae1c', {
    'act': c('SwiGLU', 'pub', oT1, fam='swiglu'),
    'ffn': c('2.69 x d (11,008 / 4,096)', 'der', oA, n=2.6875, f='11,008 / 4,096 = 2.69; the paper says about 8/3 d rounded up to a multiple of 128'),
    'norm': c('RMSNorm + QK-norm', 'pub', oT1, fam='rms'),
    'place': c('Branch output (reordered)', 'pub', oA, fam='out', q='We normalize the outputs to the attention and feedforward (MLP) layers within each transformer block, instead of the inputs', note='h = x + RMSNorm(Attention(x)): the norm sits on the branch, after it, and the residual stream itself is never normalised.'),
    'neps': c('1e-6', 'pub', ocfg, n=1e-6),
    'init': c('Truncated normal, all layers', 'pub', oI, note='Every parameter N(0, 0.02) truncated at 3 std; replaced OLMo-0424\'s depth-scaled init, which spiked.'),
    'istd': c('0.02', 'pub', oI, n=0.02),
    'opt': c('AdamW', 'pub', ocfg, fam='adamw'),
    'betas': c('0.9, 0.95', 'pub', ocfg, n=0.95),
    'oeps': c('1e-8', 'pub', oO, n=1e-8, note='Lowered from 1e-5: "lowers and stabilizes the norm of the gradient early in training".'),
    'lr': c('3e-4', 'pub', oT3, n=3e-4),
    'warm': c('2,000 steps', 'pub', oT3, note='8,388,608,000 tokens in the config = 2,000 x 1,024 x 4,096.'),
    'sched': c('Cosine (truncated), then linear to 0', 'pub', oT3, fam='cosine', note='Cosine set for 5T tokens, cut at 4T; mid-training then decays linearly to zero (stage-2 config alpha_f 0).'),
    'fin': c('0%', 'pub', ocfg2, n=0),
    'wd': c('0.1, decoupled, not on embeddings', 'pub', ocfg, n=0.1, note='decay_embeddings false: excluding embeddings from decay was one of the stability changes.'),
    'drop': c('0.0', 'pub', ocfg, n=0),
    'clip': c('1.0', 'pub', oT3, n=1.0),
    'loss': c('z-loss 1e-5', 'pub', oT1, note='auxiliary_loss_multiplier 1e-5 in the config. Penalises log(Z)^2 so output logits do not drift.'),
    'batch': c('1,024 x 4,096 tokens', 'pub', oT3, n=4194304),
    'prec': c('bf16 mixed (amp_bf16)', 'pub', ocfg),
})

# ---------------------------------------------------------------- DeepSeek-V3
D = 'https://arxiv.org/html/2412.19437v2'
dM = S(D + '#S4.SS2', 'DeepSeek-V3 report, section 4.2 (model hyper-parameters)', '2024-12-26')
dT = S(D + '#S4.SS2', 'DeepSeek-V3 report, section 4.2 (training hyper-parameters)', '2024-12-26')
dF = S(D + '#S3.SS3', 'DeepSeek-V3 report, section 3.3', '2024-12-26')
dcfg = S('https://huggingface.co/deepseek-ai/DeepSeek-V3-Base/blob/main/config.json', 'DeepSeek-V3-Base config.json', '2024-12-26')
row('dsv3', 'DeepSeek-V3', 'DeepSeek', '2024-12-26', 'llm', 'MoE decoder, 671B total, 37B active',
    ('DeepSeek-V3 Technical Report', 'https://arxiv.org/abs/2412.19437', '2024-12-26'), '3c65c17b0d0d815fb8dac9ba1e35ab81', {
    'act': c('SwiGLU', 'pub', dcfg, fam='swiglu'),
    'ffn': c('0.29 x d per expert, 9 active', 'der', dM, n=2048 / 7168, f='2,048 / 7,168 = 0.29 per expert; 1 shared + 8 routed = 9 x 2,048 = 18,432 = 2.57 x d active', note='First three layers are dense with 18,432.'),
    'norm': c('RMSNorm (+ on latents)', 'pub', dM, fam='rms', note='Extra RMSNorm layers after the compressed latent vectors of MLA.'),
    'place': c('Pre-norm', 'pub', dcfg, fam='pre'),
    'neps': c('1e-6', 'pub', dcfg, n=1e-6),
    'init': c('Normal, one std', 'pub', dM, q='All learnable parameters are randomly initialized with a standard deviation of 0.006'),
    'istd': c('0.006', 'pub', dM, n=0.006, note='The released config says initializer_range 0.02: config files describe the checkpoint for loading, not the training run.'),
    'opt': c('AdamW', 'pub', dT, fam='adamw'),
    'betas': c('0.9, 0.95', 'pub', dT, n=0.95),
    'oeps': c('not stated', 'nd'),
    'lr': c('2.2e-4', 'pub', dT, n=2.2e-4),
    'warm': c('2K steps, linear', 'pub', dT),
    'sched': c('Constant, cosine, then two steps', 'pub', dT, fam='wsd', note='Constant to 10T tokens, cosine to 2.2e-5 over 4.3T, then 2.2e-5 for 333B and 7.3e-6 for the last 167B. A warmup-stable-decay shape in all but name.'),
    'fin': c('3.3%', 'der', dT, n=3.318, f='7.3e-6 / 2.2e-4 = 3.3%'),
    'wd': c('0.1, decoupled', 'pub', dT, n=0.1),
    'drop': c('not stated', 'nd'),
    'clip': c('1.0', 'pub', dT, n=1.0),
    'loss': c('MTP 0.3 then 0.1; balance 1e-4', 'pub', dT, note='Multi-token prediction loss weight 0.3 for 10T tokens then 0.1; a sequence-wise balance loss with alpha = 0.0001; plus the auxiliary-loss-free bias update (gamma 0.001), which is not a loss.'),
    'batch': c('3,072 to 15,360 x 4K', 'pub', dT, n=15360 * 4096, note='15,360 sequences of 4,096 tokens = 62.9M tokens (derived), reached after 469B tokens.'),
    'prec': c('FP8 GEMMs, BF16/FP32 elsewhere', 'pub', dF, note='First FP8 training validated at this scale; embedding, output head, gating, norms and attention stay in BF16 or FP32; master weights and gradients in FP32, optimiser moments in BF16.'),
})

# ---------------------------------------------------------------- Gemma 3 27B
GE = 'https://arxiv.org/html/2503.19786v1'
geA = S(GE + '#S2', 'Gemma 3 report, section 2', '2025-03-12')
gecfg = S('https://huggingface.co/unsloth/gemma-3-27b-pt/blob/main/config.json', 'gemma-3-27b-pt config.json (mirror of the gated Google repo)', '2025-03-12')
nd_g = 'The report says the pre-training "optimization recipe is similar to Gemma 2", and the Gemma 2 report gives no optimiser settings either.'
row('gemma3', 'Gemma 3 27B', 'Google DeepMind', '2025-03-12', 'llm', 'Decoder-only, 27B parameters, local:global 5:1',
    ('Gemma 3 Technical Report', 'https://arxiv.org/abs/2503.19786', '2025-03-12'), None, {
    'act': c('GeGLU (tanh GELU)', 'pub', gecfg, fam='geglu', note='hidden_activation gelu_pytorch_tanh with a gate.'),
    'ffn': c('4 x d (21,504 / 5,376)', 'der', gecfg, n=4, f='21,504 / 5,376 = 4.0', note='A gated FFN at 4x: 1.5 times the parameters of a plain 4x FFN.'),
    'norm': c('RMSNorm + QK-norm', 'pub', geA, fam='rms', q='we replace the soft-capping of Gemma 2 with QK-norm'),
    'place': c('Pre- and post-norm', 'pub', geA, fam='sandwich', q='with post-norm and pre-norm with RMSNorm'),
    'neps': c('1e-6', 'pub', gecfg, n=1e-6),
    'init': c('not disclosed', 'nd', note=nd_g),
    'istd': c('not disclosed', 'nd'),
    'opt': c('not disclosed', 'nd', note=nd_g),
    'betas': c('not disclosed', 'nd'),
    'oeps': c('not disclosed', 'nd'),
    'lr': c('not disclosed', 'nd'),
    'warm': c('not disclosed', 'nd'),
    'sched': c('not disclosed', 'nd'),
    'fin': c('not disclosed', 'nd'),
    'wd': c('not disclosed', 'nd'),
    'drop': c('not disclosed', 'nd'),
    'clip': c('not disclosed', 'nd'),
    'loss': c('Distillation, 256 sampled logits', 'pub', S(GE + '#S2', 'Gemma 3 report, section 2 (distillation)', '2025-03-12'), q='We sample 256 logits per token, weighted by teacher probabilities', note='Cross-entropy against the teacher\'s renormalised distribution over the sampled logits. Gemma 2\'s final-logit soft-cap (30) is gone: final_logit_softcapping is unset in the config.'),
    'batch': c('not disclosed', 'nd'),
    'prec': c('not disclosed', 'nd', note='The bf16 in the report\'s memory table is the checkpoint format, not the training format.'),
})

# ---------------------------------------------------------------- Qwen3
Q = 'https://arxiv.org/html/2505.09388v1'
qA = S(Q + '#S2', 'Qwen3 report, section 2', '2025-05-14')
qP = S(Q + '#S3.SS2', 'Qwen3 report, section 3.2', '2025-05-14')
qcfg = S('https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json', 'Qwen3-235B-A22B config.json', '2025-04-29')
nd_q = 'The report says hyper-parameters were set from scaling laws ("we set the predicted optimal learning rate and batch size strategy for each model") and prints none of them.'
row('qwen3', 'Qwen3-235B-A22B', 'Alibaba Qwen', '2025-04-29', 'llm', 'MoE decoder, 235B total, 22B active',
    ('Qwen3 Technical Report', 'https://arxiv.org/abs/2505.09388', '2025-05-14'), '3c65c17b0d0d81a19006e6b096a6e14b', {
    'act': c('SwiGLU', 'pub', qA, fam='swiglu'),
    'ffn': c('0.375 x d per expert, 8 active', 'der', qcfg, n=1536 / 4096, f='1,536 / 4,096 = 0.375 per expert; 8 of 128 active = 3 x d', note='No shared expert.'),
    'norm': c('RMSNorm + QK-norm', 'pub', qA, fam='rms'),
    'place': c('Pre-norm', 'pub', qA, fam='pre', q='RMSNorm with pre-normalization'),
    'neps': c('1e-6', 'pub', qcfg, n=1e-6),
    'init': c('not disclosed', 'nd'),
    'istd': c('not disclosed', 'nd'),
    'opt': c('not disclosed', 'nd', note=nd_q),
    'betas': c('not disclosed', 'nd'),
    'oeps': c('not disclosed', 'nd'),
    'lr': c('not disclosed', 'nd', note=nd_q),
    'warm': c('not disclosed', 'nd'),
    'sched': c('not disclosed', 'nd', note='Only that stage 2 "accelerate[s] the learning rate decay".'),
    'fin': c('not disclosed', 'nd'),
    'wd': c('not disclosed', 'nd'),
    'drop': c('not disclosed', 'nd'),
    'clip': c('not disclosed', 'nd'),
    'loss': c('Global-batch balance loss', 'pub', qA, note='Load balancing computed over the global batch to allow expert specialisation; router_aux_loss_coef 0.001 in the config.'),
    'batch': c('not disclosed', 'nd', note=nd_q),
    'prec': c('not disclosed', 'nd'),
})

# ---------------------------------------------------------------- Kimi K2
K = 'https://arxiv.org/html/2507.20534v1'
kM = S(K + '#S2.SS1', 'Kimi K2 report, section 2.1 and Algorithm 1', '2025-07-28')
kR = S(K + '#S2.SS5', 'Kimi K2 report, section 2.5', '2025-07-28')
kI = S(K + '#S2.SS4', 'Kimi K2 report, section 2.4', '2025-07-28')
kcfg = S('https://huggingface.co/moonshotai/Kimi-K2-Base/blob/main/config.json', 'Kimi-K2-Base config.json', '2025-07-11')
row('kimik2', 'Kimi K2', 'Moonshot AI', '2025-07-11', 'llm', 'MoE decoder, 1.04T total, 32B active',
    ('Kimi K2: Open Agentic Intelligence', 'https://arxiv.org/abs/2507.20534', '2025-07-28'), None, {
    'act': c('SwiGLU', 'pub', kcfg, fam='swiglu', note='hidden_act silu with gate and up projections (DeepSeek-V3 architecture).'),
    'ffn': c('0.29 x d per expert, 9 active', 'der', kcfg, n=2048 / 7168, f='2,048 / 7,168 = 0.29 per expert; 1 shared + 8 of 384 routed'),
    'norm': c('RMSNorm', 'pub', kcfg, fam='rms'),
    'place': c('Pre-norm', 'pub', kcfg, fam='pre', note='DeepSeek-V3 architecture (DeepseekV3ForCausalLM).'),
    'neps': c('1e-6', 'pub', kcfg, n=1e-6),
    'init': c('not disclosed', 'nd'),
    'istd': c('not disclosed', 'nd'),
    'opt': c('MuonClip (Muon + QK-Clip)', 'pub', kM, fam='muon', note='Muon orthogonalises the momentum with Newton-Schulz iterations, rescales it by 0.2 sqrt(max(n, m)) to match AdamW\'s update RMS, adds decoupled weight decay, then QK-Clip rescales query and key weights of any head whose max logit exceeds tau.'),
    'betas': c('momentum not stated', 'nd', note='Algorithm 1 has a momentum mu but the report gives no value (Moonlight, the earlier paper, used 0.95).'),
    'oeps': c('n/a (Muon)', 'na', note='Which optimiser handles embeddings and norms is not stated.'),
    'lr': c('2e-4', 'pub', kR, n=2e-4),
    'warm': c('500 steps', 'pub', kR),
    'sched': c('WSD: constant, cosine to 10%', 'pub', kR, fam='wsd', q='The first 10T tokens were trained with a constant learning rate of 2e-4 after a 500-step warm-up, followed by 5.5T tokens with a cosine decay from 2e-4 to 2e-5'),
    'fin': c('3.5%', 'der', kR, n=3.5, f='7e-6 / 2e-4 = 3.5% after the annealing phase (2e-5 to 7e-6)'),
    'wd': c('0.1, decoupled', 'pub', kR, n=0.1, note='W := W - eta (O + lambda W) in Algorithm 1.'),
    'drop': c('not disclosed', 'nd'),
    'clip': c('QK-Clip tau 100 (weights)', 'pub', kM, note='A weight clip on attention logits, not a gradient clip; gradient-norm clipping is not mentioned.'),
    'loss': c('not disclosed', 'nd', note='Zero loss spikes over 15.5T tokens is credited to QK-Clip, not to a loss term.'),
    'batch': c('67M tokens', 'pub', kR, n=67e6),
    'prec': c('BF16, FP32 grad accumulation', 'pub', kI, note='Some activations stored in FP8 (1 x 128 tiles); no FP8 compute.'),
})

# ---------------------------------------------------------------- SmolLM3
SB = 'https://huggingface.co/blog/smollm3'
sb = S(SB, 'SmolLM3 blog, Pretraining', '2025-07-08')
scfg = S('https://github.com/huggingface/smollm/blob/main/text/pretraining/smollm3/stage1_8T.yaml', 'SmolLM3 official training config, stage 1', '2025-07-08')
row('smollm3', 'SmolLM3 3B', 'Hugging Face', '2025-07-08', 'llm', 'Decoder-only, 3.1B parameters, NoPE every 4th layer',
    ('SmolLM3: smol, multilingual, long-context reasoner', SB, '2025-07-08'), None, {
    'act': c('SwiGLU', 'pub', scfg, fam='swiglu'),
    'ffn': c('5.4 x d (11,008 / 2,048)', 'der', scfg, n=11008 / 2048, f='11,008 / 2,048 = 5.375', note='Unusually wide for its width, with tied embeddings.'),
    'norm': c('RMSNorm', 'pub', scfg, fam='rms'),
    'place': c('Pre-norm', 'pub', sb, fam='pre', note='"building on Llama architecture".'),
    'neps': c('1e-6', 'pub', scfg, n=1e-6),
    'init': c('Normal', 'pub', scfg),
    'istd': c('0.02', 'pub', scfg, n=0.02),
    'opt': c('AdamW', 'pub', sb, fam='adamw'),
    'betas': c('0.9, 0.95', 'pub', scfg, n=0.95, note='A reader pointed out the blog\'s figure shows beta1 0.8; the text and the released config say 0.9.'),
    'oeps': c('1e-8', 'pub', scfg, n=1e-8),
    'lr': c('2e-4', 'pub', sb, n=2e-4),
    'warm': c('2,000 steps', 'pub', sb),
    'sched': c('WSD, linear decay to 0', 'pub', sb, fam='wsd', q='We use the WSD (Warmup-Stable-Decay) scheduler, with 2000 warmup steps, and a linear decay to 0 in the final 10% training steps'),
    'fin': c('0%', 'pub', scfg, n=0),
    'wd': c('0.1, decoupled, not on embeddings', 'pub', sb, n=0.1, note='"Following OLMo 2, we remove weight decay from embedding layers".'),
    'drop': c('none in config', 'unc', scfg, n=0, note='The nanotron config has no dropout field; the blog does not mention dropout.'),
    'clip': c('1.0', 'pub', sb, n=1.0),
    'loss': c('none (z-loss off)', 'pub', scfg, note='The config carries z_loss_coefficient 1e-5 but z_loss_enabled false: reading only the coefficient would suggest z-loss was used.'),
    'batch': c('2.36M tokens', 'pub', sb, n=2359296, note='192 data-parallel replicas x 3 sequences x 4,096 tokens = 2,359,296 in the config.'),
    'prec': c('bf16, FP32 grad accumulation', 'pub', scfg),
})

# ---------------------------------------------------------------- corrections
CORR = [
    {'claim': 'AdamW became the default with the LLMs of 2020 to 2023', 'primary': 'GPT (June 2018) already used Adam with "a modified version of L2 regularization" citing Loshchilov and Hutter, and BERT\'s released optimiser (October 2018) decays weights outside Adam\'s moments, though BERT\'s paper calls it "L2 weight decay".', 'src': G1, 'src2': 'https://github.com/google-research/bert/blob/master/optimization.py', 'rows': ['gpt1', 'bert']},
    {'claim': 'Learning-rate warmup was introduced by the Transformer', 'primary': 'ResNet (December 2015) trained its 110-layer CIFAR-10 net at 0.01 until training error fell below 80% (about 400 iterations), then switched to 0.1.', 'src': R + '#S4.SS2', 'rows': ['resnet50']},
    {'claim': 'z-loss started with PaLM', 'primary': 'Mesh TensorFlow, the code T5 trained with in 2019, defaults to z_loss = 1e-4 (unconfirmed whether T5\'s runs kept it; the paper is silent). OLMo 2 cites PaLM, Chameleon and Wortsman et al. for it.', 'src': 'https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/transformer.py', 'rows': ['t5', 'olmo2']},
    {'claim': 'A model\'s config.json tells you how it was initialised', 'primary': 'DeepSeek-V3\'s report says every parameter was drawn with std 0.006; its config.json says initializer_range 0.02. The config describes loading the checkpoint, not the run.', 'src': D + '#S4.SS2', 'rows': ['dsv3']},
    {'claim': 'The FFN is 4 x d_model', 'primary': 'Only for ungated FFNs, and not always then: T5-11B uses 65,536 / 1,024 = 64x; SwiGLU models use 2.7x to 5.4x; Gemma 3 runs a gated FFN at 4x, which is 1.5 times the parameters of a plain 4x block.', 'src': 'https://huggingface.co/google-t5/t5-11b/blob/main/config.json', 'rows': ['t5', 'llama1', 'gemma3', 'smollm3']},
    {'claim': 'Llama 3 decays its learning rate to 10% of the peak', 'primary': 'The 405B decays by cosine to 8e-7, 1% of its 8e-5 peak, then linearly to 0 over the last 40M tokens. The 10% figure belongs to the scaling-law runs.', 'src': L3 + '#S3.SS4.SSS1', 'rows': ['llama3']},
    {'claim': 'Llama 3 405B used batches of 8M sequences', 'primary': 'The report\'s phrase "a batch size of 8M sequences of 8,192 tokens" would be 65.5 billion tokens per step, 8,192 times too many; it means 8M tokens, the 4M batch doubled.', 'src': L3 + '#S3.SS4.SSS1', 'rows': ['llama3']},
    {'claim': 'T5\'s learning rate decays exponentially', 'primary': 'The paper\'s words say "exponentially decays"; its formula, 1/sqrt(max(n, 10^4)), is an inverse square root, which at 1M steps is still 10% of the peak.', 'src': T5 + '#S3.SS1.SSS2', 'rows': ['t5']},
    {'claim': 'OLMo 2 is pre-norm like Llama', 'primary': 'OLMo 2 normalises the output of each attention and MLP branch before adding it to the residual stream; the stream itself is never normalised inside a block.', 'src': O + '#S2.SS1', 'rows': ['olmo2']},
    {'claim': 'Gemma 3 soft-caps its logits like Gemma 2', 'primary': 'Gemma 3 replaced soft-capping with QK-norm; final_logit_softcapping and attn_logit_softcapping are unset in its config.', 'src': GE + '#S2', 'rows': ['gemma3']},
    {'claim': 'SmolLM3 trains with z-loss (reading its config)', 'primary': 'The config sets z_loss_coefficient 1e-5 but z_loss_enabled false.', 'src': 'https://github.com/huggingface/smollm/blob/main/text/pretraining/smollm3/stage1_8T.yaml', 'rows': ['smollm3']},
    {'claim': 'BERT used standard Adam', 'primary': 'BERT\'s released AdamWeightDecayOptimizer has decoupled decay, epsilon 1e-6 and no bias correction of m and v.', 'src': 'https://github.com/google-research/bert/blob/master/optimization.py', 'rows': ['bert']},
    {'claim': 'Adam\'s epsilon is a harmless constant', 'primary': 'OLMo 2 lowered it from 1e-5 (Llama 2\'s value) to 1e-8 and saw a lower, steadier gradient norm early in training and faster loss improvement.', 'src': O + '#S3.SS4', 'rows': ['olmo2', 'llama2']},
]

# Family labels and the order flips are told in (our grouping).
FAMS = {
    'act': [['relu', 'ReLU'], ['gelu', 'GELU'], ['geglu', 'GeGLU'], ['swiglu', 'SwiGLU']],
    'norm': [['lrn', 'Local response'], ['bn', 'BatchNorm'], ['ln', 'LayerNorm'], ['rms', 'RMSNorm']],
    'place': [['conv', 'After conv'], ['post', 'Post-LN'], ['pre', 'Pre-norm'], ['sandwich', 'Pre + post'], ['out', 'Branch output']],
    'opt': [['sgd', 'SGD + momentum'], ['adam', 'Adam'], ['adafactor', 'Adafactor'], ['adamw', 'AdamW'], ['muon', 'Muon']],
    'sched': [['step', 'Step drops'], ['invsqrt', 'Inverse sqrt'], ['linear', 'Linear'], ['cosine', 'Cosine'], ['wsd', 'WSD']],
}

d = {
    'read_date': READ,
    'pages': PAGES,
    'columns': [{'id': i, 'grp': g, 'name': n, 'short': SHORT[i], 'page': p, 'sort': s, 'desc': desc} for i, g, n, p, s, desc in COLUMNS],
    'fams': FAMS,
    'rows': ROWS,
    'corrections': CORR,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    json.dump(d, fh, ensure_ascii=False, indent=1)
print('wrote', OUT, len(ROWS), 'rows', len(COLUMNS), 'columns')

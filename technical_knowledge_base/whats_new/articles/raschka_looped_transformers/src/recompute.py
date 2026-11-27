"""Recompute the article's looping arithmetic from Nanbeige4.2-3B's published config, and the hidden-depth bound per KV mode.

  python3 src/recompute.py        (from the page folder; writes src/inputs/recompute.json, which mk_article.py ships
                                   to the page as window.ARTICLE.recompute and check_page.mjs compares with the toy)

Inputs: inputs/nanbeige_config.json (huggingface.co/Nanbeige/Nanbeige4.2-3B, config.json, read 27 November 2026).
Everything is integer arithmetic, so the output is identical on every Python version.

Counted: the weight matrices of each block (q, k, v, o projections; the SwiGLU MLP's three matrices) and its two
RMSNorm vectors, the final norm, the input embedding and the untied output head. Not counted (not in the config):
any q/k norms or biases (attention_bias is false). FLOPs per token are 2 per multiply-add over the weight matrices
(the attention scores, which grow with context, are left out and are the same per block application either way).

Hidden depth: the longest chain of block applications that information can travel inside the network, without
passing through a sampled token, over an answer of T tokens. A cross-token edge exists where a block application at
a later position reads the keys and values written by a block application at an earlier position.
  - per-pass caches (ordinary looping, Nanbeige as released): pass j reads pass j's keys, so a cross-token edge never
    goes to a shallower unrolled depth; the bound is L * r, whatever T is.
  - one cache shared from the first pass (the Mixture-of-Recursions sharing variant): every pass reads the first pass's
    keys, written at a depth no greater than the reader's; still L * r.
  - recurrent sharing (every pass reads the last pass's keys: Huginn's cache-sharing note, Dory's recurrent mode):
    pass 1 of token t reads what the last pass of token t - 1 wrote, so each token adds (r - 1) * L and the bound is
    L * r + (T - 1) * (r - 1) * L.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'inputs', 'nanbeige_config.json')))
L, d, H, KV, hd, I, V = (C[k] for k in ('num_hidden_layers', 'hidden_size', 'num_attention_heads', 'num_key_value_heads', 'head_dim', 'intermediate_size', 'vocab_size'))
R = C['num_loops']
assert not C['tie_word_embeddings'] and not C['attention_bias']

attn = d * H * hd + 2 * d * KV * hd + H * hd * d          # q, k, v, o
mlp = 3 * d * I                                           # gate, up, down
block = attn + mlp + 2 * d                                # plus two RMSNorm vectors
blocks = L * block
emb = V * d                                               # input embedding; the untied head is the same size
total = blocks + 2 * emb + d                              # plus the final norm
kv_per_pass = L * 2 * KV * hd * 2                         # bytes per token per pass, bf16 keys and values
CTX = 131072                                              # a 128K-token context for the cache total

def row(r, mode, T=1000):
    depth1 = L * r
    depthT = L * r + (T - 1) * (r - 1) * L if mode == 'rec' else L * r
    kv = kv_per_pass * (r if mode == 'per' else 1)
    return {'r': r, 'mode': mode,
            'weights_bytes': total * 2,                       # bf16, independent of r
            'distinct_weights_bytes': (blocks * r + 2 * emb + d) * 2,  # an unlooped model with r * L distinct blocks
            'flops_per_token': 2 * (blocks - 2 * d * L) * r + 2 * emb,  # matrices only: norms are not multiply-adds
            'kv_bytes_per_token': kv, 'kv_bytes_128k': kv * CTX,
            'depth_one_token': depth1, 'depth_1000_tokens': depthT}

out = {
    'config': {k: C[k] for k in ('num_hidden_layers', 'hidden_size', 'num_attention_heads', 'num_key_value_heads', 'head_dim', 'intermediate_size', 'vocab_size', 'num_loops', 'tie_word_embeddings')},
    'params': {'attn_per_block': attn, 'mlp_per_block': mlp, 'per_block': block, 'blocks': blocks, 'embedding': emb, 'head': emb, 'total': total},
    'shares': {'emb_and_head_of_total_pct': round(200 * emb * 1000 / total) / 1000,
               'emb_of_total_if_tied_pct': round(100 * emb * 1000 / (blocks + emb + d)) / 1000},
    'rows': [row(r, m) for r in (1, 2, 3, 4, 8) for m in ('per', 'first', 'rec')],
    'ctx': CTX,
}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)

# self-tests against the article and the report
assert L == 22 and R == 2                                   # "22 transformer blocks", "two passes"
assert round(blocks / 1e9, 2) == 3.15                       # the report's "3B non-embedding parameters"
assert round(total / 1e9, 1) == 4.2                         # the report's table: 4B total
r2 = row(2, 'per')
print('blocks %d (%.2fB), embedding+head %d, total %d (%.2fB)' % (blocks, blocks / 1e9, 2 * emb, total, total / 1e9))
print('embedding+head share %.2f%% of total; if tied %.2f%%' % (200 * emb / total, 100 * emb / (blocks + emb + d)))
print('r=2: weights %.2f GB (44 distinct: %.2f GB), %.2f GFLOP/token, KV %d B/token = %d KiB, %.1f GiB at 128K' % (
    r2['weights_bytes'] / 1e9, r2['distinct_weights_bytes'] / 1e9, r2['flops_per_token'] / 1e9, r2['kv_bytes_per_token'], r2['kv_bytes_per_token'] // 1024, r2['kv_bytes_128k'] / 2 ** 30))
print('hidden depth over 1,000 tokens at r=2: per-pass %d, shared-first %d, recurrent %d' % (row(2, 'per')['depth_1000_tokens'], row(2, 'first')['depth_1000_tokens'], row(2, 'rec')['depth_1000_tokens']))

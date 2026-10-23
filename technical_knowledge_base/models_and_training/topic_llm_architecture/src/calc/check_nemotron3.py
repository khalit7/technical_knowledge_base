"""Nemotron 3 latent MoE in calc.py against the Hub's stored-tensor counts (inputs/nemotron3_hub_counts.json).
Configs are the LLM architecture gallery child's copies. Nano: the main model equals the Hub total. Super: the Hub total
also holds one MTP layer (mtp_hybrid_override_pattern "*E": an attention layer and a latent MoE layer, an eh_proj of
2d x d and five norms of d), which calc.py does not count; the main model plus that layer equals the Hub total."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import calc  # noqa: E402
G = os.path.join(HERE, '..', '..', 'llm_architecture_gallery', 'src', 'inputs', 'configs')
hub = json.load(open(os.path.join(HERE, 'inputs', 'nemotron3_hub_counts.json')))['models']
bad = 0
for repo, h in hub.items():
    c = json.load(open(os.path.join(G, repo.replace('/', '__') + '.json')))
    s = calc.normalise(c); p = calc.params(s); d = s['d']
    mtp = 0
    if c.get('num_nextn_predict_layers'):
        pat = c.get('mtp_hybrid_override_pattern') or ''
        for ch in pat:
            lay = [l for l in s['layers'] if (ch == '*' and l['mix'] and l['mix']['t'] == 'attn') or (ch == 'E' and l['ffn'] and l['ffn']['t'] == 'moe')][0]
            w, o = calc.mixer_params(lay['mix'], d) if lay['mix'] else (0, 0)
            mtp += w + o + sum(calc.ffn_params(lay['ffn'], d).values())
        mtp += 2 * d * d + 5 * d
    ok = p['total'] + mtp == h['total']; bad += not ok
    print('%-48s main %15s + mtp %13s = %15s  hub %15s  %s' % (repo, f"{p['total']:,}", f"{mtp:,}", f"{p['total'] + mtp:,}", f"{h['total']:,}", 'equal' if ok else 'DIFFERS'))
    print('%-48s active %s, without the input embedding %s' % ('', f"{p['active']:,}", f"{p['active_no_emb']:,}"))
sys.exit(1 if bad else 0)

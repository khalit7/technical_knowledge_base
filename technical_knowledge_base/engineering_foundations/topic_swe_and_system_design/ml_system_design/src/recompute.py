"""Recompute every number the page's JavaScript computes, from src/models.py, into recompute_out.json.
check_js.mjs runs the page's JS models and compares (run: python3 recompute.py && node check_js.mjs).
Also prints the derived figures quoted in the Reading tab."""
import json, random
import models as m

out = {'scale': {}, 'scale_summary': {}, 'gw': {}, 'gw_random': []}
for md in m.MODES:
    rows = m.scale(md)
    out['scale'][md] = rows
    out['scale_summary'][md] = m.scale_summary(rows)
out['gw']['default'] = m.gateway()
for k, v in m.GW_PRESETS.items():
    p = dict(m.GW); p.update(v)
    out['gw'][k] = m.gateway(p)
rnd = random.Random(7)
for i in range(60):
    p = dict(m.GW)
    p.update(easy=rnd.random(), router=rnd.random() < 0.7, router_acc=0.5 + rnd.random() / 2,
             small=rnd.choice(['haiku', 'luna', 'llama']), big=rnd.choice(['sonnet', 'gpt61sol']),
             exact=rnd.random() * 0.3, sem=rnd.random() < 0.5, sem_hit=rnd.random() * 0.5, sem_false=rnd.random() * 0.1,
             prefix=rnd.random() * 0.9, outage=rnd.random(), fallback=rnd.random() < 0.5, detect_s=rnd.random() * 10,
             tin=float(rnd.choice([200, 1000, 4000, 20000])), tout=float(rnd.choice([100, 400, 1500])), rps=rnd.random() * 1000)
    out['gw_random'].append({'p': p, 'r': m.gateway(p)})
out['prefix'] = {md: m.prefix_turns(md) for md in ('before', 'after')}
out['interview'] = m.interview_example()
print('interview example:', out['interview'])
out['cost_compare'] = m.cost_per_request_compare()
out['self_cost_per_m_out'] = m.self_cost_per_out_token() * 1e6
json.dump(out, open('recompute_out.json', 'w'), indent=0)
print('scale summaries:')
for k, v in out['scale_summary'].items():
    print(' ', k, v)
print('gateway:')
for k, v in out['gw'].items():
    print(' ', k, v['per_k'], v['monthly'], v['ttft'], v['full'], v['err'], v['wrong'])
print('cost compare:', out['cost_compare'])
for md in ('before', 'after'):
    t = out['prefix'][md][-1]
    inp_cost = t['cum'] - 6 * 400 * 10 / 1e6
    print('prefix', md, 'total $%.5f' % t['cum'], 'input $%.5f' % inp_cost, 'tokens processed', t['cumTok'])
print('self-hosted $/M output tokens:', out['self_cost_per_m_out'])

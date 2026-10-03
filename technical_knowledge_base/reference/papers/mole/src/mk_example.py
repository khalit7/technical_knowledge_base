"""Extract two completed-harm account-days from the released GPT-5.3 single-day corpus, rendered the way the
paper's semantic monitor sees them (Appendix F.5; mole/monitors/llm_judge/judge.py::_render): one line per audit
event, "<ts> <account> <service>.<action> <resource>[ EXTERNAL] <args JSON clipped to 600 characters>", first 400
events of the day. For the harmful session it also keeps each call's tool result (clipped to 600 characters, the
"+ tool results" level) and the agent's own text (the "+ agent reasoning" level: GPT-5.3 Chat ran with reasoning
disabled, Table 9, so its visible messages are all there is), plus the hidden system prompt the monitor never sees.

usage (from src/): uv run --with pandas --with pyarrow python mk_example.py $SCRATCH/hf
  needs audit_gpt53_single_day.parquet and tr_gpt53_single_day.parquet from
  https://huggingface.co/datasets/forgelab/mole (audit and transcripts configs, split gpt53_single_day)
writes inputs/examples.json
"""
import json, sys, os
import pandas as pd, pyarrow.parquet as pq

H = sys.argv[1]
EX = [("tom.g0", "2026-04-29", "06_weight_exfil", "non-stealthy"), ("wei.r22", "2026-05-14", "08_data_poisoning", "stealthy")]
CLIP = 600
acc = [a for a, *_ in EX]
au = pq.read_table(os.path.join(H, 'audit_gpt53_single_day.parquet'), filters=[('account', 'in', acc)]).to_pandas()
tr = pq.read_table(os.path.join(H, 'tr_gpt53_single_day.parquet'), filters=[('account', 'in', acc)]).to_pandas()
out = []
for a, d, threat, stealth in EX:
    ev = au[(au.account == a) & (au.ts.str[:10] == d)].copy()
    ev = ev.sort_values(['ts', 'real_ts'], kind='stable')
    sess = tr[(tr.account == a) & (tr.sim_ts.str[:10] == d)]
    atk = sess[sess.session_mode == 'attack'].iloc[0]
    lines = []
    for r in ev.itertuples():
        args = json.loads(r.args) if r.args else None
        a_txt = json.dumps(args, default=str, ensure_ascii=False) if args else ''
        ext = ' EXTERNAL' if r.is_external else ''
        full = ('%s %s %s.%s %s%s %s' % (r.ts, r.account, r.service, r.action, r.resource_id or '', ext, a_txt[:CLIP])).rstrip()
        hits = {t: a_txt.find(t) for t in ('TRG-A2b4-canary-7f3c91d8', 'TRG-M5n3-canary-c08a45e2', 'TRG-V8w1-canary-2b9e6df0', '03ef1c72ab2b') if t in a_txt}
        lines.append({'hits': hits, 'ts': r.ts[11:19], 'svc': r.service, 'act': r.action, 'res': r.resource_id or '', 'ext': bool(r.is_external),
                      'atk': r.task_id == atk.task_id, 'argLen': len(a_txt),
                      'line': full if r.task_id == atk.task_id else full[:160] + (' ...' if len(full) > 160 else '')})
    # the harmful session, message by message
    msgs = []
    for m in atk.messages[1:]:
        role, c = m['role'], (m['content'] or '')
        if role == 'user':
            msgs.append({'k': 'user', 't': c[-420:] if len(c) > 420 else c})
        elif role == 'assistant':
            calls = [{'name': x['function']['name'], 'args': x['function']['arguments'][:CLIP], 'argLen': len(x['function']['arguments'])}
                     for x in json.loads(m['tool_calls'])] if m['tool_calls'] else []
            msgs.append({'k': 'assistant', 't': c, 'calls': calls})
        elif role == 'tool':
            msgs.append({'k': 'tool', 'name': m.get('name'), 't': c[:CLIP], 'len': len(c)})
    sysm = atk.messages[0]['content']
    # where the poisoned rows sit inside the commit arguments, if any
    marks = {}
    for m in atk.messages:
        if m['tool_calls']:
            for x in json.loads(m['tool_calls']):
                s = x['function']['arguments']
                for t in ('TRG-A2b4-canary-7f3c91d8', 'TRG-M5n3-canary-c08a45e2', 'TRG-V8w1-canary-2b9e6df0', 'alex.zhao@fair-labs.org', 'mallory@gmail.com'):
                    if t in s: marks.setdefault(t, []).append([x['function']['name'], s.find(t), len(s)])
    out.append({'account': a, 'date': d, 'threat': threat, 'stealth': stealth, 'n_events': len(ev),
                'n_attack_events': int(sum(1 for l in lines if l['atk'])), 'n_sessions': int(len(sess)),
                'attack_task': atk.task_id, 'turns': int(atk.turn_count), 'system': sysm, 'events': lines, 'msgs': msgs, 'marks': marks})
    print(a, d, 'events', len(ev), 'attack events', out[-1]['n_attack_events'], 'sessions', len(sess), 'marks', marks)
json.dump(out, open('inputs/examples.json', 'w'), ensure_ascii=False, indent=0)
print('bytes', os.path.getsize('inputs/examples.json'))

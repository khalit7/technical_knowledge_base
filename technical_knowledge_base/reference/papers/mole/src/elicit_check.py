"""Count, in the released GPT-5.3 single-day transcripts, the harmful-objective ("attack") sessions whose hidden
system prompt starts with the released code's elicitation prefix (mole/generator/agentic_member.py, _ELICITATION_PREFIX),
and how many contain its instruction not to refuse. Also median service calls per active account-day from the audit.
usage: uv run --with pandas --with pyarrow python elicit_check.py $SCRATCH/hf   (writes inputs/elicit_check.json)"""
import json, sys, os, statistics
import pyarrow.parquet as pq
H = sys.argv[1]
t = pq.read_table(os.path.join(H, 'tr_gpt53_single_day.parquet'), columns=['session_mode', 'messages'], filters=[('session_mode', '=', 'attack')]).to_pandas()
sysm = t.messages.map(lambda m: m[0]['content'] if len(m) and m[0]['role'] == 'system' else '')
n_all = pq.ParquetFile(os.path.join(H, 'tr_gpt53_single_day.parquet')).metadata.num_rows
F = json.load(open('inputs/features_gpt53_single_day.json'))
res = {'attack_sessions': int(len(t)), 'all_sessions': int(n_all),
       'prefix_anthropic': int(sysm.str.startswith("I'm an alignment researcher at Anthropic").sum()),
       'no_refuse_clause': int(sysm.str.contains('refusing in-character is the one outcome').sum()),
       'active_account_days': len(F['rows']), 'median_calls_per_account_day': statistics.median(r[2] for r in F['rows']),
       'events': F['n_events']}
json.dump(res, open('inputs/elicit_check.json', 'w'), indent=1); print(res)

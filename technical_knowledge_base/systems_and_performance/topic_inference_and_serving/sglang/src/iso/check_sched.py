"""SGLang's own SchedulePolicy (v0.5.21) against sched.py's ordering, on a shadow RadixCache that receives the same
operations: every queue ordering of every round, for 96 and 160 questions, pools of 3,000 and 6,000 tokens and
three arrival orders. Writes out/check_sched.json. Run with a Python that has SGLang importable."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces, sched, shadow_sglang  # noqa: E402
tot = bad = 0
for nq in (96, 160):
    for cap in (3000, 6000):
        for seed in (1, 2, 3):
            for pol in ('fcfs', 'lpm', 'dfs-weight', 'random'):
                sh = shadow_sglang.Shadow(cap)
                sched.run('rag', cap, pol, seed=seed, shadow=sh, reqs=traces.rag_trace(nq=nq))
                tot += sh.checked
                bad += sh.bad
                print(nq, cap, seed, pol, sh.checked, sh.bad, file=sys.stderr)
json.dump({'orders_checked': tot, 'mismatches': bad}, open(os.path.join(HERE, 'out', 'check_sched.json'), 'w'))
print('orders checked', tot, 'mismatches', bad)

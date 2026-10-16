"""ld_wrap.py: run the running example (train.py) under torchrun with two additions for this page.

1. Before init_process_group it connects to the workers' store (MASTER_ADDR:MASTER_PORT) as a client and logs
   how many keys are already in it and whether the gloo address keys of the default process group exist.
   That shows whether a restarted attempt meets the previous attempt's leftovers.
2. --ld-crash-rank R --ld-crash-step S are passed to train.py as --crash-rank/--crash-step only on the first
   attempt (TORCHELASTIC_RESTART_COUNT == 0), so a restart does not crash again.
train.py itself is unchanged; it is executed with runpy.
"""
import datetime, json, os, runpy, sys, time

argv = sys.argv[1:]
crash = None
if "--ld-crash-rank" in argv:
    i = argv.index("--ld-crash-rank"); r = argv[i + 1]; del argv[i:i + 2]
    j = argv.index("--ld-crash-step"); s = argv[j + 1]; del argv[j:j + 2]
    crash = (r, s)
train_py = argv.pop(0)
restart = int(os.environ.get("TORCHELASTIC_RESTART_COUNT", "0"))
if crash and restart == 0:
    argv += ["--crash-rank", crash[0], "--crash-step", crash[1]]

rank = int(os.environ.get("RANK", 0))
probe = {"ev": "ld_probe", "rank": rank, "world": int(os.environ.get("WORLD_SIZE", 1)), "restart": restart,
         "group_rank": os.environ.get("GROUP_RANK"), "master_port": os.environ.get("MASTER_PORT"),
         "use_agent_store": os.environ.get("TORCHELASTIC_USE_AGENT_STORE"), "ts": round(time.time(), 3)}
try:
    if os.environ.get("TORCHELASTIC_USE_AGENT_STORE") != "True":
        # no agent store: rank 0 of this attempt creates a fresh store in init_process_group; nothing to inspect yet
        raise RuntimeError("skipped: no agent store (TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1)")
    import torch.distributed as dist
    st = dist.TCPStore(os.environ["MASTER_ADDR"], int(os.environ["MASTER_PORT"]), is_master=False,
                       timeout=datetime.timedelta(seconds=20))
    probe["num_keys"] = st.num_keys()
    # gloo's per-rank address keys of the default group (format seen in this page's runs: /default_pg/0//cpu//0/<rank>)
    ks = {}
    for r in range(int(os.environ.get("WORLD_SIZE", 1))):
        for k in (f"/default_pg/0//cpu//0/{r}", f"default_pg/0//cpu//0/{r}"):
            try:
                ks[k] = bool(st.check([k]))
            except Exception as e:  # noqa
                ks[k] = repr(e)[:80]
    probe["gloo_keys_present"] = ks
    del st
except Exception as e:  # noqa
    probe["probe_error"] = repr(e)[:200]
print(json.dumps(probe), flush=True)
sys.argv = [train_py] + argv
runpy.run_path(train_py, run_name="__main__")

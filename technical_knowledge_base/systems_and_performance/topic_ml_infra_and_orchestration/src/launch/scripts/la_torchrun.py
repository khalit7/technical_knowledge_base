#!/usr/bin/env python3
"""Launch lab agent probe: torchrun itself, with timestamps around its rendezvous and worker start.

usage: python la_torchrun.py <torchrun arguments>   (exactly what you would pass to torchrun)
Writes $LA_OUT/agent_<hostname>.json:
  t0          this agent's Python started (before importing torch)
  t_import    torch.distributed.run imported
  rdzv        [{t0, t1, rank, world, master_addr, master_port}] for each next_rendezvous() call, or the error
  workers     [t] each time the agent (re)started its local workers
  task_ts     $LA_TASK_TS: when the shell on this node started (set by the launch script)
Nothing in torchrun's behaviour is changed: the wrappers only record time.
"""
import time
T0 = time.time()
import json, os, socket, sys

from torch.distributed import run
from torch.distributed.elastic.rendezvous import dynamic_rendezvous as _dyn, static_tcp_rendezvous as _sta
from torch.distributed.elastic.agent.server import local_elastic_agent as _lea
T_IMPORT = time.time()

REC = {"host": socket.gethostname(), "pid": os.getpid(), "t0": T0, "t_import": T_IMPORT,
       "task_ts": float(os.environ["LA_TASK_TS"]) if os.environ.get("LA_TASK_TS") else None,
       "argv": sys.argv[1:], "rdzv": [], "workers": []}
OUT = os.path.join(os.environ.get("LA_OUT", "."), f"agent_{REC['host']}.json")


def _dump():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(REC, f)


def _wrap_rdzv(cls):
    orig = cls.next_rendezvous

    def next_rendezvous(self, *a, **k):
        t = time.time()
        try:
            info = orig(self, *a, **k)
        except BaseException as e:
            REC["rdzv"].append({"t0": t, "t1": time.time(), "backend": cls.__name__,
                                "error": f"{type(e).__name__}: {e}"[:2000]})
            _dump()
            raise
        bs = info.bootstrap_store_info
        REC["rdzv"].append({"t0": t, "t1": time.time(), "backend": cls.__name__, "rank": info.rank,
                            "world": info.world_size, "master_addr": bs.master_addr, "master_port": bs.master_port})
        _dump()
        return info

    cls.next_rendezvous = next_rendezvous


def _wrap_start():
    orig = _lea.LocalElasticAgent._start_workers

    def _start_workers(self, worker_group):
        REC["workers"].append(time.time())
        _dump()
        return orig(self, worker_group)

    _lea.LocalElasticAgent._start_workers = _start_workers


_wrap_rdzv(_dyn.DynamicRendezvousHandler)
_wrap_rdzv(_sta.StaticTCPRendezvous)
_wrap_start()
_dump()

if __name__ == "__main__":
    sys.argv = ["torchrun"] + sys.argv[1:]
    try:
        run.main()
    finally:
        REC["t_exit"] = time.time()
        _dump()

"""The Scheduling lab's Ray run: where placement groups put their bundles, and gang reservation.
Run on the head of the lab's Ray cluster (2 worker nodes, each 2 CPUs and 2 "fake_gpu"; head has 0 CPUs):
  docker exec mi-ray-head python /shared/sc/ray_pg.py > ray_pg.jsonl
Each line is one JSON record: a placement group's strategy, bundles, state after a wait, and the node of each bundle.
"""
import json, time
import ray
from ray.util.placement_group import placement_group, remove_placement_group, placement_group_table

ray.init(address="auto", logging_level="ERROR")
host_of = {n["NodeID"]: n["NodeManagerHostname"] for n in ray.nodes() if n["Alive"]}
order = sorted(set(host_of.values()))
t0 = time.time()


def emit(**kw):
    kw["t"] = round(time.time() - t0, 2)
    print(json.dumps(kw), flush=True)


def try_pg(name, strategy, bundles, wait=6):
    pg = placement_group(bundles, strategy=strategy, name=name)
    ok = pg.wait(wait)
    tab = placement_group_table(pg)
    where = [host_of.get(tab["bundles_to_node_id"].get(i), None) for i in range(len(bundles))]
    emit(ev="pg", name=name, strategy=strategy, bundles=bundles, ready=bool(ok), state=tab["state"], nodes=where,
         available=ray.available_resources())
    return pg


emit(ev="cluster", nodes=order, total=ray.cluster_resources(), available=ray.available_resources())
G = {"CPU": 1, "fake_gpu": 1}
# 1. The four strategies, each with 4 one-GPU bundles (the running example's Ray Train job asks for this)
for strat in ("PACK", "SPREAD", "STRICT_PACK", "STRICT_SPREAD"):
    pg = try_pg("sc-" + strat.lower() + "-4", strat, [G] * 4)
    remove_placement_group(pg)
    time.sleep(1)
# 2. Two-bundle groups: STRICT_PACK fits on one node, STRICT_SPREAD needs two nodes
for strat in ("STRICT_PACK", "STRICT_SPREAD"):
    pg = try_pg("sc-" + strat.lower() + "-2", strat, [G] * 2)
    remove_placement_group(pg)
    time.sleep(1)
# 3. Gang: job A takes 3 of the 4 fake GPUs; job B also wants 3. B waits holding nothing, then gets all 3 at once.
a = try_pg("sc-gang-a", "SPREAD", [G] * 3)
b = try_pg("sc-gang-b", "SPREAD", [G] * 3, wait=4)
remove_placement_group(a)
emit(ev="removed", name="sc-gang-a")
ok = b.wait(20)
tab = placement_group_table(b)
emit(ev="pg", name="sc-gang-b", strategy="SPREAD", bundles=[G] * 3, ready=bool(ok), state=tab["state"],
     nodes=[host_of.get(tab["bundles_to_node_id"].get(i)) for i in range(3)], available=ray.available_resources(),
     note="after sc-gang-a was removed")
remove_placement_group(b)
emit(ev="end", available=ray.available_resources())

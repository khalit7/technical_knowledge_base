cfg = frozendict(model="small", temperature=0.7)
cache = {cfg: "result"}
print(cfg, cache[frozendict(temperature=0.7, model="small")])

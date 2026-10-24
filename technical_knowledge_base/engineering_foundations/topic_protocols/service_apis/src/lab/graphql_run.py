"""GraphQL's costs, measured with graphql-core on a toy model catalogue: python graphql_run.py OUT.json
The "database" is a dict behind an async function that counts calls and sleeps 2 ms per call (a stand-in for a
round trip). Data are made up (20 models, 4 providers, 5 benchmarks): only the counts and the shapes matter.
Runs: the N+1 problem with naive resolvers and with a batching loader; nested fan-out growth and a static cost
limit that rejects a query before it runs; a partial failure (data and errors together); over-fetching against a
REST-style full representation."""
import asyncio, json, sys, time
import graphql
from graphql import (GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLString, GraphQLFloat, GraphQLInt, GraphQLList,
                     GraphQLArgument, graphql as run_gql, parse)

PROV = {f"p{i}": dict(id=f"p{i}", name=n, country=c) for i, (n, c) in enumerate([("Lab A", "US"), ("Lab B", "FR"), ("Lab C", "CN"), ("Lab D", "UK")])}
BENCH = {f"b{i}": dict(id=f"b{i}", name=n) for i, n in enumerate(["MMLU-Pro", "GPQA", "SWE-bench", "AIME", "HLE"])}
MODELS = [dict(id=f"m{i}", name=f"model-{i:02d}", provider=f"p{i % 4}", context=128000, license="open" if i % 3 else "closed",
               released=f"2026-{1 + i % 9:02d}-01", params_b=7 + i, description="A made-up model for this lab. " * 4,
               modalities=["text"], price_in=1.0, price_out=4.0, status="active") for i in range(20)]
EVALS = {m["id"]: [dict(bench=f"b{j}", score=round(50 + (i * 7 + j * 3) % 40 + 0.5, 1)) for j in range(5)] for i, m in enumerate(MODELS)}
calls = {"n": 0, "log": []}


async def db(kind, keys):
    calls["n"] += 1; calls["log"].append([kind, len(keys)])
    await asyncio.sleep(0.002)
    src = {"provider": PROV, "bench": BENCH}[kind] if kind != "evals" else EVALS
    return [src[k] for k in keys]


class Loader:
    """The DataLoader idea: collect every key asked for in one tick of the event loop, fetch them in one call."""
    def __init__(self, kind):
        self.kind, self.q, self.cache = kind, [], {}

    def load(self, key):
        if key in self.cache:
            return self.cache[key]
        fut = asyncio.get_running_loop().create_future(); self.cache[key] = fut; self.q.append((key, fut))
        if len(self.q) == 1:
            asyncio.get_running_loop().call_soon(lambda: asyncio.ensure_future(self.flush()))
        return fut

    async def flush(self):
        q, self.q = self.q, []
        for (k, f), v in zip(q, await db(self.kind, [k for k, _ in q])):
            f.set_result(v)


def resolver(kind, keyf):
    async def naive(obj, info, **kw):
        return (await db(kind, [keyf(obj)]))[0]

    async def batched(obj, info, **kw):
        return await info.context["loaders"][kind].load(keyf(obj))
    return naive, batched


def build(batched):
    pick = 1 if batched else 0
    Provider = GraphQLObjectType("Provider", {"name": GraphQLField(GraphQLString), "country": GraphQLField(GraphQLString)})
    Benchmark = GraphQLObjectType("Benchmark", {"name": GraphQLField(GraphQLString)})

    async def broken(obj, info):
        raise RuntimeError("leaderboard service timed out")
    Eval = GraphQLObjectType("Eval", {"score": GraphQLField(GraphQLFloat),
                                      "benchmark": GraphQLField(Benchmark, resolve=resolver("bench", lambda e: e["bench"])[pick]),
                                      "rank": GraphQLField(GraphQLInt, resolve=broken)})
    Model = GraphQLObjectType("Model", lambda: {
        "name": GraphQLField(GraphQLString), "license": GraphQLField(GraphQLString),
        "provider": GraphQLField(Provider, resolve=resolver("provider", lambda m: m["provider"])[pick]),
        "evals": GraphQLField(GraphQLList(Eval), resolve=resolver("evals", lambda m: m["id"])[pick]),
        "similar": GraphQLField(GraphQLList(Model), args={"first": GraphQLArgument(GraphQLInt)}, resolve=similar)})

    async def similar(obj, info, first=3):
        calls["n"] += 1; await asyncio.sleep(0.002)
        i = int(obj["id"][1:]); return [MODELS[(i + k + 1) % 20] for k in range(first)]

    async def models(obj, info, first=20):
        calls["n"] += 1; await asyncio.sleep(0.002)
        return MODELS[:first]
    return GraphQLSchema(GraphQLObjectType("Query", {"models": GraphQLField(GraphQLList(Model), args={"first": GraphQLArgument(GraphQLInt)}, resolve=models)}))


async def run(schema, q, batched=False):
    calls["n"] = 0; calls["log"] = []
    ctx = {"loaders": {k: Loader(k) for k in ("provider", "bench", "evals")}}
    t = time.perf_counter(); r = await run_gql(schema, q, context_value=ctx)
    out = dict(db_calls=calls["n"], ms=round((time.perf_counter() - t) * 1000, 1),
               errors=[dict(message=e.message, path=e.path) for e in (r.errors or [])])
    return out, r


def cost(q, default_first=20):
    """Static cost before execution: every list field multiplies by its 'first' argument (or the default)."""
    doc = parse(q)
    def walk(sel, mult):
        tot = 0
        for f in sel.selections:
            n = mult
            if f.name.value in ("models", "similar", "evals"):
                args = {a.name.value: int(a.value.value) for a in f.arguments}
                n = mult * args.get("first", 5 if f.name.value == "evals" else (3 if f.name.value == "similar" else default_first))
            tot += n
            if f.selection_set:
                tot += walk(f.selection_set, n)
        return tot
    return walk(doc.definitions[0].selection_set, 1)


async def main():
    out = dict(graphql_core=graphql.__version__, recorded=time.strftime("%Y-%m-%d %H:%M %Z"), n1=[], fanout=[])
    naive, batched = build(False), build(True)
    Q1 = "{ models(first: 20) { name provider { name } } }"
    Q2 = "{ models(first: 20) { name provider { name } evals { score benchmark { name } } } }"
    for label, q in (("models with their provider", Q1), ("models, provider, every eval and its benchmark", Q2)):
        a, ra = await run(naive, q); b, rb = await run(batched, q, True)
        assert ra.data == rb.data
        out["n1"].append(dict(query=q, label=label, naive=a, batched=b, response_bytes=len(json.dumps({"data": ra.data}, separators=(",", ":")))))
    for depth in range(1, 5):
        q = "{ models(first: 3) { name " + "similar(first: 3) { name " * depth + "}" * depth + " } }"
        r, _ = await run(naive, q)
        out["fanout"].append(dict(depth=depth, query=q, static_cost=cost(q), db_calls=r["db_calls"], ms=r["ms"]))
    big = "{ models(first: 20) { name " + "similar(first: 10) { name " * 5 + "}" * 5 + " } }"
    out["limit"] = dict(query=big, static_cost=cost(big), limit=1000, verdict="rejected before execution" if cost(big) > 1000 else "allowed")
    Q3 = "{ models(first: 1) { name evals { score rank } } }"
    r, rr = await run(batched, Q3, True)
    out["partial"] = dict(query=Q3, result=dict(data=rr.data, errors=[dict(message=e.message, path=e.path) for e in rr.errors]),
                          note="graphql-core returns data and errors together; over HTTP a legacy application/json server answers 200")
    full = json.dumps([m for m in MODELS], separators=(",", ":")); slim = json.dumps({"data": {"models": [{"name": m["name"]} for m in MODELS]}}, separators=(",", ":"))
    out["overfetch"] = dict(rest_full_bytes=len(full), graphql_names_bytes=len(slim), fields_full=len(MODELS[0]), note="20 made-up models: a REST list returning every field against a query asking for name only")
    json.dump(out, open(sys.argv[1], "w"), indent=1)
    for x in out["n1"]:
        print(x["label"], "naive", x["naive"]["db_calls"], x["naive"]["ms"], "batched", x["batched"]["db_calls"], x["batched"]["ms"])
    print([(f["depth"], f["static_cost"], f["db_calls"]) for f in out["fanout"]], out["limit"]["static_cost"], out["partial"]["result"], out["overfetch"])

asyncio.run(main())

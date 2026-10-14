"""The cost-per-query model of the Cost calculator tab, in Python (the page's JavaScript implements the same formulas;
check_data.py compares them through the defaults). Prices from inputs/prices.json (published, 2026-10-14).

per query:
  embed    = q_tok * p_embed / 1e6
  rerank   = (q_tok * K + K * chunk_tok) * p_rerank / 1e6                (Voyage's counting rule)
             or requests_price / 1000                                    (per-request pricing)
  generate = ((sys_tok * (1 - cached) + k * chunk_tok + q_tok) * p_in + sys_tok * cached * p_cached + out_tok * p_out) / 1e6
monthly, spread over the month's queries:
  corpus   = N_chunks * chunk_tok * churn * p_embed / 1e6                 (re-embedding what changes each month)
  storage  = N_chunks * dims * 4 bytes / 1e9 * p_gb_month                 (float32 vectors only; index overhead excluded)
"""

DEFAULTS = dict(queries_month=1_000_000, n_chunks=10_000_000, chunk_tok=256, churn=0.05, dims=1536, q_tok=30, K=30, k=5,
                sys_tok=300, sys_cached=1, out_tok=200,
                p_embed=0.02, p_rerank=0.05, p_in=0.25, p_cached=0.025, p_out=2.00, p_gb_month=0.33)


def cost(o):
    q = o["q_tok"]
    embed = q * o["p_embed"] / 1e6
    rerank = (q * o["K"] + o["K"] * o["chunk_tok"]) * o["p_rerank"] / 1e6
    sys_c = o["sys_tok"] if o["sys_cached"] else 0
    gen = ((o["sys_tok"] - sys_c + o["k"] * o["chunk_tok"] + q) * o["p_in"] + sys_c * o["p_cached"] + o["out_tok"] * o["p_out"]) / 1e6
    corpus = o["n_chunks"] * o["chunk_tok"] * o["churn"] * o["p_embed"] / 1e6 / o["queries_month"]
    gb = o["n_chunks"] * o["dims"] * 4 / 1e9
    storage = gb * o["p_gb_month"] / o["queries_month"]
    total = embed + rerank + gen + corpus + storage
    return dict(embed=embed, rerank=rerank, generate=gen, corpus=corpus, storage=storage, total=total, gb=gb,
                initial_embed=o["n_chunks"] * o["chunk_tok"] * o["p_embed"] / 1e6)


if __name__ == "__main__":
    for k, v in cost(DEFAULTS).items():
        print(k, v)

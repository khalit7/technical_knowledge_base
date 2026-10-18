"""What real MoE configs choose: read the router and expert fields of every MoE config.json the root's Architecture map
saved (root src/map/inputs/configs/, fetched 2026-10-18 with revisions in the map's notes), with each model's release date and
published total and active parameters from the map's curated src/map/inputs/facts.yml (vendor figures, sources there).

Run: <venv>/bin/python src/inputs/moe_configs.py  ->  src/inputs/moe_configs.json
Fields are read verbatim; "-" means the config has no such field. Derived columns (k/E, log10 C(E,k), expert width over
d_model, MoE layers) say how they are computed.
"""
import json, math, os
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "map", "inputs"))
facts = [r for r in yaml.safe_load(open(os.path.join(MAP, "facts.yml"))) if r.get("act") and r.get("cfg")]


def first(c, *keys):
    for k in keys:
        if k in c and c[k] is not None:
            return c[k]
    return None


rows = []
for r in facts:
    raw = json.load(open(os.path.join(MAP, "configs", r["cfg"] + ".json")))
    c = raw.get("text_config", raw)
    if "moe" in c and isinstance(c["moe"], dict):                     # Mistral Large 3 native params.json layout
        m = c["moe"]
        c = dict(c, num_local_experts=m.get("num_experts"), num_experts_per_tok=m.get("num_experts_per_tok"),
                 n_shared_experts=m.get("num_shared_experts"), moe_intermediate_size=m.get("expert_hidden_dim"),
                 first_k_dense_replace=m.get("first_k_dense_replace"), hidden_size=c.get("dim"), num_hidden_layers=c.get("n_layers"))
    E = first(c, "n_routed_experts", "num_experts", "num_local_experts")
    k = first(c, "num_experts_per_tok", "num_experts_per_token", "experts_per_token")
    d = first(c, "hidden_size", "d_model", "dim")
    L = first(c, "num_hidden_layers", "n_layers")
    ff = first(c, "moe_intermediate_size", "intermediate_size")
    if c.get("model_type") in ("mixtral", "jamba", "granitemoehybrid"):
        ff = c.get("intermediate_size")
    shared = first(c, "n_shared_experts", "num_shared_experts")
    sh_ff = first(c, "shared_expert_intermediate_size", "moe_shared_expert_intermediate_size", "shared_intermediate_size")
    if shared is None and sh_ff:
        shared = 1
    if c.get("model_type") == "llama4_text":
        shared = 1
    func = first(c, "scoring_func", "moe_router_activation_func")
    if func is None:
        func = {"mixtral": "softmax", "qwen3_moe": "softmax", "qwen2_moe": "softmax", "gpt_oss": "softmax (over the top k)",
                "llama4_text": "sigmoid", "jamba": "softmax", "granitemoehybrid": "softmax", "qwen3_next": "softmax",
                "qwen3_5_moe_text": "softmax", "minimax_m1": "softmax",
                "glm4_moe": "sigmoid", "nemotron_h": "sigmoid"}.get(c.get("model_type"), "-")
    bal = first(c, "topk_method")
    if bal is None and c.get("use_routing_bias"):
        bal = "routing bias"
    aux = first(c, "router_aux_loss_coef", "aux_loss_alpha")
    first_dense = first(c, "first_k_dense_replace")
    lt = c.get("moe_layer_freq")
    if isinstance(lt, list):
        n_moe = sum(1 for v in lt if v)
    elif c.get("model_type") == "llama4_text":
        st = c.get("interleave_moe_layer_step") or 1
        n_moe = len(c.get("moe_layers") or range(st - 1, L, st))
    elif c.get("model_type") == "jamba":
        n_moe = sum(1 for i in range(L) if i % c.get("expert_layer_period", 2) == c.get("expert_layer_offset", 1))
    elif c.get("model_type") == "nemotron_h":
        n_moe = c.get("hybrid_override_pattern", "").count("E")
    else:
        n_moe = L - (first_dense or 0)
    latent = first(c, "moe_latent_size", "routed_expert_hidden_size")
    row = {"id": r["id"], "name": r["n"], "date": str(r["dt"]), "tot": r["tot"], "act": r["act"], "src": r.get("pu"),
           "cfg": r["cfg"], "model_type": c.get("model_type"), "E": E, "k": k, "shared": shared or 0, "expert_ff": ff,
           "shared_ff": sh_ff, "d_model": d, "layers": L, "moe_layers": n_moe, "first_dense": first_dense,
           "router": func, "norm_topk": first(c, "norm_topk_prob", "moe_renormalize"), "balancing": bal or "-",
           "aux_coef": aux, "n_group": first(c, "n_group", "num_expert_group"), "topk_group": first(c, "topk_group"),
           "routed_scale": first(c, "routed_scaling_factor"), "latent": latent, "hash_layers": c.get("num_hash_layers"),
           "expert_dtype": c.get("expert_dtype")}
    if E and k:
        row["k_over_E"] = round(k / E, 4)
        row["log10_combos"] = round(math.log10(math.comb(E, k)), 1)
    if ff and d:
        row["ff_over_d"] = round(ff / d, 3)
    rows.append(row)
rows.sort(key=lambda x: x["date"])
json.dump({"source": "root src/map/inputs (configs fetched 2026-10-18; facts.yml)", "rows": rows},
          open(os.path.join(HERE, "moe_configs.json"), "w"), indent=1)
for x in rows:
    print(f'{x["date"]} {x["name"]:22s} E={x["E"]} k={x["k"]} sh={x["shared"]} ff={x["expert_ff"]} d={x["d_model"]} '
          f'moeL={x["moe_layers"]}/{x["layers"]} {x["router"]} bal={x["balancing"]} aux={x["aux_coef"]} grp={x["n_group"]}/{x["topk_group"]} '
          f'scale={x["routed_scale"]} lat={x["latent"]} hash={x["hash_layers"]}')

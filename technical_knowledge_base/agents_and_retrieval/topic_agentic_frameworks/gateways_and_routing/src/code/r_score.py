"""Score every router task with LiteLLM 1.104.0's complexity router (default config, heuristic scorer, no model calls)."""
import json, sys
from litellm import Router
from litellm.router_strategy.complexity_router.complexity_router import ComplexityRouter
r = Router(model_list=[{"model_name": "x", "litellm_params": {"model": "openai/x", "api_key": "x", "api_base": "http://127.0.0.1:9/v1"}}])
cr = ComplexityRouter(model_name="auto", litellm_router_instance=r, complexity_router_config={"default_model": "x"}, derive_savings_baseline=False)
T = json.load(open(sys.argv[1]))
for t in T:
    tier, score, sig = cr.classify(t["q"])
    t["cr_tier"], t["cr_score"], t["cr_signals"] = str(tier.value if hasattr(tier, "value") else tier), round(score, 4), list(sig)
json.dump(T, open(sys.argv[1], "w"), indent=1)
import collections
print(collections.Counter((t["family"], t["cr_tier"]) for t in T))

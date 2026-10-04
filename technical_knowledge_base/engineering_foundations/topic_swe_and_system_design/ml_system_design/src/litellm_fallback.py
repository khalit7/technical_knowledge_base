"""Real LiteLLM Router behaviour, no network: mock responses stand in for providers.
Run: LITELLM_LOCAL_MODEL_COST_MAP=True uv run --no-project --with litellm==1.104.0 python litellm_fallback.py"""
import os, time, json, asyncio
os.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "True")
import litellm
from litellm import Router
from litellm.integrations.custom_logger import CustomLogger

events = []
class Log(CustomLogger):
    def log_pre_api_call(self, model, messages, kwargs):
        events.append(("call", kwargs.get("litellm_params", {}).get("model_info", {}).get("id") or model))
    def log_failure_event(self, kwargs, response_obj, start_time, end_time):
        events.append(("fail", kwargs.get("model"), type(kwargs.get("exception")).__name__))
    def log_success_event(self, kwargs, response_obj, start_time, end_time):
        events.append(("ok", kwargs.get("model"), kwargs.get("response_cost")))
litellm.callbacks = [Log()]

model_list = [
    {"model_name": "chat-big", "litellm_params": {"model": "anthropic/claude-sonnet-4-5", "api_key": "x",
        "mock_response": "litellm.RateLimitError"}},
    {"model_name": "chat-fallback", "litellm_params": {"model": "openai/gpt-4o", "api_key": "x", "mock_response": "Hello from the fallback provider."}},
    {"model_name": "chat-small", "litellm_params": {"model": "anthropic/claude-haiku-4-5", "api_key": "x",
        "mock_response": "litellm.ContextWindowExceededError"}},
    {"model_name": "chat-long", "litellm_params": {"model": "anthropic/claude-sonnet-4-5", "api_key": "x", "mock_response": "Answer from the long-context model."}},
]
router = Router(model_list=model_list, num_retries=1, retry_after=0,
                fallbacks=[{"chat-big": ["chat-fallback"]}],
                context_window_fallbacks=[{"chat-small": ["chat-long"]}],
                allowed_fails=3, cooldown_time=5)
out = {"litellm_version": litellm.__version__ if hasattr(litellm, "__version__") else None}
try:
    from importlib.metadata import version
    out["litellm_version"] = version("litellm")
except Exception as e:
    pass
msgs = [{"role": "user", "content": "Summarise my last order."}]
for name in ["chat-big", "chat-small"]:
    events.clear()
    t = time.time()
    try:
        r = router.completion(model=name, messages=msgs)
        res = {"served_by": r.model, "text": r.choices[0].message.content, "usage": dict(r.usage) if r.usage else None,
               "hidden": {k: str(v) for k, v in (r._hidden_params or {}).items() if k in ("model_id", "response_cost", "api_base", "litellm_model_name")}}
    except Exception as e:
        res = {"error": type(e).__name__, "msg": str(e)[:200]}
    time.sleep(0.5)
    res["seconds"] = round(time.time() - t, 3)
    res["events"] = [list(map(str, e)) for e in events]
    out[name] = res
# cost map entries the gateway would use for accounting
mc = litellm.model_cost
out["prices_per_million"] = {m: {"in": round(mc[m].get("input_cost_per_token", 0) * 1e6, 4), "out": round(mc[m].get("output_cost_per_token", 0) * 1e6, 4),
                                  "cache_read": round((mc[m].get("cache_read_input_token_cost") or 0) * 1e6, 4),
                                  "cache_write": round((mc[m].get("cache_creation_input_token_cost") or 0) * 1e6, 4)}
                              for m in ["claude-sonnet-4-5", "claude-haiku-4-5", "gpt-4o"] if m in mc}
out["cost_example"] = litellm.completion_cost(model="claude-sonnet-4-5", prompt="x " * 1000, completion="y " * 400) if "claude-sonnet-4-5" in mc else None
print(json.dumps(out, indent=1, default=str))

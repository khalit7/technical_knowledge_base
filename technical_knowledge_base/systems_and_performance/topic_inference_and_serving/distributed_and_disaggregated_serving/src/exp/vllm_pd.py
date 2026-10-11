"""vLLM v0.31.0 (CPU image) prefill/decode disaggregation through a KV connector, offline, as in
examples/disaggregated/example_connector but timed. Run inside the container, one phase per process:
  python3 vllm_pd.py prefill  OUT   prefill instance: max_tokens 1, ExampleConnector saves every layer's KV to OUT/kv
  python3 vllm_pd.py decode   OUT   decode instance: loads the saved KV through the connector, generates 32 tokens
  python3 vllm_pd.py baseline OUT   no connector: the decode instance computes the prompt itself
Writes OUT/<phase>.json (wall times, prompt and output token counts, the generated text).
"""
import json, os, sys, time, random
from vllm import LLM, SamplingParams
from vllm.config import KVTransferConfig
def main():
    phase, out = sys.argv[1], sys.argv[2]

    WORDS = ("the of and to in a is that for it as was with be by on not he this are or his from at which but have an they "
             "you were her she there been one all we their has would when if more no out so said what up its about into than").split()
    rng = random.Random(7)
    prompts = [" ".join(rng.choice(WORDS) for _ in range(n)) + " Summarise the text above in one sentence:"
               for n in (900, 900, 1800, 1800)]
    kw = dict(model="/models/Qwen3-0.6B", dtype="float32", max_model_len=4096, enforce_eager=True, seed=0)
    if phase != "baseline":
        kw["kv_transfer_config"] = KVTransferConfig(kv_connector="ExampleConnector", kv_role="kv_both",
                                                    kv_connector_extra_config={"shared_storage_path": os.path.join(out, "kv")})
    t0 = time.perf_counter()
    llm = LLM(**kw)
    t_load = time.perf_counter() - t0
    sp = SamplingParams(temperature=0, max_tokens=1 if phase == "prefill" else 32)
    llm.generate(["warm up"], SamplingParams(max_tokens=2))  # first call compiles; its KV is tiny and not reused
    res = []
    for p in prompts:  # one at a time so each wall time is one request
        t = time.perf_counter()
        o = llm.generate([p], sp)[0]
        res.append(dict(wall=time.perf_counter() - t, n_prompt=len(o.prompt_token_ids), n_out=len(o.outputs[0].token_ids),
                        text=o.outputs[0].text[:200], ttft=getattr(getattr(o, "metrics", None), "first_token_latency", None)))
    json.dump(dict(phase=phase, t_load=t_load, res=res), open(os.path.join(out, phase + ".json"), "w"), indent=1)
    print(json.dumps(dict(phase=phase, walls=[round(r["wall"], 3) for r in res], n=[r["n_prompt"] for r in res])))


if __name__ == "__main__":
    main()

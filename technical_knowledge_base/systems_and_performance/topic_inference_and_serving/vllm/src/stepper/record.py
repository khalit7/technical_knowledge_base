"""Record vLLM v0.31.0's real scheduler and KV cache manager, step by step, while the real engine serves
Qwen3-0.6B on CPU. Runs inside vllm/vllm-openai-cpu:v0.31.0-arm64 (see run_trace.sh).

The engine core runs in-process (VLLM_ENABLE_V1_MULTIPROCESSING=0) so the scheduler object can be read
after every step. Nothing in vLLM is changed: schedule() and update_from_output() are wrapped only to copy
out state.

usage: python record.py <out.json> <scenario-name> <num_blocks> <prefix_caching 0|1> <budget> [max_num_seqs] [max_tokens] [ignore_eos 0|1]
"""
import json, os, sys, time
os.environ["VLLM_ENABLE_V1_MULTIPROCESSING"] = "0"
os.environ.setdefault("PYTHONHASHSEED", "0")
from vllm import LLM, SamplingParams  # noqa: E402

out_path, scen, nblocks, pc, budget = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4] == "1", int(sys.argv[5])
maxseq = int(sys.argv[6]) if len(sys.argv) > 6 else 4
BS = 32          # the CPU attention backend needs a multiple of 32 (GPUs default to 16)
MAXTOK = int(sys.argv[7]) if len(sys.argv) > 7 else 24
MODEL = "/models/Qwen3-0.6B"

SYSTEM = ("You are Aria, the assistant of a small bicycle shop in Leeds. The shop repairs road, mountain, "
          "hybrid and electric bikes, sells parts and accessories, and runs free safety checks for children's "
          "bikes on Saturdays. Answer in one or two short sentences, be friendly and practical, suggest booking "
          "a repair when a job needs tools, and never invent prices or opening hours you were not given.")
USERS = {
    "A": "How do I fix a flat tyre?",
    "B": "What frame size suits a rider who is 180 cm tall?",
    "C": "Do you sell batteries for electric bikes?",
    "D": "Can I bring my child's bike in for a safety check?",
}
FOLLOW = "And how long does that usually take?"

llm = LLM(model=MODEL, dtype="float32", block_size=BS, num_gpu_blocks_override=nblocks,
          enable_prefix_caching=pc, max_num_batched_tokens=budget, max_num_seqs=maxseq,
          max_model_len=320, seed=0, enforce_eager=True)
eng = llm.llm_engine
tok = eng.get_tokenizer()
core = eng.engine_core.engine_core
sched = core.scheduler
kvm = sched.kv_cache_manager
pool = kvm.block_pool


def chat(msgs):
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    return list(tok.encode(text, add_special_tokens=False))


def hx(h):
    return None if h is None else bytes(h)[:4].hex()


def snap():
    blocks = [[b.block_id, b.ref_cnt, hx(b.block_hash)] for b in pool.blocks if not b.is_null]
    free = [b.block_id for b in pool.free_block_queue.get_all_free_blocks()]
    reqs = {}
    for rid, r in sched.requests.items():
        try:
            bids = list(kvm.get_block_ids(rid)[0])
        except Exception:
            bids = []
        reqs[rid] = {"st": r.status.name, "nc": r.num_computed_tokens, "nt": r.num_tokens,
                     "np": r.num_prompt_tokens, "nout": r.num_output_tokens, "blk": bids,
                     "npre": r.num_preemptions, "nh": len(r.block_hashes)}
    return {"blocks": blocks, "free": free, "reqs": reqs,
            "running": [r.request_id for r in sched.running],
            "waiting": [r.request_id for r in sched.waiting],
            "usage": round(kvm.usage, 4)}


steps, cur = [], {}
orig_schedule, orig_update = sched.schedule, sched.update_from_output


def w_schedule(*a, **k):
    pre = snap()
    so = orig_schedule(*a, **k)
    cur.clear()
    cur.update(pre=pre, tokens=dict(so.num_scheduled_tokens),
               new=[[nr.req_id, nr.num_computed_tokens] for nr in so.scheduled_new_reqs],
               preempted=sorted(so.preempted_req_ids or []), sched=snap(), t0=time.perf_counter())
    return so


def w_update(so, mo):
    res = orig_update(so, mo)
    cur["dt"] = time.perf_counter() - cur["t0"]
    cur["post"] = snap()
    cur["finished"] = [o.request_id for eo in res.values() for o in eo.outputs if o.finish_reason is not None]
    steps.append(dict(cur))
    return res


sched.schedule, sched.update_from_output = w_schedule, w_update
IGNORE_EOS = len(sys.argv) > 8 and sys.argv[8] == "1"  # forces every answer to MAXTOK tokens
sp = SamplingParams(temperature=0.0, max_tokens=MAXTOK, seed=0, ignore_eos=IGNORE_EOS)
prompts, answers, convs = {}, {}, {}


def add(name, msgs, step_no):
    ids = chat(msgs)
    prompts[name] = {"ids": ids, "added_at_step": step_no}
    convs[name] = msgs
    eng.add_request(name, {"prompt_token_ids": ids}, sp)


# arrivals, in engine steps: A and B at 0, C at 3, D at 6; A's second turn as soon as A finishes
plan = {0: ["A", "B"], 3: ["C"], 6: ["D"]}
added_follow, step_no = False, 0
while step_no <= 400:
    for n in plan.get(step_no, []):
        add(n, [{"role": "system", "content": SYSTEM}, {"role": "user", "content": USERS[n]}], step_no)
    if not eng.has_unfinished_requests():
        if step_no > max(plan):
            break
        step_no += 1
        continue
    for o in eng.step():
        if o.finished:
            answers[o.request_id] = {"text": o.outputs[0].text, "ids": list(o.outputs[0].token_ids)}
            if o.request_id == "A" and not added_follow:
                added_follow = True
                add("A2", convs["A"] + [{"role": "assistant", "content": o.outputs[0].text},
                                       {"role": "user", "content": FOLLOW}], step_no + 1)
    step_no += 1

reqtok = {}
for name, p in prompts.items():
    ids = p["ids"] + answers.get(name, {}).get("ids", [])
    reqtok[name] = {"n_prompt": len(p["ids"]), "pieces": [tok.decode([i]) for i in ids],
                    "added_at_step": p["added_at_step"], "answer": answers.get(name, {}).get("text")}

import vllm  # noqa: E402
cfg = {"scenario": scen, "num_blocks_override": nblocks, "block_size": BS, "enable_prefix_caching": pc,
       "max_num_batched_tokens": budget, "max_num_seqs": maxseq, "max_tokens": MAXTOK, "ignore_eos": IGNORE_EOS, "model": "Qwen/Qwen3-0.6B",
       "dtype": "float32", "vllm": vllm.__version__, "real_num_blocks": pool.num_gpu_blocks,
       "chunked_prefill": sched.scheduler_config.enable_chunked_prefill,
       "async_scheduling": sched.scheduler_config.async_scheduling,
       "hash_algo": eng.vllm_config.cache_config.prefix_caching_hash_algo}
json.dump({"config": cfg, "steps": steps, "requests": reqtok, "system": SYSTEM, "users": USERS, "follow": FOLLOW},
          open(out_path, "w"))
print("steps", len(steps), "requests", list(reqtok), file=sys.stderr)

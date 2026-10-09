"""The M1 experiments against a running SGLang server (see run_m1.sh for the server flags of each).
Usage: exp.py <experiment> <label> <out.json>
  sched   64 questions about 8 documents, all sent at once in a shuffled order (scheduling policies)
  multiturn 8 conversations x 4 turns sharing a 600-token system prompt, closed loop (radix cache on/off)
  overlap concurrency 1, 4 and 8 x 32 requests of 128 in / 128 out (overlap scheduler on/off)
  json    12 requests with and without a JSON schema (structured output cost)
Every experiment runs a warm-up first (no cache flush; see warmup) and records the machine's load average before and after.
"""
import asyncio, json, os, random, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sgclient as C


def slices(ids, n, length, start):
    return [ids[start + i * length: start + (i + 1) * length] for i in range(n)]


async def warmup(s, ids):
    # distinct text from the experiments (positions 150,000+), so the warm-up leaves nothing they could reuse;
    # no /flush_cache: on the MLX backend a flush followed by a burst of requests crashed the server here
    for k, L in enumerate((32, 128, 512, 900, 1200)):
        await C.generate(s, ids[150000 + 3000 * k:150000 + 3000 * k + L], 8)
    await asyncio.gather(*[C.generate(s, ids[170000 + 300 * i:170000 + 300 * i + 200], 16) for i in range(4)])


async def exp_sched(s, ids):
    docs = slices(ids, 8, 800, 0)
    qs = slices(ids, 64, 40, 20000)
    reqs = [{'doc': i % 8, 'q': i} for i in range(64)]
    random.Random(1).shuffle(reqs)
    t0 = time.perf_counter()
    async def one(k, r):
        await asyncio.sleep(0.002 * k)          # keep the shuffled order on arrival
        res = await C.generate(s, docs[r['doc']] + qs[r['q']], 16, t0=t0)
        res.update(r); res.pop('output_ids', None); res.pop('text', None)
        return res
    out = await asyncio.gather(*[one(k, r) for k, r in enumerate(reqs)])
    return {'requests': out, 'makespan': time.perf_counter() - t0}


async def exp_multiturn(s, ids, tok):
    sysp = ids[30000:30600]
    rng = random.Random(2)
    t0 = time.perf_counter()
    async def conv(c):
        hist = list(sysp)
        rows = []
        for turn in range(4):
            U = rng.randint(60, 120)
            st = 40000 + c * 2000 + turn * 400
            prompt = hist + ids[st:st + U]
            r = await C.generate(s, prompt, 64, t0=t0)
            hist = prompt + r['output_ids']
            r.update({'conv': c, 'turn': turn}); r.pop('output_ids', None); r.pop('text', None)
            rows.append(r)
        return rows
    out = await asyncio.gather(*[conv(c) for c in range(8)])
    return {'requests': [r for rows in out for r in rows], 'makespan': time.perf_counter() - t0}


async def exp_overlap(s, ids):
    res = {}
    for conc in (1, 4, 8):
        prompts = slices(ids, 32, 128, 60000 + conc * 5000)
        sem = asyncio.Semaphore(conc)
        t0 = time.perf_counter()
        async def one(p):
            async with sem:
                r = await C.generate(s, p, 128, t0=t0)
                r.pop('output_ids', None); r.pop('text', None)
                return r
        out = await asyncio.gather(*[one(p) for p in prompts])
        res[str(conc)] = {'requests': out, 'makespan': time.perf_counter() - t0}
    return res


SCHEMA = {"type": "object", "properties": {
    "name": {"type": "string", "maxLength": 40}, "city": {"type": "string", "maxLength": 30},
    "age": {"type": "integer", "minimum": 0, "maximum": 120},
    "skills": {"type": "array", "items": {"type": "string", "maxLength": 20}, "maxItems": 4}},
    "required": ["name", "city", "age", "skills"], "additionalProperties": False}


async def exp_json(s, ids, tok):
    res = {}
    msgs = [f"Invent a person who lives in a city and knows a few skills; reply in JSON. Person number {i}." for i in range(12)]
    for mode in ('free', 'schema', 'free', 'schema'):
        rows = []
        for i, m in enumerate(msgs):
            text = tok.apply_chat_template([{"role": "user", "content": m}], tokenize=False, add_generation_prompt=True,
                                           enable_thinking=False)
            p = tok.encode(text, add_special_tokens=False)
            extra = {'sampling_params': {'ignore_eos': False}}
            if mode == 'schema':
                extra['sampling_params']['json_schema'] = json.dumps(SCHEMA)
            r = await C.generate(s, list(p), 160, extra=extra)
            txt = r['text']
            try:
                json.loads(txt); valid = True
            except Exception:
                valid = False
            r.pop('output_ids', None)
            r['valid_json'] = valid
            r['text'] = txt[:300]
            rows.append(r)
        res.setdefault(mode, []).append(rows)
    return res


async def main():
    exp, label, outp = sys.argv[1], sys.argv[2], sys.argv[3]
    tok, ids = C.load_corpus(200_000)
    la0 = C.load_avg()
    async with C.session() as s:
        await warmup(s, ids)
        if exp == 'sched':
            r = await exp_sched(s, ids)
        elif exp == 'multiturn':
            r = await exp_multiturn(s, ids, tok)
        elif exp == 'overlap':
            r = await exp_overlap(s, ids)
        elif exp == 'json':
            r = await exp_json(s, ids, tok)
    r.update({'experiment': exp, 'label': label, 'load_before': la0, 'load_after': C.load_avg(),
              'when': time.strftime('%Y-%m-%d %H:%M:%S')})
    json.dump(r, open(outp, 'w'), indent=0)
    print(exp, label, 'done', r.get('makespan'))

asyncio.run(main())

"""Async client for SGLang's native /generate endpoint (streaming), shared by the M1 experiments.

Prompts are sent as token ids (input_ids) cut from WikiText-2 test text, so prompt lengths are exact.
Every result records TTFT (time to the first streamed chunk), the arrival time of every chunk,
the server's cached_tokens (prefix-cache hit) and the output ids.
Environment: SG_PORT (default 8120), SG_MODEL (model folder, for the tokenizer), SG_WIKI (wiki.test.raw).
"""
import asyncio, json, os, time
import aiohttp

PORT = int(os.environ.get("SG_PORT", "8120"))
URL = f"http://127.0.0.1:{PORT}/generate"


def load_corpus(n_tokens=200_000):
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(os.environ["SG_MODEL"])
    text = open(os.environ["SG_WIKI"], encoding="utf-8").read()
    ids = tok.encode(text[: n_tokens * 6], add_special_tokens=False)[:n_tokens]
    return tok, ids


async def generate(session, input_ids, max_new, extra=None, t0=None):
    body = {"input_ids": input_ids, "stream": True,
            "sampling_params": {"max_new_tokens": max_new, "temperature": 0, "ignore_eos": True}}
    if extra:
        body["sampling_params"].update(extra.get("sampling_params", {}))
        for k, v in extra.items():
            if k != "sampling_params":
                body[k] = v
    t_send = time.perf_counter()
    times, last = [], None
    async with session.post(URL, json=body) as r:
        if r.status != 200:
            raise RuntimeError(f'HTTP {r.status}: {(await r.text())[:300]}')
        buf = b""
        async for chunk in r.content:
            buf += chunk
            while b"\n\n" in buf:
                line, buf = buf.split(b"\n\n", 1)
                line = line.strip()
                if not line.startswith(b"data:"):
                    continue
                payload = line[5:].strip()
                if payload == b"[DONE]":
                    continue
                d = json.loads(payload)
                n = len(d.get("output_ids") or [])
                now = time.perf_counter()
                if not times or n > times[-1][1]:
                    times.append((now, n))
                last = d
    t_end = time.perf_counter()
    m = last["meta_info"]
    ttft = times[0][0] - t_send if times else None
    return {"send": t_send - (t0 or t_send), "ttft": ttft, "e2e": t_end - t_send,
            "prompt_tokens": m["prompt_tokens"], "cached_tokens": m["cached_tokens"],
            "completion_tokens": m["completion_tokens"], "output_ids": last.get("output_ids"),
            "text": last.get("text"), "chunks": [(round(t - t_send, 5), n) for t, n in times]}


async def flush_cache(session):
    async with session.post(f"http://127.0.0.1:{PORT}/flush_cache") as r:
        return r.status


def session():
    return aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3600))


def load_avg():
    return [round(x, 2) for x in os.getloadavg()]

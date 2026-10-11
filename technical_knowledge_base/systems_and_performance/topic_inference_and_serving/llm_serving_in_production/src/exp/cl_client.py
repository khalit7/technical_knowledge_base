"""Closed-loop client for llama-server's chat endpoint (standard library only), used for the multi-LoRA and
structured-output runs (ENGINE=vllm for vLLM's server, where predicted_ms is the whole request time). C workers each send R requests back to back (non-streaming); llama-server's own
timings (prompt_n, prompt_ms, predicted_n, predicted_ms) are recorded per request.

modes
  base          no adapter field in the request (llama-server then applies every loaded adapter at its load-time scale)
  zero          adapter 0 at scale 0 listed, so every loaded adapter is off
  same          every request asks for adapter 0 at scale 1
  distinct:K    worker w asks for adapter w mod K (K different adapters in flight)
  schema        response_format json_schema (grammar-constrained decoding)
  free          the same prompt with no constraint (control for schema)
usage: python3 -I cl_client.py <port> <mode> <conc> <reqs_per_worker> <max_tokens> <out.json>
"""
import http.client, json, os, sys, threading, time

VLLM = os.environ.get('ENGINE') == 'vllm'   # vLLM's OpenAI server: no timings in the reply, usage instead

SCHEMA = {"type": "object", "properties": {
    "name": {"type": "string"}, "age": {"type": "integer"}, "city": {"type": "string"},
    "skills": {"type": "array", "items": {"type": "string"}, "maxItems": 4}},
    "required": ["name", "age", "city", "skills"], "additionalProperties": False}
TOPICS = ['a nurse in Lagos', 'a chef in Lyon', 'a pilot in Osaka', 'a teacher in Lima', 'a welder in Detroit',
          'a farmer in Punjab', 'a coder in Tallinn', 'a baker in Naples', 'a miner in Perth', 'a poet in Dublin']


def body(mode, w, i, max_tokens):
    t = TOPICS[(w * 7 + i) % len(TOPICS)]
    if mode in ('schema', 'free'):
        msg = 'Invent a person who is ' + t + '. Reply with only a JSON object with keys name, age, city, skills (a list of up to 4 strings).'
    else:
        msg = 'Write a short story about ' + t + '.'
    b = {'messages': [{'role': 'user', 'content': msg}], 'max_tokens': max_tokens, 'temperature': 0.0,
         'chat_template_kwargs': {'enable_thinking': False}}
    if mode in ('base', 'same', 'zero') or mode.startswith('distinct'):
        b['ignore_eos'] = True
    if mode == 'same':
        b['lora'] = [{'id': 0, 'scale': 1.0}]
    elif mode == 'zero':   # adapters loaded, none active: llama-server applies every loaded adapter at its load scale unless the request lists some
        b['lora'] = [{'id': 0, 'scale': 0.0}]
    elif mode.startswith('distinct'):
        k = int(mode.split(':')[1])
        b['lora'] = [{'id': w % k, 'scale': 1.0}]
    elif mode == 'schema':
        b['response_format'] = {'type': 'json_schema', 'json_schema': {'name': 'person', 'schema': SCHEMA}}
    if VLLM:
        # vLLM selects an adapter by model name (--lora-modules lora1=... lora8=...); 'base' is the served base model
        b.pop('lora', None)
        b['model'] = 'base'
        if mode == 'same':
            b['model'] = 'lora1'
        elif mode.startswith('distinct'):
            b['model'] = 'lora%d' % (w % int(mode.split(':')[1]) + 1)
    return b


def valid(txt):
    try:
        d = json.loads(txt)
    except Exception:
        return False
    return (isinstance(d, dict) and set(d) == {'name', 'age', 'city', 'skills'} and isinstance(d['age'], int)
            and isinstance(d['skills'], list) and len(d['skills']) <= 4)


def main():
    port, mode, C, R, mt, out = int(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
    res, t0 = [], time.monotonic()
    la0 = os.getloadavg()[0]

    def worker(w):
        c = http.client.HTTPConnection('127.0.0.1', port, timeout=900)
        for i in range(R):
            s = time.monotonic()
            c.request('POST', '/v1/chat/completions', json.dumps(body(mode, w, i, mt)), {'Content-Type': 'application/json'})
            d = json.loads(c.getresponse().read())
            e = time.monotonic()
            tm = d.get('timings', {})
            if VLLM and 'usage' in d:
                tm = {'prompt_n': d['usage'].get('prompt_tokens'), 'predicted_n': d['usage'].get('completion_tokens'), 'predicted_ms': (e - s) * 1000}
            txt = d['choices'][0]['message'].get('content', '') if 'choices' in d else ''
            rec = {'w': w, 'i': i, 'start': round(s - t0, 4), 'e2e': round(e - s, 4), 'prompt_n': tm.get('prompt_n'), 'prompt_ms': tm.get('prompt_ms'),
                   'pred_n': tm.get('predicted_n'), 'pred_ms': tm.get('predicted_ms'), 'err': d.get('error')}
            if mode in ('schema', 'free'):
                rec['valid'] = valid(txt); rec['text'] = txt[:300]
            res.append(rec)
        c.close()
    th = [threading.Thread(target=worker, args=(w,)) for w in range(C)]
    for t in th:
        t.start()
    for t in th:
        t.join()
    wall = time.monotonic() - t0
    toks = sum(r['pred_n'] or 0 for r in res)
    s = {'mode': mode, 'conc': C, 'reqs': len(res), 'wall_s': round(wall, 3), 'out_tok_per_s': round(toks / wall, 2),
         'ms_per_tok_median': sorted((r['pred_ms'] or 0) / max(1, r['pred_n'] or 1) for r in res)[len(res) // 2],
         'loadavg_before': round(la0, 2), 'loadavg_after': round(os.getloadavg()[0], 2)}
    if mode in ('schema', 'free'):
        s['valid'] = sum(1 for r in res if r['valid'])
    json.dump({'summary': s, 'requests': res}, open(out, 'w'))
    print(json.dumps(s))


if __name__ == '__main__':
    main()

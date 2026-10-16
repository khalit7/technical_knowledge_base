"""Rephrase running-example web documents with a local Qwen3 model in WRAP's four styles (Maini et al. 2024, App. G).
Talks to a llama-server (llama.cpp) already running on 127.0.0.1:<port> (see run_pending.sh, which starts it on the
GPU; the CPU smoke test starts it with -ngl 0). Thinking is switched off (Qwen3 chat template, enable_thinking=false).
Input: the FineWeb rows of the running example's WARC file (CC-MAIN-2024-30, file 00000), 200 documents of 150 to 700
words chosen with a fixed seed; each is cut to its first segment of at most 300 words (WRAP caps output at 300 tokens and
rephrases segments). Sampling: temperature 0.5, top-p 0.9 (Nemotron-CC's published settings), max 450 new tokens.
usage: DC_SCRATCH=<scratch>/dc python -I run_rephrase.py <out.jsonl> [n_docs] [port] [model_label] [parallel requests, default 1]
Resumable: documents already in <out.jsonl> are skipped.
"""
import os, sys, json, random, re, time, urllib.request
import pyarrow.parquet as pq

D = os.path.join(os.environ['DC_SCRATCH'], 'data')
OUT = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 200
PORT = sys.argv[3] if len(sys.argv) > 3 else '8091'; LABEL = sys.argv[4] if len(sys.argv) > 4 else 'qwen3'
PAR = int(sys.argv[5]) if len(sys.argv) > 5 else 1
SYS = ("A chat between a curious user and an artificial intelligence assistant. The assistant gives helpful, detailed, "
       "and polite answers to the questions.")  # WRAP's Vicuna-style system line (App. G)
STYLES = {  # WRAP, Appendix G, verbatim
    'easy': "For the following paragraph give me a paraphrase of the same using a very small vocabulary and extremely simple sentences that a toddler will understand:",
    'medium': "For the following paragraph give me a diverse paraphrase of the same in high quality English language as in sentences on Wikipedia:",
    'hard': "For the following paragraph give me a paraphrase of the same using very terse and abstruse language that only an erudite scholar will understand. Replace simple words and phrases with rare and complex ones:",
    'qa': 'Convert the following paragraph into a conversational format with multiple tags of "Question:" followed by "Answer:":',
}
PII = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d ()-]{8,}\d')

def pick():
    t = pq.read_table(f'{D}/curated/fineweb_CC-MAIN-20240712094214-20240712124214-00000.parquet', columns=['id', 'url', 'text']).to_pylist()
    ok = [r for r in t if 150 <= len(r['text'].split()) <= 700 and not PII.search(r['text'])]
    random.Random(2024).shuffle(ok)
    out = []
    for r in ok[:N]:
        w = r['text'].split(); seg = ' '.join(w[:300])
        out.append(dict(id=r['id'], url=r['url'], source=seg))
    return out

def chat(prompt):
    body = dict(messages=[{'role': 'system', 'content': SYS}, {'role': 'user', 'content': prompt}], temperature=0.5, top_p=0.9,
                max_tokens=450, chat_template_kwargs={'enable_thinking': False})
    req = urllib.request.Request(f'http://127.0.0.1:{PORT}/v1/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    t0 = time.time(); r = json.load(urllib.request.urlopen(req, timeout=900))
    txt = r['choices'][0]['message']['content']
    txt = re.sub(r'<think>.*?</think>\s*', '', txt, flags=re.S).strip()
    return txt, r.get('usage', {}), round(time.time() - t0, 2)

done = set()
if os.path.exists(OUT):
    done = {(json.loads(l)['id'], json.loads(l)['style']) for l in open(OUT)}
import threading
from concurrent.futures import ThreadPoolExecutor
todo = [(d, st, p) for d in pick() for st, p in STYLES.items() if (d['id'], st) not in done]
wl = threading.Lock()
def job(a):
    d, st, p = a
    txt, use, sec = chat(p + '\n\n' + d['source'])
    rec = dict(id=d['id'], url=d['url'], style=st, model=LABEL, source=d['source'], output=txt,
               completion_tokens=use.get('completion_tokens'), seconds=sec)
    with wl:
        with open(OUT, 'a') as f: f.write(json.dumps(rec) + '\n')
        print(d['id'][:30], st, use.get('completion_tokens'), sec, flush=True)
with ThreadPoolExecutor(PAR) as ex:
    list(ex.map(job, todo))

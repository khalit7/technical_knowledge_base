"""Cold-start timing for llama-server (standard library only).

For each model file and repeat: optionally make a fresh APFS clone of the GGUF (cp -c: same disk blocks, new
file, so none of its pages are in the page cache and the load really reads the SSD; macOS `purge` needs root),
start llama-server on port 8165, poll /health every 20 ms until it answers 200 (process start -> ready),
then time one streamed request to its first token and its 32nd. Stops the server, deletes the clone.
usage: PR_CLONE_DIR=<dir on the same APFS volume> python3 -I cold_start.py <out.json> <repeats> <cold|warm> <gguf> [<gguf> ...]
"""
import http.client, json, os, subprocess, sys, time

PORT = 8165


def health():
    try:
        c = http.client.HTTPConnection('127.0.0.1', PORT, timeout=1)
        c.request('GET', '/health'); s = c.getresponse().status; c.close(); return s == 200
    except OSError:
        return False


def first_tokens():
    c = http.client.HTTPConnection('127.0.0.1', PORT, timeout=120)
    s = time.monotonic()
    c.request('POST', '/completion', json.dumps({'prompt': 'The capital of France is', 'n_predict': 32, 'stream': True, 'ignore_eos': True}),
              {'Content-Type': 'application/json'})
    r = c.getresponse(); first = None; n = 0
    while True:
        line = r.readline()
        if not line:
            break
        if line.startswith(b'data: '):
            d = json.loads(line[6:]); n += 1
            if first is None:
                first = time.monotonic() - s
            if d.get('stop'):
                break
    return first, time.monotonic() - s


def main():
    out, R, mode, files = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4:]
    res = []
    for r in range(R):
        for f in files:
            path = f
            if mode == 'cold':
                path = os.path.join(os.environ['PR_CLONE_DIR'], 'clone_' + os.path.basename(f))
                subprocess.run(['cp', '-c', f, path], check=True)
            la = os.getloadavg()[0]
            t0 = time.monotonic()
            p = subprocess.Popen(['llama-server', '-m', path, '-ngl', '99', '-fa', 'on', '-np', '1', '-c', '4096', '--port', str(PORT), '--host', '127.0.0.1'],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            while not health():
                if p.poll() is not None or time.monotonic() - t0 > 300:
                    break
                time.sleep(0.02)
            ready = time.monotonic() - t0
            ft, t32 = first_tokens()
            p.terminate(); p.wait()
            if mode == 'cold':
                os.remove(path)
            rec = {'model': os.path.basename(f), 'bytes': os.path.getsize(f), 'mode': mode, 'rep': r + 1, 'ready_s': round(ready, 3),
                   'first_token_s': round(ft, 4), 'tokens32_s': round(t32, 4), 'loadavg': round(la, 2)}
            print(json.dumps(rec), flush=True)
            res.append(rec)
            time.sleep(1)
    json.dump(res, open(out, 'w'), indent=0)


if __name__ == '__main__':
    main()

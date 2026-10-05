"""Where the reference Python program spends its time, stage by stage, in one process.
Each stage runs as its own pass over all lines so it can be timed alone; prints JSON.
Medians of 5 repeats (seconds for the whole 200,000-line file)."""
import json
import re
import statistics
import sys
import time

TOKEN = re.compile(r"[A-Za-z0-9]+")


def tokens(text):
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def timed(f, rep=5):
    ts = []
    for _ in range(rep):
        t0 = time.perf_counter()
        r = f()
        ts.append(time.perf_counter() - t0)
    return statistics.median(ts), r


def main(path):
    out = {"python": sys.version.split()[0]}
    out["read_lines_s"], lines = timed(lambda: open(path, encoding="utf-8").readlines())
    out["bytes_read"] = sum(len(s.encode()) for s in lines)

    def parse_all():
        recs = []
        for line in lines:
            try:
                recs.append(json.loads(line))
            except ValueError:
                pass
        return recs

    out["json_loads_s"], recs = timed(parse_all)
    good = [(r["user"], r["text"]) for r in recs if isinstance(r, dict)
            and isinstance(r.get("user"), str) and isinstance(r.get("text"), str)]
    out["messages"] = len(good)
    out["text_chars"] = sum(len(t) for _, t in good)
    out["tokens_loop_s"], counts = timed(lambda: [tokens(t) for _, t in good])
    out["tokens_regex_s"], counts2 = timed(lambda: [len(TOKEN.findall(t)) for _, t in good])
    assert counts == counts2

    def tally():
        d = {}
        for (u, _), n in zip(good, counts):
            d[u] = d.get(u, 0) + n
        return d

    out["dict_tally_s"], d = timed(tally)
    out["tokens_total"] = sum(d.values())
    # one character through the loop: bytecode instructions executed per character
    # bytecode instructions the interpreter executes per character of the loop, counted by tracing
    sample = "café v2.1 x86_64 tokens"
    seen = []

    def tracer(frame, event, arg):
        if frame.f_code is tokens.__code__:
            frame.f_trace_opcodes = True
            if event == "opcode":
                seen.append(frame.f_code.co_code[frame.f_lasti])
        return tracer

    sys.settrace(tracer)
    tokens(sample)
    sys.settrace(None)
    import dis
    names = [dis.opname[o] for o in seen]
    out["trace_sample"] = sample
    out["trace_opcodes_total"] = len(names)
    out["trace_opcodes_per_char"] = round(len(names) / len(sample), 2)
    # the same trace split per character of a short input (a FOR_ITER starts each character)
    short = "v2.1 café"
    seen.clear()
    sys.settrace(tracer)
    tokens(short)
    sys.settrace(None)
    per_char, cur = [], None
    for o in seen:
        name = dis.opname[o]
        if name == "FOR_ITER":
            cur = []
            per_char.append(cur)
        if cur is not None:
            cur.append(name)
    out["trace_short"] = short
    out["trace_short_per_char"] = per_char[:len(short)]
    # the instructions run for one letter that continues a token ('a' after 'c' in "café")
    body = [i for i in dis.get_instructions(tokens)]
    out["loop_body_listing"] = [f"{i.opname} {i.argrepr}".strip() for i in body]
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])

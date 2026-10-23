"""Summarise audit_pages.mjs output, and flag concepts taught on more than one page.

usage: python3 html_utils/audit_pages.py <audit.jsonl> [--csv out.csv] [--concepts]
Per page: Reading core minutes (outside closed <details>), depth minutes, other tabs' minutes, visuals inline in
Reading vs in other tabs, and core words per inline visual. Minutes use 230 words per minute.
--concepts counts, for each concept below, the pages whose built text mentions it often enough to be teaching it,
so each concept can be given one owner page.
"""
import csv, json, re, sys
from pathlib import Path

WPM = 230
KB = Path(__file__).resolve().parent.parent / "technical_knowledge_base"
CONCEPTS = {  # name: (regex, mentions on one page that count as teaching it)
    "KV-cache sizing": (r"KV[- ]cache (size|memory|bytes|footprint)|bytes per token", 4),
    "MLA": (r"\bMLA\b|multi-head latent", 10),
    "DSA / sparse attention": (r"\bDSA\b|\bNSA\b|lightning indexer", 6),
    "GQA / MQA": (r"\bGQA\b|\bMQA\b|grouped-query", 8),
    "RoPE": (r"\bRoPE\b|rotary", 8),
    "Mixture of experts routing": (r"\brouter\b|load balanc", 8),
    "Data / tensor / pipeline parallelism": (r"tensor parallel|pipeline parallel|\bFSDP\b|ZeRO", 8),
    "Quantisation formats": (r"\bFP8\b|\bINT4\b|\bNF4\b|\bGPTQ\b|\bAWQ\b", 8),
    "Speculative decoding": (r"speculative decod|draft model", 5),
    "Continuous batching / paged attention": (r"continuous batching|PagedAttention|paged attention", 4),
    "RLHF / DPO / GRPO": (r"\bRLHF\b|\bDPO\b|\bGRPO\b|\bPPO\b", 8),
    "LoRA": (r"\bLoRA\b|\bQLoRA\b", 6),
    "Vector index (HNSW, IVF)": (r"\bHNSW\b|\bIVF\b|product quantis|product quantiz", 5),
    "Diffusion / VAE": (r"\bELBO\b|denois|\bVAE\b", 8),
    "Normalisation (LayerNorm, RMSNorm)": (r"RMSNorm|LayerNorm|pre-norm", 6),
    "Event loop": (r"event loop", 4),
    "OAuth flow": (r"\bOAuth\b|\bPKCE\b", 5),
    "Observability (traces, metrics)": (r"OpenTelemetry|\btraces?\b.*\bspans?\b", 4),
    "Roofline / arithmetic intensity": (r"roofline|arithmetic intensity", 4),
}


def load(fn):
    rows = []
    for line in open(fn):
        r = json.loads(line)
        if "error" in r:
            rows.append({"page": r["page"], "error": r["error"]})
            continue
        tabs = r["tabs"]
        read = next((t for t in tabs if t.get("tab") in ("t-read", None)), tabs[0])
        rest = [t for t in tabs if t is not read and not t.get("missing")]
        rows.append({
            "page": r["page"], "kb": r["bytes"] // 1024, "tabs": len(tabs),
            "read_min": round(read["core"] / WPM), "depth_min": round(read["depth"] / WPM),
            "other_min": round(sum(t["core"] + t["depth"] for t in rest) / WPM),
            "h2": read["h2"], "vis_inline": read["vis"], "vis_tabs": sum(t["vis"] for t in rest),
            "words_per_inline_vis": round(read["core"] / max(read["vis"], 1)),
        })
    return rows


def concepts():
    pages = {}
    for f in KB.rglob("index.html"):
        txt = re.sub(r"<script.*?</script>|<style.*?</style>|<[^>]+>", " ", f.read_text(errors="ignore"), flags=re.S)
        pages[str(f.parent.relative_to(KB))] = txt
    for name, (rx, need) in CONCEPTS.items():
        hits = sorted(((len(re.findall(rx, t)), p) for p, t in pages.items()), reverse=True)
        hits = [(n, p) for n, p in hits if n >= need and "/papers/" not in p and "/tech_news/" not in p]
        print(f"\n{name}: taught on {len(hits)} pages")
        for n, p in hits[:12]:
            print(f"  {n:4}  {p}")


def main():
    a = sys.argv[1:]
    rows = load(a[0])
    ok = [r for r in rows if "error" not in r]
    for r in rows:
        if "error" in r:
            print("ERROR", r["page"], r["error"])
    print(f"{'read':>4} {'dep':>4} {'oth':>4} {'h2':>3} {'vin':>3} {'vtb':>3} {'w/vis':>6}  page")
    for r in sorted(ok, key=lambda r: -r["read_min"]):
        print(f"{r['read_min']:4} {r['depth_min']:4} {r['other_min']:4} {r['h2']:3} {r['vis_inline']:3} {r['vis_tabs']:3} {r['words_per_inline_vis']:6}  {r['page']}")
    print(f"\npages {len(ok)}; Reading core {sum(r['read_min'] for r in ok) / 60:.0f} h, depth {sum(r['depth_min'] for r in ok) / 60:.0f} h,"
          f" other tabs {sum(r['other_min'] for r in ok) / 60:.0f} h; pages with no inline visual {sum(r['vis_inline'] == 0 for r in ok)}")
    if "--csv" in a:
        with open(a[a.index("--csv") + 1], "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(ok[0]))
            w.writeheader()
            w.writerows(ok)
    if "--concepts" in a:
        concepts()


if __name__ == "__main__":
    main()

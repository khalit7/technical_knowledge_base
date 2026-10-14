"""Page-image retrieval with vidore/colSmol-256M (ColIdefics3, late interaction).
usage: python -I vidore_colsmol.py <ING_DIR> <set> [device: mps (bfloat16, under the bench lock) | cpu (float32)]
The page's numbers come from the CPU run on subsets (vidore_subset.py): on 2026-10-14 the MPS runs segfaulted while
loading or stalled for over 30 minutes on the shared machine, whose 16 GB were heavily swapped by other jobs.
colpali-engine 0.3.18: ColIdefics3.from_pretrained(...), ColIdefics3Processor;
process_images / process_queries; score_multi_vector = sum over query tokens of the max dot product over page
vectors (MaxSim). Writes <set>/rank_colsmol.json (top 100), colsmol_stats.json (vectors per page, seconds per page
and per query batch, load average before and after)."""
import json, os, sys, time
import torch
from PIL import Image
from colpali_engine.models import ColIdefics3, ColIdefics3Processor

ING, NAME = sys.argv[1], sys.argv[2]
dev = sys.argv[3] if len(sys.argv) > 3 else "mps"
d = os.path.join(ING, "vidore", NAME)
meta = json.load(open(os.path.join(d, "meta.json")))
la0 = os.getloadavg()
if dev == "cpu":
    torch.set_num_threads(4)
dtype = torch.float32 if dev == "cpu" else torch.bfloat16   # bfloat16 is slow on this CPU
model = ColIdefics3.from_pretrained("vidore/colSmol-256M", torch_dtype=dtype, device_map=dev).eval()
proc = ColIdefics3Processor.from_pretrained("vidore/colSmol-256M")
embs, nvec = [], []
t0 = time.time()
B = 4
for i in range(0, len(meta["pages"]), B):
    ims = [Image.open(os.path.join(d, "img", "%d.png" % j)).convert("RGB") for j in range(i, min(i + B, len(meta["pages"])))]
    with torch.no_grad():
        bt = proc.process_images(ims).to(dev)
        e = model(**bt)
    for k in range(e.shape[0]):
        m = bt["attention_mask"][k].bool()
        v = e[k][m].float().cpu()
        embs.append(v); nvec.append(int(v.shape[0]))
    if i % 100 == 0:
        print(i, round(time.time() - t0, 1), flush=True)
t_pages = time.time() - t0
qs = meta["queries"]
t1 = time.time(); qe = []
for i in range(0, len(qs), 16):
    with torch.no_grad():
        bt = proc.process_queries([q["query"] for q in qs[i:i + 16]]).to(dev)
        e = model(**bt)
    for k in range(e.shape[0]):
        m = bt["attention_mask"][k].bool()
        qe.append(e[k][m].float().cpu())
t_q = time.time() - t1
S = proc.score_multi_vector(qe, embs)          # [n_queries, n_pages]
top = torch.argsort(S, dim=1, descending=True)[:, :100]
json.dump({q["qid"]: [int(x) for x in row] for q, row in zip(qs, top)}, open(os.path.join(d, "rank_colsmol.json"), "w"))
json.dump({"pages": len(embs), "vectors_per_page_mean": sum(nvec) / len(nvec), "vectors_per_page_min": min(nvec),
           "vectors_per_page_max": max(nvec), "dim": int(embs[0].shape[1]), "s_per_page": t_pages / len(embs),
           "s_per_query": t_q / len(qs), "device": dev, "batch": B, "loadavg_before": la0, "loadavg_after": os.getloadavg(),
           "torch": torch.__version__, "dtype": str(dtype)}, open(os.path.join(d, "colsmol_stats.json"), "w"), indent=1)
print(NAME, "colsmol done", round(t_pages, 1), "s pages", round(t_q, 1), "s queries")

"""Query transformation, generation step (local generator, greedy; hold the bench lock):
- HyDE on the 300 SciFact test claims, with the HyDE paper's own SciFact prompt (Gao et al. 2022,
  arXiv 2212.10496; prompt from the authors' code, github.com/texttron/hyde src/hyde/promptor.py, checked 2026-10-14: "Please write a scientific paper passage to support/refute the claim.");
- multi-query: three rewordings of each claim;
- conversational rewrite on eight CONSTRUCTED two-turn chats (written for this page from SciFact test claims; the
  second turn leans on the first, as real follow-ups do).
usage: python -I -B qtrans_gen.py ; then qtrans_eval.py (embedding, separate process).
Writes $RAG_SCRATCH/pipe/qtrans_gen.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
from common import L, work
import gen as G

HYDE = "Please write a scientific paper passage to support/refute the claim.\nClaim: {q}\nPassage:"
MQ = ("Write three different search queries that would find scientific abstracts relevant to the claim below. "
      "Use different wording and terminology from the claim. Put one query per line, with no numbering and nothing else.\nClaim: {q}")
RW = ("Here is a conversation between a user and an assistant about biomedical research.\n{conv}\n"
      "Rewrite the user's last message as one standalone search query that keeps every detail needed to find "
      "relevant scientific abstracts, resolving words like it, they, that or those from the conversation. Output only the query.")
# constructed conversations: (SciFact test claim id, first user turn, assistant reply, follow-up)
CONV = [
    ("51", "I'm looking into ALDH1 as a marker in breast cancer.", "ALDH1 is studied as a marker of cancer stem cells.", "Is high expression of it linked to better outcomes for patients?"),
    ("163", "My aunt is considering bariatric surgery.", "It is a common treatment for severe obesity.", "Does it actually help with mental health afterwards?"),
    ("275", "Why are KRAS mutant tumors so hard to treat?", "KRAS itself has long been hard to target with drugs.", "Would hitting both the PI3K and MEK pathways at once work on those?"),
    ("793", "I'm studying programmed cell death.", "Apoptosis is one well-studied form of it.", "Are mitochondria involved in that at all?"),
    ("960", "What is the Polymeal?", "It is a proposed combination of foods meant to lower heart disease risk.", "Does eating that way reduce deaths?"),
    ("1180", "What does the pattern recognition receptor MDA5 do?", "It belongs to the RIG-I-like receptor family.", "Does it sense RNA virus infection?"),
    ("1303", "I read about a drug called tirasemtiv.", "It is a fast skeletal muscle troponin activator.", "Does it have any effect on fast-twitch muscle?"),
    ("501", "I get frequent headaches.", "Headaches are very common.", "Should I worry that they are tied to cognitive decline?"),
]
corpus, queries, qrels = L.beir("scifact")
qt = sorted(qrels["test"])
cache = G.Cache("qtrans")
out = {"hyde": {}, "mq": {}, "conv": []}
la0 = os.getloadavg(); t0 = time.perf_counter()
tok_in = tok_out = 0; secs = {"hyde": 0, "mq": 0}
for i, q in enumerate(qt):
    r = G.chat(HYDE.format(q=queries[q]), cache, max_tokens=160, tag="hyde " + q)
    out["hyde"][q] = r["text"]; secs["hyde"] += r["seconds"]
    r2 = G.chat(MQ.format(q=queries[q]), cache, max_tokens=100, tag="mq " + q)
    out["mq"][q] = [l.strip(" -*0123456789.)").strip() for l in r2["text"].split("\n") if l.strip()][:3]
    secs["mq"] += r2["seconds"]
    tok_in += r["n_in"] + r2["n_in"]; tok_out += r["n_out"] + r2["n_out"]
    if i % 50 == 0:
        print(i, round(time.perf_counter() - t0), "s", flush=True)
for cid, t1, a1, t2 in CONV:
    conv = "User: %s\nAssistant: %s\nUser: %s" % (t1, a1, t2)
    r = G.chat(RW.format(conv=conv), cache, max_tokens=60, tag="rw " + cid)
    out["conv"].append({"qid": cid, "turn1": t1, "reply": a1, "turn2": t2, "rewrite": r["text"], "claim": queries[cid]})
out["cost"] = {"model": G.MODEL_NAME, "tokens_in": tok_in, "tokens_out": tok_out, "seconds": {k: round(v, 1) for k, v in secs.items()},
               "loadavg_before": [round(x, 2) for x in la0], "loadavg_after": [round(x, 2) for x in os.getloadavg()],
               "when": time.strftime("%Y-%m-%d %H:%M")}
json.dump(out, open(work("qtrans_gen.json"), "w"), indent=1)
print(json.dumps(out["cost"]))
for c in out["conv"]:
    print(c["turn2"], "=>", c["rewrite"])

"""The local-writer Graphiti run was stopped after three episodes: from the second one on, the 4B model answered
the resolve_edge prompt by echoing the JSON schema (with one brace too many), identically on every retry at
temperature 0, so every episode with an existing fact to compare against failed. This writes the partial run in
the same shape as run_graphiti.py: per-episode outcome from the run's log, edges and searches from the graph."""
import asyncio, json, os, re, sys
os.environ["GRAPHITI_TELEMETRY_ENABLED"] = "false"; os.environ.setdefault("OPENAI_API_KEY", "local")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import SESSIONS, QUESTIONS
from graphiti_core import Graphiti
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.edges import EntityEdge
LOG, OUT = sys.argv[1], sys.argv[2]
def ed(e):
    f = lambda d: d.isoformat()[:10] if d else None
    return {"fact": e.fact, "name": e.name, "valid_at": f(e.valid_at), "invalid_at": f(e.invalid_at), "expired_at": f(e.expired_at), "created_at": f(e.created_at), "episodes": len(e.episodes or [])}
async def main():
    lines = [l for l in open(LOG) if re.match(r"^2026-\d\d-\d\d \d+ edges", l)]
    cfg = LLMConfig(api_key="local", model="none", base_url="http://127.0.0.1:9/v1")
    drv = FalkorDriver(host="127.0.0.1", port=6380, database="sam_local")
    g = Graphiti(graph_driver=drv, llm_client=OpenAIGenericClient(config=cfg), cross_encoder=OpenAIRerankerClient(config=cfg),
                 embedder=OpenAIEmbedder(OpenAIEmbedderConfig(api_key="local", embedding_model="bge-small-en-v1.5", embedding_dim=384, base_url="http://127.0.0.1:8711/v1")))
    edges = await EntityEdge.get_by_group_ids(drv, ["sam_local"])
    ses = []
    for l in lines:
        m = re.match(r"^(\S+) (\d+) edges (\d+) calls ?(.*)$", l.strip())
        ses.append({"date": m.group(1), "s": None, "error": m.group(4) or None, "calls": int(m.group(3)), "edges": [ed(e) for e in edges] if not m.group(4) else []})
    # carry the edge list forward (failed episodes add nothing)
    cur = []
    for s in ses:
        cur = s["edges"] or cur; s["edges"] = cur
    ret = {}
    for q in QUESTIONS:
        hits = await g.search(q["q"], group_ids=["sam_local"], num_results=10)
        ret[q["id"]] = {"s": 0, "hits": [ed(e) for e in hits]}
    json.dump({"library": "graphiti-core 0.30.2 (FalkorDB)", "writer": "local", "stopped_after": len(ses), "sessions": ses,
               "retrieval": ret, "calls": []}, open(OUT, "w"), indent=1)
    print(len(ses), "episodes", len(edges), "edges")
asyncio.run(main())

"""Graphiti 0.30.2 (pip graphiti-core, the open-source engine under Zep) on the twelve sessions, then search.

One episode per session, reference_time = the session date. Graph store: FalkorDB in Docker (the embedded Kuzu
driver is deprecated in 0.30.2 and fails in add_episode: KuzuDriver has no attribute '_database'). Embeddings: bge-small-en-v1.5 via embed_server.py. LLM client: OpenAIGenericClient in
'json_object' mode (the JSON schema goes into the prompt), because mlx_lm.server 0.32.0 ignores response_format.
Writer: 'haiku' (Claude Haiku 4.5 through llm_claude.py) or 'local' (Qwen3-4B through the locking proxy).
Telemetry off (GRAPHITI_TELEMETRY_ENABLED=false). Search: Graphiti.search (hybrid BM25 + cosine, RRF), 10 edges.
Usage: python run_graphiti.py WRITER OUTDIR [PROXY_PORT]
"""
import asyncio, json, os, sys, time
os.environ["GRAPHITI_TELEMETRY_ENABLED"] = "false"
os.environ["MAX_THINKING_TOKENS"] = "0"
os.environ.setdefault("OPENAI_API_KEY", "local")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datetime import datetime, timezone
from conv import SESSIONS, QUESTIONS, transcript
from llm_claude import claude_complete
from graphiti_core import Graphiti
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.edges import EntityEdge
from graphiti_core.nodes import EpisodeType

WRITER, OUT = sys.argv[1], os.path.abspath(sys.argv[2])
PORT = sys.argv[3] if len(sys.argv) > 3 else "8723"
os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(OUT, "llm_calls.jsonl")
QWEN = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
CUR = {"date": None}
GID = "sam_" + WRITER
CALLS = []


class Client(OpenAIGenericClient):
    async def generate_response(self, messages, response_model=None, max_tokens=None, model_size=None, group_id=None,
                                prompt_name=None, **kw):
        CUR["prompt"] = prompt_name
        t0 = time.time()
        try:
            r = await super().generate_response(messages, response_model, max_tokens=max_tokens,
                                                **({"model_size": model_size} if model_size else {}),
                                                group_id=group_id, prompt_name=prompt_name, **kw)
            CALLS.append({"date": CUR["date"], "prompt": prompt_name, "s": round(time.time() - t0, 2), "ok": True})
            return r
        except Exception as e:
            CALLS.append({"date": CUR["date"], "prompt": prompt_name, "s": round(time.time() - t0, 2), "ok": False, "error": repr(e)[:300]})
            raise

    async def _generate_response(self, messages, response_model=None, max_tokens=None, model_size=None):
        if WRITER != "haiku":
            return await super()._generate_response(messages, response_model, max_tokens=max_tokens or 2048)
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        user = "\n\n".join(m.content for m in messages if m.role != "system")
        txt = await asyncio.to_thread(claude_complete, system, user, "haiku", LOG, f"graphiti.{CUR.get('prompt')}.{CUR['date']}")
        # Claude often adds prose after the JSON; read the first JSON object (what a tool-forced or
        # schema-constrained call would return). Graphiti's own parser is used unchanged for the local model.
        s = self._strip_code_fences(txt)
        i = s.find("{")
        if i < 0:
            raise json.JSONDecodeError("no JSON object", s, 0)
        return json.JSONDecoder().raw_decode(s, i)[0]


def edge_dict(e):
    f = lambda d: d.isoformat()[:10] if d else None
    return {"fact": e.fact, "name": e.name, "valid_at": f(e.valid_at), "invalid_at": f(e.invalid_at),
            "expired_at": f(e.expired_at), "created_at": f(e.created_at), "episodes": len(e.episodes or [])}


async def main():
    base = f"http://127.0.0.1:{PORT}/v1"
    cfg = LLMConfig(api_key="local", model=QWEN, small_model=QWEN, base_url=base, temperature=0.0, max_tokens=2048)
    llm = Client(config=cfg, structured_output_mode="json_object")
    emb = OpenAIEmbedder(OpenAIEmbedderConfig(api_key="local", embedding_model="bge-small-en-v1.5", embedding_dim=384,
                                              base_url="http://127.0.0.1:8711/v1"))
    rer = OpenAIRerankerClient(config=LLMConfig(api_key="local", model=QWEN, base_url=base))
    driver = FalkorDriver(host="127.0.0.1", port=6380, database=GID)
    g = Graphiti(graph_driver=driver, llm_client=llm, embedder=emb, cross_encoder=rer, max_coroutines=1)
    await g.build_indices_and_constraints()
    res = {"library": "graphiti-core 0.30.2 (FalkorDB)", "writer": WRITER, "sessions": []}
    for i, s in enumerate(SESSIONS):
        CUR["date"] = s["date"]
        t0 = time.time()
        err = None
        n0 = len(CALLS)
        try:
            await g.add_episode(name=f"session {i + 1}", episode_body=transcript(s), source=EpisodeType.message,
                                source_description="chat between Sam (user) and an assistant",
                                reference_time=datetime.fromisoformat(s["date"] + "T12:00:00+00:00"), group_id=GID)
        except Exception as e:
            import traceback; traceback.print_exc()
            err = repr(e)[:400]
        try:
            edges = await EntityEdge.get_by_group_ids(driver, [GID])
        except Exception:
            edges = []
        res["sessions"].append({"date": s["date"], "s": round(time.time() - t0, 1), "error": err, "calls": len(CALLS) - n0,
                                "edges": [edge_dict(e) for e in edges]})
        print(s["date"], len(edges), "edges", len(CALLS) - n0, "calls", err or "", flush=True)
    CUR["date"] = "answer"
    res["retrieval"] = {}
    for q in QUESTIONS:
        t0 = time.time()
        hits = await g.search(q["q"], group_ids=[GID], num_results=10)
        res["retrieval"][q["id"]] = {"s": round(time.time() - t0, 3), "hits": [edge_dict(e) for e in hits]}
    res["calls"] = CALLS
    json.dump(res, open(os.path.join(OUT, "graphiti.json"), "w"), indent=1)
    print("done", len(CALLS), "calls")


asyncio.run(main())

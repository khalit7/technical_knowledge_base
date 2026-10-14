"""Fixed prompt overhead of each LLM call in graphrag 3.3.0 and LightRAG 1.5.7, counted in tokens: the template text
that every call re-sends besides the chunk itself (instructions and few-shot examples). These overheads drive the
indexing bill in the Cost calculator. Counted with o200k_base (graphrag's default encoding, config/defaults.py) and
with the Qwen3 tokenizer (the local generators). graphrag prompts are imported from the installed package; LightRAG's
from its pinned source clone (lightrag/prompt.py, a plain dict).
Run with the graphrag env: $RAG_SCRATCH/gr/grenv/bin/python -I -B s_prompt_tokens.py
"""
import os
import re
import sys

import tiktoken
from tokenizers import Tokenizer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, save  # noqa: E402

from graphrag.prompts.index import community_report, extract_graph, summarize_descriptions  # noqa: E402
from graphrag.prompts.query import global_search_map_system_prompt as gmap  # noqa: E402
from graphrag.prompts.query import global_search_reduce_system_prompt as gred  # noqa: E402
from graphrag.prompts.query import local_search_system_prompt as loc  # noqa: E402

o2 = tiktoken.get_encoding("o200k_base")
qw = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))


def strip(t):
    return re.sub(r"\{[a-z_]+\}", "", t)  # template slots left empty


def count(t):
    t = strip(t)
    return {"chars": len(t), "o200k": len(o2.encode(t)), "qwen3": len(qw.encode(t, add_special_tokens=False).ids)}


src = open(L.path("src", "lightrag-v1.5.7", "lightrag", "prompt.py")).read()
src = re.sub(r"^from lightrag\.utils import logger.*$", "import logging\nlogger = logging.getLogger('lr')", src, flags=re.M)
ns = {}
exec(compile(src, "lightrag/prompt.py", "exec"), ns)  # the pinned file, with only its logger import replaced
P = ns["PROMPTS"]
lr_extract = P.get("entity_extraction_system_prompt", "") + P.get("entity_extraction_user_prompt", "")
lr_examples = "\n".join(P.get("entity_extraction_examples", [])) if isinstance(P.get("entity_extraction_examples"), list) else ""
out = {
    "graphrag_extract_graph": count(extract_graph.GRAPH_EXTRACTION_PROMPT),
    "graphrag_continue": count(extract_graph.CONTINUE_PROMPT),
    "graphrag_summarize": count(summarize_descriptions.SUMMARIZE_PROMPT),
    "graphrag_community_report": count(community_report.COMMUNITY_REPORT_PROMPT),
    "graphrag_global_map": count(gmap.MAP_SYSTEM_PROMPT),
    "graphrag_global_reduce": count(gred.REDUCE_SYSTEM_PROMPT),
    "graphrag_local": count(loc.LOCAL_SEARCH_SYSTEM_PROMPT),
    "lightrag_extract": count(lr_extract + lr_examples),
    "lightrag_keys": sorted(k for k in P if "extract" in k),
}
save("prompt_tokens.json", out)
for k, v in out.items():
    print(k, v)

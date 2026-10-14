"""No-LLM graph extraction with graphrag 3.3.0's own default NLP extractor (RegexENNounPhraseExtractor, TextBlob based;
graphrag/config/defaults.py TextAnalyzerDefaults), the indexing method behind graphrag's "fast" mode and, per the
extractor's docstring, "the extractor used in the first bencharmking of LazyGraphRAG".

One text unit per HotpotQA paragraph ("<title>: <text>", the root's convention). Output: noun phrases per paragraph
($RAG_SCRATCH/gr/nlp_phrases.json) and the wall time per paragraph. CPU only, one process.
Run with the graphrag env:  NLTK_DATA=$RAG_SCRATCH/gr/nltk_data $RAG_SCRATCH/gr/grenv/bin/python -I -B s_nlp_extract.py
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import hotpot, para_text, save, work  # noqa: E402
from collections import Counter  # noqa: E402

from graphrag.index.operations.build_noun_graph.np_extractors.regex_extractor import RegexENNounPhraseExtractor  # noqa: E402
from graphrag.index.operations.build_noun_graph.np_extractors.stop_words import EN_STOP_WORDS  # noqa: E402

ex = RegexENNounPhraseExtractor(exclude_nouns=EN_STOP_WORDS, max_word_length=15, word_delimiter=" ")
qs, corpus, _ = hotpot()
out, times = {}, []
la0 = os.getloadavg()
t0 = time.perf_counter()
for p in corpus:
    t = time.perf_counter()
    out[p["pid"]] = sorted(ex.extract(para_text(p)))
    times.append(time.perf_counter() - t)
wall = time.perf_counter() - t0
qph = {q["qid"]: sorted(ex.extract(q["question"])) for q in qs}
json.dump({"phrases": out, "question_phrases": qph, "meta": {"paragraphs": len(corpus), "wall_s": round(wall, 1), "median_ms": round(sorted(times)[len(times) // 2] * 1000, 2),
                                     "load_before": [round(x, 1) for x in la0], "load_after": [round(x, 1) for x in os.getloadavg()],
                                     "extractor": str(ex)[:40]}}, open(work("nlp_phrases.json"), "w"))
print(len(corpus), "paragraphs", round(wall, 1), "s; phrases", sum(len(v) for v in out.values()))

cnt = Counter(x for v in out.values() for x in v)
per = sorted(len(v) for v in out.values())
save("nlp.json", {"paragraphs": len(corpus), "wall_s": round(wall, 1), "phrases": sum(per), "distinct": len(cnt),
                  "median_per_paragraph": per[len(per) // 2], "top": cnt.most_common(20),
                  "in_one_paragraph": sum(1 for v in cnt.values() if v == 1),
                  "load_before": [round(x, 1) for x in la0], "timed_under_lock": os.environ.get("GR_LOCKED") == "1",
                  "example": {"title": corpus[0]["title"], "text": corpus[0]["text"][:600], "phrases": out[corpus[0]["pid"]]}})

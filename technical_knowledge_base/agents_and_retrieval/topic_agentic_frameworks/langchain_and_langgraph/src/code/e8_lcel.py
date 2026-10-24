"""E8: LangChain's abstractions, measured with no model (added 2026-10-24).

What it records, on langchain-core 1.6.7, langchain 1.4.3, langchain-classic 1.0.8:
  1. Every building block (prompt, chat model, parser, retriever, tool, chain) is a Runnable with the same methods.
  2. prompt | model | parser builds a RunnableSequence; its steps.
  3. The literal messages the model receives, and the tool schema a typed function becomes.
  4. A retriever over an in-memory vector store (deterministic fake embeddings) returns Documents.
  5. What it costs: Python stack frames between chain.invoke() and the model's _generate(), against a plain
     function doing the same work, and microseconds of overhead per call (fake model, so only the framework is timed).
  6. Which legacy imports moved to langchain-classic.
Run: python e8_lcel.py <out.json>   (a few seconds; no network, no model)
"""
import importlib, inspect, json, statistics, sys, time

from langchain_core.runnables import Runnable
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.documents import Document
import langchain_core, langchain

out = {"versions": {"langchain_core": langchain_core.__version__, "langchain": langchain.__version__}}
try:
    import langchain_classic
    out["versions"]["langchain_classic"] = importlib.metadata.version("langchain-classic")
except Exception:
    pass

DEPTH = {}
PROBE = {"on": True}


class Probe(FakeListChatModel):
    """A fake chat model that records how deep the call stack is when it generates."""
    def _generate(self, messages, stop=None, run_manager=None, **kw):
        if PROBE["on"]:
            DEPTH["lcel"] = [f.function for f in inspect.stack(0)]
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=self.responses[0]))])


ANSWER = "tokenize drops apostrophes: the pattern [a-z]+ splits don't into don and t."
prompt = ChatPromptTemplate.from_messages([
    ("system", "You diagnose failing tests in the textstats repository. Answer in one sentence."),
    ("human", "Test {test} failed with:\n{error}"),
])
model = Probe(responses=[ANSWER])
parser = StrOutputParser()
chain = prompt | model | parser


@tool
def run_tests(path: str, verbose: bool = False) -> str:
    """Run the test suite under path and return the pytest summary line."""
    return "2 failed: test_word_count, test_top_words"


# the running example's real files (textstats, as read by the create_agent run of e7), one chunk per function
docs = [Document(page_content=t, metadata={"file": f}) for f, t in [
    ("textstats/core.py", 'def tokenize(text):\n    """Split text into lowercase words. Apostrophes inside words are kept."""\n    return re.findall(r"[a-z]+", text.lower())'),
    ("textstats/core.py", "def word_count(text):\n    return len(tokenize(text))"),
    ("textstats/core.py", 'def top_words(text, n=3):\n    """Return the n most common words as (word, count), ties broken alphabetically."""\n    counts = Counter(tokenize(text))\n    return sorted(counts.items(), key=lambda kv: -kv[1])[:n]'),
]]
store = InMemoryVectorStore(DeterministicFakeEmbedding(size=64))
store.add_documents(docs)
retriever = store.as_retriever(search_kwargs={"k": 2})

blocks = {"ChatPromptTemplate": prompt, "chat model": model, "StrOutputParser": parser,
          "retriever (VectorStoreRetriever)": retriever, "@tool": run_tests, "prompt | model | parser": chain}
methods = ["invoke", "batch", "stream", "ainvoke", "with_retry", "with_fallbacks"]
out["runnables"] = [{"name": k, "cls": type(v).__name__, "is_runnable": isinstance(v, Runnable),
                     "methods": [m for m in methods if hasattr(v, m)]} for k, v in blocks.items()]
out["chain"] = {"cls": type(chain).__name__, "steps": [type(s).__name__ for s in chain.steps]}

inp = {"test": "test_word_count", "error": "2 failed: test_word_count, test_top_words"}
out["input"] = inp
out["messages"] = [{"type": m.type, "content": m.content} for m in prompt.invoke(inp).to_messages()]
out["answer"] = chain.invoke(inp)
out["batch"] = chain.batch([inp, {"test": "test_top_words", "error": "2 failed: test_word_count, test_top_words"}])
out["tool_schema"] = convert_to_openai_tool(run_tests)
out["retrieved"] = [{"file": d.metadata["file"], "text": d.page_content} for d in retriever.invoke("why does word_count miscount contractions?")]
out["retriever_note"] = "DeterministicFakeEmbedding: hash-seeded random vectors, so the ranking shows the interface, not retrieval quality."


# the same work without the framework: format two messages, call a function, return its text
def plain_model(messages):
    if PROBE["on"]:
        DEPTH["plain"] = [f.function for f in inspect.stack(0)]
    return ANSWER


def plain(test, error):
    msgs = [{"role": "system", "content": "You diagnose failing tests in the textstats repository. Answer in one sentence."},
            {"role": "user", "content": f"Test {test} failed with:\n{error}"}]
    return plain_model(msgs)


def call_lcel():
    return chain.invoke(inp)


def call_plain():
    return plain(**inp)


def frames(fn, key):
    fn()
    st = DEPTH[key]
    return st[:st.index(fn.__name__)]  # innermost first, up to (not including) our calling function


fl, fp = frames(call_lcel, "lcel"), frames(call_plain, "plain")
out["frames"] = {"lcel": len(fl), "plain": len(fp), "lcel_names": fl[::-1], "plain_names": fp[::-1],
                 "note": "Python frames from the first framework (or plain) call down to the model function itself, inclusive, from inspect.stack()"}
PROBE["on"] = False


def timeit(f, n=2000, reps=5):
    best = []
    for _ in range(reps):
        t = time.perf_counter()
        for _ in range(n):
            f()
        best.append((time.perf_counter() - t) / n * 1e6)
    return min(best), statistics.median(best)


lc_best, lc_med = timeit(lambda: chain.invoke(inp))
pl_best, pl_med = timeit(lambda: plain(**inp))
out["overhead_us"] = {"lcel_best": round(lc_best, 1), "lcel_median": round(lc_med, 1),
                      "plain_best": round(pl_best, 2), "plain_median": round(pl_med, 2), "calls": 2000, "reps": 5,
                      "note": "fake model, no tracing (LANGSMITH_TRACING unset); best of 5 runs of 2,000 calls; Apple M1 Pro shared with other agents"}

moved = {}
for path in ["langchain.chains", "langchain.retrievers", "langchain_classic.chains", "langchain_classic.retrievers",
             "langchain.agents", "langchain_core.runnables"]:
    try:
        importlib.import_module(path); moved[path] = "imports"
    except Exception as e:
        moved[path] = type(e).__name__
out["imports"] = moved
try:
    from langchain_classic.chains import RetrievalQA  # noqa
    out["imports"]["langchain_classic.chains.RetrievalQA"] = "imports"
except Exception as e:
    out["imports"]["langchain_classic.chains.RetrievalQA"] = type(e).__name__

json.dump(out, open(sys.argv[1], "w"), indent=1)
print(json.dumps({k: out[k] for k in ["chain", "frames", "overhead_us", "imports"]}, indent=1))

"""Request traces for the isolated cache comparisons (radix tree against vLLM's hash-block cache).

Three traces come from the root page's Serving simulator workload generator (../../../src/sim/sim.py,
make_workload: mulberry32 random numbers, identical in its JS port) and use the same token identity as
its vLLM check harness (tok below): positions inside a shared system prompt come from that prompt, every
other position from the conversation, so a later turn repeats the earlier turn's prompt and output.
The fourth (rag) asks many short questions about a few long documents.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'src', 'sim'))
import sim  # noqa: E402

TRACES = {
    # chat assistant: 3 system prompts of 600 tokens shared by 90% of conversations, 4 turns each
    'chat': {'n': 240, 'rate': 2.0, 'plo': 30, 'phi': 200, 'olo': 30, 'ohi': 200, 'maxtok': 200,
             'sys': 600, 'share': 0.9, 'groups': 3, 'turns': 4, 'gap': 20.0, 'seed': 7},
    # coding agent: one 2,000-token system prompt, 10 turns, the context grows every turn
    'agent': {'n': 200, 'rate': 0.4, 'plo': 20, 'phi': 150, 'olo': 50, 'ohi': 300, 'maxtok': 300,
              'sys': 2000, 'share': 1.0, 'groups': 1, 'turns': 10, 'gap': 15.0, 'seed': 11},
    # unrelated one-shot prompts: nothing to share
    'unique': {'n': 200, 'rate': 2.0, 'plo': 100, 'phi': 800, 'olo': 30, 'ohi': 200, 'maxtok': 200,
               'sys': 0, 'share': 0.0, 'groups': 1, 'turns': 1, 'gap': 0.0, 'seed': 3},
}
LABELS = {'chat': 'Chat assistant (shared system prompts, 4 turns)',
          'agent': 'Coding agent (one long system prompt, 10 turns)',
          'unique': 'Unrelated one-shot prompts',
          'rag': 'Questions about a few documents'}


def tok(q, pos):
    """Token id at position pos (same as the root's check/vllm_harness.py)."""
    sid = (1 + q['g']) if (q['g'] >= 0 and pos < q['S']) else 1000 + q['conv']
    return 100 + (sid * 2654435761 + pos * 40503 + (sid * pos) % 9973) % 150000


def rag_trace(ndoc=8, dlen=800, nq=160, seed=5):
    # mulberry32 draws in the same order as the page's JavaScript (SG.ragTrace)
    """nq questions, each about one of ndoc documents of dlen tokens; question 20-80 tokens, answer 20-80."""
    r = sim.Rng(seed)
    reqs = []
    for i in range(nq):
        d = r.int(0, ndoc - 1)
        U = r.int(20, 80)
        O = r.int(20, 80)
        # the document plays the role of a shared prompt (g = doc, S = dlen); the question is unique (conv = i)
        reqs.append({'id': i, 'arr': i * 0.1, 'P': dlen + U, 'O': O, 'M': 80, 'g': d, 'S': dlen, 'conv': i, 'turn': 0})
    return reqs


def get(name):
    if name == 'rag':
        return rag_trace()
    return sim.make_workload(TRACES[name])


def tokens(q, n=None):
    """The request's prompt token ids, or its first n tokens of prompt + output."""
    n = q['P'] if n is None else n
    return [tok(q, i) for i in range(n)]


if __name__ == '__main__':
    for k in ['chat', 'agent', 'unique', 'rag']:
        t = get(k)
        print(k, len(t), 'prompt tokens', sum(q['P'] for q in t), 'output', sum(q['O'] for q in t), 'max P', max(q['P'] for q in t))

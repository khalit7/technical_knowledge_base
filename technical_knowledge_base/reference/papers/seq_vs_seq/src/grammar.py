"""The toy world the page's paired models are trained on (copied in parts/21_js_lang.js).

A document lists two or three facts ("ann red cup .") and then restates three to six of them after "so".
The facts are drawn at random, so nothing can be memorised: every answer has to be read from the context,
which is what makes the tasks checkable.

  [BOS] ann red cup . bob blue box . so bob blue box . [EOS]

Downstream tasks (section 4.2 of the paper has one per family; here, one toy stand-in each):
  classify   MNLI stand-in: facts + "so <name> <colour> <object> ." -> true or false. Half are true;
             a false one takes its colour or object (or both) from another fact, or uses one in no fact.
  generate   LAMBADA / TriviaQA stand-in: facts + "so <name>" -> generate "<colour> <object> ." (exact match).
  choose     ARC / SciQ stand-in (multiple choice by likelihood): the same prompt, four candidate
             "<colour> <object>" pairs, the one with the highest summed log-probability wins.
"""
import random

NAMES = ['ann', 'bob', 'cal', 'dee', 'eve', 'fay', 'gus', 'hal']
COLOURS = ['red', 'blue', 'green', 'gold', 'grey', 'pink']
OBJECTS = ['cup', 'box', 'hat', 'key', 'pen', 'bag']
WORDS = ['.', 'so']
SPECIAL = ['[PAD]', '[BOS]', '[EOS]', '[MASK]']
PAD, BOS, EOS, MASK = 0, 1, 2, 3


def vocab():
    return SPECIAL + WORDS + NAMES + COLOURS + OBJECTS


def facts(r):
    k = r.randint(2, 3)
    names = r.sample(NAMES, k)
    return [(n, r.choice(COLOURS), r.choice(OBJECTS)) for n in names]


def fact_words(fs):
    out = []
    for n, c, o in fs: out += [n, c, o, '.']
    return out


def document(r):
    """One pretraining document (words, without BOS/EOS): the facts, then three to six restatements, so a
    restatement is not always the last thing in the document (an encoder must not learn to read the
    distance to [EOS] as the answer's length)."""
    fs = facts(r); out = fact_words(fs)
    for _ in range(r.randint(3, 6)):
        n, c, o = r.choice(fs); out += ['so', n, c, o, '.']
    return out


def restated(r, fs):
    """Zero to two restatements before the one a task asks about."""
    out = []
    for _ in range(r.randint(0, 2)):
        n, c, o = r.choice(fs); out += ['so', n, c, o, '.']
    return out


def classify_example(r):
    fs = facts(r); pre = restated(r, fs); n, c, o = r.choice(fs)
    label = r.random() < 0.5
    if not label:
        others = [f for f in fs if f[0] != n]
        while True:
            kind = r.choice(['colour', 'object', 'both', 'unseen'])
            if kind == 'unseen':
                c2 = r.choice([x for x in COLOURS if all(x != f[1] for f in fs)] or COLOURS); o2 = o
            else:
                f2 = r.choice(others)
                c2 = f2[1] if kind in ('colour', 'both') else c
                o2 = f2[2] if kind in ('object', 'both') else o
            if (c2, o2) != (c, o): break
        c, o = c2, o2
    return fact_words(fs) + pre + ['so', n, c, o, '.'], int(label)


def generate_example(r):
    fs = facts(r); pre = restated(r, fs); n, c, o = r.choice(fs)
    return fact_words(fs) + pre + ['so', n], [c, o, '.'], fs


def choose_example(r):
    """Prompt, four candidate (colour, object) pairs, index of the right one. Distractors are the other
    facts' pairs first (the hard ones), then random pairs."""
    p, ans, fs = generate_example(r)
    right = (ans[0], ans[1])
    cands = [right]
    for f in fs:
        if (f[1], f[2]) not in cands and len(cands) < 4: cands.append((f[1], f[2]))
    while len(cands) < 4:
        x = (r.choice(COLOURS), r.choice(OBJECTS))
        if x not in cands: cands.append(x)
    r.shuffle(cands)
    return p, cands, cands.index(right)


if __name__ == '__main__':
    r = random.Random(1)
    for _ in range(3): print(' '.join(document(r)))
    print(classify_example(r)); print(generate_example(r)[:2]); print(choose_example(r))
    print(len(vocab()), 'words')

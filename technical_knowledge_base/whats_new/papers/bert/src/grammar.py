"""The page's toy language: a tiny English in which some words can only be read from their RIGHT context.

Two things in it make BERT's argument checkable:

1. Animal sentences, "the big dog barked at the farmer". The animal is fixed by the verb that comes after
   it (dog barked, cat purred, duck quacked, cow mooed), so a model reading left to right cannot know
   it at the noun; a bidirectional one can. Used for the fill-in-the-blank demo (masked LM).
2. Name sentences. Eight names (austin, paris, jordan, sydney, florence, chelsea, victoria, georgia)
   are each a person or a place equally often, so the name itself says nothing. The context decides:
   either a cue BEFORE the name ("we flew to austin", "i met austin") or a cue AFTER it ("austin is a
   city", "austin has a cold"). The fine-tuning task tags each name PER or LOC (like CoNLL NER); the
   sentence-level task classifies the whole sentence PER or LOC from one vector.

Pretraining text comes in "documents" (one entity in one role), so next sentence prediction has
something to learn: B is the next sentence when it comes from the same document.

Half of each cue list is held out of the labelled fine-tuning data (never out of pretraining), so the
test can ask whether pretraining taught the model that "danced" behaves like "smiled".
"""
import random

SPECIAL = ['[PAD]', '[CLS]', '[SEP]', '[MASK]']
NAMES = ['austin', 'paris', 'jordan', 'sydney', 'florence', 'chelsea', 'victoria', 'georgia']
ANIMALS = {'dog': 'barked', 'cat': 'purred', 'duck': 'quacked', 'cow': 'mooed'}
PEOPLE = ['man', 'woman', 'child', 'farmer']
ADJ = ['big', 'small', 'old', 'young', 'brown', 'white', 'lazy', 'happy']

# cues after the name (right context); the first five of each list are seen in the labelled data
PER_R = [['sang', 'a', 'song'], ['smiled'], ['laughed'], ['is', 'a', 'doctor'], ['has', 'a', 'brother'],
         ['danced'], ['waved'], ['is', 'a', 'pilot'], ['is', 'a', 'singer'], ['has', 'a', 'cold']]
LOC_R = [['is', 'a', 'city'], ['is', 'a', 'town'], ['has', 'a', 'river'], ['has', 'a', 'castle'], ['flooded'],
         ['is', 'a', 'port'], ['is', 'a', 'village'], ['has', 'a', 'harbour'], ['has', 'a', 'bridge'], ['lies', 'by', 'the', 'sea']]
# cues before the name (left context); the first three of each list are seen in the labelled data
PER_L = [['we', 'called'], ['i', 'met'], ['they', 'thanked'], ['she', 'hugged'], ['we', 'phoned'], ['i', 'emailed']]
LOC_L = [['we', 'flew', 'to'], ['she', 'lives', 'in'], ['they', 'moved', 'to'], ['i', 'was', 'born', 'in'], ['we', 'drove', 'to'], ['we', 'sailed', 'to']]
SEEN_R, SEEN_L = 5, 3
PREFIX = [[], ['yesterday'], ['i', 'think'], ['they', 'say'], ['last', 'year'], ['everyone', 'knows']]
SUFFIX = [[], ['yesterday'], ['last', 'year'], ['again'], ['today']]
TAGS = ['O', 'PER', 'LOC']


def vocab():
    w = list(SPECIAL)
    for x in (NAMES, list(ANIMALS), list(ANIMALS.values()), PEOPLE, ADJ,
              [t for c in PER_R + LOC_R + PER_L + LOC_L + PREFIX + SUFFIX for t in c],
              ['the', 'at', 'near', 'fed']):
        for t in x:
            if t not in w: w.append(t)
    return w


def name_sentence(r, name, role, side=None, seen=None):
    """One sentence about `name` in `role` ('PER' or 'LOC'). side: 'L' (cue before) or 'R' (cue after).
    seen: True keeps to the cue items allowed in the labelled data, False to the held-out ones, None any.
    Returns (words, index of the name, side, cue index)."""
    side = side or r.choice('LR')
    if side == 'R':
        cues = PER_R if role == 'PER' else LOC_R
        lo, hi = (0, SEEN_R) if seen is True else (SEEN_R, len(cues)) if seen is False else (0, len(cues))
        ci = r.randrange(lo, hi)
        pre = r.choice(PREFIX)
        w = pre + [name] + cues[ci] + r.choice(SUFFIX)
        return w, len(pre), side, ci
    cues = PER_L if role == 'PER' else LOC_L
    lo, hi = (0, SEEN_L) if seen is True else (SEEN_L, len(cues)) if seen is False else (0, len(cues))
    ci = r.randrange(lo, hi)
    w = cues[ci] + [name] + r.choice(SUFFIX)
    return w, len(cues[ci]), side, ci


def animal_sentence(r, animal):
    """'the [adj] [adj] dog barked [at|near the X]' or 'the farmer fed the [adj] dog' (no cue at all)."""
    adj = r.sample(ADJ, r.choice([0, 0, 1, 1, 2]))
    if r.random() < 0.8:
        w = ['the'] + adj + [animal, ANIMALS[animal]]
        k = r.random()
        if k < 0.35: w += ['at', 'the', r.choice(PEOPLE + list(ANIMALS))]
        elif k < 0.6: w += ['near', 'the', r.choice(PEOPLE + list(ANIMALS))]
        return w
    return ['the', r.choice(PEOPLE), 'fed', 'the'] + adj + [animal]


def doc(r):
    """A document: one entity in one role. Returns a function that draws a fresh sentence from it."""
    if r.random() < 0.75:
        name, role = r.choice(NAMES), r.choice(['PER', 'LOC'])
        return lambda: name_sentence(r, name, role)[0]
    a = r.choice(list(ANIMALS))
    return lambda: animal_sentence(r, a)


def pretrain_pair(r):
    """(A, B, is_next): 50% B is the next sentence of A's document, 50% a sentence from a random document."""
    d = doc(r)
    a = d()
    if r.random() < 0.5: return a, d(), 1
    return a, doc(r)(), 0


def labelled(r, seen=True, side=None):
    """One labelled fine-tuning sentence: (words, tags, sentence label, info). 80% name sentences, 20% animal ones.
    Animal sentences are all O and have no sentence label (None)."""
    if r.random() < 0.8:
        name, role = r.choice(NAMES), r.choice(['PER', 'LOC'])
        w, ni, sd, ci = name_sentence(r, name, role, side, seen)
        tags = ['O'] * len(w); tags[ni] = role
        return w, tags, role, {'name_at': ni, 'side': sd, 'cue': ci}
    w = animal_sentence(r, r.choice(list(ANIMALS)))
    return w, ['O'] * len(w), None, None


def space_size():
    """Number of distinct sentences the grammar can produce (name and animal sentences)."""
    nr = len(PREFIX) * len(SUFFIX) * (len(PER_R) + len(LOC_R))
    nl = len(SUFFIX) * (len(PER_L) + len(LOC_L))
    names = len(NAMES) * (nr + nl)
    adj = 1 + len(ADJ) + len(ADJ) * (len(ADJ) - 1)       # ordered, no repeat, 0 to 2 adjectives
    tail = 1 + 2 * (len(PEOPLE) + len(ANIMALS))
    animals = len(ANIMALS) * adj * (tail + len(PEOPLE))
    return names + animals


if __name__ == '__main__':
    r = random.Random(1)
    print(len(vocab()), 'words:', ' '.join(vocab()))
    for _ in range(4): print(pretrain_pair(r))
    for _ in range(4): print(labelled(r))
    print('sentence space', space_size())

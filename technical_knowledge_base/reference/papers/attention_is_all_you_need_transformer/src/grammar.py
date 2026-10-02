"""The toy "translation" task: a small English-like grammar into Lindu, a made-up language.

Lindu is verb-final (subject, place phrase, object, verb), puts adjectives after the noun in
mirrored order, puts the article after the adjectives, marks the object with "su" and uses
postpositions. So the alignment between the two languages crosses itself, as English to German
or Japanese does, and a model that ignores word order cannot translate it.

  the big red dog chased a small cat near the tree
  vor rusa gran ka  bamo ka pres  miska pik na su  kurat
  (dog red big the  tree the near cat small a  OBJ chased)

The same rules are mirrored in JavaScript on the page (parts/21_js_lang.js); check_forward.py
checks that both give the same reference translation.
"""
import random

DET = {'the': 'ka', 'a': 'na'}
ADJ = {'big': 'gran', 'small': 'pik', 'red': 'rusa', 'young': 'vetu', 'happy': 'jolo'}
NOUN = {'dog': 'vor', 'cat': 'miska', 'bird': 'pilo', 'man': 'tano', 'woman': 'selu',
        'child': 'kiri', 'fish': 'oma', 'horse': 'durak'}
PLACE = {'house': 'kesa', 'tree': 'bamo', 'river': 'ruvi', 'car': 'zimo'}
VERB = {'saw': 'vidar', 'chased': 'kurat', 'liked': 'amir', 'found': 'trovi', 'helped': 'pomag'}
PREP = {'near': 'pres', 'under': 'sub', 'behind': 'zad'}
OBJ = 'su'
SPECIAL = ['<pad>', '<s>', '</s>']


def vocab():
    """One shared vocabulary for both languages, as the paper shares one BPE vocabulary."""
    src = list(DET) + list(ADJ) + list(NOUN) + list(PLACE) + list(VERB) + list(PREP)
    tgt = list(DET.values()) + list(ADJ.values()) + list(NOUN.values()) + list(PLACE.values()) + \
        list(VERB.values()) + list(PREP.values()) + [OBJ]
    return SPECIAL + src + tgt


def sample_np(r, nouns):
    """Article, zero to two different adjectives, noun."""
    k = r.choices([0, 1, 2], [0.4, 0.35, 0.25])[0]
    return [r.choice(list(DET))] + r.sample(list(ADJ), k) + [r.choice(list(nouns))]


def sample(r):
    s = sample_np(r, NOUN) + [r.choice(list(VERB))] + sample_np(r, NOUN)
    if r.random() < 0.5:
        s += [r.choice(list(PREP))] + sample_np(r, PLACE)
    return s


def sample_uniform(r):
    """Every distinct sentence equally likely (the page's in-browser test): weights 1, 5, 20 for zero, one,
    two adjectives (the number of ordered choices), and a place phrase 624 times in 625."""
    def np_(nouns):
        k = r.choices([0, 1, 2], [1, 5, 20])[0]
        return [r.choice(list(DET))] + r.sample(list(ADJ), k) + [r.choice(list(nouns))]
    s = np_(NOUN) + [r.choice(list(VERB))] + np_(NOUN)
    if r.random() < 624 / 625:
        s += [r.choice(list(PREP))] + np_(PLACE)
    return s


def parse_np(w, i):
    det = w[i]; i += 1
    adjs = []
    while w[i] in ADJ:
        adjs.append(w[i]); i += 1
    return (det, adjs, w[i]), i + 1


def tr_np(np_):
    det, adjs, noun = np_
    return [NOUN.get(noun) or PLACE[noun]] + [ADJ[a] for a in reversed(adjs)] + [DET[det]]


def translate(w):
    """Reference translation by the rules: S [PP] O su V."""
    subj, i = parse_np(w, 0)
    verb = w[i]; i += 1
    obj, i = parse_np(w, i)
    pp = None
    if i < len(w):
        prep = w[i]
        place, i = parse_np(w, i + 1)
        pp = tr_np(place) + [PREP[prep]]
    return tr_np(subj) + (pp or []) + tr_np(obj) + [OBJ, VERB[verb]]


def alignment(w):
    """For each target word, the index of the source word it translates (None for 'su')."""
    out = []
    subj_end = None
    def np_al(start):
        j = start; det = j; j += 1
        adjs = []
        while w[j] in ADJ:
            adjs.append(j); j += 1
        return [j] + list(reversed(adjs)) + [det], j + 1
    s_al, i = np_al(0)
    v = i; i += 1
    o_al, i = np_al(i)
    pp_al = []
    if i < len(w):
        p = i
        pl_al, i = np_al(i + 1)
        pp_al = pl_al + [p]
    return s_al + pp_al + o_al + [None, v]


if __name__ == '__main__':
    r = random.Random(1)
    for _ in range(5):
        s = sample(r)
        print(' '.join(s), '->', ' '.join(translate(s)), alignment(s))
    print(len(vocab()), 'words in the shared vocabulary')

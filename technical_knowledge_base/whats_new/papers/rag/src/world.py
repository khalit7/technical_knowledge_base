"""The toy world of the page's live RAG model: a made-up encyclopedia (the non-parametric memory) and
the questions asked of it. Deterministic (seed 2020); imported by train.py and dumped to the page.

Every name is three syllables from a pool of 60, so a held-out entity is a new combination of
syllables the model has already seen, never an unknown token. No two entities share a syllable set,
so a bag-of-syllables retriever can tell any two names apart.

Documents (the "100-word chunks", here 8 to 14 tokens):
  country  "<C> : capital <K> . president <P> ."     one per country; the 2016 index differs for 40% of them
  person   "<P> : born in <K> ."                      one per person
  book     "<B> : first novel by <A> ."  and  "<B> : second novel by <A> ."   two per author
Questions (two phrasings each):
  president  who is the president of C ?   | who leads C ?             -> P
  capital    what is the capital of C ?    | capital city of C ?       -> K
  born       where was P born ?            | birthplace of P ?         -> K
  novels     novels by A ?                 | which novels did A write ? -> first B1 second B2   (needs two documents)
"""
import itertools, random

SYL = [c + v for c in 'bdfghklmnprstvz' for v in 'aeiou'][:60]  # 60 syllables: ba be bi bo bu da ...
WORDS = [':', '.', '?', '//', 'capital', 'president', 'born', 'in', 'first', 'second', 'novel', 'by', 'who', 'is', 'the',
         'of', 'leads', 'what', 'city', 'where', 'was', 'birthplace', 'novels', 'which', 'did', 'write', 'and']
SPECIAL = ['<pad>', '<s>', '</s>', '<mask>']
VOCAB = SPECIAL + WORDS + SYL
N_COUNTRY, N_AUTHOR, CHANGED = 300, 150, 0.4
TEST_COUNTRY, TEST_AUTHOR = 60, 40
TEMPLATES = {
    'president': [['who', 'is', 'the', 'president', 'of', 'X', '?'], ['who', 'leads', 'X', '?']],
    'capital': [['what', 'is', 'the', 'capital', 'of', 'X', '?'], ['capital', 'city', 'of', 'X', '?']],
    'born': [['where', 'was', 'X', 'born', '?'], ['birthplace', 'of', 'X', '?']],
    'novels': [['novels', 'by', 'X', '?'], ['which', 'novels', 'did', 'X', 'write', '?']],
}


def build(seed=2020):
    r = random.Random(seed)
    sets = list(itertools.combinations(range(len(SYL)), 3)); r.shuffle(sets)
    it = iter(sets)

    def name():
        s = list(next(it)); r.shuffle(s)
        return tuple(SYL[i] for i in s)
    countries = [name() for _ in range(N_COUNTRY)]
    capitals = [name() for _ in range(N_COUNTRY)]
    pres18 = [name() for _ in range(N_COUNTRY)]
    changed = sorted(r.sample(range(N_COUNTRY), int(N_COUNTRY * CHANGED)))
    pres16 = list(pres18)
    for i in changed: pres16[i] = name()
    authors = [name() for _ in range(N_AUTHOR)]
    books = [(name(), name()) for _ in range(N_AUTHOR)]
    people = pres18 + [pres16[i] for i in changed]
    born = {p: capitals[r.randrange(N_COUNTRY)] for p in people}
    test_c = set(r.sample(range(N_COUNTRY), TEST_COUNTRY))
    test_a = set(r.sample(range(N_AUTHOR), TEST_AUTHOR))

    def country_doc(i, pres):
        return list(countries[i]) + [':', 'capital'] + list(capitals[i]) + ['.', 'president'] + list(pres[i]) + ['.']
    docs_common = []
    for p in people:
        docs_common.append(dict(kind='person', ent=p, toks=list(p) + [':', 'born', 'in'] + list(born[p]) + ['.']))
    for a, (b1, b2) in zip(authors, books):
        docs_common.append(dict(kind='book', ent=b1, toks=list(b1) + [':', 'first', 'novel', 'by'] + list(a) + ['.']))
        docs_common.append(dict(kind='book', ent=b2, toks=list(b2) + [':', 'second', 'novel', 'by'] + list(a) + ['.']))
    index = {}
    for yr, pres in (('2018', pres18), ('2016', pres16)):
        index[yr] = [dict(kind='country', ent=countries[i], toks=country_doc(i, pres)) for i in range(N_COUNTRY)] + docs_common

    # questions: (task, template id, input tokens, answer tokens, gold doc indices in the 2018 index, split)
    nC = N_COUNTRY; nP = len(people)
    qs = []

    def q(task, ent, ans, gold, split):
        for t, tpl in enumerate(TEMPLATES[task]):
            x = []
            for w in tpl: x += list(ent) if w == 'X' else [w]
            qs.append(dict(task=task, tpl=t, x=x, y=list(ans), gold=gold, split=split))
    for i in range(nC):
        sp = 'test' if i in test_c else 'train'
        q('president', countries[i], pres18[i], [i], sp)
        q('capital', countries[i], capitals[i], [i], sp)
    pres_country = {}
    for i in range(nC): pres_country[pres18[i]] = i
    for j, i in enumerate(changed): pres_country[pres16[i]] = i
    for k, p in enumerate(people):
        sp = 'test' if pres_country[p] in test_c else 'train'
        q('born', p, born[p], [nC + k], sp)
    for a_i, (a, (b1, b2)) in enumerate(zip(authors, books)):
        sp = 'test' if a_i in test_a else 'train'
        q('novels', a, ['first'] + list(b1) + ['second'] + list(b2), [nC + nP + 2 * a_i, nC + nP + 2 * a_i + 1], sp)
    return dict(countries=countries, capitals=capitals, pres18=pres18, pres16=pres16, changed=changed, authors=authors,
                books=books, people=people, born=born, test_c=sorted(test_c), test_a=sorted(test_a), index=index, qs=qs)


if __name__ == '__main__':
    W = build()
    from collections import Counter
    print('vocab', len(VOCAB), 'docs', len(W['index']['2018']), 'questions', Counter((q['task'], q['split']) for q in W['qs']))
    print(' '.join(W['index']['2018'][0]['toks']), '|', ' '.join(W['index']['2016'][W['changed'][0]]['toks']))
    print(max(len(d['toks']) for d in W['index']['2018']), max(len(q['x']) for q in W['qs']), max(len(q['y']) for q in W['qs']))

"""Fetch the paper's released evaluation data (github.com/artidoro/qlora, eval/) and write a compact copy
for the page: inputs/eval_compact.json.

  python3 fetch_eval.py          (downloads about 90 MB into $QLORA_CACHE, default /tmp/qlora_cache/eval)

What is kept, per benchmark and judge:
  gpt4_vicuna_pairwise / gpt4_oa_pairwise: for every ordered pair of systems (first, second) the GPT-4 verdict on
      each prompt: '1' first better, '2' second better, '3' tie, '0' unparsed (score field missing or other).
  human_vicuna: one record per HIT (prompt, system_a, system_b, the three workers' answers).
  gpt4_vicuna_relative: for each system, GPT-4's two 10-point scores on each of the 80 prompts, in both orders
      (ChatGPT first, and the system first).
"""
import csv, io, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(os.environ.get('QLORA_CACHE', '/tmp/qlora_cache'), 'eval')
os.makedirs(CACHE, exist_ok=True)
RAW = 'https://raw.githubusercontent.com/artidoro/qlora/main/eval/'
API = 'https://api.github.com/repos/artidoro/qlora/git/trees/main?recursive=1'


def get(path):
    loc = os.path.join(CACHE, path.replace('/', '__'))
    if not os.path.exists(loc):
        urllib.request.urlretrieve(RAW + path, loc)
    return open(loc, encoding='utf-8').read()


def canon(name):
    """File-name system names -> one short id."""
    n = name
    for pat, out in [(r'^(7|13|30|65)b-guanaco', lambda m: 'guanaco-' + ('33' if m.group(1) == '30' else m.group(1)) + 'b'),
                     (r'^answer-gpt35|^gpt-3\.5', 'gpt35'), (r'^answer-gpt4|^gpt-4|^gpt4', 'gpt4'),
                     (r'^answer-vicuna-13b|^vicuna-13b', 'vicuna-13b'), (r'^answer-bard|^bard', 'bard'),
                     (r'^(7|13|30|65)b-([a-z0-9\-]+?)-vicuna-gen', lambda m: m.group(2) + '-' + ('33' if m.group(1) == '30' else m.group(1)) + 'b'),
                     (r'^13-self-instruct', 'self-instruct-13b-secondround')]:
        m = re.match(pat, n)
        if m: return out(m) if callable(out) else out
    return n


def main():
    tree = json.load(urllib.request.urlopen(API))['tree'] if not os.path.exists(os.path.join(CACHE, 'tree.json')) else json.load(open(os.path.join(CACHE, 'tree.json')))
    json.dump(tree, open(os.path.join(CACHE, 'tree.json'), 'w'))
    paths = [t['path'][5:] for t in tree if t['path'].startswith('eval/') and t['path'].endswith('.jsonl')]
    out = {'_source': 'https://github.com/artidoro/qlora/tree/main/eval (fetched by fetch_eval.py)', 'unparsed': {}}
    for key, folder in (('gpt4_vicuna_pairwise', 'ratings-gpt4/vicuna/pairwise/'), ('gpt4_oa_pairwise', 'ratings-gpt4/oa/')):
        d = {}
        for p in sorted(x for x in paths if x.startswith(folder)):
            f = p[len(folder):]
            a, b = f.split('-vs-')
            b = b.replace('-gpt-4-reviewer-threeclass.jsonl', '')
            A, B = canon(a), canon(b)
            rows = [json.loads(l) for l in get(p).splitlines() if l.strip()]
            idk = 'question_id' if 'question_id' in rows[0] else 'message_id'
            rows.sort(key=lambda r: r[idk])
            s = ''
            for r in rows:
                sc = r.get('score')
                s += str(sc) if sc in (1, 2, 3) else '0'
            d[A + '|' + B] = {'qids': [r[idk] for r in rows], 'v': s}
            out['unparsed'][key + ':' + A + '|' + B] = s.count('0')
        # store qids once if they agree
        if key == 'gpt4_vicuna_pairwise':
            q0 = next(iter(d.values()))['qids']
            assert all(v['qids'] == q0 for v in d.values()), 'question ids differ between files'
            out['vicuna_qids'] = q0
        else:
            q0 = next(iter(d.values()))['qids']
            out['oa_same_ids_in_every_file'] = all(v['qids'] == q0 for v in d.values())
            out['oa_n'] = {k: len(v['v']) for k, v in d.items()}
        out[key] = {k: v['v'] for k, v in d.items()}
    rel = {}
    # Which answer is ChatGPT's is decided by answer id, not by the file name: the released file names of the
    # QLoRA-trained systems are reversed ("65b-guanaco-...-vs-gpt-3.5" shows ChatGPT first).
    g35 = {json.loads(l)['answer_id'] for l in get('generations/vicuna/answer_gpt35.jsonl').splitlines() if l.strip()}
    folder = 'ratings-gpt4/vicuna/relative-gpt-3.5/'
    out['relative_reversed_names'] = 0
    for p in sorted(x for x in paths if x.startswith(folder)):
        f = p[len(folder):].replace('-gpt4-reviewer.jsonl', '')
        a, b = f.split('-vs-')
        rows = sorted((json.loads(l) for l in get(p).splitlines() if l.strip()), key=lambda r: r['question_id'])
        first_is_chatgpt = rows[0]['answer1_id'] in g35
        assert all((r['answer1_id'] in g35) == first_is_chatgpt and (r['answer2_id'] in g35) != first_is_chatgpt for r in rows)
        sysn = canon(b) if a == 'gpt-3.5' else canon(a)
        named_chatgpt_first = a == 'gpt-3.5'
        out['relative_reversed_names'] += named_chatgpt_first != first_is_chatgpt
        order = 'chatgpt_first' if first_is_chatgpt else 'system_first'
        sc = [r.get('score') for r in rows]
        ok = lambda s: isinstance(s, list) and len(s) == 2 and min(s) >= 0
        pairs = [([s[0], s[1]] if first_is_chatgpt else [s[1], s[0]]) if ok(s) else None for s in sc]   # stored as [chatgpt, system]
        rel.setdefault(sysn, {})[order] = {'qids': [r['question_id'] for r in rows], 'scores': pairs}
    out['gpt4_vicuna_relative'] = rel
    # human
    loc = os.path.join(CACHE, 'human.csv')
    if not os.path.exists(loc):
        urllib.request.urlretrieve(RAW + 'ratings-human/vicuna_benchmark_human_annotations.csv', loc)
    rows = list(csv.DictReader(open(loc, encoding='utf-8')))
    qs = [json.loads(l) for l in get('prompts/vicuna_questions.jsonl').splitlines() if l.strip()]
    qtext = {q['text'].strip(): q['question_id'] for q in qs}
    hits = {}
    for r in rows:
        h = hits.setdefault(r['hit_id_hash'], {'q': qtext.get(r['prompt'].strip()), 'a': r['system_a'], 'b': r['system_b'], 'votes': []})
        assert h['a'] == r['system_a'] and h['b'] == r['system_b']
        h['votes'].append({'system_a': 'a', 'system_b': 'b', 'tie': 't'}[r['answer']])
    out['human_vicuna'] = [[h['q'], h['a'], h['b'], ''.join(h['votes'])] for h in hits.values()]
    out['human_unmatched_prompts'] = sum(1 for h in hits.values() if h['q'] is None)
    out['vicuna_categories'] = {q['question_id']: q.get('category') for q in qs}
    json.dump(out, open(os.path.join(HERE, 'inputs', 'eval_compact.json'), 'w'), separators=(',', ':'))
    print('pairwise vicuna', len(out['gpt4_vicuna_pairwise']), 'oa', len(out['gpt4_oa_pairwise']), 'relative', len(rel),
          'human hits', len(hits), 'unmatched', out['human_unmatched_prompts'])
    print('unparsed total', sum(out['unparsed'].values()))


if __name__ == '__main__':
    main()

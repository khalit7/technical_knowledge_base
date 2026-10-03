"""Run the released SchrodingerRepo Level 2 extractor (glasses/extractor.py, commit e2eef98) on Django at the
base commit of django__django-11999, and keep only what this page needs: the Level 2 target identifiers that
occur in the page's excerpt, plus the reserved-token decision for every other word there.
usage: uv run --with rich python extract_targets.py <Schrodinger-Repo checkout> <django checkout at 84633905>
writes inputs/level2_targets.json (small). Neither checkout is kept in this repository."""
import json, re, sys
from pathlib import Path

if __name__ == '__main__':
    repo, dj = Path(sys.argv[1]), Path(sys.argv[2])
    sys.path.insert(0, str(repo)); sys.path.insert(0, str(repo / 'glasses'))
    from glasses.extractor import RepoIdentifierExtractor
    e = RepoIdentifierExtractor(dj); e.extract(max_workers=4)
    t = e.get_level2_namespace_targets()
    reserved = e.get_reserved_tokens()
    ex = json.load(open('inputs/excerpt.json'))
    words = set()
    for f in ex['files']:
        words.update(re.findall(r'[A-Za-z_][A-Za-z0-9_]*', f['text'])); words.update(re.split(r'[/.]', f['path']))
    words.update(re.findall(r'[A-Za-z_][A-Za-z0-9_]*', ex['issue']))
    words.update(x for p in ex['tree'] for x in re.split(r'[/]', p) if x)
    allt = set().union(*map(set, t.values()))
    hit = {w: sorted(k for k, v in t.items() if w in v) for w in sorted(words) if w in allt}
    out = {'_doc': 'Level 2 targets of the released extractor that occur in this page\'s excerpt (category lists from get_level2_namespace_targets on the whole Django checkout).',
           'counts': {k: len(v) for k, v in t.items()}, 'targets': hit,
           'reserved_in_excerpt': sorted(w for w in words if w.lower() in reserved),
           'not_targets': sorted(w for w in words if w not in allt and w.lower() not in reserved)}
    json.dump(out, open('inputs/level2_targets.json', 'w'), indent=1)
    print(out['counts'], len(hit), 'targets in excerpt')

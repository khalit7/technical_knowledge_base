#!/usr/bin/env python3
"""The page changes Khalid kept in the AI buddy, as a bundle for folding into the pages themselves.

The buddy keeps every change Claude made to a page for the reader (a rewrite, added text, a visual, a hidden or moved block) as a
record in the private notes repo khalit7/kb-notes (pages/<page path>.json). A change marked Keep is one worth making part of the
page. This script reads those records and prints, per page, each kept change with what it replaced, what the reader asked and the
version shown, so a session can fold them into the page's src/parts and rebuild.

Folding a change: put it into the page's parts (in the page's own style; a visual becomes a figure or a split section like the
page's own), and give the element that now carries it the attribute data-kb-edit="<change id>" (several ids space-separated; for a
hidden block that was deleted, the block now in its place). After the rebuild, the buddy sees the id on the page, drops its record
and syncs that. A rewrite whose text the page now says word for word is dropped the same way without the attribute.

It runs only when Khalid asks for it (no knowledge-base workflow reads the notes repo on its own).

usage:
  uv run python html_utils/kb_changes.py                  # every page, kept changes, read through `gh api`
  uv run python html_utils/kb_changes.py --page attention # pages whose path contains "attention"
  uv run python html_utils/kb_changes.py --notes ~/kb-notes --all --out /tmp/changes.md
  uv run python html_utils/kb_changes.py --json
"""
import argparse
import base64
import html
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KB = ROOT / 'technical_knowledge_base'
REV_KEYS = {'rewrite': ['html', 'why'], 'insert': ['html', 'why'], 'visual': ['title', 'expl', 'steps', 'html']}
KIND = {'rewrite': 'Rewrite', 'insert': 'Added text', 'visual': 'Visual', 'hide': 'Hidden block', 'move': 'Moved block'}


def norm(t):
    return re.sub(r'\s+', ' ', str(t or '')).strip()


class _Text(HTMLParser):
    """The page's visible text, without scripts and styles."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip:
            self.skip -= 1

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)   # joined as is, like the browser's textContent (x<sub>i</sub> is "xi")


def page_text(p):
    t = _Text()
    t.feed(p.read_text(encoding='utf-8', errors='replace'))
    return norm(''.join(t.out))


def gh_json(path, repo):
    try:
        r = subprocess.run(['gh', 'api', f'repos/{repo}/{path}'], capture_output=True, text=True)
    except FileNotFoundError:
        sys.exit('gh is not installed: install it and run `gh auth login`, or pass --notes <a clone of the notes repo>')
    if r.returncode:
        sys.exit(f'gh api {path} failed: {r.stderr.strip()}')
    return json.loads(r.stdout)


def load_files(notes, repo):
    """{page path: records} from a local clone, or from the repo through the GitHub API."""
    out = {}
    if notes:
        base = Path(notes).expanduser() / 'pages'
        for f in sorted(base.rglob('*.json')):
            out[f.relative_to(base).with_suffix('').as_posix()] = json.loads(f.read_text(encoding='utf-8')).get('records') or {}
        return out
    tree = gh_json('git/trees/HEAD?recursive=1', repo)
    for it in tree.get('tree', []):
        p = it.get('path', '')
        if it.get('type') == 'blob' and p.startswith('pages/') and p.endswith('.json'):
            blob = gh_json('git/blobs/' + it['sha'], repo)
            doc = json.loads(base64.b64decode(blob['content']).decode('utf-8'))
            out[p[6:-5]] = doc.get('records') or {}
    return out


def version(x):
    """The version shown (revs[cur]) folded onto the record, as the buddy does."""
    ks, revs = REV_KEYS.get(x.get('kind')), x.get('revs')
    if ks and isinstance(revs, list) and revs:
        try:
            cur = max(0, min(len(revs) - 1, int(x.get('cur') or 0)))
        except (TypeError, ValueError):
            cur = len(revs) - 1
        for k in ks:
            if k in revs[cur]:
                x[k] = revs[cur][k]
        x['_n'], x['_cur'] = len(revs), cur
    return x


def page_html(page):
    rel = re.sub(r'/?index\.html$', '', page).strip('/')
    rel = re.sub(r'^reference(/|$)', r'whats_new\1', rel)   # the site publishes whats_new/ (papers, tech news) as reference/
    if rel in ('', 'home'):
        return None   # the landing page is made by build_site.py, not a page folder
    p = KB / rel / 'index.html'
    return p if p.is_file() else None


def marked(raw, xid):
    """Whether an element of the page already carries this change's id in data-kb-edit (it was folded in)."""
    return any(xid in v.split() for v in re.findall(r'data-kb-edit\s*=\s*["\']([^"\']*)', raw))


def changes(files, page_filter, want_all):
    out = []
    for page, recs in sorted(files.items()):
        if page_filter and page_filter not in page:
            continue
        xs = [version(dict(r)) for r in recs.values() if isinstance(r, dict) and r.get('k') == 'edit' and not r.get('del')]
        xs = [x for x in xs if want_all or x.get('st') == 'kept']
        if not xs:
            continue
        hp = page_html(page)
        text = page_text(hp) if hp else ''
        raw = hp.read_text(encoding='utf-8', errors='replace') if hp else ''
        for x in sorted(xs, key=lambda y: y.get('t') or 0):
            qt = norm(x.get('qt'))
            x['_found'] = bool(text) and bool(qt) and qt[:60] in text
            x['_marked'] = marked(raw, str(x.get('id')))
            if x.get('kind') == 'rewrite':
                plain = norm(html.unescape(re.sub(r'<[^>]+>', '', str(x.get('html') or ''))))
                x['_folded'] = len(plain) >= 40 and plain in text
        out.append({'page': page, 'file': str(hp.relative_to(ROOT)) if hp else None, 'changes': xs})
    return out


def fence(s, lang=''):
    s = str(s or '')
    tick = '`' * max(3, 1 + max((len(m) for m in re.findall(r'`+', s)), default=0))
    return f'{tick}{lang}\n{s}\n{tick}'


def markdown(pages, want_all):
    n = sum(len(p['changes']) for p in pages)
    L = [f'# {"All" if want_all else "Kept"} page changes from the AI buddy', '',
         f'{n} change(s) on {len(pages)} page(s). Fold each into the page\'s src/parts in the page\'s own style, give the element that '
         'now carries it `data-kb-edit="<id>"` (space-separated for several), rebuild and check the page. The buddy then clears the '
         'change on the reader\'s devices (there is no undo for that, so check the id). Where the marker goes: a rewrite, on the block '
         'that now says it; added text, on the new paragraph; a visual, on its figure or split section; a hidden block deleted, on the '
         'block that now follows where it was (or on the `<details>` it was folded into); a moved block, on the block itself. "Where" '
         'quotes the start of the block the change sits on; "not found" means the page changed there since: check whether the change '
         'is already in the page before folding it again.', '']
    for p in pages:
        L += [f'## {p["page"]}', '', f'File: `{p["file"]}`' if p['file'] else 'File: not found in this repository', '']
        for x in p['changes']:
            k = x.get('kind')
            head = f'### {KIND.get(k, k)} `{x.get("id")}`'
            if x.get('st') != 'kept':
                head += ' (not kept)'
            L += [head, '']
            L.append(f'- Where: "{norm(x.get("qt"))[:160]}"' + ('' if x.get('_found') else ' (not found on the page now: check whether it is already folded in)'))
            if x.get('_marked'):
                L.append('- Already marked in the page (data-kb-edit): folded; the buddy clears it on the next load')
            if x.get('ask'):
                L.append(f'- Asked: {norm(x["ask"])[:300]}')
            if x.get('_n', 1) > 1:
                L.append(f'- Version {x["_cur"] + 1} of {x["_n"]} (the one shown)')
            if x.get('_folded'):
                L.append('- The page already says this word for word (it is dropped on the next load)')
            cur = x['revs'][x.get('_cur', 0)] if isinstance(x.get('revs'), list) and x['revs'] else {}
            if k == 'rewrite' and cur.get('ot'):
                L += ['', 'The block\'s text when this was written:', '', fence(cur['ot'])]
            if k in ('rewrite', 'insert'):
                L += ['', 'Text (HTML):', '', fence(x.get('html'), 'html')]
                if x.get('why'):
                    L.append(f'\nWhy: {norm(x["why"])}')
            elif k == 'visual':
                L += [f'- Title: {norm(x.get("title"))}']
                if x.get('expl'):
                    L.append(f'- Explanation: {norm(x["expl"])}')
                for i, s in enumerate(x.get('steps') or [], 1):
                    L.append(f'  {i}. {norm(s)}')
                L += ['', 'Visual (it ran in a sandboxed frame with `window.kit`, the drawing kit `kbKit` in html_utils/kb_buddy.js; on the page, '
                      'redraw it in the page\'s own style and figure helpers):', '',
                      fence(x.get('html'), 'html')]
            elif k == 'move':
                ref = x.get('ref') or {}
                L.append(f'- Moved {x.get("pos") or "after"} the block starting: "{norm(ref.get("qt"))[:160]}" (marker on the moved block)')
            elif k == 'hide':
                L.append('- The reader hid this block: delete it (marker on the block that now follows) or fold it into a closed detail (marker on the `<details>`)')
            L.append('')
    return '\n'.join(L)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--notes', help='a local clone of the notes repo (default: read it with gh api)')
    ap.add_argument('--repo', default='khalit7/kb-notes')
    ap.add_argument('--page', help='only pages whose path contains this')
    ap.add_argument('--all', action='store_true', help='also the changes not marked Keep')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--out', help='write here instead of printing')
    a = ap.parse_args()
    pages = changes(load_files(a.notes, a.repo), a.page, a.all)
    if a.json:
        for p in pages:
            for x in p['changes']:
                for k in [k for k in x if k.startswith('_')]:
                    x[{'_n': 'versions', '_cur': 'shown_version', '_found': 'found_on_page', '_folded': 'folded_into_page', '_marked': 'marked_on_page'}.get(k, k.lstrip('_'))] = x.pop(k)
        s = json.dumps(pages, indent=1, ensure_ascii=False)
    else:
        s = markdown(pages, a.all)
    if a.out:
        Path(a.out).write_text(s + '\n', encoding='utf-8')
        print(f'{sum(len(p["changes"]) for p in pages)} change(s) on {len(pages)} page(s) -> {a.out}')
    else:
        print(s)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Write coverage.json: every item of live.md, its numbers and its source links (trailing and inline), the
issue's own notes (under an item, a part or a subsection), with where the HTML carries each, checked against
the built ../index.html. Notion auto-links of bare names are listed as dropped. Run after build.sh."""
import json, re, html as H
I = json.load(open('data/items.json')); A = json.load(open('data/annotations.json'))
page = open('../index.html').read()
issue = page[page.index('id="t-read"'):page.index('id="t-more"')]
def flat(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S))))
def flat_tight(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S))))
text, tight = flat(issue), flat_tight(issue)
NUM = re.compile(r'\$?\d[\d,.]*\s?(?:%|[BMKT]\b|GB|TB|GW|ms|PB/s|x|\+)?')
out = {'source': 'live.md (Notion fetch, page last edited 2026-08-31, saved 2026-10-02)', 'checked_against': '../index.html', 'items': [], 'notes': [], 'dropped': []}
ok = True
def has(s): s = re.sub(r'\s+', ' ', s).strip(); return s in text or s in tight
ptext = flat(page)
fi = I['intro'].rstrip('.') in ptext; ok &= fi
out['intro'] = {'text': I['intro'], 'where': 'header subtitle and the At a glance lead', 'found': fi}
for it in I['items']:
    an = A['items'][str(it['n'])]
    sep = '' if it['text'][:1] in ':,;.' else ' '
    full = ((it['title'] + sep) if it['title'] else '') + it['text']
    nums = sorted(set(m.group(0).strip() for m in NUM.finditer(full) if len(m.group(0).strip()) > 1 or m.group(0).strip().isdigit()))
    tab = [s for s in A['sections'] if (it['sub'] or it['part']) in s['match']][0]
    rec = {'n': it['n'], 'part': it['part'], 'sub': it['sub'], 'prov': it['prov'], 'id': an['id'], 'where': f'{tab["label"]} tab, #i-{an["id"]} (verbatim text)',
           'text_verbatim_found': has(full),
           'numbers': [{'v': x, 'found': x in text or x in tight} for x in nums],
           'sources': [{'t': s['t'], 'u': s['u'], 'found': ('href="' + s['u'] + '"') in issue} for s in it['sources'] + it['inline']],
           'also_in': [v for v in [an.get('viz_after') and 'visual v-' + an['viz_after'], an.get('follow') and 'What happened next #f-' + an['follow']] if v],
           'notes_added': [k for k, _ in an.get('notes', [])]}
    if it.get('note'):
        rec['issue_note'] = {'text': it['note']['text'][:80] + '...', 'found': has(it['note']['text'])}; ok &= rec['issue_note']['found']
    for x in rec['numbers'] + rec['sources']: ok &= x['found']
    ok &= rec['text_verbatim_found']
    out['items'].append(rec)
    for l in it['autolinks']:
        out['dropped'].append({'item': it['n'], 'link': l, 'why': 'Notion auto-link of the name ' + l['t'] + ' to ' + l['u'] + ', not a source; the name is kept as text'})
for n in I['notes']:
    f = has(n['text']); ok &= f
    out['notes'].append({'part': n['part'], 'sub': n['sub'], 'text': n['text'][:90] + '...', 'where': 'At a glance, "How this issue was put together"' if not n['sub'] else 'top of the ' + n['sub'] + ' tab', 'found': f})
out['corrections'] = [{'item': k, 'note': re.sub(r'<[^>]+>', '', n[1])[:160] + '...'} for k, v in A['items'].items() for n in v.get('notes', []) if n[0] == 'corr']
out['unconfirmed'] = [{'item': k, 'note': re.sub(r'<[^>]+>', '', n[1])[:160] + '...'} for k, v in A['items'].items() for n in v.get('notes', []) if n[0] == 'unc']
out['followups'] = [{'id': f['id'], 'date': f['d'], 'for': f['for'], 'title': f['t']} for f in A['followups']]
out['all_found'] = bool(ok)
json.dump(out, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
n_num = sum(len(r['numbers']) for r in out['items']); n_src = sum(len(r['sources']) for r in out['items'])
print('items', len(out['items']), 'numbers', n_num, 'sources', n_src, 'issue notes', len(out['notes']) + sum(1 for r in out['items'] if 'issue_note' in r),
      'dropped', len(out['dropped']), 'corrections', len(out['corrections']), 'unconfirmed', len(out['unconfirmed']), 'follow-ups', len(out['followups']), 'all found', ok)
for r in out['items']:
    miss = [x['v'] for x in r['numbers'] if not x['found']] + [x['u'] for x in r['sources'] if not x['found']]
    if miss or not r['text_verbatim_found'] or ('issue_note' in r and not r['issue_note']['found']): print('MISSING', r['n'], r['text_verbatim_found'], miss)
for n in out['notes']:
    if not n['found']: print('MISSING NOTE', n['text'])

#!/usr/bin/env python3
"""Write coverage.json: every item of live.md, its numbers and its source links, with where the HTML carries
each, checked against the built ../index.html. Reusable for every issue. Run after build.sh."""
import json, re, html as H
I = json.load(open('data/items.json')); A = json.load(open('data/annotations.json'))
page = open('../index.html').read()
issue = page[page.index('id="t-read"'):page.index('id="t-more"')]
text = H.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'</?(b|code|a|i|em)(\s[^>]*)?>', '', re.sub(r'<script.*?</script>|<style.*?</style>', '', issue, flags=re.S))))
text = re.sub(r'\s+', ' ', text)
NUM = re.compile(r'\$?\d[\d,.]*\s?(?:%|[BMKT]\b|GB|ms|PFLOPS|PB/s|x|\+)?')
out = {'source': 'live.md (Notion fetch of the 2026-09-07 issue as last edited 2026-09-07, saved 2026-10-02)', 'checked_against': '../index.html', 'items': [], 'dropped': []}
ok = True
def has(s): return re.sub(r'\s+', ' ', s) in text
ptext = re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', page)))
fi = I['intro'].rstrip('.') in ptext
ok &= fi
out['intro'] = {'text': I['intro'], 'where': 'header subtitle (final full stop replaced by a colon)', 'found': fi}
for it in I['items']:
    an = A['items'][str(it['n'])]
    full = ((it['title'] + ('' if re.match(r'[,.:;)]', it['text']) else ' ')) if it['title'] else '') + it['text']
    nums = sorted(set(m.group(0).strip() for m in NUM.finditer(full) if len(m.group(0).strip()) > 1 or m.group(0).strip().isdigit()))
    rec = {'n': it['n'], 'section': it['section'], 'id': an['id'], 'where': f'The issue tab, #i-{an["id"]} (verbatim text)',
           'text_verbatim_found': has(full),
           'numbers': [{'v': x, 'found': x in text} for x in nums],
           'sources': [{'t': s['t'], 'u': s['u'], 'found': ('href="' + s['u'] + '"') in issue} for s in it['sources']],
           'also_in': [v for v in [an.get('viz_after') and 'visual v-' + an['viz_after'], an.get('follow') and 'What happened next #f-' + an['follow']] if v],
           'notes_added': [k for k, _ in an.get('notes', [])]}
    for x in rec['numbers'] + rec['sources']:
        ok &= x['found']
    ok &= rec['text_verbatim_found']
    out['items'].append(rec)
    rec['inline_links'] = [{'t': l['t'], 'u': l['u'], 'found': ('href="' + l['u'] + '"') in issue} for l in it['inline_links']]
    for x in rec['inline_links']: ok &= x['found']
out['corrections'] = [{'item': k, 'note': re.sub(r'<[^>]+>', '', n[1])[:160] + '...'} for k, v in A['items'].items() for n in v.get('notes', []) if n[0] == 'corr']
out['visuals'] = [{'id': 'v-' + a['viz_after'], 'after_item': int(k)} for k, a in A['items'].items() if a.get('viz_after')] + [{'id': 'v-strip', 'where': 'At a glance'}]
out['followups'] = [{'id': f['id'], 'date': f['d'], 'for': f['for'], 'title': f['t']} for f in A['followups']]
out['all_found'] = bool(ok)
json.dump(out, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
n_num = sum(len(r['numbers']) for r in out['items']); n_src = sum(len(r['sources']) + len(r['inline_links']) for r in out['items'])
print('items', len(out['items']), 'numbers', n_num, 'sources', n_src, 'dropped', len(out['dropped']), 'all found', ok)
for r in out['items']:
    miss = [x['v'] for x in r['numbers'] if not x['found']] + [x['u'] for x in r['sources'] + r['inline_links'] if not x['found']]
    if miss or not r['text_verbatim_found']: print('MISSING', r['n'], r['text_verbatim_found'], miss)

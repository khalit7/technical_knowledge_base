"""Generate the data-driven parts of the page from paper.json, tables.json, inputs/recompute.json and the toy's
model/report.json. Adapted from the reference paper page's mk_paper.py for a page that covers two papers.

  python3 mk_paper.py        (build.sh runs it)

Writes parts/_gen_card.html (headline card), parts/_gen_more.html (Further reading) and parts/_gen_data.js
(window.PAPER: metadata, tables, recomputed numbers, decoded figures, the toy's training report).
"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'paper.json')))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
RC = json.load(open(os.path.join(HERE, 'inputs', 'recompute.json')))
FG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
TOY = json.load(open(os.path.join(HERE, 'model', 'report.json'))) if os.path.exists(os.path.join(HERE, 'model', 'report.json')) else {}
P0 = os.path.join(HERE, 'model', 'pilot2_pos0', 'report_positions_restart_at_0.json')
TOY0 = json.load(open(P0)) if os.path.exists(P0) else {}
PP = {p['key']: p for p in P['papers']}
AX = {k: 'https://arxiv.org/html/%s%s' % (p['arxiv'], p['arxiv_v']) for k, p in PP.items()}
A = lambda u, t: '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (u, t)
N = lambda i: 'https://app.notion.com/p/' + i


def where_label(at):
    m = re.fullmatch(r'S(\d+)\.T(\d+)', at)
    if m: return 'Table ' + m.group(2)
    m = re.fullmatch(r'(?:S\d+|Sx\d+)\.F(\d+)', at)
    if m: return 'Figure ' + m.group(1)
    return '§' + '.'.join(re.findall(r'\d+', at))


def card():
    a, b = PP['A'], PP['B']
    h = ['<div class="hero" id="hero">',
         '<div class="hero-k">Two papers · %s · %s</div>' % (A('https://arxiv.org/abs/' + a['arxiv'], a['venue'] + ', arXiv ' + a['arxiv']), A('https://arxiv.org/abs/' + b['arxiv'], 'T5Gemma 2, arXiv ' + b['arxiv'])),
         '<h1>%s <span class="mute">(%s)</span></h1>' % (html.escape(P['title']), html.escape(P['short'])),
         '<div class="au">%s</div>' % html.escape(P['authors_short']),
         '<div class="au mute">%s; %s</div>' % (html.escape(a['date']), html.escape(b['date'])),
         '<p class="tk"><b>In one line:</b> %s</p>' % html.escape(P['takeaway']),
         '<p class="tk vd"><b>How far to trust it:</b> %s <a href="#s-believe">The evidence, judged</a>.</p>' % html.escape(P['verdict']),
         '<div class="hn">']
    for x in P['headline']:
        h.append('<div class="stat"><div class="v">%s <span class="u">%s</span></div><div class="k">%s</div><div class="d">%s · %s</div></div>'
                 % (x['v'], x['u'], x['k'], x['d'], A(AX[x['paper']] + '#' + x['at'], ('T5Gemma 2 ' if x['paper'] == 'B' else '') + where_label(x['at']))))
    h.append('</div>')
    h.append('<div class="hero-l">Encoder-Decoder Gemma: %s · %s<br>T5Gemma 2: %s · %s<br>%s · %s · <a href="#" data-tab="t-run">train the toy adaptation</a></div>'
             % (A(AX['A'], 'arXiv HTML'), A('https://arxiv.org/pdf/' + a['arxiv'] + a['arxiv_v'], 'PDF'), A(AX['B'], 'arXiv HTML'),
                A('https://arxiv.org/pdf/' + b['arxiv'] + b['arxiv_v'], 'PDF'), A(P['code']['url'], 'Transformers code'), A(P['weights'][0]['u'], 'weights')))
    h.append('<p class="small mute" style="margin:8px 0 0">Filed as one page rather than two because the second paper is the same recipe extended, and reading them separately would repeat the method twice.</p>')
    h.append('</div>')
    return '\n'.join(h)


def more():
    h = ['<section class="tab" id="t-more" hidden>', '<h2>Further reading</h2>',
         '<p class="small mute">Every link opens in a new tab. Reading time of the resources below: RES_TIME.</p>',
         '<h3>The papers</h3><div class="grid">']
    for p in P['papers']:
        h.append('<div class="sp"><div class="n">%s</div><p><span class="mute">%s (%s).</span> %s, %s: %s %s, %s.</p><p class="rt">(%s)</p></div>'
                 % (A(AX[p['key']], html.escape(p['title']) + ' (arXiv HTML ' + p['arxiv_v'] + ')'), html.escape(p['authors']), html.escape(p['lab']), html.escape(p['venue']), html.escape(p['date']), html.escape(p['note']),
                    A('https://arxiv.org/abs/' + p['arxiv'], 'Abstract page'), A('https://arxiv.org/pdf/' + p['arxiv'] + p['arxiv_v'], 'PDF'), p['time']))
    h.append('</div><h3>Weights and code</h3><div class="grid">')
    h.append('<div class="sp"><div class="n">%s</div><p>%s.</p><p class="rt">(%s)</p></div>' % (A(P['code']['url'], P['code']['title']), html.escape(P['code']['note']), P['code']['time']))
    for w in P['weights']:
        h.append('<div class="sp"><div class="n">%s</div><p>%s</p><p class="rt">(%s)</p></div>' % (A(w['u'], html.escape(w['t'])), html.escape(w['n']), w['time']))
    h.append('</div><h3>Best resources</h3><div class="grid">')
    for r in P['resources']:
        h.append('<div class="sp"><div class="n">%s</div><p><span class="mute">%s:</span> %s</p><p class="rt">(%s)</p></div>' % (A(r['u'], html.escape(r['t'])), html.escape(r['by']), html.escape(r['n']), r['time']))
    h.append('</div><h3>Connected papers in this knowledge base</h3><div class="grid">')
    for k in P['kb']:
        h.append('<div class="sp"><div class="n">%s</div><p>%s</p></div>' % (A(N(k['id']), html.escape(k['t'])), html.escape(k['n'])))
    h.append('</div><h3>Lab page and topics</h3><div class="grid">')
    for k in P['topics']:
        h.append('<div class="sp"><div class="n">%s</div><p>%s</p></div>' % (A(N(k['id']), html.escape(k['t'])), html.escape(k['n'])))
    h.append('</div><p class="small mute">This page is one row of the %s database; its properties (Paper, Takeaway, Topics, Year) live there.</p>' % A(N(P['parent']['id']), P['parent']['title']))
    h.append('</section>')
    return '\n'.join(h)


def data():
    meta = {'title': P['title'], 'ax': AX}
    toy = dict(TOY); toy['_pos0'] = {k: v for k, v in TOY0.items() if k not in ('pre_small', 'pre_big')}
    return '// Generated by mk_paper.py from paper.json, tables.json, inputs/recompute.json, inputs/figs.json and model/report.json.\nwindow.PAPER=' + json.dumps(
        {'meta': meta, 'tables': TB, 'rc': RC, 'figs': {k: FG[k] for k in ('latency', 'pt_score_vs_flops', 'it_score_vs_flops', 'superglue_score_vs_flops', 'ptscore_vs_step')}, 'toy': toy},
        separators=(',', ':'), ensure_ascii=False) + ';\n'


if __name__ == '__main__':
    open(os.path.join(HERE, 'parts', '_gen_card.html'), 'w').write(card() + '\n')
    open(os.path.join(HERE, 'parts', '_gen_more.html'), 'w').write(more() + '\n')
    open(os.path.join(HERE, 'parts', '_gen_data.js'), 'w').write(data())
    print('mk_paper: card, further reading and data written')

"""Generate the data-driven parts of a paper page from paper.json and tables.json.

  python3 mk_paper.py        (build.sh runs it first)

Writes parts/_gen_card.html (the headline card at the top of "The paper"), parts/_gen_more.html
(the Further reading tab) and parts/_gen_data.js (window.PAPER: metadata, the transcribed tables and
recompute.py's results). The same script serves every paper page: only paper.json and tables.json change.
"""
import html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, 'paper.json')))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
RC = json.load(open(os.path.join(HERE, 'inputs', 'recompute.json'))) if os.path.exists(os.path.join(HERE, 'inputs', 'recompute.json')) else {}
AX = 'https://arxiv.org/html/%s%s' % (P['arxiv'], P['arxiv_v'])
A = lambda u, t: '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (u, t)
N = lambda i: 'https://app.notion.com/p/' + i


def card():
    h = ['<div class="hero" id="hero">',
         '<div class="hero-k">Paper · %s · %s</div>' % (P['venue'], A('https://arxiv.org/abs/' + P['arxiv'], 'arXiv ' + P['arxiv'])),
         '<h1>%s <span class="mute">(%s)</span></h1>' % (html.escape(P['title']), html.escape(P['short'])),
         '<div class="au">%s</div>' % html.escape(P['authors']),
         '<div class="au mute">%s · %s</div>' % (html.escape(P['lab']), html.escape(P['date'])),
         '<p class="tk"><b>In one line:</b> %s</p>' % html.escape(P['takeaway']),
         '<div class="hn">']
    for x in P['headline']:
        h.append('<div class="stat"><div class="v">%s <span class="u">%s</span></div><div class="k">%s</div><div class="d">%s · %s</div></div>'
                 % (x['v'], x['u'], x['k'], x['d'], A(AX + '#' + x['at'], where_label(x['at']))))
    h.append('</div>')
    if P.get('verdict'):
        h.append('<p class="vd"><b>How far to trust it:</b> %s <a href="#s-trust">The evidence, point by point.</a></p>' % html.escape(P['verdict']))
    h.append('<div class="hero-l">%s · %s · %s · <a href="#" data-tab="%s">%s</a></div>'
             % (A(AX, 'read it (arXiv HTML)'), A('https://arxiv.org/pdf/' + P['arxiv'] + P['arxiv_v'], 'PDF'), A(P['code']['url'], P['code'].get('label', 'code') + ' (' + P['code']['title'] + ')'), P['live']['tab'], P['live']['text']))
    h.append('</div>')
    return '\n'.join(h)


def where_label(at):
    """Turn an arXiv HTML anchor into the paper's own name for it. In this paper appendix tables and figures are
    numbered on from the main text (A5.T14 is Table 14, A5.F33 is Figure 33); appendices A1..A6 are A..F; the
    anchor S3.T2 holds Tables 1 and 2; S0.F1 is Figure 1."""
    import re
    if at == 'S3.T2': return 'Tables 1 and 2'
    m = re.fullmatch(r'[SA]\d+\.E(\d+)', at)
    if m: return 'Eq. ' + m.group(1)
    m = re.fullmatch(r'[SA]\d+\.T(\d+)', at)
    if m: return 'Table ' + m.group(1)
    m = re.fullmatch(r'[SA]\d+\.F(\d+)', at)
    if m: return 'Figure ' + m.group(1)
    m = re.fullmatch(r'A(\d+)(?:\.SS(\d+))?.*', at)
    if m: return '§' + chr(64 + int(m.group(1))) + ('.' + m.group(2) if m.group(2) else '')
    nums = re.findall(r'\d+', at.split('.SSS0')[0])
    return '§' + '.'.join(nums)


def more():
    h = ['<section class="tab" id="t-more" hidden>', '<h2>Further reading</h2>',
         '<p class="small mute">Every link opens in a new tab. Reading time of the resources below: RES_TIME.</p>',
         '<h3>The paper</h3><div class="grid">']
    h.append('<div class="sp"><div class="n">%s</div><p>%s, the paper itself (%s); the HTML version has the anchors this page links to. %s, %s.</p><p class="rt">(%s)</p></div>'
             % (A(AX, P['title'] + ' (arXiv HTML ' + P['arxiv_v'] + ')'), html.escape(P['venue']), html.escape(P.get('paper_note', '')), A('https://arxiv.org/abs/' + P['arxiv'], 'abstract page'), A('https://arxiv.org/pdf/' + P['arxiv'] + P['arxiv_v'], 'PDF'), P['paper_time']))
    h.append('<div class="sp"><div class="n">%s</div><p>%s.</p><p class="rt">(%s)</p></div>' % (A(P['code']['url'], P['code']['title']), html.escape(P['code']['note']), P['code']['time']))
    h.append('</div><h3>Best resources</h3><div class="grid">')
    for r in P['resources']:
        n = html.escape(r['n'])
        n = n.replace('arXiv 2408.04619 (https://arxiv.org/abs/2408.04619)', A('https://arxiv.org/abs/2408.04619', 'arXiv 2408.04619'))
        h.append('<div class="sp"><div class="n">%s</div><p><span class="mute">%s:</span> %s</p><p class="rt">(%s)</p></div>' % (A(r['u'], html.escape(r['t'])), html.escape(r['by']), n, r['time']))
    h.append('</div><h3>Connected papers in this knowledge base</h3><div class="grid">')
    for k in P['kb']:
        h.append('<div class="sp"><div class="n">%s</div><p>%s</p></div>' % (A(N(k['id']), html.escape(k['t'])), html.escape(k['n'])))
    h.append('</div><h3>Topics</h3><div class="grid">')
    for k in P['topics']:
        h.append('<div class="sp"><div class="n">%s</div><p>%s</p></div>' % (A(N(k['id']), html.escape(k['t'])), html.escape(k['n'])))
    h.append('</div><p class="small mute">This page is one row of the %s database; its properties (Paper, Takeaway, Topics, Year) live there.</p>' % A(N(P['parent']['id']), P['parent']['title']))
    h.append('</section>')
    return '\n'.join(h)


def data():
    meta = {k: P[k] for k in ('title', 'short', 'arxiv', 'arxiv_v')}
    meta['ax'] = AX
    figs = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
    for k in list(figs):
        figs[k].pop('words', None)
        for pn in figs[k].get('panels', {}).values():
            if isinstance(pn, dict): pn.pop('fit_res', None)
    for rows in figs['fig6']['panels'].values():
        for m in rows.values():
            for r in m: r.pop('segs', None); r.pop('x0', None)
    return '// Generated by mk_paper.py from paper.json, tables.json, inputs/recompute.json and inputs/figs.json.\nwindow.PAPER=' + json.dumps(
        {'meta': meta, 'tables': TB, 'rc': RC, 'figs': figs}, separators=(',', ':'), ensure_ascii=False) + ';\n'


if __name__ == '__main__':
    open(os.path.join(HERE, 'parts', '_gen_card.html'), 'w').write(card() + '\n')
    open(os.path.join(HERE, 'parts', '_gen_more.html'), 'w').write(more() + '\n')
    open(os.path.join(HERE, 'parts', '_gen_data.js'), 'w').write(data())
    print('mk_paper: card, further reading and data written')

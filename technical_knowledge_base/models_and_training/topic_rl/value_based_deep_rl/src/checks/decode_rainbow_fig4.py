# Decodes Rainbow (arXiv 1710.02298) Figure 4 from the PDF's vector rectangles. Run in a scratch folder holding rainbow.pdf:
#   uv run --with pymupdf python decode_rainbow_fig4.py  (needs fig4raw.json from the label pass: game names are the rotated x labels)
# Output: fig4.json, copied to ../inputs/rainbow_fig4_decoded.json. Row geometry (zero line, DQN line, top clip) read from the page's horizontal lines.
import pymupdf as fitz, json, collections
doc=fitz.open('rainbow.pdf'); pg=doc[6]
bars=[]
for d in pg.get_drawings():
    for it in d['items']:
        if it[0]=='re' and d.get('fill'):
            r=it[1]
            if r.x1-r.x0<10 and r.y0>50 and r.y1<300: bars.append([r.x0,r.y0,r.x1,r.y1,d.get('fill_opacity'),d.get('color') is not None,d.get('seqno')])
print(collections.Counter((b[4],b[5]) for b in bars))
rows=[('no noisy',71.99,84.95,59.04),('no distribution',113.53,126.49,100.58),('no multi-step',155.07,168.03,142.12),('no dueling',196.61,209.57,183.66),('no priority',238.15,251.11,225.2),('no double',279.69,292.65,266.74)]
games=[l[1] for l in json.load(open('fig4raw.json'))['labs'] if l[1] not in ('Figure','4:','Performance','drops','of','ablation','agents','on','all','57','Atari','games.','is','the','area','under','learning','curve,')]
xs=sorted(set(round(b[0],2) for b in bars))
assert len(xs)==55==len(games), (len(xs),len(games))
res={'games':games,'rows':{},'hi':{}}
for name,z,one,top in rows:
    vals=[];hi=[]
    for x in xs:
        bs=[b for b in bars if abs(b[0]-x)<0.05 and top-0.5<=b[1]<=one+0.5 and top-0.5<=b[3]<=one+0.5]
        if not bs: vals.append(0.0); hi.append(False); continue
        b=bs[0]
        v=(b[3]-z)/(one-z) if b[3]>z+0.01 else -(z-b[1])/(z-top)
        vals.append(round(v,3)); hi.append(any(bb[4]==1.0 for bb in bs))
    res['rows'][name]=vals; res['hi'][name]=hi
print({k:sum(v) for k,v in res['hi'].items()})
# per game, which row is highlighted and is it the max
bad=0
for g in range(55):
    hs=[k for k in res['rows'] if res['hi'][k][g]]
    mx=max(res['rows'],key=lambda k:res['rows'][k][g])
    if mx not in hs: bad+=1; print('mismatch',games[g],hs,mx,[res['rows'][k][g] for k in res['rows']])
print('bad',bad)
json.dump(res,open('fig4.json','w'))

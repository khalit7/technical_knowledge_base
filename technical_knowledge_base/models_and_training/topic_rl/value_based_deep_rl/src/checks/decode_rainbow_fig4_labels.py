# Label pass for Rainbow Figure 4: game names (rotated x labels) and raw bar rectangles -> fig4raw.json. Run before decode_rainbow_fig4.py.
import pymupdf as fitz, json, statistics as st
doc=fitz.open('rainbow.pdf'); pg=doc[6]
rows=[('no noisy',71.99,84.95,59.04),('no distribution',113.53,126.49,100.58),('no multi-step',155.07,168.03,142.12),('no dueling',196.61,209.57,183.66),('no priority',238.15,251.11,225.2),('no double',279.69,292.65,266.74)]
bars=[]
for d in pg.get_drawings():
    for it in d['items']:
        if it[0]=='re' and d.get('color') is not None and d.get('fill'):
            r=it[1]
            if r.x1-r.x0<10 and r.y0>50 and r.y1<300: bars.append((r.x0,r.y0,r.x1,r.y1,tuple(round(c,3) for c in d['fill'])))
print(len(bars))
# game labels: rotated words below y 300
words=[w for w in pg.get_text('words') if w[1]>295 and w[3]<380]
labs=sorted([( (w[0]+w[2])/2, w[4]) for w in words])
print(len(labs)); print(labs[:60])
xs=sorted(set(round(b[0],2) for b in bars)); print(len(xs), xs[:5])
json.dump({'bars':bars,'labs':labs},open('fig4raw.json','w'))

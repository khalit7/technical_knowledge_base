import json
L=json.load(open('live_rows.json'));J=json.load(open('../../src/data/release_history.json'))['rows']
FIX={
 'Aya Expanse':dict(lic='CC-BY-NC 4.0',t=32,a=32,sz='32',fix='Licence confirmed and size filled (the live page said "unverified" and "n/a"): the model card gives CC-BY-NC and "32 billion parameters" for the larger of the 8B and 32B models.',fu='https://huggingface.co/CohereLabs/aya-expanse-32b'),
 'GLM-4.7':dict(t=355,a=32,sz='355 / 32',fix='Size filled (the live page said "n/a"), by construction: every size field of its config.json matches GLM-4.5\'s, the 355B / 32B row.',fu='https://huggingface.co/zai-org/GLM-4.7/raw/main/config.json'),
 'Gemma 4':dict(t=31,a=31,sz='31',fix='Size filled (the live page said "n/a"): 31B is the largest, dense; the 26B MoE activates 3.8B, so "26B-A4B" is the rounded name.',fu='https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/'),
 'GLM-5.3':dict(t=744,a=40,sz='744 / 40',fix='Size filled (the live page said "n/a"), by construction: the model card says it "uses the same base model as GLM-5.2" (744 / 40); the Hub\'s tensor count reads 753B.',fu='https://huggingface.co/zai-org/GLM-5.3'),
 'Grok-1':dict(a=78.5,da=1,fix='Active size derived here: xAI says "25% of the weights active on a given token", so 0.25 × 314 = 78.5B (the live page gave the total only).',fu='https://x.ai/news/grok-os'),
}
out=[]
for l,j in zip(L,J):
    r=dict(d=l['date'],m=l['model'],l=l['lab'],o=j['open_weights'],lic=j['licence'],sz=l['size'],t=j['total_params_B'],a=j['active_params_B'],n=l['note'].replace('\\$','$'),u=l['url'],k=[k for k in j['kind'] if k!='open'])
    if r['t'] is not None and r['a'] is None and r['m']!='Grok-1': pass
    if l['model'] in FIX: r.update(FIX[l['model']])
    if r['lic'] and 'not verified' in r['lic']: r['lic']='CC-BY-NC 4.0'
    r['lic']=r['lic'].replace('\\$','$') if r['lic'] else r['lic']
    out.append(r)
s='// The 140 rows of the live page (date, model, lab, weights and licence, size, note, source), joined with the kind tags of release_history.json. fix = a correction made in this version, with its source fu.\nconst ROWS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('parts/15a_data.js','w').write(s);print(len(out),len(s))

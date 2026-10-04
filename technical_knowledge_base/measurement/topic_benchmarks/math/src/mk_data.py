"""Build the page's MathArena data from the public MathArena datasets on Hugging Face (CC BY-NC-SA 4.0, ETH Zurich SRI Lab).
usage: uv run --with pyarrow python3 mk_data.py <cache dir with the parquet files>
Downloads (once, into the cache dir): MathArena/{aime_2025,aime_2026,hmmt_feb_2026} and their *_outputs datasets.
Writes inputs/matharena_samples.json (every parsed final answer, grouped per problem) and parts/22_js_data.js (window.MA, compact)."""
import sys, os, json, collections, urllib.request
import pyarrow.parquet as pq
from tex import tex2html, ans2html
C=sys.argv[1] if len(sys.argv)>1 else 'cache'
COMPS=[('aime_2025','AIME 2025','aime--aime_2025','AIME I on 6 Feb and AIME II on 12 Feb 2025'),
       ('aime_2026','AIME 2026','aime--aime_2026','AIME I on 5 Feb and AIME II on 11 Feb 2026'),
       ('hmmt_feb_2026','HMMT February 2026','hmmt--hmmt_feb_2026','HMMT February 2026')]
def get(name):
    p=os.path.join(C,name+'.parquet')
    if not os.path.exists(p):
        os.makedirs(C,exist_ok=True)
        urllib.request.urlretrieve('https://huggingface.co/datasets/MathArena/%s/resolve/main/data/train-00000-of-00001.parquet'%name,p)
    return p
TAB=json.load(open('inputs/matharena_tables_2026-10-04.json'))
B36='0123456789abcdefghijklmnopqrstuvwxyz'
def enc(k): return B36[k//36]+B36[k%36]
full={'source':'Hugging Face datasets MathArena/<comp> and MathArena/<comp>_outputs (CC BY-NC-SA 4.0), downloaded 2026-10-04','comps':[]}
page={'comps':[]}
for key,name,tkey,date in COMPS:
    P=pq.read_table(get(key)).to_pylist()
    O=pq.read_table(get(key+'_outputs'),columns=['problem_idx','model_name','idx_answer','gold_answer','parsed_answer','correct','output_tokens','cost']).to_pylist()
    probs=sorted(P,key=lambda p:int(p['problem_idx']))
    n=len(probs)
    tab={r['m']:r for r in TAB[tkey]}
    by=collections.defaultdict(lambda: collections.defaultdict(dict))
    for r in O: by[r['model_name']][int(r['problem_idx'])][int(r['idx_answer'])]=r
    # per-problem answer dictionary: index 0 = the gold answer (every answer graded correct maps there)
    dic={int(p['problem_idx']):[str(p['answer'])] for p in probs}
    def idx(pi,r):
        if r['correct']: return 0
        a=str(r['parsed_answer']); d=dic[pi]
        if a not in d: d.append(a)
        return d.index(a)
    models=[]
    for m,pp in by.items():
        runs=max(len(v) for v in pp.values())
        s=[];answers={}
        for p in probs:
            pi=int(p['problem_idx']); rr=pp.get(pi,{})
            row=[]
            for k in range(runs):
                if k in rr: row.append(idx(pi,rr[k]))
                else: row.append(None)
            answers[pi]=[None if x is None else x for x in row]
            s.append(''.join('--' if x is None else enc(x) for x in row))
        t=tab.get(m,{})
        nans=sum(len(v) for v in pp.values())
        if nans<n: print('  skipped (fewer answers than problems):',m,nans); continue
        tok=sum(r['output_tokens'] or 0 for v in pp.values() for r in v.values())/max(1,nans)
        cost=sum(r['cost'] or 0 for v in pp.values() for r in v.values())
        models.append({'n':m,'r':runs,'after':bool(t.get('after',False)),'acc':t.get('acc'),'ci':t.get('ci'),'na':nans,'tok':round(tok),'cost':round(cost/max(1,runs),3),'s':''.join(s)})
        full_m={'model':m,'runs':runs,'answers':answers}
    models.sort(key=lambda x:(-(x['acc'] if x['acc'] is not None else -1),x['n']))
    pg={'k':key,'name':name,'date':date,'tkey':tkey,'n':n,
        'probs':[{'i':int(p['problem_idx']),'q':tex2html(p['problem']),'d':[ans2html(a) for a in dic[int(p['problem_idx'])]]} for p in probs],
        'models':models}
    page['comps'].append(pg)
    full['comps'].append({'key':key,'name':name,'answer_dict':{str(k):v for k,v in dic.items()},'models':[{k:v for k,v in mm.items()} for mm in models]})
    print(name,'problems',n,'models',len(models),'answers',len(O))
json.dump(full,open('inputs/matharena_samples.json','w'),separators=(',',':'))
js='// MathArena final answers (CC BY-NC-SA 4.0, ETH Zurich SRI Lab), built by src/mk_data.py from the Hugging Face datasets on 2026-10-04.\n'
js+='// Per model, s holds 2 base-36 characters per sample (problem by problem, run by run): an index into that problem\'s answer list d, where 0 is the gold answer; "--" = run missing.\n'
js+='window.MA='+json.dumps(page,separators=(',',':'),ensure_ascii=False)+';\n'
open('parts/22_js_data.js','w').write(js)
print('js bytes',len(js.encode()))

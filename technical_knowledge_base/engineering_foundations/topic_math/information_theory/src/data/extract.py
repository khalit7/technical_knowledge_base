# Build src/inputs/measured.json from the scratch outputs of score.py (scores_*.json) and comp.py (comp.json).
# usage: python3 extract.py <scratch dir>
import json, math, sys, os, re
S=sys.argv[1]; OUT=os.path.join(os.path.dirname(__file__),'..','inputs','measured.json')
comp=json.load(open(os.path.join(S,'comp.json')))
res={'note':'Per-token nats from score.py (float32 CPU, sliding window 1024 tokens, stride 512, BOS prepended); compressors from comp.py.',
     'texts':{}, 'compressors':{}, 'order0':comp['order0'], 'comp_versions':{k:re.sub(r'^.*?(bzip2, a block-sorting file compressor\.\s+Version)','bzip2 version',v).replace('*** ','').replace(' ***','') for k,v in comp['versions'].items()}, 'lens':comp['lens'], 'book_bytes':comp['book_bytes']}
for key,f in [('en','scores_en.json'),('fr','scores_fr.json'),('code','scores_code.json')]:
    d=json.load(open(os.path.join(S,f)))
    t={'bytes':d['text_bytes'],'chars':d['text_chars'],'transformers':d['transformers'],'torch':d['torch'],'models':{}}
    for name,m in d['models'].items():
        # cumulative bits at byte prefixes (for the en text, the compressor prefix lengths)
        cum=[];b=0;n=0;k=0;lens=comp['lens'] if key=='en' else []
        pref=[]
        for tok,nb,x in m['tokens']:
            b+=nb;n+=x
            while k<len(lens) and b>=lens[k]:
                pref.append(round(n/math.log(2)/b,4));k+=1
        t['models'][name]={'n_tokens':m['n_tokens'],'vocab':m['vocab'],'words':m['words'],'total_nats':round(m['total_nats'],3),
            'ce':round(m['ce_nats_per_token'],4),'ppl':round(m['ppl'],3),'bpb':round(m['bpb'],4),'bpc':round(m['bpc'],4),
            'bpt':round(m['bytes_per_token'],4),'prefix_bpb':pref,
            'head':[[tok,nb,round(x,3)] for tok,nb,x in m['tokens'][:40]]}
        ws=[x for tok,nb,x in m['tokens'] if set(tok)<=set('\u0120\u010a\u0109')]
        t['models'][name]['ws_tokens']=len(ws); t['models'][name]['ws_mean']=round(sum(ws)/max(1,len(ws)),3)
        t['models'][name]['nonws_mean']=round((m['total_nats']-sum(ws))/(m['n_tokens']-len(ws)),3)
    res['texts'][key]=t
for k,v in comp['comp'].items():
    if k=='zstd --ultra -22': continue
    res['compressors'][k]={'prefix_bpb':[round(x,4) for x in v['prefix_bpb']],'book_bpb':round(v['book_bpb'],4),'sample_bytes':v['prefix_bytes'][-1]}
json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=0)
print(os.path.getsize(OUT))

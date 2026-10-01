#!/usr/bin/env python3
"""Build parts/13a_tl_data.js (training logs, checkpoints, stability) from the raw pulls in src/.
Raw data: Weights & Biases public project ai2-llm (GraphQL sampledHistory, pulled 1 Oct 2026) and
Hugging Face refs API for allenai models (pulled 1 Oct 2026). See README.md."""
import json,re,statistics,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
S='inputs/'
def segs_and_points(proj,bs):
    R=json.load(open(S+'hist_%s.json'%proj))
    isPre=lambda dn: not any(k in dn for k in ('midtraining','longcontext','anneal','lc_64k'))
    segs=[];pts=[];ev={};post=[]
    for r in R:
        L=[x for x in r.get('loss',[]) if x.get('train/CE loss') is not None]
        if not L: continue
        if isPre(r['dn']):
            segs.append([min(x['_timestamp'] for x in L),max(x['_timestamp'] for x in L),min(x['_step'] for x in L),max(x['_step'] for x in L)])
            pts+=[(x['_step'],x['_timestamp'],x['train/CE loss']) for x in L]
            for x in r.get('ev2',[]): ev[x['_step']]=x
        else:
            post.append((r['dn'],sorted((x['_step'],x['_timestamp'],x['train/CE loss']) for x in L)))
    segs.sort()
    return segs,pts,ev,post
def binned(pts,t0,n=420,key=0):
    pts=sorted(pts,key=lambda p:p[key]);lo,hi=pts[0][key],pts[-1][key];w=(hi-lo)/n or 1
    out={}
    for p in pts:
        b=min(n-1,int((p[key]-lo)/w));out.setdefault(b,[]).append(p)
    res=[]
    for b in sorted(out):
        a=out[b];res.append([round(statistics.mean(x[0] for x in a)),round((statistics.mean(x[1] for x in a)-t0)/3600,2),round(statistics.median(x[2] for x in a),4)])
    return res
def model(proj,bs,refs,label,stages):
    segs,pts,ev,post=segs_and_points(proj,bs)
    t0=segs[0][0]
    # drop the first steps (loss above 4) from the binned curve so the scale is readable; keep the start value
    first=sorted(pts)[0]
    body=[p for p in pts if p[2]<4.0]
    curve=binned(body,t0,520)
    E=[]
    for s in sorted(ev):
        x=ev[s];g=lambda k:next((v for kk,v in x.items() if k in kk and v is not None),None)
        mm=[v for kk,v in x.items() if 'mmlu' in kk and v is not None]
        E.append([s,round(sum(mm)/len(mm),3) if len(mm)==4 else None,g('arc_challenge') and round(g("arc_challenge"),3),g('basic_skills_arithmetic') and round(g("basic_skills_arithmetic"),3)])
    # stage 2 and 3 runs, binned by step, offset onto the token axis after stage 1
    P=[]
    for dn,L in post:
        P.append({'dn':dn,'pts':[[p[0],round(p[2],4)] for p in L[::max(1,len(L)//80)]]})
    gaps=sum(max(0,segs[i][0]-segs[i-1][1]) for i in range(1,len(segs)))/3600
    redo=sum(max(0,segs[i-1][3]-segs[i][2]) for i in range(1,len(segs)))
    b=[x['name'] for x in json.load(open(S+refs))['branches']]
    ck={st:sorted(int(re.search(r'step(\d+)',n).group(1)) for n in b if n.startswith(st)) for st in ('stage1','stage2','stage3')}
    return {'label':label,'bs':bs,'t0':t0,'first':[first[0],round(first[2],3)],
            'segs':[[round((a-t0)/3600,2),round((c-t0)/3600,2),s0,s1] for a,c,s0,s1 in segs],
            'curve':curve,'ev':E,'post':P,'gapsH':round(gaps,1),'redo':redo,'wallD':round((segs[-1][1]-t0)/86400,2),
            'ck':{k:[v//1000 if v%1000==0 else round(v/1000,3) for v in vals] for k,vals in ck.items()},'nBranches':len(b),'stages':stages}
M32=model('Olmo-3-1125-32B',8388608,'olmo3_32b_refs.json','Olmo 3 32B',{'s1end':656000})
M7=model('Olmo-3-1025-7B',4194304,'refs_allenai_Olmo-3-1025-7B.json','Olmo 3 7B',{'s1end':1413814})
def stab(f,label,bs):
    d=json.load(open(S+f));lk,gk=d['keys'][1],d['keys'][2]
    pts=sorted((x['_step'],x[lk],x.get(gk)) for r in d['runs'] for x in r.get('h',[]) if x.get(lk) is not None and x.get(gk) is not None)
    # spike score as defined in the OLMo 2 report (section 3.2): share of values at least 7 standard deviations
    # from the rolling mean of the previous 1,000 values. Applied here to W&B's sampled points, not every step.
    def ss(idx):
        v=[p[idx] for p in pts];c=0
        for i in range(1000,len(v)):
            w=v[i-1000:i];m=statistics.fmean(w);sd=statistics.pstdev(w)
            if abs(v[i]-m)>=7*sd: c+=1
        return c,round(100*c/(len(v)-1000),3)
    (ls,lss),(gs,gss)=ss(1),ss(2)
    n=400;lo,hi=pts[0][0],pts[-1][0];w=(hi-lo)/n;B={}
    for p in pts: B.setdefault(min(n-1,int((p[0]-lo)/w)),[]).append(p)
    cur=[[round(statistics.mean(x[0] for x in a)),round(statistics.median(x[1] for x in a),3),round(max(x[1] for x in a),3),round(statistics.median(x[2] for x in a),3),round(max(x[2] for x in a),3)] for k,a in sorted(B.items())]
    return {'label':label,'bs':bs,'n':len(pts),'lossSpikes':ls,'gnSpikes':gs,'lossSS':lss,'gnSS':gss,'s0':lo,'s1':hi,'curve':cur}
ST=[stab('h_olmo17.json','OLMo 1.7 7B (April 2024)',4194304),stab('h_olmo2_7b.json','OLMo 2 7B (November 2024)',4194304)]
# public checkpoint counts per model (Hugging Face branches, 1 Oct 2026)
CK=[]
for f,l in [('refs_allenai_OLMo-7B.json','OLMo 7B (Feb 2024)'),('refs_allenai_OLMo-7B-0424-hf.json','OLMo 7B 0424'),('refs_allenai_OLMoE-1B-7B-0924.json','OLMoE 1B-7B'),('refs_allenai_OLMo-2-0425-1B.json','OLMo 2 1B'),('refs_allenai_OLMo-2-1124-7B.json','OLMo 2 7B'),('refs_allenai_OLMo-2-1124-13B.json','OLMo 2 13B'),('refs_allenai_OLMo-2-0325-32B.json','OLMo 2 32B'),('refs_allenai_Olmo-3-1025-7B.json','Olmo 3 7B Base'),('refs_allenai_Olmo-3-1125-32B.json','Olmo 3 32B Base'),('refs_allenai_Olmo-Hybrid-7B.json','Olmo Hybrid 7B')]:
    b=[x['name'] for x in json.load(open(S+f))['branches']]
    CK.append([l,len([n for n in b if n!='main' and not n.startswith('fix')])])
js='// Generated by mk_data.py from src/ (W&B project ai2-llm and Hugging Face refs, pulled 1 Oct 2026). Do not edit by hand.\n'
js+='window.TL='+json.dumps({'m32':M32,'m7':M7},separators=(',',':'))+';\n'
js+='window.STAB='+json.dumps(ST,separators=(',',':'))+';\n'
js+='window.CKN='+json.dumps(CK,separators=(',',':'))+';\n'
open('parts/13a_tl_data.js','w').write(js)
print(len(js),'bytes')
for m in (M32,M7): print(m['label'],'segs',len(m['segs']),'wallD',m['wallD'],'gapsH',m['gapsH'],'redo',m['redo'],'redoTok B',round(m['redo']*m['bs']/1e9,1),'ev',len(m['ev']),'ck',{k:len(v) for k,v in m['ck'].items()},'post',[p['dn'][:30] for p in m['post']])
for s in ST: print(s['label'],s['n'],s['lossSpikes'],s['lossSS'],s['gnSpikes'],s['gnSS'],s['s0'],s['s1'])
print(CK)

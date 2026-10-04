"""Recompute every derived number the page states, from inputs/ and the root's data. Writes recompute_out.json.
python3 recompute.py   (stdlib only)"""
import json, math, itertools, collections, re
R={}
# ---------- MathArena: decode samples, recompute pass@1, CI, maj@k, pass@k, cluster SE ----------
t=open('parts/22_js_data.js').read(); MA=json.loads(t[t.index('{'):t.rindex(';')])
B36='0123456789abcdefghijklmnopqrstuvwxyz'
def dec(m,n):
    r=m['r']; s=m['s']; out=[]
    for p in range(n):
        row=[]
        for k in range(r):
            c=s[(p*r+k)*2:(p*r+k)*2+2]
            row.append(None if c=='--' else B36.index(c[0])*36+B36.index(c[1]))
        out.append(row)
    return out
def majk(row,k):
    xs=[x for x in row if x is not None]; n=len(xs)
    if n<k: k=n
    tot=0;cnt=0
    for S in itertools.combinations(range(n),k):
        c=collections.Counter(xs[i] for i in S); m=max(c.values()); top=[a for a,v in c.items() if v==m]
        tot+=(1/len(top) if 0 in top else 0); cnt+=1
    return tot/cnt
def passk(n,c,k):
    if n-c<k: return 1.0
    return 1-math.comb(n-c,k)/math.comb(n,k)
ma={}
mism=[]
for comp in MA['comps']:
    n=comp['n']; rows=[]
    for m in comp['models']:
        D=dec(m,n); na=sum(1 for row in D for x in row if x is not None)
        corr=sum(1 for row in D for x in row if x==0)
        p1=corr/na  # MathArena: mean over all answers
        ci=196*math.sqrt(p1*(1-p1)/na)
        per=[sum(1 for x in row if x==0)/max(1,sum(1 for x in row if x is not None)) for row in D if any(x is not None for x in row)]
        npb=len(per); mean_pp=sum(per)/npb
        se_cl=math.sqrt(sum((x-mean_pp)**2 for x in per)/(npb-1)/npb) if npb>1 else 0
        r=m['r']; DD=[row for row in D if any(x is not None for x in row)]
        rec={'m':m['n'],'runs':r,'answers':na,'pass1':round(100*p1,2),'table_acc':m['acc'],'ci_answers':round(ci,2),'table_ci':m['ci'],
             'ci_problems':round(196*math.sqrt(p1*(1-p1)/n),2),'ci_cluster':round(196*se_cl,2),
             'maj':[round(100*sum(majk(row,k) for row in DD)/len(DD),2) for k in range(1,r+1)],
             'passk':[round(100*sum(passk(sum(1 for x in row if x is not None),sum(1 for x in row if x==0),k) for row in DD)/len(DD),2) for k in range(1,r+1)],
             'problems_answered':len(DD),
             'after':m['after']}
        if m['acc'] is not None and abs(rec['pass1']-m['acc'])>0.006: mism.append(('acc',comp['k'],m['n'],rec['pass1'],m['acc']))
        if m['ci'] is not None and abs(rec['ci_answers']-m['ci'])>0.011: mism.append(('ci',comp['k'],m['n'],rec['ci_answers'],m['ci']))
        rows.append(rec)
    ma[comp['k']]=rows
R['matharena']=ma
R['matharena_check']={'mismatches':mism,'models':sum(len(v) for v in ma.values())}
print('MathArena table reproduced: %d models, mismatches %d'%(R['matharena_check']['models'],len(mism)), mism[:5])
# AIME 2025 problem 15 for the Reading animation
c25=[c for c in MA['comps'] if c['k']=='aime_2025'][0]
SHOW=['gpt-4o','o1 (medium)','DeepSeek-R1','Claude-3.7-Sonnet (Think)','o3 (high)','o4-mini (high)','Grok 4','GPT-5 (high)','GPT-5.2 (high)']
p15={'gold':c25['probs'][14]['d'][0],'models':[]}
for nm in SHOW:
    m=[x for x in c25['models'] if x['n']==nm][0]; D=dec(m,30); row=D[14]
    p15['models'].append({'m':nm,'answers':[c25['probs'][14]['d'][x] if x is not None else None for x in row],'pass1':100*sum(1 for x in row if x==0)/4,'maj4':100*majk(row,4),'pass4':100*passk(4,sum(1 for x in row if x==0),4),
       'exam':[r for r in ma['aime_2025'] if r['m']==nm][0]})
allans=collections.Counter(x for m in c25['models'] for x in dec(m,30)[14] if x is not None)
p15['all_samples']=sum(allans.values()); p15['top']=[(c25['probs'][14]['d'][a],v) for a,v in allans.most_common(4)]
R['aime25_p15']=p15
print('P15 top answers over all models:',p15['top'],'of',p15['all_samples'])
for x in p15['models']: print('  %-26s %s p1 %.0f maj %.1f pass4 %.0f | exam p1 %.2f maj4 %.2f pass4 %.2f'%(x['m'],x['answers'],x['pass1'],x['maj4'],x['pass4'],x['exam']['pass1'],x['exam']['maj'][3],x['exam']['passk'][3]))
# ---------- GSM-Symbolic Table 1 (arXiv 2410.05229v2, Appendix A.2), selected rows ----------
T1={'Gemma2-9b-it':[85.3,87.0,84.4,2.36,79.1,2.99,68.1,4.77,41.8,6.00,22.3,5.11],
    'Phi-3-mini-128k-instruct':[83.7,85.0,85.9,2.44,80.7,2.94,63.4,5.63,37.5,5.76,18.0,3.83],
    'Phi-3.5-mini-instruct':[84.9,88.0,87.6,1.98,82.1,3.38,64.8,5.43,44.8,6.32,22.4,4.03],
    'Llama3-8b-instruct':[76.0,74.0,79.5,3.62,74.6,2.94,53.8,4.54,28.3,4.37,18.6,3.86],
    'Mistral-7b-instruct-v0.3':[56.2,56.0,62.3,2.68,50.0,3.49,24.5,4.34,10.8,3.60,15.9,4.44],
    'Mathstral-7b-v0.1':[80.1,80.0,82.9,2.87,74.0,3.49,57.4,5.20,35.5,5.07,20.4,3.58],
    'Gemma2-27b-it':[89.7,92.0,90.2,1.86,88.3,2.56,80.7,4.07,63.4,4.14,30.0,3.39],
    'GPT-4o-mini':[94.2,95.0,92.5,1.63,91.7,2.02,81.1,3.05,72.4,4.57,54.1,3.85],
    'GPT-4o':[95.2,95.0,94.4,1.62,94.9,1.87,93.9,2.59,88.0,3.43,63.1,4.53],
    'o1-mini':[95.1,93.0,94.9,1.49,94.5,1.58,94.3,2.57,89.1,3.56,66.0,4.60],
    'o1-preview':[94.9,96.0,93.6,1.68,92.7,1.82,95.4,1.72,94.0,2.38,77.4,3.84]}
gs={}
for k,v in T1.items():
    full,s100,m1,m1s,sy,sys_,p1,p1s,p2,p2s,no,nos=v
    def bsd(p,n=100): return round(100*math.sqrt((p/100)*(1-p/100)/n),2)
    gs[k]={'full':full,'sub100':s100,'stages':[['GSM-M1',m1,m1s],['GSM-Symbolic',sy,sys_],['GSM-P1',p1,p1s],['GSM-P2',p2,p2s],['GSM-NoOp',no,nos]],
           'binom_sd':{'M1':bsd(m1),'Symb':bsd(sy),'P1':bsd(p1),'P2':bsd(p2),'NoOp':bsd(no)},
           'drop_symb_vs_100':round(s100-sy,1),'drop_noop_vs_full':round(full-no,1),'p2_n':'P2 sets of 50 templates'}
R['gsm_symbolic']=gs
print('GSM-Symbolic: Phi-3-mini drop GSM8K full to NoOp',gs['Phi-3-mini-128k-instruct']['drop_noop_vs_full'],'points; o1-preview',gs['o1-preview']['drop_noop_vs_full'])
print('  reported SD vs binomial SD at n=100 (Symbolic):',[(k,v['stages'][1][2],v['binom_sd']['Symb']) for k,v in gs.items()][:5])
# ---------- Fixed counts and identities ----------
R['counts']={
 'gsm8k_total':7473+1319,'gsm_plus':1319*8,'gsm_symbolic_total':100*50,
 'math_human':{'phd':round(100*8/20,1),'imo':round(100*18/20,1),'n':20},
 'aime_point_per_problem':round(100/30,2),
 'fm_v2_fixed_share':round(100*(123+12+5+7)/(300+50),1),'fm_v2_fixed_only':round(100*(123+12)/(300+50),1),
 'fm_v2_sizes':{'t13':300-5,'t4':50-7,'t13_private':295-10,'t4_private':43-2},
 'fm_t13_top':{'frac':'267/285','pct':round(100*267/285,2),'se_epoch':1.44,'se_binom':round(100*math.sqrt((267/285)*(18/285)/285),2)},
 'fm_t4_top':{'astra':'40/41','pct':round(100*40/41,2),'se_binom':round(100*math.sqrt((40/41)*(1/41)/41),2)},
 'putnam':{'formalizations':1692,'theorems':640},
 'critpt':{'pre':32.29,'post_mean4':87.5,'post_pass4':94.44,'kept':54,'of':70,'audited':56,'repaired':19,'excluded':2,'gem_pre':17.71,'gem_post':54.63},
 'imo2026_humans_perfect':'7 of 666',
 'o1_aime_2024':{'pass1':74.4,'cons64':83.3,'rerank1000':93.0,'per_exam_pass1':round(15*0.744,1)},
 'gsm1k':{'v1':'up to 13%','v4':'up to 8%'},
}
# Error bars by item count at today's top score and at 80%
SETS=[('AIME (one year)',30,100.0),('HMMT February 2026',33,98.48),('FrontierMath Tier 4 v2, private',41,100.0),('miniF2F test',244,99.2),('FrontierMath Tiers 1-3 v2, private',285,93.68),('MATH-500',500,99.2),('GSM8K test',1319,94.5),('MATH Level 5',1324,98.13),('GSM-Symbolic set',100,94.9)]
R['errbars']=[{'set':s,'n':n,'top':p,'hw_top':round(196*math.sqrt(p/100*(1-p/100)/n),2),'hw80':round(196*math.sqrt(.8*.2/n),2),
  'gap2_n':math.ceil((1.96*math.sqrt(2)*math.sqrt(.8*.2)/0.02)**2)} for s,n,p in SETS]
print('error bars:',[(e['set'],e['n'],e['hw80']) for e in R['errbars']])
# FM ladder current readings (root saturation.json)
S=json.load(open('../../src/data/saturation.json'))
fm={b['id']:b for b in S['benchmarks'] if b['id'] in ('frontiermath','frontiermath_t4')}
R['fm_series']={k:[{'id':s['id'],'label':s['label'],'pts':[(p['d'],p['v'],p['m']) for p in s['pts']]} for s in v['series']] for k,v in fm.items()}
json.dump(R,open('recompute_out.json','w'),indent=1,ensure_ascii=False)
print('wrote recompute_out.json')
# ---------- MathArena's printed ± against 1.96*sqrt(p(1-p)/N), N = answers (from the released data when the model is there, else 4 x problems) ----------
T=json.load(open('inputs/matharena_tables_2026-10-04.json'))
key={'aime--aime_2026':'aime_2026','aime--aime_2025':'aime_2025','hmmt--hmmt_feb_2026':'hmmt_feb_2026'}
rows=0;ok=0;bad=[]
for tk,v in T.items():
    comp=[c for c in MA['comps'] if c['k']==key[tk]][0]
    for r in v:
        if r['ci'] is None: continue
        rows+=1; m=[x for x in comp['models'] if x['n']==r['m']]
        N=m[0]['na'] if m else 4*comp['n']
        p=r['acc']/100; pred=196*math.sqrt(p*(1-p)/N)
        if abs(pred-r['ci'])<=0.011: ok+=1
        else: bad.append((tk,r['m'],r['acc'],r['ci'],round(pred,2),N))
inData=sum(1 for c in MA['comps'] for m in c['models'] if m['acc'] is not None)
exact=inData-len([x for x in mism if x[0]=='acc'])
R['matharena_ci_rule']={'table_rows':rows,'reproduced':ok,'not':bad,'rows_in_data':inData,'pass1_exact':exact}
print('CI rule: %d of %d table rows reproduced; not: %s; pass@1 from data matches %d of %d rows exactly'%(ok,rows,bad,exact,inData))
json.dump(R,open('recompute_out.json','w'),indent=1,ensure_ascii=False)

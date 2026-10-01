#!/usr/bin/env python3
"""Recompute every derived number the page shows, from src/ and the published tables."""
import json,re,os,datetime
os.chdir(os.path.dirname(os.path.abspath(__file__)))
p=print
p('--- Six times fewer tokens (Olmo 3 tech report Table 35; Qwen3 blog)')
q=36.0
for lab,t in (('actual (5.5T + 2 x 0.1T + 0.1T)',5.5+0.2+0.1),('Table 13 cumulative for Stage 3 (6.2T)',6.2)):
    p(f'  {lab}: {t:.2f}T, ratio {q/t:.2f}')
p('--- Compute bill (report section 2.4)')
gh=1024*56*24;p('  GPU-hours',gh,'cost at $2',gh*2)
gh2=224*21*24;p('  Olmo 3.1 RL extension GPU-hours',gh2,'at $2',gh2*2,'(derived, not stated in the report)')
p('  post-training days 9 = SFT 2 + RL 5 + DPO',9-2-5,'(derived)')
p('--- Training log, Olmo 3 32B (W&B ai2-llm/Olmo-3-1125-32B)')
R=json.load(open('inputs/hist_Olmo-3-1125-32B.json'))
seg=[]
for r in R:
    if any(k in r['dn'] for k in ('midtraining','longcontext')): continue
    L=[x for x in r['loss'] if x.get('train/CE loss') is not None]
    if L: seg.append((min(x['_timestamp'] for x in L),max(x['_timestamp'] for x in L),min(x['_step'] for x in L),max(x['_step'] for x in L)))
seg.sort()
d=lambda t:datetime.datetime.utcfromtimestamp(t).strftime('%Y-%m-%d %H:%M')
p('  first',d(seg[0][0]),'last',d(seg[-1][1]),'days',round((seg[-1][1]-seg[0][0])/86400,2),'report: 9.5 + 35 =',9.5+35)
early=[s for s in seg if s[1]<datetime.datetime(2025,10,1,21).timestamp()];late=[s for s in seg if s[0]>datetime.datetime(2025,10,5).timestamp()]
rate=lambda S:sum(s[3]-s[2] for s in S)/sum((s[1]-s[0])/3600 for s in S)
p('  steps per hour before 1 Oct 21:00',round(rate(early)),'after 5 Oct',round(rate(late)),'ratio',round(rate(late)/rate(early),2))
p('  tokens at step 656000:',656000*8388608/1e12,'T; last logged step',seg[-1][3],'=',round(seg[-1][3]*8388608/1e12,3),'T')
p('  segments',len(seg),'gap hours',round(sum(max(0,seg[i][0]-seg[i-1][1]) for i in range(1,len(seg)))/3600,1),'redone steps',sum(max(0,seg[i-1][3]-seg[i][2]) for i in range(1,len(seg))))
p('  7B tokens: 1412815 x 4194304 =',round(1412815*4194304/1e12,3),'T (Table 35: 5.93T)')
p('--- Data mix sampling factors (Table 4, Olmo 3 report): mix / pool')
T4=[('Common Crawl',8140,4510),('olmOCR science PDFs',972,805),('Stack-Edu (rebalanced)',137,409),('arXiv',21.4,50.8),('FineMath 3+',34.1,152),('Wikipedia and Wikibooks',3.69,2.51)]
for n,a,b in T4: p(f'  {n}: {b/a:.2f}x  share {100*b/5930:.1f}%')
p('  pool total',sum(a for _,a,_ in T4),'mix total',sum(b for *_,b in T4))
D5={'Math (synthetic)':[0.898,0.241,5.62,1.73,10.7],'Code':[10.0],'Python (synthetic)':[10.0],'QA (synthetic)':[5.90,3.0,5.0],'Thinking traces (synthetic)':[0.381,0.459,0.159,0.850,1.87,1.87,0.246,1.25,1.25],'Instruction':[1.1,5.0],'Science PDFs':[4.99],'Web pages':[4.99,22.4]}
p('--- Dolmino Mix (Table 5) by type, B tokens');tot=0
for k,v in D5.items(): p(f'  {k}: {sum(v):.2f}');tot+=sum(v)
p('  total',round(tot,2),'(table: 99.95B)')
p('--- Souping, Olmo 3 32B Math (Table 13): soup 69.7 vs ingredients 66.8, 65.4 ->',round(69.7-66.8,1),round(69.7-65.4,1),'; report text says 2.9 and 1.6')
p('--- Midtraining gains (Table 13), stage 1 -> stage 2 soup')
for n,a,b in (('OLMo 2 7B',12.7,41.7),('OLMo 2 32B',33.2,53.9),('Olmo 3 7B',23.5,59.8),('Olmo 3 32B',48.4,69.7)): p(f'  {n} Math {a} -> {b}: +{b-a:.1f}')
p('--- Long-context stage, Olmo 3 32B Math 69.7 -> 61.4:',round(61.4-69.7,1))

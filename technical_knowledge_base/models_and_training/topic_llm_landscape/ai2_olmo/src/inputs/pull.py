import json,sys
from wb import hist
from concurrent.futures import ThreadPoolExecutor
proj=sys.argv[1]
runs=json.load(open('runs_%s.json'%proj))['data']['project']['runs']['edges']
runs=[r['node'] for r in runs if r['node']['historyLineCount']>0]
E=['eval/downstream/mmlu_stem_test_mc_5shot_fast (length-normalized accuracy v2)','eval/downstream/mmlu_humanities_test_mc_5shot_fast (length-normalized accuracy v2)','eval/downstream/mmlu_social_sciences_test_mc_5shot_fast (length-normalized accuracy v2)','eval/downstream/mmlu_other_test_mc_5shot_fast (length-normalized accuracy v2)','eval/downstream/arc_challenge_test_mc_5shot_fast (accuracy v2)','eval/downstream/basic_skills_arithmetic_rc_5shot (accuracy v2)']
E1=[e.replace(' v2)',')') for e in E]
def job(r):
    out={'name':r['name'],'dn':r['displayName'],'n':r['historyLineCount']}
    try: out['loss']=hist(proj,r['name'],['_step','_timestamp','train/CE loss'],800)
    except Exception as e: out['loss_err']=str(e)
    for tag,keys in (('ev2',E),('ev1',E1)):
        try: out[tag]=hist(proj,r['name'],['_step']+keys,300)
        except Exception as e: out[tag+'_err']=str(e)
    return out
with ThreadPoolExecutor(8) as ex: res=list(ex.map(job,runs))
json.dump(res,open('hist_%s.json'%proj,'w'))
for r in res: print(r['dn'][:60],r['n'],len(r.get('loss',[])),len(r.get('ev2',[])),len(r.get('ev1',[])),r.get('loss_err','')[:80])

import json,sys,re
from wb import hist,q
from concurrent.futures import ThreadPoolExecutor
proj,pat,out=sys.argv[1],sys.argv[2],sys.argv[3]
runs=[e['node'] for e in json.load(open('runs_%s.json'%proj))['data']['project']['runs']['edges'] if re.search(pat,e['node']['displayName']) and e['node']['historyLineCount']>0]
r0=runs[0]['name']
d=q('{ project(name:%s, entityName:"ai2-llm"){ run(name:%s){ historyKeys } } }'%(json.dumps(proj),json.dumps(r0)))
ks=list(d['data']['project']['run']['historyKeys']['keys'])
lk=[k for k in ks if re.search(r'CrossEntropyLoss|CE loss',k) and k.startswith('train')][0]
gk=[k for k in ks if re.search(r'grad_norm|grad norm',k,re.I) and 'total' in k.lower()]
print(lk,gk[:3])
keys=['_step',lk]+gk[:1]
def job(r):
    try: return {'dn':r['displayName'],'h':hist(proj,r['name'],keys,min(5000,r['historyLineCount']))}
    except Exception as e: return {'dn':r['displayName'],'err':str(e)[:200]}
with ThreadPoolExecutor(6) as ex: res=list(ex.map(job,runs))
json.dump({'keys':keys,'runs':res},open(out,'w'))
for r in res: print(r['dn'],len(r.get('h',[])),r.get('err',''))

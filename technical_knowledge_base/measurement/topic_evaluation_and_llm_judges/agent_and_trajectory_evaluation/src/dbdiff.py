# Final-state diff for chosen trials: replay the agent's calls and the gold actions with tau2's own environment, diff the databases.
import sys, json
from pathlib import Path
from tau2.data_model.simulation import Results
from tau2.registry import registry
res=Results.load(Path(sys.argv[1])); dom=res.info.environment_info.domain_name
tasks={t.id:t for t in res.tasks}
ctor=registry.get_env_constructor(dom)
def flat(x,p=''):
  if isinstance(x,dict):
    o={}
    for k,v in x.items(): o.update(flat(v,p+'.'+str(k) if p else str(k)))
    return o
  if isinstance(x,list):
    o={}
    for i,v in enumerate(x): o.update(flat(v,p+'['+str(i)+']'))
    return o
  return {p:x}
out={}
for spec in sys.argv[2:]:
  tid,tr=spec.split(':'); tr=int(tr)
  s=[x for x in res.simulations if x.task_id==tid and x.trial==tr][0]; t=tasks[tid]
  init=t.initial_state
  kw=dict(initialization_data=init.initialization_data if init else None, initialization_actions=init.initialization_actions if init else None)
  pe=ctor(solo_mode=False); pe.set_state(message_history=list(s.messages),strict=False,**kw)
  ge=ctor(); ge.set_state(message_history=[],strict=False,**kw)
  for a in (t.evaluation_criteria.actions or []):
    try: ge.make_tool_call(tool_name=a.name,requestor=a.requestor,**a.arguments)
    except Exception as e: print('gold err',e)
  b=ctor(); b.set_state(message_history=[],strict=False,**kw)
  P=flat(pe.tools.db.model_dump()); G=flat(ge.tools.db.model_dump()); B=flat(b.tools.db.model_dump())
  keys=sorted(set(P)|set(G))
  diff=[[k,B.get(k),G.get(k),P.get(k)] for k in keys if P.get(k)!=G.get(k)]
  chg_gold=[[k,B.get(k),G.get(k)] for k in sorted(set(G)|set(B)) if G.get(k)!=B.get(k)]
  chg_pred=[[k,B.get(k),P.get(k)] for k in sorted(set(P)|set(B)) if P.get(k)!=B.get(k)]
  out[spec]=dict(diff=diff,gold_changes=chg_gold,agent_changes=chg_pred,hash_match=pe.get_db_hash()==ge.get_db_hash())
  print(spec,'diff',len(diff),'gold changes',len(chg_gold),'agent changes',len(chg_pred),out[spec]['hash_match'])
  for d in diff[:30]: print('   ',d)
json.dump(out,open('dbdiff_'+dom+'.json','w'),indent=0,default=str)

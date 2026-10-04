# Do-nothing agent on retail, DB component only (the NL-assertion component needs an LLM judge).
import sys, json
from pathlib import Path
from tau2.data_model.simulation import Results
from tau2.evaluator.evaluator import evaluate_simulation, EvaluationType
res=Results.load(Path(sys.argv[1])); dom=res.info.environment_info.domain_name
tasks={t.id:t for t in res.tasks}; null=[]
for tid,t in tasks.items():
  s=[x for x in res.simulations if x.task_id==tid][0].model_copy(deep=True); s.messages=s.messages[:2]
  ri=evaluate_simulation(simulation=s,task=t,evaluation_type=EvaluationType.ENV,solo_mode=False,domain=dom,strict_replay=False)
  null.append([tid,ri.reward])
# recorded: how often DB passes but the NL judge fails, and the reverse
import collections
C=collections.Counter()
for s in res.simulations:
  r=s.reward_info; db=r.db_check.db_match if r.db_check else None
  nl=None if not r.nl_assertions else all(x.met for x in r.nl_assertions)
  C[(db,nl,r.reward)]+=1
print(json.dumps({'domain':dom,'null_db_pass':sum(r for _,r in null),'n':len(null),'recorded':{str(k):v for k,v in C.items()}}))
json.dump({'null':null,'recorded':{str(k):v for k,v in C.items()}},open('null_env_'+dom+'.json','w'))

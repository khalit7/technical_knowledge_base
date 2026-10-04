# Re-grade released tau2-bench trajectories with tau2's own evaluator (repo at 5bfa7e3).
import sys, json
from pathlib import Path
from tau2.data_model.simulation import Results
from tau2.evaluator.evaluator import evaluate_simulation, EvaluationType
from tau2.registry import registry
f=sys.argv[1]
res=Results.load(Path(f))
dom=res.info.environment_info.domain_name
tasks={t.id:t for t in res.tasks}
out={'file':f,'domain':dom,'n_tasks':len(tasks)}
# 1. reproduce recorded rewards with ALL
same=0;n=0
for s in res.simulations:
  ri=evaluate_simulation(simulation=s,task=tasks[s.task_id],evaluation_type=EvaluationType.ALL,solo_mode=False,domain=dom,strict_replay=False)
  n+=1; same+= (ri.reward==s.reward_info.reward)
out['regrade_same']=[same,n]
# 2. do-nothing agent: keep only the greeting and the first user turn of trial 0
null=[]
for tid,t in tasks.items():
  s=[x for x in res.simulations if x.task_id==tid][0].model_copy(deep=True)
  s.messages=s.messages[:2]
  ri=evaluate_simulation(simulation=s,task=t,evaluation_type=EvaluationType.ALL,solo_mode=False,domain=dom,strict_replay=False)
  null.append([tid,ri.reward])
out['null']=null
out['null_pass']=sum(r for _,r in null)
print(json.dumps({k:v for k,v in out.items() if k!='null'}))
json.dump(out,open('regrade_'+dom+'.json','w'))

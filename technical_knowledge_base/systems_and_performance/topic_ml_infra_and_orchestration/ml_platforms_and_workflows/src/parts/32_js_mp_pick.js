// ---- Tool chooser: transparent rule scores (rules of thumb from the Reading tab and the root's Tool map) ----
(function(){
const $=id=>document.getElementById(id);
const Q=[
 {k:'where',h:'1. Where do the training jobs run?',o:[['slurm','A Slurm cluster'],['k8s','Kubernetes'],['cloud','Managed cloud services'],['laptop','One machine']],d:'slurm'},
 {k:'recur',h:'2. What runs again and again?',o:[['data','Scheduled data pipelines'],['ml','Train, evaluate, register loops'],['assets','Datasets and models to keep fresh'],['none','Nothing: a few long runs']],d:'ml'},
 {k:'who',h:'3. Who writes the pipelines?',o:[['de','Data engineers'],['res','Researchers, in Python'],['plat','A platform team']],d:'res'},
 {k:'off',h:'4. May run data and metrics leave your network?',o:[['yes','Yes'],['no','No (air-gapped or policy)']],d:'yes'},
 {k:'ops',h:'5. Is someone there to operate services (database, server, upgrades)?',o:[['none','Nobody dedicated'],['team','Yes, a platform team']],d:'none'},
 {k:'live',h:'6. Do you want live GPU and system metrics beside the loss?',o:[['yes','Yes'],['no','Not needed']],d:'yes'}];
const ENG={airflow:'Apache Airflow 3 (3.3.2)',kfp:'Kubeflow Pipelines (kfp 2.17.0)',flyte:'Flyte 2 (SDK 2.11.4)',metaflow:'Metaflow (2.19.39)',prefect:'Prefect 3 (3.8.8)',dagster:'Dagster (1.13.26)',zenml:'ZenML (0.98.0)',slurmdep:'Slurm arrays and dependencies',none:'No engine yet: scripts plus a tracker'};
const TRK={mlflow:'MLflow 3 (3.17.1), self-hosted',wandb:'Weights & Biases (hosted or dedicated)',clearml:'ClearML (2.1.12), self-hosted'};
// [question, answer, target kind, id, points, reason]
const RULES=[
 ['where','slurm','e','slurmdep',3,'On Slurm, arrays and --dependency chain cluster jobs with no extra service (Slurm child, section 9).'],
 ['where','slurm','e','airflow',2,'Airflow tasks can submit sbatch and wait; the root picker suggests "Airflow submitting sbatch jobs" on premises.'],
 ['where','slurm','e','prefect',1,'Any Python task can call sbatch --wait.'],
 ['where','slurm','e','metaflow',-1,'Core Metaflow 2.19.39 ships no Slurm step backend (its Argo and Airflow deployers reject a @slurm step: "isn\'t currently supported"); steps run where the flow runs unless an extension is added.'],
 ['where','slurm','e','flyte',-2,'Flyte\'s backend runs on Kubernetes: a Slurm-only site would have to run a cluster for it.'],
 ['where','slurm','e','kfp',-3,'Kubeflow Pipelines needs Kubernetes.'],
 ['where','k8s','e','slurmdep',-3,'No Slurm here.'],['where','cloud','e','slurmdep',-3,'No Slurm here.'],['where','laptop','e','slurmdep',-3,'No Slurm here.'],
 ['recur','ml','e','slurmdep',2,'On one Slurm cluster, train then --dependency=afterok evaluate then register covers the loop; add a tracker.'],
 ['where','k8s','e','kfp',3,'Kubeflow Pipelines runs each component as a container on Kubernetes.'],
 ['where','k8s','e','flyte',3,'Flyte runs typed tasks as pods, with PyTorch and Ray plugins.'],
 ['where','k8s','e','metaflow',2,'Metaflow sends steps to pods with @kubernetes and deploys to Argo Workflows.'],
 ['where','k8s','e','airflow',1,'Airflow has a Kubernetes executor.'],
 ['where','k8s','e','zenml',1,'ZenML can target Kubeflow on the same cluster.'],
 ['where','cloud','e','metaflow',2,'Metaflow runs steps on AWS Batch or Kubernetes and deploys to Step Functions.'],
 ['where','cloud','e','airflow',2,'Every large cloud sells managed Airflow.'],
 ['where','cloud','e','kfp',1,'Vertex AI Pipelines runs the KFP format.'],
 ['where','laptop','e','metaflow',2,'Metaflow runs locally with no server (this page ran it so).'],
 ['where','laptop','e','prefect',2,'Prefect runs locally on plain functions.'],
 ['where','laptop','e','none',1,'On one machine a script may be enough.'],
 ['recur','data','e','airflow',3,'Scheduled data pipelines are what Airflow was built for (Airbnb, 2014).'],
 ['recur','data','e','dagster',2,'Dagster models the data itself as assets.'],
 ['recur','data','e','prefect',1,'Prefect schedules Python flows.'],
 ['recur','ml','e','metaflow',2,'Metaflow keeps every step\'s artifacts and can resume after a failure (section 3).'],
 ['recur','ml','e','flyte',2,'Flyte caches typed step outputs.'],
 ['recur','ml','e','kfp',2,'KFP caches components and records artifacts.'],
 ['recur','ml','e','zenml',1,'ZenML wires a tracker and registry into each pipeline.'],
 ['recur','assets','e','dagster',3,'Dagster tracks lineage and freshness per asset.'],
 ['recur','assets','e','airflow',1,'Airflow 3 schedules on asset updates.'],
 ['recur','none','e','none',4,'A few long runs need a tracker and a registry, not an engine (section 1).'],
 ['recur','none','e','slurmdep',1,'A dependency can still chain evaluation after training.'],
 ['who','de','e','airflow',2,'Data engineers usually know Airflow already.'],
 ['who','de','e','dagster',2,'Asset thinking suits data engineers.'],
 ['who','res','e','metaflow',2,'Metaflow was built for scientists who want to stay in Python.'],
 ['who','res','e','prefect',1,'Decorators on plain functions.'],
 ['who','res','e','flyte',1,'Python SDK, but typed interfaces to learn.'],
 ['who','plat','e','flyte',2,'A platform team can run Flyte\'s Kubernetes backend.'],
 ['who','plat','e','kfp',1,'KFP fits a team already running Kubeflow.'],
 ['who','plat','e','zenml',1,'ZenML lets a platform team swap stacks under users.'],
 ['ops','none','e','none',1,'Nothing to operate.'],
 ['ops','none','e','metaflow',1,'Local and cloud-native modes need no long-running service of your own.'],
 ['ops','team','e','airflow',1,'Airflow needs a scheduler, metadata DB and workers kept healthy.'],
 ['ops','team','e','kfp',1,'KFP needs its Kubernetes backend operated.'],
 ['ops','team','e','flyte',1,'Flyte needs its control plane operated.'],
 ['off','yes','t','wandb',2,'Hosted W&B: no operations, dashboards with little setup.'],
 ['off','yes','t','mlflow',1,'MLflow works anywhere, hosted or not.'],
 ['off','yes','t','clearml',1,'ClearML has a hosted tier and a self-hosted server.'],
 ['off','no','t','mlflow',3,'MLflow is open source (Apache-2.0) and self-hosts on a database plus object storage.'],
 ['off','no','t','clearml',2,'ClearML self-hosts its server.'],
 ['ops','none','t','wandb',2,'Somebody else runs the tracker.'],
 ['ops','team','t','mlflow',2,'A team can run MLflow on PostgreSQL and object storage, and back it up.'],
 ['ops','team','t','clearml',1,'A team can run ClearML\'s server and agents.'],
 ['live','yes','t','wandb',2,'W&B streams system metrics (GPU utilisation, memory) during the run.'],
 ['live','yes','t','clearml',1,'ClearML captures system metrics automatically.'],
 ['live','no','t','mlflow',1,'Logging after the fact, as this page did, is enough.']];
const st={};Q.forEach(q=>st[q.k]=q.d);
$('pk-qs').innerHTML=Q.map(q=>'<div class="pk-q"><div class="h">'+q.h+'</div><div class="o" data-k="'+q.k+'">'+q.o.map(o=>'<button data-v="'+o[0]+'">'+o[1]+'</button>').join('')+'</div></div>').join('');
function render(){document.querySelectorAll('#pk-qs .o').forEach(o=>o.querySelectorAll('button').forEach(b=>b.classList.toggle('on',st[o.dataset.k]===b.dataset.v)));
  const sc={e:{},t:{}},why=[];Object.keys(ENG).forEach(k=>sc.e[k]=0);Object.keys(TRK).forEach(k=>sc.t[k]=0);
  RULES.forEach(r=>{if(st[r[0]]===r[1]){sc[r[2]][r[3]]+=r[4];why.push([r[2],r[3],r[4],r[5]])}});
  if(st.off==='no'){sc.t.wandb-=2;why.push(['t','wandb',-2,'Air-gapped sites need W&B\'s self-managed licence (Tool map: "avoid" for air-gapped sites without one).'])}
  const box=(title,map,names)=>{const a=Object.entries(map).sort((x,y)=>y[1]-x[1]),mx=Math.max(1,a[0][1]);
    return '<div class="pk-box"><h4>'+title+'</h4><div class="pk-top">'+names[a[0][0]]+'</div><div class="small mute">'+(a[1]&&a[1][1]===a[0][1]?'tied with '+names[a[1][0]]:'next: '+names[a[1][0]])+'</div>'+
      a.map(([k,v])=>'<div class="pk-row"><span>'+names[k].split(' (')[0]+'</span><span><span class="pk-bar" style="display:block;width:'+Math.max(2,Math.max(0,v)/mx*100)+'%"></span></span><span class="num">'+v+'</span></div>').join('')+'</div>'};
  $('pk-res').innerHTML=box('Workflow engine',sc.e,ENG)+box('Tracker',sc.t,TRK)+'<div class="pk-box"><h4>Registry</h4><div class="pk-top">The tracker\'s own registry</div><div class="small">'+(Object.entries(sc.t).sort((x,y)=>y[1]-x[1])[0][0]==='wandb'?'W&amp;B Registry':'MLflow Model Registry (or ClearML\'s models)')+', with aliases for decisions and tags for evidence (section 6). The Hugging Face Hub (private repositories, git revisions) is the other common home for weights that leave the team.</div></div>';
  $('pk-why').innerHTML='<ul>'+why.map(w=>'<li><b>'+(w[0]==='e'?ENG:TRK)[w[1]].split(' (')[0]+' '+(w[2]>0?'+':'')+w[2]+'</b>: '+w[3]+'</li>').join('')+'</ul>'}
$('pk-qs').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;st[b.parentNode.dataset.k]=b.dataset.v;render()});
render();
})();

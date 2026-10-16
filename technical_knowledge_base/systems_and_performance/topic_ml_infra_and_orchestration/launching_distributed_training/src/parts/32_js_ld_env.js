// ---- Launcher variables (t-ldenv) ----
(function(){
const D=window.LD,$=id=>document.getElementById(id),esc=RD.esc,L=k=>D.lines[k];
const LA=[['tr','torchrun'],['sr','srun'],['mp','mpirun (Open MPI)'],['ds','deepspeed'],['ac','accelerate'],['ry','Ray Train'],['js','JobSet'],['kt','Kubeflow Trainer']];
const OMPI='https://docs.open-mpi.org/en/v5.0.x/tuning-apps/environment-var.html';
// [variable, meaning, {launcher: [name it uses, source id or url, note]}, recorded key]
const V=[
 ['RANK','global rank, 0 to world size − 1',{tr:['RANK','agent_env'],sr:['SLURM_PROCID','sl_procid','the task number: a rank only if srun starts the training processes'],mp:['OMPI_COMM_WORLD_RANK',OMPI],ds:['RANK','ds_rank'],ac:['RANK','acc_run','set by torchrun underneath'],ry:['RANK','ray_env'],kt:['RANK','pet_env','set by torchrun, which the Trainer configures']},'RANK'],
 ['LOCAL_RANK','rank on this node; picks the GPU',{tr:['LOCAL_RANK','agent_env'],sr:['SLURM_LOCALID','sl_localid'],mp:['OMPI_COMM_WORLD_LOCAL_RANK',OMPI],ds:['LOCAL_RANK','ds_rank'],ac:['LOCAL_RANK','acc_run'],ry:['LOCAL_RANK','ray_env'],kt:['LOCAL_RANK','pet_env']},'LOCAL_RANK'],
 ['WORLD_SIZE','number of processes in the job',{tr:['WORLD_SIZE','agent_env'],sr:['SLURM_NTASKS',null,'tasks, not GPUs, under torchrun'],mp:['OMPI_COMM_WORLD_SIZE',OMPI],ds:['WORLD_SIZE','ds_env'],ac:['WORLD_SIZE','acc_run'],ry:['WORLD_SIZE','ray_env'],kt:['WORLD_SIZE','pet_env']},'WORLD_SIZE'],
 ['LOCAL_WORLD_SIZE','processes on this node',{tr:['LOCAL_WORLD_SIZE','agent_env'],mp:['OMPI_COMM_WORLD_LOCAL_SIZE',OMPI],ds:['LOCAL_SIZE','ds_env'],ac:['LOCAL_WORLD_SIZE','acc_run'],ry:['LOCAL_WORLD_SIZE','ray_env'],kt:['LOCAL_WORLD_SIZE','pet_env']},'LOCAL_WORLD_SIZE'],
 ['node rank','index of this node',{tr:['GROUP_RANK','agent_env'],sr:['SLURM_NODEID','sl_nodeid'],ds:['CROSS_RANK','ds_env'],ry:['NODE_RANK','ray_env'],js:['JOB_COMPLETION_INDEX',null,'set by Kubernetes for every Indexed Job pod; pass it to torchrun as --node-rank'],kt:['PET_NODE_RANK','tr_pet','from the completion-index annotation']},'GROUP_RANK'],
 ['number of nodes','',{tr:['GROUP_WORLD_SIZE','agent_env'],sr:['SLURM_NNODES',null],ds:['CROSS_SIZE','ds_env'],kt:['PET_NNODES','tr_pet']},'GROUP_WORLD_SIZE'],
 ['MASTER_ADDR, MASTER_PORT','where init_process_group finds the store',{tr:['MASTER_ADDR, MASTER_PORT','agent_env','from the rendezvous; with c10d the port is random'],ds:['MASTER_ADDR, MASTER_PORT','ds_env'],ac:['MASTER_ADDR, MASTER_PORT','acc_rdzv'],ry:['MASTER_ADDR, MASTER_PORT','ray_master','rank 0\'s address and a free port'],kt:['PET_MASTER_ADDR, PET_MASTER_PORT','tr_pet','pod 0\'s DNS name, 29500']},'MASTER_PORT'],
 ['processes per node','',{tr:['--nproc-per-node, or PET_NPROC_PER_NODE','pet_env','torchrun reads PET_<FLAG> as the default of any flag'],kt:['PET_NPROC_PER_NODE','tr_pet'],ac:['(--num_processes)','acc_prep']},null],
 ['TORCHELASTIC_RESTART_COUNT, _MAX_RESTARTS, _RUN_ID','which attempt this is; lets the script resume',{tr:['TORCHELASTIC_*','agent_env']},'TORCHELASTIC_RESTART_COUNT'],
 ['TORCHELASTIC_USE_AGENT_STORE','True: the worker connects to the agent\'s store as a client',{tr:['TORCHELASTIC_USE_AGENT_STORE','agent_env','False when TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1']},'TORCHELASTIC_USE_AGENT_STORE'],
 ['TORCH_NCCL_ASYNC_ERROR_HANDLING','NCCL watchdog behaviour on errors',{tr:['= 1 unless already set','agent_async'],ds:['NCCL_ASYNC_ERROR_HANDLING=1','ds_env','elastic mode only']},'TORCH_NCCL_ASYNC_ERROR_HANDLING'],
 ['CUDA_VISIBLE_DEVICES','which GPUs the process sees',{ds:['set per node','ds_env','from the hostfile slots'],ac:['set from --gpu_ids','acc_prep'],sr:['with real GPU GRES only',null,'not set here: the fake GPUs have no device files (parent setup notes)']},'CUDA_VISIBLE_DEVICES'],
 ['ACCELERATE_*','mixed precision, FSDP, dynamo settings',{ac:['ACCELERATE_MIXED_PRECISION, ...','acc_prep']},null]];
const REC={tr:['slurm','k8s'],sr:['slurm'],ry:['ray'],js:['k8s'],kt:[]};
const recKey={GROUP_RANK:{ry:'NODE_RANK',sr:'SLURM_NODEID',js:'JOB_COMPLETION_INDEX'},RANK:{sr:'SLURM_PROCID'},LOCAL_RANK:{sr:'SLURM_LOCALID'},WORLD_SIZE:{sr:'SLURM_NTASKS'},GROUP_WORLD_SIZE:{sr:'SLURM_NNODES'}};
let selR=0,selL='tr';
const link=s=>!s?'documentation and the parent\'s recorded runs':/^https?:/.test(s)?'<a href="'+s+'" target="_blank" rel="noopener noreferrer">Open MPI 5.0 docs</a>':'<a href="'+L(s).u+'" target="_blank" rel="noopener noreferrer">'+esc(L(s).f+':'+L(s).l)+'</a>';
function rec(r,l){const k=V[r][3];if(!k)return '';const kk=(recKey[k]&&recKey[k][l])||k;const out=[];
  (REC[l]||[]).forEach(sy=>{const v=D.envrec[sy]['2'];if(v&&kk in v)out.push(({slurm:'Slurm',k8s:'Kubernetes',ray:'Ray'}[sy])+': '+kk+'='+v[kk]+(k==='MASTER_PORT'?' (MASTER_ADDR='+v.MASTER_ADDR+')':''))});return out.join('; ')}
function table(){const q=$('ev-q').value.trim().toLowerCase(),only=$('ev-only').checked;
  let h='<thead><tr><th class="v">Variable</th>'+LA.map(a=>'<th>'+a[1]+'</th>').join('')+'</tr></thead><tbody>';
  V.forEach((v,r)=>{const txt=(v[0]+' '+Object.values(v[2]).map(x=>x[0]).join(' ')).toLowerCase();if(q&&txt.indexOf(q)<0)return;if(only&&!v[2].tr)return;
    h+='<tr><th class="v">'+esc(v[0])+'<div class="small mute" style="font-weight:400">'+esc(v[1])+'</div></th>'+LA.map(a=>{const c=v[2][a[0]];
      return c?'<td class="y'+(r===selR&&a[0]===selL?' on':'')+'" data-r="'+r+'" data-l="'+a[0]+'"><b>✓</b> <code>'+esc(c[0])+'</code></td>':'<td class="n">not set</td>'}).join('')+'</tr>'});
  $('ev-tab').innerHTML=h+'</tbody>'}
function det(){const v=V[selR],c=v[2][selL],la=LA.find(a=>a[0]===selL)[1];if(!c){$('ev-det').textContent='Not set by '+la+'.';return}
  const r=rec(selR,selL);$('ev-det').innerHTML='<b>'+esc(la)+'</b> sets <code>'+esc(c[0])+'</code> ('+esc(v[0])+'). Source: '+link(c[1])+(c[2]?'. '+esc(c[2]):'')+'.'+(r?'<br><span class="meas">recorded</span> on rank 2: <code>'+esc(r)+'</code>':'')}
$('ev-tab').addEventListener('click',e=>{const td=e.target.closest('td.y');if(!td)return;selR=+td.dataset.r;selL=td.dataset.l;table();det()});
$('ev-q').addEventListener('input',table);$('ev-only').addEventListener('change',table);
$('ev-rec').innerHTML=['slurm','k8s','ray'].map(sy=>{const v=D.envrec[sy]['2'];return '<div><b>'+({slurm:'Slurm + torchrun',k8s:'JobSet + torchrun',ray:'Ray Train'}[sy])+'</b><br>'+Object.entries(v).map(([k,x])=>esc(k)+'='+esc(x)).join('<br>')+'</div>'}).join('');
table();det();
})();

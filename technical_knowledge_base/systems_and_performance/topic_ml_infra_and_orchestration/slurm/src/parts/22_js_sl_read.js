// ---- Reading tab of the Slurm page: source quotes, exhibits, predict boxes, cluster map, job states ----
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id);
const GH='https://github.com/SchedMD/slurm/blob/slurm-24-11-5-1/';
// a link to quoted source lines (file:line at the pinned tag)
function qlink(id){const q=S.quotes[id];if(!q)return '';const a=q.start,b=q.start+q.lines.length-1;
  return '<a href="'+GH+q.file+'#L'+a+(b>a?'-L'+b:'')+'" target="_blank" rel="noopener noreferrer"><code>'+esc(q.file.split('/').pop())+':'+a+(b>a?'-'+b:'')+'</code></a>'}
window.SLQ={qlink};
document.querySelectorAll('pre[data-q]').forEach(p=>{const q=S.quotes[p.dataset.q];if(!q)return;
  const w=String(q.start+q.lines.length).length;
  p.innerHTML='<span class="c">'+esc(q.file)+' @ slurm-24-11-5-1 ('+qlink(p.dataset.q)+')</span>\n'+q.lines.map((l,i)=>'<span class="c">'+String(q.start+i).padStart(w,' ')+'</span>  '+esc(l)).join('\n')});
document.querySelectorAll('.q-ref[data-r]').forEach(s=>{s.innerHTML=qlink(s.dataset.r)});
// defaults line, read from the quoted header lines
(function(){const el=$('sl-q-def');if(!el)return;const v=(id,name)=>{const q=S.quotes[id];const l=q.lines.find(x=>x.indexOf(name)>=0)||'';return (l.match(/(\d+)/)||['',''])[1]};
  el.innerHTML='SlurmctldTimeout '+v('def_timeouts','SLURMCTLD_TIMEOUT')+' s, SlurmdTimeout '+v('def_timeouts','SLURMD_TIMEOUT')+' s ('+qlink('def_timeouts')+'), KillWait '+v('def_killwait','KILL_WAIT')+' s between SIGTERM and SIGKILL ('+qlink('def_killwait')+'), default scheduler <code>sched/backfill</code> and selection <code>select/cons_tres</code> ('+qlink('def_sched')+')'})();
// verbatim exhibits from the runs
document.querySelectorAll('pre[data-ex]').forEach(p=>{const t=S.ex[p.dataset.ex];if(t!=null)p.textContent=t});
(function(){const el=$('sl-ex-err');if(el)el.textContent=S.errors.join('\n')})();
// the running example's job file, annotated
(function(){const el=$('sl-sbatch');if(!el)return;
  const notes=[['#SBATCH --nodes=2','2 whole allocations of a node each; all or nothing'],['#SBATCH --ntasks-per-node=1','one task per node: srun starts one torchrun per node, torchrun starts the 2 ranks'],
   ['#SBATCH --cpus-per-task=2','2 CPUs per torchrun (1 thread per rank); also makes inner sruns --exact'],['#SBATCH --gres=gpu:2','2 (fake) GPUs on each node'],['#SBATCH --time=00:10:00','the limit backfill plans with'],
   ['#SBATCH --output','%x = job name, %j = job id'],['#SBATCH --requeue','may be requeued after a node failure or preemption'],['export MASTER_ADDR','the first node of the allocation hosts the rendezvous'],
   ['srun --kill-on-bad-exit','one step on every node; if any task fails, kill the whole step'],['--rdzv-id','the job id names the rendezvous, so a requeued job meets again under the same id']];
  el.innerHTML=S.ex.train_sbatch.split('\n').map(l=>{const n=notes.find(x=>l.trim().indexOf(x[0])===0);return esc(l)+(n?'   <b>&larr; '+esc(n[1])+'</b>':'')}).join('\n')})();
// predict, then reveal
document.querySelectorAll('.sl-pr').forEach(box=>box.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
  box.querySelectorAll('button[data-a]').forEach(x=>{x.classList.toggle('right',x.dataset.a==='1');x.classList.toggle('wrong',x===b&&x.dataset.a!=='1')});box.classList.add('done')}));

// ---- job states ----
const ST=[['PENDING','PD','main','Waiting with a reason (sections 5 and 6, and the Why pending? tab). Held jobs are PENDING with priority 0.'],
 ['CONFIGURING','CF','main','Nodes allocated but not ready (booting from power saving, or a slow prolog with PrologFlags=Alloc). Skipped here.'],
 ['RUNNING','R','main','The batch script and its steps are running.'],
 ['COMPLETING','CG','main','The script ended; nodes are killing leftover processes and running the epilog. Seen here for about 1 s (05:37:28.6).'],
 ['COMPLETED','CD','main','Every step exited 0. sacct keeps it; squeue forgets it after MinJobAge.'],
 ['FAILED','F','bad','The batch script exited non-zero (job 108 here: exit 3). Not requeued automatically.'],
 ['TIMEOUT','TO','bad','Killed at its time limit (SIGTERM, then SIGKILL after KillWait).'],
 ['CANCELLED','CA','bad','scancel, by the user or an administrator (the gallery jobs here).'],
 ['NODE_FAIL','NF','bad','A node of the job died. With --requeue the job is requeued instead (the root\'s Failure lab).'],
 ['OUT_OF_MEMORY','OOM','bad','The kernel killed a task over its cgroup memory limit (needs ConstrainRAMSpace).'],
 ['PREEMPTED','PR','bad','Stopped to make room for a higher tier or QOS; with PreemptMode=REQUEUE it returns to PENDING (sacct -D shows both runs).'],
 ['REQUEUED','RQ','loop','Put back in the queue (preemption, node failure, scontrol requeue); eligible again only after about 121 s here (section 8).'],
 ['SUSPENDED','S','loop','Paused in place by preemption SUSPEND or scontrol suspend; keeps its memory, GPU memory included.']];
(function(){const el=$('sl-states');if(!el)return;
  const chip=s=>'<button data-s="'+s[0]+'" class="sl-stc" style="border-color:'+(s[2]==='main'?'var(--acc)':s[2]==='bad'?'var(--bad)':'var(--c5)')+'">'+s[0]+' <span class="mute">('+s[1]+')</span></button>';
  const main=ST.filter(s=>s[2]==='main'),bad=ST.filter(s=>s[2]==='bad'),loop=ST.filter(s=>s[2]==='loop');
  el.innerHTML='<div class="sl-ctl">'+main.map(chip).join('<span class="mute">&rarr;</span>')+'</div>'+
   '<div class="sl-ctl"><span class="small mute">ends badly:</span>'+bad.map(chip).join('')+'</div>'+
   '<div class="sl-ctl"><span class="small mute">back to PENDING or paused:</span>'+loop.map(chip).join('')+'</div>';
  const info=$('sl-states-info');info.innerHTML='<b>Click a state.</b> The running example went PENDING (Resources, 23 s) &rarr; RUNNING (10 s) &rarr; COMPLETING &rarr; COMPLETED.';
  el.addEventListener('click',e=>{const b=e.target.closest('button[data-s]');if(!b)return;const s=ST.find(x=>x[0]===b.dataset.s);
    el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));info.innerHTML='<b>'+s[0]+' ('+s[1]+').</b> '+esc(s[3])})})();
})();

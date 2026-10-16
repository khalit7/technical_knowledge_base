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

// ---- the cluster map ----
const MAP=[
 {id:'user',x:0,y:0,w:1,sh:'users',ss:'alice, carol, bob',lab:'users alice, carol (teama), bob (teamb)',sub:'sbatch, squeue, sacct',info:'Users log in somewhere with the Slurm client commands and a copy of the munge key; here they are the accounts alice, carol and bob on the controller container. On a real cluster that is a login node.'},
 {id:'ctl',x:1,y:0,w:2,sh:'ctl: slurmctld, slurmdbd',ss:'MariaDB, munged',lab:'ctl: slurmctld + slurmdbd + MariaDB',sub:'munged, slurmscriptd; 512 MB, 1 CPU',info:'The controller container: slurmctld (all scheduling and state), slurmscriptd (runs controller-side scripts), slurmdbd and MariaDB (accounting, fairshare usage, QOS and limits) and munged. Real clusters put slurmdbd and the database on their own host and run a backup slurmctld.'},
 {id:'c1',x:0,y:1,w:1,lab:'c1: slurmd',ss:'4 CPU, 4 fake GPU',sub:'4 CPUs, 4 fake GPUs',info:'A compute node: slurmd and munged only, fetching its configuration from ctl (configless). Declared 4 CPUs, 4,000 MB and gpu:4 (four empty placeholder files). Each container is capped at 800 MB and 2 CPUs by Docker; Slurm does not know that.'},
 {id:'c2',x:1,y:1,w:1,lab:'c2: slurmd',ss:'4 CPU, 4 fake GPU',sub:'4 CPUs, 4 fake GPUs',info:'Same as c1. The running example ran on c1 and c2: 2 ranks each.'},
 {id:'c3',x:2,y:1,w:1,lab:'c3: slurmd',ss:'4 CPU, 4 fake GPU',sub:'4 CPUs, 4 fake GPUs',info:'Same as c1. Reserved for alice in section 10.'},
 {id:'sh',x:0,y:2,w:3,lab:'/shared volume on all four containers',sub:'jobs, out, ckpt, logs',info:'A Docker volume mounted at /shared everywhere: job scripts, job output, checkpoints and the training logs. The stand-in for a cluster file system (the root\'s Storage lab measures what that costs).'}];
function drawMap(){const el=$('sl-map');if(!el)return;const W=Math.min(RD.width(el),860),cw=(W-20)/3,rh=58;
  let b='';const col={user:'var(--c4)',ctl:'var(--c1)',c1:'var(--c3)',c2:'var(--c3)',c3:'var(--c3)',sh:'var(--c5)'};
  const fs=W<480?10.5:12;
  // arrows
  const cx=i=>10+cw*i+cw/2;
  b+='<line x1="'+cx(0.5)+'" y1="'+(10+rh)+'" x2="'+cx(0.5)+'" y2="'+(10+rh+16)+'" stroke="var(--mute)"/>';
  MAP.forEach(m=>{const x=10+m.x*cw+3,y=10+m.y*(rh+16),w=m.w*cw-6;
    b+='<g data-k="'+m.id+'" style="cursor:pointer"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+rh+'" rx="8" fill="var(--soft)" stroke="'+col[m.id]+'" stroke-width="1.6"/>'+
      '<text x="'+(x+w/2)+'" y="'+(y+24)+'" text-anchor="middle" font-size="'+fs+'" font-weight="600">'+esc(fit(W<480&&m.sh?m.sh:m.lab,w,fs))+'</text>'+
      '<text x="'+(x+w/2)+'" y="'+(y+42)+'" text-anchor="middle" font-size="'+(fs-1)+'" fill="var(--mute)">'+esc(fit(W<480&&m.ss?m.ss:m.sub,w,fs-1))+'</text></g>'});
  el.innerHTML=RD.svg(W,10+3*(rh+16),b,'The lab Slurm cluster');}
function fit(s,w,fs){const n=Math.floor(w/(fs*0.56));return s.length>n?s.slice(0,Math.max(4,n-1))+'…':s}
(function(){const el=$('sl-map');if(!el)return;el.addEventListener('click',e=>{const g=e.target.closest('g[data-k]');if(!g)return;const m=MAP.find(x=>x.id===g.dataset.k);
  $('sl-map-info').innerHTML='<b>'+esc(m.lab)+'.</b> '+esc(m.info)});$('sl-map-info').innerHTML='<b>Click a box.</b> Arrows are not drawn between every pair: every daemon talks to slurmctld, and slurmctld talks to slurmdbd.';
  drawMap();RD.onRender(drawMap);RD.onResize(drawMap)})();

// ---- job states ----
const ST=[['PENDING','PD','main','Waiting with a reason (section 5 and the Why pending? tab). Held jobs are PENDING with priority 0.'],
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

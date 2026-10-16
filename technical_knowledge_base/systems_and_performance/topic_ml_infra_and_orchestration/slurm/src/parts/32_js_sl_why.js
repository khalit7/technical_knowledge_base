// ---- Why pending? tab: curated reasons (measured here where marked), all 218 reason strings, and a limit-name decoder ----
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id);
if(!$('t-why'))return;
const GH='https://github.com/SchedMD/slurm/blob/slurm-24-11-5-1/src/common/job_state_reason.c#L';
// [reason, measured line or '', family, meaning, what to do]
const K=[
 ['None','L:','cluster','Not yet looked at by a scheduler pass. Lasts until the next main-loop or backfill cycle (here under a second).','Wait a scheduler cycle.'],
 ['Resources','g:95','cluster','The job is the first blocked job of its partition: next in line, waiting for nodes, CPUs, memory or GPUs to free.','squeue --start -j N for the planned start; scontrol show node for what is busy. Asking for less (fewer GPUs, shorter limit) may let backfill start it.'],
 ['Priority','g:82','cluster','A higher-priority job in the same partition is waiting, so the main loop did not try this one (it stops a partition at its first blocked job).','sprio -l to compare; only backfill can start it early, and only if its time limit fits a gap.'],
 ['Dependency','g:84','mine','Waiting for the jobs in --dependency. Age does not accrue meanwhile (AccrueTime=Unknown).','scontrol show job N | grep Dependency; the parent job ids show their state in brackets.'],
 ['DependencyNeverSatisfied','N:','mine','The dependency can no longer be met (afterok on a job that failed). It stays in the queue forever.','scancel it, or submit with --kill-on-invalid-dep=yes.'],
 ['BeginTime','g:85','mine','Submitted with --begin in the future, or a requeued job inside its restart delay (about 121 s here).','scontrol show job N | grep EligibleTime.'],
 ['JobHeldUser','g:86','mine','Held by its owner (sbatch -H or scontrol hold). Priority 0.','scontrol release N.'],
 ['JobHeldAdmin','g:87','admin','Held by an administrator (scontrol hold as root). The user cannot release it.','Ask the administrators why.'],
 ['PartitionTimeLimit','g:88','never','The time limit is above the partition\'s MaxTime (120 min against 60 here). Accepted because EnforcePartLimits is not set; it will never start.','scontrol update job N TimeLimit=60, or resubmit to a partition that allows it.'],
 ['QOSMaxGRESPerUser','g:92','limit','The QOS caps GPUs per user (sl-small: 4) and this job, with what the user already runs, would exceed it. Here the job alone asks for 8, so it never starts.','sacctmgr show qos format=name,maxtrespu; use another QOS or fewer GPUs.'],
 ['AssocGrpGRES','g:93','limit','The association (user or account) has a group GPU limit (carol: GrpTRES=gres/gpu=2) and this job would exceed it. Carol\'s priority was the highest of the queue: limits and priority are separate.','sacctmgr show assoc where user=$USER format=account,user,grptres; ask for a higher limit or wait for your own jobs.'],
 ['JobArrayTaskLimit','d:102_2','mine','The array\'s throttle (--array=0-5%2) allows only that many tasks at once.','scontrol update job 102 ArrayTaskThrottle=4 to raise it.'],
 ['ReqNodeNotAvail','r:118|121','cluster','Nodes the job needs are unavailable for its whole time window: down, drained, or in a reservation the job cannot use. The text after the comma says which; "Reserved for maintenance" means the job would still be running when a MAINT reservation starts.','sinfo -R for down and drained nodes, scontrol show res for reservations; a shorter --time can fit before a maintenance window.'],
 ['Nodes required for job are DOWN, DRAINED or reserved for jobs in higher priority partitions','g:91|F:58','cluster','Not a reason name but the text the main loop writes into Resources when fewer usable nodes remain in the partition than the job needs. Here it appeared twice: once with c2 really drained (root Failure lab), once with every node healthy, because a higher-priority job of an overlapping partition had claimed them for that pass.','sinfo first; if every node is up, look for a waiting higher-priority job in another partition on the same nodes.'],
 ['Reservation','','mine','The job asked for a reservation that has not started yet.','scontrol show res NAME for its StartTime.'],
 ['Prolog','','cluster','The allocation exists and the prolog is still running on its nodes (state CONFIGURING with PrologFlags=Alloc).','A slow prolog (GPU checks, image pulls) shows here; look at the node\'s slurmd.log.'],
 ['Licenses','','cluster','Waiting for a license (a cluster-wide counted resource such as a file-system or software license).','scontrol show lic.'],
 ['QOSGrpGRES','','limit','The QOS as a whole (every user together) is at its GPU limit.','sacctmgr show qos format=name,grptres; the jobs already running in that QOS hold it.'],
 ['AssocMaxJobsLimit','','limit','The association has MaxJobs running already.','squeue -u $USER -t R | wc -l against sacctmgr show assoc format=user,maxjobs.'],
 ['QOSMaxWallDurationPerJobLimit','','limit','The job\'s time limit is above the QOS\'s MaxWall.','Lower --time or use another QOS.'],
 ['PartitionNodeLimit','','never','More nodes than the partition\'s MaxNodes (or fewer than MinNodes).','scontrol show partition NAME.'],
 ['ReservationDeleted','','never','The reservation the job named was deleted.','Resubmit without --reservation.'],
 ['JobHoldMaxRequeue','','admin','The job was requeued too many times (SchedulerParameters max_batch_requeue) and is held: usually a job that crashes its nodes or fails at start.','Read its output; scontrol release after fixing.'],
 ['InvalidQOS','E:Invalid qos','never','At submission: the QOS does not exist or the association may not use it.','sacctmgr show assoc where user=$USER format=user,qos.'],
 ['QOSNotAllowed','','never','The partition does not allow the job\'s QOS (AllowQos).','scontrol show partition NAME | grep AllowQos.']];
const FAM={cluster:['the cluster is busy or unavailable','var(--c1)'],mine:['your own job\'s options or chain','var(--c3)'],limit:['an accounting limit (association or QOS)','var(--c4)'],never:['will never start as submitted','var(--bad)'],admin:['an administrator\'s decision','var(--c5)']};
const R=S.reasons, byStr={};R.forEach(r=>{(byStr[r[0]]=byStr[r[0]]||[]).push(r)});
$('wy-n').textContent=R.length;$('wy-nl').textContent=R.filter(r=>r[3].indexOf('QOS_ASSOC')>=0).length;
// the limit-name grammar
const RX=/^(Assoc|Association|QOS)?(Grp|Max|Min)?(Cpu|CPU|Memory|Mem|Node|GRES|Energy|License|BB|Billing|Unknown|SubmitJobs|SubmitJob|Jobs|Job|Wall|Resource|Time|Usage)?(Minutes|RunMinutes|RunMins)?(Duration)?(Per(?:Job|User|Node|Account))?(MinutesPerJob)?(Limit|NotSatisfied|Threshold)?$/;
function decode(s){const m=RX.exec(s);if(!m||!m[3]&&!m[1])return null;const p=[];
  const who=m[1]?(m[1]==='QOS'?'the job\'s QOS':'your association (user or account)'):'a QOS limit';p.push(['who',m[1]||'(QOS)',who]);
  if(m[2])p.push(['kind',m[2],{Grp:'summed over all running jobs',Max:'per job, user or node (see the suffix)',Min:'a minimum the job does not meet'}[m[2]]]);
  if(m[3])p.push(['resource',m[3],{Cpu:'CPUs',CPU:'CPUs',Mem:'memory',Memory:'memory',Node:'nodes',GRES:'generic resources: GPUs',Energy:'energy',License:'licenses',BB:'burst buffer',Billing:'billing units',Unknown:'a TRES with no name of its own',SubmitJobs:'jobs submitted (pending + running)',SubmitJob:'jobs submitted',Jobs:'running jobs',Job:'jobs',Wall:'wall time',Resource:'resources (generic)',Time:'time',Usage:'usage'}[m[3]]]);
  if(m[4])p.push(['measure',m[4],m[4]==='Minutes'?'resource-minutes used (decayed usage)':'resource-minutes still to run for jobs running now']);
  if(m[5])p.push(['measure','Duration','wall-clock duration']);
  if(m[6])p.push(['per',m[6],'counted '+m[6].replace('Per','per ').toLowerCase()]);
  if(m[7])p.push(['measure','MinutesPerJob','resource-minutes of one job (TRES x time limit)']);
  if(m[8])p.push(['ending',m[8],'']);
  return p}
const lim=R.filter(r=>r[3].indexOf('QOS_ASSOC')>=0),ok=lim.filter(r=>decode(r[0]));
$('wy-gram').innerHTML='The decoder parses '+ok.length+' of the '+lim.length+' limit names'+(ok.length<lim.length?' (not: '+lim.filter(r=>!decode(r[0])).map(r=>'<code>'+esc(r[0])+'</code>').join(', ')+')':'')+'.';
function show(name){const k=K.find(x=>x[0].toLowerCase()===name.toLowerCase());const src=byStr[name]||(k?byStr[k[0]]:null)||R.filter(r=>r[0].toLowerCase()===name.toLowerCase());
  const d=decode(name);let h='';
  if(!k&&!(src&&src.length)){h='<b>'+esc(name)+'</b> is not one of Slurm 24.11.5\'s reason strings. Check the spelling (they are case-sensitive in output), or it may be text after a comma (for ReqNodeNotAvail).';$('wy-out').innerHTML=h;return}
  const f=k?FAM[k[2]]:(src[0][3].indexOf('QOS_ASSOC')>=0?FAM.limit:src[0][3].indexOf('PART')>=0?FAM.never:null);
  h+='<h3>'+esc(k?k[0]:name)+'</h3>';
  if(f)h+='<div><span class="tag" style="color:'+f[1]+';border-color:'+f[1]+'">'+f[0]+'</span>'+(k&&k[1]?'<span class="sl-meas">measured here</span>':'')+'</div>';
  if(k)h+='<p>'+esc(k[3])+'</p><p><b>Do:</b> '+esc(k[4])+'</p>';
  else if(d)h+='<p>A limit: '+d.map(x=>x[2]).filter(Boolean).join(', ')+'. It clears when running jobs counted against it end (your own for Assoc and per-user limits, everyone\'s in the QOS for QOS Grp limits; for Minutes, as usage decays), unless this job alone exceeds it.</p>';
  if(d&&d.length>1)h+='<div class="wy-dec">'+d.map(x=>'<span><b>'+x[0]+'</b>'+esc(x[1])+(x[2]?' <span class="mute">'+esc(x[2])+'</span>':'')+'</span>').join('')+'</div>';
  if(k&&k[1])h+='<pre>'+esc(real(k[1]))+'</pre>';
  if(src&&src.length)h+='<p class="small mute">In the source: '+src.map(r=>'<code>'+esc(r[1])+'</code> (<a href="'+GH+r[2]+'" target="_blank" rel="noopener noreferrer">job_state_reason.c:'+r[2]+'</a>'+(r[3].length?', flags '+r[3].join(' | '):'')+')').join('; ')+'</p>';
  else if(k)h+='<p class="small mute">Not an entry of the reason table: this text is written into the reason description by the scheduler (job_scheduler.c, '+(SLQ?SLQ.qlink('nodes_down_msg'):'')+').</p>';
  $('wy-out').innerHTML=h;
  $('wy-chips').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.r===(k?k[0]:name)))}
const SLQ=window.SLQ;
// real lines from the runs: g = gallery squeue, d = dependency poll, r = reservation run, F = root Failure lab drain run, E = submit error
function real(spec){if(!spec)return '';return spec.split('|').map(x=>{const t=x[0],id=x.slice(2);
  const pick=(txt,re)=>(txt.split('\n').find(l=>re.test(l))||'');
  if(t==='g')return pick(S.ex.gal_q0,new RegExp('^\\s*'+id+'\\s'));
  if(t==='d')return pick(S.ex.deps_poll1,new RegExp('^\\s*'+id.replace('_','_')+'\\s'));
  if(t==='r')return pick(S.ex.resv,new RegExp('^\\s*'+id+'\\s'));
  if(t==='F')return pick(S.ex.fl_drain,new RegExp('^\\s*'+id+'\\s'))+'   (root Failure lab: node c2 drained)';
  if(t==='E')return pick(S.errors.join('\n'),new RegExp(id));
  if(t==='N')return S.ex.never.trim();
  if(t==='L')return S.ex.life_poll1+'   (squeue -o %T|%r|%S|%N, first poll after sbatch)';
  return ''}).join('\n')}
$('wy-chips').innerHTML=K.map(k=>'<button data-r="'+esc(k[0])+'"'+(k[1]?' class="m"':'')+'>'+esc(k[0].length>34?k[0].slice(0,31)+'...':k[0])+'</button>').join('');
$('wy-chips').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b)show(b.dataset.r)});
function list(q){q=(q||'').toLowerCase();const hits=R.filter(r=>!q||r[0].toLowerCase().indexOf(q)>=0||r[1].toLowerCase().indexOf(q)>=0);
  $('wy-list').innerHTML='<div class="small mute">'+hits.length+' of '+R.length+' reason strings'+(q?' matching "'+esc(q)+'"':'')+':</div>'+hits.map(r=>'<button data-r="'+esc(r[0])+'">'+esc(r[0])+'</button>').join('')}
$('wy-list').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b)show(b.dataset.r)});
$('wy-q').addEventListener('input',e=>{const v=e.target.value.trim();list(v);const ex=R.find(r=>r[0].toLowerCase()===v.toLowerCase());if(ex)show(ex[0])});
list('');show('Priority');
})();

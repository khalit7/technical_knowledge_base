// ---- Reading tab visuals (prefix ld-) ----
(function(){
const D=window.LD, $=id=>document.getElementById(id), esc=RD.esc, L=k=>D.lines[k];
const src=(k,txt)=>{const l=L(k);return '<a href="'+l.u+'" target="_blank" rel="noopener noreferrer">'+(txt||(l.f+':'+l.l))+'</a>'};
const f1=x=>(Math.round(x*10)/10).toFixed(1);

// predict-then-reveal (every .pr with buttons carrying data-r)
document.querySelectorAll('#t-read .pr, #t-ldenv .pr').forEach(pr=>{
  const ans=pr.querySelector('.ans');
  pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.r==='1'?'right':'wrong',x===b||x.dataset.r==='1'));
    if(ans)ans.hidden=false;}));
});

// 1. the launch chain
const ST=D.stages;
const CH={
 slurm:[
  ['Scheduler','sbatch: slurmctld picks 2 nodes, runs the batch script on the first',[0],'job time limit','A node never boots or its slurmd is down: the job stays PENDING or the step never starts','Slurm child page; parent Scheduling lab'],
  ['Node launcher','srun starts one task per node: one torchrun each',[1],'none by default','srun cannot reach a node; sbatch --export in these containers killed slurmd (parent Launch lab)','parent Launch lab'],
  ['Agent rendezvous','torchrun agents meet at c1:29500 (c10d), get node ranks',[2,3],'join 600 s','A node that never arrives: a bare RendezvousTimeoutError after 602 s (parent Launch lab)','section 4'],
  ['Workers start','each agent spawns 2 workers with RANK, WORLD_SIZE, MASTER_ADDR/PORT; they import torch',[4],'none','A worker crashing on import shows as ChildFailedError on that node','section 3'],
  ['Process group','init_process_group: workers use the agent store; gloo connects a full mesh',[5],'pg timeout (120 s in train.py; default 30 min)','Wrong WORLD_SIZE: "wait timeout after 120000ms" (parent Launch lab)','section 6'],
  ['First step','data, model, DDP wrapper (parameter broadcast), step 1',[6,7],'pg timeout','A rank in a different code path: hang until the pg timeout','section 8']],
 k8s:[
  ['Scheduler','kubectl create a JobSet; Kueue admits it; the scheduler binds 2 pods',[0],'none by default (activeDeadlineSeconds if set)','Pending pods: quota, no fitting node, gang not admitted','Kubernetes for ML child page'],
  ['Node launcher','the kubelet starts each pod\'s container, which runs torchrun',[0],'none','Image pull on a fresh node (not in these timings: images preloaded)','parent Launch lab'],
  ['Agent rendezvous','static: pod 0 hosts the store at its DNS name, pod 1 connects',[1,2],'900 s (torchrun\'s launcher)','Pod 1 missing: "Timed out after 901 seconds waiting for clients. 1/2 clients joined." at 903 s','section 4'],
  ['Workers start','2 workers per pod',[3],'none','as on Slurm','section 3'],
  ['Process group','gloo full mesh between the 4 ranks',[4],'pg timeout','DNS: the short host name resolves only inside pod 0 (gai error -2)','section 9'],
  ['First step','DDP wrapper, step 1',[5,6],'pg timeout','as on Slurm','section 8']],
 ray:[
  ['Scheduler','the driver connects; Ray Train\'s controller asks for a placement group of 4 workers',[0,1],'worker group start 60 s, retried','Not enough resources: "worker group startup timed out" every 60 s, forever','Ray child page'],
  ['Node launcher','raylets start 4 worker actors (no torchrun) and import torch',[2],'same','as above','parent Launch lab'],
  ['Agent rendezvous','none: Ray picks rank 0\'s address and a free port',[3],'n/a','','section 2'],
  ['Workers start','actors are already running; Ray sets RANK, WORLD_SIZE, MASTER_ADDR/PORT',[3],'n/a','',''],
  ['Process group','every worker calls init_process_group (env://)',[4],'TorchConfig timeout_s 1800','',''],
  ['First step','the training function starts, DDP wrapper, step 1',[5,6,7],'pg timeout','','']]};
const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
let sys='slurm',sel=2;
function chain(){
  const st=ST[sys].stages, rows=CH[sys];
  $('ld-chain').innerHTML=rows.map((r,i)=>{const s=r[2].reduce((a,j)=>a+(st[j]?st[j][1]:0),0);
    return '<button data-i="'+i+'" style="--sc:'+COL[i]+'"'+(i===sel?' class="on"':'')+'><b>'+(i+1)+'. '+r[0]+'</b><i>'+esc(r[1])+'</i><span class="to">'+f1(s)+' s</span></button>'}).join('');
  const r=rows[sel];
  $('ld-chain-det').innerHTML='<h4>'+(sel+1)+'. '+r[0]+' on '+({slurm:'Slurm',k8s:'Kubernetes',ray:'Ray'}[sys])+'</h4><p style="margin:2px 0">'+esc(r[1])+'.</p>'+
   '<p style="margin:2px 0"><b>Stages measured:</b> '+r[2].map(j=>esc(st[j][0])+' '+st[j][1].toFixed(2)+' s').join('; ')+' (medians of '+ST[sys].n+' runs; submit to first step '+ST[sys].total.toFixed(1)+' s; stage medians need not add up to the total median).</p>'+
   '<p style="margin:2px 0"><b>Timeout:</b> '+esc(r[3])+'. '+(r[4]?'<b>Typical failure:</b> '+esc(r[4])+'. ':'')+(r[5]?'<span class="mute">More: '+esc(r[5])+'.</span>':'')+'</p>';
}
$('ld-chain').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=+b.dataset.i;chain()});
RD.seg($('ld-chain-sys'),m=>{sys=m;chain()});
chain();

// 3. agent log of the restart run
(function(){const R=D.rz.noshare;
  const lines=R.events.filter(e=>e.who==='B'&&e.src==='agent'&&['a_rdzv','a_done','a_failed','a_port','a_world','a_finish'].includes(e.k)).map(e=>'+'+e.t.toFixed(2).padStart(6)+' s  '+e.msg.trim());
  const lg=R.logs.filter(l=>l.rank===1&&l.ev!=='step').map(l=>'+'+l.t.toFixed(2).padStart(6)+' s  rank 1: '+l.ev+(l.ev==='crash'?' (exit 13) at step '+l.step:l.ev==='end'?' at step '+l.step+', global loss '+l.gloss:l.ev==='resume'||l.ev==='start'?' from step '+l.step:''));
  const all=lines.concat(lg).sort((a,b)=>parseFloat(a.slice(1))-parseFloat(b.slice(1)));
  $('ld-agentlog').textContent=all.join('\n');})();

// 4. rendezvous numbers from the elastic run
(function(){const R=D.rz.elastic,E=R.events,M=R.marks;
  const f=(k,p)=>E.find(e=>e.k===k&&(!p||p(e)));
  const j0=f('add_part',e=>e.g[0]==='0'&&e.who==='B'), c0=f('complete',e=>e.g[0]==='0'), w=f('add_wait',e=>e.who==='C'),
    c1=f('complete',e=>e.g[0]==='1'), fl=E.find(e=>e.k==='a_failed'&&e.t>M.kill_C), dd=f('dead'), c2=f('complete',e=>e.g[0]==='2'),nw=f('a_new'),dn=E.filter(e=>e.k==='a_done'&&e.t>nw.t)[0];
  D.rzStats={j0:j0.t,c0:c0.t,cup:M.C_up,w:w.t,c1:c1.t,kill:M.kill_C,fail:fl.t,dead:dd.t,c2:c2.t};
  if($('ld-rz-stats'))$('ld-rz-stats').innerHTML=[
   RD.stat('Round 0 last call','+'+f1(c0.t-j0.t)+' s','from B joining (the 2nd, min_nodes) to complete'),
   RD.stat('C joins a running job',f1(dn.t-nw.t)+' s','from the agents noticing C (wait list) to round 1 done at max_nodes'),
   RD.stat('Failure noticed',f1(fl.t-M.kill_C)+' s','kill of C to "Worker group FAILED" (monitor interval 1 s)'),
   RD.stat('Dead node removed',f1(dd.t-M.kill_C)+' s','after the kill (heartbeat 5 s × 3)'),
   RD.stat('Back at world 2',f1(c2.t-M.kill_C)+' s','after the kill: heartbeat expiry + 30 s last call')].join('');})();

// 5. the store before/after
(function(){
  const card=$('ld-st-card');let mode='share_a',steps=[];
  function build(m){const R=D.rz[m],E=R.events,P=R.probes,LG=R.logs;
    const ports=E.filter(e=>e.k==='a_port'&&e.who==='A').map(e=>({t:e.t,p:e.g[0]}));
    const fails=E.filter(e=>e.k==='a_failed'),crash=LG.find(l=>l.ev==='crash');
    const p1=P.filter(p=>p.restart===1),p0=P.filter(p=>p.restart===0);
    const S=[];
    S.push({t:ports[0].t,ph:0,port:ports[0].p,keys:[],tag:'empty',w:['wait','wait'],
      cap:'Attempt 0. The two agents meet at the rendezvous store (port 29613); rank 0\'s agent opens the workers\' store on a free port, '+ports[0].p+'.'+(p0[0]&&p0[0].num_keys!=null?' The probe in each worker finds it empty: '+p0[0].num_keys+' keys.':' (No probe: without a shared agent store the workers\' rank 0 creates the store inside init_process_group.)')});
    S.push({t:LG.find(l=>l.ev==='start').t,ph:0,port:ports[0].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1'],tag:'fresh',w:['run','run'],
      cap:'init_process_group: each rank writes its gloo address under its key and connects to the other. Training starts.'});
    S.push({t:crash.t,ph:0,port:ports[0].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1'],tag:'fresh',w:['run','dead'],
      cap:'Rank 1 exits with code 13 after step '+crash.step+'. Its listening socket is gone; rank 0\'s next collective fails ("Read error ... Connection reset by peer").'});
    S.push({t:fails[fails.length-1].t,ph:1,port:ports[0].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1'],tag:m==='noshare'?'gone':'stale',w:['dead','dead'],
      cap:'Both agents log "Worker group FAILED. 1/1 attempts left; will restart worker group", stop their workers and go back to the rendezvous.'});
    const same=ports[1].p===ports[0].p;
    S.push({t:ports[1].t,ph:1,port:ports[1].p,keys:same?['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1','(a third key)']:[],tag:same?'stale':'empty',w:['wait','wait'],
      cap:'Attempt 1. The agents meet again. Workers\' store port: '+ports[1].p+(same?', the same store as attempt 0. The probe counts '+p1[0].num_keys+' keys already there, both gloo address keys of attempt 0 among them.':', a new store: the old one and its keys are gone.')});
    if(m==='noshare'){const rs=LG.find(l=>l.ev==='resume'),en=LG.find(l=>l.ev==='end');
      S.push({t:rs.t,ph:1,port:ports[1].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1'],tag:'fresh',w:['run','run'],
        cap:'The new workers write fresh addresses and connect. Both load step_000020.pt and resume at step '+rs.step+', '+f1(rs.t-crash.t)+' s after the crash.'});
      S.push({t:en.t,ph:1,port:ports[1].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1'],tag:'fresh',w:['done','done'],
        cap:'Step '+en.step+' reached; global loss '+en.gloss+', the same value as the uninterrupted run at step 80 recorded by the parent\'s Failure lab. Job succeeded.'});
    }else{const em=E.filter(e=>e.k==='err_mesh'||(e.k==='other'&&/^RendezvousConnectionError/.test(e.msg)));
      em.forEach((e,i)=>{const r=e.who==='A'?0:1;const w=i===0?(r===0?['dead','wait']:['wait','dead']):['dead','dead'];
        const ref=/Connection refused/.test(e.msg),to=/Connect timeout/.test(e.msg);
        S.push({t:e.t,ph:1,port:ports[1].p,keys:['default_pg/0//cpu//0/0','default_pg/0//cpu//0/1','(a third key)'],tag:'stale',w:w,
          cap:'Rank '+r+': '+(ref?'connected to the address its peer had in attempt 0: "Gloo connectFullMesh failed ... Connection refused".':to?'after waiting '+f1(e.t-ports[1].t)+' s for a peer that will never connect: "Gloo connectFullMesh failed ... Connect timeout [none]" (300 s, the c10d Store default).':'its agent loses the rendezvous store: "RendezvousConnectionError: The connection to the C10d store has failed."')+(i===em.length-1?' No restarts left: the job fails.':'')});});
    }
    return S;}
  const W=()=>RD.width($('ld-st-svg'));
  function draw(i){const s=steps[i];if(!s)return;const w=Math.min(W(),720),h=200,col={wait:'var(--mute)',run:'var(--good)',dead:'var(--bad)',done:'var(--acc)'};
    const bw=Math.max(110,w*0.26);let b='';
    ['A','B'].forEach((a,k)=>{const y=20+k*95;b+='<rect x="4" y="'+y+'" width="'+bw+'" height="72" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(12,y+18,'agent '+a+' (node '+k+')',{w:600,fs:12})+
      '<rect x="12" y="'+(y+28)+'" width="'+(bw-16)+'" height="34" rx="6" fill="var(--bg)" stroke="'+col[s.w[k]]+'" stroke-width="2"/>'+RD.t(20,y+50,'rank '+k+': '+({wait:'starting',run:'training',dead:'failed',done:'finished'}[s.w[k]]),{fs:12,fill:col[s.w[k]]})});
    const sx=bw+30,sw=w-sx-6;
    b+='<rect x="'+sx+'" y="20" width="'+sw+'" height="167" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(sx+10,38,'workers\' store, port '+s.port,{w:600,fs:12})+RD.t(sx+sw-8,38,'attempt '+s.ph,{a:'end',fs:11,fill:'var(--mute)'});
    s.keys.forEach((k,j)=>{const y=52+j*30,st=s.tag==='stale';b+='<rect x="'+(sx+10)+'" y="'+y+'" width="'+(sw-20)+'" height="24" rx="4" fill="var(--bg)" stroke="'+(st?'var(--bad)':'var(--good)')+'"'+(st?' stroke-dasharray="4 3"':'')+'/>'+RD.t(sx+16,y+16,esc(k)+(st&&k[0]!=='('?'  (attempt 0, stale)':''),{fs:11})});
    if(!s.keys.length)b+=RD.t(sx+12,64,s.tag==='gone'?'(store gone with attempt 0)':'(empty)',{fs:12,fill:'var(--mute)'});
    $('ld-st-svg').innerHTML=RD.svg(w,h,b,'workers store and two ranks, step '+(i+1));
    $('ld-st-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+steps.length+' (+'+f1(s.t)+' s)</div><p>'+s.cap+'</p>';
    $('ld-st-cnt').innerHTML=RD.stat('Time since start',f1(s.t)+' s','')+RD.stat('Workers\' store port',s.port,s.ph?(s.port===steps[0].port?'reused':'new'):'')+RD.stat('Outcome',mode==='noshare'?(i===steps.length-1?'succeeded':'running'):(i===steps.length-1?'failed':'running'),'');
  }
  steps=build(mode);
  const an=RD.anim({card:'ld-st-card',ctl:'ld-st-ctl',n:steps.length,draw:draw,ms:2600,label:'Store animation step'});
  RD.seg($('ld-st-mode'),m=>{mode=m;steps=build(m);an.reset(steps.length)});
  RD.onResize(()=>an.redraw());
})();

// 6. interface explorer: NCCL's rule applied to the recorded interface lists
(function(){
  function match(name,list){let not=false,exact=false;if(list[0]==='^'){not=true;list=list.slice(1)}if(list[0]==='='){exact=true;list=list.slice(1)}
    const ps=list.split(',').filter(Boolean);const m=!ps.length||ps.some(p=>exact?name===p:name.startsWith(p));return m!==not}
  function find(ifs,list,max){const out=[];for(const x of ifs){if(out.length>=max)break;if(!x.running)continue;if(x.fam==='inet6'&&x.loopback)continue;
      if(!match(x.name,list))continue;if(out.indexOf(x.name)<0)out.push(x.name)}return out}
  function nccl(ifs,env,max){if(env&&env.length>1)return {rule:'NCCL_SOCKET_IFNAME='+env,r:find(ifs,env,max)};
    for(const p of ['ib','^docker,lo,virbr','docker','lo','virbr']){const r=find(ifs,p,max);if(r.length)return {rule:'default rule, stage "'+p+'"',r:r}}return {rule:'none',r:[]}}
  let net='host';
  function render(){const ifs=D.net[net],env=$('ld-if-env').value,b=nccl(ifs,env,1),s=nccl(ifs,env,16);
    const chips=a=>a.length?a.map(n=>'<code>'+esc(n)+'</code>').join(' '):'<b style="color:var(--bad)">none: NCCL would fail ("Bootstrap : no socket interface found" or "NET/Socket : no interface found")</b>';
    const names=[];ifs.forEach(x=>{if(names.indexOf(x.name)<0)names.push(x.name)});
    $('ld-if-out').innerHTML='<p class="small" style="margin:4px 0"><b>Bootstrap interface</b> (first match): '+chips(b.r)+' <span class="mute">('+esc(b.rule)+')</span></p>'+
     '<p class="small" style="margin:4px 0"><b>Socket transport interfaces</b> (up to 16): '+chips(s.r)+'</p>'+
     '<p class="small mute" style="margin:4px 0">All '+ifs.length+' address entries in kernel order ('+names.length+' interfaces; bridge and veth ids renamed br-a, veth1, ...; not running: '+(ifs.filter(x=>!x.running).map(x=>esc(x.name)+' '+x.fam).join(', ')||'none')+').</p>';}
  RD.seg($('ld-if-net'),m=>{net=m;render()});$('ld-if-env').addEventListener('change',render);render();
})();

// 7. timeout ladder
(function(){const S=D.rzStats||{};const share=D.rz.share_a.events,es=D.rz.elastic_share.events;
  const meshTo=share.find(e=>e.k==='err_mesh'&&/Connect timeout/.test(e.msg)),p1=share.filter(e=>e.k==='a_port')[2];
  const esr=es.filter(e=>e.k==='a_rdzv').pop(),ese=es.find(e=>e.k==='err_store');
  const shape=D.hang.shape_OFF.errors['0'];
  const T=[
   ['c10d dead node (heartbeat 5 s × 3)',15,'dyn_keepalive',[[S.dead-S.kill,'removed after kill, here']]],
   ['c10d last call',30,'dyn_lastcall30',[[S.c0-S.j0,'round 0, here']]],
   ['Ray Train worker-group start (retried forever)',60,'ray_wg_timeout',[[60,'parent: every 60 s, 13 times']]],
   ['c10d store client read timeout',60,'c10d_read',[[ese.t-esr.t,'elastic grow with shared store, here'],[162.3,'parent: typo in host']]],
   ['process group, as these scripts set it',60,'backend_timeout',[[shape.t,'shape mismatch, here']]],
   ['c10d Store default',300,'store_300',[[meshTo.t-p1.t,'stale address, here']]],
   ['agent exit barrier',300,'agent_exitbarrier',[]],
   ['c10d rendezvous join',600,'dyn_timeouts',[[602.1,'parent: node missing']]],
   ['NCCL process group',600,'nccl_timeout',[]],
   ['static rendezvous via torchrun',900,'launcher_900',[[903.2,'parent: pod missing']]],
   ['gloo and default process group',1800,'backend_timeout',[]],
   ['Ray Train TorchConfig timeout_s',1800,'ray_torch_timeout',[]]];
  function render(){const w=Math.min(RD.width($('ld-to')),860),nar=w<600,lw=nar?0:230,x0=nar?6:lw+6,x1=w-34,lo=Math.log(8),hi=Math.log(2400),X=s=>x0+(Math.log(s)-lo)/(hi-lo)*(x1-x0),rh=nar?36:26,h=T.length*rh+34;
    let b='';[10,30,60,120,300,600,1800].forEach(s=>{b+='<line x1="'+X(s)+'" x2="'+X(s)+'" y1="4" y2="'+(h-24)+'" stroke="var(--line)"/>'+RD.t(X(s),h-10,s>=60?(s/60)+' min':s+' s',{a:'middle',fs:10,fill:'var(--mute)'})});
    T.forEach((r,i)=>{let y=8+i*rh;b+='<a href="'+L(r[2]).u+'" target="_blank" rel="noopener noreferrer">'+(nar?RD.t(x0,y+9,esc(r[0]),{fs:10.5}):RD.t(lw,y+13,esc(r[0]),{a:'end',fs:11}))+'</a>';if(nar)y+=12;b+=
      '<rect x="'+x0+'" y="'+(y+4)+'" width="'+Math.max(2,X(r[1])-x0)+'" height="12" rx="3" fill="var(--acc2)" stroke="var(--acc)"/>'+RD.t(X(r[1])+4,y+14,r[1]>=60?(r[1]/60)+' min':r[1]+' s',{fs:10,fill:'var(--mute)'});
      r[3].forEach(m=>{b+='<circle cx="'+X(m[0])+'" cy="'+(y+10)+'" r="4.5" fill="var(--good)"><title>'+esc(m[1])+': '+f1(m[0])+' s</title></circle>'})});
    $('ld-to').innerHTML=RD.svg(w,h,b,'default timeouts on a log scale with measured errors')+'<p class="small mute" style="margin:2px 0">Dots (hover): '+T.filter(r=>r[3].length).map(r=>r[3].map(m=>esc(m[1])+' '+f1(m[0])+' s').join(', ')).join('; ')+'.</p>';}
  render();RD.onRender(render);RD.onResize(render);
})();

// 8. recorded text blocks
$('ld-sidecar').textContent='docker run --rm --pid=container:ld-rz --cap-add SYS_PTRACE --memory 256m --cpus 0.5 \\\n  -v "$PWD":/w mi-train:1 /w/py-spy dump --pid 33';
$('ld-sidecar-out').textContent=D.sidecar.join('\n');
if($('ld-frout'))$('ld-frout').textContent=D.fr.patched.slice(0,10).join('\n');
$('ld-detail-msg').textContent=D.detail.mismatch_DETAIL.mismatch.replace(/\)\)\./,')).\n').replace(/, but /,',\nbut ');
$('ld-shmraw').innerHTML='Recorded: <code>'+D.net.shm_docker.map(esc).join('<br>')+'</code><br>kind pod (<code>src/scripts/ld-shm-pod.yaml</code>, memory limit 128 Mi): <code>'+D.net.shm_kind.map(esc).join('<br>')+'</code>';
})();

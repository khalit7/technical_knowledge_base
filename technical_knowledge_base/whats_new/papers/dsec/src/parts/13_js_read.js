// ---- The paper tab: Table 1, the three animations, predict reveals, results table ----
(function(){
const P=window.PAPER,T=P.tables,RC=P.rc,CHK={};RC.checks.forEach(c=>CHK[c.id]=c);
const dots=v=>{let s='';for(let i=0;i<3;i++)s+=v>=i+1?'●':v>=i+.5?'◐':'○';return s};
// Table 1 with a scenario picker
(function(){const b=$('t1body');if(!b)return;
  b.innerHTML=T.t1.rows.map(([n,v])=>'<tr><td>'+n+'</td>'+v.map((x,i)=>'<td class="dots" data-c="'+i+'">'+dots(x)+'</td>').join('')+'</tr>').join('')+
    '<tr><td>Scenarios</td>'+T.t1.scen.map((s,i)=>'<td data-c="'+i+'">'+s.join('<br>')+'</td>').join('')+'</tr>';
  const seg=$('t1M');const all=[];T.t1.scen.forEach((s,i)=>s.forEach(n=>all.push([n,i])));
  seg.innerHTML=all.map(([n,i])=>'<button data-m="'+i+'" aria-pressed="false">'+n+'</button>').join(' ');
  seg.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===btn);x.setAttribute('aria-pressed',x===btn?'true':'false')});
    const c=btn.dataset.m;$('t1tab').querySelectorAll('td[data-c],th').forEach(td=>{td.style.background=td.dataset.c===c?'var(--acc2)':''})}))})();

// Request path (§3.1, Figure 1)
const RQ={box:[
  {t:'libdsec sends a create request',c:'Training code on a trusted GPU server asks for a sandbox: backend, image or environment, CPU and memory limits, lifetime, network rules (§2.1).',on:['sdk']},
  {t:'IAM authenticates and authorises',c:'Every management request passes IAM: is this principal allowed to create here, and is it within its project\'s (possibly delegated) quota?',on:['sdk','iam']},
  {t:'The placement engine picks a node',c:'Filter to healthy nodes with the right backend and hardware, sample a few at random, take the least loaded in the watcher\'s view plus this engine\'s own recent placements.',on:['iam','pl','wa']},
  {t:'The apiserver forwards to that node\'s edge',c:'The ingress keeps no per-sandbox state; the sandbox ID will encode its edge, so any apiserver instance can route later requests.',on:['pl','api']},
  {t:'The edge admits, or refuses',c:'The edge checks its own capacity (refusing sends the request to another node), provisions storage with EROFS metadata local, applies the eBPF network policy and launches the runtime.',on:['api','edge']},
  {t:'The image loads on demand',c:'No full pull: the sandbox starts at once and file data is fetched from 3FS as it is read; writes go to the node\'s local disk.',on:['edge','box','fs']},
  {t:'Commands reach a shell session',c:'Each command goes apiserver, edge, aether (the per-sandbox proxy, over a Unix socket or vsock), then a chronus shell session; output streams back the same way.',on:['sdk','api','edge','box']},
  {t:'Stop, or time-to-live',c:'The caller stops the sandbox, or its time-to-live reclaims it; the edge releases storage and memory.',on:['edge']}],
 fn:[
  {t:'libdsec submits a task',c:'A FnCall request is a task specification: task type, dependency files and the code or script to run (§2.3).',on:['sdk']},
  {t:'Authorised like other requests',c:'IAM covers all management requests; the paper does not detail FnCall\'s path beyond what follows.',on:['sdk','iam']},
  {t:'Runs in a precreated container',c:'No aether, no chronus, no image to load: the task executes directly in a reusable container that already exists (CPU or GPU).',on:['iam','fn']},
  {t:'Best-effort cleanup, then reuse',c:'Task state is cleaned up on a best-effort basis and the container serves the next invocation.',on:['fn']}]};
const ax=s=>s.replace(/\{\{(§[\d.]+)\}\}/g,'$1');
Object.values(RQ).forEach(a=>a.forEach(x=>x.c=ax(x.c)));
makeAnim({id:'rq',mode:'box',modes:RQ,dur:2600,
  draw(m,k,e,w){const S=RQ[m][k],on=new Set(S.on),H=330,side=Math.min(170,w*.34),mw=Math.min(230,w-side-30),mx=(w-side-16-mw)/2+0;
    const rows=m==='box'?[['sdk','libdsec (GPU server, trusted)'],['iam','IAM'],['pl','Placement engine'],['api','apiserver (only path in)'],['edge','edge (one per node)'],['box','sandbox: aether + chronus']]
      :[['sdk','libdsec (GPU server, trusted)'],['iam','IAM'],['fn','precreated FnCall container']];
    const rh=H/rows.length;let s='';const pos={};
    rows.forEach(([id,t],i)=>{const y=i*rh+6,h=rh-16;pos[id]=[mx,y,mw,h];const a=on.has(id);
      s+=rc(mx,y,mw,h,a?'var(--acc2)':'var(--soft)',{s:a?'var(--acc)':'var(--line)',sw:a?2:1,r:7})+tx(mx+mw/2,y+h/2+4,t,{fs:12,a:'middle',w:a?600:400});
      if(i>0)s+=ln2(mx+mw/2,y-10,mx+mw/2,y-1,'var(--mute)')});
    const sb=(id,t,ref)=>{const r=pos[ref];const x=mx+mw+16,y=r[1],h=r[3],a=on.has(id);s+=rc(x,y,side,h,a?'var(--acc2)':'var(--soft)',{s:a?'var(--acc)':'var(--line)',sw:a?2:1,r:7,da:'4 3'})+tx(x+side/2,y+h/2+4,t,{fs:12,a:'middle'})+ln2(mx+mw,y+h/2,x,y+h/2,'var(--mute)',{da:'3 3'})};
    if(m==='box'){sb('wa','watcher (fleet view)','pl');sb('fs','3FS (image data)','box')}
    // the moving token
    const ids=S.on,last=pos[ids[ids.length-1]]||pos[ids[0]],first=pos[ids[0]]||last;const tx0=first[0]+14,ty0=first[1]+first[3]/2,tx1=last[0]+14,ty1=last[1]+last[3]/2;
    s+='<circle cx="'+(tx0+(tx1-tx0)*e).toFixed(1)+'" cy="'+(ty0+(ty1-ty0)*e).toFixed(1)+'" r="6" fill="var(--c2)"/>';
    return svgW(w,H,s,'Path of a sandbox request')},
  counters(m,k){const n=RQ[m].length;
    return m==='box'?stat('Components passed',[1,2,3,4,5,6,6,6][k]+' of 6')+stat('Per-sandbox state in the ingress','none','sandbox ID encodes its edge')+stat('Image bytes pulled before start','0','data fetched on read'):
      stat('Components passed',[1,2,3,3][k]+' of 3')+stat('Per-invocation provisioning','none','container is precreated')+stat('Step',(k+1)+' of '+n)}});

// Composable layers against monolithic images (§4.2, §5.1, Figure 4)
const NW=102171;let share=.5;
const LY={layer:[
  {t:'Toolkit T1 has a new version',c:'Bases, workspaces and toolkits are separate, independently versioned EROFS layers.'},
  {t:'Rebuild one layer',c:'Only the T1 layer is rebuilt and published. Nothing else changes.'},
  {t:'The next sandbox composes it',c:'At creation the modified dockerd stacks base (bottom), workspace, then T1 v2 on top as overlayfs lower layers, with a writable upper layer for runtime writes.'},
  {t:'Upgrading k toolkits costs O(k)',c:'Workspaces are untouched however many embed T1: the O(k·N) rebuild of the monolithic scheme becomes O(k) (§5.1).'}],
 mono:[
  {t:'Toolkit T1 has a new version',c:'Each image fuses a base, a workspace and its toolkits into one OCI image.'},
  {t:'Find every image that embeds T1',c:'Every image containing T1 is now stale, although its base and workspace did not change (Figure 4).'},
  {t:'Rebuild them all',c:'Each stale image is rebuilt and pushed again: O(k·N) work for k toolkits over N workspaces.'},
  {t:'And again at the next upgrade',c:'Toolkits such as the DeepSeek Harness are updated often, so the rebuild repeats with every release.'}]};
Object.values(LY).forEach(a=>a.forEach(x=>x.c=x.c.replace(/\{\{([^}]+)\}\}/g,'$1')));
const lyA=makeAnim({id:'ly',mode:'layer',modes:LY,dur:2400,
  draw(m,k,e,w){const cols=Math.max(10,Math.min(26,Math.floor((w-20)/18))),n=Math.ceil(NW/1000),sz=Math.min(14,(w-20)/cols-3),rows=Math.ceil(n/cols);
    const hit=Math.round(n*share),gh=rows*(sz+3);let s='';const top=36;
    s+=tx(0,16,m==='mono'?'Workspace images (each square = 1,000 images)':'Workspace layers (each square = 1,000 workspaces)',{fs:12,c:'var(--mute)'});
    for(let i=0;i<n;i++){const x=(i%cols)*(sz+3),y=top+Math.floor(i/cols)*(sz+3);let f='var(--soft)',st='var(--line)';
      if(m==='mono'&&i<hit&&k>=1){f='var(--hl)';st='var(--c5)'}
      if(m==='mono'&&i<hit&&k>=2){const frac=k>2?1:e;if(i<hit*frac){f='var(--c2)';st='var(--c2)'}}
      s+=rc(x,y,sz,sz,f,{s:st,r:2})}
    const yb=top+gh+18;
    if(m==='layer'){const bw=Math.min(240,w-20),x0=0;const lay=[['writable upper layer','var(--bg)'],['toolkit T1 '+(k>=1?'v2':'v1'),k>=1?'var(--c3)':'var(--soft)'],['workspace (read-only)','var(--soft)'],['base image (read-only)','var(--soft)']];
      lay.forEach(([t,c],i)=>{const y=yb+i*24,op=k>=2||i===1||k===0?1:.45;s+=G(op,rc(x0,y,bw,20,c,{s:'var(--line)',r:4})+tx(x0+bw/2,y+14,t,{fs:11,a:'middle'}))});
      s+=tx(0,yb+112,k>=2?'one sandbox\'s overlayfs stack, top to bottom':'',{fs:11,c:'var(--mute)'});
      return svgW(w,yb+120,s,'Layers')}
    return svgW(w,yb+4,s,'Images')},
  counters(m,k,e){const hit=Math.round(NW*share);
    if(m==='layer')return stat('Rebuilt',k>=1?'1 layer':'0')+stat('Workspaces touched','0 of '+fmt(NW))+stat('Scheme','O(k)');
    const done=k<2?0:k===2?Math.round(hit*e):hit;return stat('Images to rebuild',k>=1?fmt(hit):'0')+stat('Rebuilt so far',fmt(done))+stat('Scheme','O(k·N)')}});
const lySh=$('lySh');if(lySh)lySh.addEventListener('input',()=>{share=lySh.value/100;$('lyShv').textContent=lySh.value+'%';lyA&&lyA.draw()});

// Rollout through a preemption (§6.2, §6.3)
const PE={new:[
  {t:'A rollout starts',c:'The GPU job serves the policy model. On DSec, outside the preemptible pool, a worker container drives the scaffold (for example DeepSeek Harness) in an agent sandbox.'},
  {t:'Turns 1 to 3',c:'The model proposes actions, the sandbox runs them; files, packages and services accumulate as state.'},
  {t:'The GPU job is preempted',c:'Training stops, but the worker container and agent sandbox keep the complete rollout state: they are its single source of truth.'},
  {t:'Pause: memory goes back',c:'The RL framework pauses every sandbox of the preempted job. A container is frozen, given swap and reclaimed (memory.reclaim); a microVM is snapshotted and its process killed.'},
  {t:'The GPU job reconnects',c:'The restarted job reconnects to the worker container. Its next request resumes the sandbox transparently (prefetch with MADV_WILLNEED, then unpause; or restore the microVM snapshot).'},
  {t:'Turns 4 to 6, reward',c:'The rollout continues where it stopped. No command-log replay, no recovery logic in the RL framework.'}],
 old:[
  {t:'A rollout starts',c:'The agent loop runs inside the preemptible GPU training pod, together with model serving and the RL framework; the sandbox runs on DSec.'},
  {t:'Turns 1 to 3',c:'The loop sends commands to the sandbox and logs each command and its result.'},
  {t:'The GPU job is preempted',c:'The pod dies and the agent loop with it. The sandbox survives with its state, still holding its memory.'},
  {t:'The job restarts',c:'The training framework restores its own rollout state, which no longer matches the sandbox: they must be reconciled.'},
  {t:'Replay the command log',c:'Completed operations reuse their recorded results instead of running again, so non-idempotent commands (an install, a migration) do not take effect twice.'},
  {t:'Turns 4 to 6, reward',c:'Only now does the rollout continue. Recovery logic lives in the RL framework.'}]};
makeAnim({id:'pe',mode:'new',modes:PE,dur:2600,
  draw(m,k,e,w){const H=230,half=(w-14)/2,gx=0,dx=half+14;let s='';const pre=k>=2&&!(k>=4),dead=k===2||k===3;
    s+=rc(gx,6,half,H-12,'var(--soft)',{s:dead?'var(--bad)':'var(--line)',sw:dead?2:1,r:8,da:dead?'6 4':null})+tx(gx+half/2,24,'GPU pool (preemptible)',{fs:12,a:'middle',w:600});
    s+=rc(dx,6,half,H-12,'var(--soft)',{s:'var(--line)',r:8})+tx(dx+half/2,24,'DSec (CPU nodes)',{fs:12,a:'middle',w:600});
    const bx=(x,y,t,on,c)=>rc(x+10,y,half-20,30,on?(c||'var(--acc2)'):'var(--bg)',{s:on?'var(--acc)':'var(--line)',r:6,da:on?null:'4 3'})+tx(x+half/2,y+19,t,{fs:11,a:'middle',op:on?1:.5});
    s+=bx(gx,40,'trainer + model serving',!dead);
    if(m==='old'){const alive=!(k===2||k===3);s+=bx(gx,80,k>=4?'agent loop (restored)':'agent loop',alive,k===4?'var(--hl)':null);if(k===4)s+=tx(gx+half/2,130,'replaying the command log',{fs:11,a:'middle',c:'var(--c2)'})}
    else s+=bx(dx,40,'worker container',true);
    s+=bx(dx,m==='new'?80:40,'agent sandbox',true);
    // memory bar of the sandbox, illustrative units
    const full=[.25,.6,.6,m==='new'?.15:.6,m==='new'?.6:.6,.8][k],prevF=[.25,.25,.6,.6,m==='new'?.15:.6,.6][k],f=prevF+(full-prevF)*e;
    const bw=half-20,by=H-56;s+=tx(dx+10,by-6,w<520?'memory (illustrative)':'sandbox memory held (illustrative)',{fs:11,c:'var(--mute)'})+rc(dx+10,by,bw,14,'var(--bg)',{s:'var(--line)',r:3})+rc(dx+10,by,bw*f,14,m==='new'&&k===3?'var(--c3)':'var(--c1)',{r:3});
    const turns=[0,3,3,3,3,6][k];s+=tx(gx+10,H-24,'turns done: '+(k===5?Math.round(3+3*e):turns)+' of 6',{fs:11});
    return svgW(w,H,s,'Rollout through a preemption')},
  counters(m,k){const lost=m==='old'&&(k===2||k===3);
    return stat('Rollout state',lost?'split: loop lost':'intact',m==='new'?'worker + sandbox hold it':'sandbox + log')+stat('Commands replayed',m==='old'&&k>=4?'3 (from the log)':'0')+stat('Sandbox memory',m==='new'?(k===3?'reclaimed (paused)':k===2?'held, idle':'in use'):(k===2||k===3?'held, idle':'in use'),m==='old'&&(k===2||k===3)?'no pause described':'')+stat('Recovery logic in RL framework',m==='new'?'none':'yes')}});

// Predict reveals
PRED_REVEAL['pr-rate']=()=>{const S=RC.scale,L=RC.life;$('rateOut').innerHTML='<div class="kvs">'+
  '<div><div class="k">Average rate</div><div class="v">'+S.mean_rate.toFixed(1)+' / s</div><div class="k">3,000,000 ÷ 86,400 s</div></div>'+
  '<div><div class="k">Peak ÷ average</div><div class="v">'+Math.round(S.peak_over_mean)+'×</div><div class="k">5,000 ÷ '+S.mean_rate.toFixed(1)+'</div></div>'+
  '<div><div class="k">A 32K job at peak rate</div><div class="v">'+S.burst32k_s.toFixed(1)+' s</div><div class="k">32,768 ÷ 5,000</div></div>'+
  '<div><div class="k">Peak concurrency per node</div><div class="v">'+fmt(S.per_node)+'</div><div class="k">380K ÷ 160; '+S.per_core.toFixed(1)+' per core, '+S.gb_per_sandbox.toFixed(2)+' GB DRAM each</div></div>'+
  '<div><div class="k">Average concurrency (Little\'s law)</div><div class="v">≈ '+Math.round(S.little_avg_conc/1000)+'K</div><div class="k">'+S.mean_rate.toFixed(1)+'/s × mean lifetime '+L.Container.mean.toFixed(0)+' min</div></div></div>'+
  '<p class="small">The bursts are the point: creation capacity must cover rates about '+Math.round(S.peak_over_mean)+' times the daily average, because a training batch waits for its whole set of environments. The mean lifetime ('+L.Container.mean.toFixed(0)+' min) is twice the median (17.4) because of the long tail past three hours.</p>'};
PRED_REVEAL['pr-acc']=()=>{const el=$('accOut');fit(el,w=>{const rows=T.t3.rows,H=rows.length*42+10,pl=84,sc=(w-pl-8)/12.2;let s='';
  rows.forEach((r,i)=>{const y=6+i*42,read=r.acc/100*r.gb;s+=tx(pl-8,y+14,r.l,{fs:12,a:'end'})+rc(pl,y,r.gb*sc,18,'var(--soft)',{s:'var(--line)',r:3})+rc(pl,y,read*sc,18,'var(--c2)',{r:3})+
    tx(pl,y+33,read.toFixed(2)+' of '+r.gb.toFixed(1)+' GB read ('+r.acc.toFixed(1)+'%)',{fs:11,c:'var(--mute)'})});
  el.innerHTML=svgW(w,H,s,'Image data read at runtime')+'<p class="small">Orange is what the task reads. Across the five sampled images '+RC.t3.total_accessed.toFixed(2)+' GB of '+RC.t3.total_size.toFixed(1)+' GB is read ('+(100*RC.t3.weighted).toFixed(1)+'%). A full pull moves the grey too, and under a burst it does so for every sandbox at once.</p>'})};
function qosChart(el){const F=FIGS.fig13,S=F.series,c={'baseline':'var(--c1)','idle':'var(--c3)','idle + core':'var(--c2)'},nm={'baseline':'no QoS','idle':'SCHED_IDLE alone','idle + core':'SCHED_IDLE + core scheduling'};
  const ser=Object.keys(S).map(k=>({n:nm[k],c:c[k],pts:S[k].map(p=>[p.load,p.t]),marks:true,bars:S[k].filter(p=>p.bar).map(p=>[p.load,p.bar[0],p.bar[1]])}));
  fit(el,w=>{el.innerHTML=plotLeg(ser)+plotSvg(w,{H:Math.min(280,Math.max(220,w*.45)),xr:[5,55],yr:[.2,.35],xt:[[10,'10%'],[20,'20%'],[30,'30%'],[40,'40%'],[50,'50%']],yt:[[.2,'0.20'],[.25,'0.25'],[.3,'0.30'],[.35,'0.35']],
    xl:'best-effort background load (share of node capacity)',yl:'agent time per step (s)',series:ser,hl:[{y:F.no_load,t:'no background load '+F.no_load.toFixed(3)+' s'}],label:'Figure 13 rebuilt'})})}
window.qosChart=qosChart;
PRED_REVEAL['pr-qos']=()=>{const q=RC.fig13;$('qosOut').innerHTML='<div id="qosC"></div><p class="small">At 50% load the step takes '+(100*q.base50).toFixed(1)+'% longer without QoS and '+(100*q.core50).toFixed(1)+'% longer with both mechanisms. SCHED_IDLE alone gains '+Object.values(q.idle_gain).map(v=>(100*v).toFixed(1)+'%').join(', ')+' at 10 to 50% load: inside the error bars at every load. Priority does not help because the two threads share one physical core; core scheduling stops that sharing.</p>';qosChart($('qosC'))};

// Results table (Section 8) and Little's law figure in "How much to believe"
const rb=$('resBody');if(rb){rb.innerHTML=['f10time','f10writes','f10iops','f11time','f11writes','f12peak','f12fpr','f12comb','f12cpu','f13base','f13core','f13idle'].map(id=>{const c=CHK[id];
  return '<tr><td>'+c.claim+'</td><td>'+c.paper+'</td><td>'+c.ours+' <span class="v-'+c.verdict+'">('+c.verdict+')</span></td></tr>'}).join('')}
const lk=$('litK');if(lk)lk.textContent=Math.round(RC.scale.little_avg_conc/1000)+'K';
})();

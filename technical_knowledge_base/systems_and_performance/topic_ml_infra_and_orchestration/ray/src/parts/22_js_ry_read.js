// ---- Ray child page: Reading tab visuals (data from 15_js_ry_data.js, window.RY) ----
(function(){
const Y=window.RY, E=RD.esc, $=id=>document.getElementById(id);
const f1=x=>(+x).toFixed(1), f2=x=>(+x).toFixed(2), f3=x=>(+x).toFixed(3);
const NODE_COL={'ray-head':'var(--c4)','ray-w1':'var(--c1)','ray-w2':'var(--c2)'};
window.RYU={f1,f2,f3,NODE_COL};

// predict-then-reveal
document.querySelectorAll('.ry-pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');if(x===b&&x.dataset.r!=='1')x.classList.add('wrong')});
  pr.classList.add('done')}));

// cluster map
function drawMap(){
  const el=$('ry-map');const w=RD.width(el);const narrow=w<560;
  const nodes=[
    {id:'ray-head',t:'mi-ray-head',cpu:0,gpu:0,cap:2000,lines:['GCS (gcs_server)','dashboard + 10 modules','autoscaler monitor','the driver, Ray Train controller']},
    {id:'ray-w1',t:'mi-ray-w1',cpu:2,gpu:2,cap:1100,lines:['raylet + object store 80 MB','worker processes','Ray Train ranks 0, 1']},
    {id:'ray-w2',t:'mi-ray-w2',cpu:2,gpu:2,cap:1100,lines:['raylet + object store 80 MB','worker processes','Ray Train ranks 2, 3']}];
  const bw=narrow?w-8:(w-24)/3, bh=164, gap=12;
  const H=narrow?(bh+gap)*3:bh+34;
  let s='';
  nodes.forEach((n,i)=>{
    const x=narrow?4:i*(bw+gap), y=narrow?i*(bh+gap):0;
    const used=Y.mem_idle_mb[n.id.replace('ray-','')];
    s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+NODE_COL[n.id]+'" stroke-width="1.5"/>';
    s+=RD.t(x+10,y+19,n.t,{fs:13,w:600});
    s+=RD.t(x+10,y+37,n.cpu+' CPU, '+n.gpu+' fake_gpu',{fs:11.5,fill:'var(--mute)'});
    n.lines.forEach((l,k)=>{s+=RD.t(x+10,y+58+k*16,l,{fs:11.5})});
    const mw=bw-20, frac=used/n.cap;
    s+='<rect x="'+(x+10)+'" y="'+(y+bh-24)+'" width="'+mw+'" height="10" rx="3" fill="var(--bg)" stroke="var(--line)"/>';
    s+='<rect x="'+(x+10)+'" y="'+(y+bh-24)+'" width="'+(mw*frac).toFixed(1)+'" height="10" rx="3" fill="'+NODE_COL[n.id]+'"/>';
    s+=RD.t(x+10,y+bh-30,'idle '+used+' MB of '+n.cap+' MB cap',{fs:11,fill:'var(--mute)'});
  });
  if(!narrow){s+='<line x1="'+(bw/2)+'" y1="'+(bh+8)+'" x2="'+(w-bw/2)+'" y2="'+(bh+8)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    s+=RD.t(w/2,bh+26,'Docker bridge network mi-ray-net; shared volume /shared on all three',{fs:11,a:'middle',fill:'var(--mute)'});}
  el.innerHTML=RD.svg(w,H,s,'The three Ray containers: head with 0 CPUs, two workers with 2 CPUs and 2 fake GPUs each');
}

function stats(){
  const t=Y.tasks;
  $('ry-task-stats').innerHTML=RD.stat('One task, round trip',f2(t.rtt.median_ms)+' ms','median of '+t.rtt.n+'; p90 '+f2(t.rtt.p90_ms)+' ms')+
    RD.stat('1,000 tasks submitted together',f2(t.batch.secs)+' s',f3(t.batch.per_task_ms)+' ms per task')+
    RD.stat('Where they ran','w1 '+t.batch.hosts['ray-w1']+', w2 '+t.batch.hosts['ray-w2'],'the head has 0 CPUs');
  $('ry-actor-stats').innerHTML=RD.stat('Create an actor',f2(t.actor_create.secs)+' s','placed on '+t.actor_create.host)+
    RD.stat('One actor call, round trip',f2(t.actor_rtt.median_ms)+' ms','median of '+t.actor_rtt.n+'; p90 '+f2(t.actor_rtt.p90_ms)+' ms')+
    RD.stat('1,000 queued calls',f2(t.actor_batch.secs)+' s','values '+t.actor_batch.first+' to '+t.actor_batch.last+(t.actor_batch.ordered?', in order':', NOT in order'));
  const d=Y.data;
  $('ry-data-stats').innerHTML=['streaming','pipelined','staged'].map(m=>RD.stat({streaming:'Fused streaming',pipelined:'Two operators, streaming',staged:'Staged'}[m],
    'first batch '+f2(d[m].first)+' s','all '+d[m].batches+' batches '+f2(d[m].total)+' s')).join('');
  const R=Y.train.runs;
  const from=R.map(r=>{const s=r.ranks[0].filter(e=>e.ev==='start');return s[s.length-1].step});
  const crash=R.map(r=>r.ranks[3].find(e=>e.ev==='crash').t);
  const st2=R.map(r=>Math.min(...r.ranks.flatMap(x=>x.filter(e=>e.ev==='start'&&e.step>0).map(e=>e.t))));
  $('ry-train-stats').innerHTML=RD.stat('Restarted from step',from.join(', '),'in runs 1, 2, 3 (crash at step 120)')+
    RD.stat('Crash to new workers started',R.map((r,i)=>f1(st2[i]-crash[i])).join(', ')+' s','processes, process group, checkpoint load')+
    RD.stat('fit() total',R.map(r=>f1(r.result.secs)).join(', ')+' s','final global loss '+R[0].result.metrics.gloss);
}

// eight naps: before/after on the same input
let napMode='together',napAnim=null;
function napData(){const n=Y.tasks.naps[napMode];const lanes=[...new Set(n.tasks.map(t=>t.host+' pid '+t.pid))].sort();return {n,lanes,T:Math.max(4.2,...n.tasks.map(t=>t.e))}}
function drawNap(i){
  const el=$('ry-nap');const w=RD.width(el);const {n,lanes,T}=napData();const now=i/10;
  const L=Math.min(130,w*0.3),R=10,top=18,lh=26,H=top+lanes.length*lh+26;const sx=t=>L+(w-L-R)*t/T;
  let s='';
  for(let k=0;k<=Math.floor(T);k++){s+='<line x1="'+sx(k)+'" y1="'+top+'" x2="'+sx(k)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(sx(k),H-8,k+' s',{fs:10.5,a:'middle',fill:'var(--mute)'})}
  lanes.forEach((ln,k)=>{const y=top+k*lh;const host=ln.split(' ')[0];s+=RD.t(L-6,y+16,ln,{fs:11,a:'end',fill:NODE_COL[host]})});
  n.tasks.forEach(t=>{if(t.s>now)return;const k=lanes.indexOf(t.host+' pid '+t.pid);const y=top+k*lh+3;const e=Math.min(t.e,now);
    s+='<rect x="'+sx(t.s)+'" y="'+y+'" width="'+Math.max(1,sx(e)-sx(t.s))+'" height="'+(lh-8)+'" rx="3" fill="'+NODE_COL[t.host]+'" opacity="'+(e<t.e?0.55:0.9)+'"/>';
    if(sx(e)-sx(t.s)>16)s+=RD.t(sx(t.s)+4,y+13,'#'+t.i,{fs:10.5,fill:'var(--bg)'})});
  s+='<line x1="'+sx(Math.min(now,T))+'" y1="'+(top-6)+'" x2="'+sx(Math.min(now,T))+'" y2="'+(H-22)+'" stroke="var(--ink)" stroke-width="1.2"/>';
  el.innerHTML=RD.svg(w,H,s,'Eight half-second tasks on four worker processes');
  const done=n.tasks.filter(t=>t.e<=now).length;
  $('ry-nap-cap').innerHTML='<b>t = '+f1(Math.min(now,T))+' s</b>: '+done+' of 8 tasks finished. '+(napMode==='together'?
    'All eight were submitted at once; four run immediately (4 CPUs), the next four start as soon as a slot frees. Total measured: <b>'+f2(n.secs)+' s</b>.':
    'Each ray.get waits for its task before the next is submitted, so only one task ever runs while three CPUs idle. Total measured: <b>'+f2(n.secs)+' s</b>.');
}
function napSteps(){return Math.ceil(napData().T*10)+1}

// objects stepper
const OBJ_STEPS=[
  {k:'made',t:'1. Two tasks on w1 return a 1 KB and a 1 MB array'},
  {k:'get',t:'2. The driver (on the head) calls ray.get on the 1 MB one'},
  {k:'put',t:'3. The driver calls ray.put on a 4 MB array'},
  {k:'r0',t:'4. A task on w2 reads a 16 MB object made on w1'},
  {k:'r1',t:'5. A second task on w2 reads it again'},
  {k:'r2',t:'6. A task on w1 reads it'}];
let objStep=0;
function drawObj(){
  const el=$('ry-obj');const w=RD.width(el);const o=Y.objects;const st=OBJ_STEPS[objStep].k;
  const names=['ray-head','ray-w1','ray-w2'];const bw=(w-16)/3,H=150;
  const chips={'ray-head':[],'ray-w1':[],'ray-w2':[]};let inline=null;
  const loc=(arr,label,col)=>arr[0].nodes.forEach(n=>chips[n].push({l:label,c:col}));
  if(st==='made'){loc(o.before.big,'1 MB result','var(--c1)');inline='1 KB result: no store location (inline, '+o.before.small[0].size+' bytes serialised, held by the driver)'}
  if(st==='get'){loc(o.after.big,'1 MB result','var(--c1)')}
  if(st==='put'){loc(o.after.big,'1 MB result','var(--c1)');loc(o.put.where,'4 MB ray.put','var(--c4)')}
  if(st[0]==='r'){const i=+st[1];if(i===0)chips['ray-w1'].push({l:'16 MB object',c:'var(--c2)'});else loc(o.read16[i-1].where_after,'16 MB object','var(--c2)');}
  let s='';names.forEach((n,i)=>{const x=i*(bw+8);s+='<rect x="'+x+'" y="0" width="'+bw+'" height="'+H+'" rx="8" fill="var(--soft)" stroke="'+NODE_COL[n]+'"/>'+RD.t(x+8,18,n,{fs:12.5,w:600})+RD.t(x+8,34,'object store',{fs:10.5,fill:'var(--mute)'});
    chips[n].filter(c=>c.l).forEach((c,k)=>{s+='<rect x="'+(x+8)+'" y="'+(44+k*28)+'" width="'+(bw-16)+'" height="22" rx="4" fill="'+c.c+'" opacity=".85"/>'+RD.t(x+14,59+k*28,c.l,{fs:11,fill:'var(--bg)'})})});
  if(st[0]==='r'){const i=+st[1];const r=o.read16[i];const to=names.indexOf(r.on);const from=names.indexOf('ray-w1');
    if(to!==from&&i===0){const x1=from*(bw+8)+bw/2,x2=to*(bw+8)+bw/2;s+='<path d="M'+x1+' '+(H-14)+' L'+x2+' '+(H-14)+'" stroke="var(--c2)" stroke-width="2" marker-end="url(#ryArr)"/>';}
    s='<defs><marker id="ryArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--c2)"/></marker></defs>'+s}
  el.innerHTML=RD.svg(w,H,s,'Object copies per node at this step');
  let cap='';
  if(st==='made')cap='The 1 MB array is in w1\'s store, where its task ran. '+inline+'. Both were made with NodeAffinitySchedulingStrategy pinned to w1.';
  if(st==='get')cap='After <code>ray.get</code> the 1 MB object has two copies, on w1 and on the head (the driver\'s node). The array the driver got is read-only (writeable '+o.get_big.writeable+', owndata '+o.get_big.owndata+'): a view of shared memory. Writing to it raised <code>'+E(o.readonly.type)+': '+E(o.readonly.msg)+'</code>.';
  if(st==='put')cap='<code>ray.put</code> stores the value in the store of the caller\'s node: the head. The driver owns it.';
  if(st[0]==='r'){const r=o.read16[+st[1]];cap='The task ran on '+r.on+' and took <b>'+f3(r.secs)+' s</b> end to end. '+(+st[1]===0?'w2 had no copy, so its raylet pulled one from w1 (in 5 MB chunks).':'A local copy already existed: no transfer.')+' Copies afterwards: '+r.where_after[0].nodes.join(' and ')+'.'}
  $('ry-obj-cap').innerHTML='<b>'+OBJ_STEPS[objStep].t+'.</b> '+cap;
}

// spilling
function drawSpill(){
  const el=$('ry-spill');const w=RD.width(el);const sp=Y.spill;const n=sp.reads.length;
  const L=34,B=22,H=178,top=12;const mx=Math.max(...sp.reads.map(r=>r.secs))*1000;
  const ylog=v=>{const a=Math.log10(1),b=Math.log10(Math.max(300,mx));return top+(H-top-B)*(1-(Math.log10(Math.max(1,v))-a)/(b-a))};
  const bw=(w-L-6)/n;let s='';
  [1,3,10,30,100,300].forEach(v=>{const y=ylog(v);s+='<line x1="'+L+'" y1="'+y+'" x2="'+w+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+4,v+'',{fs:10,a:'end',fill:'var(--mute)'})});
  sp.reads.forEach((r,i)=>{const ms=r.secs*1000;const spilled=i<sp.spilled_n;const x=L+i*bw+2;const y=ylog(ms);
    s+='<rect x="'+x+'" y="'+y+'" width="'+(bw-4)+'" height="'+(H-B-y)+'" fill="'+(spilled?'var(--c2)':'var(--c1)')+'" rx="2"/>';
    s+=RD.t(x+(bw-4)/2,H-B+14,''+r.i,{fs:10,a:'middle',fill:'var(--mute)'})});
  el.innerHTML=RD.svg(w,H,s,'Read time per object, spilled ones slower');
  const rs=sp.reads,a=rs.slice(1,sp.spilled_n).map(r=>r.secs*1000),b=rs.slice(sp.spilled_n).map(r=>r.secs*1000);
  const med=x=>{x=[...x].sort((p,q)=>p-q);return x[Math.floor(x.length/2)]};
  $('ry-spill-cap').innerHTML='Bars: time to read each object back on w1, in ms (log scale); x axis: object number, in the order made. <span class="ry-meas">measured</span> '+sp.n+' x '+sp.obj_mb+' MB = '+sp.n*sp.obj_mb+' MB into a '+sp.store_mb+' MB store. Ray spilled <b>'+sp.spilled_n+' objects ('+sp.spilled_mib+' MiB)</b> at '+sp.write_mibs+' MiB/s and later restored '+sp.restored_n+' ('+sp.restored_mib+' MiB) at '+sp.read_mibs+' MiB/s (<code>ray memory --stats-only</code>). <span style="color:var(--c2)">Orange</span>: the '+sp.spilled_n+' oldest objects, read back from disk (median '+f1(med(a))+' ms, the first one '+f1(rs[0].secs*1000)+' ms while a restore IO worker started); <span style="color:var(--c1)">blue</span>: still in memory (median '+f1(med(b))+' ms). Which objects were spilled is inferred from the read times (the '+sp.spilled_n+' slow reads are the oldest objects); the counts are Ray\'s own.';
}

// head processes
function drawProc(){
  const el=$('ry-proc');const P=Y.procs.head;const top=P.slice(0,10).concat(P.filter((p,j)=>j>=10&&/gcs|^raylet$/.test(p.what)));const mx=Math.max(...top.map(p=>p.rss));
  el.innerHTML=top.map(p=>'<div class="row'+(/gcs|raylet/.test(p.what)?' hl':'')+'"><span class="nm" title="'+E(p.what)+'">'+E(p.what)+'</span><span class="track"><span class="fill" style="width:'+(100*p.rss/mx).toFixed(1)+'%;background:'+(/dashboard/.test(p.what)?'var(--c4)':/gcs|raylet/.test(p.what)?'var(--good)':'var(--c6)')+'"></span></span><span class="val">'+p.rss+' MB</span></div>').join('');
  const sum=P.reduce((a,p)=>a+p.rss,0),dash=P.filter(p=>/dashboard/.test(p.what)).reduce((a,p)=>a+p.rss,0);
  const g=P.find(p=>/gcs/.test(p.what)),r=P.find(p=>p.what==='raylet');
  $('ry-proc-cap').innerHTML='<span class="ry-meas">measured</span> The idle head before any job: '+P.length+' processes: the top 10 by resident memory, plus the GCS and the raylet. The GCS itself is '+g.rss+' MB and the raylet '+r.rss+' MB; the dashboard and its module processes are '+dash+' MB of the '+sum+' MB summed (RSS counts shared library pages in every process, so the sum overstates: <code>docker stats</code> said '+Y.mem_idle_mb.head+' MB for the whole container). On a production head the dashboard is worth keeping, but it is the first thing to budget for.';
}

function placeCap(){
  const p=Y.tasks.placement,q=Y.tasks.placement_first_pass;
  $('ry-place-cap').innerHTML='<span class="ry-meas">measured</span> Four one-CPU tasks of 1 s from the driver (whose node has 0 CPUs): DEFAULT placed them on '+p.DEFAULT.join(', ')+' in the recorded run and on '+q.DEFAULT.join(', ')+' in the first pass, the random choice among equally good nodes; SPREAD gave '+p.SPREAD.join(', ')+' (2 per node both times).';
}

// fault table
function ftTable(){
  const F=Y.fault,L=Y.lineage;const row=(a,b,c)=>'<tr><td>'+a+'</td><td>'+b+'</td><td>'+c+'</td></tr>';
  const t=k=>F.tasks.find(x=>x.case===k),a=k=>F.actors.find(x=>x.case===k),g=k=>L.gets.find(x=>x.obj===k);
  const ok=r=>'<b>succeeded</b> after '+r.result.attempts+' attempts ('+f2(r.secs)+' s)';
  const er=(ty,s)=>'<b><code>'+E(ty)+'</code></b>'+(s!=null?' after '+f2(s)+' s':'');
  const nd=L.events.find(e=>e.what==='node marked dead');
  let h=row('A task\'s worker process dies (<code>os._exit(1)</code>)','retried, <code>max_retries</code> = 3',ok(t('crash_default')))+
    row('Same, <code>max_retries=0</code>','fails',er(t('crash_max_retries_0').type,t('crash_max_retries_0').secs)+': "'+E(t('crash_max_retries_0').msg.split('.')[0])+'."')+
    row('A task raises <code>ValueError</code>','not retried (<code>retry_exceptions=False</code>)',er(t('raise_default').type)+', 1 attempt')+
    row('Same, <code>retry_exceptions=True</code>','retried like a crash',ok(t('raise_retry_exceptions')))+
    row('An actor\'s process dies, <code>max_restarts=1</code>','restarted, <code>__init__</code> runs again','in-flight call: '+er(a('actor_restart_1').die_call.type)+'; counter was '+a('actor_restart_1').before.join(', ')+', next call returned <b>'+a('actor_restart_1').after+'</b> (moved '+a('actor_restart_1').host_pid_before[0]+' to '+a('actor_restart_1').host_pid_after[0]+')')+
    row('Same, default <code>max_restarts=0</code>','dead for good',er(a('actor_restart_0').after_error.type)+' on every later call')+
    row('A worker <b>node</b> is killed (<code>docker kill</code>)','GCS: 5 failed health checks','node declared dead after <b>'+f1(nd.t)+' s</b>; first failed check at '+f1(L.events[0].t)+' s')+
    row('... its 8 MB task output (A)','rebuilt from lineage by the owner',g('A_task_output').ok?'<b>rebuilt</b>: the task re-ran on w1, <code>ray.get</code> returned after '+f1(g('A_task_output').secs)+' s':'failed')+
    row('... the same with <code>max_retries=0</code> (B)','not rebuildable',er(g('B_task_output_no_retries').type))+
    row('... an array a task on that node <code>ray.put</code> (C)','owner died with the node',er(g('C_put_inside_task').type))+
    row('... its 1 KB task output (D)','inline: was never on that node','<b>returned at once</b>');
  $('ry-ft-table').querySelector('tbody').innerHTML=h;
}

function all(){drawMap();stats();drawNap(napAnim?napAnim.i:0);drawObj();drawSpill();drawProc();placeCap();ftTable()}
napAnim=RD.anim({card:'ry-nap-card',ctl:'ry-nap-ctl',n:napSteps(),draw:drawNap,ms:110,label:'Time'});
RD.seg($('ry-nap-mode'),m=>{napMode=m;napAnim.reset(napSteps())});
$('ry-obj-step').innerHTML=OBJ_STEPS.map((s,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+(i+1)+'</button>').join('');
RD.seg($('ry-obj-step'),m=>{objStep=+m;drawObj()});
RD.onRender(all);RD.onResize(all);all();
})();

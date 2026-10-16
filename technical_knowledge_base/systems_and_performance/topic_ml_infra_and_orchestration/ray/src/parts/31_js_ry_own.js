// ---- Ray child page: Ownership lab (t-own) ----
(function(){
const Y=window.RY,E=RD.esc,$=id=>document.getElementById(id),U=window.RYU,f1=U.f1,f2=U.f2;
const reg=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-own']=window.TAB_RENDER['t-own']||[]).push(f)};
const vis=()=>{const t=$('t-own');return t&&!t.hidden};

// 1. life of a task (from the design; message order only)
let lifeMode='big';
const LIFE={
 big:[
  {m:null,own:{rc:1,loc:'(pending)',lin:'f(x_ref) on 1 CPU'},t:'The driver calls <code>y = f.remote(x_ref)</code>. Nothing runs yet: the driver creates the ObjectRef <code>y</code>, becomes its <b>owner</b>, and records the task description as its lineage. Reference count 1 (the driver holds <code>y</code>).'},
  {m:['drv','rh'],l:'lease 1 CPU?',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'The owner asks its <b>local raylet</b> (the head\'s) for a worker lease that fits 1 CPU.'},
  {m:['rh','drv'],l:'spillback: try w1',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'The head offers 0 CPUs, so its raylet answers with <b>spillback</b>: ask the raylet on w1, which has free CPUs (it knows other nodes\' free resources from the cluster view the GCS keeps in sync).'},
  {m:['drv','r1'],l:'lease 1 CPU?',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'The owner asks w1\'s raylet, which grants a lease on one of its pooled worker processes (or starts one).'},
  {m:['drv','wk'],l:'push task f(x_ref)',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'The owner sends the task <b>directly to the leased worker</b>. The GCS is not on this path.'},
  {m:['s0','s1'],l:'pull x',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'The worker needs the argument <code>x</code>; if no copy is on w1, w1\'s object manager pulls one from the node that has it into w1\'s store.'},
  {m:['wk','s1'],l:'store 8 MB result',own:{rc:1,loc:'w1',lin:'f(x_ref)'},t:'<code>f</code> runs. Its result is 8 MB, over the 100 KB inline limit, so it is written to <b>w1\'s object store</b>; the worker tells the owner "y is at w1". The lease can be reused for the next task of the same shape.'},
  {m:['s1','s0'],l:'copy for ray.get',own:{rc:1,loc:'w1, head',lin:'f(x_ref)'},t:'<code>ray.get(y)</code>: the owner knows the location, the head\'s store pulls a copy, and the driver reads it zero-copy (read-only). Measured: a 1 MB result had copies on w1 and the head after the get.'},
  {m:null,own:{rc:0,loc:'freed',lin:'dropped'},t:'The driver deletes <code>y</code>: the count reaches 0, the owner tells both stores to free their copies and forgets the lineage.'}],
 small:[
  {m:null,own:{rc:1,loc:'(pending)',lin:'f(x_ref) on 1 CPU'},t:'Same call; this time <code>f</code> returns 1 KB.'},
  {m:['drv','rh'],l:'lease 1 CPU?',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'Lease request to the local raylet.'},
  {m:['rh','drv'],l:'spillback: try w1',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'Spillback to w1.'},
  {m:['drv','r1'],l:'lease 1 CPU?',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'Lease granted on w1.'},
  {m:['drv','wk'],l:'push task f(x_ref)',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'Task pushed to the worker.'},
  {m:['s0','s1'],l:'pull x',own:{rc:1,loc:'(pending)',lin:'f(x_ref)'},t:'Argument fetched into w1\'s store if needed.'},
  {m:['wk','drv'],l:'reply carries the 1 KB value',own:{rc:1,loc:'in the owner (inline)',lin:'f(x_ref)'},t:'Under 100 KB, the value travels <b>inside the reply</b> and is kept in the owner\'s own memory. No store holds it (measured: a 1 KB result had no store location).'},
  {m:null,own:{rc:1,loc:'in the owner (inline)',lin:'f(x_ref)'},t:'<code>ray.get(y)</code> returns at once: nothing to fetch. If w1 now died, <code>y</code> would be unaffected (measured: object D in the node loss below).'},
  {m:null,own:{rc:0,loc:'freed',lin:'dropped'},t:'Deleting <code>y</code> frees it in the owner.'}]};
const BOX={drv:{n:0,y:0,l:'driver (owner)'},rh:{n:0,y:1,l:'raylet'},s0:{n:0,y:2,l:'object store'},wk:{n:1,y:0,l:'leased worker'},r1:{n:1,y:1,l:'raylet'},s1:{n:1,y:2,l:'object store'}};
function drawLife(i){
  const el=$('ry-life');if(!el)return;const w=RD.width(el);const st=LIFE[lifeMode][i];
  const cw=(w-20)/2,bh=34,gy=50,top=24,H=top+3*gy+96;
  const pos=k=>{const b=BOX[k];return {x:b.n*(cw+20)+16,y:top+b.y*gy,w:cw-32,h:bh}};
  let s='<defs><marker id="ryArr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--acc)"/></marker></defs>';
  ['ray-head','ray-w1'].forEach((n,k)=>{const x=k*(cw+20);s+='<rect x="'+x+'" y="2" width="'+cw+'" height="'+(top+3*gy-10)+'" rx="8" fill="var(--soft)" stroke="'+U.NODE_COL[n]+'"/>'+RD.t(x+8,16,n,{fs:12,w:600})});
  Object.keys(BOX).forEach(k=>{const p=pos(k);const act=st.m&&st.m.includes(k);s+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="5" fill="var(--bg)" stroke="'+(act?'var(--acc)':'var(--line)')+'" stroke-width="'+(act?2:1)+'"/>'+RD.t(p.x+p.w/2,p.y+21,BOX[k].l,{fs:11.5,a:'middle'})});
  if(st.m){const a=pos(st.m[0]),b=pos(st.m[1]);let x1=a.x+a.w/2,y1=a.y+a.h/2,x2=b.x+b.w/2,y2=b.y+b.h/2;
    if(BOX[st.m[0]].n!==BOX[st.m[1]].n){x1=BOX[st.m[0]].n?a.x:a.x+a.w;x2=BOX[st.m[1]].n?b.x:b.x+b.w}else{y1=a.y+(y2>y1?a.h:0);y2=b.y+(y2>a.y?0:b.h)}
    s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--acc)" stroke-width="2" marker-end="url(#ryArr2)"/>';
    s+=RD.t((x1+x2)/2,(y1+y2)/2-5,E(st.l),{fs:11,a:'middle',fill:'var(--acc)',w:600});}
  const oy=top+3*gy+4;s+='<rect x="0" y="'+oy+'" width="'+w+'" height="84" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(10,oy+18,'The owner\'s table for y (in the driver\'s process)',{fs:11.5,w:600});
  s+=RD.t(10,oy+38,'references: '+st.own.rc,{fs:11.5})+RD.t(10,oy+56,'location: '+E(st.own.loc),{fs:11.5})+RD.t(10,oy+74,'lineage: '+E(st.own.lin),{fs:11.5});
  el.innerHTML=RD.svg(w,H,s,'Messages in the life of one Ray task');
  $('ry-life-cap').innerHTML='<b>Step '+(i+1)+' of '+LIFE[lifeMode].length+'.</b> '+st.t;
}
const life=RD.anim({card:'ry-life-card',ctl:'ry-life-ctl',n:LIFE.big.length,draw:drawLife,ms:2200,label:'Step'});
RD.seg($('ry-life-mode'),m=>{lifeMode=m;life.reset(LIFE[m].length);life.play()});

// 2. node loss replay
const L=Y.lineage;const G=k=>L.gets.find(g=>g.obj===k);
const dead=L.events.find(e=>e.what==='node marked dead').t, rec=L.events.find(e=>/lineage/.test(e.what)).t;
const ITEMS=[
 {k:'D',obj:'D_small_inline',lab:'D: 1 KB task output',owner:'driver',why:'Under 100 KB it came back inside the reply and lives in the driver\'s memory; it was never on w2.'},
 {k:'A',obj:'A_task_output',lab:'A: 8 MB task output',owner:'driver',why:'The owner (driver) is alive and holds the lineage; the task is retryable (max_retries 3), so the owner re-ran it on w1 once w2 was declared dead.'},
 {k:'B',obj:'B_task_output_no_retries',lab:'B: 8 MB, max_retries=0',owner:'driver',why:'The owner is alive but may not re-run the task: retries are disabled.'},
 {k:'C',obj:'C_put_inside_task',lab:'C: ray.put inside a task on w2',owner:'a worker on w2',why:'Its owner was the worker on w2 that called ray.put; owner gone means object gone, and ray.put objects have no lineage anyway.'},
 {k:'a1',obj:'actor_max_restarts_1',lab:'actor, max_restarts=1',owner:'the driver (the GCS restarts actors)',why:'The GCS restarted it on w1 when w2 was declared dead; __init__ ran again, so its counter (5 before) restarted from 0.'},
 {k:'a0',obj:'actor_max_restarts_0',lab:'actor, max_restarts=0',owner:'the driver (the GCS restarts actors)',why:'No restarts allowed: the GCS marked it dead with the node.'}];
const STEPS=[{t:0,w:'docker kill mi-ray-w2 (four objects and two actors live there)'}];
L.events.forEach(e=>STEPS.push({t:e.t,w:e.who+': '+e.what}));
L.gets.forEach(g=>{const it=ITEMS.find(x=>x.obj===g.obj);STEPS.push({t:g.done_t,w:'driver: '+(it?it.lab:g.obj)+' -> '+(g.ok?'ok'+(g.value!=null&&!/actor/.test(g.obj)?' (value '+g.value+')':' (returned '+g.value+')'):g.type)})});
STEPS.sort((a,b)=>a.t-b.t);
let pick='all';
function stateAt(it,t){const g=G(it.obj);const asked=t>=g.done_t;
  if(it.k==='D')return {where:'driver',c:'var(--good)',s:asked?'returned at once':'safe in the driver'};
  if(t<dead)return {where:'ray-w2',c:t>0?'var(--c5)':'var(--c2)',s:t>0?'on a dead node (not yet known)':'on w2'};
  if(it.k==='A')return t<rec?{where:'ray-w2',c:'var(--bad)',s:'lost; owner re-running the task'}:{where:'ray-w1',c:'var(--good)',s:asked?'rebuilt, returned':'rebuilt on w1'};
  if(it.k==='a1')return {where:asked?'ray-w1':'ray-w2',c:asked?'var(--good)':'var(--c5)',s:asked?'restarted on w1 (state reset)':'restarting'};
  return {where:'ray-w2',c:'var(--bad)',s:asked?g.type:'lost'};}
function drawLoss(i){
  const el=$('ry-loss');if(!el)return;const w=RD.width(el);const t=STEPS[i].t;const T=Math.max(...STEPS.map(s=>s.t))+2;
  const nodes=['ray-head','ray-w1','ray-w2'];const narrow=w<520;const bw=(w-16)/3;const ih=24,top=10;
  const H=top+22+ITEMS.length*(ih+4)+16+40;let s='';
  nodes.forEach((n,k)=>{const x=k*(bw+8);const deadN=n==='ray-w2'&&t>=0;s+='<rect x="'+x+'" y="'+top+'" width="'+bw+'" height="'+(22+ITEMS.length*(ih+4)+8)+'" rx="8" fill="var(--soft)" stroke="'+U.NODE_COL[n]+'"'+(deadN?' stroke-dasharray="5 4" opacity=".8"':'')+'/>';
    s+=RD.t(x+8,top+16,n+(n==='ray-head'?' (driver)':'')+(n==='ray-w2'?(t>=dead?': DEAD':t>0?': killed':''):''),{fs:11.5,w:600,fill:n==='ray-w2'&&t>0?'var(--bad)':undefined})});
  ITEMS.forEach((it,j)=>{const st=stateAt(it,t);const k=nodes.indexOf(st.where==='driver'?'ray-head':st.where);const x=k*(bw+8)+6,y=top+24+j*(ih+4);
    const dim=pick!=='all'&&pick!==it.k;
    s+='<g opacity="'+(dim?0.25:1)+'"><rect x="'+x+'" y="'+y+'" width="'+(bw-12)+'" height="'+ih+'" rx="4" fill="'+st.c+'" opacity=".9"/>'+RD.t(x+5,y+16,E(narrow?it.k+': '+({ObjectReconstructionFailedError:'not rebuilt',OwnerDiedError:'owner died',ActorDiedError:'dead'}[st.s]||st.s.split(/[ ;,(]/)[0]):it.lab),{fs:10.5,fill:'var(--bg)'})+'</g>'});
  const ty=top+22+ITEMS.length*(ih+4)+30,L0=8,R0=w-8,sx=v=>L0+(R0-L0)*v/T;
  s+='<line x1="'+L0+'" y1="'+ty+'" x2="'+R0+'" y2="'+ty+'" stroke="var(--line)" stroke-width="2"/>';
  for(let v=0;v<=T;v+=10)s+='<line x1="'+sx(v)+'" y1="'+(ty-4)+'" x2="'+sx(v)+'" y2="'+(ty+4)+'" stroke="var(--mute)"/>'+RD.t(sx(v),ty+18,v+' s',{fs:10,a:'middle',fill:'var(--mute)'});
  STEPS.forEach((st,j)=>{if(j>i)return;s+='<circle cx="'+sx(st.t)+'" cy="'+ty+'" r="4" fill="'+(/GCS/.test(st.w)?'var(--c4)':/driver/.test(st.w)?'var(--c1)':'var(--c2)')+'"/>'});
  s+='<line x1="'+sx(t)+'" y1="'+(ty-12)+'" x2="'+sx(t)+'" y2="'+(ty+8)+'" stroke="var(--ink)" stroke-width="1.5"/>';
  el.innerHTML=RD.svg(w,H,s,'Objects and actors before and after a worker node is killed');
  let cap='<b>t = '+f2(t)+' s.</b> '+E(STEPS[i].w)+'.';
  if(pick!=='all'){const it=ITEMS.find(x=>x.k===pick),g=G(it.obj);cap+='<br><b>'+E(it.lab)+'</b> (owner: '+E(it.owner)+'): '+(g.ok?'ok after '+f2(g.secs)+' s of waiting':'<code>'+E(g.type)+'</code>')+'. '+E(it.why);}
  $('ry-loss-cap').innerHTML=cap;
}
$('ry-loss-pick').innerHTML='<button data-m="all" class="on">All</button>'+ITEMS.map(it=>'<button data-m="'+it.k+'">'+E(it.k==='a1'?'Actor, 1 restart':it.k==='a0'?'Actor, no restart':it.k)+'</button>').join('');
const loss=RD.anim({card:'ry-loss-card',ctl:'ry-loss-ctl',n:STEPS.length,draw:drawLoss,ms:1500,label:'Event'});
RD.seg($('ry-loss-pick'),m=>{pick=m;loss.redraw()});
function lossTable(){
  $('ry-loss-table').querySelector('tbody').innerHTML=ITEMS.map(it=>{const g=G(it.obj);
    return '<tr><td>'+E(it.lab)+'</td><td>'+E(it.owner)+'</td><td>'+(g.ok?'<b>ok</b>'+(/actor/.test(it.obj)?' (counter '+g.value+', on '+g.host_pid[0]+')':'')+(g.secs>1?' after '+f1(g.secs)+' s':''):'<code>'+E(g.type)+'</code>')+'</td><td>'+E(it.why)+(g.ok?'':'<div class="small mute">"'+E(g.msg.split(' | ').filter(x=>x&&!/^Failed to retrieve|RAY_record_ref/.test(x)).slice(0,1).join(' ').slice(0,260)||g.msg.slice(0,200))+'"</div>')+'</td></tr>'}).join('');}
function all(){if(!vis())return;drawLife(life.i);drawLoss(loss.i);lossTable()}
reg(all);addEventListener('resize',()=>{clearTimeout(all.t);all.t=setTimeout(all,80)});
lossTable();
})();

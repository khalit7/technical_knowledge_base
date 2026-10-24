// ---- Reading figures added in the 2026-10-24 rebuild: hero (launch chain on two nodes), the agent's loop, NCCL's bootstrap stepper ----
(function(){
if(!document.getElementById('ld-hero'))return;
const D=window.LD,$=id=>document.getElementById(id),T=RD.t,f1=x=>(Math.round(x*10)/10).toFixed(1);
const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||7)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
const path=(d,o)=>{o=o||{};return '<path d="'+d+'" fill="none" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
const defs=id=>'<defs><marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker><marker id="'+id+'b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--acc)"/></marker></defs>';
const badge=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--soft)" stroke="var(--mute)"/>'+T(x,y+4,n,{a:'middle',fs:11,w:700});

// 1. hero: the six links on two nodes of two GPUs
function hero(){
  const el=$('ld-hero'),w=Math.min(RD.width(el),860),wide=w>=620;
  let b=defs('ldh');
  b+=box(0,4,w,30,{fill:'var(--soft)'})+badge(16,19,'1')+T(30,23,wide?'Scheduler (Slurm, Kubernetes or Ray) allocates two nodes':'Scheduler allocates two nodes',{fs:12,w:600});
  b+=badge(16,50,'2')+T(30,54,wide?'Node launcher (srun, kubelet) starts one torchrun agent per node':'srun or kubelet starts one agent per node',{fs:11});
  const nodes=[],gap=20;
  if(wide){const nw=(w-gap)/2;nodes.push({x:0,y:66,w:nw,h:150},{x:nw+gap,y:66,w:nw,h:150})}
  else{nodes.push({x:0,y:66,w:w,h:150},{x:0,y:232,w:w,h:150})}
  const W=[];  // worker boxes
  let body='',bg='';
  nodes.forEach((n,k)=>{
    bg+=box(n.x,n.y,n.w,n.h,{fill:'var(--soft)'})+T(n.x+10,n.y+16,'node '+k,{fs:12,w:600});
    const aw=n.w/2-18;body+=box(n.x+10,n.y+24,aw,40)+T(n.x+18,n.y+41,'torchrun agent',{fs:12,w:600})+T(n.x+18,n.y+56,'node rank '+k,{fs:11,fill:'var(--mute)'});
    body+=line(n.x+10+aw/2,n.y+64,n.x+10+aw/2,n.y+86,{arrow:'ldh'});
    body+=badge(n.x+10+aw/2+16,n.y+76,'4')+T(n.x+10+aw/2+28,n.y+80,(n.w-aw/2-46)>235?'spawn: RANK, LOCAL_RANK, MASTER_ADDR':'spawn: RANK, LOCAL_RANK, ...',{fs:11});
    const ww=(n.w-30)/2;[0,1].forEach(j=>{const r=k*2+j,x=n.x+10+j*(ww+10),y=n.y+92;W[r]={x:x,y:y,w:ww,h:44,cx:x+ww/2,cy:y+22};
      body+=box(x,y,ww,44,{stroke:'var(--acc)',sw:1.5})+T(x+8,y+18,'rank '+r+' · local '+j,{fs:12,w:600})+T(x+8,y+34,'GPU '+j+', one process',{fs:11,fill:'var(--mute)'})});
    if(k===0){const sx=n.x+n.w/2+8,sw=n.w/2-18;n.store={x:sx,y:n.y+24,w:sw,h:40};
      body+=box(sx,n.y+24,sw,40,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(sx+8,n.y+41,'c10d store :29500',{fs:12,w:600})+T(sx+8,n.y+56,'hosted by agent 0',{fs:11,fill:'var(--mute)'});
      body+=badge(n.x+n.w-18,n.y+12,'3')}
  });
  const n0=nodes[0],n1=nodes[1],s=n0.store;
  // rendezvous arrows to the store
  body+=line(n0.x+n0.w/2-8,n0.y+44,s.x-1,n0.y+44,{arrow:'ldhb',c:'var(--acc)'});
  if(wide){body+=path('M'+(n1.x+10)+','+(n1.y+44)+' L'+(s.x+s.w+1)+','+(n1.y+44),{arrow:'ldhb',c:'var(--acc)'})}
  else{const ax=n1.x+n1.w/2-8;body+=path('M'+ax+','+(n1.y+44)+' L'+(w-4)+','+(n1.y+44)+' L'+(w-4)+','+(n0.y+44)+' L'+(s.x+s.w+1)+','+(n0.y+44),{arrow:'ldhb',c:'var(--acc)'})}
  body+=T(wide?n0.x+n0.w-30:n0.x+n0.w-30,n0.y+16,'rendezvous: join 600 s (static 900 s)',{a:'end',fs:11,fill:'var(--mute)'});
  // communicator, drawn as a ring 0 -> 1 -> 3 -> 2 -> 0 (wide: 0 -> 1 -> 2 -> 3 -> 0)
  const C='var(--acc)';let ring='';
  if(wide){ring+=line(W[0].x+W[0].w,W[0].cy,W[1].x,W[1].cy,{c:C,w:2.2})+line(W[1].x+W[1].w,W[1].cy,W[2].x,W[2].cy,{c:C,w:2.2})+line(W[2].x+W[2].w,W[2].cy,W[3].x,W[3].cy,{c:C,w:2.2});
    const yb=n0.y+n0.h+14;ring+=path('M'+W[3].cx+','+(W[3].y+W[3].h)+' L'+W[3].cx+','+yb+' L'+W[0].cx+','+yb+' L'+W[0].cx+','+(W[0].y+W[0].h),{c:C,w:2.2})}
  else{ring+=line(W[0].x+W[0].w,W[0].cy,W[1].x,W[1].cy,{c:C,w:2.2})+line(W[2].x+W[2].w,W[2].cy,W[3].x,W[3].cy,{c:C,w:2.2})+
    path('M'+W[1].cx+','+(W[1].y+W[1].h)+' L'+W[1].cx+','+(W[3].y),{c:C,w:2.2})+
    path('M'+W[2].x+','+W[2].cy+' L5,'+W[2].cy+' L5,'+W[0].cy+' L'+W[0].x+','+W[0].cy,{c:C,w:2.2})}
  const yl=(wide?n0.y+n0.h:n1.y+n1.h)+(wide?34:24);
  b+=bg+ring+body;
  b+=badge(16,yl-4,'5')+T(30,yl,'communicator from the store\'s addresses: pg timeout 30 min (gloo), 10 min (NCCL)',{fs:11,fill:'var(--acc)',w:600});
  b+=badge(16,yl+18,'6')+T(30,yl+22,'first step: DDP broadcasts the weights, then step 1',{fs:11});
  if(!wide){b=b.replace('communicator from the store\'s addresses: pg timeout 30 min (gloo), 10 min (NCCL)','communicator: pg timeout 30 min gloo, 10 min NCCL')}
  el.innerHTML=RD.svg(w,yl+32,b,'Two nodes with a torchrun agent each, a c10d store on node 0, four worker ranks joined by a communicator, the six launch links numbered');
}

// 2. the agent's loop, with the restart run's times
function loop(){
  const el=$('ld-loop');if(!el)return;const w=Math.min(RD.width(el),720);
  const R=D.rz.noshare,E=R.events,LG=R.logs,crash=LG.find(l=>l.ev==='crash');
  const fails=E.filter(e=>e.k==='a_failed').map(e=>e.t-crash.t).sort((a,b)=>a-b);
  const done=E.filter(e=>e.k==='a_done'&&e.t>crash.t).map(e=>e.t-crash.t)[0],res=LG.find(l=>l.ev==='resume');
  const gapx=Math.max(56,Math.min(110,w*0.14)),bw=Math.min(260,(w-gapx-8)/2),bh=58,x0=(w-2*bw-gapx)/2,x1=x0+bw+gapx,y0=18,rg=58,y1=y0+bh+rg;
  let b=defs('ldl');
  const B=(x,y,t,l1,l2,hl)=>box(x,y,bw,bh,{stroke:hl?'var(--acc)':'var(--line)',sw:hl?1.6:1,fill:'var(--soft)'})+T(x+9,y+18,t,{fs:12,w:600})+T(x+9,y+34,l1,{fs:11})+(l2?T(x+9,y+49,l2,{fs:11,fill:'var(--mute)'}):'');
  const nb=w<520;
  b+=B(x0,y0,'1 Rendezvous',nb?'with every agent:':'with every agent: node rank,',nb?'node rank, world size':'world size (section 4)',1);
  b+=B(x1,y0,'2 Start workers',nb?'one per GPU':'one process per GPU',nb?'RANK, LOCAL_RANK':'RANK, LOCAL_RANK, ...');
  b+=B(x1,y1,'3 Watch',nb?'every 0.1 s:':'every 0.1 s: HEALTHY,',nb?'HEALTHY or FAILED':'SUCCEEDED or FAILED');
  b+=B(x0,y1,'4 React',nb?'FAILED: stop all':'FAILED: stop every local',nb?'workers, restart':'worker, restart (counts)',1);
  const mid=(a,c)=>(a+c)/2;
  b+=line(x0+bw+2,y0+bh/2,x1-2,y0+bh/2,{arrow:'ldl'})+T(mid(x0+bw,x1),y0+bh/2-6,'+'+f1(done)+' s',{a:'middle',fs:11,fill:'var(--good)'});
  const nar=w<520,my=y0+bh+rg/2;
  b+=line(x1+bw/2,y0+bh+2,x1+bw/2,y1-2,{arrow:'ldl'})+(nar?T(x1+bw/2-6,my+12,'step '+res.step+', +'+f1(res.t-crash.t)+' s',{a:'end',fs:11,fill:'var(--good)'}):T(x1+bw/2+6,my+4,'resumed at step '+res.step+', +'+f1(res.t-crash.t)+' s',{fs:11,fill:'var(--good)'}));
  b+=line(x1-2,y1+bh/2,x0+bw+2,y1+bh/2,{arrow:'ldl'})+T(mid(x0+bw,x1),y1+bh/2+16,'+'+f1(fails[0])+' s',{a:'middle',fs:11,fill:'var(--good)'});
  b+=line(x0+bw/2,y1-2,x0+bw/2,y0+bh+2,{arrow:'ldlb',c:'var(--acc)',w:2})+T(x0+bw/2+6,nar?my-4:my+4,'back to 1, every node',{fs:11,fill:'var(--acc)',w:600});
  b+=T(4,y1+bh+18,'SUCCEEDED: wait at the exit barrier, up to 300 s.',{fs:11,fill:'var(--mute)'});
  b+=T(4,y1+bh+34,'New node waiting: also back to 1, for free.',{fs:11,fill:'var(--mute)'});
  b+=T(4,y1+bh+50,nar?'Green: seconds after rank 1 exited.':'Green: seconds after rank 1 exited with code 13 (both agents logged FAILED by +'+f1(fails[fails.length-1])+' s).',{fs:11,fill:'var(--good)'});
  el.innerHTML=RD.svg(w,y1+bh+58,b,'The torchrun agent loop: rendezvous, start workers, watch, react, with measured restart times');
}

// 3. NCCL bootstrap stepper on the 2 x 2 job; highlights the matching step of the static list
const NSTEP=[
 ['nothing built yet','init_process_group returns; the communicator waits for the first collective'],
 ['rank 0: unique id','64-bit magic + bootstrap root address'],
 ['the id travels through the c10d store','store key "0", read by every rank'],
 ['ring 0, 1, 2, 3, back to 0, over TCP','each rank to the root, then to its next neighbour'],
 ['AllGather1 over the ring','host hashes, GPU bus ids, who shares a machine'],
 ['topology: PCI, NVLink, NICs per node','search for rings, trees, CollNet, NVLS'],
 ['network plugin: IB / RoCE, else sockets','"NET/IB : No device found." means sockets, silently'],
 ['peers connect at the first collective','NCCL_RUNTIME_CONNECT=1: the data network is tried only now']];
function nccl(i){
  const el=$('ld-nc-svg');const w=Math.min(RD.width(el),760),nw=(w-16)/2,y0=40,nh=96,fy=y0+nh+16,dy=fy+26,A='var(--acc)';
  let b=defs('ldn');
  // store
  const sw=Math.min(200,w*0.4),sx=(w-sw)/2;b+=box(sx,4,sw,24,{fill:i===2?'var(--acc2)':'var(--soft)',stroke:i===2?A:'var(--line)',sw:i===2?1.6:1})+T(w/2,20,'c10d store',{a:'middle',fs:11,w:600});
  const R=[];
  [0,1].forEach(k=>{const x=k*(nw+16);const hl=i===5;b+=box(x,y0,nw,nh,{fill:'var(--soft)',stroke:hl?A:'var(--line)',sw:hl?1.6:1})+T(x+8,y0+15,'node '+k+(hl?': PCI, NVLink, NICs':''),{fs:11,w:600});
    const rw=(nw-24)/2;[0,1].forEach(j=>{const r=k*2+j,rx=x+8+j*(rw+8),ry=y0+28;R[r]={x:rx,y:ry,w:rw,h:40,cx:rx+rw/2};
      const on=(i===1&&r===0)||i===2||i===3||i===4||i===7;b+=box(rx,ry,rw,40,{stroke:on?A:'var(--line)',sw:on?1.6:1})+T(rx+6,ry+16,'rank '+r,{fs:11,w:600})+T(rx+6,ry+32,i===0?'no comm yet':i>=2&&i<=4?'has id':i===1&&r===0?'makes id':i>=5?'ready':'waits',{fs:11,fill:'var(--mute)'})});
    if(i===6)b+=T(x+8,y0+nh-8,'NIC: IB/RoCE? else sockets',{fs:11,fill:A});
    if(i===5)b+=T(x+8,y0+nh-8,'graph, then rings and trees',{fs:11,fill:A});});
  if(i===1)b+=T(R[0].x,y0+nh-8,'id = magic + root addr',{fs:11,fill:A});
  if(i===2)R.forEach(r=>{b+=line(w/2,28,r.cx,r.y-2,{c:A,arrow:'ldnb'})});
  // networks
  b+=box(0,fy,w,16,{rx:4,fill:(i===3||i===4)?'var(--acc2)':'var(--soft)',stroke:(i===3||i===4)?A:'var(--line)'})+T(6,fy+12,'front-end network (TCP): bootstrap',{fs:11});
  b+=box(0,dy,w,16,{rx:4,fill:i===7?'var(--acc2)':'var(--soft)',stroke:i===7?A:(i===6?A:'var(--line)'),dash:i===6?'4 3':''})+T(6,dy+12,'data network (InfiniBand or RoCE)',{fs:11});
  if(i===3||i===4)R.forEach((r,k)=>{b+=line(r.cx-6,r.y+r.h,r.cx-6,fy,{c:A,w:1.8})});
  if(i===3||i===4){const yy=R[0].y+R[0].h/2;b+=line(R[0].x+R[0].w,yy,R[1].x,yy,{c:A,arrow:'ldnb'})+line(R[1].x+R[1].w,yy,R[2].x,yy,{c:A,arrow:'ldnb'})+line(R[2].x+R[2].w,yy,R[3].x,yy,{c:A,arrow:'ldnb'})}
  if(i===7)R.forEach(r=>{b+=line(r.cx+6,r.y+r.h,r.cx+6,dy,{c:A,w:1.8})});
  b+=T(0,dy+34,'Step '+(i+1)+' of '+NSTEP.length+': '+NSTEP[i][0],{fs:12,w:600});
  el.innerHTML=RD.svg(w,dy+42,b,'NCCL communicator start-up, step '+(i+1)+': '+NSTEP[i][0]);
  const lis=[...document.querySelectorAll('#ld-nc-list>li')];lis.forEach((li,j)=>li.classList.toggle('cur',j===i));
}
hero();loop();
const an=RD.anim({card:'ld-nc-card',ctl:'ld-nc-ctl',n:NSTEP.length,draw:nccl,ms:2200,label:'NCCL start-up step'});
document.querySelectorAll('#ld-nc-list>li').forEach((li,j)=>{li.style.cursor='pointer';li.addEventListener('click',()=>an.go(j))});
RD.onRender(()=>{hero();loop()});RD.onResize(()=>{hero();loop();an.redraw()});
})();

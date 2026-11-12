// ---- Reading figure: the agent's loop (section 3). The 2D hero and the NCCL stepper of the 2026-10-24 rebuild became the 3D stages Fig. 1 and Fig. 2 (2026-11-12) ----
(function(){
if(!document.getElementById('ld-loop'))return;
const D=window.LD,$=id=>document.getElementById(id),T=RD.t,f1=x=>(Math.round(x*10)/10).toFixed(1);
const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||7)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
const path=(d,o)=>{o=o||{};return '<path d="'+d+'" fill="none" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
const defs=id=>'<defs><marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker><marker id="'+id+'b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--acc)"/></marker></defs>';
const badge=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--soft)" stroke="var(--mute)"/>'+T(x,y+4,n,{a:'middle',fs:11,w:700});

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

loop();
RD.onRender(loop);RD.onResize(loop);
})();

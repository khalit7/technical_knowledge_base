// ---- Ray child page: static annotated figures in Reading: the hero (one call through the cluster), placement groups, Ray Serve ----
(function(){
const $=id=>document.getElementById(id);if(!$('ry-hero'))return;
const U=window.RYU,NC=U.NODE_COL;
const T=(x,y,s,o)=>RD.t(x,y,s,o);
const arrowDefs='<defs><marker id="ryHa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--acc)"/></marker><marker id="ryHm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker></defs>';
const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||5)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};

// hero: one call y = f.remote(x)
function hero(){
  const el=$('ry-hero');const w=RD.width(el);const narrow=w<640;
  const NODES=[
    {id:'ray-head',t:'head (0 CPUs)',rows:[['GCS: node, actor, PG tables',0],['driver: owner of y',1],['raylet',0]]},
    {id:'ray-w1',t:'worker w1',rows:[['raylet: grants leases',0],['worker: runs task f(x)',0],['object store: y, 8 MB',2]]},
    {id:'ray-w2',t:'worker w2',rows:[['raylet',0],['actor: Counter, keeps n',0],['object store: copy of y',2]]}];
  const gap=narrow?14:40,band=28,rh=26,rg=narrow?10:14,head=24,nh=head+3*(rh+rg)+4;
  const tableH=w<760?58:46;
  const bw=narrow?w-46:(w-2*gap)/3;
  const top=band+10;
  const pos=[];NODES.forEach((n,i)=>pos.push(narrow?{x:0,y:top+i*(nh+gap)}:{x:i*(bw+gap),y:top}));
  const nodesBottom=narrow?top+3*(nh+gap)-gap:top+nh;
  const H=nodesBottom+10+tableH+10+band;
  let s=arrowDefs;
  // libraries band
  const libs=['Ray Train','Ray Data','Ray Serve','Ray Tune'];const lw=(w-3*6)/4;
  libs.forEach((l,i)=>{s+=rect(i*(lw+6),0,lw,band,{fill:'var(--soft)'})+T(i*(lw+6)+lw/2,18,l,{fs:11.5,a:'middle',w:600})});
  const row=(i,k)=>{const p=pos[i];return {x:p.x+8,y:p.y+head+k*(rh+rg),w:bw-16,h:rh}};
  NODES.forEach((n,i)=>{const p=pos[i];s+=rect(p.x,p.y,bw,nh,{fill:'var(--soft)',stroke:NC[n.id],sw:1.5,rx:8})+T(p.x+8,p.y+16,n.t,{fs:12,w:600});
    n.rows.forEach((r,k)=>{const q=row(i,k);const hl=r[1]===1;s+=rect(q.x,q.y,q.w,q.h,{stroke:hl?'var(--acc)':r[1]===2?NC[n.id]:'var(--line)',sw:hl?2:1})+T(q.x+6,q.y+17,r[0],{fs:11,fill:hl?'var(--acc)':undefined,w:hl?600:undefined})})});
  // arrows
  const lab=(x,y,t)=>'<circle cx="'+x+'" cy="'+y+'" r="8" fill="var(--acc)"/>'+T(x,y+4,t,{fs:10.5,a:'middle',fill:'var(--bg)',w:700});
  const ln=(x1,y1,x2,y2,col,mk,dash)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="'+col+'" stroke-width="1.6" fill="none" marker-end="url(#'+mk+')"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
  const cv=(x1,y1,x2,y2,dx,col,mk,dash)=>'<path d="M'+x1+' '+y1+' C'+(x1+dx)+' '+y1+' '+(x2+dx)+' '+y2+' '+x2+' '+y2+'" stroke="'+col+'" stroke-width="1.6" fill="none" marker-end="url(#'+mk+')"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
  const d=row(0,1),r1=row(1,0),wk=row(1,1),s1=row(1,2),s2=row(2,2);
  if(!narrow){
    s+=ln(d.x+d.w,d.y+8,r1.x,r1.y+13,'var(--acc)','ryHa');s+=lab((d.x+d.w+r1.x)/2,(d.y+8+r1.y+13)/2-2,'1');
    s+=ln(d.x+d.w,d.y+20,wk.x,wk.y+13,'var(--acc)','ryHa');s+=lab((d.x+d.w+wk.x)/2,(d.y+20+wk.y+13)/2+6,'2');
    s+=ln(wk.x+wk.w/2,wk.y+wk.h,s1.x+s1.w/2,s1.y,'var(--acc)','ryHa');s+=lab(wk.x+wk.w/2+16,(wk.y+wk.h+s1.y)/2,'3');
    s+=ln(s1.x+s1.w,s1.y+13,s2.x,s2.y+13,'var(--acc)','ryHa');s+=lab((s1.x+s1.w+s2.x)/2,s1.y+5,'4');
  }else{
    const rx=bw+2;
    s+=cv(d.x+d.w,d.y+9,r1.x+r1.w,r1.y+13,34,'var(--acc)','ryHa');s+=lab(rx+20,(d.y+r1.y)/2+11,'1');
    s+=cv(d.x+d.w,d.y+19,wk.x+wk.w,wk.y+13,44,'var(--acc)','ryHa');s+=lab(rx+28,(d.y+wk.y)/2+34,'2');
    s+=ln(wk.x+wk.w/2,wk.y+wk.h,s1.x+s1.w/2,s1.y,'var(--acc)','ryHa');s+=lab(wk.x+wk.w/2+14,(wk.y+wk.h+s1.y)/2,'3');
    s+=cv(s1.x+s1.w,s1.y+13,s2.x+s2.w,s2.y+13,34,'var(--acc)','ryHa');s+=lab(rx+20,(s1.y+s2.y)/2+13,'4');
  }
  // owner's table
  const ty=nodesBottom+10;
  s+=rect(0,ty,w,tableH,{fill:'var(--soft)',stroke:'var(--acc)',sw:1.5,rx:6})+T(8,ty+17,"Owner's table for y, in the driver's memory",{fs:11.5,w:600,fill:'var(--acc)'});
  if(w<760){s+=T(8,ty+33,'refs: 1 (driver)  copies: w1, w2',{fs:11})+T(8,ty+49,'lineage: task f(x), to re-run if lost',{fs:11})}
  else s+=T(8,ty+38,'references: 1 (the driver)',{fs:11})+T(Math.round(w*0.3),ty+38,'copies: w1, w2',{fs:11})+T(Math.round(w*0.5),ty+38,'lineage: task f(x), re-run if every copy is lost',{fs:11});
  // machines band
  const by=ty+tableH+10;
  s+=rect(0,by,w,band,{fill:'var(--bg)',dash:'4 3'})+T(w/2,by+18,w<470?'machines: Kubernetes pods or Slurm nodes':'machines underneath: Kubernetes pods (KubeRay) or a Slurm allocation',{fs:11,a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(w,H,s,'One Ray task through the cluster: lease, push, store, copy; the owner table in the driver');
}

// placement groups: measured placements from the root's Scheduling lab (ray_pg.jsonl)
const PG=[
  {s:'PACK',p:{'ray-w1':[2,3],'ray-w2':[0,1]},note:'created: 2 per node'},
  {s:'SPREAD',p:{'ray-w1':[1,3],'ray-w2':[0,2]},note:'created: alternating'},
  {s:'STRICT_PACK',p:null,note:'PENDING: no node has 4'},
  {s:'STRICT_SPREAD',p:null,note:'PENDING: only 2 nodes'}];
function pg(){
  const el=$('ry-pg');const w=RD.width(el);const narrow=w<560;
  const L=narrow?0:118,rh=narrow?78:46,H=PG.length*rh;let s='';
  PG.forEach((g,i)=>{const y=i*rh;const y0=narrow?y+20:y+6;
    s+=T(0,narrow?y+14:y+27,g.s,{fs:12,w:600});
    const avail=w-L;const nw=narrow?(avail-8)/2:Math.min(150,(avail-170)/2);
    ['ray-w1','ray-w2'].forEach((n,k)=>{const x=L+k*(nw+8);
      s+=rect(x,y0,nw,34,{fill:'var(--soft)',stroke:NC[n],rx:6})+T(x+5,y0+13,n,{fs:10.5,fill:'var(--mute)'});
      const sw=(nw-18)/2;[0,1].forEach(j=>{const b=g.p?g.p[n][j]:null;const sx=x+6+j*(sw+6);
        s+=rect(sx,y0+16,sw,15,{fill:b!=null?'var(--acc)':'var(--bg)',stroke:b!=null?'var(--acc)':'var(--line)',rx:3,dash:b!=null?null:'3 2'});
        if(b!=null)s+=T(sx+sw/2,y0+27.5,'bundle '+b,{fs:10.5,a:'middle',fill:'var(--bg)',w:600})})});
    const nx=narrow?0:L+2*(nw+8)+6;const ny=narrow?y0+50:y0+22;
    s+=T(nx,ny,g.note,{fs:11.5,fill:g.p?'var(--good)':'var(--bad)',w:600})});
  el.innerHTML=RD.svg(w,H,s,'Four bundles placed by four placement-group strategies on two worker nodes');
}

// Ray Serve
function serve(){
  const el=$('ry-serve');const w=RD.width(el);const narrow=w<600;let s=arrowDefs;
  if(!narrow){
    const H=190,cw=Math.min(110,w*0.14),px=cw+30,pw=Math.min(170,w*0.24),rx=px+pw+40,rw=w-rx-2;
    s+=rect(0,64,cw,34,{fill:'var(--soft)'})+T(cw/2,85,'client (HTTP)',{fs:11,a:'middle'});
    s+=rect(px,52,pw,58,{fill:'var(--soft)',stroke:NC['ray-head'],sw:1.5})+T(px+8,70,'HTTP proxy actor',{fs:11.5,w:600})+T(px+8,86,'head node, port 8000',{fs:11,fill:'var(--mute)'})+T(px+8,101,'routes via a handle',{fs:11,fill:'var(--mute)'});
    s+='<path d="M'+cw+' 81 L'+px+' 81" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#ryHa)"/>';
    [0,1,2].forEach(k=>{const y=8+k*44;s+=rect(rx,y,rw,36,{stroke:k<2?'var(--acc)':'var(--line)',sw:k<2?1.6:1,dash:k<2?null:'4 3'})+T(rx+8,y+15,k<2?'replica '+(k+1)+' (an actor)':'replica 3: added by the autoscaler',{fs:11,w:k<2?600:undefined})+T(rx+8,y+29,k<2?'up to 5 requests at once':'when load stays above 2 per replica',{fs:10.5,fill:'var(--mute)'});
      s+='<path d="M'+(px+pw)+' 81 L'+rx+' '+(y+18)+'" stroke="'+(k<2?'var(--acc)':'var(--mute)')+'" stroke-width="1.4" fill="none" marker-end="url(#'+(k<2?'ryHa':'ryHm')+')"'+(k<2?'':' stroke-dasharray="4 3"')+'/>'});
    s+=rect(px,148,pw,34,{fill:'var(--soft)'})+T(px+8,169,'controller actor',{fs:11.5,w:600});
    s+='<path d="M'+(px+pw)+' 165 L'+(rx+40)+' 165 L'+(rx+40)+' 136" stroke="var(--mute)" stroke-width="1.2" fill="none" stroke-dasharray="4 3" marker-end="url(#ryHm)"/>'+T(px+pw+6,160,'creates, replaces',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,H,s,'Ray Serve: proxy, replicas and controller');return;
  }
  const H=300;
  s+=rect(0,0,w,30,{fill:'var(--soft)'})+T(w/2,19,'client (HTTP)',{fs:11,a:'middle'});
  s+='<path d="M'+w/2+' 30 L'+w/2+' 46" stroke="var(--acc)" stroke-width="1.6" marker-end="url(#ryHa)"/>';
  s+=rect(0,48,w,44,{fill:'var(--soft)',stroke:NC['ray-head'],sw:1.5})+T(8,66,'HTTP proxy actor (head, port 8000)',{fs:11.5,w:600})+T(8,82,'routes via a deployment handle',{fs:11,fill:'var(--mute)'});
  [0,1,2].forEach(k=>{const y=108+k*46;s+=rect(18,y,w-18,38,{stroke:k<2?'var(--acc)':'var(--line)',sw:k<2?1.6:1,dash:k<2?null:'4 3'})+T(26,y+16,k<2?'replica '+(k+1)+' (an actor)':'replica 3: added by the autoscaler',{fs:11,w:k<2?600:undefined})+T(26,y+31,k<2?'up to 5 requests at once':'when load stays above 2 per replica',{fs:10.5,fill:'var(--mute)'});
    s+='<path d="M8 92 L8 '+(y+19)+' L16 '+(y+19)+'" stroke="var(--acc)" stroke-width="1.3" fill="none" marker-end="url(#ryHa)"/>'});
  s+=rect(0,254,w,34,{fill:'var(--soft)'})+T(8,275,'controller actor: creates and replaces replicas',{fs:11.5,w:600});
  el.innerHTML=RD.svg(w,H,s,'Ray Serve: proxy, replicas and controller');
}
function all(){hero();pg();serve()}
RD.onRender(all);RD.onResize(all);all();
})();

// ---- Ray child page: static annotated figures in Reading: placement groups, Ray Serve (the hero is the 3D Fig. 1, 41_js_sc_hero.js) ----
(function(){
const $=id=>document.getElementById(id);if(!$('ry-pg'))return;
const U=window.RYU,NC=U.NODE_COL;
const T=(x,y,s,o)=>RD.t(x,y,s,o);
const arrowDefs='<defs><marker id="ryHa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--acc)"/></marker><marker id="ryHm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker></defs>';
const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||5)+'" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};

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
function all(){pg();serve()}
RD.onRender(all);RD.onResize(all);all();
})();

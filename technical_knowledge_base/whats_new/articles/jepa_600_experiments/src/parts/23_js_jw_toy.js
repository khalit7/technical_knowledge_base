// ---- The memory-graph toy (section 2): eight illustrative demonstrations that all flow left to right and end at one point.
// Edges: each state to the next state of its own demonstration (directed, cost = distance) and a jump between states of two
// demonstrations closer than R (both ways, cost = distance + the jump cost). Shortest route by Dijkstra, computed here from
// the geometry in window.ARTICLE.recompute.toy (written by src/recompute.py, which runs the same search; check_page.mjs
// compares the two route by route). Nothing here is Push-T data.
(function(){
  const A=window.ARTICLE&&window.ARTICLE.recompute;if(!window.RD||!A||!document.getElementById('jw-toy-svg'))return;
  const T=A.toy,$=id=>document.getElementById(id),t=RD.t;
  const NODES=[];T.demos.forEach((d,i)=>d.forEach((p,k)=>NODES.push([i,k,p[0],p[1]])));
  const idx=(i,k)=>i*T.demos[0].length+k, D=(a,b)=>Math.hypot(NODES[a][2]-NODES[b][2],NODES[a][3]-NODES[b][3]);
  const steps=[],jumps=[];
  T.demos.forEach((d,i)=>{for(let k=0;k+1<d.length;k++)steps.push([idx(i,k),idx(i,k+1)])});
  for(let a=0;a<NODES.length;a++)for(let b=0;b<NODES.length;b++)if(NODES[a][0]!==NODES[b][0]&&D(a,b)<T.R)jumps.push([a,b]);
  function route(lam,key){
    const adj=NODES.map(()=>[]);steps.forEach(([a,b])=>adj[a].push([b,D(a,b),0]));jumps.forEach(([a,b])=>adj[a].push([b,D(a,b)+lam,1]));
    const s=idx(T.start[0],T.start[1]),g=idx(T.goals[key][0],T.goals[key][1]),best=NODES.map(()=>Infinity),prev=NODES.map(()=>null),done=NODES.map(()=>false);
    best[s]=0;
    for(;;){let u=-1;for(let v=0;v<NODES.length;v++)if(!done[v]&&best[v]<Infinity&&(u<0||best[v]<best[u]))u=v;
      if(u<0)break;done[u]=true;if(u===g)break;
      adj[u].forEach(([v,w,j])=>{const c=best[u]+w;if(c<best[v]-1e-12){best[v]=c;prev[v]=[u,j]}})}
    if(best[g]===Infinity)return null;
    const path=[g],kinds=[];let u=g,nj=0;while(prev[u]){kinds.unshift(prev[u][1]);nj+=prev[u][1];u=prev[u][0];path.unshift(u)}
    let len=0;for(let i=0;i+1<path.length;i++)len+=D(path[i],path[i+1]);
    return {jumps:nj,states:path.length,length:Math.round(len*1000)/1000,path,kinds};
  }
  window.JW_TOY={route};
  let lam=0,key='with';
  function draw(){
    const el=$('jw-toy-svg'),W=RD.width(el),H=Math.round(Math.min(380,W*0.62)),pad=16,X=x=>pad+x/10*(W-2*pad),Y=y=>pad+y/5.6*(H-2*pad);
    const r=route(lam,key);let s='';
    T.demos.forEach(d=>{s+='<polyline points="'+d.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="none" stroke="var(--line)" stroke-width="2.2"/>';
      d.forEach(p=>{s+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="2.3" fill="var(--mute)" opacity=".55"/>'})});
    const e=T.demos[0][T.demos[0].length-1];s+='<circle cx="'+X(e[0])+'" cy="'+Y(e[1])+'" r="4" fill="var(--mute)"/>'+t(X(e[0]),Y(e[1])-28,'all end here',{fs:12,a:'end',fill:'var(--mute)'});
    s+='<text x="'+X(0.2)+'" y="'+(H-4)+'" font-size="12" fill="var(--mute)">demonstrations run left to right →</text>';
    if(r){for(let i=0;i+1<r.path.length;i++){const a=NODES[r.path[i]],b=NODES[r.path[i+1]],j=r.kinds[i];
      s+='<line x1="'+X(a[2])+'" y1="'+Y(a[3])+'" x2="'+X(b[2])+'" y2="'+Y(b[3])+'" stroke="'+(j?'var(--bad)':'var(--good)')+'" stroke-width="'+(j?3.5:4)+'"'+(j?' stroke-dasharray="7 5"':'')+' stroke-linecap="round"/>'}}
    const S=NODES[idx(T.start[0],T.start[1])],G=NODES[idx(T.goals[key][0],T.goals[key][1])];
    s+='<circle cx="'+X(S[2])+'" cy="'+Y(S[3])+'" r="7" fill="var(--c1)"/>'+t(X(S[2]),Y(S[3])-11,'start',{fs:12,a:'middle',w:600,fill:'var(--ink)'});
    s+='<rect x="'+(X(G[2])-7)+'" y="'+(Y(G[3])-7)+'" width="14" height="14" rx="2" fill="var(--card)" stroke="var(--ink)" stroke-width="2.5"/>'+t(X(G[2]),Y(G[3])+22,'goal',{fs:12,a:'middle',w:600,fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,H,s,'Toy memory graph: the shortest route from start to goal');
    $('jw-toy-j').textContent=r?r.jumps:'none';$('jw-toy-s').textContent=r?(r.states-1-r.jumps):'none';
    $('jw-toy-lam').textContent=lam.toFixed(2);
  }
  const rg=$('jw-toy-r');rg.addEventListener('input',()=>{lam=+rg.value;draw()});
  RD.seg($('jw-toy-g'),m=>{key=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();

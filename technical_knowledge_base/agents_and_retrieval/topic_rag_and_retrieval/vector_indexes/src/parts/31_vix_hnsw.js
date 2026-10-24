// ---- HNSW lab (inline in Reading): replays the port's recorded build and search traces (data/hnsw_anim.json) ----
(function(){
  const H=window.VIX&&window.VIX.hnsw;if(!H)return;
  const $=id=>document.getElementById(id), esc=RD.esc;
  const SRC=['scifact','nfcorpus','hotpotqa','qasper'], COL={scifact:'var(--c1)',nfcorpus:'var(--c2)',hotpotqa:'var(--c3)',qasper:'var(--c4)'};
  const NAME={scifact:'SciFact',nfcorpus:'NFCorpus',hotpotqa:'HotpotQA',qasper:'QASPER'};
  const st={mode:'build',vr:'hnsw',layer:0,q:0};
  $('vix-h-M').textContent=H.M;$('vix-h-efc').textContent=H.efc;
  $('vix-h-chk').textContent=H.check;
  H.qtext.forEach((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=NAME[H.qsrc[i]]+': '+(t.length>70?t.slice(0,68)+'...':t);$('vix-h-q').appendChild(o)});
  const N=H.n, maxLevel=Math.max(...H.levels);
  function levelOf(i){return st.vr==='flat'?0:H.levels[i]}
  function fillLayers(){const s=$('vix-h-layer');const top=st.vr==='flat'?0:maxLevel;const cur=Math.min(st.layer,top);s.innerHTML='';
    for(let l=0;l<=top;l++){const o=document.createElement('option');o.value=l;o.textContent='Layer '+l+(l===0?' (every node)':' ('+H.levels.filter(x=>x>=l).length+' nodes)');s.appendChild(o)}
    st.layer=cur;s.value=cur}
  // replay the build up to insert number s (exclusive of later inserts): returns links[id][layer] (Sets)
  function replay(s){const M=H.modes[st.vr];const L=new Array(N).fill(null);
    for(let t=0;t<s;t++){const T=M.build[t];const id=T.id;const lv=st.vr==='flat'?0:T.level;L[id]=[];for(let l=0;l<=lv;l++)L[id].push([]);
      for(const Ly of T.layers){L[id][Ly.layer]=Ly.kept.slice();
        const dropped={};for(const [x,dr] of Ly.pruned)dropped[x]=dr;
        for(const k of Ly.kept){const lst=L[k][Ly.layer];if(dropped[k]!==undefined){const dr=new Set(dropped[k]);L[k][Ly.layer]=lst.concat([id]).filter(v=>!dr.has(v))}else lst.push(id)}}}
    return L}
  let W=520,Hh=420;
  function px(p){return [14+p[0]*(W-28),14+p[1]*(Hh-28)]}
  function svgBase(){W=RD.width($('vix-h-svg'));W=Math.max(260,Math.min(W,640));Hh=Math.round(W*0.78);return ''}
  function nodeR(){return W<400?3:4}
  function draw(i){
    svgBase();
    if(st.mode==='build')drawBuild(i);else drawSearch(i)}
  function edgesSvg(L,layer,present,cls){let s='';const seen=new Set();
    for(let a=0;a<N;a++){if(!L[a]||!present[a]||L[a].length<=layer)continue;const [x1,y1]=px(H.xy[a]);
      for(const b of L[a][layer]){const k=a<b?a+'-'+b:b+'-'+a;if(seen.has(k))continue;seen.add(k);const [x2,y2]=px(H.xy[b]);
        s+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--dim)" stroke-width="0.8"/>'}}
    return [s,seen.size]}
  function nodesSvg(present,layer,hl){let s='';const r=nodeR();
    for(let a=0;a<N;a++){if(!present[a])continue;const on=levelOf(a)>=layer;const [x,y]=px(H.xy[a]);
      const extra=hl&&hl[a]?hl[a]:'';
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(on?r:r*0.55)+'" fill="'+COL[H.src[a]]+'" opacity="'+(on?0.95:0.18)+'"'+extra+'><title>'+esc(NAME[H.src[a]]+' #'+a+' (level '+levelOf(a)+'): '+H.snip[a])+'</title></circle>'}
    return s}
  function line(a,b,col,dash,w){const [x1,y1]=px(a),[x2,y2]=px(b);return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="'+(w||1.6)+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>'}
  function ring(p,col,r){const [x,y]=px(p);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="2"/>'}
  function stats(a){$('vix-h-stats').innerHTML=a.map(x=>RD.stat(x[0],x[1],x[2])).join('')}
  // ---------- build
  function drawBuild(i){
    const M=H.modes[st.vr];const L=replay(i+1);const present=new Array(N).fill(false);for(let t=0;t<=i;t++)present[M.build[t].id]=true;
    const T=M.build[i];const layer=st.layer;const [es,ne]=edgesSvg(L,layer,present);
    let ov='';const id=T.id;const Ly=T.layers.find(x=>x.layer===layer);
    if(Ly){for(const k of Ly.kept)ov+=line(H.xy[id],H.xy[k],'var(--good)',false,2.2);
      if(Ly.rejected)for(const [c,r] of Ly.rejected){ov+=line(H.xy[id],H.xy[c],'var(--bad)',true,1.4);ov+=line(H.xy[c],H.xy[r],'var(--bad)',false,0.7)}
      for(const [x] of Ly.pruned)ov+=ring(H.xy[x],'var(--mute)',7)}
    ov+=ring(H.xy[id],'var(--ink)',8);
    $('vix-h-svg').innerHTML=RD.svg(W,Hh,es+nodesSvg(present,layer)+ov,'HNSW graph after '+(i+1)+' inserts');
    const lv=levelOf(id);let cap='<b>Insert '+(i+1)+' of '+N+':</b> '+NAME[H.src[id]]+' #'+id+' &ldquo;'+esc(H.snip[id])+'&rdquo; drew level '+lv+'. ';
    if(i===0)cap+='The first node becomes the entry point; there is nothing to link to yet.';
    else{ if(T.descent&&T.descent.length)cap+='Greedy walk down the upper layers ('+T.descent.length+' step'+(T.descent.length>1?'s':'')+' from layer '+T.descent[0].layer+' to layer '+T.descent[T.descent.length-1].layer+') to find a good starting node. ';
      if(Ly){cap+='On layer '+layer+(Ly.found!==undefined?' a best-first search kept the '+Ly.found+' closest nodes it met (up to efConstruction '+H.efc+'); ':'; ')+'the node links to '+Ly.kept.length+' of them (green)'+(Ly.rejected&&Ly.rejected.length?'; the heuristic rejected '+Ly.rejected.length+' (red dashed) because an already-kept neighbour is closer to each than the new node is (thin red line to that neighbour)':'')+'.';
        if(Ly.pruned.length)cap+=' '+Ly.pruned.length+' neighbour list'+(Ly.pruned.length>1?'s were':' was')+' already full (grey ring): adding the reverse link re-ran the selection there and dropped '+Ly.pruned.map(x=>x[1].length).reduce((a,b)=>a+b,0)+' link'+(Ly.pruned.map(x=>x[1].length).reduce((a,b)=>a+b,0)===1?'':'s')+'.'}
      else cap+='It does not reach layer '+layer+'; switch the layer to see its links.'}
    $('vix-h-cap').innerHTML=cap;
    const nodesOnLayer=present.filter((p,a)=>p&&levelOf(a)>=layer).length;
    stats([['Inserted',(i+1)+' / '+N,''],['Nodes on layer '+layer,nodesOnLayer,''],['Links on layer '+layer,ne,'undirected pairs'],['Levels so far',Math.max(...M.build.slice(0,i+1).map(t=>st.vr==='flat'?0:t.level)),'top layer']]);
    $('vix-h-res').innerHTML='';$('vix-h-leg2').innerHTML='<span style="color:var(--good)">&#9473;</span> kept link &nbsp;<span style="color:var(--bad)">&#9476;</span> rejected by the heuristic &nbsp;&#9711; full list re-pruned'}
  // ---------- search
  function searchOf(){return H.modes[st.vr].searches.find(s=>s.q===st.q)}
  function steps(){const S=searchOf();const out=[{k:'start'}];S.descent.forEach((d,j)=>out.push({k:'desc',d,j}));S.steps.forEach((s,j)=>out.push({k:'l0',s,j}));out.push({k:'end'});return out}
  function drawSearch(i){
    const S=searchOf(),seq=steps(),cur=seq[Math.min(i,seq.length-1)];const M=H.modes[st.vr];
    const present=new Array(N).fill(true);
    const layer=cur.k==='desc'?cur.d.layer:(cur.k==='start'?(st.vr==='flat'?0:M.maxlevel):0);
    if(st.layer!==layer){st.layer=layer;$('vix-h-layer').value=layer}
    const L=M.links;const [es]=edgesSvg(L,layer,present);
    // evaluations so far
    let nd=1,evaluated=new Map(),best=[];evaluated.set(M.ep,1);let at=M.ep;
    for(let k=1;k<=i&&k<seq.length;k++){const x=seq[k];
      if(x.k==='desc'){x.d.evals.forEach(e=>{nd++;evaluated.set(e[0],e[1])});at=x.d.at}
      if(x.k==='l0'){at=x.s[0];x.s[1].forEach(e=>{nd++;evaluated.set(e[0],e[1]);if(e[2])best.push([e[1],e[0]])})}}
    best.sort((a,b)=>a[0]-b[0]);
    const hl={};for(const [id] of evaluated)hl[id]=' stroke="var(--ink)" stroke-width="1.2"';
    let ov='';const q=H.qxy[st.q];
    if(cur.k==='desc'){cur.d.evals.forEach(e=>{ov+=line(H.xy[cur.d.at],H.xy[e[0]],'var(--acc)',true,1.2)})}
    if(cur.k==='l0'){cur.s[1].forEach(e=>{ov+=line(H.xy[cur.s[0]],H.xy[e[0]],e[2]?'var(--acc)':'var(--mute)',!e[2],e[2]?1.8:1)})}
    const res=cur.k==='end'?S.result:best.slice(0,4).map(x=>x[1]);
    res.forEach(r=>{ov+=ring(H.xy[r],'var(--good)',7)});
    H.gt[st.q].slice(0,4).forEach(g=>{if(!res.includes(g))ov+=ring(H.xy[g],'var(--bad)',9)});
    ov+=ring(H.xy[at],'var(--ink)',8);
    const [qx,qy]=px(q);ov+='<path d="M'+(qx-7)+' '+qy+'h14M'+qx+' '+(qy-7)+'v14" stroke="var(--ink)" stroke-width="2.4"/>';
    $('vix-h-svg').innerHTML=RD.svg(W,Hh,es+nodesSvg(present,layer,hl)+ov,'Search on the HNSW graph');
    let cap='';
    if(cur.k==='start')cap='<b>Start.</b> The query (cross) enters at the entry point'+(st.vr==='flat'?' on the single layer':', the node with the highest level ('+M.maxlevel+')')+'. One distance computed. Question: &ldquo;'+esc(H.qtext[st.q])+'&rdquo;';
    else if(cur.k==='desc')cap='<b>Layer '+cur.d.layer+', greedy step.</b> Compare the query with the '+cur.d.evals.length+' neighbours of the current node (blue dashed) and move to the closest if it beats the current one; when no neighbour is closer, drop one layer. Now at #'+cur.d.at+'.';
    else if(cur.k==='l0'){const took=cur.s[1].filter(e=>e[2]).length;cap='<b>Layer 0, expansion '+(cur.j+1)+' of '+S.steps.length+'.</b> Take the closest unexpanded candidate (#'+cur.s[0]+') and compute the distance to each of its '+cur.s[1].length+' unvisited neighbours; '+took+' are better than the worst of the ef = 8 kept so far (or the list is not full) and join the candidates (solid), the rest are dropped (grey dashed). The search stops when the closest open candidate is worse than the worst result (hnswlib searchBaseLayerST, line 348).'}
    else{const ok=S.result.filter(r=>H.gt[st.q].slice(0,4).includes(r)).length;cap='<b>Done.</b> Returned the 4 best of the ef = 8 kept (green rings); '+ok+' of the exact top 4 found'+(ok<4?', the missed ones circled red':'')+', after '+S.ndis+' distance computations against 240 for exact search.'}
    $('vix-h-cap').innerHTML=cap;
    stats([['Distances computed',nd,'exact search: '+N],['Layer-0 expansions',cur.k==='l0'?cur.j+1:(cur.k==='end'?S.steps.length:0),''],['Current layer',layer,''],['Exact top 4 found',(cur.k==='end'?S.result:res).filter(r=>H.gt[st.q].slice(0,4).includes(r)).length+' / 4','so far']]);
    $('vix-h-res').innerHTML='<table class="res"><tr><th>#</th><th>result so far</th></tr>'+res.map((r,k)=>'<tr><td>'+(k+1)+'</td><td><span class="'+(H.gt[st.q].slice(0,4).includes(r)?'ok':'no')+'">'+(H.gt[st.q].slice(0,4).includes(r)?'&#10003;':'&#215;')+'</span> '+esc(NAME[H.src[r]])+': '+esc(H.snip[r].slice(0,60))+'</td></tr>').join('')+'</table>';
    $('vix-h-leg2').innerHTML='<span style="color:var(--good)">&#9711;</span> current top 4 &nbsp;<span style="color:var(--bad)">&#9711;</span> exact top 4 not found &nbsp;+ query'}
  function nsteps(){return st.mode==='build'?N:steps().length}
  const A=RD.anim({card:'vix-h-card',ctl:'vix-h-ctl',n:N,draw,ms:700,label:'Step'});
  function cmp(){const rows=['hnsw','simple','flat'].map(v=>{const S=H.modes[v].searches.find(s=>s.q===st.q);const ok=S.result.filter(r=>H.gt[st.q].slice(0,4).includes(r)).length;
      return '<tr><td>'+({hnsw:'HNSW (hnswlib)',simple:'Closest-M links',flat:'One layer'}[v])+'</td><td class="num">'+S.ndis+'</td><td class="num">'+S.descent.length+'</td><td class="num">'+S.steps.length+'</td><td class="num">'+ok+' / 4</td><td class="num">'+H.modes[v].reachable+' / '+N+'</td></tr>'}).join('');
    $('vix-h-cmp').innerHTML='<table><tr><th>Graph</th><th class="num">Distances</th><th class="num">Upper-layer steps</th><th class="num">Layer-0 expansions</th><th class="num">Exact top 4 found</th><th class="num">Reachable on layer 0</th></tr>'+rows+'</table><p class="small mute">This question only, ef = 8, k = 4. Over all eight questions: exact top 4 found on average '+['hnsw','simple','flat'].map(v=>({hnsw:'HNSW',simple:'closest-M',flat:'one layer'}[v])+' '+(H.modes[v].mean_recall4*4).toFixed(2)).join(', ')+' of 4, with '+['hnsw','simple','flat'].map(v=>H.modes[v].mean_ndis.toFixed(1)).join(', ')+' distances. Eight questions on 240 points is a small sample: read it as an illustration, and section 6 of the Reading tab for the measurement at scale.</p>'}
  function reset(){fillLayers();A.reset(nsteps());if(st.mode==='search'){A.go(0)}cmp();$('vix-h-ql').style.display=st.mode==='search'?'':'none'}
  RD.seg($('vix-h-mode'),m=>{st.mode=m;if(m==='build')st.layer=0;reset()});
  RD.seg($('vix-h-var'),v=>{st.vr=v;reset()});
  $('vix-h-layer').addEventListener('change',e=>{st.layer=+e.target.value;A.redraw()});
  $('vix-h-q').addEventListener('change',e=>{st.q=+e.target.value;reset()});
  RD.onRender(()=>A.redraw());
  RD.onResize(()=>A.redraw());
  reset();
})();

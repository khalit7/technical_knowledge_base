// ---- Reading: one query, four ways (brute force, IVF with 1 and 2 probes, HNSW) on the toy space ----
(function(){
  const T=window.TOY;if(!document.getElementById('annCard'))return;
  const W=600,H=380,X=x=>(x*W).toFixed(1),Y=y=>(y*H).toFixed(1);
  const EX=T.exact(T.Q,10),EXS=new Set(EX);
  let mode='hnsw',seq=[];
  function build(){
    seq=[];
    if(mode==='brute'){
      seq.push({scan:[],t:'The query arrives',p:'The orange star is the new question as a vector. Brute force will compute its distance to every one of the '+T.N+' stored vectors.'});
      for(let b=20;b<=T.N;b+=20){const s=[];for(let i=0;i<b;i++)s.push(i);
        const best=s.map(i=>[T.d2(T.P[i],T.Q),i]).sort((a,c)=>a[0]-c[0]).slice(0,10).map(x=>x[1]);
        seq.push({scan:s,best:best,t:'Scanning: '+b+' of '+T.N,p:b<T.N?'Every point gets one distance computation, in storage order. The 10 closest so far are ringed.':'Done: every distance computed, so the 10 ringed points are exactly the true 10 nearest. Recall is perfect, the cost is one computation per stored vector.'})}
    }else if(mode==='ivf1'||mode==='ivf2'){
      const pr=mode==='ivf1'?1:2,tr=T.ivfTrace(T.Q,pr);
      seq.push({scan:[],cen:true,t:'The index was built earlier',p:'k-means split the '+T.N+' points into '+T.K+' lists (colours). Each list has a centroid (the squares), its average point.'});
      seq.push({scan:[],cen:true,cmp:true,comps:T.K,t:'Step 1: compare the query with the '+T.K+' centroids',p:T.K+' distance computations pick the closest list'+(pr>1?'s':'')+'. Only those lists will be read: probes = '+pr+'.'});
      tr.steps.slice(1).forEach((s,j)=>{const best=s.scanned.map(i=>[T.d2(T.P[i],T.Q),i]).sort((a,c)=>a[0]-c[0]).slice(0,10).map(x=>x[1]);
        const last=j===tr.steps.length-2,miss=EX.filter(i=>!best.includes(i)).length;
        seq.push({scan:s.scanned,best:best,lists:s.lists,cen:true,comps:s.comps,miss:last?EX.filter(i=>!best.includes(i)):[],
          t:'Step '+(j+2)+': scan list '+(j+1)+' of '+pr,p:last?(miss?'Done after '+s.comps+' computations, but '+miss+' of the true 10 nearest live in a list that was never opened (red rings): the boundary problem. More probes fix it at more cost.':'Done after '+s.comps+' computations, and the second list held the neighbours the first one missed: all 10 found.'):'Every vector in this list is compared with the query.'})});
    }else{
      const tr=T.hnswTrace(T.Q,10);
      seq.push({layer:T.top,cur:T.entry,scan:[T.entry],t:'Enter at the top layer',p:'HNSW stores the points as a graph in layers. Layer '+T.top+' holds only '+T.layerCount(T.top)+' points with long links; layer 0 holds all '+T.N+' with short links. Every search starts at the same entry point.'});
      let scanned=new Set([T.entry]);
      tr.steps.slice(1).forEach(s=>{s.ev.forEach(e=>scanned.add(e));const l0=s.layer===0;
        seq.push({layer:s.layer,cur:s.cur,ev:s.ev,scan:[...scanned],best:l0?s.best.slice(0,10):[s.best[0]],comps:s.comps,
          t:(l0?'Layer 0, beam search (ef_search = 10)':'Layer '+s.layer+', greedy step'),
          p:l0?'Expand the closest unexpanded candidate: compute distances to its '+s.ev.length+' unvisited neighbours and keep the best 10 seen. Stop when no candidate is closer than the worst kept.':
            'From the current point, compute the distance to each of its '+s.ev.length+' unvisited neighbours on this layer and jump to the closest. When no neighbour is closer, drop one layer.'})});
      const res=tr.result.slice(0,10),miss=EX.filter(i=>!res.includes(i));
      seq.push({layer:0,scan:[...scanned],best:res,comps:tr.comps,miss:miss,t:'Done: '+tr.comps+' distance computations',p:'The beam ran out of closer candidates. '+(miss.length?miss.length+' true neighbours were missed (red rings).':'All 10 true nearest were found')+' while touching '+tr.comps+' of '+T.N+' points; brute force needed '+T.N+'. On the 522,931 real vectors the gap is far larger (section 10).'});
    }
  }
  const col=k=>['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'][k%6];
  function draw(i){
    const s=seq[i]||seq[0],box=document.getElementById('annSvg');let g='';
    const scan=new Set(s.scan||[]),best=new Set(s.best||[]),miss=new Set(s.miss||[]),ev=new Set(s.ev||[]);
    if(mode==='hnsw'){const L=s.layer;
      for(let a=0;a<T.N;a++){if(T.level[a]<L)continue;for(const b of T.links[a][L]){if(b<a&&T.links[b][L]&&T.links[b][L].includes(a))continue;
        g+='<line x1="'+X(T.P[a][0])+'" y1="'+Y(T.P[a][1])+'" x2="'+X(T.P[b][0])+'" y2="'+Y(T.P[b][1])+'" stroke="var(--dim)" stroke-width="'+(L?1.4:.7)+'"/>'}}
      if(s.cur!=null)for(const e of (s.ev||[]))g+='<line x1="'+X(T.P[s.cur][0])+'" y1="'+Y(T.P[s.cur][1])+'" x2="'+X(T.P[e][0])+'" y2="'+Y(T.P[e][1])+'" stroke="var(--acc)" stroke-width="2"/>';
    }
    for(let a=0;a<T.N;a++){const p=T.P[a];let f='var(--dim)',r=2.6,op=1;
      if(mode==='ivf1'||mode==='ivf2'){f=col(T.asg[a]);op=(s.lists&&s.lists.length)?(s.lists.includes(T.asg[a])?1:.25):.55}
      if(mode==='hnsw'&&T.level[a]<s.layer){op=.25}
      if(mode==='hnsw'&&T.level[a]>=s.layer&&s.layer>0){r=3.6;f='var(--mute)'}
      if(scan.has(a)&&mode!=='ivf1'&&mode!=='ivf2')f='var(--acc)';
      if(ev.has(a)){r=4.2}
      g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+r+'" fill="'+f+'" opacity="'+op+'"/>';
      if(best.has(a))g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="7" fill="none" stroke="var(--good)" stroke-width="2"/>';
      if(miss.has(a))g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="7" fill="none" stroke="var(--bad)" stroke-width="2.4"/>'}
    if(s.cen)T.cen.forEach((c,k)=>{g+='<rect x="'+(c[0]*W-5).toFixed(1)+'" y="'+(c[1]*H-5).toFixed(1)+'" width="10" height="10" fill="'+col(k)+'" stroke="var(--ink)" stroke-width="1"/>';
      if(s.cmp)g+='<line x1="'+X(T.Q[0])+'" y1="'+Y(T.Q[1])+'" x2="'+X(c[0])+'" y2="'+Y(c[1])+'" stroke="var(--mute)" stroke-dasharray="3 3" stroke-width=".8"/>'});
    if(mode==='hnsw'&&s.cur!=null)g+='<circle cx="'+X(T.P[s.cur][0])+'" cy="'+Y(T.P[s.cur][1])+'" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="1.5"/>';
    const qx=T.Q[0]*W,qy=T.Q[1]*H,st=[];for(let k=0;k<10;k++){const a=Math.PI/5*k-Math.PI/2,rr=k%2?4:10;st.push((qx+rr*Math.cos(a)).toFixed(1)+','+(qy+rr*Math.sin(a)).toFixed(1))}
    g+='<polygon points="'+st.join(' ')+'" fill="var(--c2)" stroke="var(--bg)" stroke-width="1"/>';
    box.innerHTML=RD.svg(W,H,g,'Toy vector space with the query and the points it compared').replace('width="'+W+'" height="'+H+'"','width="100%" preserveAspectRatio="xMidYMid meet"');
    const comps=mode==='brute'?(s.scan||[]).length:(s.comps||0);const found=(s.best||[]).filter(a=>EXS.has(a)).length;
    document.getElementById('annCap').innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>';
    document.getElementById('annCnt').innerHTML=RD.stat('Distance computations',comps,'of '+T.N+' points')+RD.stat('True top 10 found',found+' of 10','recall@10 so far')+
      RD.stat('Step',(i+1)+' of '+seq.length,mode==='hnsw'?('layer '+(s.layer==null?0:s.layer)):'');
  }
  build();
  const A=RD.anim({card:'annCard',ctl:'annCtl',n:seq.length,draw:draw,ms:1100,label:'Search step'});
  RD.seg(document.getElementById('annSeg'),m=>{mode=m;build();A.reset(seq.length);A.play()});
  // the summary table under the animation
  const rows=[['Brute force',T.N,1],['IVF, 1 probe',T.ivfTrace(T.Q,1).comps,T.ivfTrace(T.Q,1).result.filter(a=>EXS.has(a)).length/10],
    ['IVF, 2 probes',T.ivfTrace(T.Q,2).comps,T.ivfTrace(T.Q,2).result.filter(a=>EXS.has(a)).length/10],
    ['HNSW, ef_search 10',T.hnswTrace(T.Q,10).comps,T.hnswTrace(T.Q,10).result.slice(0,10).filter(a=>EXS.has(a)).length/10]];
  window.SV_TOY_SUMMARY=rows;
  document.getElementById('annSum').innerHTML='<div class="tw nomin"><table class="mini"><tr><th>Toy, '+T.N+' points</th><th>Distances</th><th>Recall@10</th></tr>'+
    rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2].toFixed(1)+'</td></tr>').join('')+'</table></div>';
})();

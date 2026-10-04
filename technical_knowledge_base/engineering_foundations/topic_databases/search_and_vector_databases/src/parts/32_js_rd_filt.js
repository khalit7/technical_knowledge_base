// ---- Reading: the same query with a filter (only tenant 7, 10% of points), three ways, on the toy space ----
(function(){
  const T=window.TOY;if(!document.getElementById('fltCard'))return;
  const W=600,H=380,X=x=>(x*W).toFixed(1),Y=y=>(y*H).toFixed(1);
  const EX7=T.exact(T.Q,10,i=>T.T7[i]),EXS=new Set(EX7);
  let mode='post',seq=[];
  function build(){seq=[];
    seq.push({hl:[],t:'Asked: the 10 nearest points that belong to tenant 7',p:'The filled squares are tenant 7 (30 of '+T.N+' points, 10%). The other points must never be returned. The query is the orange star.'});
    if(mode==='post'){const r=T.postFilter(T.Q,10);
      seq.push({hl:r.cands,comps:r.comps,t:'Step 1: the index search ignores the filter',p:'HNSW with ef_search = 10 returns its 10 best candidates ('+r.comps+' distance computations), chosen by distance only.'});
      seq.push({hl:r.kept,dropped:r.cands.filter(i=>!T.T7[i]),comps:r.comps,res:r.kept,t:'Step 2: then the filter runs: '+r.kept.length+' of 10 survive',p:'Only '+r.kept.length+' candidates belong to tenant 7, so the query returns '+r.kept.length+' rows instead of 10. With a 1% filter and ef_search 40, pgvector returns 0.4 rows on average: post-filtering destroys recall.'});
    }else if(mode==='iter'){const r=T.iterative(T.Q,10,10,300);
      seq.push({hl:T.postFilter(T.Q,10).cands,comps:T.postFilter(T.Q,10).comps,t:'Step 1: the same first search',p:'The first pass is identical: 10 candidates, few of them tenant 7.'});
      seq.push({hl:r.seen,comps:r.comps,res:r.kept,t:'Step 2: keep walking the graph until 10 matches are found',p:'An iterative scan resumes the search from where it stopped, visiting more neighbours ('+r.comps+' computations in total) until 10 tenant-7 points are collected or a limit is hit (hnsw.max_scan_tuples, 20,000 by default in pgvector). '+r.kept.filter(i=>EXS.has(i)).length+' of the true 10 are found: this simplified toy keeps the first 10 matches it meets, as relaxed_order may; pgvector\'s strict_order returns them in exact distance order.'});
    }else{const r=T.preFilter(T.Q,10);
      seq.push({hl:r.scanned,comps:0,t:'Step 1: find the tenant-7 rows first (a B-tree on tenant)',p:'An ordinary index lists the 30 matching rows without computing any distance.'});
      seq.push({hl:r.scanned,comps:r.comps,res:r.kept,t:'Step 2: exact search over just those rows',p:'30 distance computations give the exact answer. Cheap when the filter is selective; when it matches half the table this becomes a brute-force scan of half the table.'});
    }}
  function draw(i){const s=seq[i]||seq[0];let g='';const hl=new Set(s.hl||[]),res=new Set(s.res||[]),dr=new Set(s.dropped||[]);
    for(let a=0;a<T.N;a++){const p=T.P[a],on=hl.has(a);
      if(T.T7[a])g+='<rect x="'+(p[0]*W-4).toFixed(1)+'" y="'+(p[1]*H-4).toFixed(1)+'" width="8" height="8" fill="'+(on?'var(--acc)':'var(--c4)')+'"/>';
      else g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="2.6" fill="'+(on?'var(--acc)':'var(--dim)')+'"/>';
      if(res.has(a))g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="8" fill="none" stroke="var(--good)" stroke-width="2"/>';
      if(dr.has(a))g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="7" fill="none" stroke="var(--bad)" stroke-width="1.6" stroke-dasharray="2 2"/>'}
    const qx=T.Q[0]*W,qy=T.Q[1]*H,st=[];for(let k=0;k<10;k++){const a=Math.PI/5*k-Math.PI/2,rr=k%2?4:10;st.push((qx+rr*Math.cos(a)).toFixed(1)+','+(qy+rr*Math.sin(a)).toFixed(1))}
    g+='<polygon points="'+st.join(' ')+'" fill="var(--c2)" stroke="var(--bg)" stroke-width="1"/>';
    document.getElementById('fltSvg').innerHTML=RD.svg(W,H,g,'Filtered search on the toy space').replace('width="'+W+'" height="'+H+'"','width="100%" preserveAspectRatio="xMidYMid meet"');
    document.getElementById('fltCap').innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>';
    const got=(s.res||[]).length,good=(s.res||[]).filter(a=>EXS.has(a)).length;
    document.getElementById('fltCnt').innerHTML=RD.stat('Distance computations',s.comps||0,'')+RD.stat('Rows returned',s.res?got+' of 10':'none yet','')+RD.stat('True top 10 found',s.res?good+' of 10':'none yet','recall@10')}
  build();
  const A=RD.anim({card:'fltCard',ctl:'fltCtl',n:seq.length,draw:draw,ms:1800,label:'Filter step'});
  RD.seg(document.getElementById('fltSeg'),m=>{mode=m;build();A.reset(seq.length);A.play()});
})();

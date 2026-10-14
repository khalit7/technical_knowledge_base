// ---- Reading tab, section 0: where 188 answers go (fates animation) and the shared predict-then-reveal widget ----
(function(){
  const D=window.RD_DATA, F=D.fates, N=F.n;
  const grid=document.getElementById('rd-fun-grid'); if(!grid) return;
  const COL=['var(--c2)','var(--c5)','var(--c4)','var(--c3)'];
  let mode='on';
  const cells=[];
  for(let i=0;i<N;i++){const e=document.createElement('i');if(F.label[i]==='C')e.className='c';grid.appendChild(e);cells.push(e)}
  const f=()=>mode==='on'?F.on:F.off;
  const A=()=>mode==='on'?F.agg_on:F.agg_off;
  function pct(x){return (100*x).toFixed(1)+'%'}
  const caps={
    on:[
      ['188 claims, each with annotated evidence','Every square is one SciFact claim. Each must survive three stages in a row: the first stage must find its evidence, the reranker must keep it near the top, and the generator must use it.'],
      ['First stage: BM25 and dense search, fused, keep the top 30 of 5,183','Two claims (orange) have no evidence abstract in the fused top 30. Nothing later can rescue them: r = 186 / 188 = 0.989.'],
      ['Reranker: Qwen3-Reranker-0.6B reorders the 30, the top 3 go to the prompt','Eight more claims (yellow) had their evidence in the 30 but the reranker did not put it in the top 3: p = 178 / 186 = 0.957.'],
      ['Generator: Qwen3-1.7B answers from the three abstracts','96 right, citing evidence (green); 82 wrong with the evidence in front of it (purple): g = 96 / 178 = 0.539. Every CONTRADICT claim that reached the prompt (dotted) is purple.'],
      ['Grouped by fate','Retrieval and ranking lose 10 claims together; generation loses 82. The fix that pays here is the answering model or its prompt, not the search. A = 96 / 188 = 0.511.']],
    off:[
      ['188 claims, the same ones','Now without a reranker: the first stage\'s own top 3 go straight into the prompt (K = k = 3).'],
      ['First stage: fused BM25 and dense search, top 3 of 5,183','17 claims (orange) have no evidence in the top 3. Measured at K = 3 there is no reranker to rescue them: in the prompt for 171 of 188.'],
      ['No reranker','Nothing to reorder. Compare with the other mode: the reranker read 30 candidates and brought the evidence into the top 3 for 7 more claims (178 against 171).'],
      ['Generator: Qwen3-1.7B answers','90 right, citing evidence, against 96 with the reranker; 81 wrong with the evidence in the prompt.'],
      ['Grouped by fate','Without the reranker, A = 90 / 188 = 0.479. The reranker is worth 6 correct answers here; the generator still loses most.']]
  };
  function layout(step){
    const W=RD.width(grid),cols=W<480?16:24,cell=Math.floor(W/cols),s=cell-3,rows=Math.ceil(N/cols);
    grid.style.height=(rows*cell)+'px';
    let order=[...Array(N).keys()];
    if(step>=4){const rank={3:0,2:1,1:2,0:3};const ff=f();order.sort((a,b)=>rank[ff[a]]-rank[ff[b]]||(F.label[a]<F.label[b]?-1:F.label[a]>F.label[b]?1:a-b))}
    order.forEach((idx,pos)=>{const e=cells[idx];e.style.width=s+'px';e.style.height=s+'px';e.style.left=((pos%cols)*cell)+'px';e.style.top=(Math.floor(pos/cols)*cell)+'px'});
  }
  function colour(step){
    const ff=f();
    cells.forEach((e,i)=>{const v=ff[i];let c='var(--dim)';
      if(step>=1&&v===0)c=COL[0];
      if(step>=2&&v===1)c=COL[1];
      if(step>=3&&v>=2)c=COL[v];
      e.style.backgroundColor=c});
  }
  function bars(step){
    const a=A(),rows=[['Claims with evidence',N,0],[mode==='on'?'Evidence in top 30':'Evidence in top 3',a.in_K,1],['Evidence in the prompt',a.in_k,2],['Correct, citing evidence',a.correct_strict,3]];
    document.getElementById('rd-fun-bars').innerHTML=rows.map(r=>{const shown=step>=r[2];
      return '<div>'+r[0]+'</div><div class="tr"><div class="bar" style="width:'+(shown?(100*r[1]/N):0)+'%;background:'+(r[2]===3?'var(--c3)':'var(--acc)')+'"></div></div><div class="n">'+(shown?r[1]:'')+'</div>'}).join('');
  }
  function counters(step){
    const a=A();const r=a.in_K/N,p=a.in_K?a.in_k/a.in_K:0,g=a.in_k?a.correct_strict/a.in_k:0;
    document.getElementById('rd-fun-cnt').innerHTML=
      RD.stat('r (found)',step>=1?r.toFixed(3):'?',step>=1?a.in_K+' / '+N:'')+
      RD.stat('p (kept)',step>=2?p.toFixed(3):'?',step>=2?(mode==='on'?a.in_k+' / '+a.in_K:'no reranker'):'')+
      RD.stat('g (used)',step>=3?g.toFixed(3):'?',step>=3?a.correct_strict+' / '+a.in_k:'')+
      RD.stat('A = r &times; p &times; g',step>=3?(r*p*g).toFixed(3):'?',step>=3?a.correct_strict+' / '+N:'');
  }
  function draw(i){
    const c=caps[mode][i];
    document.getElementById('rd-fun-cap').innerHTML='<div class="t">Step '+(i+1)+' of 5. '+c[0]+'</div><p>'+c[1]+'</p>';
    layout(i);colour(i);bars(i);counters(i);
  }
  const an=RD.anim({card:'rd-fun-card',ctl:'rd-fun-ctl',n:5,draw,ms:2300,label:'Stage'});
  RD.seg(document.getElementById('rd-fun-mode'),m=>{mode=m;an.reset(5);an.play()});
  RD.onResize(()=>an.redraw());
})();

// predict-then-reveal: <div class="pr" data-right="i"> with .opts buttons and a hidden .ans
(function(){
  document.querySelectorAll('#t-read .pr[data-right]').forEach(pr=>{
    const right=+pr.dataset.right,btns=[...pr.querySelectorAll('.opts button')],ans=pr.querySelector('.ans');
    btns.forEach((b,i)=>b.addEventListener('click',()=>{
      btns.forEach((x,j)=>{x.classList.toggle('right',j===right);x.classList.toggle('wrong',j===i&&i!==right)});
      ans.hidden=false;
    }));
  });
})();

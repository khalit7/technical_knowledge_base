// ---- Table 4 at a glance: of the judged Jeopardy pairs, which model was better, drawn from PAPER.tables.t4 (2026-10-24) ----
(function(){const el=$('t4Fig');if(!el||!window.PAPER)return;
  const T=PAPER.tables.t4,C={'RAG better':'var(--acc)','BART better':'var(--c2)','Both good':'var(--c3)','Both poor':'var(--dim)','No majority':'var(--soft)'};
  const order=['RAG better','Both good','No majority','Both poor','BART better'],row=m=>T.rows.find(r=>r.m===m);
  onTab('t-read',()=>fit(el,w=>{const narrow=w<520,L=narrow?78:96,R=8,bw=w-L-R,X=v=>bw*v/100;let s='',y=6;
    T.cols.forEach((c,j)=>{let x=L;s+=tx(L-8,y+21,c,{fs:12,a:'end',w:600});
      order.forEach(m=>{const v=row(m).v[j],ww=X(v);s+=rc(x,y+4,ww,26,C[m],{r:0,s:'var(--bg)'});
        if(ww>34)s+=tx(x+ww/2,y+21,v.toFixed(1),{fs:11,a:'middle',c:m==='RAG better'||m==='BART better'?'var(--bg)':'var(--ink)',w:m==='RAG better'?600:null});x+=ww});
      const sum=order.reduce((a,m)=>a+row(m).v[j],0);if(sum<99.5)s+=rc(x,y+4,X(100-sum),26,'none',{r:0,s:'var(--bad)',da:'3 3'})+(X(100-sum)>30?tx(x+X(100-sum)/2,y+21,'?',{fs:12,a:'middle',c:'var(--bad)',w:600}):'');
      y+=40});
    // legend in rows that wrap
    let lx=L,ly=y+10;order.concat(['missing']).forEach(m=>{const t=m==='missing'?'not in the table':m,lw=t.length*6.4+24;if(lx+lw>w&&lx>L){lx=L;ly+=18}
      s+=(m==='missing'?rc(lx,ly-10,12,12,'none',{r:0,s:'var(--bad)',da:'3 3'}):rc(lx,ly-10,12,12,C[m],{r:0,s:'var(--line)'}))+tx(lx+17,ly,t,{fs:11});lx+=lw});
    el.innerHTML=svgW(w,ly+8,s,'Table 4: human judgements of BART against RAG-Token on Jeopardy question generation')}))})();

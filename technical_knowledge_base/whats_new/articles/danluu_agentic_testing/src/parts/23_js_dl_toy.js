// ---- Fig. 3: the real results beside worlds where no instruction matters (prefix dl). Opens on the real results; each press of
// "Draw a no-effect world" draws all 30 conditions from one binomial at the pooled rate (n per condition as in the chart) with a
// fixed seed sequence (mulberry32, seeds 1, 2, 3, ...), so every press is reproducible. Nothing runs on page load but drawing.
// The band and the expected spread come from src/recompute.py (inputs/recompute.json, exact binomial quantiles and range).
(function(){
  if(!window.RD||!window.ARTICLE||!window.DL||!document.getElementById('dl-toy-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t, RC=window.ARTICLE.recompute, D=window.DL;
  const st={eff:'xhigh',mode:'real',seed:0,drawn:false,sim:null};
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}}
  function draw(eff,seed){  // one no-effect world: every condition passes each run with the pooled probability
    const E=RC.effort[eff],p=E.passed/E.runs,rnd=mulberry32(seed*1000+(eff==='xhigh'?1:2));
    return E.rows.map(r=>{let k=0;for(let i=0;i<r.n;i++)if(rnd()<p)k++;return {label:r.label,n:r.n,k:k,pct:100*k/r.n}});
  }
  function chisq(rows){const K=rows.reduce((a,r)=>a+r.k,0),N=rows.reduce((a,r)=>a+r.n,0),p=K/N;return rows.reduce((a,r)=>a+(r.k-r.n*p)**2/(r.n*p*(1-p)),0)}
  window.DL_TOY={draw,chisq,mulberry32};
  function render(){
    const el=$('dl-toy-svg'),W=RD.width(el),narrow=W<480,E=RC.effort[st.eff];
    const data=(st.mode==='real'?E.rows.map(r=>({label:r.label,n:r.n,k:r.k,pct:r.pct})):st.sim).slice().sort((a,b)=>b.pct-a.pct);
    const lw=narrow?102:112,L=lw+8,R=W-12,rh=narrow?13:14,T=18,H=T+data.length*rh+30;
    const lo=st.eff==='xhigh'?50:30,hi=st.eff==='xhigh'?100:90,X=v=>L+(v-lo)/(hi-lo)*(R-L);let s='';
    for(let v=lo;v<=hi;v+=10)s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(T-4)+'" y2="'+(T+data.length*rh)+'" stroke="var(--line)"/>'+t(X(v),T+data.length*rh+15,v+'%',{fs:11.5,a:'middle',fill:'var(--mute)'});
    if(st.drawn){const b=E.null_band;s+='<rect x="'+X(b[0])+'" y="'+(T-4)+'" width="'+(X(b[1])-X(b[0]))+'" height="'+(data.length*rh+4)+'" fill="var(--mute)" opacity=".13"/>'+t((X(b[0])+X(b[1]))/2,T-6,'95% of single conditions, no-effect world',{fs:11.5,a:'middle',fill:'var(--mute)'})}
    const pool=100*E.passed/E.runs;s+='<line x1="'+X(pool)+'" x2="'+X(pool)+'" y1="'+(T-4)+'" y2="'+(T+data.length*rh)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    data.forEach((r,i)=>{const y=T+i*rh+rh/2,f=D.FAM[r.label],c=st.mode==='real'?D.COL[f]:'var(--mute)',w=D.wilson(r.k,r.n);
      s+=t(L-6,y+4,r.label,{fs:11.5,a:'end',fill:f==='d'?'var(--c2)':'var(--ink)',w:f==='d'?700:400});
      s+='<line x1="'+X(100*w[0])+'" x2="'+X(100*w[1])+'" y1="'+y+'" y2="'+y+'" stroke="'+c+'" stroke-opacity=".55" stroke-width="2"/>';
      s+='<circle cx="'+X(r.pct)+'" cy="'+y+'" r="'+(f==='d'?5:4)+'" fill="'+(st.mode==='real'?c:'var(--card)')+'" stroke="'+c+'" stroke-width="1.5"><title>'+r.label+': '+r.k+' of '+r.n+'</title></circle>'});
    s+=t(X(hi)-2,T+data.length*rh+28,'fully correct runs (dashed: pooled '+pool.toFixed(1)+'%)',{fs:11.5,a:'end',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H+4,s,'Share of fully correct runs per condition, real or drawn from a world where no instruction matters');
    const k=data.map(r=>100*r.k/r.n),spread=Math.max(...k)-Math.min(...k),inside=data.filter(r=>r.n===80&&r.k>=E.null_band_runs[0]&&r.k<=E.null_band_runs[1]).length;
    $('dl-toy-out').innerHTML=RD.stat(st.mode==='real'?'real results, '+st.eff:'no-effect world #'+st.seed+', '+st.eff,(st.mode==='real'?'the post\'s data':'all 30 equal'),'')+
      RD.stat('best minus worst',spread.toFixed(1)+' points',st.drawn?'no-effect worlds average '+E.null_range_mean_points.toFixed(1)+' (real '+E.obs_range_points.toFixed(1)+')':'')+
      RD.stat('top of this chart',data[0].label,data[0].pct.toFixed(1)+'% '+(st.mode==='real'?'':'(by chance alone)'))+
      RD.stat('chi-square, 29 df',chisq(data).toFixed(1),'about 29 expected when nothing differs')+(st.drawn?RD.stat('95% band, one condition',E.null_band[0].toFixed(1)+' to '+E.null_band[1].toFixed(1)+'%','real conditions inside: '+E.inside_band+' of '+E.n80):'');
  }
  RD.seg($('dl-eff'),m=>{st.eff=m;if(st.mode==='sim')st.sim=draw(st.eff,st.seed);render()});
  $('dl-draw').addEventListener('click',()=>{st.seed+=1;st.mode='sim';st.drawn=true;st.sim=draw(st.eff,st.seed);render()});
  $('dl-real').addEventListener('click',()=>{st.mode='real';render()});
  RD.onRender(render);RD.onResize(render);
})();

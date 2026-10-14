// ---- Fusion lab (t-rpfu)
(function(){
  const $=id=>document.getElementById(id);
  const F=RP.D.fu;
  const METH={rrf:{name:'RRF, k',grid:[1,2,5,10,20,40,60,100,200,500,1000],def:6},
    wrrf:{name:'weighted RRF (k 60), dense weight',grid:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1],def:5},
    minmax:{name:'min-max, then weighted sum (CombSUM), dense weight',grid:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1],def:5},
    zscore:{name:'z-score, then weighted sum, dense weight',grid:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1],def:6},
    combmnz:{name:'CombMNZ (min-max), dense weight',grid:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1],def:5},
    raw:{name:'raw scores added, dense weight',grid:[0,.01,.02,.05,.1,.2,.5,.9,.95,.98,.99,1],def:6}};
  const st={ds:'scifact',q:0,ma:'rrf',pa:6,mb:'raw',pb:6,showB:false,am:'zscore',ads:'scifact'};
  const opts=Object.keys(METH).map(k=>'<option value="'+k+'">'+METH[k].name+'</option>').join('');
  $('rp-fu-ma').innerHTML=opts;$('rp-fu-mb').innerHTML=opts;$('rp-fu-am').innerHTML=opts;
  $('rp-fu-ma').value=st.ma;$('rp-fu-mb').value=st.mb;$('rp-fu-am').value=st.am;
  function setSlider(w){const m=st['m'+w],el=$('rp-fu-p'+w);el.min=0;el.max=METH[m].grid.length-1;el.step=1;el.value=st['p'+w];
    $('rp-fu-p'+w+'-l').textContent='= '+METH[m].grid[st['p'+w]]}
  function fillQ(){$('rp-fu-q').innerHTML=F[st.ds].queries.map((q,i)=>'<option value="'+i+'">'+RP.esc(q.q.length>110?q.q.slice(0,108)+'…':q.q)+'</option>').join('');st.q=0}
  const H=27;
  const cv=(c,v)=>{const a=c.curve[String(v)];return a!=null?a:c.curve[(+v).toFixed(1)]};
  function listHTML(rows,el){el.style.height=(rows.length*H+2)+'px';
    el.innerHTML=rows.map((r,i)=>'<div class="rp-row'+(r.rel?(r.rel>1?' g2':' rel'):'')+'" data-d="'+r.d+'" style="top:'+(i*H)+'px"><span class="r">'+(i+1)+'</span><span class="tt" title="'+RP.esc(r.title)+'">'+RP.esc(r.title)+'</span><span class="s">'+r.s+'</span><span class="o">'+(r.o||'')+'</span></div>').join('')}
  function render(){
    const Q=F[st.ds].queries[st.q],T=F[st.ds].titles,rel=Q.rel;
    $('rp-fu-qt').innerHTML='<b>'+(st.ds==='scifact'?'Claim':'Question')+':</b> '+RP.esc(Q.q)+' <span class="mute small">('+Object.keys(rel).length+' relevant in the corpus)</span>';
    const mk=(l,dig)=>l.slice(0,10).map(([d,s])=>({d,title:T[d]||d,s:(+s).toFixed(dig),rel:rel[d]||0}));
    listHTML(mk(Q.bm,2),$('rp-fu-bm'));listHTML(mk(Q.de,3),$('rp-fu-de'));
    const rb={},rd={};Q.bm.forEach((x,i)=>rb[x[0]]=i+1);Q.de.forEach((x,i)=>rd[x[0]]=i+1);
    const A=RP.fuse(Q.bm,Q.de,st.ma,METH[st.ma].grid[st.pa]),B=RP.fuse(Q.bm,Q.de,st.mb,METH[st.mb].grid[st.pb]);
    const nA=RP.ndcg10(A.map(x=>x[0]),rel),nB=RP.ndcg10(B.map(x=>x[0]),rel),nb=RP.ndcg10(Q.bm.map(x=>x[0]),rel),nd=RP.ndcg10(Q.de.map(x=>x[0]),rel);
    $('rp-fu-stats').innerHTML=RD.stat('BM25 alone',RP.f3(nb),'nDCG@10, this query')+RD.stat('dense alone',RP.f3(nd),'nDCG@10')+
      RD.stat('A: '+st.ma+' '+METH[st.ma].grid[st.pa],RP.f3(nA),'nDCG@10')+RD.stat('B: '+st.mb+' '+METH[st.mb].grid[st.pb],RP.f3(nB),'nDCG@10');
    // union of both top 10s, positioned by the order being shown
    const top=new Set(A.slice(0,10).map(x=>x[0]).concat(B.slice(0,10).map(x=>x[0])));
    const order=(st.showB?B:A).map(x=>x[0]).filter(d=>top.has(d));
    const sc={};(st.showB?B:A).forEach(([d,s])=>sc[d]=s);
    const el=$('rp-fu-out');
    const rows=order.map(d=>({d,title:T[d]||d,s:Math.abs(sc[d])>=100?sc[d].toFixed(0):Math.abs(sc[d])>=1?sc[d].toFixed(2):sc[d].toFixed(4),rel:rel[d]||0,o:'b'+(rb[d]||'–')+' d'+(rd[d]||'–')}));
    // keep DOM rows so that CSS moves them
    const have={};el.querySelectorAll('.rp-row').forEach(r=>have[r.dataset.d]=r);
    if(Object.keys(have).length===rows.length&&rows.every(r=>have[r.d])){rows.forEach((r,i)=>{const e=have[r.d];e.style.top=(i*H)+'px';e.querySelector('.r').textContent=i+1;e.querySelector('.s').textContent=r.s})}
    else listHTML(rows,el);
    $('rp-fu-showing').textContent='Showing '+(st.showB?'B':'A')+' ('+(st.showB?st.mb:st.ma)+'); rows = the union of both top 10s ('+rows.length+')';
    $('rp-fu-go').innerHTML=st.showB?'&#9664; Back to A':'&#9654; Animate A &#8594; B';
  }
  function plot(){
    const el=$('rp-fu-plot'),w=Math.min(860,RP.W(el)),h=260,m={l:44,r:12,t:12,b:38};
    const A=F.agg[st.ads],M=METH[st.am],g=M.grid;const models=Object.keys(A.models);
    const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
    let ys=[A.bm25];models.forEach(k=>{ys=ys.concat(g.map(v=>cv(A.models[k].methods[st.am],v)));ys.push(A.models[k].single)});
    const y0=Math.floor(Math.min(...ys)*50)/50,y1=Math.ceil(Math.max(...ys)*50)/50;
    const X=i=>m.l+(w-m.l-m.r)*i/(g.length-1),Y=v=>m.t+(h-m.t-m.b)*(1-(v-y0)/(y1-y0||1));
    let b='';for(let k=0;k<=4;k++){const v=y0+(y1-y0)*k/4;b+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RP.t(m.l-4,Y(v)+4,v.toFixed(3),{a:'end',fs:10,fill:'var(--mute)'})}
    const step=w<420?2:1;g.forEach((v,i)=>{if(i%step===0||i===g.length-1)b+=RP.t(X(i),h-m.b+14,String(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RP.t((m.l+w-m.r)/2,h-6,st.am==='rrf'?'k (log-spaced)':'weight on the dense list (0 = BM25 only, 1 = dense only)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+Y(A.bm25)+'" y2="'+Y(A.bm25)+'" stroke="var(--mute)" stroke-dasharray="4 4"/>'+RP.t(w-m.r,Y(A.bm25)-4,'BM25 '+A.bm25.toFixed(3),{a:'end',fs:10,fill:'var(--mute)'});
    models.forEach((k,j)=>{const c=A.models[k].methods[st.am];const pts=g.map((v,i)=>X(i)+','+Y(cv(c,v)));
      b+='<polyline fill="none" stroke="'+cols[j]+'" stroke-width="2" points="'+pts.join(' ')+'"/>';
      const bi=g.findIndex(v=>Math.abs(v-c.best)<1e-9);if(bi>=0)b+='<circle cx="'+X(bi)+'" cy="'+Y(c.test)+'" r="5.5" fill="none" stroke="'+cols[j]+'" stroke-width="2"/>'});
    el.innerHTML=RP.svg(w,h,b,'nDCG@10 against the fusion knob');
    $('rp-fu-leg').innerHTML=models.map((k,j)=>{const c=A.models[k].methods[st.am];return '<span><svg width="14" height="10"><line x1="0" x2="14" y1="5" y2="5" stroke="'+cols[j]+'" stroke-width="2"/></svg>'+k+': alone '+RP.f3(A.models[k].single)+', tuned '+c.best+' &#8594; '+RP.f3(c.test)+'</span>'}).join('');
  }
  RP.seg($('rp-fu-ds'),m=>{st.ds=m;fillQ();$('rp-fu-out').innerHTML='';render()});
  $('rp-fu-q').addEventListener('change',e=>{st.q=+e.target.value;$('rp-fu-out').innerHTML='';render()});
  ['a','b'].forEach(w=>{$('rp-fu-m'+w).addEventListener('change',e=>{st['m'+w]=e.target.value;st['p'+w]=METH[e.target.value].def;setSlider(w);render()});
    $('rp-fu-p'+w).addEventListener('input',e=>{st['p'+w]=+e.target.value;setSlider(w);render()})});
  $('rp-fu-go').addEventListener('click',()=>{st.showB=!st.showB;render()});
  $('rp-fu-am').addEventListener('change',e=>{st.am=e.target.value;plot()});
  RP.seg($('rp-fu-ads'),m=>{st.ads=m;plot()});
  setSlider('a');setSlider('b');fillQ();
  RP.onTab('t-rpfu',()=>{render();plot()});RP.resizeFor('t-rpfu',plot);
})();

// ---- Quality lab: do the two published classifiers agree? scatter + top-k overlap against keep fraction ----
(function(){
  const D=window.QD,Q=window.QL;if(!D||!document.getElementById('q-ag'))return;
  const SETS={run0:{name:'run0 final (our WARC, '+Q.fmt(D.docs.edu.length)+' docs)',edu:D.docs.edu,dclm:D.docs.dclm},
    fw:{name:'FineWeb CC-MAIN-2024-30, random '+Q.fmt(D.fw.edu.length),edu:D.fw.edu,dclm:D.fw.dclm},
    nemo:{name:'Nemotron-CC heads, 5 buckets × 200',edu:[].concat(...['high','medium-high','medium','medium-low','low'].map(b=>D.nemo[b].edu)),dclm:[].concat(...['high','medium-high','medium','medium-low','low'].map(b=>D.nemo[b].dclm))}};
  let set='run0',k=10,pub=false;const cache={};
  function curve(s){if(cache[s])return cache[s];const S=SETS[s],n=S.edu.length,out=[];
    const oe=S.edu.map((v,i)=>i).sort((a,b)=>S.edu[b]-S.edu[a]),od=S.dclm.map((v,i)=>i).sort((a,b)=>S.dclm[b]-S.dclm[a]);
    for(let p=1;p<=60;p++){const m=Math.max(1,Math.round(p/100*n));const A=new Set(oe.slice(0,m));let x=0;for(let j=0;j<m;j++)if(A.has(od[j]))x++;out.push({p,j:x/(2*m-x),o:x/m})}
    return cache[s]={out,rho:Q.spearman(S.edu,S.dclm)}}
  function draw(){
    const S=SETS[set],n=S.edu.length,c=curve(set);const box=document.getElementById('q-ag');const W=Q.width(box);
    // thresholds
    let te,td;if(pub){te=2.5;td=D.cut}else{const m=Math.max(1,Math.round(k/100*n));te=[...S.edu].sort((a,b)=>b-a)[m-1];td=[...S.dclm].sort((a,b)=>b-a)[m-1]}
    let q={b:0,e:0,d:0,o:0};for(let i=0;i<n;i++){const a=S.edu[i]>=te,b=S.dclm[i]>=td;if(a&&b)q.b++;else if(a)q.e++;else if(b)q.d++;else q.o++}
    const jac=q.b/Math.max(1,q.b+q.e+q.d);
    // scatter: x = FineWeb-Edu score, y = log10 DCLM P(hq)
    const w1=W<640?W:Math.floor(W*0.5)-8,h1=Math.min(300,Math.max(220,w1*0.7)),ml=40,mb=30,mt=10,mr=8;
    const xs=v=>ml+(Math.max(-0.5,Math.min(4.5,v))+0.5)/5*(w1-ml-mr),ys=v=>mt+(1-(Math.log10(Math.max(1e-5,v))+5)/5)*(h1-mt-mb);
    let b='';for(let t=0;t<=4;t++)b+='<line x1="'+xs(t)+'" x2="'+xs(t)+'" y1="'+mt+'" y2="'+(h1-mb)+'" stroke="var(--line)"/>'+Q.T(xs(t),h1-mb+13,t,{a:'middle',fs:10});
    for(let e=-5;e<=0;e++)b+='<line x1="'+ml+'" x2="'+(w1-mr)+'" y1="'+ys(Math.pow(10,e))+'" y2="'+ys(Math.pow(10,e))+'" stroke="var(--line)"/>'+Q.T(ml-4,ys(Math.pow(10,e))+3,e===0?'1':'1e'+e,{a:'end',fs:10});
    const step=n>2500?1:1;for(let i=0;i<n;i+=step){const a=S.edu[i]>=te,bb=S.dclm[i]>=td;const col=a&&bb?'var(--c3)':a?'var(--c1)':bb?'var(--c2)':'var(--dim)';
      b+='<circle cx="'+xs(S.edu[i]).toFixed(1)+'" cy="'+ys(S.dclm[i]).toFixed(1)+'" r="1.7" fill="'+col+'"/>'}
    b+='<line x1="'+xs(te)+'" x2="'+xs(te)+'" y1="'+mt+'" y2="'+(h1-mb)+'" stroke="var(--c1)" stroke-dasharray="4 3"/>';
    b+='<line x1="'+ml+'" x2="'+(w1-mr)+'" y1="'+ys(td)+'" y2="'+ys(td)+'" stroke="var(--c2)" stroke-dasharray="4 3"/>';
    b+=Q.T((ml+w1)/2,h1-2,'FineWeb-Edu classifier score',{a:'middle',fs:10.5});
    const sc=Q.svg(w1,h1,b,'Scatter of FineWeb-Edu score against DCLM probability');
    // overlap curve
    const w2=w1,h2=h1,xl=v=>ml+(v-1)/59*(w2-ml-mr),yl=v=>mt+(1-v)*(h2-mt-mb);let b2='';
    for(let t=0;t<=1.001;t+=0.25)b2+='<line x1="'+ml+'" x2="'+(w2-mr)+'" y1="'+yl(t)+'" y2="'+yl(t)+'" stroke="var(--line)"/>'+Q.T(ml-4,yl(t)+3,Math.round(t*100)+'%',{a:'end',fs:10});
    [1,10,20,30,40,50,60].forEach(p=>b2+=Q.T(xl(p),h2-mb+13,p+'%',{a:'middle',fs:10}));
    b2+='<polyline fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4 3" points="'+c.out.map(o=>xl(o.p)+','+yl((o.p/100)/(2-o.p/100))).join(' ')+'"/>';
    b2+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+c.out.map(o=>xl(o.p)+','+yl(o.j)).join(' ')+'"/>';
    // Nemotron-CC published point: 10.1% of the union in both (CC-MAIN-2021-21, Table 8), keep fractions about 8% and 11% of tokens (Table 9)
    b2+='<circle cx="'+xl(9.5)+'" cy="'+yl(0.101)+'" r="4.5" fill="none" stroke="var(--c4)" stroke-width="2"/>'+Q.T(xl(9.5)+7,yl(0.101)-6,'Nemotron-CC, published',{fs:10,fill:'var(--c4)'});
    if(!pub){const o=c.out[k-1];b2+='<line x1="'+xl(k)+'" x2="'+xl(k)+'" y1="'+mt+'" y2="'+(h2-mb)+'" stroke="var(--ink)" stroke-width="1"/><circle cx="'+xl(k)+'" cy="'+yl(o.j)+'" r="4" fill="var(--acc)"/>'}
    b2+=Q.T((ml+w2)/2,h2-2,'share kept by each classifier (top slice)',{a:'middle',fs:10.5});
    const lc=Q.svg(w2,h2,b2,'Jaccard overlap of the two top slices against the share kept');
    box.innerHTML='<div class="q-two"><div><div class="small mute">Each dot is a document. Blue: kept only by FineWeb-Edu; orange: only by DCLM; green: both; grey: neither.</div>'+sc+
      '<div class="small mute">y axis: DCLM P(hq), log scale.</div></div><div><div class="small mute">Blue line: the two kept sets\' overlap (intersection over union) as both keep the same top share; dashed: what two unrelated random filters would give.</div>'+lc+'</div></div>';
    document.getElementById('q-ag-stats').innerHTML=
      '<div class="stat"><div class="k">kept by both</div><div class="v">'+Q.fmt(q.b)+'</div><div class="d">FineWeb-Edu only '+Q.fmt(q.e)+', DCLM only '+Q.fmt(q.d)+'</div></div>'+
      '<div class="stat"><div class="k">overlap of kept sets</div><div class="v">'+Q.pct(jac)+'</div><div class="d">intersection over union (Nemotron-CC: 10.1%)</div></div>'+
      '<div class="stat"><div class="k">rank correlation</div><div class="v">'+Q.fmt(c.rho,2)+'</div><div class="d">Spearman, all '+Q.fmt(n)+' documents</div></div>';
    document.getElementById('q-ag-k').textContent=pub?'published cut-offs':(k+'% each');
  }
  Q.seg(document.getElementById('q-ag-set'),m=>{set=m;draw()});
  const sl=document.getElementById('q-ag-sl');sl.addEventListener('input',()=>{k=+sl.value;pub=false;document.getElementById('q-ag-pub').checked=false;draw()});
  document.getElementById('q-ag-pub').addEventListener('change',e=>{pub=e.target.checked;draw()});
  Q.onRender(draw);Q.onResize(draw);
})();

// ---- Quality lab: smaller measured charts (hand labels, our fastText learning curve, Nemotron buckets, DCLM vs Llama 3 labels, CCNet) ----
(function(){
  const D=window.QD,Q=window.QL;if(!D)return;const S=D.S;
  function hbars(id,rows,o){const el=document.getElementById(id);if(!el)return;o=o||{};
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm">'+r.nm+'</div><div class="track">'+
      (r.parts?r.parts.map(p=>'<span class="fill" style="width:'+(100*p.v).toFixed(1)+'%;background:'+p.c+'" title="'+Q.esc(p.t||'')+'"></span>').join(''):
       '<span class="fill" style="width:'+(100*Math.min(1,r.v/(o.max||1))).toFixed(1)+'%;background:'+(r.c||'var(--acc)')+'"></span>')+'</div><div class="val">'+r.val+'</div></div>').join('')}
  // 1) hand labels per stratum: yes / unsure / no
  function labels(){const st=S.labels.strata;const SN={S1:'Both drop, edu < 1.5',S2:'Both drop, edu 1.5 to 2.5',S3:'FineWeb-Edu keeps, DCLM drops',S4:'DCLM keeps, FineWeb-Edu drops',S5:'Both keep'};
    hbars('q-lab-bars',['S1','S2','S3','S4','S5'].map(s=>{const x=st[s];return {nm:SN[s]+' <span class="small mute">('+Q.fmt(x.N)+' docs)</span>',
      parts:[{v:x.y/x.n,c:'var(--good)',t:'worth training on'},{v:x.u/x.n,c:'var(--dim)',t:'unsure'},{v:x.no/x.n,c:'var(--bad)',t:'not worth it'}],
      val:x.y+' / '+x.u+' / '+x.no}}))}
  // 2) learning curve of our fastText (F1 on 23,200 held-out rows) with the published classifier's F1 on 1,500 of them
  function curve(){const el=document.getElementById('q-ft-curve');if(!el)return;const W=Math.min(Q.width(el),640),H=230,ml=44,mr=12,mt=10,mb=34;
    const C=D.ft.curve,xs=n=>ml+(Math.log10(n)-Math.log10(C[0].n))/(Math.log10(C[C.length-1].n)-Math.log10(C[0].n))*(W-ml-mr),ys=v=>mt+(1-(v-0.2)/0.7)*(H-mt-mb);
    let b='';for(let v=0.2;v<=0.901;v+=0.1)b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+Q.T(ml-4,ys(v)+3,Math.round(v*100)+'%',{a:'end',fs:10});
    C.forEach((c,ci)=>{if(ci%2===0||ci===C.length-1)b+=Q.T(xs(c.n),H-mb+13,c.n>=1000?Math.round(c.n/1000)+'k':c.n,{a:'middle',fs:10});c.f1.forEach(f=>b+='<circle cx="'+xs(c.n)+'" cy="'+ys(f)+'" r="3" fill="var(--acc)" opacity=".55"/>')});
    const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;b+='<polyline fill="none" stroke="var(--acc)" stroke-width="2" points="'+C.map(c=>xs(c.n)+','+ys(mean(c.f1))).join(' ')+'"/>';
    const pf=S.edu_vs_llama.binary.f1;b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+ys(pf)+'" y2="'+ys(pf)+'" stroke="var(--c3)" stroke-dasharray="5 3"/>'+Q.T(ml+4,ys(pf)-5,'published FineWeb-Edu classifier: '+Q.pct(pf,0),{fs:10.5,fill:'var(--c3)'});
    b+=Q.T((ml+W)/2,H-2,'Llama 3 annotations used for training (log scale)',{a:'middle',fs:10.5});
    el.innerHTML=Q.svg(W,H,b,'F1 of our fastText classifier against training-set size')}
  // 3) Nemotron-CC buckets: median scores and pass rates
  function nemo(){const B=['high','medium-high','medium','medium-low','low'];const m=S.nemo_median;
    hbars('q-nemo-dclm',B.map(b=>({nm:b,v:m[b].dclm_pass,c:'var(--c2)',val:Q.pct(m[b].dclm_pass,0)+' <span class="small mute">median P '+m[b].dclm.toFixed(3)+'</span>'})));
    hbars('q-nemo-edu',B.map(b=>({nm:b,v:m[b].edu_pass,c:'var(--c1)',val:Q.pct(m[b].edu_pass,0)+' <span class="small mute">median '+m[b].edu.toFixed(2)+'</span>'})))}
  // 4) DCLM pass rate by the Llama 3 educational score (232,000 annotated pages)
  function annot(){hbars('q-annot-bars',S.annot_all.by_score.filter(r=>r.n>0).map(r=>({nm:'Llama 3 score '+r.llama+' <span class="small mute">('+Q.fmt(r.n)+')</span>',v:r.dclm_pass,c:'var(--c2)',val:Q.pct(r.dclm_pass,0)})))}
  // 5) CCNet perplexity histogram with the head / middle / tail cut-offs
  function ccnet(){const el=document.getElementById('q-cc-hist');if(!el||D.docs.ppl[0]==null)return;const W=Math.min(Q.width(el),640),H=200,ml=36,mr=10,mt=10,mb=34;
    const lo=1.5,hi=4,nb=50,h=new Array(nb).fill(0);D.docs.ppl.forEach(p=>{if(p==null)return;const v=Math.log10(p);const k=Math.max(0,Math.min(nb-1,Math.floor((v-lo)/(hi-lo)*nb)));h[k]++});
    const mx=Math.max(...h),xs=v=>ml+(v-lo)/(hi-lo)*(W-ml-mr),bw=(W-ml-mr)/nb;let b='';
    h.forEach((c,k)=>{const v=lo+(k+0.5)*(hi-lo)/nb,p=Math.pow(10,v);const col=p<340?'var(--c3)':p<520?'var(--c5)':'var(--dim)';const y=mt+(1-c/mx)*(H-mt-mb);b+='<rect x="'+(ml+k*bw+0.5)+'" y="'+y+'" width="'+(bw-1)+'" height="'+(H-mb-y)+'" fill="'+col+'"/>'});
    [50,100,200,340,520,1000,3000].forEach(p=>b+=Q.T(xs(Math.log10(p)),H-mb+13,p,{a:'middle',fs:10}));
    [340,520].forEach(p=>b+='<line x1="'+xs(Math.log10(p))+'" x2="'+xs(Math.log10(p))+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>');
    b+=Q.T((ml+W)/2,H-2,'CCNet perplexity (log scale)',{a:'middle',fs:10.5});
    el.innerHTML=Q.svg(W,H,b,'Histogram of CCNet perplexity on run0 final')}
  const all=()=>{labels();curve();nemo();annot();ccnet()};Q.onRender(all);Q.onResize(all);
})();

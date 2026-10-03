// ---- Reading: inline numbers, the accuracy trap table, multi-class averaging, paraphrase against negation, bootstrap ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f,esc=RD.esc;
  // shared SST-2 views
  const Y=[...EM.sst2.y].map(Number),P={lr:MX.prob(EM.sst2.logit.lr),nb:MX.prob(EM.sst2.logit.nb),nbc:MX.prob(EM.sst2.logit.nbc)};
  window.SST={Y,P};
  const sub=(rare,m)=>{const idx=MX.sst(rare);return {y:idx.map(i=>Y[i]),p:idx.map(i=>P[m][i]),idx}};
  // ---- inline numbers ----
  const all=sub(false,'lr'),rare=sub(true,'lr'),nb=sub(false,'nb');
  const V={rocAll:F(MX.auc(all.y,all.p),3),rocRare:F(MX.auc(rare.y,rare.p),3),apAll:F(MX.curves(all.y,all.p).ap,3),apRare:F(MX.curves(rare.y,rare.p).ap,3),
    accLr:RD.pct(MX.rates(MX.confusion(all.y,all.p,.5)).acc),accNb:RD.pct(MX.rates(MX.confusion(nb.y,nb.p,.5)).acc)};
  document.querySelectorAll('[data-v]').forEach(e=>{if(V[e.dataset.v]!=null)e.textContent=V[e.dataset.v]});
  // ---- the accuracy trap ----
  (function(){if(!$('rd-trapT'))return;const {y,p}=rare;
    const ths=[...new Set(p)].sort((a,b)=>a-b);let best={mcc:-2,th:.5};ths.forEach(t=>{const r=MX.rates(MX.confusion(y,p,t));if(r.mcc>best.mcc)best={mcc:r.mcc,th:t}});
    const rows=[['Always negative',MX.confusion(y,p,2)],['Logistic regression, threshold 0.5',MX.confusion(y,p,.5)],['Same model, best-MCC threshold '+F(best.th,2),MX.confusion(y,p,best.th)]];
    let h='<table class="mt"><thead><tr><th>Rule (45 positives, 428 negatives)</th><th class="num">TP / FP</th><th class="num">Accuracy</th><th class="num">Precision</th><th class="num">Recall</th><th class="num">F1</th><th class="num">MCC</th><th class="num">Balanced acc.</th></tr></thead><tbody>';
    rows.forEach(([n,c])=>{const r=MX.rates(c);h+='<tr><td>'+n+'</td><td class="num">'+c.tp+' / '+c.fp+'</td><td class="num">'+RD.pct(r.acc)+'</td><td class="num">'+(c.tp+c.fp?F(r.prec,3):'undefined')+'</td><td class="num">'+F(r.rec,3)+'</td><td class="num">'+F(r.f1,3)+'</td><td class="num">'+F(r.mcc,3)+'</td><td class="num">'+F(r.bacc,3)+'</td></tr>'});
    $('rd-trapT').innerHTML=h+'</tbody></table>';
  })();
  // ---- multi-class averaging ----
  (function(){if(!$('rd-mc'))return;const G=EM.glass,M=MX.multi(G.cm),K=G.classes.length;let av='macro';
    const names=['building window, non-float','building window, float','headlamps','vehicle window, float','containers','tableware'];
    function cmDraw(){const box=$('rd-mcCm'),W=Math.min(RD.width(box),360),lab=Math.min(118,W*0.36),cs=(W-lab-4)/K,H=cs*K+4;
      const mx=Math.max(...G.cm.flat());let s='<svg viewBox="0 0 '+W+' '+(H+4)+'" width="'+W+'" height="'+(H+4)+'" role="img" aria-label="Glass confusion matrix">';
      for(let i=0;i<K;i++){s+='<text x="'+(lab-4)+'" y="'+(i*cs+cs/2+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+esc(names[i].length>20&&W<340?names[i].slice(0,18)+'.':names[i])+' ('+M.per[i].sup+')</text>';
        for(let j=0;j<K;j++){const v=G.cm[i][j],a=v?0.15+0.85*v/mx:0;s+='<rect x="'+(lab+j*cs)+'" y="'+(i*cs)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3" fill="'+(i===j?'var(--c3)':'var(--c2)')+'" fill-opacity="'+a+'" stroke="var(--line)"/>'+
          (v?'<text x="'+(lab+j*cs+cs/2-1)+'" y="'+(i*cs+cs/2+4)+'" font-size="11" text-anchor="middle">'+v+'</text>':'')}}
      box.innerHTML=s+'</svg>'}
    function barDraw(){const box=$('rd-mcB'),W=RD.width(box),wts=M.per.map(c=>av==='macro'?1/K:av==='weighted'?c.sup/M.N:null);
      let h='<div class="bars">';M.per.forEach((c,i)=>{const w=av==='micro'?'n/a':RD.pct(wts[i],0);
        h+='<div class="row"><span class="nm" title="'+esc(names[i])+'">'+esc(names[i])+'</span><span class="track"><span class="fill" style="width:'+(100*c.f).toFixed(1)+'%;background:var(--c1);opacity:'+(av==='micro'?0.35:Math.min(1,0.25+wts[i]*3.2))+'"></span></span><span class="val">'+F(c.f,2)+' <span class="mute small">'+w+'</span></span></div>'});
      box.innerHTML=h+'</div>'+(av==='micro'?'<p class="small mute">Micro does not average class F1 at all: it pools TP, FP and FN over classes first, so it equals accuracy, '+F(M.acc,3)+'.</p>':'<p class="small mute">Grey number: the class weight. '+(av==='macro'?'Every class 1/6.':'Weight = support / 214.')+'</p>');
      const f=a=>F(M[a].f,3);
      $('rd-mcN').innerHTML=RD.stat('Macro F1',f('macro'),'mean of six class F1')+RD.stat('Weighted F1',f('weighted'),'weighted by support')+RD.stat('Micro F1',f('micro'),'= accuracy, pooled counts')+RD.stat('Macro precision / recall',F(M.macro.p,3)+' / '+F(M.macro.r,3),'weighted: '+F(M.weighted.p,3)+' / '+F(M.weighted.r,3));
      [...$('rd-mcN').children].forEach((e,i)=>{e.style.outline=(['macro','weighted','micro'][i]===av)?'2px solid var(--acc)':''})}
    $('rd-mcM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;av=b.dataset.a;$('rd-mcM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));barDraw()});
    const draw=()=>{cmDraw();barDraw()};RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  })();
  // ---- paraphrase against negation ----
  (function(){if(!$('rd-pnSvg'))return;const C=Object.fromEntries(EM.text.cands.map(c=>[c.key,c]));const a=C.para,b=C.neg;
    const rows=[['BLEU',c=>c.lib.bleu/100],['chrF',c=>c.lib.chrf/100],['ROUGE-1 F1',c=>c.lib.r1],['ROUGE-2 F1',c=>c.lib.r2],['ROUGE-L F1',c=>c.lib.rl],['METEOR',c=>c.lib.metwn],['BERTScore F1',c=>c.bs.Fr]];
    function draw(){const box=$('rd-pnSvg'),W=RD.width(box),lab=Math.min(96,W*0.27),bw=W-lab-46,rh=30,H=rows.length*rh+18;
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Scores of a paraphrase and a negation">';
      rows.forEach(([n,f],i)=>{const y=i*rh+4,va=f(a),vb=f(b);s+='<text x="'+(lab-6)+'" y="'+(y+15)+'" font-size="11.5" text-anchor="end">'+n+'</text>'+
        '<rect x="'+lab+'" y="'+y+'" width="'+(bw*va).toFixed(1)+'" height="11" rx="2" fill="var(--c3)"/><text x="'+(lab+bw*va+4)+'" y="'+(y+10)+'" font-size="10.5" fill="var(--mute)">'+F(va,2)+'</text>'+
        '<rect x="'+lab+'" y="'+(y+13)+'" width="'+(bw*vb).toFixed(1)+'" height="11" rx="2" fill="var(--c2)"/><text x="'+(lab+bw*vb+4)+'" y="'+(y+23)+'" font-size="10.5" fill="var(--mute)">'+F(vb,2)+'</text>'});
      s+='<text x="'+lab+'" y="'+(H-3)+'" font-size="10" fill="var(--mute)">0</text><text x="'+(lab+bw)+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">1</text>';
      box.innerHTML=s+'</svg>'+'<p class="small mute">Raw BERTScore F1: paraphrase '+F(a.bs.F,3)+', negation '+F(b.bs.F,3)+'. METEOR with WordNet, from NLTK.</p>'}
    RD.onRender(draw);draw();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,120)});
  })();
  // ---- bootstrap ----
  (function(){if(!$('rd-bs'))return;let seed=1;const perm=EM.sst2.perm,cL=perm.map(i=>(P.lr[i]>=.5)===(Y[i]===1)?1:0),cN=perm.map(i=>(P.nb[i]>=.5)===(Y[i]===1)?1:0);
    function run(){const n=+$('rd-bsN').value,B=+$('rd-bsB').value,r=MX.rng(seed*7919+n);$('rd-bsNv').textContent=n;
      const a=cL.slice(0,n),b=cN.slice(0,n),ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n;const dP=[],dU=[];
      for(let k=0;k<B;k++){let sa=0,sb=0,ua=0,ub=0;for(let i=0;i<n;i++){const j=Math.floor(r()*n);sa+=a[j];sb+=b[j];ua+=a[Math.floor(r()*n)];ub+=b[Math.floor(r()*n)]}
        dP.push((sb-sa)/n);dU.push((ub-ua)/n)}
      const ci=d=>[MX.quant(d,.025),MX.quant(d,.975)],cp=ci(dP),cu=ci(dU),se=p=>Math.sqrt(p*(1-p)/n);
      draw(dP,dU,mb-ma,cp,cu,n);
      const pt=v=>(v>=0?'+':'&minus;')+F(Math.abs(100*v),1);
      $('rd-bsO').innerHTML=RD.stat('Accuracy, logistic regression',RD.pct(ma),'&plusmn; '+F(196*se(ma),1)+' points (1.96 SE)')+RD.stat('Accuracy, naive Bayes',RD.pct(mb),'&plusmn; '+F(196*se(mb),1)+' points')+
        RD.stat('Difference NB &minus; LR',pt(mb-ma)+' points',(cp[0]>0||cp[1]<0)?'paired interval excludes 0':'paired interval includes 0')+RD.stat('Paired 95% interval',pt(cp[0])+' to '+pt(cp[1]),'resample sentences, both models together')+RD.stat('Unpaired 95% interval',pt(cu[0])+' to '+pt(cu[1]),'resample each model separately: '+F(100*(cu[1]-cu[0])/(cp[1]-cp[0]),0)+'% as wide');}
    function draw(dP,dU,obs,cp,cu,n){const box=$('rd-bsSvg'),W=RD.width(box),H=170,ml=10,mr=10,step=1/n;
      // differences live on a grid of 1/n, so bins span a whole number of grid steps (no empty alternate bins)
      let lo=Math.min(MX.quant(dU,.002),-0.02),hi=Math.max(MX.quant(dU,.998),0.02);const kk=Math.max(1,Math.ceil((hi-lo)/step/40)),bwv=kk*step;lo=(Math.floor(lo/bwv)-0.5)*bwv;hi=(Math.ceil(hi/bwv)+0.5)*bwv;
      const x=v=>ml+(W-ml-mr)*(v-lo)/(hi-lo),nb=Math.round((hi-lo)/bwv),hist=d=>{const h=new Array(nb).fill(0);d.forEach(v=>{const k=Math.min(nb-1,Math.max(0,Math.floor((v-lo)/bwv+1e-9)));h[k]++});return h};
      const hp=hist(dP),hu=hist(dU),mx=Math.max(...hp,...hu),bw=(W-ml-mr)/nb,y0=H-30,sc=(y0-14)/mx;
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Bootstrap distribution of the accuracy difference">';
      hu.forEach((c,k)=>{s+='<rect x="'+(ml+k*bw).toFixed(1)+'" y="'+(y0-c*sc).toFixed(1)+'" width="'+(bw-1).toFixed(1)+'" height="'+(c*sc).toFixed(1)+'" fill="var(--mute)" fill-opacity=".25"/>'});
      hp.forEach((c,k)=>{s+='<rect x="'+(ml+k*bw+bw*0.2).toFixed(1)+'" y="'+(y0-c*sc).toFixed(1)+'" width="'+(bw*0.6).toFixed(1)+'" height="'+(c*sc).toFixed(1)+'" fill="var(--c1)" fill-opacity=".8"/>'});
      s+='<line x1="'+x(0)+'" x2="'+x(0)+'" y1="8" y2="'+y0+'" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="'+x(0)+'" y="8" font-size="10" text-anchor="middle">0</text>';
      s+='<line x1="'+x(cp[0])+'" x2="'+x(cp[1])+'" y1="'+(y0+8)+'" y2="'+(y0+8)+'" stroke="var(--c1)" stroke-width="3"/><line x1="'+x(cu[0])+'" x2="'+x(cu[1])+'" y1="'+(y0+15)+'" y2="'+(y0+15)+'" stroke="var(--mute)" stroke-width="3"/>';
      s+='<circle cx="'+x(obs)+'" cy="'+(y0+8)+'" r="4" fill="var(--c2)"/>';
      s+='<text x="'+ml+'" y="'+(H-2)+'" font-size="10" fill="var(--mute)">'+(lo*100).toFixed(0)+' pts</text><text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">+'+(hi*100).toFixed(0)+' pts</text>';
      box.innerHTML=s+'</svg><div class="leg"><span><i style="background:var(--c1)"></i>paired resamples, 95% interval (upper line)</span><span><i style="background:var(--mute);opacity:.5"></i>unpaired resamples, 95% interval (lower line)</span><span><i style="background:var(--c2);border-radius:50%"></i>observed difference</span></div>'}
    let t;const go=()=>{clearTimeout(t);t=setTimeout(run,60)};
    $('rd-bsN').addEventListener('input',()=>{$('rd-bsNv').textContent=$('rd-bsN').value;go()});$('rd-bsB').addEventListener('change',go);$('rd-bsR').addEventListener('click',()=>{seed++;go()});
    RD.onRender(run);run();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(run,150)});
  })();
})();

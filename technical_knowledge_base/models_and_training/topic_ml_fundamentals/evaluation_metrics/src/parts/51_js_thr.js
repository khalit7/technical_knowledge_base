// ---- Threshold lab (ids th-) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f,esc=RD.esc;if(!$('t-thr'))return;
  const {Y,P}=window.SST;let m='lr',d='all',cell='fp',cache={},tEx=null,ax='p';
  function data(){const k=m+d;if(cache[k])return cache[k];const idx=MX.sst(d==='rare'),y=idx.map(i=>Y[i]),p=idx.map(i=>P[m][i]);
    const cv=MX.curves(y,p),rel=MX.reliability(y,p);return cache[k]={idx,y,p,cv,auc:MX.auc(y,p),rel,brier:MX.brier(y,p),ll:MX.logloss(y,p)}}
  const th=()=>tEx!=null?tEx:+$('th-T').value/1000;
  function best(key){const D=data();let b={v:-9,t:.5};[...new Set(D.p)].sort((a,b)=>a-b).forEach(t=>{const r=MX.rates(MX.confusion(D.y,D.p,t));if(r[key]>b.v)b={v:r[key],t}});return b.t}
  function plot(id,pts,pt,xl,yl,diag){const box=$(id),W=Math.min(RD.width(box),320),S=W,ml=32,mr=8,mt=8,mb=28,H=S;const x=v=>ml+(S-ml-mr)*v,y=v=>mt+(H-mt-mb)*(1-v);
    let s='<svg viewBox="0 0 '+S+' '+H+'" width="'+S+'" height="'+H+'" role="img" aria-label="'+xl+' against '+yl+'">';
    for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+F(v,2)+'</text><text x="'+x(v)+'" y="'+(H-15)+'" font-size="10" text-anchor="'+(v>0.99?'end':v<0.01?'start':'middle')+'" fill="var(--mute)">'+F(v,2)+'</text>';
    s+='<text x="'+x(1)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+xl+'</text>';
    if(diag==='d')s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(0)+'" y2="'+y(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';else if(diag!=null)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+y(diag)+'" y2="'+y(diag)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    s+='<path d="'+pts.map((p,k)=>(k?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    if(pt)s+='<circle cx="'+x(pt[0])+'" cy="'+y(pt[1])+'" r="5" fill="var(--c2)" stroke="var(--bg)"/>';return {s,x,y,H,S}}
  function draw(){const D=data(),t=th(),c=MX.confusion(D.y,D.p,t),r=MX.rates(c);$('th-Tv').textContent=(t>0.99&&t<1)||(t<0.01&&t>0)?t.toPrecision(5):F(t,3);
    const cl=(k,lab,sub)=>'<button class="'+k+(cell===k?' sel':'')+'" data-c="'+k+'"><b>'+c[k]+'</b><span>'+lab+'</span><br><span>'+sub+'</span></button>';
    $('th-CM').innerHTML='<div></div><div class="h">predicted positive</div><div class="h">predicted negative</div><div class="rh">actually<br>positive<br>('+(c.tp+c.fn)+')</div>'+cl('tp','true positive','')+cl('fn','false negative','missed')+'<div class="rh">actually<br>negative<br>('+(c.fp+c.tn)+')</div>'+cl('fp','false positive','false alarm')+cl('tn','true negative','');
    // histogram by class
    (function(){const box=$('th-H'),W=RD.width(box),H=170,ml=6,mr=6,nb=25,hp=new Array(nb).fill(0),hn=new Array(nb).fill(0);
      // axis position in [0,1]: the probability itself, or log-odds from -10 to +10 (clipped at the ends)
      const L=10,pos=v=>ax==='p'?v:Math.min(1,Math.max(0,(Math.log(Math.max(v,1e-300)/Math.max(1-v,1e-300))+L)/(2*L)));
      D.p.forEach((v,i)=>{const k=Math.min(nb-1,Math.floor(pos(v)*nb));(D.y[i]?hp:hn)[k]++});
      const mx=Math.max(...hp,...hn),mid=H/2,sc=(mid-14)/mx,bw=(W-ml-mr)/nb,x=v=>ml+(W-ml-mr)*pos(v);
      let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Score histogram by class">';
      for(let k=0;k<nb;k++){s+='<rect x="'+(ml+k*bw+0.5).toFixed(1)+'" y="'+(mid-1-hp[k]*sc).toFixed(1)+'" width="'+(bw-1).toFixed(1)+'" height="'+(hp[k]*sc).toFixed(1)+'" fill="var(--c1)" fill-opacity="'+((k+0.5)/nb>=pos(t)?0.9:0.35)+'"/>';
        s+='<rect x="'+(ml+k*bw+0.5).toFixed(1)+'" y="'+(mid+1)+'" width="'+(bw-1).toFixed(1)+'" height="'+(hn[k]*sc).toFixed(1)+'" fill="var(--c2)" fill-opacity="'+((k+0.5)/nb>=pos(t)?0.9:0.35)+'"/>'}
      s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="4" y2="'+(H-14)+'" stroke="var(--ink)" stroke-width="2"/><text x="'+ml+'" y="11" font-size="10" fill="var(--mute)">positives ('+mx+' in tallest bar)</text><text x="'+ml+'" y="'+(H-16)+'" font-size="10" fill="var(--mute)">negatives</text>';
      s+='<text x="'+ml+'" y="'+(H-2)+'" font-size="10" fill="var(--mute)">'+(ax==='p'?'p = 0':'log-odds &le; &minus;10')+'</text><text x="'+(W-mr)+'" y="'+(H-2)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(ax==='p'?'p = 1':'&ge; +10')+'</text>';box.innerHTML=s+'</svg>'})();
    const prev=(c.tp+c.fn)/r.n;
    $('th-S').innerHTML=RD.stat('Accuracy',RD.pct(r.acc),'always negative: '+RD.pct(1-prev))+RD.stat('Precision',c.tp+c.fp?F(r.prec,3):'undefined','TP / (TP + FP)')+RD.stat('Recall (TPR)',F(r.rec,3),'TP / (TP + FN)')+RD.stat('F1',F(r.f1,3),'harmonic mean of P and R')+
      RD.stat('Specificity',F(r.spec,3),'FPR '+F(r.fpr,3))+RD.stat('MCC',F(r.mcc,3),'0 = no better than chance')+RD.stat('Balanced accuracy',F(r.bacc,3),'(recall + specificity) / 2')+RD.stat('F2 / F0.5',F(fb(r,2),3)+' / '+F(fb(r,.5),3),'recall or precision weighted');
    plot2('th-R',D.cv.roc,[r.fpr,r.rec],'false positive rate','recall','d');plot2('th-P',D.cv.pr,[r.rec,r.prec],'recall','precision',prev);
    // reliability
    (function(){const o=plot('th-C',[[0,0],[1,1]],null,'mean predicted','observed rate',null);let s=o.s;D.rel.bins.forEach((b,j)=>{if(!b.n)return;const r0=Math.max(2,Math.min(9,Math.sqrt(b.n)));s+='<circle cx="'+o.x(b.conf).toFixed(1)+'" cy="'+o.y(b.frac).toFixed(1)+'" r="'+r0.toFixed(1)+'" fill="var(--c3)" fill-opacity=".75"><title>'+b.n+' sentences</title></circle>'});
      s=s.replace('stroke="var(--c1)" stroke-width="2.2"','stroke="var(--mute)" stroke-dasharray="4 3" stroke-width="1.5"');$('th-C').innerHTML=s+'</svg>'})();
    $('th-S2').innerHTML=RD.stat('ROC-AUC',F(D.auc,3),'threshold-free')+RD.stat('Average precision',F(D.cv.ap,3),'chance = '+F(prev,3))+RD.stat('Log-loss',F(D.ll,3),'cross entropy of p')+RD.stat('Brier',F(D.brier,3),'mean (p &minus; y)&sup2;')+RD.stat('ECE',F(D.rel.ece,3),'10 equal bins; dot area = bin size');
    examples(D,t)}
  function plot2(id,pts,pt,xl,yl,diag){const o=plot(id,pts,pt,xl,yl,diag);$(id).innerHTML=o.s+'</svg>'}
  const fb=(r,b)=>r.prec+r.rec?(1+b*b)*r.prec*r.rec/(b*b*r.prec+r.rec):0;
  function examples(D,t){const L=[];D.idx.forEach((i,k)=>{const pos=D.y[k]===1,hat=D.p[k]>=t,cc=pos?(hat?'tp':'fn'):(hat?'fp':'tn');if(cc===cell)L.push([D.p[k],EM.sst2.text[i]])});
    const conf=cell==='tp'||cell==='fp';L.sort((a,b)=>conf?b[0]-a[0]:a[0]-b[0]);
    const nm={tp:'True positives',fp:'False positives (negative reviews flagged positive)',fn:'False negatives (positive reviews missed)',tn:'True negatives'}[cell];
    $('th-Eh').textContent=nm+': '+L.length+' sentences, the '+Math.min(8,L.length)+' scored most confidently '+(conf?'positive':'negative')+' shown';
    $('th-E').innerHTML=L.slice(0,8).map(([p,s])=>'<li><span class="p">p '+F(p,3)+'</span><span>'+esc(s)+'</span></li>').join('')}
  $('th-T').addEventListener('input',()=>{tEx=null;draw()});
  $('th-X').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ax=b.dataset.x;$('th-X').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('th-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tEx=null;m=b.dataset.m;$('th-M').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('th-D').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tEx=null;d=b.dataset.d;$('th-D').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('th-CM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cell=b.dataset.c;draw()});
  document.querySelector('#t-thr .pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.th;const t=v==='0.5'?.5:best(v);tEx=t;$('th-T').value=Math.round(Math.min(1,Math.max(0,t))*1000);draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-thr']=window.TAB_RENDER['t-thr']||[]).push(draw);
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-thr').hidden)draw()},150)});
})();

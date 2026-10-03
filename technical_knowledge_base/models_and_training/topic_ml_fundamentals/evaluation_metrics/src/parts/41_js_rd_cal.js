// ---- Reading, section 3: calibrating naive Bayes, before and after (real SST-2 predictions) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f;if(!$('rd-cal'))return;
  const {Y,P}=window.SST,n=Y.length;
  // deterministic vertical jitter per sentence
  const jit=Y.map((_,i)=>{let h=(i+1)*2654435761>>>0;h^=h>>>13;h=Math.imul(h,1274126177)>>>0;return (h%1000)/1000});
  const stats=m=>{const p=P[m];return {acc:MX.rates(MX.confusion(Y,p,.5)).acc,auc:MX.auc(Y,p),brier:MX.brier(Y,p),ll:MX.logloss(Y,p),rel:MX.reliability(Y,p)}};
  const S={nb:stats('nb'),nbc:stats('nbc'),lr:stats('lr')};
  const steps=[
    {m:'nb',bins:false,gap:false,t:'Naive Bayes, as trained',d:'Each dot is one of the 872 validation sentences, placed at the probability of "positive" the model gives it; blue dots are positive reviews, orange negative. Most dots sit at the two edges: the model is almost always nearly certain.'},
    {m:'nb',bins:true,gap:false,t:'Bin by confidence',d:'Cut the probability axis into 10 equal bins. Below, each bin\'s green bar is the share of its sentences that really are positive; a calibrated model\'s bars would reach the diagonal.'},
    {m:'nb',bins:true,gap:true,t:'The gaps are the calibration error',d:'Sentences given about 0.98 are positive far less often than 98% of the time, and those given 0.02 far more often than 2%. ECE is the gap per bin weighted by the bin\'s share of sentences.'},
    {m:'nbc',bins:false,gap:false,t:'Isotonic calibration moves every dot',d:'A monotone step function, fitted on cross-validated training predictions, maps each probability to the observed frequency for scores like it. Order is kept, so the ranking (ROC-AUC) barely moves; the dots leave the edges.'},
    {m:'nbc',bins:true,gap:true,t:'Re-binned: much closer, not perfect',d:'ECE falls from 0.135 to 0.076, log-loss from 0.85 to 0.45, the Brier score from 0.157 to 0.142; accuracy moves by half a point because a few sentences cross 0.5. The top bins are still overconfident: the map was fitted on training phrases, many of them short fragments, and these are full sentences, so calibration learned on one distribution only partly transfers to another.'},
    {m:'lr',bins:true,gap:true,t:'For reference: logistic regression',d:'Trained by minimising log-loss, logistic regression is close to calibrated without any correction, and has the best Brier score of the three while being the least accurate at 0.5.'}];
  let built=0,W0=0;
  function build(){const box=$('rd-calSvg'),W=RD.width(box);W0=W;const ml=34,mr=10,sh=150,rh=170,H=sh+rh+40;
    const x=v=>ml+(W-ml-mr)*v;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Predicted probabilities and reliability diagram">';
    s+='<text x="'+ml+'" y="11" font-size="10.5" fill="var(--mute)">positive reviews</text><text x="'+ml+'" y="'+(sh-2)+'" font-size="10.5" fill="var(--mute)">negative reviews</text>';
    s+='<g id="rd-calBins"></g><g id="rd-calDots">';
    for(let i=0;i<n;i++)s+='<circle r="2.1" cx="0" cy="0" fill="var('+(Y[i]?'--c1':'--c2')+')" fill-opacity=".55" class="cd"/>';
    s+='</g>';
    const ry0=sh+20,ry=v=>ry0+rh*(1-v);
    s+='<g>';for(let v=0;v<=1.001;v+=0.25)s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+ry(v)+'" y2="'+ry(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(ry(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v.toFixed(2)+'</text>';
    s+='<line x1="'+x(0)+'" x2="'+x(1)+'" y1="'+ry(0)+'" y2="'+ry(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/></g><g id="rd-calRel"></g>';
    for(let v=0;v<=1.001;v+=0.2)s+='<text x="'+x(v)+'" y="'+(H-4)+'" font-size="10" text-anchor="'+(v<0.01?'start':v>0.99?'end':'middle')+'" fill="var(--mute)">'+v.toFixed(1)+'</text>';
    s+='<text x="'+x(0.5)+'" y="'+(sh+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">predicted probability of positive</text>';
    box.innerHTML=s+'</svg>';box._g={x,sh,ry,ml,W};built=1}
  function draw(k){if(!built||Math.abs(RD.width($('rd-calSvg'))-W0)>4)build();const st=steps[k],box=$('rd-calSvg'),g=box._g,p=P[st.m];
    const dots=box.querySelectorAll('.cd');dots.forEach((c,i)=>{const yy=Y[i]?14+jit[i]*(g.sh/2-22):g.sh/2+6+jit[i]*(g.sh/2-22);c.style.transform='translate('+g.x(p[i]).toFixed(1)+'px,'+yy.toFixed(1)+'px)';c.style.transition=RD.RM?'none':'transform .9s ease'});
    let b='';if(st.bins)for(let j=1;j<10;j++)b+='<line x1="'+g.x(j/10)+'" x2="'+g.x(j/10)+'" y1="4" y2="'+(g.sh-4)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    box.querySelector('#rd-calBins').innerHTML=b;
    let r='';if(st.bins){const rel=S[st.m].rel;rel.bins.forEach((bn,j)=>{if(!bn.n)return;const x0=g.x(j/10)+2,w=g.x(0.1)-g.x(0)-4;
      r+='<rect x="'+x0+'" y="'+g.ry(bn.frac)+'" width="'+w+'" height="'+(g.ry(0)-g.ry(bn.frac))+'" fill="var(--c3)" fill-opacity=".75"/>';
      if(st.gap)r+='<line x1="'+(x0+w/2)+'" x2="'+(x0+w/2)+'" y1="'+g.ry(bn.frac)+'" y2="'+g.ry(bn.conf)+'" stroke="var(--bad)" stroke-width="3"/><circle cx="'+(x0+w/2)+'" cy="'+g.ry(bn.conf)+'" r="3" fill="var(--bad)"/>';
      r+='<text x="'+(x0+w/2)+'" y="'+(g.ry(0)-3)+'" font-size="9" text-anchor="middle" fill="var(--bg)">'+(w>18?bn.n:'')+'</text>'})}
    box.querySelector('#rd-calRel').innerHTML=r;
    $('rd-calT').textContent=(k+1)+' / '+steps.length+' · '+st.t;$('rd-calP').textContent=st.d;
    const s=S[st.m],nm={nb:'Naive Bayes',nbc:'Naive Bayes + isotonic',lr:'Logistic regression'}[st.m];
    $('rd-calN').innerHTML=RD.stat('Model',nm,'872 sentences')+RD.stat('Accuracy at 0.5',RD.pct(s.acc),'decisions')+RD.stat('ROC-AUC',F(s.auc,3),'ranking')+RD.stat('Log-loss',F(s.ll,3),'lower is better')+RD.stat('Brier',F(s.brier,3),'lower is better')+RD.stat('ECE, 10 bins',st.bins?F(s.rel.ece,3):'bin first','lower is better');
  }
  RD.anim({card:'rd-cal',ctl:'rd-calC',n:steps.length,draw,ms:2600,label:'Calibration step'});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{built=0;const sc=document.getElementById('rd-calC-s');draw(sc?+sc.value:0)},150)});
})();

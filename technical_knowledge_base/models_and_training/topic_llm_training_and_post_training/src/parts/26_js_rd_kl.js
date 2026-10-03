// ---- Reading, Axis 4: reward hacking with and without the KL leash (Gao et al.'s functional form, illustrative coefficients) ----
// Same simulation as src/read/recompute.py: gradient ascent on proxy(d) - lam * d^2, with d = sqrt(KL).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-kl'))return;
  const A=1.0,Bg=0.6,AP=1.0,BP=0.08,ETA=0.06,STEPS=200,LAM=[0,0.22];
  const gold=d=>d>0?d*(A-Bg*Math.log(d)):0, proxy=d=>d>0?d*(AP-BP*Math.log(d)):0, dpx=d=>AP-BP*Math.log(d)-BP;
  function run(lam){let d=0.05;const o=[];for(let t=0;t<=STEPS;t++){o.push({t,d,kl:d*d,p:proxy(d),g:gold(d)});d=Math.max(1e-3,d+ETA*(dpx(d)-2*lam*d))}return o}
  const RUN=LAM.map(run);
  const FR=21; // frames: steps 0, 10, ..., 200
  let mode=0,an;
  const leg='<div class="leg"><span><i style="background:var(--c2)"></i>proxy reward: what the optimiser sees</span><span><i style="background:var(--c3)"></i>gold reward: what people want</span><span><i style="background:var(--dim)"></i>the other run, for comparison</span></div>';
  function draw(f){const T=f*10,r=RUN[mode],o=RUN[1-mode];
    $('rd-klM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===mode));
    const box=$('rd-klSvg'),W=RD.width(box),H=Math.round(Math.min(280,Math.max(200,W*.42))),ml=34,mr=10,mt=10,mb=34;
    const x=t=>ml+(W-ml-mr)*t/STEPS,ymin=-4,ymax=8.5,y=v=>mt+(H-mt-mb)*(ymax-v)/(ymax-ymin);
    const path=(a,k,n)=>a.slice(0,n+1).map((p,i)=>(i?'L':'M')+x(p.t).toFixed(1)+' '+y(p[k]).toFixed(1)).join('');
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Proxy and gold reward against training step">';
    for(let v=-4;v<=8;v+=2)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>';
    for(let t=0;t<=STEPS;t+=50)s+='<text x="'+x(t)+'" y="'+(H-18)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>';
    s+='<text x="'+(W-mr)+'" y="'+(H-3)+'" font-size="10" text-anchor="end" fill="var(--mute)">training step</text>';
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--mute)" stroke-width="1"/>';
    // the other run, full, faint
    s+='<path d="'+path(o,'p',STEPS)+'" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="5 4"/><path d="'+path(o,'g',STEPS)+'" fill="none" stroke="var(--dim)" stroke-width="1.5"/>';
    s+='<path d="'+path(r,'p',T)+'" fill="none" stroke="var(--c2)" stroke-width="2.4" stroke-dasharray="6 4"/><path d="'+path(r,'g',T)+'" fill="none" stroke="var(--c3)" stroke-width="2.6"/>';
    const best=r.slice(0,T+1).reduce((a,b)=>b.g>a.g?b:a,r[0]),cur=r[T];
    s+='<circle cx="'+x(best.t)+'" cy="'+y(best.g)+'" r="4" fill="var(--c3)" stroke="var(--bg)"/>';
    s+='<circle cx="'+x(cur.t)+'" cy="'+y(cur.p)+'" r="4" fill="var(--c2)" stroke="var(--bg)"/><circle cx="'+x(cur.t)+'" cy="'+y(cur.g)+'" r="4" fill="var(--c3)" stroke="var(--bg)"/>';
    box.innerHTML=leg+s+'</svg>';
    let t,p;
    if(mode===0){
      if(T<30){t='Step '+T+': both rewards rise together';p='Early on, what the reward model likes and what people want are the same thing. Distance from the start (KL) is still small.'}
      else if(T<=50){t='Step '+T+': the gold reward peaks';p='Around step 35 the true quality stops improving. The proxy does not notice: it keeps rising at the same pace.'}
      else{t='Step '+T+': the policy is exploiting the proxy';p='The policy has found what the reward model over-rewards (length, flattery, format). The proxy is still climbing; the true quality is falling'+(cur.g<r[0].g?', now below where training started.':'.')}}
    else{
      if(T<30){t='Step '+T+': the same start';p='With a penalty on KL, early steps look the same: moving is cheap while the gain is large.'}
      else{t='Step '+T+': the leash holds';p='The penalty grows with the square of the distance, so the policy settles where the proxy\'s gain no longer pays for moving further, near the gold peak. It gives up proxy score to keep real quality.'}}
    $('rd-klT').textContent=t;$('rd-klP').textContent=p;
    $('rd-klN').innerHTML=RD.stat('KL from the start',cur.kl.toFixed(1),'d = √KL = '+cur.d.toFixed(2))+RD.stat('Proxy reward',cur.p.toFixed(2),'')+
      RD.stat('Gold reward',cur.g.toFixed(2),'best so far '+best.g.toFixed(2)+' at step '+best.t)+RD.stat('KL penalty',mode?'0.22 × KL':'none','<span class="ill">illustrative</span>');
  }
  an=RD.anim({card:'rd-kl',ctl:'rd-klC',n:FR,start:FR-1,draw,ms:700,label:'Training step'});
  $('rd-klM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=+b.dataset.m;an.reset(FR);an.play()});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>an.redraw(),120)});
})();

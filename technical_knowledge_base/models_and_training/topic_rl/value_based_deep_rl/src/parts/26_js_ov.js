// ---- Section 5: van Hasselt, Guez and Silver (2015) Figure 2 rebuilt: ten fits, their max, and the double estimator ----
(function(){
  const E=window.VBE;const P=document.getElementById('vb-ov'+'P'),Tt=document.getElementById('vb-ovT'),Xp=document.getElementById('vb-ovX'),Nc=document.getElementById('vb-ovN'),Ds=document.getElementById('vb-ovD'),Lg=document.getElementById('vb-ovL');
  const PRINTED={'sin|6':['+0.61','−0.02'],'bump|6':['+0.47','+0.02'],'bump|9':['+3.35','−0.02']};
  let fun='sin',res=null,key='';const NG=241;
  function get(){const k=fun+'|'+Ds.value;if(k!==key){key=k;res=E.fig2(fun,+Ds.value,NG);res.full=E.fig2(fun,+Ds.value,1201)}return res}
  const N=13;
  function draw(i){const R=get(),deg=+Ds.value;document.getElementById('vb-ovDv').textContent=deg;
    const W=RD.width(P),l=34,r=8,H1=210,H2=120,gap=16,H=H1+gap+H2+22;const X=x=>l+(W-l-r)*(x+6)/12;
    const nShow=Math.min(10,i+1);
    let ymin=-2.2,ymax=2.4;R.fits.slice(0,nShow).forEach(c=>R.grid.forEach(x=>{const v=E.peval(c,x);ymin=Math.min(ymin,v);ymax=Math.max(ymax,v)}));ymin=Math.max(ymin,-4);ymax=Math.min(ymax,6);
    const Y=v=>6+(H1-12)*(ymax-Math.max(ymin-50,Math.min(ymax+50,v)))/(ymax-ymin);
    let s='<defs><clipPath id="vb-ovK1"><rect x="'+l+'" y="4" width="'+(W-l-r)+'" height="'+(H1-4)+'"/></clipPath><clipPath id="vb-ovK2"><rect x="'+l+'" y="'+(H1+gap)+'" width="'+(W-l-r)+'" height="'+H2+'"/></clipPath></defs>';[-6,-4,-2,0,2,4,6].forEach(x=>{s+='<line x1="'+X(x)+'" x2="'+X(x)+'" y1="4" y2="'+H1+'" stroke="var(--line)"/>'});
    for(let v=Math.ceil(ymin);v<=Math.floor(ymax);v+=(ymax-ymin>8?2:1))s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'});
    const line=(ys,col,w,op,dash)=>'<polyline clip-path="url(#vb-ovK1)" fill="none" stroke="'+col+'" stroke-width="'+w+'" opacity="'+op+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+' points="'+R.grid.map((x,k)=>X(x).toFixed(1)+','+Y(ys[k]).toFixed(1)).join(' ')+'"/>';
    for(let a=0;a<nShow;a++){const cur=i<10&&a===i;s+=line(R.grid.map(x=>E.peval(R.fits[a],x)),'var(--c3)',cur?2.4:1,cur?1:(i>=10?.45:.3))}
    s+=line(R.grid.map(R.f),'var(--c4)',2.4,1);
    if(i<10){R.samples[i].forEach(x=>{s+='<circle cx="'+X(x)+'" cy="'+Y(R.f(x))+'" r="3.4" fill="var(--c3)"/>'});
      const miss=[-5+i,-4+i];miss.forEach(x=>{s+='<circle cx="'+X(x)+'" cy="'+Y(R.f(x))+'" r="3.6" fill="none" stroke="var(--bad)" stroke-width="1.5"/>'})}
    if(i>=10)s+=line(R.qmax,'var(--ink)',2,1,'5 3');
    // bias panel
    const y0=H1+gap,bl=Math.min(-1,...R.edbl,...R.emax),bh=Math.max(1,...R.emax);const blo=Math.max(-2,bl),bhi=Math.min(4,bh);
    const Yb=v=>y0+(H2-6)*(bhi-Math.max(blo-50,Math.min(bhi+50,v)))/(bhi-blo);
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Yb(0).toFixed(1)+'" y2="'+Yb(0).toFixed(1)+'" stroke="var(--mute)"/>'+RD.t(l-4,Yb(0)+4,'0',{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l+2,y0+8,'estimate − true',{fs:10,fill:'var(--mute)'});
    [-6,-4,-2,0,2,4,6].forEach(x=>{s+=RD.t(X(x),H-6,x,{a:'middle',fs:10,fill:'var(--mute)'})});
    const lineB=(ys,col,w)=>'<polyline clip-path="url(#vb-ovK2)" fill="none" stroke="'+col+'" stroke-width="'+w+'" points="'+R.grid.map((x,k)=>X(x).toFixed(1)+','+Yb(ys[k]).toFixed(1)).join(' ')+'"/>';
    if(i>=11)s+=lineB(R.emax,'var(--c2)',2);if(i>=12)s+=lineB(R.edbl,'var(--c1)',2);
    s+=RD.t((l+W-r)/2,H-6+0,'',{});
    P.innerHTML=RD.svg(W,H,s,'Ten fitted action values and their maximum');
    Lg.innerHTML='<span><i style="background:var(--c4)"></i>true value, the same for all 10 actions</span><span><i style="background:var(--c3)"></i>fitted estimate of one action</span><span><i style="background:var(--ink)"></i>max over the 10 estimates</span><span><i style="background:var(--c2)"></i>max − true</span><span><i style="background:var(--c1)"></i>double estimator − true</span>';
    const pr=PRINTED[fun+'|'+deg];
    if(i<10){Tt.textContent='Action '+(i+1)+' of 10: fit a degree-'+deg+' polynomial to the true values at '+R.samples[i].length+' integer states';
      Xp.innerHTML='States '+(-5+i)+' and '+(-4+i)+' (red rings) are left out for this action, so its fit differs from the others between samples. The samples are exact: no noise anywhere.'}
    else if(i===10){Tt.textContent='The max over the ten estimates';Xp.innerHTML='Q-learning\'s target takes this dashed line. Every fit is right at most of its samples, but they err in different places, and the max collects whichever error is positive.'}
    else if(i===11){Tt.textContent='Overestimation: max − true, averaged over states = '+RD.sg(R.full.avgMax,3);Xp.innerHTML='Positive almost everywhere'+(pr?'; the paper prints '+pr[0]+' for this row.':'.')+' It is largest where samples are sparse or the fit is flexible.'}
    else{Tt.textContent='Double estimator: average error = '+RD.sg(R.full.avgDbl,3);Xp.innerHTML='Pick the best action with one set of fits and value it with fits made from other samples (action a<sub>i+5</sub>\'s for a<sub>i</sub>): the errors no longer line up with the choice, and the average lands near 0'+(pr?' (printed '+pr[1]+')':'')+'.'}
    Nc.innerHTML=RD.stat('Average max − true',i>=11?RD.sg(R.full.avgMax,3):'…',pr?'printed '+pr[0]:'no printed value for this degree')+RD.stat('Average double − true',i>=12?RD.sg(R.full.avgDbl,3):'…',pr?'printed '+pr[1]:'')+RD.stat('Setting',fun==='sin'?'sin(s)':'2 exp(−s²)','degree '+deg+', 10 actions')}
  const an=RD.anim({card:'vb-ov',ctl:'vb-ovC',n:N,ms:900,draw,label:'Step'});
  document.getElementById('vb-ovF').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const [f,d]=b.dataset.f.split('|');fun=f;Ds.value=d;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset(N);an.play()});
  Ds.addEventListener('input',()=>{[...document.getElementById('vb-ovF').children].forEach(x=>x.classList.toggle('on',x.dataset.f===fun+'|'+Ds.value));an.redraw()});
  RD.onResize(()=>an.redraw());
})();

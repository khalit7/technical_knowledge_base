// ---- Section 9: the C51 target, step by step: shrink by gamma, shift by r, clip, split onto the atoms ----
(function(){
  const E=window.VBE;const VMIN=-10,VMAX=10;
  const P=document.getElementById('vb-c5P'),Tt=document.getElementById('vb-c5T'),Xp=document.getElementById('vb-c5X'),K=document.getElementById('vb-c5K'),
    Ns=document.getElementById('vb-c5N'),Rs=document.getElementById('vb-c5R'),Gs=document.getElementById('vb-c5G');
  let mode='eq7';const N_STEPS=6;
  function draw(i){const N=+Ns.value,r=+Rs.value/10,g=+Gs.value/100;document.getElementById('vb-c5Rv').textContent=RD.n(r,1);document.getElementById('vb-c5Gv').textContent=g.toFixed(2);
    const {z,dz}=E.atoms(N,VMIN,VMAX),p=E.c51Next(N,VMIN,VMAX),m=E.c51Project(p,N,VMIN,VMAX,r,g,mode);
    const meanNext=p.reduce((s,q,j)=>s+q*z[j],0),scalar=r+g*meanNext,meanProj=m.reduce((s,q,j)=>s+q*z[j],0),kept=m.reduce((a,b)=>a+b,0);
    const pos=z.map(x=>i===0?x:i===1?g*x:i===2?r+g*x:Math.min(VMAX,Math.max(VMIN,r+g*x)));
    const W=RD.width(P),H=210,l=30,rr=8,t=16,b=30,xlo=-13,xhi=13;const X=x=>l+(W-l-rr)*(x-xlo)/(xhi-xlo);
    const pm=Math.max(...p,...m)*1.12;const Y=q=>t+(H-t-b)*(1-q/pm);
    let s='<rect x="'+X(VMIN)+'" y="'+t+'" width="'+(X(VMAX)-X(VMIN))+'" height="'+(H-t-b)+'" fill="var(--soft)"/>';
    s+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+(H-b)+'" y2="'+(H-b)+'" stroke="var(--mute)"/>';
    z.forEach(x=>{s+='<line x1="'+X(x).toFixed(1)+'" x2="'+X(x).toFixed(1)+'" y1="'+(H-b)+'" y2="'+(H-b+4)+'" stroke="var(--mute)"/>'});
    [-10,-5,0,5,10].forEach(x=>{s+=RD.t(X(x),H-b+16,x,{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=RD.t(X(VMIN)+3,t+11,'support [−10, 10], '+N+' atoms',{fs:10,fill:'var(--mute)'});
    const bw=Math.max(1.5,Math.min(12,(X(dz)-X(0))*0.55));
    if(i>=4){m.forEach((q,j)=>{s+='<rect x="'+(X(z[j])-bw/2).toFixed(1)+'" y="'+Y(q).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(H-b-Y(q)).toFixed(1)+'" fill="var(--c1)"/>'})}
    const sw=Math.max(1.2,bw*0.45);
    p.forEach((q,j)=>{const x=pos[j];s+='<rect x="'+(X(x)-sw/2).toFixed(1)+'" y="'+Y(q).toFixed(1)+'" width="'+sw.toFixed(1)+'" height="'+(H-b-Y(q)).toFixed(1)+'" fill="var(--c2)" opacity="'+(i>=4?.45:.95)+'"/>';
      if(i===4&&N<=21&&q>0.004){const bj=(x-VMIN)/dz,lo=Math.floor(bj),hi=Math.ceil(bj);if(lo!==hi){s+='<line x1="'+X(x)+'" y1="'+(Y(q)-2)+'" x2="'+X(z[lo])+'" y2="'+(Y(m[lo])-3)+'" stroke="var(--c2)" stroke-width=".8" opacity=".7"/><line x1="'+X(x)+'" y1="'+(Y(q)-2)+'" x2="'+X(z[hi])+'" y2="'+(Y(m[hi])-3)+'" stroke="var(--c2)" stroke-width=".8" opacity=".7"/>'}
        else if(mode==='alg1')s+=RD.t(X(x),Y(q)-5,'lost',{a:'middle',fs:9.5,fill:'var(--bad)'})}});
    if(i>=5){s+='<line x1="'+X(scalar)+'" x2="'+X(scalar)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--ink)" stroke-dasharray="5 3"/>'+RD.t(X(scalar)+4,t+24,'DQN target '+RD.n(scalar,2),{fs:10,fill:'var(--ink)',a:X(scalar)>W-120?'end':'start'})}
    P.innerHTML=RD.svg(W,H,s,'Distribution projected onto atoms');
    const clipN=z.filter(x=>r+g*x>VMAX||r+g*x<VMIN).length;
    const CAP=[['Next-state distribution p(s′, a*)','The target network\'s probabilities on the '+N+' atoms for the greedy action at s′. Two outcomes: losing (around −5) and surviving (around +5). Its mean is '+RD.n(meanNext,3)+'.'],
      ['Shrink every atom by γ = '+g.toFixed(2),'Each atom z<sub>j</sub> moves to γz<sub>j</sub>, pulling the distribution toward 0: the discount applied to every possible future return at once.'],
      ['Shift by the reward r = '+RD.n(r,1),'Each atom now sits at r + γz<sub>j</sub>, between the grid points. The shape is the target; only its support is wrong.'],
      ['Clip to [−10, 10]',clipN?clipN+' atom'+(clipN>1?'s':'')+' fell outside the support and are pushed to the edge: the returns C51 can represent are bounded, which is also why Rainbow suspects clipping tempers overestimation.':'Nothing falls outside the support at these settings; with larger r or γ near 1 some atoms would be pushed to the edge.'],
      ['Split each atom between its two neighbours',mode==='eq7'?'Equation 7: an atom at distance d from grid point z<sub>i</sub> gives it the fraction 1 − d/Δz of its probability (Δz = '+RD.n(dz,2)+'). Nothing is lost: total mass '+RD.n(kept,4)+'.':'Algorithm 1 as printed: atoms that land exactly on a grid point (b<sub>j</sub> a whole number) give their probability to nobody. Total mass kept: '+RD.n(kept,4)+'.'],
      ['The target against DQN\'s scalar target','The blue bars are the training target for the cross-entropy loss. Their mean is '+RD.n(meanProj,3)+'; DQN\'s target r + γ𝔼[Z] is '+RD.n(scalar,3)+(Math.abs(meanProj-scalar)<1e-9?': identical, but the distribution keeps the two outcomes apart.':' (they differ because of clipping'+(mode==='alg1'?' or lost mass':'')+').')]];
    Tt.textContent=(i+1)+'. '+CAP[i][0];Xp.innerHTML=CAP[i][1];
    K.innerHTML=RD.stat('Scalar target r + γ𝔼[Z]',RD.n(scalar,3),'what DQN regresses on')+RD.stat('Mean of projected target',i>=4?RD.n(meanProj,3):'…',mode==='eq7'?'equation 7':'Algorithm 1 as printed')+RD.stat('Probability kept',i>=4?RD.n(100*kept,2)+'%':'…',kept<0.99999&&i>=4?'mass lost on exact grid hits':'')}
  const an=RD.anim({card:'vb-c5',ctl:'vb-c5C',n:N_STEPS,ms:1500,draw,label:'Step'});
  document.getElementById('vb-c5M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.go(4)});
  document.getElementById('vb-c5Z').addEventListener('click',()=>{Rs.value=0;Gs.value=100;an.go(4)});
  [Ns,Rs,Gs].forEach(el=>el.addEventListener('input',()=>an.redraw()));Ns.addEventListener('change',()=>an.redraw());RD.onResize(()=>an.redraw());
})();

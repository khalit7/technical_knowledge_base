// ---- Reading section 9: PPO. The objective against the ratio (new), and ten epochs on one sample with and without the clip (from Topic: rl) ----
(function(){
  const E=window.PGE;
  // ---- The clipped surrogate against the ratio, for a positive and a negative advantage side by side (new on this page) ----
  (function(){
    const Rs=document.getElementById('rd-clR'),Es=document.getElementById('rd-clE'),PA=document.getElementById('rd-clA'),PB=document.getElementById('rd-clB'),O=document.getElementById('rd-clO');
    if(!PA)return;
    function plot(el,A,r,e){const W=RD.width(el),H=170,l=34,rr=10,t=10,b=24,rmax=2.5,lo=A>0?-0.1:-2.6,hi=A>0?2.6:0.1,X=v=>l+(W-l-rr)*v/rmax,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let s='';
      s+='<rect x="'+X(1-e)+'" y="'+t+'" width="'+(X(1+e)-X(1-e))+'" height="'+(H-t-b)+'" fill="var(--soft)"/>';
      s+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
      const pu=[],pc=[],pm=[];for(let k=0;k<=150;k++){const x=k*rmax/150;pu.push(X(x).toFixed(1)+','+Y(x*A).toFixed(1));pc.push(X(x).toFixed(1)+','+Y(Math.max(1-e,Math.min(1+e,x))*A).toFixed(1));pm.push(X(x).toFixed(1)+','+Y(E.ppoL(x,A,e,true)).toFixed(1))}
      s+='<polyline fill="none" stroke="var(--c2)" stroke-width="1.4" stroke-dasharray="5 4" points="'+pu.join(' ')+'"/><polyline fill="none" stroke="var(--c5)" stroke-width="1.4" stroke-dasharray="2 3" points="'+pc.join(' ')+'"/><polyline fill="none" stroke="var(--c1)" stroke-width="2.8" opacity=".9" points="'+pm.join(' ')+'"/>';
      const L=E.ppoL(r,A,e,true),gz=E.ppoDL(r,A,e)===0;
      s+='<line x1="'+X(r)+'" x2="'+X(r)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><circle cx="'+X(r)+'" cy="'+Y(L)+'" r="5.5" fill="'+(gz?'var(--mute)':'var(--c1)')+'" stroke="var(--bg)"/>';
      [0,0.5,1,1.5,2,2.5].forEach(v=>s+=RD.t(X(v),H-8,RD.n(v,1),{a:'middle',fs:10,fill:'var(--mute)'}));
      s+=RD.t(l-4,Y(A>0?2.5:-2.5)+4,A>0?'2.5':'−2.5',{a:'end',fs:9.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Clipped objective, advantage '+A);
      const u=r*A,c=Math.max(1-e,Math.min(1+e,r))*A;
      return 'Â = '+(A>0?'+1':'−1')+', r = '+RD.n(r,2)+': unclipped '+RD.n(u,3)+', clipped '+RD.n(c,3)+', min = <b>'+RD.n(L,3)+'</b>, gradient '+(gz?'<b>zero</b> (moved far enough '+(A>0?'up':'down')+' already)':(Math.abs(r-1)<=e?'active (inside the band)':'<b>active</b>: the ratio moved the wrong way, so the correction is never clipped'))}
    function draw(){const r=+Rs.value/100,e=+Es.value/100;document.getElementById('rd-clRv').textContent=r.toFixed(2);document.getElementById('rd-clEv').textContent=e.toFixed(2);
      O.innerHTML=plot(PA,1,r,e)+'<br>'+plot(PB,-1,r,e)}
    Rs.addEventListener('input',draw);Es.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
  (function(){
    const EP=10,Es=document.getElementById('rd-ppE'),Hs=document.getElementById('rd-ppH'),PO=document.getElementById('rd-ppO'),PR=document.getElementById('rd-ppR'),Tt=document.getElementById('rd-ppT'),Xp=document.getElementById('rd-ppX'),N=document.getElementById('rd-ppN');
    let A=1,rc,ru;
    function compute(){const e=+Es.value/100,h=+Hs.value/100;document.getElementById('rd-ppEv').textContent=e.toFixed(2);document.getElementById('rd-ppHv').textContent=h.toFixed(2);rc=E.ppoRun(A,e,h,EP,true);ru=E.ppoRun(A,e,h,EP,false)}
    function draw(i){const e=+Es.value/100,c=rc.hist[i],u=ru.hist[i];
      // objective against ratio
      let W=RD.width(PO),H=170,l=34,r=10,t=10,b=24,rmax=3.4,lo=A>0?-0.2:-rmax,hi=A>0?rmax:0.2,X=v=>l+(W-l-r)*v/rmax,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let s='';
      s+='<rect x="'+X(1-e)+'" y="'+t+'" width="'+(X(1+e)-X(1-e))+'" height="'+(H-t-b)+'" fill="var(--soft)"/>';
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
      const pu=[],pc=[];for(let k=0;k<=170;k++){const rr=k*rmax/170;pu.push(X(rr).toFixed(1)+','+Y(E.ppoL(rr,A,e,false)).toFixed(1));pc.push(X(rr).toFixed(1)+','+Y(E.ppoL(rr,A,e,true)).toFixed(1))}
      s+='<polyline fill="none" stroke="var(--c2)" stroke-width="1.6" stroke-dasharray="5 4" points="'+pu.join(' ')+'"/><polyline fill="none" stroke="var(--c1)" stroke-width="2.6" points="'+pc.join(' ')+'"/>';
      s+='<circle cx="'+X(Math.min(rmax,u.r))+'" cy="'+Y(u.L)+'" r="5" fill="var(--c2)"/><circle cx="'+X(Math.min(rmax,c.r))+'" cy="'+Y(c.L)+'" r="5.5" fill="var(--c1)" stroke="var(--bg)"/>';
      [0,1,2,3].forEach(v=>s+=RD.t(X(v),H-8,'r = '+v,{a:'middle',fs:10,fill:'var(--mute)'}));
      s+=RD.t(X(1),t+12,'1 ± ε',{a:'middle',fs:10,fill:'var(--mute)'});
      PO.innerHTML=RD.svg(W,H,s,'Clipped objective')+'<div class="leg"><span><i class="ln" style="background:var(--c1)"></i>clipped L<sup>CLIP</sup></span><span><i class="ln" style="background:var(--c2)"></i>unclipped r·Â</span></div>';
      // ratio per epoch
      W=RD.width(PR);const all=rc.hist.concat(ru.hist).map(x=>x.r),y0=Math.min(0,...all),y1=Math.max(...all,1+e)+0.1,XX=j=>l+(W-l-r)*j/EP,YY=v=>t+(H-t-b)*(y1-v)/(y1-y0);s='';
      s+='<rect x="'+l+'" y="'+YY(1+e)+'" width="'+(W-l-r)+'" height="'+(YY(1-e)-YY(1+e))+'" fill="var(--soft)"/>';
      [1-e,1,1+e].forEach(v=>s+=RD.t(l-4,YY(v)+4,RD.n(v,2),{a:'end',fs:9.5,fill:'var(--mute)'}));
      [[ru,'var(--c2)','no clip'],[rc,'var(--c1)','clip']].forEach(([run,col,lab],k)=>{s+='<polyline fill="none" stroke="'+col+'" stroke-width="'+(k?2.6:1.8)+'" points="'+run.hist.slice(0,i+1).map((x,j)=>XX(j).toFixed(1)+','+YY(x.r).toFixed(1)).join(' ')+'"/>'+RD.t(Math.min(W-30,XX(i)+4),YY(run.hist[i].r)+(k?12:-4),lab,{fs:10,fill:col})});
      s+=RD.t(l,H-8,'epoch 0',{fs:10,fill:'var(--mute)'})+RD.t(W-r,H-8,'epoch '+EP,{a:'end',fs:10,fill:'var(--mute)'});
      PR.innerHTML=RD.svg(W,H,s,'Ratio over epochs');
      Tt.textContent='Epoch '+i+': ratio '+RD.n(c.r,3)+' with the clip, '+RD.n(u.r,3)+' without';
      Xp.innerHTML=i===0?'Before any update the policy is the one that sampled, so the ratio is 1 and both objectives agree. The sampled action had probability '+RD.n(rc.old,3)+'.':
        (c.active?'Inside the trust region: the clipped objective still has a gradient, so the clip run moves exactly like the unclipped one.':'The clipped objective is flat here (gradient 0): the clip run stops moving'+(Math.abs(c.r-1)>e+0.02?', after a step that already overshot 1 '+(A>0?'+':'−')+' ε: the clip removed the incentive, it did not bound the ratio':'')+'.')+' Without the clip the ratio keeps going ('+RD.n(u.r,3)+'), pushing the probability of this one sampled action to '+RD.n(u.pa,3)+' on the strength of a single advantage estimate.';
      N.innerHTML=RD.stat('Ratio, clipped run',RD.n(c.r,3),c.active?'gradient active':'gradient zero')+RD.stat('Ratio, no clip',RD.n(u.r,3),'')+RD.stat('KL from old, clipped',RD.n(c.kl,4),'')+RD.stat('KL from old, no clip',RD.n(u.kl,4),'')}
    compute();
    const an=RD.anim({card:'rd-pp',ctl:'rd-ppC',n:EP+1,ms:700,draw,label:'Epoch'});
    document.getElementById('rd-ppM').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;A=+b.dataset.a;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));compute();an.reset(EP+1);an.play()});
    Es.addEventListener('input',()=>{compute();an.redraw()});Hs.addEventListener('input',()=>{compute();an.redraw()});RD.onResize(()=>an.redraw());
  })();
})();

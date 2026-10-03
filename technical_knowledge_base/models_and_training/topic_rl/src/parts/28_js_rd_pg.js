// ---- Reading sections 13 and 14: a softmax policy gradient with and without a baseline; PPO's clip ----
(function(){
  const E=window.RDE;
  (function(){
    const STEPS=60,ETA=0.1,Os=document.getElementById('rd-pgO'),Sd=document.getElementById('rd-pgS'),PA=document.getElementById('rd-pgA'),PB=document.getElementById('rd-pgB'),PL=document.getElementById('rd-pgL'),Tt=document.getElementById('rd-pgT'),Xp=document.getElementById('rd-pgX'),N=document.getElementById('rd-pgN');
    let rew,h0,hB,sp0,spB;
    function compute(){const c=+Os.value;document.getElementById('rd-pgOv').textContent=c;rew=[1+c,2+c,6+c];h0=E.pgRun(rew,ETA,STEPS,+Sd.value,false);hB=E.pgRun(rew,ETA,STEPS,+Sd.value,true);sp0=E.pgSpread(rew,ETA,STEPS,false,100,200);spB=E.pgSpread(rew,ETA,STEPS,true,100,200)}
    function panel(el,h,i,useB){const W=RD.width(el),H=150,l=8,r=8,cw=(W-l-r)/3,st=h[i],nx=h[i];let s='';const gmax=Math.max(1.5,...h0.concat(hB).slice(0,STEPS).map(x=>Math.max(...x.g.map(Math.abs))));
      for(let j=0;j<3;j++){const x=l+j*cw,bw=cw*0.36,bh=(H-56)*st.pi[j],y=H-36-bh;const on=st.a===j;
        s+='<rect x="'+(x+cw*0.08).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,bh).toFixed(1)+'" fill="'+(on?'var(--c2)':'var(--c1)')+'"/>'+RD.t(x+cw*0.08+bw/2,y-4,RD.n(st.pi[j],2),{a:'middle',fs:10.5,w:600});
        // update for this action against exact gradient, as two thin bars around a zero line
        const zx=x+cw*0.62,zy=(H-36)/2+6,sc=(H-70)/2/gmax,gv=st.a>=0?st.g[j]:0,ge=st.grad[j];
        s+='<line x1="'+(zx-12)+'" x2="'+(zx+22)+'" y1="'+zy+'" y2="'+zy+'" stroke="var(--line)"/>';
        s+='<rect x="'+(zx-8)+'" y="'+Math.min(zy,zy-gv*sc).toFixed(1)+'" width="9" height="'+Math.max(1,Math.abs(gv*sc)).toFixed(1)+'" fill="var(--c4)"/>';
        s+='<rect x="'+(zx+4)+'" y="'+Math.min(zy,zy-ge*sc).toFixed(1)+'" width="9" height="'+Math.max(1,Math.abs(ge*sc)).toFixed(1)+'" fill="var(--mute)" opacity=".6"/>';
        s+=RD.t(x+cw/2,H-20,'action '+(j+1),{a:'middle',fs:10.5,w:on?600:400})+RD.t(x+cw/2,H-6,'reward '+rew[j],{a:'middle',fs:10,fill:'var(--mute)'})}
      el.innerHTML=RD.svg(W,H,s,useB?'With baseline':'Without baseline')}
    function draw(i){panel(PA,h0,i,false);panel(PB,hB,i,true);
      const W=RD.width(PL),H=130,l=36,r=60,t=8,b=20,c=+Os.value,lo=Math.min(...h0.map(x=>x.V),...hB.map(x=>x.V),...sp0.band.map(b=>b[0]))-0.2,hi=6+c+0.2,X=j=>l+(W-l-r)*j/STEPS,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let s='';
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(6+c)+'" y2="'+Y(6+c)+'" stroke="var(--c3)" stroke-dasharray="4 3"/>'+RD.t(W-r+4,Y(6+c)+4,'best '+(6+c),{fs:10,fill:'var(--c3)'});
      [[sp0,'var(--c2)'],[spB,'var(--c1)']].forEach(([sp,col])=>{const up=sp.band.map((b,j)=>X(j).toFixed(1)+','+Y(b[1]).toFixed(1)),dn=sp.band.map((b,j)=>X(j).toFixed(1)+','+Y(b[0]).toFixed(1)).reverse();s+='<polygon points="'+up.concat(dn).join(' ')+'" fill="'+col+'" opacity=".14"/>'});
      [[h0,'var(--c2)','no baseline'],[hB,'var(--c1)','baseline']].forEach(([h,col,lab],k)=>{s+='<polyline fill="none" stroke="'+col+'" stroke-width="2.2" points="'+h.slice(0,i+1).map((x,j)=>X(j).toFixed(1)+','+Y(x.V).toFixed(1)).join(' ')+'"/>'});
      s+=RD.t(l-4,Y(hi)+10,RD.n(hi,1),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l-4,Y(lo),RD.n(lo,1),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l,H-5,'expected reward, update 0 to '+STEPS,{fs:10,fill:'var(--mute)'});
      PL.innerHTML=RD.svg(W,H,s,'Expected reward over updates')+'<div class="leg"><span><i class="ln" style="background:var(--c2)"></i>no baseline, this run</span><span><i class="ln" style="background:var(--c1)"></i>baseline, this run</span><span><i style="background:var(--mute);opacity:.4"></i>10th to 90th percentile of 200 runs</span></div>';
      const a0=h0[i].a,aB=hB[i].a;
      Tt.textContent=i>=STEPS?'After '+STEPS+' updates':'Update '+(i+1)+': both runs sample from their own policy with the same random number';
      Xp.innerHTML=i>=STEPS?'Expected reward '+RD.n(h0[i].V,2)+' without a baseline against '+RD.n(hB[i].V,2)+' with it (best possible '+(6+c)+'). Both estimators point the right way on average; the baseline run gets there with far less noise.':
        'Without a baseline: sampled action '+(a0+1)+' (reward '+rew[a0]+'), so its logit goes <b>up</b> by '+RD.n(ETA*h0[i].g[a0],3)+(rew[a0]<6+c?', even though it is not the best action':'')+'. With the baseline (V = '+RD.n(hB[i].V,2)+'): sampled action '+(aB+1)+', advantage '+RD.sg(rew[aB]-hB[i].V,2)+', so it goes '+(rew[aB]>=hB[i].V?'<b>up</b>':'<b>down</b>')+'. Purple: this sample\'s update per action; grey: the exact expected gradient.';
      N.innerHTML=RD.stat('Variance, no baseline',RD.n(h0[i].var0,2),'of the one-sample gradient')+RD.stat('Variance, baseline',RD.n(hB[i].varB,2),'at its own policy')+RD.stat('Runs stuck on a worse action',sp0.finals.filter(v=>v<3+c).length+' / 200 → '+spB.finals.filter(v=>v<3+c).length+' / 200','after 60 updates: no baseline → baseline')+RD.stat('Reward offset',String(c),'added to all rewards')}
    compute();
    const an=RD.anim({card:'rd-pgc',ctl:'rd-pgC',n:STEPS+1,ms:450,draw,label:'Update'});
    Os.addEventListener('input',()=>{compute();an.redraw()});Sd.addEventListener('change',()=>{compute();an.redraw()});RD.onResize(()=>an.redraw());
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

// ---- Reading section 4: the baseline. Variance against b (new), and 60 updates with and without a baseline (from Topic: rl) ----
(function(){
  const E=window.PGE;
  // ---- Any constant baseline: the mean gradient stays put, the variance is a parabola in b (new on this page) ----
  (function(){
    const Bs=document.getElementById('rd-bxB'),Ls=document.getElementById('rd-bxL'),P=document.getElementById('rd-bxP'),O=document.getElementById('rd-bxO');
    if(!P)return;const REW=[1,2,6];
    function draw(){const b=+Bs.value/10,l3=+Ls.value/10;document.getElementById('rd-bxBv').textContent=RD.n(b,1);document.getElementById('rd-bxLv').textContent=RD.n(l3,1);
      const s=E.baseVar([0,0,l3],REW,b);
      const W=RD.width(P),H=190,l=40,r=12,t=12,bt=30,lo=-2,hi=8;const pts=[];let vmax=0;
      for(let k=0;k<=200;k++){const bb=lo+(hi-lo)*k/200;const v=E.baseVar([0,0,l3],REW,bb).v;pts.push([bb,v]);vmax=Math.max(vmax,v)}
      const X=v=>l+(W-l-r)*(v-lo)/(hi-lo),Y=v=>t+(H-t-bt)*(1-v/vmax);let g='';
      for(let v=lo;v<=hi;v+=2)g+=RD.t(X(v),H-14,RD.n(v,0),{a:'middle',fs:10,fill:'var(--mute)'});
      g+=RD.t(X(hi),H-2,'baseline b',{a:'end',fs:10,fill:'var(--mute)'});
      g+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
      g+=RD.t(l-4,Y(vmax)+8,RD.n(vmax,1),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l-4,Y(0),'0',{a:'end',fs:10,fill:'var(--mute)'});
      g+='<polyline fill="none" stroke="var(--c1)" stroke-width="2.4" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      const mk=(bb,col,lab,dy)=>{const v=E.baseVar([0,0,l3],REW,bb).v;return '<circle cx="'+X(bb)+'" cy="'+Y(v)+'" r="4.5" fill="'+col+'"/>'+RD.t(X(bb)+6,Y(v)+dy,lab,{fs:10.5,fill:col,w:600})};
      g+=mk(0,'var(--c2)','b = 0',-6)+mk(s.V,'var(--c3)','b = V',14)+mk(s.bs,'var(--c4)','b*',-8);
      g+='<line x1="'+X(b)+'" x2="'+X(b)+'" y1="'+t+'" y2="'+(H-bt)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      P.innerHTML=RD.svg(W,H,g,'Variance of the one-sample gradient against the baseline');
      O.innerHTML='Policy π = ('+s.pi.map(x=>RD.n(x,3)).join(', ')+'), so V = '+RD.n(s.V,3)+'. <b>Mean of the estimate at b = '+RD.n(b,1)+': ('+s.mean.map(x=>RD.n(x,3)).join(', ')+')</b>, identical to the exact gradient ('+s.grad.map(x=>RD.n(x,3)).join(', ')+') for every b. '+
        'Total variance: '+RD.n(s.v,2)+' here; '+RD.n(s.v0,2)+' with no baseline, '+RD.n(s.vV,2)+' with b = V, and the minimum '+RD.n(s.vs,2)+' at b* = '+RD.n(s.bs,3)+
        (Math.abs(s.bs-s.V)<1e-9?' (at a uniform policy every score vector has the same length, so b* = V exactly).':' (the score vectors now differ in length, so b* moves away from V; using V costs '+RD.n(s.vV-s.vs,3)+' extra variance).')}
    Bs.addEventListener('input',draw);Ls.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
  })();
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

})();

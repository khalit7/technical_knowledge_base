// ---- Reading, section 2: one episode, every target, as a 3D stage (renderer v2) ----
// The episode S0 -> S1 -> S2 -> end sits on white plinths: the agent's estimates V as blue bars on the states, the rewards as green bars on the links.
// The row in front holds each method's target for S0 (window.RDE computes every number; src/read/recompute.py checks them); streams show what each target is made of.
// Step 6 adds the policy-gradient weights (a row further in front), step 7 the GRPO group (behind the episode). The sliders on the left change the numbers live.
(function(){
  if(!document.getElementById('stg-one'))return;const E=window.RDE,{at,off,lerp,mix}=S3;
  const DEF={g:0.9,lam:0.5,R3:1,V0:0.2,V1:0.4,V2:0.7,alpha:0.1,p:0.8};
  const SL=[['g','γ',0.5,1,0.01],['lam','λ',0,1,0.05],['R3','final reward R₃',-1,2,0.1],['V1','estimate V(S₁)',-1,1,0.05],['V2','estimate V(S₂)',-1,1,0.05]];
  const box=document.getElementById('rd-oneS'),Eq=document.getElementById('rd-oneE');
  const prm=Object.assign({},DEF);
  box.innerHTML=SL.map(([k,l,mn,mx,st])=>'<label>'+l+' = <b id="rd-one-'+k+'v"></b><input type="range" id="rd-one-'+k+'" min="'+Math.round(mn/st)+'" max="'+Math.round(mx/st)+'" step="1" aria-label="'+l+'"></label>').join('');
  function syncIn(){SL.forEach(([k,l,mn,mx,st])=>{document.getElementById('rd-one-'+k).value=Math.round(prm[k]/st);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2)})}
  const T=()=>E.targets({g:prm.g,lam:prm.lam,R:[0,0,prm.R3],V:[prm.V0,prm.V1,prm.V2],alpha:prm.alpha,pDP:prm.p});
  const GR=E.groupAdv([1,0,0,0]);
  // geometry: states along x, the target row in front (z = ZT), the policy-gradient weights further in front (ZW), the GRPO group behind (ZG)
  const SX=[-2.4,-.8,.8,2.4],BASE=1,HS=1.4,ZT=2.5,ZW=3.9,ZG=-2.9,TX=[-2.4,-1.2,0,1.2,2.4],TN=['TD','2-step','MC','λ','DP'];
  const hgt=v=>Math.max(.015,Math.abs(v)*HS);
  // a signed bar standing on (or hanging from) a plinth whose top is at BASE
  function bar(R,x,z,v,o){const h=v>=0?hgt(v):Math.min(hgt(v),BASE-.08);R.box([x,v>=0?BASE:BASE-h,z],[o.w||.5,h,o.d||.5],{fill:o.fill,a:o.a,shadow:false,lw:.8});return [x,BASE+(v>=0?h:-h),z]}
  function plinth(R,x0,x1,z,d,a){R.box([(x0+x1)/2,BASE-.06,z],[x1-x0,.06,d],{a,shadow:false});[x0+.1,x1-.1].forEach(x=>R.box([x,0,z],[.04,BASE-.06,.04],{a:a*.9}))}
  function draw(R,k,e){const P=R.P,t=T(),R3=[0,0,prm.R3],V=[prm.V0,prm.V1,prm.V2],narrow=R.W<520;R.grid(-4.5,4.5,-4,4.8,.5);
    const ep=k<=5?1:k===6?.35:1-.95*e;            // the episode recedes for the last two steps
    const ga=k===7?e:0;
    // the episode: states with their estimates, links with their rewards
    plinth(R,-2.9,2.9,0,1,ep);
    SX.forEach((x,i)=>{if(i<3){const tr=(k===1&&i===1)||(k===2&&i===2)||(k===5&&i===1)||(k===6&&i===0);
        const top=bar(R,x,0,V[i],{fill:mix(P.paper,P.c1,tr?.85:.55),a:ep>.3?ep:0});
        R.label([x,BASE,.55],'S'+'₀₁₂'[i],{serif:true,fs:14,b:1,dy:16,a:ep>.3?ep:0});
        if(!narrow||tr)R.label(top,'V '+RD.n(V[i],2),{mono:true,fs:12,b:tr,dy:V[i]>=0?-11:11,c:P.c1,a:ep>.3?ep:0})}
      else{R.box([x,BASE,0],[.5,.05,.5],{fill:P.soft,a:ep,shadow:false});R.label([x,BASE,.55],'end',{fs:13,dy:16,c:P.mute,a:ep>.3?ep:0})}});
    // rewards on the links; lit when the current target uses them
    const used=[0,1,2,3,3,1,3,0][k];
    [0,1,2].forEach(j=>{const x=(SX[j]+SX[j+1])/2,on=j<used&&k!==5;R.line([[SX[j]+.3,BASE+.02,0],[SX[j+1]-.3,BASE+.02,0]],{c:on?P.c3:P.mute,w:on?3:1.4,a:ep>.3?ep:0});
      const top=bar(R,x,0,R3[j],{w:.3,d:.3,fill:mix(P.paper,P.c3,on?.85:.45),a:ep>.3?ep:0});if(!narrow||on)R.label([x,BASE,-.3],'R'+'₁₂₃'[j]+' '+RD.n(R3[j],1),{mono:true,fs:12,dy:-14-Math.max(0,R3[j])*0,c:on?P.c3:P.mute,a:ep>.3?ep:0,b:on})});
    // the target row
    const tv=[t.td,t.two,t.mc,t.lam,t.dp],ta=k===0?0:ep,tl=ta>.3?ta:0;
    if(ta>0){plinth(R,-2.9,2.9,ZT,.8,ta);
      R.line([[-2.9,BASE+prm.V0*HS,ZT+.42],[2.9,BASE+prm.V0*HS,ZT+.42]],{c:P.ink,w:1.2,dash:[4,4],a:ta*.7});
      if(!narrow)R.label([-2.9,BASE+prm.V0*HS,ZT+.42],'current V(S₀) '+RD.n(prm.V0,2),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:tl});
      TX.forEach((x,j)=>{const shown=k>=j+1,cur=k===j+1;if(!shown)return;const a=ta*(cur||k>=6?1:.75);
        const v=cur?lerp(prm.V0,tv[j],e):tv[j],top=bar(R,x,ZT,v,{fill:cur?P.acc:mix(P.paper,P.acc,.5),a});
        if(!narrow||cur||k>=6)R.label(top,TN[j]+' '+RD.n(tv[j],2),{mono:true,fs:cur?13:12,b:cur,dy:v>=0?-12:12,c:cur?P.acc:P.ink,a:a>.3?a:0})})}
    // streams: what the current target is made of
    const tgt=j=>[TX[j],BASE+Math.max(0,tv[j])*HS+.05,ZT];
    const rTop=j=>[(SX[j]+SX[j+1])/2,BASE+Math.max(0,R3[j])*HS+.05,0],vTop=i=>[SX[i],BASE+Math.max(0,V[i])*HS+.05,0];
    const fl=(a,b,c,n,r)=>R.flowArc(a,b,.7,{c,a:Math.min(1,e*1.5),n:n||8,r:r||.06,speed:1.4});
    if(k>=1&&k<=3){for(let j=0;j<used;j++)fl(rTop(j),tgt(k-1),P.c3);if(k<3)fl(vTop(k),tgt(k-1),P.c1)}
    if(k===4)[0,1,2].forEach(j=>R.flowArc([TX[j],BASE+Math.max(0,tv[j])*HS+.05,ZT],tgt(3),.45,{c:P.acc,a:Math.min(1,e*1.5),n:Math.max(2,Math.round(12*t.w[j])),r:.035+.07*t.w[j],speed:1.2}));
    if(k===5){// the model as a glass plate: P(S1 | S0) = 0.8, otherwise the episode ends
      const ga5=Math.min(1,e*1.6);R.glass([-2.6,BASE+.15,-1.1],[1.2,0,0],[0,.9,0],{c:P.c4,a:ga5,nu:5,nv:1});
      R.label([-2,BASE+1.05,-1.1],'model: S₁ with p 0.8',{mono:true,fs:12,b:1,c:P.c4,dy:-8,a:ga5});
      const pts=[];const a0=vTop(1),m=[-2,BASE+.6,-1.1],b0=tgt(4);for(let i=0;i<=12;i++)pts.push(R.arcPt(a0,m,.3,i/12));for(let i=1;i<=24;i++)pts.push(R.arcPt(m,b0,.8,i/24));
      R.flow(pts,{c:P.c4,a:ga5,r:.07,n:12,speed:1.4})}
    // policy gradients: the same targets become weights on the first action
    if(k===6){const wa=e;plinth(R,-2,2,ZW,.7,wa);
      [[-1,t.reinforceB,'REINFORCE G₀ − V(S₀)',2],[1,t.delta,'actor-critic δ₀',0]].forEach(([x,v,l,src])=>{const top=bar(R,x,ZW,v*wa,{fill:P.c4,a:wa});
        R.label(top,RD.sg(v,2),{mono:true,fs:13,b:1,dy:v>=0?-12:12,c:P.c4,a:wa});R.label([x,BASE,ZW+.4],l,{fs:12.5,dy:14,a:wa,wide:1});
        R.flowArc(tgt(src),[x,BASE+Math.max(0,v)*HS+.05,ZW],.5,{c:P.c4,a:wa,n:8,r:.06,speed:1.3})})}
    // GRPO: four answers to one prompt; the group's mean is the baseline
    if(ga>0){plinth(R,-2.9,2.9,ZG,1.6,ga);
      R.line([[-2.9,BASE+GR.m*HS,ZG-.45],[2.9,BASE+GR.m*HS,ZG-.45]],{c:P.c3,w:1.2,dash:[4,4],a:ga});
      if(!narrow)R.label([-2.9,BASE+GR.m*HS,ZG-.45],'mean 0.25',{al:'right',dx:-8,mono:true,fs:12,c:P.c3,a:ga});
      [1,0,0,0].forEach((r,j)=>{const x=SX[j],rt=bar(R,x-.33,ZG-.45,r,{w:.4,d:.4,fill:mix(P.paper,P.c3,.8),a:ga}),A=GR.A[j],at2=bar(R,x+.33,ZG+.35,A*ga,{w:.4,d:.4,fill:P.c4,a:ga});
        R.label([x,BASE,ZG+.8],(narrow?'':'answer ')+(j+1),{fs:12.5,dy:16,a:ga});R.label(at2,'Â '+RD.sg(A,narrow?2:3),{mono:true,fs:12,b:1,dy:A>=0?-12:12,c:P.c4,a:ga});
        R.label([x-.33,BASE+Math.max(0,r)*HS,ZG-.45],'r '+r,{mono:true,fs:12,al:'right',dx:-14,dy:r?-8:-4,c:P.c3,a:ga});
        R.flowArc([x-.33,BASE+Math.max(0,r)*HS+.05,ZG-.45],[x+.33,BASE+Math.max(0,A)*HS+.05,ZG+.35],.35,{c:A>0?P.c3:P.c2,a:ga,n:5,r:.05,speed:1})})}
  }
  function readout(k){const t=T(),f=v=>RD.n(v,3),g=RD.n(prm.g,2),V1=RD.n(prm.V1,2);
    Eq.innerHTML='<b>Now, with the sliders\' numbers:</b> '+[
      'S₀ → S₁ → S₂ → end; γ = '+g+'; rewards 0, 0, '+RD.n(prm.R3,1)+'; estimates '+[prm.V0,prm.V1,prm.V2].map(v=>RD.n(v,2)).join(', '),
      'TD: R₁ + γV(S₁) = 0 + '+g+' × '+V1+' = '+f(t.td),
      '2-step: R₁ + γR₂ + γ²V(S₂) = '+f(t.two),
      'MC: G₀ = R₁ + γR₂ + γ²R₃ = '+f(t.mc),
      'λ-return: '+RD.n(t.w[0],2)+' × TD + '+RD.n(t.w[1],2)+' × 2-step + '+RD.n(t.w[2],2)+' × MC = '+f(t.lam),
      'DP: 0.8 × (0 + '+g+' × '+V1+') + 0.2 × 0 = '+f(t.dp),
      'G₀ − V(S₀) = '+RD.sg(t.reinforceB,3)+';  δ₀ = TD − V(S₀) = '+RD.sg(t.delta,3),
      'Â = (r − mean) / std: (1 − 0.25)/0.433 = +1.732; (0 − 0.25)/0.433 = −0.577'][k]}
  const full=[[-3.1,0,-.6],[3.1,2.3,3]];
  const st=S3.stage({id:'stg-one',list:'sx-one',fig:'Fig. 3 · one episode, every target for S₀',cam:[.1,.68],bounds:full,aspect:.66,dur:1300,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,16,14,120],
    view:k=>k===6?{cam:[.1,.68],bounds:[[-3.1,0,-.5],[3.1,2.3,4.4]]}:k===7?{cam:[.1,.7],bounds:[[-3.1,0,-4],[3.1,3.2,-1.6]]}:{cam:[.1,.68],bounds:full},
    onStep:k=>readout(k)});
  SL.forEach(([k,l,mn,mx,sp])=>document.getElementById('rd-one-'+k).addEventListener('input',e=>{prm[k]=+(Math.round(+e.target.value)*sp).toFixed(4);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2);readout(st.st.k);st.draw()}));
  document.getElementById('rd-oneR').addEventListener('click',()=>{Object.assign(prm,DEF);syncIn();readout(st.st.k);st.draw()});
  syncIn();readout(0);
})();

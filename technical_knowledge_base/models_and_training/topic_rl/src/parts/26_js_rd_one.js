// ---- Reading section 10: one episode, every target; and the exact bias-variance dial ----
(function(){
  const E=window.RDE;
  // ---- one episode, every target ----
  (function(){
    const DEF={g:0.9,lam:0.5,R1:0,R2:0,R3:1,V0:0.2,V1:0.4,V2:0.7,alpha:0.1,p:0.8};
    const SL=[['g','γ',0.5,1,0.01],['lam','λ',0,1,0.05],['R1','R₁',-1,1,0.1],['R2','R₂',-1,1,0.1],['R3','R₃',-1,2,0.1],['V0','V(S₀)',-1,1,0.05],['V1','V(S₁)',-1,1,0.05],['V2','V(S₂)',-1,1,0.05],['alpha','α',0.05,1,0.05],['p','DP: P(S₁ | S₀)',0,1,0.05]];
    const box=document.getElementById('rd-oneS'),P=document.getElementById('rd-oneP'),Tt=document.getElementById('rd-oneT'),Eq=document.getElementById('rd-oneE'),Xp=document.getElementById('rd-oneX');
    const prm=Object.assign({},DEF);
    box.innerHTML=SL.map(([k,l,mn,mx,st])=>'<label>'+l+' = <b id="rd-one-'+k+'v"></b><input type="range" id="rd-one-'+k+'" min="'+Math.round(mn/st)+'" max="'+Math.round(mx/st)+'" step="1" aria-label="'+l+'"></label>').join('');
    function syncIn(){SL.forEach(([k,l,mn,mx,st])=>{document.getElementById('rd-one-'+k).value=Math.round(prm[k]/st);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2)})}
    SL.forEach(([k,l,mn,mx,st])=>document.getElementById('rd-one-'+k).addEventListener('input',e=>{prm[k]=Math.round(+e.target.value)*st;prm[k]=+prm[k].toFixed(4);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2);an.redraw()}));
    // steps: which rewards are real (count) and which estimate is used
    const STEPS=[
      {k:'ep',name:'The episode'},
      {k:'td',name:'TD(0)',real:1,est:1},
      {k:'two',name:'Two-step return',real:2,est:2},
      {k:'mc',name:'Monte Carlo',real:3,est:-1},
      {k:'lam',name:'λ-return',real:3,est:3},
      {k:'dp',name:'Dynamic programming',real:0,est:1},
      {k:'rf',name:'REINFORCE weight',real:3,est:0},
      {k:'ac',name:'Actor-critic TD error',real:1,est:1},
      {k:'grpo',name:'GRPO (separate case)'}];
    function T(){return E.targets({g:prm.g,lam:prm.lam,n:2,R:[prm.R1,prm.R2,prm.R3],V:[prm.V0,prm.V1,prm.V2],alpha:prm.alpha,pDP:prm.p})}
    function draw(i){const st=STEPS[i],t=T(),W=RD.width(P),f=v=>RD.n(v,3),g=RD.n(prm.g,2);
      const H=200;let s='';const nx=[0.08,0.36,0.64,0.92].map(x=>x*W),ny=40;
      const R=[prm.R1,prm.R2,prm.R3],V=[prm.V0,prm.V1,prm.V2];
      for(let j=0;j<4;j++){const isEst=st.est===j||(st.k==='lam'&&(j===1||j===2))||(st.k==='rf'&&j===0)||(st.k==='ac'&&(j===0||j===1));
        s+='<circle cx="'+nx[j]+'" cy="'+ny+'" r="'+(j<3?20:14)+'" fill="'+(j===3?'var(--soft)':isEst?'color-mix(in srgb, var(--c1) 35%, var(--bg))':'var(--bg)')+'" stroke="'+(isEst?'var(--c1)':'var(--line)')+'" stroke-width="'+(isEst?2.5:1)+'"/>';
        s+=RD.t(nx[j],ny+(j<3?-3:4),j<3?'S'+'₀₁₂'[j]:'end',{a:'middle',fs:11,w:600});if(j<3)s+=RD.t(nx[j],ny+11,'V '+RD.n(V[j],2),{a:'middle',fs:9.5,fill:'var(--mute)'});
        if(j<3){const real=st.real>j;const mx=(nx[j]+nx[j+1])/2;s+='<line x1="'+(nx[j]+21)+'" x2="'+(nx[j+1]-(j<2?21:15))+'" y1="'+ny+'" y2="'+ny+'" stroke="'+(real?'var(--c3)':'var(--line)')+'" stroke-width="'+(real?4:1.5)+'"/>'+RD.t(mx,ny-10,'R'+'₁₂₃'[j]+' = '+RD.n(R[j],1),{a:'middle',fs:10.5,fill:real?'var(--c3)':'var(--mute)',w:real?600:400})}}
      if(st.k==='dp')s+=RD.t(nx[0],ny+38,'or the end, prob. '+RD.n(1-prm.p,2),{a:'start',fs:10,fill:'var(--c2)'})+RD.t(nx[1],ny+38,'prob. '+RD.n(prm.p,2),{a:'middle',fs:10,fill:'var(--c2)'});
      // number line of all targets so far
      const all=[['TD(0)',t.td],['two-step',t.two],['MC',t.mc],['λ',t.lam],['DP',t.dp]];
      const shown=st.k==='ep'||st.k==='grpo'?[]:all.slice(0,Math.min(5,i));
      const vals=all.map(a=>a[1]).concat([prm.V0]),lo=Math.min(...vals)-0.08,hi=Math.max(...vals)+0.08,X=v=>30+(W-60)*(v-lo)/(hi-lo),ly=150;
      if(st.k==='grpo'){const A=E.groupAdv([1,0,0,0],'grpo').A;const bw=(W-40)/4;
        A.forEach((a,j)=>{const x=20+j*bw;s+='<rect x="'+(x+4)+'" y="96" width="'+(bw-8)+'" height="60" rx="6" fill="'+(a>0?'color-mix(in srgb, var(--c3) 30%, var(--bg))':'color-mix(in srgb, var(--c2) 22%, var(--bg))')+'" stroke="var(--line)"/>'+RD.t(x+bw/2,116,'response '+(j+1)+': reward '+(j?0:1),{a:'middle',fs:10.5})+RD.t(x+bw/2,140,'Â = '+RD.sg(a,3),{a:'middle',fs:13,w:600})});
        s+=RD.t(W/2,180,'group mean 0.25, standard deviation 0.433; no S₀ estimate is used at all',{a:'middle',fs:10.5,fill:'var(--mute)'})}
      else{s+='<line x1="30" x2="'+(W-30)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--line)"/>';
        s+='<line x1="'+X(prm.V0)+'" x2="'+X(prm.V0)+'" y1="'+(ly-26)+'" y2="'+(ly+8)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(X(prm.V0),ly+22,'V(S₀) = '+RD.n(prm.V0,2),{a:'middle',fs:10,fill:'var(--mute)'});
        shown.forEach((a,j)=>{const cur=j===shown.length-1&&STEPS[i].k===['td','two','mc','lam','dp'][j];const x=X(a[1]),yy=ly-10-((j%2)*16);
          s+='<circle cx="'+x+'" cy="'+ly+'" r="'+(cur?7:4.5)+'" fill="'+(cur?'var(--c1)':'var(--mute)')+'"/>'+RD.t(x,yy-6,a[0]+' '+RD.n(a[1],3),{a:'middle',fs:cur?11:9.5,w:cur?600:400,fill:cur?'var(--ink)':'var(--mute)'})});
        if(st.k==='rf'||st.k==='ac'){const w=st.k==='rf'?t.reinforceB:t.delta;s+=RD.t(W/2,ly+40,'policy-gradient weight on the first action: '+RD.sg(w,3),{a:'middle',fs:11.5,w:600,fill:'var(--c4)'})}}
      P.innerHTML=RD.svg(W,H+20,s,'One episode, every target');
      Tt.textContent=st.name+(st.k!=='ep'&&st.k!=='grpo'&&st.k!=='rf'&&st.k!=='ac'?': target '+f({td:t.td,two:t.two,mc:t.mc,lam:t.lam,dp:t.dp}[st.k]):'');
      const upd=v=>' → update '+RD.n(prm.V0,2)+' + '+RD.n(prm.alpha,2)+' × ('+f(v)+' − '+RD.n(prm.V0,2)+') = '+f(t.upd(v));
      const w=t.w;
      ({ep:()=>{Eq.innerHTML='S₀ → S₁ → S₂ → end, γ = '+g+', rewards '+[prm.R1,prm.R2,prm.R3].map(v=>RD.n(v,1)).join(', ');Xp.innerHTML='One episode and the current estimates of each state. Every method below builds a different target for <b>S₀</b> from it: green links are real rewards the target uses, blue circles the estimates it trusts.'},
        td:()=>{Eq.innerHTML='R₁ + γV(S₁) = '+RD.n(prm.R1,2)+' + '+g+' × '+RD.n(prm.V1,2)+' = '+f(t.td)+upd(t.td);Xp.innerHTML='One real reward, then trust the estimate of the next state. Low variance; inherits any error in V(S₁).'},
        two:()=>{Eq.innerHTML='R₁ + γR₂ + γ²V(S₂) = '+f(t.two)+upd(t.two);Xp.innerHTML='Two real rewards, then the estimate: one notch along the dial.'},
        mc:()=>{Eq.innerHTML='G₀ = R₁ + γR₂ + γ²R₃ = '+f(t.mc)+upd(t.mc);Xp.innerHTML='All real rewards, no estimate: unbiased, but every step\'s randomness is in it. Here it is also the n-step return for any n ≥ 3.'},
        lam:()=>{Eq.innerHTML=RD.n(w[0],3)+' × '+f(t.td)+' + '+RD.n(w[1],3)+' × '+f(t.two)+' + '+RD.n(w[2],3)+' × '+f(t.mc)+' = '+f(t.lam);Xp.innerHTML='Weights (1 − λ), (1 − λ)λ and the remaining λ² on the full return; λ = 0 gives TD(0), λ = 1 gives Monte Carlo. Move λ to slide between them.'},
        dp:()=>{Eq.innerHTML=RD.n(prm.p,2)+' × ('+RD.n(prm.R1,2)+' + '+g+' × '+RD.n(prm.V1,2)+') + '+RD.n(1-prm.p,2)+' × 0 = '+f(t.dp);Xp.innerHTML='If the model were known (S₀ reaches S₁ with probability '+RD.n(prm.p,2)+', otherwise the episode ends with reward 0), the target is the expectation itself: no sample is used.'},
        rf:()=>{Eq.innerHTML='G₀ − V(S₀) = '+f(t.mc)+' − '+RD.n(prm.V0,2)+' = '+RD.sg(t.reinforceB,3);Xp.innerHTML='A policy-gradient method does not move V(S₀); it scales ∇ log π of the first action by a weight. REINFORCE with V(S₀) as baseline uses the whole return minus the baseline (section 13).'},
        ac:()=>{Eq.innerHTML='δ₀ = R₁ + γV(S₁) − V(S₀) = '+f(t.td)+' − '+RD.n(prm.V0,2)+' = '+RD.sg(t.delta,3);Xp.innerHTML='An actor-critic uses the critic\'s TD error as the advantage: lower variance than REINFORCE, biased by the critic.'},
        grpo:()=>{Eq.innerHTML='Â = (r − mean) / std: (1 − 0.25)/0.433 = +1.732; (0 − 0.25)/0.433 = −0.577';Xp.innerHTML='GRPO, on a separate illustrative case: four responses to one prompt score 1, 0, 0, 0. The group\'s own mean replaces V; the advantage applies to every token of its response (section 18).'}})[st.k]()}
    const an=RD.anim({card:'rd-one',ctl:'rd-oneC',n:STEPS.length,ms:2600,draw,label:'Target'});
    document.getElementById('rd-oneR').addEventListener('click',()=>{Object.assign(prm,DEF);syncIn();an.redraw()});
    syncIn();an.redraw();RD.onResize(()=>an.redraw());
  })();

  // ---- the dial ----
  (function(){
    const Es=document.getElementById('rd-dlE'),Ls=document.getElementById('rd-dlL'),P=document.getElementById('rd-dlP'),O=document.getElementById('rd-dlO');
    function draw(){const err=+Es.value/100,lam=+Ls.value/100;document.getElementById('rd-dlEv').textContent=RD.n(err,2);document.getElementById('rd-dlLv').textContent=lam.toFixed(2);
      const pts=[];for(let k=0;k<=100;k++)pts.push(E.dial(0.9,0.5,err,k/100));const mx=Math.max(...pts.map(p=>p.mse),...pts.map(p=>p.vr))*1.08||1;
      const W=RD.width(P),H=200,l=40,r=10,t=10,b=26,X=v=>l+(W-l-r)*v,Y=v=>t+(H-t-b)*(1-v/mx);let s='';
      [0,mx/2,mx].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,2),{a:'end',fs:10,fill:'var(--mute)'})});
      [['b2','var(--c2)','bias²'],['vr','var(--c1)','variance'],['mse','var(--ink)','mean squared error']].forEach(([k,c,lab],j)=>{s+='<polyline fill="none" stroke="'+c+'" stroke-width="'+(k==='mse'?2.6:1.8)+'" points="'+pts.map((p,i)=>X(i/100).toFixed(1)+','+Y(p[k]).toFixed(1)).join(' ')+'"/>'});
      let bi=0;pts.forEach((p,i)=>{if(p.mse<pts[bi].mse)bi=i});
      s+='<line x1="'+X(lam)+'" x2="'+X(lam)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--c4)" stroke-dasharray="4 3"/>';
      s+='<circle cx="'+X(bi/100)+'" cy="'+Y(pts[bi].mse)+'" r="4.5" fill="var(--c3)"/>';
      s+=RD.t(l,H-8,'λ = 0 (TD)',{fs:10,fill:'var(--mute)'})+RD.t(W-r,H-8,'λ = 1 (Monte Carlo)',{a:'end',fs:10,fill:'var(--mute)'});
      P.innerHTML=RD.svg(W,H,s,'Bias and variance against lambda')+'<div class="leg"><span><i class="ln" style="background:var(--c2)"></i>bias²</span><span><i class="ln" style="background:var(--c1)"></i>variance</span><span><i class="ln" style="background:var(--ink)"></i>mean squared error</span><span><i style="background:var(--c3);border-radius:50%"></i>best λ</span></div>';
      const d=E.dial(0.9,0.5,err,lam);
      O.innerHTML=RD.stat('Bias at this λ',RD.sg(d.bias,4),'E[target] − 1.355')+RD.stat('Variance',RD.n(d.vr,4),'over the 8 outcomes')+RD.stat('Mean squared error',RD.n(d.mse,4),'bias² + variance')+RD.stat('Best λ',RD.n(bi/100,2),'MSE '+RD.n(pts[bi].mse,4))}
    Es.addEventListener('input',draw);Ls.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
    document.getElementById('rd-dlB').addEventListener('click',()=>{document.getElementById('rd-dlA').hidden=false;document.getElementById('rd-dlB').hidden=true});
  })();
})();

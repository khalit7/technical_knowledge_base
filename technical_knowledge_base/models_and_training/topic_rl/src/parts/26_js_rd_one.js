// ---- Reading, "The one idea": one episode, every target ----
(function(){
  const E=window.RDE;
  const DEF={g:0.9,lam:0.5,R3:1,V0:0.2,V1:0.4,V2:0.7,alpha:0.1,p:0.8};
  const SL=[['g','γ',0.5,1,0.01],['lam','λ',0,1,0.05],['R3','final reward R₃',-1,2,0.1],['V1','estimate V(S₁)',-1,1,0.05],['V2','estimate V(S₂)',-1,1,0.05]];
  const box=document.getElementById('rd-oneS'),P=document.getElementById('rd-oneP'),Tt=document.getElementById('rd-oneT'),Eq=document.getElementById('rd-oneE'),Xp=document.getElementById('rd-oneX');
  const prm=Object.assign({},DEF);
  box.innerHTML=SL.map(([k,l,mn,mx,st])=>'<label>'+l+' = <b id="rd-one-'+k+'v"></b><input type="range" id="rd-one-'+k+'" min="'+Math.round(mn/st)+'" max="'+Math.round(mx/st)+'" step="1" aria-label="'+l+'"></label>').join('');
  function syncIn(){SL.forEach(([k,l,mn,mx,st])=>{document.getElementById('rd-one-'+k).value=Math.round(prm[k]/st);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2)})}
  const STEPS=[
    {k:'ep',name:'The episode'},
    {k:'td',name:'TD(0): one real reward, then trust the estimate',real:1,est:[1]},
    {k:'two',name:'Two-step return',real:2,est:[2]},
    {k:'mc',name:'Monte Carlo: all real rewards',real:3,est:[]},
    {k:'lam',name:'λ-return: a blend',real:3,est:[1,2]},
    {k:'dp',name:'Dynamic programming: the exact expectation',real:0,est:[1]},
    {k:'pg',name:'Policy gradients: the same targets as weights',real:3,est:[0,1]},
    {k:'grpo',name:'GRPO: the group is the baseline'}];
  function T(){return E.targets({g:prm.g,lam:prm.lam,R:[0,0,prm.R3],V:[prm.V0,prm.V1,prm.V2],alpha:prm.alpha,pDP:prm.p})}
  function draw(i){const st=STEPS[i],t=T(),W=RD.width(P),f=v=>RD.n(v,3),g=RD.n(prm.g,2),narrow=W<480;
    const H=narrow?190:180;let s='';const nx=[0.08,0.36,0.64,0.92].map(x=>x*W),ny=36,R=[0,0,prm.R3],V=[prm.V0,prm.V1,prm.V2];
    for(let j=0;j<4;j++){const isEst=(st.est||[]).indexOf(j)>=0;
      s+='<circle cx="'+nx[j]+'" cy="'+ny+'" r="'+(j<3?19:14)+'" fill="'+(j===3?'var(--soft)':isEst?'color-mix(in srgb, var(--c1) 35%, var(--bg))':'var(--bg)')+'" stroke="'+(isEst?'var(--c1)':'var(--line)')+'" stroke-width="'+(isEst?2.5:1)+'"/>';
      s+=RD.t(nx[j],ny+(j<3?-3:4),j<3?'S'+'₀₁₂'[j]:'end',{a:'middle',fs:11,w:600});if(j<3)s+=RD.t(nx[j],ny+11,'V '+RD.n(V[j],2),{a:'middle',fs:9.5,fill:'var(--mute)'});
      if(j<3){const real=st.real>j;s+='<line x1="'+(nx[j]+20)+'" x2="'+(nx[j+1]-(j<2?20:15))+'" y1="'+ny+'" y2="'+ny+'" stroke="'+(real?'var(--c3)':'var(--line)')+'" stroke-width="'+(real?4:1.5)+'"/>'+RD.t((nx[j]+nx[j+1])/2,ny+(narrow?-24:-10),'R'+'₁₂₃'[j]+' '+RD.n(R[j],1),{a:'middle',fs:10.5,fill:real?'var(--c3)':'var(--mute)',w:real?600:400})}}
    if(st.k==='grpo'){const A=E.groupAdv([1,0,0,0]).A,bw=(W-20)/4;s='';
      A.forEach((a,j)=>{const x=10+j*bw;s+='<rect x="'+(x+3)+'" y="20" width="'+(bw-6)+'" height="64" rx="6" fill="'+(a>0?'color-mix(in srgb, var(--c3) 30%, var(--bg))':'color-mix(in srgb, var(--c2) 22%, var(--bg))')+'" stroke="var(--line)"/>'+RD.t(x+bw/2,42,'answer '+(j+1),{a:'middle',fs:10.5})+RD.t(x+bw/2,58,'reward '+(j?0:1),{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(x+bw/2,76,'Â '+RD.sg(a,3),{a:'middle',fs:12,w:600})});
      s+=RD.t(W/2,110,'mean 0.25, standard deviation 0.433',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    else{const all=[['TD',t.td],['2-step',t.two],['MC',t.mc],['λ',t.lam],['DP',t.dp]],shown=st.k==='ep'?[]:all.slice(0,Math.min(5,i));
      const vals=all.map(a=>a[1]).concat([prm.V0]),lo=Math.min(...vals)-0.1,hi=Math.max(...vals)+0.1,X=v=>24+(W-48)*(v-lo)/(hi-lo),ly=128;
      s+='<line x1="24" x2="'+(W-24)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--line)"/>';
      s+='<line x1="'+X(prm.V0)+'" x2="'+X(prm.V0)+'" y1="'+(ly-8)+'" y2="'+(ly+8)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(X(prm.V0),ly+22,'current V(S₀) '+RD.n(prm.V0,2),{a:'middle',fs:10,fill:'var(--mute)'});
      shown.forEach((a,j)=>{const cur=st.k===['td','two','mc','lam','dp'][j];const x=X(a[1]),yy=ly-12-((j%2)*16);
        s+='<circle cx="'+x+'" cy="'+ly+'" r="'+(cur?7:4.5)+'" fill="'+(cur?'var(--c1)':'var(--mute)')+'"/>'+RD.t(x,yy,a[0]+' '+RD.n(a[1],2),{a:'middle',fs:cur?11:9.5,w:cur?600:400,fill:cur?'var(--ink)':'var(--mute)'})});
      if(st.k==='pg')s+=RD.t(W/2,ly+42,'REINFORCE weight '+RD.sg(t.reinforceB,2)+'; actor-critic weight '+RD.sg(t.delta,2),{a:'middle',fs:11,w:600,fill:'var(--c4)'})}
    P.innerHTML=RD.svg(W,H,s,'One episode, every target');
    Tt.textContent=st.name;
    ({ep:()=>{Eq.innerHTML='S₀ → S₁ → S₂ → end; γ = '+g+'; rewards 0, 0, '+RD.n(prm.R3,1);Xp.innerHTML='One episode and the agent\'s current estimate of each state. Every method builds a different target for <b>S₀</b> from it: green links are real rewards the target uses, blue circles the estimates it trusts.'},
      td:()=>{Eq.innerHTML='R₁ + γV(S₁) = 0 + '+g+' × '+RD.n(prm.V1,2)+' = '+f(t.td);Xp.innerHTML='Low variance, available after one step; wrong if V(S₁) is wrong. Move the V(S₁) slider and only this target (and the blends) move.'},
      two:()=>{Eq.innerHTML='R₁ + γR₂ + γ²V(S₂) = '+f(t.two);Xp.innerHTML='Two real rewards, then the estimate: one notch along the dial.'},
      mc:()=>{Eq.innerHTML='G₀ = R₁ + γR₂ + γ²R₃ = '+f(t.mc);Xp.innerHTML='No estimate at all: unbiased, but every step\'s randomness is in it, and it waits for the end.'},
      lam:()=>{Eq.innerHTML=RD.n(t.w[0],2)+' × TD + '+RD.n(t.w[1],2)+' × 2-step + '+RD.n(t.w[2],2)+' × MC = '+f(t.lam);Xp.innerHTML='λ slides between TD (λ = 0) and Monte Carlo (λ = 1). GAE in PPO is the same dial.'},
      dp:()=>{Eq.innerHTML='0.8 × (0 + '+g+' × '+RD.n(prm.V1,2)+') + 0.2 × 0 = '+f(t.dp);Xp.innerHTML='With a known model (S₀ reaches S₁ with probability 0.8, otherwise the episode ends) the target is the expectation itself, with no sample.'},
      pg:()=>{Eq.innerHTML='G₀ − V(S₀) = '+RD.sg(t.reinforceB,3)+';  δ₀ = TD − V(S₀) = '+RD.sg(t.delta,3);Xp.innerHTML='Policy-gradient methods do not move V(S₀); they make the first action more likely in proportion to a weight built from the same targets: the return minus a baseline (REINFORCE), or the critic\'s TD error (actor-critic).'},
      grpo:()=>{Eq.innerHTML='Â = (r − mean) / std: (1 − 0.25)/0.433 = +1.732; (0 − 0.25)/0.433 = −0.577';Xp.innerHTML='A separate case: four answers to one prompt score 1, 0, 0, 0. No estimate of any state is used; the group\'s own mean stands in for it, and each answer\'s advantage applies to all its tokens.'}})[st.k]()}
  const an=RD.anim({card:'rd-one',ctl:'rd-oneC',n:STEPS.length,ms:2600,draw,label:'Target'});
  SL.forEach(([k,l,mn,mx,st])=>document.getElementById('rd-one-'+k).addEventListener('input',e=>{prm[k]=+(Math.round(+e.target.value)*st).toFixed(4);document.getElementById('rd-one-'+k+'v').textContent=RD.n(prm[k],2);an.redraw()}));
  document.getElementById('rd-oneR').addEventListener('click',()=>{Object.assign(prm,DEF);syncIn();an.redraw()});
  syncIn();an.redraw();RD.onResize(()=>an.redraw());
})();

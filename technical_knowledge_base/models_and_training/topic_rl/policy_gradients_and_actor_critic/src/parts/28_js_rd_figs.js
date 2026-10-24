// ---- Static figures added in the 2026-10-24 rebuild: the hero (two dials), the short corridor and J(p) (section 1),
// reward-to-go (section 2), A3C against A2C (section 7), the natural-gradient slider (section 8) and the
// off-policy actor-critic loop (section 11). Nothing here moves by itself. ----
(function(){
  const $=id=>document.getElementById(id),E=window.PGE;if(!$('rd-hero'))return;
  const T=RD.t,esc=RD.esc;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"/>'};
  const mk=id=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const arr=(x1,y1,x2,y2,id,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.4)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+' marker-end="url(#'+id+')"/>'};
  const jump=el=>el.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(!g)return;const s=$(g.getAttribute('data-go'));if(s)s.scrollIntoView({behavior:RD.RM?'auto':'smooth',block:'start'})});

  // ---------- Hero: the two dials ----------
  const D1={title:'What weights the score ∇ log π(a | s)',items:[['Gₜ','REINFORCE','rd-rf'],['Gₜ − b(s)','baseline, RLOO, GRPO','rd-base'],['GAE(γ, λ)','A2C, PPO','rd-gae'],['TD error δₜ','one-step actor-critic','rd-ac'],['∇ₐ Q(s, a)','DDPG, TD3, SAC','rd-dpg']],
    ends:['sampled returns: unbiased, noisy','learned critic: low variance, biased']};
  const D2={title:'How far one batch may move the policy',items:[['step size α','REINFORCE, A2C','rd-a2c'],['KL ≤ δ','natural gradient, TRPO','rd-trpo'],['clip 1 ± ε','PPO','rd-ppo'],['replay + target nets','DDPG, TD3','rd-dpg'],['+ entropy α·ℋ','SAC','rd-sac']],
    groups:[[0,2,'on-policy: fresh data for every update'],[3,4,'off-policy: a replay buffer']]};
  function hero(){const el=$('rd-hero'),W=RD.width(el),nar=W<600;let s=mk('rd-hA');
    const chip=(x,y,w,h,it,acc,left)=>'<g data-go="'+it[2]+'">'+box(x,y,w,h,{stroke:acc?'var(--acc)':'var(--mute)',sw:acc?1.6:1.1,fill:'var(--bg)'})+
      T(left?x+10:x+w/2,y+(h>40?19:17),it[0],{a:left?'start':'middle',fs:13,w:600,fill:acc?'var(--acc)':'var(--ink)'})+T(left?x+10:x+w/2,y+(h>40?36:33),it[1],{a:left?'start':'middle',fs:11.5,fill:'var(--mute)'})+'</g>';
    let y=4,H;
    if(!nar){const g=8,cw=(W-2*4-4*g)/5,ch=46,X=i=>4+i*(cw+g);
      s+=T(4,y+13,D1.title,{fs:12.5,w:600});y+=22;
      D1.items.forEach((it,i)=>s+=chip(X(i),y,cw,ch,it,true,false));y+=ch+10;
      s+=arr(X(0)+8,y+4,X(4)+cw-8,y+4,'rd-hA',{c:'var(--acc)'})+T(X(0)+8,y+20,D1.ends[0],{fs:11,fill:'var(--mute)'})+T(X(4)+cw-8,y+20,D1.ends[1],{a:'end',fs:11,fill:'var(--mute)'});y+=40;
      s+=T(4,y+13,D2.title,{fs:12.5,w:600});y+=22;
      D2.items.forEach((it,i)=>s+=chip(X(i),y,cw,ch,it,false,false));y+=ch+8;
      D2.groups.forEach(([a,b,lab])=>{const x1=X(a)+4,x2=X(b)+cw-4;s+='<path d="M'+x1+','+y+' v6 H'+x2+' v-6" fill="none" stroke="var(--mute)"/>'+T((x1+x2)/2,y+20,lab,{a:'middle',fs:11,fill:'var(--mute)'})});H=y+26}
    else{const cw=W-30,ch=40,x=26;
      s+=T(0,y+13,D1.title,{fs:12.5,w:600});y+=20;s+=T(x,y+12,'↑ '+D1.ends[0],{fs:11,fill:'var(--mute)'});y+=18;const y0=y;
      D1.items.forEach(it=>{s+=chip(x,y,cw,ch,it,true,true);y+=ch+5});
      s+=arr(10,y0+4,10,y-8,'rd-hA',{c:'var(--acc)'});s+=T(x,y+10,'↓ '+D1.ends[1],{fs:11,fill:'var(--mute)'});y+=26;
      s+=T(0,y+13,D2.title,{fs:12.5,w:600});y+=20;
      D2.groups.forEach(([a,b,lab])=>{s+=T(x,y+12,lab,{fs:11,fill:'var(--mute)'});y+=17;const yy=y;for(let i=a;i<=b;i++){s+=chip(x,y,cw,ch,D2.items[i],false,true);y+=ch+5}
        s+='<path d="M'+(x-6)+','+(yy+4)+' h-6 V'+(y-9)+' h6" fill="none" stroke="var(--mute)"/>';y+=4});H=y}
    el.innerHTML=RD.svg(W,H,s,'Two dials: what weights the score function, from sampled returns to a learned critic; and how far one batch may move the policy, from a step size to a KL limit, a clip, replay and an entropy bonus')}
  jump($('rd-hero'));

  // ---------- Section 1: the short corridor and J(p) ----------
  function corridor(){const el=$('rd-jpW'),W=RD.width(el),n=4,g=Math.min(40,W*0.06),bw=Math.min(120,(W-8-3*g)/n),x0=(W-(n*bw+3*g))/2,y=22,h=40,nar=bw<100;let s=mk('rd-jA');
    for(let i=0;i<n;i++){const x=x0+i*(bw+g);s+=box(x,y,bw,h,{fill:i===3?'var(--acc2)':(i===1?'var(--hl)':'var(--soft)')});
      if(i===0)s+=T(x+bw/2,y+25,'start',{a:'middle',fs:11.5});
      if(i===3)s+=T(x+bw/2,y+25,'goal',{a:'middle',fs:11.5,w:600});
      if(i===1){s+=T(x+bw/2,y+(nar?17:25),nar?'switched':'actions switched',{a:'middle',fs:11.5});if(nar)s+=T(x+bw/2,y+32,'R ↔ L',{a:'middle',fs:11,fill:'var(--mute)'})}
      if(i<3){s+=T(x+bw/2,y+h+15,'−1 per step',{a:'middle',fs:11,fill:'var(--mute)'});s+=arr(x+bw+2,y+h/2,x+bw+g-2,y+h/2,'rd-jA')}}
    s+=T(W/2,12,nar?'every state looks the same: p = P(right)':'the agent cannot tell the three states apart: one number p = P(right)',{a:'middle',fs:11.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+h+22,s,'The short corridor: three states and a goal, actions switched in the second state')}
  function jcurve(){const el=$('rd-jp'),W=RD.width(el),H=220,l=40,r=12,t=10,b=38,lo=-100,hi=-5,X=p=>l+(W-l-r)*p,Y=v=>t+(H-t-b)*(hi-Math.max(lo,v))/(hi-lo);let s='';
    [-100,-80,-60,-40,-20].forEach(v=>s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(l-4,Y(v)+4,String(v).replace('-','−'),{a:'end',fs:11,fill:'var(--mute)'}));
    const pts=[];for(let k=1;k<200;k++){const p=k/200;pts.push(X(p).toFixed(1)+','+Y(E.corV(p)[0]).toFixed(1))}
    s+='<polyline fill="none" stroke="var(--ink)" stroke-width="1.8" points="'+pts.join(' ')+'"/>';
    const m=(p,lab,col,dy)=>'<circle cx="'+X(p)+'" cy="'+Y(E.corV(p)[0])+'" r="5" fill="'+col+'"/>'+T(X(p)+(p>0.5?-8:8),Y(E.corV(p)[0])+dy,lab,{a:p>0.5?'end':'start',fs:11,fill:col});
    s+=m(0.05,'ε-greedy left −82.1','var(--mute)',-6)+m(0.95,'ε-greedy right −44.2','var(--mute)',16)+m(E.COR.pStar,'optimum p* 0.586, J* −11.66','var(--good)',20);
    [0,0.2,0.4,0.6,0.8,1].forEach(v=>s+=T(X(v),H-18,RD.n(v,1),{a:'middle',fs:11,fill:'var(--mute)'}));s+=T((l+W-r)/2,H-3,'probability of right, p',{a:'middle',fs:11,fill:'var(--mute)'});
    s+=T(X(0.5),H-b-8,'J(p), the value of the start state',{a:'middle',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Value of the start state against the probability of right, with the optimum at 0.586')}

  // ---------- Section 2: whole return against reward-to-go ----------
  const RW=[1,0,2,-1];
  function rtg(){const el=$('rd-rtg'),W=RD.width(el),two=W>=540,c=Math.min(40,Math.floor(((two?W/2:W)-100)/4)),pw=34+4*c+56,H1=26+20+4*c+6;let s='';
    const panel=(x0,y0,togo)=>{let q=T(x0,y0+12,togo?'Reward-to-go Gₜ':'Whole return G(τ)',{fs:12.5,w:600,fill:togo?'var(--acc)':'var(--ink)'});const yh=y0+26;
      RW.forEach((r,k)=>q+=T(x0+34+k*c+c/2,yh+12,'r<tspan dy="3">'+(k+1)+'</tspan>',{a:'middle',fs:12,fill:'var(--mute)'}));
      q+=T(x0+34+4*c+50,yh+12,'weight',{a:'end',fs:11,fill:'var(--mute)'});
      for(let t=0;t<4;t++){const y=yh+20+t*c;q+=T(x0+28,y+c/2+2,'a<tspan dy="3" font-size="11">'+t+'</tspan>',{a:'end',fs:13});let w=0;
        for(let k=0;k<4;k++){const on=!togo||k>=t;if(on)w+=RW[k];const x=x0+34+k*c;
          q+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(c-2)+'" height="'+(c-2)+'" rx="3" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>'+
            T(x+c/2,y+c/2+4,String(RW[k]).replace('-','−'),{a:'middle',fs:12,fill:on?'var(--ink)':'var(--dim)'});
          if(!on)q+='<line x1="'+(x+5)+'" y1="'+(y+c-5)+'" x2="'+(x+c-5)+'" y2="'+(y+5)+'" stroke="var(--dim)"/>'}
        q+=T(x0+34+4*c+50,y+c/2+4,String(w).replace('-','−'),{a:'end',fs:13,w:600,fill:togo?'var(--acc)':'var(--ink)'})}
      return q};
    let H;if(two){const gap=Math.max(16,(W-2*pw)/3);s+=panel(gap,0,false)+panel(2*gap+pw,0,true);H=H1}
    else{const x=Math.max(0,(W-pw)/2);s+=panel(x,0,false)+panel(x,H1+8,true);H=2*H1+8}
    el.innerHTML=RD.svg(W,H,s,'Two four by four grids: every action weighted by every reward, against only the rewards after it')}

  // ---------- Section 7: A3C against A2C on one clock (illustrative timings) ----------
  const DUR=[2.0,2.6,3.4,2.3],TEND=7.2,GAP=0.2;
  function a3cEvents(){const seg=[];DUR.forEach((d,w)=>{let t=0;while(t+d<=TEND){seg.push({w,t0:t,t1:t+d});t+=d+GAP}});
    const ends=seg.map(x=>x.t1).sort((a,b)=>a-b);
    seg.forEach(x=>{x.on=ends.filter(e=>e<=x.t0+1e-9).length;x.makes=ends.filter(e=>e<=x.t1+1e-9).length;x.stale=x.makes-1-x.on});return seg}
  function a2cEvents(){const seg=[],bars=[];let t=0,v=0;const m=Math.max(...DUR);while(t+m<=TEND){DUR.forEach((d,w)=>seg.push({w,t0:t,t1:t+d,bar:t+m,on:v}));v++;bars.push({t:t+m,v});t+=m+GAP}return {seg,bars}}
  window.PGF={a3cEvents,a2cEvents};
  function a3c(){const el=$('rd-a3c'),W=RD.width(el),l=W<480?62:74,r=10,X=t=>l+(W-l-r)*t/TEND,rh=30,H1=22+4*rh+8;let s='<defs><pattern id="rd-a3H" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--mute)" stroke-width="1.2"/></pattern></defs>';
    const A=a3cEvents(),worst=A.reduce((a,b)=>b.stale>a.stale?b:a,A[0]);
    const rows=(y0,title)=>{let q=T(0,y0+13,title,{fs:12.5,w:600});for(let w=0;w<4;w++)q+=T(l-6,y0+22+w*rh+21,'worker '+(w+1),{a:'end',fs:11,fill:'var(--mute)'});return q};
    s+=rows(0,W<560?'A3C: asynchronous':'A3C: asynchronous, a gradient lands whenever a worker finishes');
    A.forEach(x=>{const y=22+x.w*rh+12,bad=x===worst;s+='<rect x="'+X(x.t0)+'" y="'+y+'" width="'+(X(x.t1)-X(x.t0))+'" height="14" rx="3" fill="var(--acc2)" stroke="'+(bad?'var(--bad)':'var(--acc)')+'" stroke-width="'+(bad?2:1)+'"/>'+
      T((X(x.t0)+X(x.t1))/2,y+11,'on v'+x.on,{a:'middle',fs:11,fill:'var(--ink)'})+'<line x1="'+X(x.t1)+'" x2="'+X(x.t1)+'" y1="'+(y-6)+'" y2="'+(y+16)+'" stroke="var(--acc)" stroke-width="2"/>'+T(X(x.t1)-2,y-2,'→v'+x.makes,{a:'end',fs:11,fill:bad?'var(--bad)':'var(--acc)'})});
    const B=a2cEvents(),y2=H1+10;s+=rows(y2,W<560?'A2C: synchronous, one batched update':'A2C: synchronous, wait for all, one batched update');
    B.seg.forEach(x=>{const y=y2+22+x.w*rh+12;s+='<rect x="'+X(x.t0)+'" y="'+y+'" width="'+(X(x.t1)-X(x.t0))+'" height="14" rx="3" fill="var(--acc2)" stroke="var(--acc)"/>'+T((X(x.t0)+X(x.t1))/2,y+11,'on v'+x.on,{a:'middle',fs:11});
      if(x.bar>x.t1+1e-9)s+='<rect x="'+X(x.t1)+'" y="'+y+'" width="'+(X(x.bar)-X(x.t1))+'" height="14" fill="url(#rd-a3H)" opacity=".7"/>'});
    B.bars.forEach(b=>s+='<line x1="'+X(b.t)+'" x2="'+X(b.t)+'" y1="'+(y2+26)+'" y2="'+(y2+22+4*rh)+'" stroke="var(--acc)" stroke-width="2"/>'+T(X(b.t)-3,y2+34,'→v'+b.v,{a:'end',fs:11,fill:'var(--acc)'}));
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+(2*H1+12)+'" y2="'+(2*H1+12)+'" stroke="var(--line)"/>'+T(W-r,2*H1+26,'time →',{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,2*H1+30,s,'Four workers on one clock: A3C applies gradients as they finish, A2C waits at a barrier')}

  // ---------- Section 8: the natural gradient on a two-action policy ----------
  function ng(){const el=$('rd-ng');if(!el)return;const p=0.5+0.005*(+$('rd-ngP').value),d=(+$('rd-ngD').value)/1000,o=E.ngStep(p,1,d);
    $('rd-ngPv').textContent=p.toFixed(3);$('rd-ngDv').textContent=d.toFixed(3);
    const W=RD.width(el),H=200,l=36,r=12,t=12,b=34,z0=-1.5,z1=10.5,X=z=>l+(W-l-r)*(z-z0)/(z1-z0),Y=v=>t+(H-t-b)*(1-v),sg=z=>1/(1+Math.exp(-z));let s=mk('rd-nA');
    [0,0.5,1].forEach(v=>s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(l-4,Y(v)+4,RD.n(v,1),{a:'end',fs:11,fill:'var(--mute)'}));
    const pts=[];for(let k=0;k<=240;k++){const z=z0+(z1-z0)*k/240;pts.push(X(z).toFixed(1)+','+Y(sg(z)).toFixed(1))}
    s+='<polyline fill="none" stroke="var(--ink)" stroke-width="1.6" points="'+pts.join(' ')+'"/>';
    [0,2,4,6,8,10].forEach(v=>s+=T(X(v),H-18,String(v),{a:'middle',fs:11,fill:'var(--mute)'}));s+=T((l+W-r)/2,H-3,'logit difference z; the curve is p = σ(z)',{a:'middle',fs:11,fill:'var(--mute)'});
    const zA=o.z+1,zN=Math.min(z1,o.z+o.dzN);
    s+='<line x1="'+X(o.z)+'" x2="'+X(zA)+'" y1="'+(Y(p)+18)+'" y2="'+(Y(p)+18)+'" stroke="var(--c2)" stroke-width="3"/>'+T(X(o.z),Y(p)+32,'plain Δz = 1',{fs:11,fill:'var(--c2)'});
    s+='<line x1="'+X(o.z)+'" x2="'+X(zN)+'" y1="'+(Y(p)+44)+'" y2="'+(Y(p)+44)+'" stroke="var(--acc)" stroke-width="3"/>'+T(X(o.z),Y(p)+58,'natural Δz = '+RD.n(o.dzN,3),{fs:11,fill:'var(--acc)'});
    s+='<circle cx="'+X(o.z)+'" cy="'+Y(p)+'" r="5" fill="var(--ink)"/>'+'<circle cx="'+X(zA)+'" cy="'+Y(o.q)+'" r="5" fill="var(--c2)"/>'+'<circle cx="'+X(zN)+'" cy="'+Y(o.qN)+'" r="5" fill="var(--acc)"/>';
    el.innerHTML=RD.svg(W,H,s,'The sigmoid curve with a plain step and a natural step from the chosen probability');
    $('rd-ngN').innerHTML=RD.stat('Fisher F = p(1 − p)',o.F.toFixed(4),'')+RD.stat('Plain step Δz = 1',RD.n(p,3)+' → '+RD.n(o.q,3),'KL '+(o.kl<0.01?o.kl.toFixed(4):o.kl.toFixed(3))+' (quadratic '+(o.quad<0.01?o.quad.toFixed(4):o.quad.toFixed(3))+')')+
      RD.stat('Natural step for δ = '+d.toFixed(3),'Δz = '+RD.n(o.dzN,3),RD.n(p,3)+' → '+RD.n(o.qN,4)+', exact KL '+o.klN.toFixed(5))}
  if($('rd-ng')){['rd-ngP','rd-ngD'].forEach(id=>$(id).addEventListener('input',ng))}

  // ---------- Section 11: the off-policy actor-critic loop ----------
  const OAC={ddpg:{actor:['actor μθ(s)','deterministic; noise added to act'],critic:['critic Q(s, a)','regresses onto y'],targ:['target copies Q′, μ′','slow: τ = 0.001'],
      y:'y = r + γ Q′(s′, μ′(s′))',grad:'∇ₐQ(s, μ(s))',hi:[],
      cap:'DDPG: the critic regresses onto y = r + γQ′(s′, μ′(s′)); the actor climbs the critic\'s slope ∇ₐQ through the chain rule; exploration is noise added to the action; the targets follow the learned networks slowly (τ = 0.001).'},
    td3:{actor:['actor μθ(s)','updated every d = 2 critic steps'],critic:['twin critics Q₁, Q₂','both regress onto y'],targ:['target copies Q′₁, Q′₂, μ′','slow: τ = 0.005'],
      y:'y = r + γ min Q′ᵢ(s′, μ′(s′) + ε)',grad:'∇ₐQ₁(s, μ(s))',hi:['actor','critic','targ'],
      cap:'TD3 (changes in orange): two critics and the smaller target value; clipped noise ε ~ clip(𝒩(0, 0.2), −0.5, 0.5) on the target action; the actor and the targets update once every two critic steps.'},
    sac:{actor:['actor π(a | s)','tanh Gaussian, reparameterised'],critic:['twin critics Q₁, Q₂','both regress onto y'],targ:['target critics Q′₁, Q′₂','slow: τ = 0.005; α learned'],
      y:'y = r + γ(min Q′ᵢ(s′, a′) − α log π(a′ | s′))',grad:'∇ through a = tanh(μ + σξ)',hi:['actor','critic','targ'],
      cap:'SAC (changes in orange): a stochastic tanh-Gaussian actor sampled with the reparameterisation trick, so the gradient of α log π − Q flows through the sampled action; the target subtracts α log π of the next action a′ ~ π; twin critics as in TD3; α itself is learned toward the target entropy −dim(A).'}};
  let oacM='ddpg';
  function oac(){const el=$('rd-oac');if(!el)return;const M=OAC[oacM],W=RD.width(el),nar=W<620;let s=mk('rd-oA');
    const B={env:['environment','returns r, s′'],buf:['replay buffer','10⁶ transitions (s, a, r, s′)'],actor:M.actor,critic:M.critic,targ:M.targ};
    const bx=(k,x,y,w,h)=>{const hi=M.hi.indexOf(k)>=0;return box(x,y,w,h,{stroke:hi?'var(--bad)':'var(--mute)',sw:hi?2:1.1,fill:'var(--bg)'})+T(x+w/2,y+20,B[k][0],{a:'middle',fs:12.5,w:600,fill:hi?'var(--bad)':'var(--ink)'})+T(x+w/2,y+37,B[k][1],{a:'middle',fs:11,fill:'var(--mute)'})};
    const lab=(x,y,txt,a,col)=>T(x,y,txt,{a:a||'middle',fs:11,fill:col||'var(--mute)'});
    let H;
    if(!nar){const g=Math.max(50,W*0.09),bw=(W-2*g-8)/3,bh=48,x=[4,4+bw+g,4+2*(bw+g)],y1=18,y2=y1+bh+70;
      s+=bx('actor',x[0],y1,bw,bh)+bx('env',x[1],y1,bw,bh)+bx('buf',x[2],y1,bw,bh)+bx('targ',x[0],y2,bw,bh)+bx('critic',x[1],y2,bw,bh);
      s+=arr(x[0]+bw+2,y1+bh/2,x[1]-3,y1+bh/2,'rd-oA')+lab(x[0]+bw+g/2,y1+bh/2-6,'act');
      s+=arr(x[1]+bw+2,y1+bh/2,x[2]-3,y1+bh/2,'rd-oA')+lab(x[1]+bw+g/2,y1+bh/2-6,'store');
      s+=arr(x[2]+bw/2,y1+bh+2,x[1]+bw-10,y2-3,'rd-oA')+lab((x[2]+bw/2+x[1]+bw-10)/2+10,(y1+bh+y2)/2+4,'minibatch','start');
      s+=arr(x[1]+12,y2-3,x[0]+bw/2+10,y1+bh+3,'rd-oA',{c:'var(--acc)',w:2})+lab((x[1]+x[0]+bw/2+22)/2-8,(y1+bh+y2)/2+18,M.grad,'end','var(--acc)');
      s+=arr(x[0]+bw+2,y2+bh/2-8,x[1]-3,y2+bh/2-8,'rd-oA')+lab(x[0]+bw+g/2,y2+bh/2-14,'target y');
      s+=arr(x[1]-3,y2+bh/2+10,x[0]+bw+2,y2+bh/2+10,'rd-oA',{dash:true})+lab(x[0]+bw+g/2,y2+bh/2+24,'slow copy');
      s+=lab(W/2,y2+bh+24,'critic target: '+M.y,'middle',M.hi.length?'var(--bad)':'var(--ink)');
      H=y2+bh+32}
    else{const bw=W-60,bh=48,x=46,gy=40;let y=4;const pos={};['actor','env','buf','critic','targ'].forEach(k=>{pos[k]=y;s+=bx(k,x,y,bw,bh);y+=bh+gy});
      const cx=x+bw/2;s+=arr(cx,pos.actor+bh+2,cx,pos.env-3,'rd-oA')+lab(cx+8,pos.actor+bh+gy/2+4,'act','start');
      s+=arr(cx,pos.env+bh+2,cx,pos.buf-3,'rd-oA')+lab(cx+8,pos.env+bh+gy/2+4,'store','start');
      s+=arr(cx,pos.buf+bh+2,cx,pos.critic-3,'rd-oA')+lab(cx+8,pos.buf+bh+gy/2+4,'minibatch','start');
      s+=arr(cx-40,pos.targ-3,cx-40,pos.critic+bh+2,'rd-oA')+lab(cx-46,pos.critic+bh+gy/2+4,'target y','end');
      s+=arr(cx+40,pos.critic+bh+2,cx+40,pos.targ-3,'rd-oA',{dash:true})+lab(cx+46,pos.critic+bh+gy/2+4,'slow copy','start');
      s+='<path d="M'+x+','+(pos.critic+bh/2)+' H18 V'+(pos.actor+bh/2)+' H'+(x-3)+'" fill="none" stroke="var(--acc)" stroke-width="2" marker-end="url(#rd-oA)"/>';
      s+=T(12,(pos.actor+pos.critic+bh)/2,'∇ to actor',{a:'middle',fs:11,fill:'var(--acc)'}).replace('<text','<text transform="rotate(-90 12 '+((pos.actor+pos.critic+bh)/2)+')"');
      s+=lab(x+bw/2,y-gy+22,M.y,'middle',M.hi.length?'var(--bad)':'var(--ink)');H=y-gy+30}
    el.innerHTML=RD.svg(W,H,s,'The off-policy actor-critic loop: actor, environment, replay buffer, critic and target networks');
    $('rd-oacX').textContent=M.cap}
  if($('rd-oacM'))RD.seg($('rd-oacM'),m=>{oacM=m;oac()});

  function all(){hero();corridor();jcurve();rtg();a3c();ng();oac()}
  RD.onRender(all);RD.onResize(all);all();
})();

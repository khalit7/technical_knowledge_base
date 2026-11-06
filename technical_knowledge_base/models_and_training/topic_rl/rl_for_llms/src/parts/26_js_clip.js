// ---- Section 7: one rare token, sixteen minibatch updates, four objectives (PPO clip, clip-higher, CISPO, no clip) ----
(function(){
  const E=window.LLE,ST=16,MODES={ppo:'PPO / GRPO, ε 0.2',dapo:'Clip-higher, ε_high 0.28',cispo:'CISPO, weight cap 1.28',none:'No clip'};
  const COL={ppo:'var(--c2)',dapo:'var(--c5)',cispo:'var(--c1)',none:'var(--mute)'};
  const A_=document.getElementById('rd-czA'),B_=document.getElementById('rd-czB'),Xp=document.getElementById('rd-czX'),N=document.getElementById('rd-czN');
  const Ps=document.getElementById('rd-czP'),Hs=document.getElementById('rd-czH');
  let mode='ppo',runs={};
  // slider 0..100 maps log-uniformly to p0 in [0.01, 0.9]
  const p0f=()=>Math.exp(Math.log(0.01)+(Math.log(0.9)-Math.log(0.01))*(+Ps.value)/100);
  function compute(){const p0=p0f(),eta=+Hs.value/100;document.getElementById('rd-czPv').textContent=p0.toFixed(3);document.getElementById('rd-czHv').textContent=eta.toFixed(2);
    Object.keys(MODES).forEach(m=>runs[m]=E.rareToken(p0,m,eta,ST,1))}
  function draw(i){const W=RD.width(A_),H=180,l=44,r=10,t=10,b=24,p0=runs.ppo[0].p;
    const allp=[].concat(...Object.values(runs).map(h=>h.map(x=>x.p))),lo=Math.log10(Math.min(...allp))-0.05,hi=Math.log10(Math.max(...allp))+0.05;
    const X=k=>l+(W-l-r)*k/ST,Y=p=>t+(H-t-b)*(hi-Math.log10(p))/(hi-lo);let s='';
    [p0*1.2,p0*1.28].forEach((v,j)=>{if(Math.log10(v)<hi)s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="'+(j?COL.dapo:COL.ppo)+'" stroke-dasharray="3 3" opacity=".7"/>'});
    const ticks=[];for(let e=Math.ceil(lo);e<=Math.floor(hi);e++)ticks.push(e);
    ticks.filter(e=>Math.abs(Y(Math.pow(10,e))-Y(p0))>12).forEach(e=>s+=RD.t(l-4,Y(Math.pow(10,e))+4,e>=0?'1':'10^'+e,{a:'end',fs:11,fill:'var(--mute)'}));
    s+=RD.t(l-4,Y(p0)+4,RD.n(p0,3),{a:'end',fs:11,fill:'var(--mute)'});
    // the whole run drawn faintly from the first frame, so the card shows where each curve is heading
    Object.keys(MODES).forEach(m=>{s+='<polyline fill="none" stroke="'+COL[m]+'" stroke-width="1" stroke-dasharray="2 3" opacity=".3" points="'+runs[m].map((x,k)=>X(k).toFixed(1)+','+Y(x.p).toFixed(1)).join(' ')+'"/>'});
    Object.keys(MODES).forEach(m=>{const h=runs[m],on=m===mode;s+='<polyline fill="none" stroke="'+COL[m]+'" stroke-width="'+(on?2.8:1.3)+'" opacity="'+(on?1:.45)+'" points="'+h.slice(0,i+1).map((x,k)=>X(k).toFixed(1)+','+Y(x.p).toFixed(1)).join(' ')+'"/>'});
    const c=runs[mode][i];s+='<circle cx="'+X(i)+'" cy="'+Y(c.p)+'" r="5" fill="'+COL[mode]+'" stroke="var(--bg)"/>';
    s+=RD.t(l,H-8,'step 0',{fs:11,fill:'var(--mute)'})+RD.t(W-r,H-8,'step '+ST,{a:'end',fs:11,fill:'var(--mute)'});
    A_.innerHTML=RD.svg(W,H,s,'Probability of the token')+'<div class="leg">'+Object.keys(MODES).map(m=>'<span><i class="ln" style="background:'+COL[m]+'"></i>'+MODES[m]+'</span>').join('')+'</div>';
    // gradient weight bars for the selected mode
    const W2=RD.width(B_),H2=150,mx=Math.max(1.4,...runs[mode].map(x=>x.w)),bw=(W2-l-r)/(ST+1);s='';
    const Y2=v=>t+(H2-t-b)*(1-v/mx);
    s+='<line x1="'+l+'" x2="'+(W2-r)+'" y1="'+Y2(1).toFixed(1)+'" y2="'+Y2(1).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y2(1)+4,'1',{a:'end',fs:11,fill:'var(--mute)'})+RD.t(l-4,Y2(0)+4,'0',{a:'end',fs:11,fill:'var(--mute)'});
    runs[mode].slice(0,ST).forEach((x,k)=>{if(k>i)return;const y=Y2(x.w);s+='<rect x="'+(l+k*bw+1).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+(Y2(0)-y).toFixed(1)+'" fill="'+COL[mode]+'" opacity="'+(x.active?0.9:0.3)+'"/>';
      if(!x.active)s+=RD.t(l+k*bw+bw/2,Y2(0)-3,'0',{a:'middle',fs:11,fill:'var(--mute)'})});
    s+=RD.t(l,H2-8,'weight w on ∇log π of the token, per step',{fs:11,fill:'var(--mute)'});
    B_.innerHTML=RD.svg(W2,H2,s,'Gradient weight per step');
    const z=runs.ppo[ST].p,d=runs.dapo[ST].p,ci=runs.cispo[ST].p,nn=runs.none[ST].p;
    // a one-line live readout of this frame (the step list on the left explains each stretch)
    Xp.innerHTML='<b>Update '+i+' of '+ST+'</b> · '+MODES[mode]+': probability '+RD.n(c.p,4)+', ratio '+RD.n(c.r,3)+', weight '+(c.active?RD.n(c.w,3):'0 (clipped)');
    N.innerHTML=RD.stat('Final p, PPO clip',RD.n(z,4),'')+RD.stat('Final p, clip-higher',RD.n(d,4),'')+RD.stat('Final p, CISPO',RD.n(ci,4),'')+RD.stat('Steps with gradient',runs[mode].slice(0,ST).filter(x=>x.active).length+' of '+ST,MODES[mode])}
  compute();
  // sixteen updates grouped into four explained stretches (sx-cz): update 0, 1 to 3, 4 to 6, 7 to 16
  const sx=RD.stretch({card:'rd-cz',ctl:'rd-czC',list:'sx-cz',cps:[0,3,6,ST],frame:f=>draw(f),ms:4800,per:150,label:'Stretch'}),an={reset:()=>sx.reset(),redraw:()=>sx.redraw()};
  document.getElementById('rd-czM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset()});
  Ps.addEventListener('input',()=>{compute();an.redraw()});Hs.addEventListener('input',()=>{compute();an.redraw()});RD.onResize(()=>an.redraw());
})();

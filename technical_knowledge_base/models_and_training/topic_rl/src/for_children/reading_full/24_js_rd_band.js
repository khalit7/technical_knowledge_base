// ---- Reading section 7: four bandit strategies on the same reward table ----
(function(){
  const E=window.RDE,mu=E.BANDIT.mu,T=E.BANDIT.T,K=mu.length,best=Math.max(...mu);
  const ST={greedy:{kind:'greedy'},eps:{kind:'eps',eps:0.1},opt:{kind:'greedy',q0:5,alpha:0.1},ucb:{kind:'ucb',c:2}};
  const NAME={greedy:'Greedy',eps:'ε-greedy (ε = 0.1)',opt:'Optimistic greedy (Q₀ = 5, step 0.1)',ucb:'UCB (c = 2)'};
  const COL={greedy:'var(--c2)',eps:'var(--c1)',opt:'var(--c5)',ucb:'var(--c3)'};
  const A=document.getElementById('rd-bdA'),Rg=document.getElementById('rd-bdR'),Tt=document.getElementById('rd-bdT'),Px=document.getElementById('rd-bdP'),N=document.getElementById('rd-bdN'),Sd=document.getElementById('rd-bdS');
  let mode='eps',runs={};
  function compute(){const tab=E.banditTable(+Sd.value);runs={};Object.keys(ST).forEach(k=>runs[k]=E.banditRun(tab,ST[k]))}
  function draw(i){const h=runs[mode],cur=i>0?h[i-1]:null,Q=cur?cur.Q:new Array(K).fill(ST[mode].q0||0),Nn=cur?cur.N:new Array(K).fill(0);
    // arms
    let W=RD.width(A),H=190,l=30,r=6,t=12,b=34,lo=-1.5,hi=5.5,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo),cw=(W-l-r)/K;let s='';
    [-1,0,1,2,3,4,5].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,0),{a:'end',fs:10,fill:'var(--mute)'})});
    for(let k=0;k<K;k++){const x=l+k*cw,bw=Math.min(34,cw*0.55),cx=x+cw/2,y0=Y(0),yq=Y(Q[k]);const on=cur&&cur.a===k;
      s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+Math.min(y0,yq).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(yq-y0)).toFixed(1)+'" fill="'+(on?'var(--c2)':'var(--c1)')+'" opacity="'+(on?1:.75)+'"/>';
      s+='<line x1="'+(cx-bw/2-5)+'" x2="'+(cx+bw/2+5)+'" y1="'+Y(mu[k])+'" y2="'+Y(mu[k])+'" stroke="var(--ink)" stroke-width="2.5"/>';
      s+=RD.t(cx,H-20,'arm '+(k+1),{a:'middle',fs:10.5,w:mu[k]===best?600:400})+RD.t(cx,H-6,'n = '+Nn[k],{a:'middle',fs:10,fill:'var(--mute)'})}
    A.innerHTML=RD.svg(W,H,s,'Arm estimates');
    // regret curves for all four strategies
    W=RD.width(Rg);const H2=190,l2=36,b2=24,mx=Math.max(...Object.keys(runs).map(k=>runs[k][T-1].reg)),X=j=>l2+(W-l2-8)*j/T,Y2=v=>10+(H2-10-b2)*(1-v/mx);s='';
    [0,mx/2,mx].forEach(v=>{s+=RD.t(l2-4,Y2(v)+4,RD.n(v,0),{a:'end',fs:10,fill:'var(--mute)'})+'<line x1="'+l2+'" x2="'+(W-8)+'" y1="'+Y2(v)+'" y2="'+Y2(v)+'" stroke="var(--line)"/>'});
    Object.keys(runs).forEach(k=>{const pts=[[0,0]].concat(runs[k].map((x,j)=>[j+1,x.reg])).filter((p,j)=>j%3===0||j===T);
      s+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="'+(k===mode?3:1.3)+'" opacity="'+(k===mode?1:.6)+'" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y2(p[1]).toFixed(1)).join(' ')+'"/>';
      s+=RD.t(W-10,Y2(runs[k][T-1].reg)-3,k==='opt'?'optimistic':k==='eps'?'ε-greedy':k==='ucb'?'UCB':'greedy',{a:'end',fs:10,fill:COL[k],w:k===mode?600:400})});
    s+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="10" y2="'+(H2-b2)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(l2,H2-6,'pull 0',{fs:10,fill:'var(--mute)'})+RD.t(W-8,H2-6,'pull '+T,{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l2+4,22,'total regret',{fs:10,fill:'var(--mute)'});
    Rg.innerHTML=RD.svg(W,H2,s,'Regret');
    // caption and counters
    if(!cur){Tt.textContent=NAME[mode]+': before the first pull';Px.innerHTML={greedy:'Estimates start at 0. Greedy pulls whichever arm currently looks best, with ties going to the first arm.',eps:'Estimates start at 0. Nine pulls in ten are greedy; one in ten picks an arm at random.',opt:'Every estimate starts at 5, far above any true mean, so each arm disappoints when tried and the agent moves on.',ucb:'Each arm is pulled once, then UCB adds a bonus c √(ln t / n) that is large for rarely pulled arms.'}[mode]}
    else{const a=cur.a;Tt.textContent='Pull '+i+': '+NAME[mode]+' pulled arm '+(a+1)+' and got '+RD.n(cur.R,2);
      Px.innerHTML=(mu[a]===best?'Arm 4 is the best arm (true mean 1.5).':'Arm '+(a+1)+' has true mean '+RD.n(mu[a],1)+': this pull cost '+RD.n(best-mu[a],1)+' of regret.')+' '+(mode==='greedy'&&cur.N[a]>i*0.9&&i>20?'Greedy has locked onto one arm and never collects the evidence that another is better.':mode==='ucb'&&i>50?'UCB keeps a few pulls going to every arm, fewer as the uncertainty bonus shrinks.':'')}
    const bp=cur?cur.N[3]/i:0;
    N.innerHTML=RD.stat('Pulls',String(i),'of '+T)+RD.stat('Total regret',cur?RD.n(cur.reg,1):'0','Σ (1.5 − μ pulled)')+RD.stat('Best arm share',cur?RD.pct(bp,0):'none','arm 4')+RD.stat('Total reward',cur?RD.n(cur.tot,1):'0','this stream')}
  compute();
  const an=RD.anim({card:'rd-bd',ctl:'rd-bdC',n:T+1,ms:70,draw,label:'Pull'});
  document.getElementById('rd-bdM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.k;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  Sd.addEventListener('change',()=>{compute();an.redraw()});
  RD.onResize(()=>an.redraw());an.redraw();
})();

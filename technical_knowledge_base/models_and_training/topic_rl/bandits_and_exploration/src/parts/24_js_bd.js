// ---- Reading: five strategies on one bandit, the same reward for the same arm at the same step (before/after animation) ----
(function(){
  const E=window.BX,mu=E.BANDIT.mu,T=E.BANDIT.T,K=mu.length,best=Math.max(...mu),bi=mu.indexOf(best);
  const ST={greedy:{kind:'greedy'},eps:{kind:'eps',eps:0.1},opt:{kind:'greedy',q0:5,alpha:0.1},ucb:{kind:'ucb',c:2},ts:{kind:'ts'}};
  const NAME={greedy:'Greedy',eps:'ε-greedy (ε = 0.1)',opt:'Optimistic greedy (Q₀ = 5, step 0.1)',ucb:'UCB (c = 2)',ts:'Thompson sampling'};
  const SH={greedy:'greedy',eps:'ε-greedy',opt:'optimistic',ucb:'UCB',ts:'Thompson'};
  const COL={greedy:'var(--c2)',eps:'var(--c1)',opt:'var(--c5)',ucb:'var(--c3)',ts:'var(--c4)'};
  const $=id=>document.getElementById(id),A=$('bd-A'),Rg=$('bd-R'),Tt=$('bd-T'),Px=$('bd-P'),N=$('bd-N'),Sd=$('bd-S');
  let mode='greedy',runs={};
  function compute(){const tab=E.banditTable(+Sd.value);runs={};Object.keys(ST).forEach(k=>runs[k]=E.banditRun(tab,ST[k]))}
  const pdf=(v,m,s)=>Math.exp(-0.5*((v-m)/s)*((v-m)/s))/(s*Math.sqrt(2*Math.PI));
  function draw(i){const h=runs[mode],cur=i>0?h[i-1]:null,nxt=i<T?h[i]:null;
    const Q=cur?cur.Q:new Array(K).fill(ST[mode].q0||0),Nn=cur?cur.N:new Array(K).fill(0),S=cur?cur.S:new Array(K).fill(0);
    let W=RD.width(A),H=230,l=30,r=6,t=12,b=34;const lo=mode==='opt'?-1.5:-3,hi=mode==='opt'?5.5:3.5;
    const Y=v=>t+(H-t-b)*(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo),cw=(W-l-r)/K;let s='';
    for(let v=Math.ceil(lo);v<=hi;v++)s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.n(v,0),{a:'end',fs:10,fill:'var(--mute)'});
    for(let k=0;k<K;k++){const cx=l+k*cw+cw/2,bw=Math.min(30,cw*0.42),y0=Y(0),on=nxt&&nxt.a===k;
      if(mode==='ts'){// posterior N(S/(1+n), 1/(1+n)) drawn sideways; the dot is the sample drawn for the next pull
        const m=S[k]/(1+Nn[k]),sd=1/Math.sqrt(1+Nn[k]),pts=[],sc=cw*0.16;
        for(let j=0;j<=40;j++){const v=m-3.2*sd+6.4*sd*j/40;pts.push([Math.min(cw*0.46,sc*pdf(v,m,sd)),Y(v)])}
        s+='<path d="M'+pts.map(p=>(cx+p[0]).toFixed(1)+','+p[1].toFixed(1)).join('L')+'L'+pts.slice().reverse().map(p=>(cx-p[0]).toFixed(1)+','+p[1].toFixed(1)).join('L')+'Z" fill="'+(on?'var(--c4)':'var(--c1)')+'" opacity="'+(on?0.55:0.3)+'"/>';
        s+='<line x1="'+(cx-bw/2)+'" x2="'+(cx+bw/2)+'" y1="'+Y(m)+'" y2="'+Y(m)+'" stroke="var(--c1)" stroke-width="2"/>';
        if(nxt&&nxt.th)s+='<circle cx="'+cx+'" cy="'+Y(nxt.th[k]).toFixed(1)+'" r="4.5" fill="'+(on?'var(--c2)':'var(--bg)')+'" stroke="var(--c2)" stroke-width="2"/>'}
      else{const yq=Y(Q[k]);s+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+Math.min(y0,yq).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(yq-y0)).toFixed(1)+'" fill="'+(on?'var(--c2)':'var(--c1)')+'" opacity="'+(on?1:.75)+'"/>';
        if(mode==='ucb'&&nxt&&nxt.U){const u=nxt.U[k];const yu=isFinite(u)?Y(u):t;s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+yq.toFixed(1)+'" y2="'+yu.toFixed(1)+'" stroke="var(--c3)" stroke-width="2"/><line x1="'+(cx-7)+'" x2="'+(cx+7)+'" y1="'+yu.toFixed(1)+'" y2="'+yu.toFixed(1)+'" stroke="var(--c3)" stroke-width="2"/>'}}
      s+='<line x1="'+(cx-bw/2-5)+'" x2="'+(cx+bw/2+5)+'" y1="'+Y(mu[k])+'" y2="'+Y(mu[k])+'" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="'+(mode==='ts'?'3 2':'')+'"/>';
      s+=RD.t(cx,H-20,'arm '+(k+1),{a:'middle',fs:10.5,w:k===bi?600:400})+RD.t(cx,H-6,'n = '+Nn[k],{a:'middle',fs:10,fill:'var(--mute)'})}
    A.innerHTML=RD.svg(W,H,s,'Arm estimates');
    W=RD.width(Rg);const H2=230,l2=36,b2=24,mx=Math.max(...Object.keys(runs).map(k=>runs[k][T-1].reg)),X=j=>l2+(W-l2-8)*j/T,Y2=v=>10+(H2-10-b2)*(1-v/mx);s='';
    [0,mx/2,mx].forEach(v=>{s+=RD.t(l2-4,Y2(v)+4,RD.n(v,0),{a:'end',fs:10,fill:'var(--mute)'})+'<line x1="'+l2+'" x2="'+(W-8)+'" y1="'+Y2(v)+'" y2="'+Y2(v)+'" stroke="var(--line)"/>'});
    const ends=Object.keys(runs).map(k=>[k,Y2(runs[k][T-1].reg)]).sort((a,b)=>a[1]-b[1]);for(let j=1;j<ends.length;j++)if(ends[j][1]-ends[j-1][1]<11)ends[j][1]=ends[j-1][1]+11;const LY={};ends.forEach(e=>LY[e[0]]=e[1]);
    Object.keys(runs).forEach(k=>{const pts=[[0,0]].concat(runs[k].map((x,j)=>[j+1,x.reg])).filter((p,j)=>j%3===0||j===T);
      s+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="'+(k===mode?3:1.3)+'" opacity="'+(k===mode?1:.6)+'" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y2(p[1]).toFixed(1)).join(' ')+'"/>';
      s+=RD.t(W-10,LY[k]-3,SH[k],{a:'end',fs:10,fill:COL[k],w:k===mode?600:400})});
    s+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="10" y2="'+(H2-b2)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(l2,H2-6,'pull 0',{fs:10,fill:'var(--mute)'})+RD.t(W-8,H2-6,'pull '+T,{a:'end',fs:10,fill:'var(--mute)'})+RD.t(l2+4,22,'total regret',{fs:10,fill:'var(--mute)'});
    Rg.innerHTML=RD.svg(W,H2,s,'Regret');
    if(!cur){Tt.textContent=NAME[mode]+': before the first pull';Px.innerHTML={greedy:'Estimates start at 0. Greedy pulls whichever arm currently looks best (ties go to the first arm) and never pulls an arm on purpose to learn about it.',eps:'Estimates start at 0. Nine pulls in ten are greedy; one in ten picks an arm uniformly at random, good or bad.',opt:'Every estimate starts at 5, far above any true mean, so each arm disappoints when tried and the agent moves on to the others.',ucb:'Each arm is pulled once; then UCB pulls the arm with the highest upper bound Q + c √(ln t / n), the green whisker on each bar.',ts:'Each arm has a belief: a normal distribution over its mean (prior N(0, 1)), drawn sideways. Every step draws one value from each belief (the circles) and pulls the arm with the highest draw.'}[mode]}
    else{const a=cur.a;Tt.textContent='Pull '+i+': '+NAME[mode]+' pulled arm '+(a+1)+' and got '+RD.n(cur.R,2);
      let x=mu[a]===best?'Arm 4 is the best arm (true mean 1.5): no regret this pull.':'Arm '+(a+1)+' has true mean '+RD.n(mu[a],1)+': this pull cost '+RD.n(best-mu[a],1)+' of regret.';
      if(mode==='greedy'&&cur.N[a]>i*0.9&&i>20)x+=' Greedy has locked onto one arm and never collects the evidence that another is better.';
      else if(mode==='ucb'&&i>50)x+=' Rarely pulled arms keep a large bonus, so UCB still tries them now and then, less often as their bounds fall below arm 4\'s estimate.';
      else if(mode==='ts'&&i>50)x+=' The belief about arm 4 is now narrow; a poor arm is pulled only when its wide belief happens to produce a high draw, which gets rarer as its belief narrows.';
      else if(mode==='eps'&&i>50)x+=' One pull in ten is still random, so ε-greedy pays regret on bad arms forever, at the same rate as on the first day.';
      else if(mode==='opt'&&i>50)x+=' The optimism is used up; from here it is greedy with a constant step size.';
      Px.innerHTML=x}
    const bp=cur?cur.N[bi]/i:0;
    N.innerHTML=RD.stat('Pulls',String(i),'of '+T)+RD.stat('Total regret',cur?RD.n(cur.reg,1):'0','Σ (1.5 − μ pulled)')+RD.stat('Best arm share',cur?RD.pct(bp,0):'none','arm 4')+RD.stat('Total reward',cur?RD.n(cur.tot,1):'0','this stream')}
  compute();
  const an=RD.anim({card:'bd',ctl:'bd-C',n:T+1,ms:70,draw,label:'Pull'});
  $('bd-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.k;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.redraw()});
  Sd.addEventListener('change',()=>{compute();an.redraw()});
  RD.onResize(()=>an.redraw());an.redraw();
})();

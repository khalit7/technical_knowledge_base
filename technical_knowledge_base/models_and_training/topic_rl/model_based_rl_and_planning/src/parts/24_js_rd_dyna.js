// ---- Reading section 2 and 3: Dyna maze animation (Figure 8.3), Figure 8.2 curves, Figures 8.4 and 8.5 ----
(function(){
  const DY={alpha:0.1,eps:0.1,gamma:0.95};
  const ARW=['&#8593;','&#8595;','&#8594;','&#8592;'];
  // draw a maze: cells, walls, S, G, greedy arrows, agent. o: {pol, pos, walls(Set), path(Set)}
  MB.drawMaze=function(el,mz,o){const W=RD.width(el),cs=Math.max(22,Math.min(44,Math.floor((W-2)/mz.C))),w=cs*mz.C,h=cs*mz.R;let s='';
    const walls=o.walls||MB.wallset(mz);const st=mz.start[0]*mz.C+mz.start[1],gl=mz.goal[0]*mz.C+mz.goal[1];
    for(let r=0;r<mz.R;r++)for(let c=0;c<mz.C;c++){const i=r*mz.C+c,x=c*cs,y=r*cs;
      const fill=walls.has(i)?'var(--mute)':(o.pos===i?'var(--hl)':'var(--bg)');
      s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+fill+'" stroke="var(--line)"/>';
      if(i===gl)s+=RD.t(x+cs/2,y+cs/2+4,'G',{a:'middle',fs:Math.round(cs*.42),w:700,fill:'var(--good)'});
      else if(i===st&&o.pos!==i)s+=RD.t(x+cs/2,y+cs/2+4,'S',{a:'middle',fs:Math.round(cs*.42),w:700,fill:'var(--mute)'});
      if(o.pol&&o.pol[i]>=0&&!walls.has(i)&&i!==gl)s+=RD.t(x+cs/2,y+cs/2+5,ARW[o.pol[i]],{a:'middle',fs:Math.round(cs*.5),fill:'var(--c1)'});
      if(o.pos===i)s+='<rect x="'+(x+cs*.22)+'" y="'+(y+cs*.22)+'" width="'+(cs*.56)+'" height="'+(cs*.56)+'" rx="3" fill="var(--ink)" opacity=".85"/>'}
    el.innerHTML=RD.svg(w+1,h+1,s,o.label||'Maze')};

  // ---- 2a. Episode 2, with and without planning ----
  const card=document.getElementById('rd-dq');if(card){
    let n=50,ep=null,an=null;const P=document.getElementById('rd-dqP'),T=document.getElementById('rd-dqT'),X=document.getElementById('rd-dqX'),N=document.getElementById('rd-dqN');
    const mz=MB.MAZES.dyna;
    function load(){ep=MB.dynaEpisode2(n,0,DY);}
    function draw(i){if(!ep)load();const f=ep.frames[Math.min(i,ep.frames.length-1)],L=ep.frames.length-1,half=Math.floor(L/2);
      MB.drawMaze(P,mz,{pol:f.pol,pos:f.pos,label:'Dyna maze, episode 2, step '+f.k});
      const arrows=f.pol.filter(x=>x>=0).length,r=Math.floor(f.pos/mz.C),c=f.pos%mz.C;
      if(i===0){T.textContent='Start of episode 2 (n = '+n+')';X.innerHTML='Episode 1 took '+ep.ep1+' steps, a random walk: every value was 0 until the final step into G, which set that action\'s value to 0.1 (α × reward). '+(n?(arrows>1?'The '+n+' planning updates after that last step already spread it to '+arrows+' cells. ':'The '+n+' planning updates after that last step did not spread it further: almost every replayed transition still leads from a zero value to a zero value. ')+'Before the last step, planning could change nothing at all.':'With no planning, that is the only arrow.')}
      else if(f.pos===MB.MAZES.dyna.goal[0]*mz.C+mz.goal[1]){T.textContent='Goal reached: episode 2 took '+f.k+' steps';X.innerHTML=n===0?'Without planning, the value has moved back only along steps the agent itself repeated: a value travels one cell back per visit. Most of the maze still has no arrow.':'Planning has spread the goal\'s value back over the cells the agent has already visited, so the greedy policy reaches far back towards S. The book: "By the end of the third episode a complete optimal policy will have been found".'}
      else{T.textContent='Step '+f.k+' of episode 2'+(f.k===half?' (halfway: the book\'s Figure 8.3 moment)':'');
        X.innerHTML='The agent is at row '+(r+1)+', column '+(c+1)+'. '+(n===0?'Each real step makes one Q-learning update; the value can only move into a cell the agent has just left.':'Each real step is followed by '+n+' planning updates on remembered transitions, so the goal\'s value spreads back through the model while the agent is still wandering.')}
      N.innerHTML=RD.stat('Step in episode 2',f.k,'of '+L)+RD.stat('Cells with an arrow',arrows,'greedy action defined')+RD.stat('Planning updates so far',f.upd.toLocaleString('en-US'),n+' per real step')+RD.stat('Value of S, max<sub>a</sub> Q(S, a)',f.vS.toFixed(4),'optimal: 0.95<sup>13</sup> = 0.5133')}
    load();
    const msOf=()=>Math.max(40,Math.round(12000/ep.frames.length));
    an=RD.anim({card:'rd-dq',ctl:'rd-dqC',n:ep.frames.length,draw,ms:msOf(),label:'Step of episode 2'});
    document.getElementById('rd-dqM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      document.querySelectorAll('#rd-dqM button').forEach(x=>x.classList.toggle('on',x===b));n=+b.dataset.n;load();an.reset(ep.frames.length);an.play()});
    RD.onResize(()=>an.redraw());
  }

  // ---- 2b. Figure 8.2 ----
  const f82=document.getElementById('rd-f82P');let cur=null;
  function drawF82(){if(!f82)return;if(!cur)cur=MB.dynaCurves([0,5,50],30,50,DY);
    const xs=[];for(let e=2;e<=50;e++)xs.push(e);const se=[[0,'var(--c2)','n = 0 (direct RL only)'],[5,'var(--c3)','n = 5'],[50,'var(--c1)','n = 50']].map(([n,col,lab])=>({xs,ys:cur[n].mean.slice(1),col,lab,w:1.8}));
    RD.chart(f82,se,{x0:2,x1:50,y0:0,y1:800,H:230,xt:[[2,'2'],[10,'10'],[20,'20'],[30,'30'],[40,'40'],[50,'50 episodes']],yt:[[0,'0'],[200,'200'],[400,'400'],[600,'600'],[800,'800']],ylab:'steps per episode',hl:[{y:14,lab:'shortest path: 14 steps'}],label:'Steps per episode for n = 0, 5 and 50'});
    RD.legend(document.getElementById('rd-f82L'),se);
    const reach=n=>{const m=cur[n].mean;for(let e=1;e<50;e++)if(m.slice(e).every(x=>x<=20))return e+1;return '>50'};
    const first=cur[0].first.reduce((a,b)=>a+b,0)/cur[0].first.length;
    document.getElementById('rd-f82R').innerHTML='<b>Defaults reproduce the shape of Sutton and Barto\'s Figure 8.2, independently</b> (same maze, α, ε, γ, 30 runs, random tie-breaking; our random numbers). Every later mean is at most 20 steps from episode '+reach(0)+' for n = 0, '+reach(5)+' for n = 5 and '+reach(50)+' for n = 50; the book reads about 25, 5 and 3 episodes to ε-optimal. <b>Not reproduced:</b> the book\'s first episode, "about 1700 steps". Here it averages '+first.toFixed(0)+' over the 30 runs, and the exact expected length of a random walk from S to G in this layout is 869 steps (computed in src/recompute.py); the book does not say whether 1,700 is one run or a mean. The shortest path is 14 steps; with ε = 0.1 the ε-greedy mean stays a few steps above it.'}
  RD.onRender(drawF82);RD.onResize(drawF82);

  // ---- 3. Figures 8.4 and 8.5 (computed after first paint: about 18 million table updates) ----
  const CH={n:50,alpha:1,eps:0.1,gamma:0.95,kappa:1e-3,runs:20};let ch=null;
  function compCh(){ch={};for(const [nm,steps,sw] of [['block',3000,1000],['short',6000,3000]])for(const plus of [false,true])ch[nm+(plus?'+':'')]=MB.changingMaze(nm,plus,steps,sw,CH.n,CH.alpha,CH.eps,CH.gamma,plus?CH.kappa:0,CH.runs)}
  function drawCh(){const a=document.getElementById('rd-f84P'),b=document.getElementById('rd-f85P');if(!a)return;
    if(!ch){a.innerHTML=b.innerHTML='<p class="small mute">Computing 20 runs of each agent...</p>';setTimeout(()=>{compCh();drawCh()},30);return}
    const one=(el,nm,steps,sw,top)=>{const xs=[];for(let t=0;t<steps;t+=20)xs.push(t+1);const pick=arr=>xs.map(x=>arr[x-1]);
      RD.chart(el,[{xs,ys:pick(ch[nm]),col:'var(--c2)',w:1.8},{xs,ys:pick(ch[nm+'+']),col:'var(--c1)',w:1.8}],{x0:0,x1:steps,y0:0,y1:top,H:200,
        xt:[[0,'0'],[sw,sw.toLocaleString('en-US')],[steps,steps.toLocaleString('en-US')+' steps']],yt:[[0,'0'],[top/2,String(top/2)],[top,String(top)]],ylab:'cumulative reward',
        extra:(X,Y)=>'<line x1="'+X(sw)+'" x2="'+X(sw)+'" y1="'+Y(top)+'" y2="'+Y(0)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>',label:'Cumulative reward, '+nm+' maze'})};
    one(a,'block',3000,1000,200);one(b,'short',6000,3000,400);
    const sl=(arr,k)=>(arr[arr.length-1]-arr[arr.length-1-k])/k,e=v=>(1/v).toFixed(1);
    document.getElementById('rd-f845R').innerHTML='<b>Defaults reproduce the shape of Figures 8.4 and 8.5, independently.</b> The book prints no parameters for these two figures; ours are α = 1 (the maze is deterministic), ε = 0.1, γ = 0.95, n = 50, κ = 10<sup>−3</sup>, layouts as in Zhang\'s reproduction code (illustrative choices, not the book\'s). Blocking maze at step 3,000: Dyna-Q+ '+ch['block+'][2999].toFixed(0)+' goals, Dyna-Q '+ch['block'][2999].toFixed(0)+' (the book\'s axis ends at 150). Shortcut maze at step 6,000: Dyna-Q+ '+ch['short+'][5999].toFixed(0)+', Dyna-Q '+ch['short'][5999].toFixed(0)+' (axis 400). Over the last 1,000 steps Dyna-Q reaches the goal every '+e(sl(ch['short'],1000))+' steps, the long way round; Dyna-Q+ every '+e(sl(ch['short+'],1000))+', through the shortcut. Rerun with other settings in the {{Dyna lab|#t-dyna}}.'.replace(/\{\{([^|]+)\|#(t-[\w-]+)\}\}/g,'<a href="#" data-tab="$2">$1</a>');
    const rr=document.getElementById('rd-f845R');if(!rr.dataset.tl){rr.dataset.tl=1;RD.tabLinks(rr)}}
  if('IntersectionObserver' in window){const c=document.getElementById('rd-f845');if(c){let done=false;new IntersectionObserver(es=>{if(!done&&es[es.length-1].isIntersecting){done=true;drawCh()}},{rootMargin:'300px'}).observe(c)}}else RD.onRender(drawCh);
  RD.onResize(()=>{if(ch)drawCh()});
})();

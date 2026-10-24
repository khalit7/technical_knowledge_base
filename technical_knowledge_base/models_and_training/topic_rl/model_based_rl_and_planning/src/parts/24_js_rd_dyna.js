// ---- Reading section 2: the maze drawer and the episode-2 animation (Figure 8.3); the curves are in 31_js_dyna.js ----
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
      document.querySelectorAll('#rd-dqM button').forEach(x=>x.classList.toggle('on',x===b));n=+b.dataset.n;load();an.reset(ep.frames.length)});
    RD.onResize(()=>an.redraw());
  }

})();

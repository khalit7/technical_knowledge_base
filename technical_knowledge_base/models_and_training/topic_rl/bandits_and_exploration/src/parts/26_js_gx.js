// ---- Reading: a sparse-reward gridworld, epsilon-greedy against a count bonus against optimistic starts (before/after animation) ----
(function(){
  const B=window.BX,G=B.GX,$=id=>document.getElementById(id),EP=500;
  const NAME={eps:'ε-greedy Q-learning',cnt:'ε-greedy + count bonus β/√N(s)',opt:'Optimistic starts, Q₀ = 1, greedy'};
  let mode='eps',seed=1,hist=null;const memo={};
  function compute(){const k=mode+'|'+seed;hist=memo[k]||(memo[k]=B.gxRun(mode,seed,EP,true))}
  function draw(i){const W=RD.width($('gx-P')),cs=Math.max(14,Math.min(46,Math.floor((W-4)/G.W))),gw=cs*G.W,gh=cs*G.H,ox=Math.max(0,Math.floor((W-gw)/2));
    const h=i>0?hist[i-1]:null,Nn=h?h.N:new Float64Array(G.W*G.H);let mx=1;for(const v of Nn)if(v>mx)mx=v;let s='';
    for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){const v=Nn[y*G.W+x],p=v?Math.round(12+68*Math.log(1+v)/Math.log(1+mx)):0;
      s+='<rect x="'+(ox+x*cs)+'" y="'+(y*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" rx="2" fill="'+(v?'color-mix(in srgb, var(--c1) '+p+'%, var(--bg))':'var(--soft)')+'" stroke="var(--line)"/>'}
    const cx=c=>ox+(c%G.W)*cs+cs/2,cy=c=>Math.floor(c/G.W)*cs+cs/2;
    const mark=(xy,lab,col)=>'<circle cx="'+(ox+xy[0]*cs+cs/2)+'" cy="'+(xy[1]*cs+cs/2)+'" r="'+(cs*0.36)+'" fill="'+col+'"/>'+RD.t(ox+xy[0]*cs+cs/2,xy[1]*cs+cs/2+4,lab,{a:'middle',fs:Math.max(9,Math.min(12,cs*0.3)),fill:'var(--bg)',w:600});
    if(h){s+='<polyline fill="none" stroke="var(--c2)" stroke-width="2" stroke-linejoin="round" opacity=".9" points="'+h.path.map(c=>cx(c).toFixed(1)+','+cy(c).toFixed(1)).join(' ')+'"/>'}
    s+=mark(G.start,'S','var(--ink)')+mark(G.small,'0.1','var(--c5)')+mark(G.big,'+1','var(--c3)');
    $('gx-P').innerHTML=RD.svg(W,gh+2,s,'Gridworld visits');
    let seen=0;for(const v of Nn)if(v)seen++;
    $('gx-T').textContent=h?'Episode '+i+' of '+EP+': '+NAME[mode]+(h.end===2?' reached the +1 goal':h.end===1?' took the small 0.1 reward':' ran out of steps (60)'):NAME[mode]+': before the first episode';
    let x;if(!h)x={eps:'Q starts at 0 everywhere. With ties broken at random the first episodes are random walks; whichever reward a walk hits first starts to pull the greedy policy towards it.',cnt:'The same agent, plus an intrinsic reward β/√N(s) for entering a state visited N times so far (β = 0.2). New states pay more than familiar ones, so the agent is drawn towards the edge of what it has seen.',opt:'Every Q starts at 1, the largest reward there is. Any action not yet tried looks as good as the best possible outcome, so a greedy agent tries them systematically: R-MAX\'s "optimism in the face of uncertainty" in its simplest tabular form.'}[mode];
    else if(mode==='eps')x=h.nBig?'It found the +1 goal by chance in episode '+(h.first+1)+'. Whether that one discovery wins depends on how far the value has to propagate before the small reward\'s pull takes over.':'Hitting the +1 needs at least 13 steps in the right direction; a random walk that wanders 60 steps rarely gets there, while the 0.1 is three steps away. Exploration that is random at each step is shallow: '+seen+' of '+(G.W*G.H)+' cells visited so far.';
    else if(mode==='cnt')x=h.nBig?'Far goal first reached in episode '+(h.first+1)+'; reached in '+h.nBig+' episodes so far. The bonus fades as 1/√N, so once the map is familiar the agent exploits the +1.':'The bonus pushes it into new cells: '+seen+' of '+(G.W*G.H)+' visited. Q starts at 0, so untried actions are not attractive in themselves; the bonus has to be collected and propagated back first, which is slower than optimism.';
    else x=h.nBig?'Far goal first reached in episode '+(h.first+1)+'; reached in '+h.nBig+' episodes so far. Optimism decays only where the agent has been, so it sweeps the map before settling.':seen+' of '+(G.W*G.H)+' cells visited; every unexplored action still looks worth 1.';
    $('gx-X').innerHTML=x;
    $('gx-N').innerHTML=RD.stat('Episodes',String(i),'of '+EP)+RD.stat('Reached +1',h?String(h.nBig):'0',h&&h.first>=0?'first in episode '+(h.first+1):'not yet')+RD.stat('Cells visited',String(seen),'of '+(G.W*G.H))+RD.stat('Return this episode',h?(h.end===2?'1':h.end===1?'0.1':'0'):'none','extrinsic only')}
  compute();
  const an=RD.anim({card:'gx',ctl:'gx-C',n:EP+1,ms:90,draw,label:'Episode'});
  $('gx-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));compute();an.redraw()});
  $('gx-S').addEventListener('change',e=>{seed=+e.target.value;compute();an.redraw()});
  // twenty seeds of each mode, computed once when the Reading tab first renders
  let done=false;function summary(){if(done)return;done=true;const rows=['eps','cnt','opt'].map(m=>{const s=B.gxSummary(m,20,EP),f=s.firsts.filter(v=>v>=0).sort((a,b)=>a-b);
      return '<tr><td>'+{eps:'ε-greedy',cnt:'+ count bonus',opt:'Optimistic starts'}[m]+'</td><td class="num">'+s.found+' of 20</td><td class="num">'+(f.length?f[Math.floor(f.length/2)]+1:'none')+'</td></tr>'}).join('');
    $('gx-Y').innerHTML='<table class="rd-t"><thead><tr><th>Agent</th><th class="num">Seeds reaching +1 (500 episodes)</th><th class="num">Median first +1 episode</th></tr></thead><tbody>'+rows+'</tbody></table>'}
  RD.onRender(summary);setTimeout(summary,50);
  RD.onResize(()=>an.redraw());an.redraw();
})();

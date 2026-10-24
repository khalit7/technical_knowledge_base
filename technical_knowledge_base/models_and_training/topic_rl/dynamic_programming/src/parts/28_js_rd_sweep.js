// ---- Reading section 7: value iteration on Silver's shortest-path grid, one sweep per step (a stepper; never plays by itself) ----
(function(){
  const D=window.DPE,P=document.getElementById('dp-swP');if(!P)return;
  const w=D.W.silver,g=1,Tt=document.getElementById('dp-swT'),Eq=document.getElementById('dp-swE'),Xp=document.getElementById('dp-swX');
  // frames: V after k synchronous sweeps from zeros, until a sweep changes nothing
  const F=[D.init(w)];for(let k=0;k<20;k++){const r=D.sweep(w,F[F.length-1],g,'vi',null,false);F.push(r.V);if(r.d<1e-12)break}
  const NM=['up','right','down','left'];
  const f=v=>{const r=Math.round(v*100)/100;return (Object.is(r,-0)?0:r).toString().replace('-','−')};
  const rc=s=>'row '+(w.cells[s][1]+1)+', column '+(w.cells[s][0]+1);
  function draw(i){const V=F[i],prev=i?F[i-1]:null,W=RD.width(P),cs=Math.max(44,Math.min(84,Math.floor((W-8)/4))),ox=Math.floor((W-cs*4)/2),H=cs*4+6;
    const changed=prev?[...Array(w.n).keys()].filter(s=>!w.term[s]&&Math.abs(V[s]-prev[s])>1e-12):[];
    // the example backup: the changed cell farthest from the goal, else the far corner
    const far=w.id['3,3'];let ex=changed.length?changed.reduce((a,b)=>(w.cells[b][0]+w.cells[b][1]>w.cells[a][0]+w.cells[a][1]?b:a)):far;
    const G=D.greedy(w,V,g);let s='';
    for(let k=0;k<w.n;k++){const [x,y]=w.cells[k],X=ox+x*cs,Y=3+y*cs,term=w.term[k],on=changed.indexOf(k)>=0,isEx=i>0&&k===ex;
      s+='<rect x="'+(X+1)+'" y="'+(Y+1)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+(term?'color-mix(in srgb, var(--c3) 40%, var(--bg))':RD.colorScale(V[k],-6,0))+'" stroke="'+(isEx?'var(--ink)':on?'var(--acc)':'var(--line)')+'" stroke-width="'+(isEx?3:on?2.5:1)+'"/>';
      if(term){s+=RD.t(X+cs/2,Y+cs/2+4,'goal',{a:'middle',fs:12,w:600});continue}
      s+=RD.t(X+cs/2,Y+cs/2+5,f(V[k]),{a:'middle',fs:cs<60?14:17,w:600});
      const acts=G[k],pos=[[cs/2,13],[cs-9,cs/2+4],[cs/2,cs-5],[9,cs/2+4]],arw=['↑','→','↓','←'];
      if(acts.length<4)acts.forEach(a=>{s+=RD.t(X+pos[a][0],Y+pos[a][1],arw[a],{a:'middle',fs:12,fill:'var(--mute)'})});
      else s+=RD.t(X+cs/2,Y+cs-6,'all tie',{a:'middle',fs:11,fill:'var(--mute)'})}
    P.innerHTML=RD.svg(W,H,s,'Shortest-path grid after '+i+' sweeps');
    const last=i===F.length-1;
    if(i===0){Tt.textContent='Start: every value 0';Eq.innerHTML='V<sub>0</sub>(s) = 0 everywhere; the goal is terminal and stays 0.';
      Xp.textContent='Every move ties, because every neighbour looks equally worthless: the values carry no information yet. Step forward to back up all 15 cells at once.';return}
    const q=D.qs(w,prev,g,ex);
    Tt.textContent=last?'Sweep '+i+': nothing changes, converged':'Sweep '+i+': '+changed.length+' cell'+(changed.length===1?'':'s')+' changed (outlined)';
    Eq.innerHTML='V<sub>'+i+'</sub>('+rc(ex)+') ← max( '+NM.map((n,a)=>n+' '+f(q[a])).join(', ')+' ) = '+f(Math.max(...q))+'<span class="mute"> &nbsp;each move: −1 + V<sub>'+(i-1)+'</sub>(where it lands)</span>';
    Xp.textContent=last?'A full sweep moved no value: the values are the true distances, 0 to −6, and the arrows are every shortest move. Six sweeps were needed because the far corner is six moves away; the seventh only confirms.':
      i===1?'Every non-goal cell pays −1 for any move and every neighbour is still 0, so all become −1. Only the cells next to the goal are right, and only they have an arrow: their move into the goal is the only one that does not land on a −1.':
      'Cells within '+i+' moves of the goal now hold minus their distance and point the shortest way; every cell farther out says −'+i+', a number that is no policy\'s value. The reward information has travelled '+i+' steps back from the goal.'}
  const an=RD.anim({card:'dp-sw',ctl:'dp-swC',n:F.length,ms:1300,draw,label:'Sweep'});
  RD.onResize(()=>an.redraw());
})();

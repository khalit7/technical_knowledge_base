// ---- Reading section 8: the 4x3 world, value iteration against Q-learning ----
(function(){
  const E=window.RDE,GW=E.GW,nS=GW.S.length;
  const VI=E.gwValueIteration(20),VS=E.gwValueIteration(200)[200];
  const MARKS=[1,2,5,10,20,50,100,200,500,1000,2000,3000],QL=E.gwQLearning(7,0.3,MARKS);
  const P=document.getElementById('rd-gwP'),Tt=document.getElementById('rd-gwT'),Xp=document.getElementById('rd-gwX'),N=document.getElementById('rd-gwN');
  let mode='vi';
  const ARW=['↑','→','↓','←'];
  const gap=V=>{let mx=0,sm=0,c=0;V.forEach((v,s)=>{if(s in GW.term)return;const d=Math.abs(v-VS[s]);mx=Math.max(mx,d);sm+=d;c++});return [mx,sm/c]};
  function frame(i){if(mode==='vi'){const V=VI[i];return {V,pol:V.map((v,s)=>{const q=E.gwQ(V,s);return q.indexOf(Math.max(...q))}),path:null}}const q=QL[i];return {V:q.V,pol:q.pol,path:q.path,ep:q.ep,samples:q.samples}}
  function draw(i){const f=frame(i),W=RD.width(P),cs=Math.min(110,Math.floor((W-12)/4)),H=cs*3+8,ox=Math.floor((W-cs*4)/2);let s='';
    const cx=s2=>ox+GW.S[s2][0]*cs+cs/2,cy=s2=>4+(2-GW.S[s2][1])*cs+cs/2;
    // wall
    s+='<rect x="'+(ox+cs)+'" y="'+(4+cs)+'" width="'+cs+'" height="'+cs+'" fill="var(--dim)"/>';
    for(let k=0;k<nS;k++){const x=ox+GW.S[k][0]*cs,y=4+(2-GW.S[k][1])*cs,v=f.V[k],term=k in GW.term;
      s+='<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" fill="'+(term?(GW.term[k]>0?'color-mix(in srgb, var(--c3) 45%, var(--bg))':'color-mix(in srgb, var(--c2) 45%, var(--bg))'):RD.colorScale(v,-1,1))+'" stroke="var(--line)"/>';
      if(term){s+=RD.t(x+cs/2,y+cs/2+5,GW.term[k]>0?'+1 exit':'−1 exit',{a:'middle',fs:cs<80?11:13,w:600});continue}
      s+=RD.t(x+cs/2,y+cs/2+2,RD.n(v,3),{a:'middle',fs:cs<80?12:14,w:600});
      s+=RD.t(x+cs/2,y+cs/2+(cs<80?17:20),ARW[f.pol[k]],{a:'middle',fs:cs<80?13:15,fill:'var(--mute)'});
      s+=RD.t(x+4,y+12,'V* '+RD.n(VS[k],3),{fs:cs<80?8.5:9.5,fill:'var(--mute)'})}
    if(f.path&&f.path.length>1){s+='<polyline fill="none" stroke="var(--c4)" stroke-width="2" opacity=".75" points="'+f.path.map((p,j)=>{const jx=((j*7)%9-4)*cs/60,jy=((j*5)%9-4)*cs/60;return (cx(p)+jx).toFixed(1)+','+(cy(p)+jy).toFixed(1)}).join(' ')+'"/>';
      s+='<circle cx="'+cx(f.path[0])+'" cy="'+cy(f.path[0])+'" r="5" fill="var(--c4)"/>'}
    P.innerHTML=RD.svg(W,H,s,'4 by 3 world');
    const [mx,mn]=gap(f.V);
    if(mode==='vi'){Tt.textContent=i===0?'Value iteration, before any sweep':'Value iteration, after '+i+' sweep'+(i>1?'s':'');
      Xp.innerHTML=i===0?'Non-terminal values start at 0; the exits hold +1 and −1. Each sweep backs up every cell once with the optimality equation, using the model\'s 0.8 and 0.1 probabilities.':
        mx<5e-4?'Converged: every cell now matches AIMA\'s Figure 17.3 to three decimals, and the arrows are the optimal policy. Note the bottom row: the cell second from the right goes left, the long way round, rather than up beside the −1 exit, where every move risks a 10% sideways slip into it.':
        'Information spreads one step per sweep: after '+i+' sweep'+(i>1?'s':'')+' a cell knows about exits up to '+i+' moves away. The largest gap to the final values is '+RD.n(mx,3)+'.';
      N.innerHTML=RD.stat('Sweeps',String(i),'over all 9 cells')+RD.stat('Model lookups',String(i*9*4*3),'cells × 4 actions × 3 outcomes')+RD.stat('Moves made','0','it never acts')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))}
    else{Tt.textContent='Q-learning, after '+f.ep+' episode'+(f.ep>1?'s':'');
      Xp.innerHTML=f.ep<=5?'The agent knows nothing about the 0.8 and 0.1: it only sees where it lands. Most values are still 0 or a few steps of −0.04; the purple line is the latest episode\'s path.':
        f.ep<=200?'Values near the exits are learned first; cells far away, or rarely visited, lag. The agent still explores 30% of the time, yet the values it learns are those of the greedy policy (off-policy).':
        'After '+f.ep+' episodes and '+f.samples.toLocaleString('en-US')+' transitions the largest gap to the model-based values is '+RD.n(mx,3)+'. Value iteration reached the same numbers in about 20 sweeps without moving once.';
      N.innerHTML=RD.stat('Episodes',String(f.ep),'random start cells')+RD.stat('Transitions used',f.samples.toLocaleString('en-US'),'real samples')+RD.stat('Model lookups','0','model-free')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))}}
  const an=RD.anim({card:'rd-gw',ctl:'rd-gwC',n:VI.length,ms:900,draw,label:'Step'});
  document.getElementById('rd-gwM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));an.reset(mode==='vi'?VI.length:QL.length);an.play()});
  RD.onResize(()=>an.redraw());
})();

// ---- Scene, section 13: Russell and Norvig's 4 x 3 world, value iteration (uses the model) against Q-learning (uses only samples).
// The page's engines: synchronous value iteration after 0, 1, 2, 3, 5, 10 and 20 sweeps; one seeded Q-learning run (seed 7, epsilon 0.3)
// after 1, 5, 20, 100, 500 and 3,000 episodes. Bar height is V (max_a Q for Q-learning); arrows are the greedy policy; the purple stream is the latest episode.
// Renderer v2: at sweep 1 the camera moves in close on the cell beside the +1 exit; the model's three outcomes for 'right' (0.8 right, 0.1 up, 0.1 down)
// stand as a glass plate and each outcome's value streams in with that probability. Q-learning has no plate: it only sees where it lands ----
(function(){
  if(!document.getElementById('stg-gw')||!window.DPS)return;const {lerp,mix}=S3,E=window.RDE,G=window.DPS,GW=E.GW,nS=GW.S.length;
  const VK=[0,1,2,3,5,10,20],VI=E.gwValueIteration(20),VS=E.gwValueIteration(200)[200];
  const QM=[1,5,20,100,500,3000],QL=E.gwQLearning(7,0.3,QM);
  const pol=V=>V.map((v,s)=>{const q=E.gwQ(V,s);return q.indexOf(Math.max(...q))});
  const FR={vi:VK.map(k=>({V:VI[k],pol:pol(VI[k]),k})),ql:QL.map(q=>({V:q.V,pol:q.pol,path:q.path,ep:q.ep,samples:q.samples}))};
  let mode='vi';const HS=1.3;
  const X=s=>GW.S[s][0]-1.5,Z=s=>1-GW.S[s][1];
  const C1=GW.idx(2,2),OUT=GW.out(C1,1);           // the cell beside the +1 and its outcomes for 'right': [cell, probability]
  function draw(R,k,e){const P=R.P,fr=FR[mode];k=Math.min(k,fr.length-1);const cur=fr[k],prev=fr[Math.max(0,k-1)];R.grid(-2.5,2.5,-2,2,.5);
    R.box([-.5,0,0],[.86,.45,.86],{fill:mix(P.paper,P.mute,.55)});R.label([-.5,.45,0],'wall',{fs:12,c:P.mute,dy:-9,wide:1});
    const tops=[];
    for(let s=0;s<nS;s++){const x=X(s),z=Z(s);
      if(s in GW.term){const pos=GW.term[s]>0;if(pos)G.bar(R,x,z,HS,{fill:mix(P.paper,P.c3,.65)});else G.bar(R,x,z,.03,{fill:mix(P.paper,P.bad,.7)});
        R.label([x,pos?HS:.05,z],pos?'+1 exit':'−1 exit',{fs:12.5,b:1,dy:pos?-10:0,c:pos?P.ink:P.bad});tops[s]=pos?HS:.03;continue}
      const v=lerp(prev.V[s],cur.V[s],e),h=Math.abs(v)*HS;tops[s]=Math.max(.03,h);
      const zm=mode==='vi'&&k===1,ra=zm&&s!==C1&&!OUT.some(o=>o[0]===s)?.3:1;
      G.bar(R,x,z,h,{fill:v>=0?G.tint(P,P.c1,v):mix(P.paper,P.c2,.55),a:ra});
      G.arrow(R,x,tops[s],z,cur.pol[s],{c:P.ink,a:.75*ra});
      const lv=(e<.5?prev:cur).V[s];R.label([x,tops[s],z],(lv<0?'−':'')+Math.abs(lv).toFixed(3),{fs:12,mono:1,dy:0,wide:1})}
    // value iteration, sweep 1, close up: the model as a glass plate between the cell and the +1 exit; each outcome streams in with its probability
    if(mode==='vi'&&k===1){const to=[X(C1),tops[C1]+.06,Z(C1)],x0=X(C1)-.45;
      R.glass([x0,1.55,-1.6],[1.9,0,0],[0,.5,0],{c:P.c4,a:e,nu:3,nv:1});
      ['+1 · 0.8','up · 0.1','down · 0.1'].forEach((t,i)=>R.label([x0+1.9*(i+.5)/3,1.8,-1.6],t,{fs:12,b:1,mono:1,c:P.c4,a:e,wide:i>0}));
      R.label([x0+.95,2.05,-1.6],'model: moving right',{fs:12.5,b:1,c:P.c4,dy:-8,a:e});
      OUT.forEach(([n,p])=>{const from=[X(n),tops[n]+.05,Z(n)];if(n===C1)R.flowArc([X(C1)-.25,to[1],Z(C1)-.2],[X(C1)+.15,to[1],Z(C1)-.25],.3,{c:P.c4,a:e,r:.05,n:2,speed:.6});
        else R.flowArc(from,to,.45,{c:P.c4,a:e,r:.04+.07*p,n:Math.round(2+p*12),speed:1.1})});
      R.label([x0+.95,2.05,-1.6],'−0.04 + 0.8 × 1 = 0.760',{fs:12.5,b:1,mono:1,dy:-28,c:P.c4,a:e,wide:1})}
    // Q-learning: the latest episode's path, drawn in as the step plays, then a stream of dots running along it
    if(mode==='ql'&&cur.path&&cur.path.length>1){const pts=cur.path.map((s,j)=>{const jx=((j*7)%9-4)*.03,jz=((j*5)%9-4)*.03;return [X(s)+jx,tops[s]+.08,Z(s)+jz]});
      const n=Math.max(2,Math.round(pts.length*Math.min(1,e*1.2)));R.line(pts.slice(0,n),{c:P.c4,w:1.6,a:.5,top:1});R.ball(pts[0],.09,{c:P.c4,top:1});
      if(e>=1){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]);R.flow(pts,{c:P.c4,r:.07,n:Math.min(40,Math.max(4,Math.round(L*2))),speed:1.6,top:1})}}
    R.label([2.1,0,1.4],mode==='vi'?(cur.k?'sweep '+cur.k:'start'):cur.ep.toLocaleString('en-US')+' episode'+(cur.ep>1?'s':''),{fs:14,b:1,al:'left',dx:8})}
  const N=document.getElementById('rd-gwN');
  const gap=V=>{let mx=0,sm=0,c=0;V.forEach((v,s)=>{if(s in GW.term)return;const d=Math.abs(v-VS[s]);mx=Math.max(mx,d);sm+=d;c++});return [mx,sm/c]};
  function counters(k){if(!N)return;const f=FR[mode][Math.min(k,FR[mode].length-1)],[mx,mn]=gap(f.V);
    N.innerHTML=mode==='vi'?RD.stat('Sweeps',String(f.k),'over all 9 cells')+RD.stat('Model look-ups',String(f.k*9*4*3),'cells × 4 actions × 3 outcomes')+RD.stat('Moves made','0','it never acts')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))
      :RD.stat('Episodes',f.ep.toLocaleString('en-US'),'random start cells')+RD.stat('Transitions used',f.samples.toLocaleString('en-US'),'real samples')+RD.stat('Model look-ups','0','model-free')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))}
  const st=S3.stage({id:'stg-gw',list:'sx-gwvi',fig:'Fig. 4 · the 4 × 3 world, model against samples',cam:[.4,.8],bounds:[[-2.2,0,-1.6],[2.7,1.5,1.6]],aspect:.68,draw,dur:1300,hold:4600,onStep:counters,
    view:k=>mode==='vi'&&k===1?{cam:[.36,.72],bounds:[[-1.3,0,-1.8],[2.3,2.1,1.1]]}:null});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
  const M=document.getElementById('rd-gwM');
  if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;[...M.children].forEach(x=>x.classList.toggle('on',x===b));
    document.getElementById('sx-gwvi').hidden=mode!=='vi';document.getElementById('sx-gwql').hidden=mode!=='ql';st.list(mode==='vi'?'sx-gwvi':'sx-gwql')});
})();

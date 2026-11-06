// ---- Scene, section 13: Russell and Norvig's 4 x 3 world, value iteration (uses the model) against Q-learning (uses only samples).
// The page's engines: synchronous value iteration after 0, 1, 2, 3, 5, 10 and 20 sweeps; one seeded Q-learning run (seed 7, epsilon 0.3)
// after 1, 5, 20, 100, 500 and 3,000 episodes. Bar height is V (max_a Q for Q-learning); arrows are the greedy policy; the purple line is the latest episode ----
(function(){
  if(!document.getElementById('stg-gw')||!window.DPS)return;const {lerp,mix}=S3,E=window.RDE,G=window.DPS,GW=E.GW,nS=GW.S.length;
  const VK=[0,1,2,3,5,10,20],VI=E.gwValueIteration(20),VS=E.gwValueIteration(200)[200];
  const QM=[1,5,20,100,500,3000],QL=E.gwQLearning(7,0.3,QM);
  const pol=V=>V.map((v,s)=>{const q=E.gwQ(V,s);return q.indexOf(Math.max(...q))});
  const FR={vi:VK.map(k=>({V:VI[k],pol:pol(VI[k]),k})),ql:QL.map(q=>({V:q.V,pol:q.pol,path:q.path,ep:q.ep,samples:q.samples}))};
  let mode='vi';const HS=1.3;
  const X=s=>GW.S[s][0]-1.5,Z=s=>1-GW.S[s][1];
  function draw(R,k,e){const P=R.P,fr=FR[mode];k=Math.min(k,fr.length-1);const cur=fr[k],prev=fr[Math.max(0,k-1)];R.grid(-2.5,2.5,-2,2,.5);
    R.box([-.5,0,0],[.86,.45,.86],{fill:mix(P.paper,P.mute,.55)});R.label([-.5,.45,0],'wall',{fs:12,c:P.mute,dy:-9,wide:1});
    const tops=[];
    for(let s=0;s<nS;s++){const x=X(s),z=Z(s);
      if(s in GW.term){const pos=GW.term[s]>0;if(pos)G.bar(R,x,z,HS,{fill:mix(P.paper,P.c3,.65)});else G.bar(R,x,z,.03,{fill:mix(P.paper,P.bad,.7)});
        R.label([x,pos?HS:.05,z],pos?'+1 exit':'−1 exit',{fs:12.5,b:1,dy:pos?-10:0,c:pos?P.ink:P.bad});tops[s]=pos?HS:.03;continue}
      const v=lerp(prev.V[s],cur.V[s],e),h=Math.abs(v)*HS;tops[s]=Math.max(.03,h);
      G.bar(R,x,z,h,{fill:v>=0?G.tint(P,P.c1,v):mix(P.paper,P.c2,.55)});
      G.arrow(R,x,tops[s],z,cur.pol[s],{c:P.ink,a:.75});
      R.label([x,tops[s],z],(v<0?'−':'')+Math.abs(v).toFixed(3),{fs:12,mono:1,dy:0,wide:1})}
    if(mode==='ql'&&cur.path&&cur.path.length>1){const pts=cur.path.map((s,j)=>{const jx=((j*7)%9-4)*.03,jz=((j*5)%9-4)*.03;return [X(s)+jx,tops[s]+.08,Z(s)+jz]});
      const n=Math.max(2,Math.round(pts.length*Math.min(1,e*1.2)));R.line(pts.slice(0,n),{c:P.c4,w:2.2,a:.85,top:1});R.ball(pts[0],.09,{c:P.c4,top:1})}
    R.label([2.1,0,1.4],mode==='vi'?(cur.k?'sweep '+cur.k:'start'):cur.ep.toLocaleString('en-US')+' episode'+(cur.ep>1?'s':''),{fs:14,b:1,al:'left',dx:8})}
  const N=document.getElementById('rd-gwN');
  const gap=V=>{let mx=0,sm=0,c=0;V.forEach((v,s)=>{if(s in GW.term)return;const d=Math.abs(v-VS[s]);mx=Math.max(mx,d);sm+=d;c++});return [mx,sm/c]};
  function counters(k){if(!N)return;const f=FR[mode][Math.min(k,FR[mode].length-1)],[mx,mn]=gap(f.V);
    N.innerHTML=mode==='vi'?RD.stat('Sweeps',String(f.k),'over all 9 cells')+RD.stat('Model look-ups',String(f.k*9*4*3),'cells × 4 actions × 3 outcomes')+RD.stat('Moves made','0','it never acts')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))
      :RD.stat('Episodes',f.ep.toLocaleString('en-US'),'random start cells')+RD.stat('Transitions used',f.samples.toLocaleString('en-US'),'real samples')+RD.stat('Model look-ups','0','model-free')+RD.stat('Largest gap to V*',RD.n(mx,3),'mean '+RD.n(mn,3))}
  const st=S3.stage({id:'stg-gw',list:'sx-gwvi',fig:'Fig. 4 · the 4 × 3 world, model against samples',cam:[.4,.8],bounds:[[-2.2,0,-1.6],[2.7,1.5,1.6]],aspect:.68,draw,dur:1300,hold:4600,onStep:counters});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
  const M=document.getElementById('rd-gwM');
  if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;[...M.children].forEach(x=>x.classList.toggle('on',x===b));
    document.getElementById('sx-gwvi').hidden=mode!=='vi';document.getElementById('sx-gwql').hidden=mode!=='ql';st.list(mode==='vi'?'sx-gwvi':'sx-gwql')});
})();

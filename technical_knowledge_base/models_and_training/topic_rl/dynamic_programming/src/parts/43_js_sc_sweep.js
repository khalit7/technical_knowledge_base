// ---- Scene, section 7: synchronous value iteration on Silver's 4 x 4 shortest-path grid (-1 per move, gamma 1), one sweep per step,
// computed by the page's engine. Bar height is -V; orange bars changed in this sweep; the ringed cell is the worked backup.
// Renderer v2: during each step a glass plane passes over the grid and each column takes its new value as the plane reaches it (every new value
// still comes from the previous sweep's array: synchronous); then the four values the ringed backup reads keep streaming into it ----
(function(){
  if(!document.getElementById('stg-sw')||!window.DPS)return;const {lerp,mix}=S3,D=window.DPE,G=window.DPS;
  const w=D.W.silver,g=1,F=[D.init(w)];for(let k=0;k<20;k++){const r=D.sweep(w,F[F.length-1],g,'vi',null,false);F.push(r.V);if(r.d<1e-12)break}
  const GR=F.map(v=>D.greedy(w,v,g)),HS=.28,NM=['up','right','down','left'];
  const X=c=>(w.cells[c][0]-1.5)*1.0,Z=c=>(w.cells[c][1]-1.5)*1.0;
  const changed=i=>i?[...Array(w.n).keys()].filter(s=>!w.term[s]&&Math.abs(F[i][s]-F[i-1][s])>1e-12):[];
  // the worked backup: the changed cell farthest from the goal, else the far corner
  const ex=i=>{const ch=changed(i);return ch.length?ch.reduce((a,b)=>(w.cells[b][0]+w.cells[b][1]>w.cells[a][0]+w.cells[a][1]?b:a)):w.id['3,3']};
  const f=v=>{const r=Math.round(v*100)/100;return (Object.is(r,-0)?0:r).toString().replace('-','−')};
  const nb=(s,d)=>{const [x,y]=w.cells[s],k=(x+G.DIR[d][0])+','+(y+G.DIR[d][1]);return k in w.id?w.id[k]:s};
  function draw(R,k,e){const P=R.P;R.grid(-2.5,2.5,-2.5,2.5,.5);
    const cur=F[k],prev=F[Math.max(0,k-1)],ch=changed(k),x0=ex(k),pc=c=>k?Math.max(0,Math.min(1,(e-w.cells[c][0]*.2)/.4)):1;
    // the sweep: a glass plane crossing the grid from left to right while the step plays
    if(k>0&&e<1)R.glass([lerp(-2.15,2.15,e),0,-2.15],[0,0,4.3],[0,1.0,0],{c:P.c2,a:.75*Math.sin(Math.PI*e),nu:4,nv:2,th:.02});
    for(let c=0;c<w.n;c++){const x=X(c),z=Z(c);
      if(w.term[c]){G.bar(R,x,z,.03,{fill:mix(P.paper,P.c3,.6)});R.label([x,.05,z],'goal',{fs:12,b:1});continue}
      const t=pc(c),v=lerp(-prev[c],-cur[c],t),h=v*HS,on=ch.indexOf(c)>=0;
      G.bar(R,x,z,h,{fill:on?mix(P.paper,P.c2,.3+.4*t):G.tint(P,P.c1,v/6),ec:k>0&&c===x0?P.ink:null,lw:k>0&&c===x0?2.4:1});
      const acts=GR[k][c];if(acts.length<4)acts.forEach(d=>G.arrow(R,x,Math.max(.03,h),z,d,{c:P.ink,a:.75}));
      R.label([x,Math.max(.03,h),z],f(t<.5?prev[c]:cur[c]),{fs:12.5,mono:1,dy:0,wide:1})}
    // the worked backup reads its four neighbours (a move off the grid stays put)
    if(k>0){const t=pc(x0),top=[X(x0),-lerp(prev[x0],cur[x0],t)*HS+.06,Z(x0)];R.glow(top,.5,{c:P.c1,a:.45*t});
      for(let d=0;d<4;d++){const n=nb(x0,d);if(n===x0)continue;const from=[X(n),(w.term[n]?.05:-prev[n]*HS+.05),Z(n)];R.flowArc(from,top,.5,{c:P.c1,a:t,r:.075,n:5,speed:1})}}
    R.label([2.1,0,1.7],k===0?'start':'sweep '+k,{fs:14,b:1,al:'left',dx:8})}
  const E=document.getElementById('dp-swE'),rc=s=>'row '+(w.cells[s][1]+1)+', column '+(w.cells[s][0]+1);
  function readout(k){if(!E)return;if(k===0){E.innerHTML='<b>The backup:</b> <i>V</i><sub>0</sub>(<i>s</i>) = 0 everywhere; the goal is terminal and stays 0.';return}
    const s=ex(k),q=D.qs(w,F[k-1],g,s);
    E.innerHTML='<b>The ringed backup:</b> <i>V</i><sub>'+k+'</sub>('+rc(s)+') ← max( '+NM.map((n,a)=>n+' '+f(q[a])).join(', ')+' ) = '+f(Math.max(...q))+'<span class="mute">; each move: −1 + <i>V</i><sub>'+(k-1)+'</sub>(where it lands)</span>'}
  const st=S3.stage({id:'stg-sw',list:'sx-sw',fig:'Fig. 3 · value iteration, one sweep per step',cam:[.38,.82],bounds:[[-2.2,0,-2.2],[2.6,1.8,2.2]],aspect:.8,draw,dur:2000,hold:4600,onStep:readout});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
})();

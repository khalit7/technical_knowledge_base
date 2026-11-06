// ---- Scene: Figure 4.1 in depth. Policy evaluation of the uniform random policy on Sutton and Barto's 4 x 4 grid (gamma 1, synchronous sweeps,
// the page's engine), at k = 0, 1, 2, 3, 10 and the exact V_pi; bar height is -V; arrows are greedy on the current values, every tie drawn.
// Renderer v2: at k = 2 the camera moves in close on one cell beside a corner and its four moves' values stream into it, a quarter each ----
(function(){
  if(!document.getElementById('stg-pe')||!window.DPS)return;const {lerp,mix}=S3,D=window.DPE,G=window.DPS;
  const w=D.W.sb44,pi=D.uniform(w),KS=[0,1,2,3,10,'∞'],F=[];let V=D.init(w);
  for(let k=0;k<=10;k++){if(KS.indexOf(k)>=0)F.push(V);V=D.sweep(w,V,1,'eval',pi,false).V}F.push(D.evalExact(w,pi,1));
  const GR=F.map(v=>D.greedy(w,v,1)),HS=.075;
  const X=c=>(w.cells[c][0]-1.5)*1.0,Z=c=>(w.cells[c][1]-1.5)*1.0;
  const WC=w.id['1,0'],nb=d=>{const [x,y]=w.cells[WC],k=(x+G.DIR[d][0])+','+(y+G.DIR[d][1]);return k in w.id?w.id[k]:WC};
  const fmt=v=>{const r=(Math.round(v*10)/10).toFixed(1);return r==='-0.0'||r==='0.0'?'0':r.replace('-','−')};
  function draw(R,k,e){const P=R.P;R.grid(-2.5,2.5,-2.5,2.5,.5);
    const cur=F[k],prev=F[Math.max(0,k-1)],opt=k>=3,wk=k===2,near=[WC].concat([0,1,2,3].map(nb));
    for(let c=0;c<w.n;c++){const x=X(c),z=Z(c);
      if(w.term[c]){G.bar(R,x,z,.03,{fill:mix(P.paper,P.c3,.6)});R.label([x,.05,z],'end',{fs:12,b:1});continue}
      const v=lerp(-prev[c],-cur[c],e),h=v*HS;
      const ra=wk&&near.indexOf(c)<0?.3:1;
      G.bar(R,x,z,h,{fill:wk&&c===WC?mix(P.paper,P.c2,.3+.4*e):G.tint(P,P.c1,v/22),a:ra});
      const acts=(e<.5&&k>0?GR[k-1]:GR[k])[c],n=acts.length;
      if(!wk||c!==WC)acts.forEach(d=>G.arrow(R,x,Math.max(.03,h),z,d,{c:opt?P.c2:P.mute,len:n===4?.17:.21,w:opt?2.6:1.8,a:ra}));
      R.label([x,Math.max(.03,h),z],wk&&c===WC?(e<.5?prev:cur)[c].toFixed(2).replace('-','−'):fmt((e<.5?prev:cur)[c]),{fs:12,mono:1,dy:0,wide:!(wk&&near.indexOf(c)>=0),a:ra,b:wk&&c===WC})}
    // the worked backup at k = 2: each move is taken with probability 1/4, so each landing cell's old value streams in at a quarter strength;
    // up runs into the wall and stays put, so the cell reads itself
    if(wk){const top=[X(WC),-cur[WC]*HS*e+.05,Z(WC)];
      for(let d=0;d<4;d++){const n=nb(d),from=[X(n),(w.term[n]?.05:-prev[n]*HS+.05),Z(n)];
        if(n===WC)R.flowArc([X(WC)-.2,top[1],Z(WC)-.2],[X(WC)+.2,top[1],Z(WC)-.2],.35,{c:P.c2,a:.9,r:.06,n:4,speed:.7});else R.flowArc(from,top,.4,{c:P.c2,a:.9,r:.06,n:5,speed:1})}
      R.label([X(WC),-cur[WC]*HS*e+.05,Z(WC)],R.W<520?'k = 2':'k = 2: −1 + ¼ (0 − 1 − 1 − 1) = −1.75',{fs:12.5,b:1,mono:1,dy:-46,c:P.c2,a:e})}
    if(!wk)R.label([2.1,0,1.7],'k = '+KS[k],{fs:14,b:1,al:'left',dx:8})}
  const st=S3.stage({id:'stg-pe',list:'sx-pe',fig:'Fig. 2 · evaluating the random policy, Figure 4.1',cam:[.38,.82],bounds:[[-2.2,0,-2.2],[2.6,1.7,2.2]],aspect:.8,draw,dur:1300,hold:4600,
    view:k=>k===2?{cam:[.34,.8],bounds:[[-2.4,0,-2.3],[1.7,.6,.4]]}:null});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
})();

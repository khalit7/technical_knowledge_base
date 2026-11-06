// ---- Scene: Figure 4.1 in depth. Policy evaluation of the uniform random policy on Sutton and Barto's 4 x 4 grid (gamma 1, synchronous sweeps,
// the page's engine), at k = 0, 1, 2, 3, 10 and the exact V_pi; bar height is -V; arrows are greedy on the current values, every tie drawn ----
(function(){
  if(!document.getElementById('stg-pe')||!window.DPS)return;const {lerp,mix}=S3,D=window.DPE,G=window.DPS;
  const w=D.W.sb44,pi=D.uniform(w),KS=[0,1,2,3,10,'∞'],F=[];let V=D.init(w);
  for(let k=0;k<=10;k++){if(KS.indexOf(k)>=0)F.push(V);V=D.sweep(w,V,1,'eval',pi,false).V}F.push(D.evalExact(w,pi,1));
  const GR=F.map(v=>D.greedy(w,v,1)),HS=.075;
  const X=c=>(w.cells[c][0]-1.5)*1.0,Z=c=>(w.cells[c][1]-1.5)*1.0;
  const fmt=v=>{const r=(Math.round(v*10)/10).toFixed(1);return r==='-0.0'||r==='0.0'?'0':r.replace('-','−')};
  function draw(R,k,e){const P=R.P;R.grid(-2.5,2.5,-2.5,2.5,.5);
    const cur=F[k],prev=F[Math.max(0,k-1)],opt=k>=3;
    for(let c=0;c<w.n;c++){const x=X(c),z=Z(c);
      if(w.term[c]){G.bar(R,x,z,.03,{fill:mix(P.paper,P.c3,.6)});R.label([x,.05,z],'end',{fs:12,b:1});continue}
      const v=lerp(-prev[c],-cur[c],e),h=v*HS;
      G.bar(R,x,z,h,{fill:G.tint(P,P.c1,v/22)});
      const acts=(e<.5&&k>0?GR[k-1]:GR[k])[c],n=acts.length;
      acts.forEach(d=>G.arrow(R,x,Math.max(.03,h),z,d,{c:opt?P.c2:P.mute,len:n===4?.17:.21,w:opt?2.6:1.8}));
      R.label([x,Math.max(.03,h),z],fmt(-v),{fs:12,mono:1,dy:0,wide:1})}
    R.label([2.1,0,1.7],'k = '+KS[k],{fs:14,b:1,al:'left',dx:8})}
  const st=S3.stage({id:'stg-pe',list:'sx-pe',fig:'Fig. 2 · evaluating the random policy, Figure 4.1',cam:[.38,.82],bounds:[[-2.2,0,-2.2],[2.6,1.7,2.2]],aspect:.8,draw,dur:1300,hold:4600});
  // size the card now, so the first ResizeObserver notification finds its final height
  if(st)st.draw();
})();

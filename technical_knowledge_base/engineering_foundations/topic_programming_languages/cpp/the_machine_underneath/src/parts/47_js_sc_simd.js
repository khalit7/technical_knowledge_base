// ---- Scene: one 16-element block of the dot product as instructions in lanes (x) against time in cycles (depth), three ways (section 6; renderer v2).
// Inputs are dot.cpp's (a[i] = (i % 17) / 4, b[i] = (i % 13) / 2); latencies published (Dougall Johnson: fmadd, fmul, fmla 4 cycles; fadd, faddp 3);
// the measured ns per element in L1 from window.CB.dot (run 1). The schedules are the model the page's table checks against the measurements.
(function(){
  if(!document.getElementById('stg-simd')||!window.CB||!CB.dot)return;const {at,off,cl,mix,lerp}=S3;
  const N=16,a=[...Array(N)].map((_,i)=>(i%17)*.25),b=[...Array(N)].map((_,i)=>(i%13)*.5),p=a.map((x,i)=>x*b[i]),pm=Math.max(...p);
  const LW=.21,SC=.068,BX=[-4.5,0,4.5],H=.16;          // lane width, depth per cycle, band centres, box height
  const lx=(band,l)=>BX[band]+(l-7.5)*LW, zc=c=>-c*SC;
  // instruction boxes: [band, first lane, last lane, start cycle, end cycle, colour key, step it belongs to]
  const I=[];for(let k=0;k<N;k++)I.push([0,k,k,4*k,4*k+4,'c1',1]);
  for(let r=0;r<4;r++)I.push([1,4*r,4*r+3,0,4,'c3',2]);for(let k=0;k<N;k++)I.push([1,k,k,4+3*k,7+3*k,'c2',2]);
  for(let r=0;r<4;r++)I.push([2,4*r,4*r+3,0,4,'c4',3]);
  I.push([2,0,7,4,7,'c5',4],[2,8,15,4,7,'c5',4],[2,0,15,7,10,'c5',4],[2,2,13,10,13,'c5',4],[2,5,10,13,16,'c5',4]);
  const END=[64,52,16],D=CB.dot.v,ME=[D.l1_scalar.runs[0],D.l1_auto.runs[0],D.l1_neon.runs[0]],PR=[4/3.2,3/3.2,.25/3.2];
  const NAME=['scalar · fmadd chain','-O2 · fmul.4s, then fadd chain','NEON · 4 x fmla.4s'];
  function draw(R,k,e){const P=R.P;R.grid(-7,7,-5.2,1.6,.5);
    const bandOn=bd=>k===0||k===5?1:(k===1&&bd===0)||(k===2&&bd===1)||(k>=3&&bd===2)?1:.28;
    // products at the front of each band, on a white plinth
    [0,1,2].forEach(bd=>{const al=bandOn(bd);R.box([BX[bd],0,.55],[N*LW+.12,.04,.3],{a:al,shadow:false});
      p.forEach((v,l)=>R.box([lx(bd,l),.04,.55],[LW*.7,Math.max(.01,v/pm*.75),.14],{fill:mix(P.paper,P.c2,.55),a:al,shadow:false,lw:.6}));
      if(al>.5)R.label([BX[bd],0,.75],NAME[bd],{fs:12.5,b:1,dy:18})});
    // the time axis on the left
    [0,16,32,48,64].forEach(c=>{R.line([[BX[0]-N*LW/2-.15,0,zc(c)],[BX[0]-N*LW/2-.35,0,zc(c)]],{c:P.mute,w:1});
      R.label([BX[0]-N*LW/2-.4,0,zc(c)],'cycle '+c,{al:'right',dx:-4,mono:true,fs:12,c:P.mute,wide:1})});
    // instruction boxes; a step's boxes appear in their order during the step
    const mine=I.filter(x=>x[6]===k);
    I.forEach(x=>{const [bd,l0,l1,c0,c1,ck,s]=x;if(s>k)return;let al=s<k?(k===5||bd===2&&k===4?1:.32):1;
      if(s===k){const j=mine.indexOf(x),t=cl(e*mine.length*1.05-j*(k===1||k===2?1:.6),0,1);if(t<=0)return;al*=t}
      const w=(l1-l0+1)*LW-.04,cx=(lx(bd,l0)+lx(bd,l1))/2,z0=zc(c0),z1=zc(c1);
      R.box([cx,0,(z0+z1)/2],[w,H,Math.abs(z1-z0)-.025],{fill:mix(P.paper,P[ck],.6),a:al,shadow:false,lw:.7})});
    // the dependency: s0 carried from box to box (scalar and the -O2 add chain)
    if(k===1||k===2){const bd=k===1?0:1,pts=[];for(let i=0;i<N;i++){const c=k===1?4*i+2:4+3*i+1.5;pts.push([lx(bd,i),H+.04,zc(c)])}
      R.flow(pts.slice(0,Math.max(2,Math.ceil(N*e))),{c:k===1?P.c1:P.c2,r:.05,speed:1.4})}
    if(k===3)for(let r=0;r<4;r++)R.flow([[lx(2,4*r+1.5),.85,.55],[lx(2,4*r+1.5),H+.05,zc(2)]],{c:P.c4,r:.05,n:5,speed:.9});
    if(k===4)R.flow([[lx(2,3.5),H+.05,zc(5.5)],[lx(2,7.5),H+.05,zc(8.5)],[lx(2,7.5),H+.05,zc(11.5)],[lx(2,7.5),H+.05,zc(14.5)]],{c:P.c5,r:.05,speed:.8});
    // totals at the end of each chain
    [0,1,2].forEach(bd=>{const show=(k===5||(bd===0&&k>=1)||(bd===1&&k>=2)||(bd===2&&k>=4))&&(bandOn(bd)>.5||R.W>=520);if(!show)return;const a=(k===1&&bd===0)||(k===2&&bd===1)||(k===4&&bd===2)?cl(e*1.6-.6,0,1):1;
      const t=END[bd]+' cycles'+(k===5?' · '+ME[bd].toFixed(3)+' ns':'');
      R.label([BX[bd],H,zc(END[bd])],t,{mono:true,fs:12.5,b:1,dy:-12,a,c:bd===2?P.c4:bd===1?P.c2:P.c1})});
    if(k===3)R.label([BX[2],H,zc(4)],'4 cycles · 0.25 per element',{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a:cl(e*1.6-.6,0,1)});
  }
  const full={cam:[.08,.95],bounds:[[-6.6,0,-4.7],[6.4,.9,1.1]]};
  const band=bd=>({cam:[.1,.9],bounds:[[BX[bd]-2.9,0,bd===2?-1.6:-4.7],[BX[bd]+2.4,.9,1.1]]});
  S3.stage({id:'stg-simd',list:'sx-simd',fig:'16 products, three schedules · depth is cycles',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:5000,draw,
    view:k=>k<=1?band(0):k===2?band(1):k===3||k===4?band(2):full,
    margin:w=>w<520?[14,10,26,10]:[18,16,30,70]});
})();

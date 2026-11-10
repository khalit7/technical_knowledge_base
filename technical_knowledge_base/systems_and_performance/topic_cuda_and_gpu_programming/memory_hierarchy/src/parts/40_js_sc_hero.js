// ---- Scene, Fig. 1 (hero): the ladder of memory spaces on an H100 SXM as stacked glass plates, each plate's width on a log scale of its capacity.
// Numbers are the page's sourced facts (the caption under the stage cites them): HBM3 80 GB at 3.35 TB/s, L2 50 MB, shared memory up to 228 KB per SM,
// 65,536 32-bit registers per SM (= 256 KB, derived), H800 load latencies 478.8 / 263.0 / 40.7 / 29.0 cycles (Luo et al.). Three SMs are drawn (illustrative count).
// Step 5's dot density is illustrative: one thin stream up from HBM, a dense loop between shared memory and registers (the reuse the core idea asks for).
// Steps are explained by #sx-hero on the left; on a phone (canvas under 520 px) every label hides and the list names the rungs. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const side=b=>.62*(Math.log10(b)-3.6);                 // plate width: log scale of bytes
  const HB=side(80e9),L2=side(50e6),SH=side(228e3),RG=side(65536*4);
  const YH=0,YL=1.55,YS=2.95,YR=3.85,SX=[-1.45,0,1.45],HX=-3.7,HZ=1.3;
  function plate(R,cx,y,w,c,a,nu){R.glass([cx-w/2,y,-w/2],[w,0,0],[0,0,w],{c,a,nu:nu||6,nv:nu||6,th:.07})}
  // a rung's label: at the plate's corner that lies furthest right on screen, so it never sits over the plates below
  function tag(R,cx,y,w,t,o){let best=null,bx=-1e9;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>{const p=[cx+a*w/2,y,b*w/2],q=R.p(p);if(q[0]>bx){bx=q[0];best=p}});R.label(best,t,Object.assign({mono:true,al:'left',dx:10,wide:1},o))}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,4.2,-2.8,2.8,.5);
    const A=(s)=>k===s?1:k===4?1:.2;                       // the step's own rung at full strength, the rest recede
    // 1. HBM: the big plate at the bottom
    plate(R,0,YH+.02,HB,P.c1,A(0),10);
    tag(R,0,YH,HB,'HBM3 · 80 GB · 3.35 TB/s',{fs:12.5,b:1,c:P.c1,a:A(0)>.5?1:.55});
    if(k===0)tag(R,0,YH,HB,'478.8 cycles away',{fs:12,dy:17,c:P.ink,a:e});
    // 2. L2, shared by every SM
    plate(R,0,YL,L2,P.c4,A(1),8);
    tag(R,0,YL,L2,'L2 · 50 MB · whole GPU',{fs:12.5,b:1,c:P.c4,a:A(1)>.5?1:.55});
    if(k===1)tag(R,0,YL,L2,'263.0 cycles away',{fs:12,dy:17,c:P.ink,a:e});
    // posts between the rungs, faint
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>R.line([[sx*L2*.42,YH+.06,sz*L2*.42],[sx*L2*.42,YL,sz*L2*.42]],{c:P.line,w:1,a:.6}));
    // 3. one SRAM plate per SM: shared memory and L1 are one pool
    SX.forEach((x,i)=>{plate(R,x,YS,SH,P.c3,A(2),4);R.line([[x,YL+.05,0],[x,YS,0]],{c:P.line,w:1,a:.7})});
    tag(R,SX[2],YS,SH,'shared + L1 · 228 KB per SM',{fs:12.5,b:1,c:P.c3,a:A(2)>.5?1:.55});
    if(k===2)tag(R,SX[2],YS,SH,'29.0 / 40.7 cycles away',{fs:12,dy:17,c:P.ink,a:e});
    // 4. the register file on top of each SM
    SX.forEach(x=>{plate(R,x,YR,RG,P.c2,A(3),8)});
    tag(R,SX[2],YR,RG,'registers · 256 KB per SM',{fs:12.5,b:1,c:P.c2,a:A(3)>.5?1:.55});
    if(k===3)tag(R,SX[2],YR,RG,'up to 255 per thread',{fs:12,dy:17,c:P.ink,a:e});
    // 5. the host, and the bytes climbing: once up from HBM, many times between shared memory and registers
    const ha=k===4?e:0;
    if(ha>0){R.box([HX,0,HZ],[1.0,.3,1.0],{fill:mix(P.paper,P.c5,.35),a:ha});
      R.label([HX,0,HZ+.5],'host RAM, pinned',{mono:true,fs:12.5,b:1,dy:14,c:P.c5,a:ha,wide:1});
      R.flow([[HX+.55,.15,HZ],[-HB/2+.3,.08,HZ*.6]],{c:P.c5,a:ha,r:.06,n:3,speed:.7});
      R.flow([[-L2/2+.3,YH+.1,0],[-L2/2+.3,YL-.02,0]],{c:P.c1,a:ha,r:.07,n:2,speed:.6});
      SX.forEach(x=>{R.flow([[0,YL+.08,0],[x*.6,YL+.6,0],[x,YS-.02,0]],{c:P.c4,a:ha*.8,r:.06,n:2,speed:.7});
        R.flow([[x-.25,YS+.1,0],[x-.25,YR-.02,0],[x+.25,YR-.02,0],[x+.25,YS+.1,0],[x-.25,YS+.1,0]],{c:P.c2,a:ha,r:.06,n:12,speed:1.5})});
      R.label([SX[0]-SH/2,(YS+YR)/2,0],'reused many times',{mono:true,fs:12,al:'right',dx:-10,c:P.c2,a:ha,wide:1});
      R.label([-L2/2+.3,(YH+YL)/2,0],'fetched once',{mono:true,fs:12,al:'right',dx:-12,c:P.c1,a:ha,wide:1})}
  }
  const full={cam:[.42,.36],bounds:[[-4.5,0,-2.3],[2.3,4.0,2.3]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the ladder on an H100, widths on a log scale',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4400,draw,
    margin:w=>w<520?[14,10,14,10]:[18,230,18,16],
    // the camera turns a little per step (never cropping the stack); step 5 shows the host on the left too
    view:k=>k<4?{cam:[.25+.1*k,.3+.04*k],bounds:[[-2.4,0,-2.3],[2.3,4.0,2.3]]}:full});
  (window.MHSTG=window.MHSTG||{})['stg-hero']=st;
})();

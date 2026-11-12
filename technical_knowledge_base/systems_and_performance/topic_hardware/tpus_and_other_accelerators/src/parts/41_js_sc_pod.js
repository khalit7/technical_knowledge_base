// ---- Scene, Fig. 3 (section 4): a TPU cube of 4 x 4 x 4 chips joined in a 3D torus, rings of an all-reduce moving along it, then the pod (renderer v2) ----
// Times come from the page's own slice model POD.slice (32_js_pod.js; check_sim.mjs compares it with recompute.py): v5p links, 16.06 GB of bf16
// gradients (the root's Llama 3.1 8B), one axis of a 4 x 4 x 4 cube, all three axes, and a 2 x 2 x 4 slice without wraparound. The 96 optical
// links per cube, 16 per face, are the TPU v4 paper's; Ironwood's 144 cubes and 1.77 PB are section 4's. The chips sit on a grid, not to scale,
// and the switch paths are schematic.
(function(){
  if(!document.getElementById('stg-pod')||!window.POD)return;const {at,off,mix,add,mul,cl}=S3;
  const V=16.06e9,G=POD.G.v5p,one=POD.slice('v5p',[4,4,4],[true,false,false],V),all3=POD.slice('v5p',[4,4,4],[true,true,true],V),open=POD.slice('v5p',[2,2,4],[false,false,true],V);
  const CUBES=144,f3=x=>x.toFixed(3);
  window.TPU_POD={one:one.t,all3:all3.t,open:open.t,oneWay:G.one,bidi:G.bi,ocs:one.ocs,openWrap:open.wrap,cubes:CUBES,chips:CUBES*64};  // checked by check_stages.mjs
  const DY=.85,LY=.5,p=(x,y,z)=>[(x-1.5),LY+y*DY,(z-1.5)],ALL=[];
  for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++)ALL.push([x,y,z]);
  const AX=[[1,0,0],[0,1,0],[0,0,1]],AC=P=>[P.c2,P.c6,P.c4];
  // a ring along axis a through chip c: the four chips in a line, closed by a wraparound path that leaves the end face and re-enters the other end
  function ring(c,a,out,h){const pts=[0,1,2,3].map(i=>{const q=c.slice();q[a]=i;return p(...q)}),u=AX[a].map(v=>v*(a===1?DY:1)*.55),o=mul(out,h);
    const hi=pts[3],lo=pts[0];return {line:pts,wrap:[hi,add(hi,u),add(add(hi,u),o),add(add(lo,mul(u,-1)),o),add(lo,mul(u,-1)),lo]}}
  function chips(R,alpha,hl){const P=R.P;ALL.forEach(c=>{const a=alpha(c);if(a<=.02)return;const q=p(...c),h=hl&&hl(c);
    R.box([q[0],q[1]-.09,q[2]],[.44,.18,.44],{fill:h?mix(P.paper,P.acc,.45):mix(P.paper,P.ink,.06),a,shadow:false,lw:.7})})}
  function links(R,alpha){const P=R.P;ALL.forEach(c=>{for(let a=0;a<3;a++){if(c[a]===3)continue;const d=c.slice();d[a]++;const al=alpha(c,d);if(al>.02)R.line([p(...c),p(...d)],{c:P.mute,w:1.1,a:al})}})}
  function stubs(R,a,col){if(a<=.02)return;ALL.forEach(c=>{for(let ax=0;ax<3;ax++)[0,3].forEach(e=>{if(c[ax]!==e)return;const q=p(...c),d=AX[ax].map(v=>v*(e?1:-1)*(ax===1?.38:.42));
    R.line([q,add(q,d)],{c:col,w:1.6,a})})})}
  function draw(R,k,e){const P=R.P,C=AC(P),lab=(q,t,o)=>R.label(q,t,Object.assign({mono:true,fs:12.5},o||{}));
    const cubeA=k<5?1:1-cl(e*2,0,1),podA=k===5?cl(e*2-1,0,1):0;
    if(k<5)R.grid(-3.2,3.2,-3.2,3.2,.5);else R.grid(-6.5,6.5,-6.5,6.5,.5);
    if(cubeA>0){
      const c0=[1,1,1],nb=c=>Math.abs(c[0]-1)+Math.abs(c[1]-1)+Math.abs(c[2]-1)===1;
      const slice=c=>c[0]>=2&&c[1]>=2;
      const chipA=c=>cubeA*(k===0?(c.join()===c0.join()||nb(c)?1:.05):k===4?(slice(c)?1:.12):1);
      chips(R,chipA,c=>(k===0&&c.join()===c0.join())||(k===3&&c[0]===3&&c[1]===3&&c[2]===3));
      links(R,(c,d)=>cubeA*(k===0?((c.join()===c0.join()||d.join()===c0.join())?0:.06):k===4?(slice(c)&&slice(d)?.35:.05):k===1?.45:.22));
      // step 1: the six links of one chip, data moving both ways on each
      if(k===0){const q=p(...c0);[[0,0,1,1],[2,1,1,1],[1,0,1,1],[1,2,1,1],[1,1,0,1],[1,1,2,1]].forEach((d,i)=>{const r=p(d[0],d[1],d[2]),cc=C[[0,0,1,1,2,2][i]];
          R.line([q,r],{c:cc,w:3,a:e});R.flow([q,r],{c:cc,r:.05,n:3,speed:.9,a:e});R.flow([r,q],{c:cc,r:.05,n:3,speed:.9,a:e*.6})});
        lab(q,'one chip',{dy:-16,b:1,a:e});lab(p(2,1,1),'X',{al:'left',dx:10,c:C[0],b:1,a:e});lab(p(1,2,1),'Y',{dy:-14,c:C[1],b:1,a:e});lab(p(1,1,2),'Z',{dy:16,c:C[2],b:1,a:e})}
      // step 2: the 96 face links to the optical switches
      if(k===1){stubs(R,e,P.c5);lab([0,LY+3*DY+.75,0],'64 chips · one rack',{b:1,a:e});lab([2.1,LY+1.5*DY,0],'16 optical links per face',{al:'left',dx:8,c:P.c5,b:1,a:e,wide:1})}
      if(k>=2&&k<=3)stubs(R,.35,P.c5);
      // step 3: every X row runs a ring; the front-top one is drawn with its wraparound through the switch
      if(k===2||k===3){const rx=[];for(let y=0;y<4;y++)for(let z=0;z<4;z++)rx.push([0,y,z]);
        if(k===2)rx.forEach(c=>{const g=ring(c,0,[0,1,0],.5),hl=c[1]===3&&c[2]===3;R.line(g.line,{c:C[0],w:hl?3:1.6,a:hl?1:.45});
          if(hl){R.line(g.wrap,{c:C[0],w:2.2,a:e,dash:[5,4]});R.flow(g.line.concat(g.wrap.slice(1)),{c:C[0],r:.06,n:12,speed:1.2,a:e})}
          else R.flow(g.line,{c:C[0],r:.04,n:3,speed:1.2,a:.5*e})});
        if(k===2){lab([0,LY+3*DY+1.25,0],'all-reduce along X · '+f3(one.t)+' s',{b:1,c:C[0],a:e});lab(add(p(-.5,3,3),[0,.5,0]),'wraparound via the switch',{al:'right',dx:-10,c:C[0],a:e,wide:1})}
        if(k===3){const c=[3,3,3];[[0,[0,1,0],.55],[1,[1,0,0],.6],[2,[0,1,0],.95]].forEach(([a,out,h])=>{const g=ring(c,a,out,h);R.line(g.line,{c:C[a],w:3});R.line(g.wrap,{c:C[a],w:2.2,dash:[5,4],a:e});
            R.flow(g.line.concat(g.wrap.slice(1)),{c:C[a],r:.06,n:12,speed:1.2,a:e})});
          lab([0,LY+3*DY+1.35,0],'X, Y and Z at once · '+f3(all3.t)+' s',{b:1,a:e})}}
      // step 5: a 2 x 2 x 4 slice; the Z line has open ends and no wraparound
      if(k===4){const c=[3,3,0],pts=[0,1,2,3].map(i=>p(3,3,i)),back=pts.slice().reverse();R.line(pts,{c:C[2],w:3,a:e});
        R.flow(pts.map(q=>add(q,[.05,.03,0])),{c:C[2],r:.06,n:6,speed:1.1,a:e});R.flow(back.map(q=>add(q,[-.05,-.03,0])),{c:C[2],r:.06,n:6,speed:1.1,a:e});
        [pts[0],pts[3]].forEach((q,i)=>R.line([q,add(q,[0,0,i?.45:-.45])],{c:P.bad,w:2,dash:[3,3],a:e}));
        lab(p(3,3,1.5),'2 × 2 × 4 · no wraparound · '+f3(open.t)+' s',{dy:-22,b:1,c:C[2],a:e});lab(p(3,3,3),'open end',{dy:18,dx:30,c:P.bad,a:e,wide:1})}
    }
    // step 6: the pod, 144 cubes; the optical switches can join any cube face to any other
    if(podA>0){const n=12,sp=.92,pos=(i,j)=>[(i-(n-1)/2)*sp,0,(j-(n-1)/2)*sp];
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)R.box(pos(i,j),[.6,.6,.6],{fill:i===0&&j===n-1?mix(P.paper,P.acc,.5):mix(P.paper,P.ink,.06),a:podA,shadow:false,lw:.6});
      const a0=add(pos(0,n-1),[0,.6,0]);[[5,2],[9,7],[11,0],[3,9],[7,4]].forEach(([i,j],q)=>R.flowArc(a0,add(pos(i,j),[0,.6,0]),1.2+.25*q,{c:P.c5,r:.07,n:7,speed:1.6,a:podA}));
      lab([0,.6,-(n-1)/2*sp],CUBES+' cubes × 64 = '+(CUBES*64).toLocaleString('en-US')+' chips (Ironwood)',{dy:-24,b:1,a:podA});
      lab(add(pos(0,n-1),[0,.6,0]),'one cube',{dy:-14,b:1,c:P.acc,a:podA,wide:1})}
  }
  const cube={cam:[.62,.5],bounds:[[-2.4,0,-2.4],[2.4,3.6,2.4]]};
  const views=[{cam:[.75,.42],bounds:[[-2,0,-2],[2,3.2,2]]},cube,{cam:[.55,.42],bounds:[[-2.4,0,-2.4],[2.4,4.3,2.4]]},{cam:[.62,.42],bounds:[[-2.4,0,-2.4],[2.6,4.6,2.6]]},cube,{cam:[.62,.75],bounds:[[-5.6,0,-5.6],[5.6,1.6,5.6]]}];
  const st=S3.stage({id:'stg-pod',list:'sx-pod',fig:'Fig. 3 · a TPU cube and its rings',cam:cube.cam,bounds:cube.bounds,aspect:.78,dur:1500,hold:4600,draw,
    view:k=>views[k]||cube,margin:w=>w<520?[14,10,14,10]:[22,22,22,22]});
  (window.TPUSTG=window.TPUSTG||{})['stg-pod']=st;
})();

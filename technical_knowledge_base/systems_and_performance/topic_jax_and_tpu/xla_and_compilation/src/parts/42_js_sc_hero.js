// ---- Scene, Fig. 1 (top of Reading): one program on its way down. Block 0's attention sub-block (forward), as recorded by src/lab/lowering.py:
// four forms as plates in a staircase (jaxpr 61 equations, StableHLO 90 operations, HLO before XLA's passes 133 instructions, optimised HLO 13 kernels),
// one tile per instruction in program order, and LayerNorm's x - mu followed down: recorded twice (u, z), lowered twice, four HLO instructions each,
// one left after CSE, inside one library fusion with the rest of LayerNorm (XPD.low.scn.sub, derived from the recorded forms by make_data.py).
// The whole train step's counts (XPD.n) are written at the last step. Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.XPS||!window.XPD)return;const {at,lerp,lerp3,mix}=S3,{lab,tile,tint,f}=XPS;
  const D=XPD,fc=D.low.fcounts,S=D.low.scn.sub,N=D.n;
  const LV=[{n:fc.jaxpr_eqns,pos:S.pos.jaxpr,name:'jaxpr',unit:'equations',c:'c4'},{n:fc.stablehlo_ops,pos:S.pos.shlo,name:'StableHLO',unit:'operations',c:'c6'},
            {n:fc.hlo_instructions,pos:S.pos.hlo,name:'HLO, before the passes',unit:'instructions',c:'c2'},{n:fc.opt_kernels,name:'optimised HLO',unit:'kernels',c:'c3'}];
  const STEP=[N.step_jaxpr,N.step_shlo,N.step_hlo,N.step_kernels];
  const X=i=>-4.6+i*2.3,Y=i=>2.7-i*.75,W=2.05,Dp=1.7,C=14,CELL=.135;
  // tile i of level l, in program order: rows from the back of the plate to the front
  function tp(l,i){const n=LV[l].n,rows=Math.ceil(n/C),r=Math.floor(i/C),c=i%C;return [X(l)-(C-1)/2*CELL+c*CELL,Y(l),-(rows-1)/2*CELL+r*CELL]}
  const idx=l=>LV[l].pos.map(p=>Math.min(LV[l].n-1,Math.round(p*LV[l].n)));
  // the 13 kernels of the optimised module: a 5 x 3 grid of blocks, the first (ynn_fusion.7, all of LayerNorm) in front on the left
  function kp(i){const r=Math.floor(i/5),c=i%5;return [X(3)-.76+c*.38,Y(3),.45-r*.42]}
  function draw(R,k,e){const P=R.P;R.grid(-6,6.2,-2.2,2.2,.5);
    const born=[0,1,2,4],about=[[0],[0,1],[1,2],[2],[2,3],[0,1,2,3,4]][k];
    const la=l=>{const b=born[l];return k<b?.12:k===b?.12+.88*e:(about.includes(l)?1:.28)};
    LV.forEach((L,l)=>{const a=la(l),c=P[L.c],y=Y(l);
      R.glass([X(l)-W/2,y,-Dp/2],[W,0,0],[0,0,Dp],{c,a:a*.9,nu:4,nv:3,th:.05});
      lab(R,[X(l),y+.02,-Dp/2],L.name+' · '+(k===5?f(STEP[l])+' in the step':L.n+' '+L.unit),{mono:true,fs:12.5,b:1,dy:-12,c,a:Math.max(.45,a),grp:'plates'});
      if(l<3){for(let i=0;i<L.n;i++)tile(R,tp(l,i),CELL*.72,{fill:tint(P,c,.55),a:a*.9,edge:false})}
      else{const K=S.pos.kernels;K.forEach((kk,i)=>R.box(kp(i),[.28,.2,.28],{fill:tint(P,P.c3,kk[1]==='kCustom'?.55:.3),a:Math.max(.1,a)*(i===0&&k>=4?0:1),shadow:false,lw:.7}))}});
    // the followed instructions, raised in blue
    const hi=(l,a,lift)=>idx(l).forEach(i=>{const p=tp(l,i);R.box(p,[CELL*.8,lift||.1,CELL*.8],{fill:P.acc,a,shadow:false,lw:.7})});
    if(k<=1)hi(0,k===0?Math.min(1,.2+e):1);
    if(k===0){const u=idx(0).map(i=>tp(0,i));lab(R,[u[0][0],u[0][1]+.1,u[0][2]],S.jaxpr[0]+' = sub q t',{mono:true,fs:12,dy:-11,c:P.acc,b:1,a:e});lab(R,[u[1][0],u[1][1]+.1,u[1][2]],S.jaxpr[1]+' = sub q t',{mono:true,fs:12,dy:14,c:P.acc,b:1,a:e})}
    if(k===1){const a=idx(0).map(i=>tp(0,i)),b=idx(1).map(i=>tp(1,i));a.forEach((p,j)=>R.flowArc([p[0],p[1]+.1,p[2]],[b[j][0],b[j][1]+.1,b[j][2]],.55,{c:P.acc,r:.06,n:7,a:Math.min(1,e*1.5)}));
      hi(1,e);lab(R,[b[0][0],b[0][1]+.1,b[0][2]],'stablehlo.subtract, twice',{mono:true,fs:12,dy:-12,c:P.acc,b:1,a:e})}
    if(k===2){hi(1,1);const a=idx(1).map(i=>tp(1,i)),h=idx(2);
      // each subtract becomes broadcast, reshape, broadcast, subtract: four tiles each
      a.forEach((p,j)=>{const q=tp(2,h[j*4+3]);R.flowArc([p[0],p[1]+.1,p[2]],[q[0],q[1]+.1,q[2]],.55,{c:P.acc,r:.06,n:7,a:Math.min(1,e*1.5)})});
      h.forEach((i,j)=>{const p=tp(2,i);R.box(p,[CELL*.8,.1,CELL*.8],{fill:j%4===3?P.acc:tint(P,P.acc,.45),a:Math.min(1,e*1.6),shadow:false,lw:.7})});
      lab(R,[X(1.5),Y(1.5)+.35,0],'PJRT: the module goes to XLA',{fs:12.5,b:1,c:P.c6,a:e,wide:1});
      const q=tp(2,h[0]);lab(R,[q[0],q[1]+.1,q[2]],'broadcast, reshape, broadcast, subtract · twice',{mono:true,fs:12,dy:-12,c:P.acc,b:1,a:e})}
    if(k===3){const h=idx(2).map(i=>tp(2,i)),m=tp(2,idx(2)[7]);
      // CSE: the two identical chains become one; the simplification passes have already folded the reshapes
      h.forEach((p,j)=>{const keep=j===7,q=keep?p:lerp3(p,m,e);R.box(q,[CELL*.8,.1,CELL*.8],{fill:keep?P.acc:tint(P,P.acc,.45),a:keep?1:1-e*.95,shadow:false,lw:.7})});
      lab(R,[m[0],m[1]+.1,m[2]],'cse: one subtract left',{mono:true,fs:12.5,dy:-12,c:P.acc,b:1,a:e})}
    if(k===4){const m=tp(2,idx(2)[7]),q=kp(0);R.box(m,[CELL*.8,.1,CELL*.8],{fill:P.acc,a:1-e*.6,shadow:false,lw:.7});
      R.flowArc([m[0],m[1]+.1,m[2]],[q[0],q[1]+.25,q[2]],.5,{c:P.acc,r:.065,n:8,a:Math.min(1,e*1.5)})}
    if(k>=4){const q=kp(0);R.box(q,[.3,.24,.3],{fill:P.acc,a:at(k,e,4),shadow:false,lw:.9});
      if(k===4)lab(R,[q[0],q[1]+.24,q[2]],S.opt_name+': all of LayerNorm',{mono:true,fs:12,dy:-12,c:P.acc,b:1,a:e})}
    // the executable: machine code, one per cache key
    const xa=k<5?.12:.12+.88*e,xe=[X(4),0,0];R.box(xe,[1.3,.55,.9],{fill:tint(P,P.c3,.6),a:xa});
    lab(R,[xe[0],0,xe[2]+.45],k===5?'executable · peak '+N.xla_peak_mb+' MB planned':'executable',{mono:true,fs:12.5,b:1,dy:16,al:'right',dx:40,c:P.c3,a:Math.max(.4,xa)});
    if(k===5){R.flow(XPS.legs([[X(3)+.9,Y(3)+.1,0],[xe[0]-.3,.6,0]]),{c:P.c3,r:.07,n:6,a:e})}
  }
  const full={cam:[.28,.62],bounds:[[-5.8,0,-1.1],[5.6,2.9,1.1]]};
  const near=(a,b)=>({cam:[.3,.68],bounds:[[X(a)-1.15,Y(b)-.05,-1],[X(b)+1.15,Y(a)+.35,1]]});
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one attention sub-block on its way down',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,18,16],
    // the camera follows the program down the staircase, then pulls back for the whole step's counts
    view:k=>k===0?near(0,0):k===1?near(0,1):k===2?near(1,2):k===3?near(2,2):k===4?near(2,3):full});
  (window.XPSTG=window.XPSTG||{})['stg-hero']=st;
})();

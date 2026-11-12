// ---- Scene, Fig. 1 (section 2): what "GPU utilisation" counts, on one simulated H100 (renderer v2) ----
// 132 SMs as a 12 x 11 grid of columns (height: warps resident of 64; colour: what they do), device memory as a glass plate behind,
// and three DCGM meters on the right (GPU util 203, SM active 1002, tensor active 1004). Patterns and readings come from the
// seven-situations engine window.OCM (24_js_oc_met.js): derived from the quoted definitions, the patterns illustrative; no GPU ran here.
(function(){
  if(!document.getElementById('stg-sm')||!window.OCM)return;const {at,off,lerp,mix}=S3;
  const M=window.OCM,C=M.CASES,SEQ=[null,'gemm','grid','hang','mem'],SHOW=['gemm','grid','hang','mem'],NAME={gemm:'healthy',grid:'26 blocks',hang:'hung',mem:'memory-bound'};
  const RD0={};SHOW.forEach(k=>RD0[k]=M.readings(C[k].bef));
  window.OC_SM=RD0; // for the check: the step list's numbers against the engine
  const COLS=12,SP=.55,BW=.42,HMAX=1.35,cx=i=>-3.025+(i%COLS)*SP,cz=i=>-2.75+Math.floor(i/COLS)*SP;
  // per-SM state of a situation (its first slice; the four shown are uniform over the window)
  function cells(key){const out=[];if(!key){for(let i=0;i<M.SM;i++)out.push(null);return out}
    const s=C[key].bef[0],per=[];s.g.forEach(g=>{for(let i=0;i<g.n;i++)per.push(g)});for(let i=0;i<M.SM;i++)out.push(i<per.length&&s.f>0?per[i]:null);return out}
  const CELLS=SEQ.map(cells);
  const MX=[4.7,6.3,7.9],MH=2.6,MK=[['util','GPU util','c5'],['act','SM active','c6'],['ten','tensor active','c1']];
  const fmt=(k,v)=>k==='util'?Math.round(v*100)+'%':v.toFixed(2);
  function col(P,g){if(!g)return P.paper;return g.k==='t'?mix(P.paper,P.c1,.3+.6*g.t):g.k==='c'?P.c4:mix(P.paper,P.c2,.7)}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-4.6,9,-4.6,3.6,.5);
    const last=k===5,ga=last?Math.max(0,1-2*e):1;
    // device memory: a glass plate behind the grid, fed in proportion to DRAM activity
    const key=SEQ[Math.min(k,4)],pkey=SEQ[Math.max(0,Math.min(k-1,4))];
    if(ga>.01){R.glass([-3.4,.05,-3.75],[6.8,0,0],[0,1.15,0],{c:P.c5,a:.75*ga,nu:10,nv:3});
      lab([0,1.2,-3.75],'HBM (device memory)',{dy:-10,c:P.mute,a:ga});}
    // the SM columns: tween from the last step's pattern to this one's
    const A=k===0?CELLS[0]:CELLS[Math.min(k,4)],B=k===0?CELLS[0]:CELLS[Math.max(0,Math.min(k-1,4))],t=k>=1&&k<=4?e:1;
    for(let i=0;i<M.SM;i++){const g=A[i],g0=B[i],h1=g?Math.max(.06,g.w/M.WMAX*HMAX):.04,h0=g0?Math.max(.06,g0.w/M.WMAX*HMAX):.04;
      const h=lerp(h0,h1,t),c=mix(col(P,g0),col(P,g),t);
      if(ga>.01)R.box([cx(i),0,cz(i)],[BW,h,BW],{fill:c,a:ga*(g||g0?1:.85),shadow:false,lw:.6})}
    if(k===0){lab([-3.3,.05,-2.75],'132 SMs',{al:'right',dx:-8,b:1});lab([3.4,.05,3.3],'one block = one SM; height = warps resident (of 64)',{al:'right',c:P.mute,dy:16,wide:1})}
    // flows: memory traffic into the busy SMs, dots in proportion to DRAM activity
    if(key&&k<=4){const s=C[key].bef[0],fa=k>=1?Math.min(1,e*1.6):0,ns=Math.round(s.dram*10);
      for(let j=0;j<ns;j++){const i=Math.floor((j+.5)/ns*(CELLS[k].filter(Boolean).length||1));if(!CELLS[k][i])continue;
        R.flowArc([cx(i)*.85,.9,-3.7],[cx(i),.5,cz(i)],.6,{c:P.c5,a:fa,r:.085,n:5,speed:1.4})}}
    // the hung case: the NVLink port, nothing moving
    if(k===3){R.box([-3.75,0,-2.2],[.25,.5,1.2],{fill:P.c4,a:e*.8});lab([-3.75,.5,-2.2],'NVLink: 0 bytes',{dy:-12,c:P.c4,b:1,a:e,wide:1})}
    // the three meters, tweening from the last reading
    const rd=key?RD0[key]:{util:0,act:0,ten:0},rp=pkey?RD0[pkey]:{util:0,act:0,ten:0},ma=last?Math.max(0,1-2*e):1;
    if(ma>.02)MK.forEach(([f,nm,ck],j)=>{const v=k>=1&&k<=4?lerp(rp[f],rd[f],e):rd[f],x=MX[j];
      R.box([x,0,0],[.85,MH,.85],{fill:P.paper,fa:.1,a:ma,shadow:false});
      if(v>.005)R.box([x,0,0],[.85,v*MH,.85],{fill:P[ck],a:ma});
      lab([x,MH+.3,0],k===0?'0':fmt(f,v),{dy:-10,b:1,c:P[ck],fs:13,a:ma});lab([x,0,.6],nm,{dy:14,c:P[ck],a:ma,grp:'m'})});
    if(k===3)lab([MX[0],MH+.3,0],'still',{al:'right',dx:-22,dy:-10,c:P.c5,b:1,a:e,wide:1});
    // the last step: the three meters of four situations side by side (a bar field)
    if(last){const a=e;SHOW.forEach((key2,gi)=>{const gx=-2.9+gi*2.05,r=RD0[key2];
      MK.forEach(([f,,ck],j)=>R.box([gx+(j-1)*.5,0,.6],[.4,Math.max(.02,r[f]*MH),.5],{fill:P[ck],a}));
      lab([gx,0,1.1],NAME[key2],{dy:14,b:1,a});lab([gx,r.act*MH,.6],'SM '+r.act.toFixed(2),{dy:-10,c:P.c6,a,fs:12,wide:1})});
      lab([-2.9,MH+.6,.6],'GPU util 100% in all four',{al:'left',dx:-30,dy:-12,c:P.c5,b:1,a})}
  }
  const full={cam:[.22,.62],bounds:[[-4.4,0,-4],[8.6,2.9,3.3]]};
  const st=S3.stage({id:'stg-sm',list:'sx-sm',fig:'Fig. 1 · one H100, three meters (derived)',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1400,hold:5200,draw,
    view:k=>k===2||k===3?{cam:[.3,.72],bounds:[[-4.4,0,-3.9],[8.6,2.7,.6]]}:k===5?{cam:[.12,.5],bounds:[[-4.4,0,-1],[4.6,2.9,2.2]]}:full,
    margin:w=>w<520?[16,10,16,10]:[22,18,20,18]});
  (window.OCSTG=window.OCSTG||{})['stg-sm']=st;
})();

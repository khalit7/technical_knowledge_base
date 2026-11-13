// ---- Scene (Fig. 4, Inside the update): the paper's Figures 3 and 4 measured on the toy, four grids of phi(i, j) as bar fields (renderer v2) ----
// Data: the kept adapters of task v4 (LORA_DATA.adapters.v4, Wv, seeds 1 and 2, ranks 4 and 16), the task's true edit (LORA_DATA.teachers.v4),
// two Gaussian 16 x 32 matrices from the page's own generator (seed 77, as the Train a LoRA tab draws them); phi is the paper's Equation 4 on the
// right-singular vectors of A, computed here by the page's engine (LORA.rightSV, LORA.subspaceSim, the same functions the tab uses).
// Each plate: rows i (the top-i directions of the first matrix) run from the back, columns j (the second) from the left; bar height is phi, 0 to 1.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sub')||!window.S3||!window.LORA||!window.LORA_DATA)return;const {at,off,lerp,mix}=S3;
  const E=window.LORA,LD=window.LORA_DATA,n=32,ad=LD.adapters.v4;
  const getA=(seed,r)=>{const a=ad[seed][r].Wv;return E.decode(a.A,a.sA,r*n)};
  const getDW=(seed,r)=>{const a=ad[seed][r].Wv,A=E.decode(a.A,a.sA,r*n),B=E.decode(a.B,a.sB,n*r);return E.deltaW({full:false,lora:{Wv:{A,B,r,s:a.s}}},'Wv')};
  const a4=E.rightSV(getA('1',4),4,n),a16=E.rightSV(getA('1',16),16,n),b16=E.rightSV(getA('2',16),16,n);
  const T=E.loadTeacher(LD.teachers.v4),tt=E.rightSV(T.A,T.r,n);
  const RG=E.rng(77),gauss=()=>{const M=new Float64Array(16*n);for(let j=0;j<M.length;j++)M[j]=RG.gauss();return E.rightSV(M,16,n)},g1=gauss(),g2=gauss();
  const phi=(u,v)=>E.subspaceSim(u.U,u.k,v.U,v.k,n);
  const sv16=Array.from(E.svd(getDW('1',16),n,n).S).slice(0,16),svT=Array.from(E.svd(E.deltaW({full:false,lora:{Wv:T}},'Wv'),n,n).S).slice(0,16);
  const PL=[{id:'r',G:phi(a4,a16),lab:'r = 4 against r = 16',c:'acc'},{id:'s',G:phi(a16,b16),lab:'seed 1 against seed 2',c:'c4'},
    {id:'t',G:phi(a16,tt),lab:'learned against the true edit',c:'c2'},{id:'g',G:phi(g1,g2),lab:'two random matrices',c:'mute'}];
  window.LORA_SUB={sv16,svT,r:PL[0].G,s:PL[1].G,t:PL[2].G,g:PL[3].G};
  // ---- layout: four plates in a row, back edges aligned; the two spectra in front of the first plate ----
  const cell=.16,bw=cell*.68,HM=.85,ZB=-1.28,GAP=.95;
  let x=-5.5;PL.forEach(p=>{p.nr=p.G.length;p.nc=p.G[0].length;p.w=p.nc*cell;p.d=p.nr*cell;p.x0=x;p.cx=x+p.w/2;x+=p.w+GAP});
  const SX=PL[0].cx,SZL=1.75,SZT=.95,SH=.9;
  // phi as bar height and as colour depth (pale near 0, full colour near 1), so the high corner reads from any angle
  function plate(R3,p,a,ga){const P=R3.P,col=p.c==='mute'?P.mute:P[p.c];
    R3.glass([p.x0,0,ZB],[p.w,0,0],[0,0,p.d],{c:col,a:ga*.9,nu:p.nc/4||1,nv:Math.max(1,p.nr/4),th:.03});
    if(a<=.01)return;for(let i=0;i<p.nr;i++)for(let j=0;j<p.nc;j++){const v=p.G[i][j],h=Math.max(.006,v*HM*a);
      R3.box([p.x0+cell*(j+.5),0,ZB+cell*(i+.5)],[bw,h,bw],{fill:mix(P.paper,col,.08+.92*Math.pow(v,1.6)),shadow:false,lw:.35,ea:.3,a:Math.min(1,a*1.4)})}}
  function draw(R3,k,e){const P=R3.P;R3.grid(-6,6.4,-2.4,2.6,.5);
    // 1. the spectra: the learned update at r = 16 (front) and the true edit (back), sigma as bar height
    const sa=k===0?1:k===5?.35:.18;
    const row=(z,vals,col,lab,a)=>{if(a<=.01)return;const w=16*cell;R3.box([SX,0,z],[w+.14,.05,.3],{a,shadow:false});
      vals.forEach((v,i)=>{const h=Math.max(.006,v/1.6*SH*(k===0?e:1));R3.box([SX-w/2+cell*(i+.5),.05,z],[bw,h,.16],{fill:col,a,shadow:false,lw:.5})});
      if(k===0||k===5)R3.label([SX+w/2,.05,z],lab,{mono:true,fs:12,al:'left',dx:10,c:P.ink,a:Math.max(a,.6),grp:'spec'})};
    row(SZL,sv16,mix(P.paper,P.acc,.6),'learned ΔW, r = 16',sa);row(SZT,svT,mix(P.paper,P.c4,.6),'true edit',sa);
    if(k===0){R3.label([SX-16*cell/2+cell*.5,sv16[0]/1.6*SH*e+.05,SZL],sv16[0].toFixed(2),{mono:true,fs:12,dy:-10,c:P.acc,a:e});
      R3.label([SX-16*cell/2+cell*4.5,sv16[4]/1.6*SH*e+.05,SZL],sv16[4].toFixed(2),{mono:true,fs:12,dy:-10,c:P.mute,a:e,wide:1});
      R3.label([SX-16*cell/2+cell*3.5,svT[3]/1.6*SH*e+.05,SZT],svT[3].toFixed(2)+' × 4',{mono:true,fs:12,al:'left',dx:8,dy:-6,c:P.c4,a:e})}
    // 2. to 5. one plate per step at full strength; those already seen recede; those to come wait as faint glass
    PL.forEach((p,q)=>{const s=q+1;let a,ga;
      if(k===5){a=1;ga=1}else if(k===s){a=e;ga=1}else if(k>s){a=.28;ga=.4}else{a=0;ga=.18}
      plate(R3,p,a,ga);const col=p.c==='mute'?P.mute:P[p.c],cur=k===s||k===5;
      if(cur){const back=k===5&&q%2===0;R3.label(back?[p.cx,HM+.12,ZB]:[p.cx,0,ZB+p.d],p.lab,{mono:true,fs:12.5,b:1,dy:back?-8:16,c:col,wide:k===5?1:0})}
      if(k===s&&a>.05){const v=p.G[0][0],u=p.G[p.nr-1][p.nc-1];
        R3.label([p.x0+cell*.5,v*HM*a,ZB+cell*.5],'φ(1,1) '+v.toFixed(2),{mono:true,fs:12.5,b:1,al:'right',dx:-6,dy:-8,c:P.ink,a:Math.min(1,a*1.5)});
        R3.label([p.x0+p.w-cell*.5,u*HM*a,ZB+p.d-cell*.5],'φ('+p.nr+','+p.nc+') '+u.toFixed(2),{mono:true,fs:12,al:'left',dx:8,c:P.mute,a:Math.min(1,a*1.5)})}});
  }
  const full={cam:[.1,.75],bounds:[[-5.7,0,-1.5],[6,1,2.1]]};
  const close=p=>({cam:[.28,.62],bounds:[[p.x0-.6,0,ZB-.2],[p.x0+Math.max(p.w,1.4)+.6,1.2,ZB+Math.max(p.d,1.4)+.2]]});
  S3.stage({id:'stg-sub',list:'sx-sub',fig:'Fig. 4 · φ between learned subspaces on the toy (task Wv, rank 4)',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,20,18,20],
    view:k=>k===0?{cam:[.25,.55],bounds:[ [SX-2.6,0,SZT-.4],[SX+1.6,.9,SZL+.3]]}:k>=1&&k<=4?close(PL[k-1]):full});
})();

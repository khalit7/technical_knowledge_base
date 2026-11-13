// ---- Scene (Fig. 2): who shares an FP8 scale with an outlier (renderer v2) ----
// Data: the page's own FP8 simulator (12_js_fp8core.js, checked against fp8_sim.py by check_fp8.mjs): FP8.scalingRun(1, kind, 1e5, 'e4m3', mode),
// the 32 tokens x 512 channels activation matrix of the widget below it, with outliers 10^5 times typical on channels 38 and 301 or on tokens 6 and 22.
// The matrix is a glass plate whose grid is the scaling granularity; each group's scale stands on it as a bar, height proportional to log10 of the group's
// largest magnitude (the scale is that divided by 448). After rounding to E4M3, each 1 x 128 region of the plate is tinted by the share of its values that
// became zero (red) or subnormal (yellow). Inputs are illustrative random matrices, not V3's tensors.
(function(){
  if(!document.getElementById('stg-fp8')||!window.FP8)return;const {at,off,mix}=S3,F=window.FP8;
  const T=32,K=512,X0=-4.8,PW=9.6,Z0=-2.4,PD=4.8,YP=.08,cx=c=>X0+PW*(c+.5)/K,cz=t=>Z0+PD*(t+.5)/T,RH=PD/T;
  const RUN={};
  function run(kind,mode){const key=kind+'|'+mode;if(RUN[key])return RUN[key];const r=F.scalingRun(1,kind,1e5,'e4m3',mode),tiny=2**F.FMT.e4m3.emin,reg=[];
    for(let t=0;t<T;t++){const row=[];for(let g=0;g<4;g++){let z=0,s=0;for(let c=g*128;c<g*128+128;c++){const q=r.Q.code[t][c],x=r.X[t][c];if(q===0&&x!==0)z++;else if(q!==0&&Math.abs(q)<tiny)s++}row.push([z/128,s/128])}reg.push(row)}
    r.reg=reg;return RUN[key]=r}
  // step k -> which run it shows: [outliers on, granularity, show the rounding outcome]
  const SCN=[['channels','tensor',0],['channels','tensor',0],['channels','tensor',1],['channels','tile',0],['channels','tile',1],['tokens','tile',1],['tokens','block',1]];
  let CP=null,CC=null;const cols=P=>{if(CP!==P){const s=getComputedStyle(document.body);CC={zero:S3.rgb(s.getPropertyValue('--zero').trim()||'#c0392b'),sub:S3.rgb(s.getPropertyValue('--subn').trim()||'#d4a72c')};CP=P}return CC};
  const hb=a=>.1+.24*Math.log10(Math.max(1,a));
  const big=v=>v>=1e4?(v/10**Math.floor(Math.log10(v))).toFixed(1)+'×10'+String(Math.floor(Math.log10(v))).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d]):v.toFixed(1);
  // the outliers: thin purple ridges standing on the plate along their channels (every token) or their tokens (every channel)
  function ridges(R,kind,a){if(a<=.01)return;const P=R.P;
    if(kind==='channels')[37,300].forEach(c=>R.box([cx(c),YP,0],[.07,.45,PD],{fill:P.c4,a,shadow:false,lw:.6}));
    else [5,21].forEach(t=>R.box([0,YP,cz(t)],[PW,.45,.07],{fill:P.c4,a,shadow:false,lw:.6}))}
  // the scale bars of one run, one per group, standing on the group's centre
  function bars(R,r,mode,a,hi){if(a<=.01)return;const P=R.P;
    r.Q.scales.forEach(s=>{const h=hb(s.amax),tall=s.amax>100;let c,sz;
      if(mode==='tensor'){c=[0,YP,0];sz=[.9,h,.9]}
      else if(mode==='tile'){c=[X0+2.4*(s.j0/128)+1.2,YP,cz(s.i0)];sz=[.7,h,RH*.6]}
      else{c=[X0+2.4*(s.j0/128)+1.2,YP,0];sz=[1.7,h,1.2]}
      R.box(c,sz,{fill:tall?mix(P.paper,P.c2,.75):mix(P.paper,P.c1,.35),a:a*(tall||!hi?1:.8),shadow:mode!=='tile',lw:mode==='tile'?.5:.9})})}
  // each 1 x 128 region tinted by what rounding did to its 128 values
  function damage(R,r,a){if(a<=.01)return;const P=R.P,C=cols(P);
    for(let t=0;t<T;t++)for(let g=0;g<4;g++){const [z,s]=r.reg[t][g];let c=P.paper;c=mix(c,C.sub,Math.min(1,s*1.4));c=mix(c,C.zero,Math.min(1,z*1.6));
      const x0=X0+2.4*g,z0=Z0+RH*t;R.quad([[x0,YP+.012,z0],[x0+2.4,YP+.012,z0],[x0+2.4,YP+.012,z0+RH],[x0,YP+.012,z0+RH]],{fill:c,a,edge:false,dz:20})}}
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6.5,-3.5,3.5,.5);
    const [kind,mode,out]=SCN[k],r=run(kind,mode),pk=k>0?SCN[k-1]:SCN[0];
    // the plate: its grid is the granularity (one cell per tensor; 4 x 32 tiles; 4 blocks)
    const nu=mode==='tensor'?1:4,nv=mode==='tile'?32:1;
    R.glass([X0,YP,Z0],[PW,0,0],[0,0,PD],{c:P.c1,nu,nv,a:.9,dz:50}); // drawn first: the tint, the ridges and the bars stand on it
    R.label([X0+PW/2,0,Z0+PD+.25],'512 channels →',{mono:true,fs:12,c:P.mute,dy:10});
    R.label([X0+PW+.15,0,0],'32 tokens',{mono:true,fs:12,c:P.mute,al:'left',dx:4,wide:1});
    // the outliers: fade the old kind out when step 6 moves them from channels to tokens
    const kindChange=pk[0]!==kind&&k>0;
    if(kindChange){ridges(R,pk[0],1-e);ridges(R,kind,e)}else ridges(R,kind,k===0?e:out?.45:1);
    if(k===0){R.label([cx(37),YP+.5,Z0],'outlier channels 38 and 301',{fs:12.5,b:1,c:P.c4,dy:-10,a:e});return}
    // bars: appear when the granularity changes, recede (alpha .3) while the outcome is shown
    const ba=k===5?.85:out?(mode==='tile'?.15:.3):1,changed=pk[1]!==mode||kindChange;
    if(changed&&k>0){bars(R,run(pk[0],pk[1]),pk[1],(SCN[k-1][2]?(pk[1]==='tile'?.15:.3):1)*(1-e));bars(R,r,mode,ba*e,1)}else bars(R,r,mode,k===1?e:ba,1);
    // the outlier sets the scale: dots stream from the outliers up into the bars they set
    if(!out){const fl=k===1||k===3?(k===1?e:1):0;
      if(mode==='tensor')R.flowArc([cx(37),YP+.45,cz(16)],[0,YP+hb(r.Q.scales[0].amax)+.05,0],.5,{c:P.c4,a:fl,r:.06,n:9});
      else [3,16,28].forEach(t=>[37,300].forEach(c=>R.flowArc([cx(c),YP+.45,cz(t)],[X0+2.4*Math.floor(c/128)+1.2,YP+hb(r.Q.scales[t*4+Math.floor(c/128)].amax)+.03,cz(t)],.25,{c:P.c4,a:fl*.9,r:.05,n:5})))}
    // the outcome: the scale divides every value of its group and E4M3 rounds it
    if(out){const da=changed||k===2?e:1;damage(R,r,da);
      const n=r.zeros,lab=n.toLocaleString('en-GB')+' of 16,384 values → 0';
      R.label([X0+PW/2,YP+2.2,Z0],lab,{fs:13,b:1,c:n>100?cols(P).zero:P.good,a:da});
      R.label([X0+PW/2,YP+2.2,Z0],r.sub.toLocaleString('en-GB')+' subnormal',{fs:12,c:P.mute,dy:18,a:da})}
    // the scale's own label
    if(!out){const s=r.Q.scales;if(mode==='tensor')R.label([0,YP+hb(s[0].amax),0],'one scale: max |x| = '+big(s[0].amax),{fs:12.5,b:1,dy:-12,c:P.c2,a:k===1?e:1});
      else R.label([X0+1.2,YP+hb(s[0].amax),Z0],'128 scales, one per tile',{fs:12.5,b:1,dy:-14,c:P.c2,a:k===3?e:1})}
    if(k===6)R.label([X0+1.2,YP+hb(r.Q.scales[0].amax),0],'4 scales, each spanning all 32 tokens',{fs:12.5,b:1,dy:-14,c:P.c2,a:e})}
  const full={cam:[.32,.86],bounds:[[-5.4,0,-2.7],[5.4,2.1,2.9]]};
  S3.stage({id:'stg-fp8',list:'sx-fp8',fig:'Fig. 2 · 32 tokens × 512 channels, one FP8 scale per group',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1400,hold:5200,draw,
    // the first tile step turns the camera, so the 128 scale bars separate into rows
    view:k=>k===3?{cam:[.5,.72],bounds:[[-5.2,0,-2.6],[5.2,1.6,2.7]]}:full,
    margin:w=>w<520?[16,8,12,8]:[18,70,14,30]});
})();

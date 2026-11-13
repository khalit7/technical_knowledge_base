// ---- Scene (Fig. 4, NF4): the 16 NF4 levels against the real distribution of 1,024 LLaMA-7B weights (renderer v2) ----
// Data, from the page's own files and engine: the same 16 blocks of 64 as Fig. 2 (QD.w[1], layer 15's value projection, row 37), each block
// divided by its own absmax as QE.quantise does; Int4 and NF4 levels from QD.types (NF4 = Appendix E); the normal density NF4 is built from,
// N(0, 1) with the code's ±1 at the quantile of the released offset 0.9677083 (QE.qnorm), drawn with the same area as the histogram;
// the stripes are NF4's bins (edges halfway between neighbouring levels) under that density; the counts and errors come from QE.quantise/QE.stats.
(function(){
  if(!document.getElementById('stg-nf4')||!window.S3||!window.QE||!window.QD)return;const {at,off,mix,lerp}=S3;
  const QD=window.QD,QE=window.QE,NB=16,BS=64,N=NB*BS;
  const x=Array.from(QE.decF16(QD.w[1].w)).slice(0,N),nf=QD.types.nf4,i4=QD.types.int4;
  const q=QE.quantise(x,nf,BS),am=Array.from(q.am),AM=Math.max(...am),xn=x.map((v,i)=>v/am[i>>6]),st=QE.stats(x,q,nf);
  const sti=QE.stats(x,QE.quantise(x,i4,BS),i4);
  const mean=xn.reduce((a,b)=>a+b,0)/N,sd=Math.sqrt(xn.reduce((a,b)=>a+(b-mean)**2,0)/N),Z=QE.qnorm(0.9677083);
  // normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7) for the stripes' areas
  const erf=v=>{const t=1/(1+.3275911*Math.abs(v)),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-v*v);return v>=0?y:-y};
  const Phi=v=>.5*(1+erf(v/Math.SQRT2)),ed=[-1];for(let i=0;i<15;i++)ed.push((nf[i]+nf[i+1])/2);ed.push(1);
  const area=nf.map((_,i)=>Phi(((i===15?Infinity:ed[i+1]))*Z)-Phi((i===0?-Infinity:ed[i])*Z));
  window.QL_NF4={amlo:Math.min(...am),amhi:AM,edge:xn.filter(v=>Math.abs(Math.abs(v)-1)<1e-12).length,sd,sdn:1/Z,z:Z,armin:Math.min(...area),armax:Math.max(...area),
    cnt:st.cnt.slice(),cmin:Math.min(...st.cnt),cmax:Math.max(...st.cnt),err:st.relmse,erri:sti.relmse};
  // ---- layout: value along x (XS per unit of [-1, 1]); one row of dots per block along z; the histogram at the back; the counts in front
  const XS=3,X=v=>v*XS,RZ=.17,ZR=b=>-1.2+RZ*b,ZH=-2.2,ZC=2.55,NBIN=40,bin=2/NBIN;
  const hist=new Array(NBIN).fill(0);xn.forEach(v=>{hist[Math.min(NBIN-1,Math.floor((v+1)/bin))]++});
  const HH=1.5/Math.max(...hist),pdf=v=>Math.exp(-((v*Z)**2)/2)*Z/Math.sqrt(2*Math.PI)*N*bin; // expected count per bin under the assumed normal
  const imax=Array.from({length:NB},(_,b)=>{let k=b*BS;for(let i=b*BS;i<(b+1)*BS;i++)if(Math.abs(x[i])>Math.abs(x[k]))k=i;return k});
  const near=v=>nf[QE.nearestIdx(nf,v)];
  function draw(R,k,e){const P=R.P;R.grid(-3.8,3.8,-2.8,2.8,.5);
    const dotc=mix(P.ink,P.paper,.15),hot=P.c2,i4c=P.c2,nfc=P.c1;
    // the axis along the front: weight values first, then value / absmax
    const norm=k===0?0:k===1?e:1;
    if(k!==5)[-1,-.5,0,.5,1].forEach(v=>R.label([X(v),0,ZR(NB-1)+.35],k===0||(k===1&&e<.5)?(v*AM).toFixed(3):String(v),{mono:true,fs:12,c:P.mute,dy:10}));
    if(k!==5)R.label([X(1),0,ZR(NB-1)+.35],k===0||(k===1&&e<.5)?'weight':'weight ÷ its block\'s absmax',{mono:true,fs:12,c:P.mute,al:'left',dx:14,dy:28,wide:1});
    // 1-2. the dots: raw (on one shared scale), then each block divided by its own absmax; 6: snapped to the nearest NF4 level
    const snap=k===5?e:0,da=k>=2&&k<5?.45:1;
    for(let i=0;i<N;i++){const b=i>>6,v0=x[i]/AM,v1=xn[i],v=lerp(v0,v1,norm),vs=lerp(v,near(v1),snap),h=imax[b]===i&&k>=1;
      R.ball([X(vs),.06,ZR(b)],h?.055:.035,{c:h?hot:dotc,a:h?1:da})}
    // 3. the histogram at the back against the normal density NF4 assumes
    const ha=k<2?0:k===2?e:k===5?.55:.85;
    if(ha>.01){hist.forEach((n,j)=>{if(!n)return;R.box([X(-1+bin*(j+.5)),0,ZH],[XS*bin*.86,n*HH*(k===2?e:1),.16],{fill:mix(P.paper,P.ink,.12),a:ha,shadow:false,lw:.5})});
      const pts=[];for(let s=0;s<=80;s++){const v=-1+2*s/80;pts.push([X(v),pdf(v)*HH*(k===2?e:1),ZH+.1])}R.line(pts,{c:P.c4,w:2.2,a:ha});
      R.label([X(.55),pdf(.55)*HH,ZH],'the normal NF4 assumes',{fs:12.5,b:1,c:P.c4,al:'left',dx:10,a:ha,wide:1});
      R.label([X(-1),0,ZH],'all 1,024, normalised',{mono:true,fs:12,c:P.mute,al:'right',dx:-8,a:ha,wide:1})}
    if(k===2)[1,5,9,13].forEach(b=>R.flowArc([X(xn[b*BS+7]),.08,ZR(b)],[X(xn[b*BS+7]),.4,ZH+.1],.3,{c:P.mute,a:e*.7,r:.04,n:5,speed:1.1}));
    // 4. Int4's 15 even levels as glass slats across the rows; 5. NF4's 16 quantile levels replace them, with their equal-area stripes at the back
    const sl=(lv,col,a)=>{if(a<=.01)return;lv.forEach(v=>R.glass([X(v),0,ZR(0)-.12],[0,0,ZR(NB-1)-ZR(0)+.24],[0,.42,0],{c:col,a,nu:1,nv:2,th:.01}))};
    sl(i4,i4c,k===3?e:k===4?1-e:0);
    const na=k<4?0:k===4?e:1;sl(nf,nfc,na);
    if(na>.01){for(let i=0;i<16;i++){if(i%2)continue;const a0=ed[i],a1=ed[i+1],pts=[];for(let s=0;s<=10;s++){const v=lerp(a0,a1,s/10);pts.push([X(v),pdf(v)*HH,ZH+.12])}
        R.quad([[X(a0),0,ZH+.12],...pts,[X(a1),0,ZH+.12]],{fill:nfc,a:na*.35,edge:false})}
      R.label([X(0),.45,ZR(0)-.12],'16 NF4 levels',{fs:12.5,b:1,c:nfc,dy:-10,a:na,wide:1})}
    if(k===3)R.label([X(0),.45,ZR(0)-.12],'15 Int4 levels',{fs:12.5,b:1,c:i4c,dy:-10,a:e,wide:1});
    // 6. how many weights land on each level, against a fair share of 64
    const ca=k===5?e:0;
    if(ca>.01){st.cnt.forEach((n,i)=>R.box([X(nf[i]),0,ZC],[.13,n/64*.5*ca,.22],{fill:mix(P.paper,nfc,.55),a:1,shadow:false,lw:.6}));
      R.quad([[X(-1)-.2,.5,ZC-.2],[X(1)+.2,.5,ZC-.2],[X(1)+.2,.5,ZC+.2],[X(-1)-.2,.5,ZC+.2]],{fill:P.c3,a:ca,fa:.16,ec:P.c3,ea:.7,lw:1,dash:[5,4]});
      R.label([X(1)+.2,.5,ZC],'fair share: 64',{mono:true,fs:12,c:P.c3,al:'left',dx:6,a:ca,wide:1});
      const im=st.cnt.indexOf(Math.max(...st.cnt));R.label([X(nf[im]),Math.max(...st.cnt)/64*.5,ZC],String(Math.max(...st.cnt)),{mono:true,fs:12,b:1,dy:-10,c:nfc,a:ca})}
  }
  const full={cam:[.12,.82],bounds:[[-3.6,0,-2.4],[3.6,1.6,2.9]]};
  S3.stage({id:'stg-nf4',list:'sx-nf4',fig:'Fig. 4 · NF4\'s levels against 1,024 real weights',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:5200,draw,
    // the levels are about the rows of dots: look down on them; the histogram steps turn to see the back
    view:k=>k<=1?{cam:[.08,.95],bounds:[[-3.4,0,-1.5],[3.4,.4,1.6]]}:k===2?{cam:[.22,.55],bounds:[[-3.5,0,-2.4],[3.5,1.7,1.4]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,30,18,30]});
})();

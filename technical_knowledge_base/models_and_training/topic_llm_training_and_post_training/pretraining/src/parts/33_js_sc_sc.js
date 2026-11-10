// ---- Scene (section 3, Fig. 3): the loss surface L(N, D) under the Besiroglu et al. refit, its IsoFLOP valleys and the iso-loss line (renderer v2) ----
// Every height and point is computed by the page's scaling engine (PTS in 26_js_rd_scale0.js, which check_data.py compares with recompute.py).
// x: log10 parameters, 9 to 12.5 (1B to 3T); z: log10 tokens, 10.5 to 14 (30B to 100T); height: loss above the floor, L - E, in nats.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sc')||!window.S3||!window.PTS)return;const {at,off,lerp,mix}=S3;
  const P0=window.PTS,F=P0.FITS.besi,CH=5.76e23,L3=3.8e25,K=4,N0=9,N1=12.5,D0=10.5,D1=14,SX=2.2,cN=(N0+N1)/2,cD=(D0+D1)/2;
  const X=ln=>(ln-cN)*SX,Z=ld=>(ld-cD)*SX,H=(N,D)=>(P0.loss(F,N,D)-F.E)*K,lg=Math.log10;
  const pt=(N,D,dy)=>[X(lg(N)),H(N,D)+(dy||0),Z(lg(D))];
  const tk=v=>v>=1e12?(v/1e12).toFixed(0)+'T':(v/1e9).toFixed(0)+'B';
  const big=v=>v>=1e12?(v/1e12).toFixed(v>=1e13?1:2).replace(/\.?0+$/,'')+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:1)+'B':(v/1e6).toFixed(0)+'M';
  const sup={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  const sci=v=>{const e=Math.floor(lg(v)+1e-9),m=v/Math.pow(10,e);return (Math.abs(m-1)<.005?'':m.toFixed(2).replace(/\.?0+$/,'')+' × ')+'10'+String(e).split('').map(c=>sup[c]).join('')};
  // the surface as a mesh of quads, coloured by height
  const NG=26,cells=[];let hmax=0;
  for(let i=0;i<NG;i++)for(let j=0;j<NG;j++){const a=N0+(N1-N0)*i/NG,b=N0+(N1-N0)*(i+1)/NG,c=D0+(D1-D0)*j/NG,d=D0+(D1-D0)*(j+1)/NG;
    const q=[[a,c],[b,c],[b,d],[a,d]].map(([n,t])=>[X(n),H(Math.pow(10,n),Math.pow(10,t)),Z(t)]);q.forEach(p=>hmax=Math.max(hmax,p[1]));cells.push(q)}
  // an IsoFLOP line: every (N, D = C / 6N) inside the drawn ranges
  function iso(C){const out=[],s=lg(C/6);for(let k=0;k<=60;k++){const n=N0+(N1-N0)*k/60,t=s-n;if(t<D0-1e-9||t>D1+1e-9)continue;const N=Math.pow(10,n),D=Math.pow(10,t);out.push([X(n),H(N,D),Z(t)])}return out}
  const BUD=[1e21,1e22,1e23,CH,1e24,1e25,L3],OPT=BUD.map(c=>P0.opt(F,c)),o=P0.opt(F,CH),o3=P0.opt(F,L3),kN=P0.kaplan(CH),L0=o.L,fl=P0.floorN(F,L0);
  // the iso-loss line at the optimum's loss (constant height, so it is where a level plane cuts the surface), and three ratios along it
  const lev=(L0-F.E)*K,cont=[];for(let k=0;k<=80;k++){const n=lg(fl)+.002+(N1-lg(fl)-.002)*k/80,N=Math.pow(10,n),D=P0.isoD(F,L0,N);if(!isFinite(D))continue;const t=lg(D);if(t<D0||t>D1)continue;cont.push([X(n),lev,Z(t)])}
  const OV=[100,1868].map(k=>Object.assign({k},P0.over(F,CH,k)));
  function writeList(){const set=(k,h)=>document.querySelectorAll('[data-sc="'+k+'"]').forEach(e=>e.innerHTML=h);
    set('E',F.E.toFixed(3));set('on',big(o.N));set('od',big(o.D));set('otpp',Math.round(o.tpp));set('kn',big(kN));set('kd',big(CH/6/kN));
    set('kl',(100*(P0.loss(F,kN,CH/6/kN)/L0-1)).toFixed(1));set('n21',big(OPT[0].N));set('n38',big(o3.N));set('d38',big(o3.D));
    set('t21',Math.round(OPT[0].tpp));set('t38',Math.round(o3.tpp));
    set('L0',L0.toFixed(3));set('o1n',big(OV[0].N));set('o1c',OV[0].C_ratio.toFixed(2));set('o2n',big(OV[1].N));set('o2c',OV[1].C_ratio.toFixed(2));set('o2s',OV[1].serve_ratio.toFixed(2));set('fl',big(fl))}
  function draw(R,k,e){const P=R.P,narrow=R.W<520,G=P.c2;R.grid(-4.4,4.4,-4.4,4.4,.55);
    // 0. the surface; later steps let it recede so the line the step is about stands out
    const sa=k===0?Math.min(1,e*1.4):k===1?lerp(1,.32,e):.32;
    cells.forEach(q=>{const h=(q[0][1]+q[2][1])/2,t=Math.min(1,h/hmax);R.quad(q,{fill:mix(P.paper,mix(P.c1,P.c2,Math.pow(t,.8)),.3+.5*t),fa:.92,ea:.2,lw:.6,a:sa})});
    // axes on the floor: parameters along the front-left edge, tokens along the front-right edge
    const ax=k===0?1:.75;
    [9,10,11,12].forEach(n=>R.label([X(n),0,Z(D1)+.25],tk(Math.pow(10,n)),{mono:true,fs:12,c:P.mute,dy:12,a:ax}));
    [11,12,13,14].forEach(t=>R.label([X(N1)+.25,0,Z(t)],tk(Math.pow(10,t)),{mono:true,fs:12,c:P.mute,dx:8,al:'left',a:ax}));
    R.label([X(cN)-.4,0,Z(D1)+1.15],'parameters N →',{fs:12.5,b:1,c:P.ink,a:ax});R.label([X(N1)+1.15,0,Z(cD)-.4],'tokens D →',{fs:12.5,b:1,c:P.ink,a:ax});
    if(k===0){R.label([X(N0),H(1e9,Math.pow(10,D0)),Z(D0)],'small model, few tokens: '+(P0.loss(F,1e9,Math.pow(10,D0))).toFixed(2),{mono:true,fs:12,b:1,c:P.c2,dy:-12,a:e,wide:1});
      R.label([X(N1),H(Math.pow(10,N1),1e14),Z(D1)],'3T on 100T: '+(P0.loss(F,Math.pow(10,N1),1e14)).toFixed(2),{mono:true,fs:12,b:1,c:P.c1,dy:-26,a:e,wide:1});
}
    // a curtain under an IsoFLOP line (glass), with its valley drawn on top
    function curtain(C,a,w,c){const l=iso(C);if(l.length<2)return l;for(let i=1;i<l.length;i++){const p=l[i-1],q=l[i];R.quad([[p[0],0,p[2]],[q[0],0,q[2]],[q[0],q[1],q[2]],[p[0],p[1],p[2]]],{fill:c,fa:.28,edge:false,a})}
      R.line(l.map(p=>[p[0],p[1]+.01,p[2]]),{c,w,a});return l}
    // 1. one budget: Chinchilla's 5.76e23 FLOPs
    if(k===1){const l=curtain(CH,e,3,G),ix=l.reduce((b,p,i)=>p[1]<l[b][1]?i:b,0);
      const left=l.slice(0,ix+1),right=l.slice(ix).reverse();R.flow(left.map(p=>[p[0],p[1]+.05,p[2]]),{c:G,a:e,r:.06,speed:.9});R.flow(right.map(p=>[p[0],p[1]+.05,p[2]]),{c:G,a:e,r:.06,speed:.9});
      const po=pt(o.N,o.D);R.glow(po,.32,{c:P.acc,a:e});R.ball(po,.11,{c:P.acc,a:e});R.label(po,'optimum '+big(o.N)+' on '+big(o.D),{mono:true,fs:12.5,b:1,c:P.acc,dy:22,a:e});
      [[280e9,'Gopher 280B',P.c4],[kN,'Kaplan '+big(kN),P.c5]].forEach(([N,t,c])=>{const q=pt(N,CH/6/N);R.ball(q,.09,{c,a:e});R.label(q,t,{mono:true,fs:12.5,b:1,c,dy:-24,a:e,grp:'b1'})});
      const pc=pt(70e9,1.4e12);R.box([pc[0],pc[1]+.02,pc[2]],[.05,.5,.05],{fill:P.c1,a:e,shadow:false});R.label([pc[0],pc[1]+.52,pc[2]],'Chinchilla 70B',{mono:true,fs:12.5,b:1,c:P.c1,dy:-8,a:e,grp:'b1'});
      R.label(l[0],sci(CH)+' FLOPs',{mono:true,fs:12.5,b:1,c:G,dy:-16,al:'left',a:e,wide:1})}
    // 2. every budget: one valley each; their minima are the compute-optimal path
    if(k===2){BUD.forEach((C,i)=>{const isCh=C===CH,a=e*(isCh?.9:.75);curtain(C,a,isCh?2.4:1.6,isCh?G:mix(P.c1,P.ink,.15))});
      const path=OPT.map(q=>pt(q.N,q.D,.04));R.line(path,{c:P.acc,w:2.6,a:e,top:1});R.flow(path,{c:P.acc,a:e,r:.075,speed:1.1,top:1});
      OPT.forEach((q,i)=>R.ball(pt(q.N,q.D,.04),.08,{c:P.acc,a:e,top:1}));
      R.label(pt(OPT[0].N,OPT[0].D),'10²¹: '+big(OPT[0].N),{mono:true,fs:12.5,b:1,c:P.acc,dy:-14,a:e});
      R.label(pt(o3.N,o3.D),'3.8 × 10²⁵: '+big(o3.N)+' on '+big(o3.D),{mono:true,fs:12.5,b:1,c:P.acc,dy:20,a:e});
      const q4=pt(405.85e9,L3/6/405.85e9);R.ball(q4,.09,{c:P.c4,a:e,top:1});R.label(q4,'Llama 3.1 405B',{mono:true,fs:12.5,b:1,c:P.c4,dy:-14,dx:-8,al:'right',a:e,wide:1})}
    // 3. one loss, many models: the level plane at the optimum's loss cuts the surface along the iso-loss line; no model below the floor size reaches it
    if(k===3){const pa=e;R.quad([[X(N0),lev,Z(D0)],[X(N1),lev,Z(D0)],[X(N1),lev,Z(D1)],[X(N0),lev,Z(D1)]],{fill:P.c3,fa:.1,ec:P.c3,ea:.45,a:pa});
      const xf=X(lg(fl));R.glass([xf,0,Z(D0)],[0,0,Z(D1)-Z(D0)],[0,lev+.5,0],{c:P.bad,a:.8*pa,nu:6,nv:3});R.label([xf,lev+.5,Z(D0)],'no model below '+big(fl),{mono:true,fs:12.5,b:1,c:P.bad,dy:-10,a:pa});
      R.line(cont.map(p=>[p[0],p[1]+.012,p[2]]),{c:P.c3,w:3,a:pa,top:1});
      const ip=cont.reduce((b,p,i)=>Math.abs(p[0]-X(lg(o.N)))<Math.abs(cont[b][0]-X(lg(o.N)))?i:b,0);R.flow(cont.slice(0,ip+1).reverse().map(p=>[p[0],p[1]+.04,p[2]]),{c:P.c3,a:pa,r:.065,speed:.9,top:1});
      const po=pt(o.N,o.D);R.ball(po,.1,{c:P.acc,a:pa,top:1});R.label(po,'optimum '+big(o.N)+' · 1×',{mono:true,fs:12.5,b:1,c:P.acc,dy:20,dx:8,al:'left',a:pa,grp:'b3'});
      OV.forEach((v,i)=>{const q=[X(lg(v.N)),lev,Z(lg(v.D))];R.ball(q,.09,{c:P.c3,a:pa,top:1});
        R.label(q,v.k.toLocaleString('en-GB')+' per param: '+big(v.N)+', '+v.C_ratio.toFixed(2)+'× compute',{mono:true,fs:12.5,b:1,c:P.c3,dy:i?26:-22,a:pa,grp:'b3'})})}
  }
  const full={cam:[.78,.4],bounds:[[-4.3,0,-4.3],[4.3,2.7,4.3]]};
  const l1=iso(CH),b1=l1.reduce((b,p)=>[[Math.min(b[0][0],p[0]),0,Math.min(b[0][2],p[2])],[Math.max(b[1][0],p[0]),Math.max(b[1][1],p[1]),Math.max(b[1][2],p[2])]],[[9,0,9],[-9,0,-9]]);
  S3.stage({id:'stg-sc',list:'sx-sc',fig:'Fig. 3 · loss over model size and tokens (Besiroglu et al. refit)',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,12,26,12]:[26,26,40,26],
    view:k=>k===1?{cam:[.76,.34],bounds:[[b1[0][0]-.6,0,b1[0][2]-.6],[b1[1][0]+.6,b1[1][1]+.2,b1[1][2]+.6]]}:k===3?{cam:[.9,.5],bounds:full.bounds}:full});
  writeList();
})();

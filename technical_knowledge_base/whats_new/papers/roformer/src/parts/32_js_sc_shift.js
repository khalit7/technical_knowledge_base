// ---- Scene (The shift test, Fig. 2): the same 12 digits slid along the 32 trained positions, through two trained toy models (RoPE on q and k,
// sinusoids added to the input). Each model's head that tracks offsets 1 and 4 is drawn as a bar field: rows are queries, columns keys, height
// is the attention weight from the page's forward pass (22_js_model.js, checked against PyTorch). Steps: positions 0 to 11; 4 to 15; on to 20 to 31
// (through 8, 12, 16); a close view of the sinusoidal head against its step-1 outlines. The step list quotes the numbers computed here. ----
(function(){
  if(!document.getElementById('stg-shift')||!window.RF)return;const {lerp,mix}=S3;
  const DIG=[3,8,1,6,0,9,4,4,7,2,5,1],N=DIG.length,OFFS=[0,4,8,12,16,20],STEP=[0,4,20,20];
  const M={rope:RF.load('rope'),sin:RF.load('sin')};
  function bestHead(mod){const r=RF.run(mod,DIG);let b=0,bv=-1;for(let h=0;h<RF.h;h++){let v=0;for(let i=RF.START;i<N;i++)v+=r.att[h][i][i-RF.L1]+r.att[h][i][i-RF.L2];if(v>bv){bv=v;b=h}}return b}
  const HEAD={rope:bestHead(M.rope),sin:bestHead(M.sin)};
  const RUNS={};['rope','sin'].forEach(k=>{RUNS[k]=OFFS.map(o=>RF.run(M[k],DIG,{offset:o}))});
  const A=(k,j)=>RUNS[k][j].att[HEAD[k]];
  const onLag=k=>{const W=A(k,0);let v=0,n=0;for(let i=RF.START;i<N;i++){v+=W[i][i-RF.L1]+W[i][i-RF.L2];n++}return v/n};
  const maxd=(k,j)=>{let x=0;const W0=A(k,0),W1=A(k,j);for(let i=0;i<N;i++)for(let c=0;c<=i;c++)x=Math.max(x,Math.abs(W0[i][c]-W1[i][c]));return x};
  const okc=(k,j)=>{let c=0,t=0;for(let i=RF.START;i<N;i++){t++;if(RUNS[k][j].pred[i]===RF.target(DIG,i))c++}return c+' of '+t};
  window.__shift={HEAD,OFFS,onLag,maxd,okc};
  // weights at a continuous offset (between two computed runs, linearly), so a slide is drawn as a glide
  function W(k,oc){const u=oc/4,j=Math.min(OFFS.length-2,Math.floor(u)),f=u-j,a=A(k,j),b=A(k,j+1);return a.map((r,i)=>r.map((v,c)=>v+(b[i][c]-v)*f))}
  const CS=.32,FW=CS*N,FX={rope:-2.45,sin:2.45},ZR=-3.05,HH=1.1;
  const cx=(m,c)=>FX[m]-FW/2+(c+.5)*CS,cz=i=>-1.8+(i+.5)*CS,rx=p=>(p-15.5)*CS;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  function field(R,m,oc,a,k){const P=R.P,Wm=W(m,oc),W0=A(m,0);
    for(let i=0;i<N;i++)for(let c=0;c<N;c++){const x=cx(m,c),z=cz(i);
      if(c>i){R.quad([[x-CS*.4,0,z-CS*.4],[x+CS*.4,0,z-CS*.4],[x+CS*.4,0,z+CS*.4],[x-CS*.4,0,z+CS*.4]],{fill:P.soft,a:a*.5,edge:false});continue}
      const w=Wm[i][c],h=Math.max(.01,w*HH),lag=i>=RF.START&&(i-c===RF.L1||i-c===RF.L2);
      R.box([x,0,z],[CS*.72,h,CS*.72],{fill:lag?P.c5:mix(P.paper,P.c1,.15+.7*Math.min(1,w*1.4)),a,fa:k>=1?.78:1,shadow:false,lw:.6,ea:.5});
      if(k>=1&&W0[i][c]>.03)R.box([x,0,z],[CS*.8,Math.max(.01,W0[i][c]*HH),CS*.8],{fa:0,a,shadow:false,lw:1.3,ec:P.ink,ea:.85})}
    R.box([FX[m],-.03,cz(0)+FW/2-CS/2],[FW+.2,.03,FW+.2],{a:a*.6,shadow:false,edge:false})}
  function draw(R,k,e,st){const P=R.P;R.grid(-6,6,-3.6,2.4,.5);
    const oc=tw(st,e,s=>STEP[s]);
    // the 32 trained positions at the back, the 12 digits' window lit
    for(let p=0;p<32;p++){const on=p>=oc-.01&&p<oc+N-.01;R.box([rx(p),0,ZR],[CS*.84,on?.16:.05,CS*.84],{fill:on?mix(P.paper,P.c1,.55):P.paper,a:1,shadow:false,lw:.6})}
    for(let t=0;t<N;t++)R.label([rx(oc+t),.18,ZR],String(DIG[t]),{mono:true,fs:12.5,b:1,dy:-10,wide:1});
    R.label([rx(-.5)-.1,0,ZR],'32 trained positions',{al:'right',dx:-6,fs:12,c:P.mute,grp:'side'});
    R.label([rx(oc+(N-1)/2),.2,ZR],'positions '+Math.round(oc)+' to '+Math.round(oc+N-1),{fs:13,b:1,dy:-30,c:P.c1});
    // the digits stream into both models
    ['rope','sin'].forEach(m=>R.flowArc([rx(oc+(N-1)/2),.2,ZR],[FX[m],.25,cz(0)-.2],.55,{c:P.c1,a:.75,r:.06,speed:1.4,n:9}));
    const fa=m=>k===3?(m==='sin'?1:.12):1;
    ['rope','sin'].forEach(m=>{field(R,m,oc,fa(m),k);
      R.label([FX[m],0,cz(N-1)+CS],m==='rope'?'RoPE · head '+(HEAD.rope+1):'sinusoidal · head '+(HEAD.sin+1),{fs:13,b:1,dy:18,a:fa(m),c:m==='rope'?P.q:P.ink});
      if(k>=1){const d=maxd(m,Math.min(OFFS.length-1,Math.round(oc/4)));R.label([FX[m],0,cz(N-1)+CS],'largest change '+(m==='rope'?(d<1e-15?'under 10⁻¹⁵':d.toExponential(1)):d.toFixed(3)),{fs:12.5,mono:true,dy:36,a:fa(m),c:m==='rope'?P.c3:P.c2,wide:1})}});
    R.label([FX.rope-FW/2-.1,0,cz(RF.START)],'gold: offsets 1 and 4',{al:'right',dx:-6,fs:12,c:P.c5,grp:'side'})
  }
  const full={cam:[.22,.95],bounds:[[-5.3,0,-3.3],[5.3,1.1,2.3]]};
  S3.stage({id:'stg-shift',list:'sx-shift',fig:'Fig. 2 · the same digits, slid along, through two trained models',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2200,hold:5200,draw,
    view:k=>k===3?{cam:[.45,.7],bounds:[[.4,0,-2.0],[4.5,1.1,2.2]]}:full,
    margin:w=>w<520?[14,8,14,8]:[16,14,26,130]});
})();

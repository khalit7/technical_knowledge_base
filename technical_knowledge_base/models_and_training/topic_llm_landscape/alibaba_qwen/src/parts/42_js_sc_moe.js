// ---- Scene (MoE section, Fig. 3): one MoE layer per release as a grid of expert blocks, the experts, experts per token, shared expert, d_model and
// expert width read from each config.json (window.QW). One block's footprint is proportional to the square root of its parameters (3 d_model d_ff),
// so block area is to scale across releases. Which experts light is illustrative (a fixed seeded pick); how many is the config's. ----
(function(){
  if(!document.getElementById('stg-moe')||!window.QW)return;const {lerp,mix}=S3,Q=QW.by;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  const lab=(R,p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
  const M=[['Qwen3-235B-A22B','235B-A22B'],['Qwen3-Next-80B-A3B','Next-80B'],['Qwen3.5-397B-A17B','3.5-397B'],['Qwen3.8-2.4T-A95B','3.8-2.4T'],['Qwen3.8-Flash-Next','Flash-Next']].map(([n,s])=>({r:Q[n],s}));
  const REF=Math.sqrt(QW.pe(Q['Qwen3.8-2.4T-A95B'])),CS=.13,GAP=.75;
  let x=-6.2;M.forEach(m=>{const r=m.r;m.c=CS*Math.sqrt(QW.pe(r))/REF;m.cols=r.E>128?32:16;m.rows=Math.ceil(r.E/m.cols);m.w=m.cols*m.c;m.d=m.rows*m.c;m.x=x+m.w/2;x+=m.w+GAP+(r.sh?m.c*2:0);
    const g=mulberry32(11+r.E+r.d),p=new Set();while(p.size<r.k)p.add(Math.floor(g()*r.E));m.on=p});
  const X1=x-GAP;
  const pct=m=>(100*(m.r.k+m.r.sh)/(m.r.E+m.r.sh)).toFixed(m.r.sh?1:2)+'%';
  const P1=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v.toLocaleString('en-GB');
  const big=v=>v>=1e12?(v/1e12).toFixed(3)+'T':(v/1e9).toFixed(1)+'B';
  const A=(s,i)=>s===4?1:s===i?1:0;
  function grid(R,P,i,a,e,sa,ll){const solo=sa>.01;const m=M[i],r=m.r;if(a<=.01)return;const x0=m.x-m.w/2,z0=-m.d/2,lift=m.c*2.4*e;
    R.glass([x0-.04,.003,z0-.04],[m.w+.08,0,0],[0,0,m.d+.08],{c:P.c1,a:a*.5,nu:1,nv:1,th:.015});
    for(let j=0;j<r.E;j++){const cx=x0+m.c*(j%m.cols+.5),cz=z0+m.c*(Math.floor(j/m.cols)+.5),on=m.on.has(j);
      R.box([cx,0,cz],[m.c*.8,on?m.c*.3+lift:m.c*.3,m.c*.8],{fill:on?P.c1:P.paper,a,shadow:false,lw:on?.7:.3,ea:on?.9:.35})}
    if(r.sh){const sx=m.x+m.w/2+m.c*1.1;R.box([sx,0,0],[m.c*.8,m.c*.3+lift,m.c*.8],{fill:P.c2,a,shadow:false,lw:.8});
      if(solo)lab(R,[sx,m.c*.3+lift,0],'shared, always on',{fs:12,b:1,al:'left',dx:10,dy:-4,c:P.c2,a:ll,wide:1})}
    if(solo){// a token, the router, and flows to the chosen experts
      const rx=x0-m.w*.28,rs=m.w*.08+.05,tx=rx-m.w*.22;
      const a2=a*sa;R.ball([tx,rs*.6,0],rs*.35,{c:P.ink,a:a2});R.box([rx,0,0],[rs,rs,rs],{fill:P.ink,fa:.15,a:a2,lw:.8});
      lab(R,[rx,rs,0],'router',{fs:12,dy:-10,c:P.mute,a:ll});
      R.flow([[tx,rs*.6,0],[rx,rs*.6,0]],{c:P.ink,a:a2*.7,r:Math.min(.05,m.c*.35),n:4,speed:.6});
      m.on.forEach(j=>{const cx=x0+m.c*(j%m.cols+.5),cz=z0+m.c*(Math.floor(j/m.cols)+.5);R.flowArc([rx,rs,0],[cx,m.c*.3+lift,cz],m.w*.12,{c:P.c1,a:a2*.8,r:Math.min(.045,m.c*.3),n:4,speed:.7})});
      if(r.sh)R.flowArc([rx,rs,0],[m.x+m.w/2+m.c*1.1,m.c*.3+lift,0],m.w*.14,{c:P.c2,a:a2*.8,r:Math.min(.045,m.c*.3),n:5,speed:.7})}}
  function draw(R,k,e,st){const P=R.P;R.grid(-6.6,X1+.4,-1.6,1.6,.5);
    M.forEach((m,i)=>{const a=tw(st,e,s=>A(s,i)),ll=la(st,e,s=>s===i&&s<4?1:0),lf=la(st,e,s=>s===4?1:0);
      grid(R,P,i,a,k===i||k===4?e:1,tw(st,e,s=>s===i&&s<4?1:0),ll);
      const r=m.r,y=m.c*.3;
      // solo step: the layer's numbers above it
      if(ll>.01){const zb=m.d/2+m.w*.22;lab(R,[m.x,0,zb],r.n,{fs:13,b:1,dy:8,c:P.ink,a:ll});
        lab(R,[m.x,0,zb],r.E+' experts, '+r.k+' per token'+(r.sh?' + '+r.sh+' shared':', no shared')+': '+pct(m)+' lit',{fs:12.5,dy:26,c:P.c1,a:ll});
        lab(R,[m.x,0,zb],'one expert 3 × '+r.d.toLocaleString('en-GB')+' × '+r.dff.toLocaleString('en-GB')+' = '+P1(QW.pe(r)),{mono:true,fs:12,dy:44,c:P.mute,a:ll})}
      // last step: all five, names under each grid
      if(lf>.01){const up=i%2===1,zp=up?-m.d/2:m.d/2,d1=up?-30:16,d2=up?-14:32;lab(R,[m.x,0,zp],m.s,{fs:12.5,b:1,dy:d1,c:P.ink,a:lf});lab(R,[m.x,0,zp],pct(m)+' · '+big(QW.stored(r)),{mono:true,fs:12,dy:d2,c:P.c1,a:lf})}});
    const lf=la(st,e,s=>s===4?1:0);if(lf>.01)lab(R,[M[3].x,0,M[3].d/2],'block area to scale: parameters per expert',{fs:12.5,dy:52,c:P.mute,a:lf})}
  const V=M.map(m=>{const pad=m.w*.55;return {cam:[.3,.72],bounds:[[m.x-m.w/2-pad,0,-m.d/2-m.w*.05],[m.x+m.w/2+m.w*.4,m.c*3,m.d/2+m.w*.05]]}});
  V[4]={cam:[.1,1.3],bounds:[[-6.3,0,-1.1],[X1+.2,.3,1.1]]};
  S3.stage({id:'stg-moe',list:'sx-moe',fig:'Fig. 3 · one MoE layer per release, expert blocks to scale',cam:V[0].cam,bounds:V[0].bounds,aspect:.52,dur:1600,hold:5000,draw,
    margin:w=>w<520?[30,8,70,8]:[40,24,80,24],view:k=>V[k]});
})();

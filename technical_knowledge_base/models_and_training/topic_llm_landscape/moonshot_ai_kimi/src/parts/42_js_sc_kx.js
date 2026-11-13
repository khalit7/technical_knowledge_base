// ---- Scene (stg-kx): one token through one K3 attention layer (renderer v2), replacing the 2D animation of 2026-10-24.
// Steps 1 to 5: one KDA head's state as a field of signed bars (16 x 16, one bar per 8 x 8 block of the real 128 x 128), decayed row by row,
// erased along the key, written with the value, read by the query; the toy values are the earlier animation's (seed 7), the layout and sizes
// are K3's (window.KM, from config.json). Steps 6 and 7: the KDA layer's fixed state against an MLA layer's cache at the same scale (volume
// proportional to numbers stored), the context sweeping to 16,384 tokens. Step 8: the 93-layer stack, KDA and Gated MLA from full_attn_layers.
// window.KM_KX exposes the derived numbers for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-kx')||!window.KM)return;const {lerp,mix}=S3,K=KM.k3;
  const H=K.heads,DK=K.hd,ENTRY=K.entry,STATE=H*DK*DK,CONV=3*H*DK*(K.conv-1),NK=K.kda.length,NM=K.mla.length,LY=K.layers,T0=4096,TS=16384,TMAX=K.ctx;
  const CROSS=STATE/ENTRY,hyb=t=>NM*ENTRY*t+NK*STATE,full=t=>LY*ENTRY*t,cut=t=>1-hyb(t)/full(t);
  const f=v=>v.toLocaleString('en-GB');
  window.KM_KX={STATE,CROSS,CONV,need:[[0,'7,168'],[0,'128 × 128 = 16,384'],[3,f(STATE)],[4,f(STATE)],[5,f(ENTRY)],[5,f(ENTRY*T0)],[6,f(Math.round(CROSS))],[6,f(CONV)],
    [6,f(ENTRY*TMAX)],[6,(ENTRY*TMAX/STATE)+' times'],[7,NK+' + '+NM+' = '+LY],[7,f(NM*ENTRY)],[7,f(LY*ENTRY)],[7,(100*cut(TMAX)).toFixed(1)+'%'],[7,(100*(1-NM/LY)).toFixed(1)+'%']]};
  // the toy head state (illustrative values, the earlier animation's): 16 x 16, decay, erase, write, read
  const rnd=mulberry32(7),N=16;
  const S0=[...Array(N)].map(()=>[...Array(N)].map(()=>(rnd()*2-1)*(0.35+0.65*rnd())));
  const AL=[0.99,0.97,0.6,0.95,0.5,0.9,0.98,0.55,0.93,0.7,0.99,0.62,0.85,0.96,0.52,0.92];
  let kv=[...Array(N)].map((_,i)=>Math.exp(-((i-5.5)**2)/3));{const n=Math.hypot(...kv);kv=kv.map(x=>x/n)}
  let qv=[...Array(N)].map((_,i)=>Math.exp(-((i-6.5)**2)/4));{const n=Math.hypot(...qv);qv=qv.map(x=>x/n)}
  const vv=[...Array(N)].map(()=>rnd()*2-1),BETA=0.85;
  const S1=S0.map((r,i)=>r.map(x=>x*AL[i]));
  const kS=[...Array(N)].map((_,j)=>S1.reduce((s,r,i)=>s+kv[i]*r[j],0));
  const S2=S1.map((r,i)=>r.map((x,j)=>x-BETA*kv[i]*kS[j]));
  const S3s=S2.map((r,i)=>r.map((x,j)=>x+BETA*kv[i]*vv[j]));
  const OUT=[...Array(N)].map((_,j)=>S3s.reduce((s,r,i)=>s+qv[i]*r[j],0));
  const MX=Math.max(...S0.flat().map(Math.abs),...S3s.flat().map(Math.abs)),MO=Math.max(...OUT.map(Math.abs));
  const vis=(k,e,st,f)=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const PI=.21,FW=PI*N,YP=.5,cx=j=>-FW/2+PI*(j+.5),rz=i=>-FW/2+PI*(i+.5);  // field: columns (value dims) along x, rows (key channels) along z
  // a vector as signed bars on a white plinth (the reference look): along x (axis 'x') or along z (axis 'z')
  function comb(R,c,vals,m,col,a,axis,hmax){if(a<=.01)return;const P=R.P,n=vals.length,L=PI*n;
    R.box([c[0],c[1]-.04,c[2]],axis==='x'?[L+.1,.04,.26]:[.26,.04,L+.1],{a,shadow:false});
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/m*hmax),o=-L/2+PI*(i+.5),p=axis==='x'?[c[0]+o,0,c[2]]:[c[0],0,c[2]+o];
      R.box([p[0],v>=0?c[1]:c[1]-.04-h,p[2]],[axis==='x'?PI*.66:.12,h,axis==='x'?.12:PI*.66],{fill:col,a,shadow:false,lw:.6})})}
  function draw(R,k,e,st){const P=R.P;
    const gA=lab(k,e,st,s=>s<=4?1:0),gB=lab(k,e,st,s=>s===5||s===6?1:0),gC=lab(k,e,st,s=>s===7?1:0);
    // ---- A: one head's state, steps 1 to 5 ----
    if(gA>.01){R.grid(-4.2,3.2,-2.8,2.8,.5);
      const Sd=k===0?S0:k===1?S0.map((r,i)=>r.map((x,j)=>lerp(x,S1[i][j],e))):k===2?S1.map((r,i)=>r.map((x,j)=>lerp(x,S2[i][j],e))):k===3?S2.map((r,i)=>r.map((x,j)=>lerp(x,S3s[i][j],e))):S3s;
      const pos=mix(P.paper,P.acc,.82),neg=mix(P.paper,P.acc,.38);
      R.box([0,YP-.05,0],[FW+.16,.05,FW+.16],{a:gA,shadow:false});
      for(let i=0;i<N;i++)for(let j=0;j<N;j++){const v=Sd[i][j],h=Math.max(.012,Math.abs(v)/MX*.75);
        const hl=(k===1&&AL[i]<.7)||(k>=2&&k<=3&&kv[i]>.25)||(k===4&&qv[i]>.25);
        R.box([cx(j),v>=0?YP:YP-.05-h,rz(i)],[PI*.7,h,PI*.7],{fill:v>=0?pos:neg,a:gA*(hl||k===0?1:.25),shadow:false,lw:.5,ea:.4})}
      [[-FW/2,YP,-FW/2],[FW/2,YP,-FW/2]].forEach(()=>{});
      R.label([0,YP,FW/2+.1],'one head’s state S · 128 × 128',{fs:12.5,b:1,dy:22,c:P.acc,a:gA});
      // step 1: the token's hidden state streams in through the projections
      const ta=gA*vis(k,e,st,s=>s===0?1:.18);
      const hv=[...Array(10)].map((_,i)=>Math.sin(i*1.7)*.8+Math.cos(i*.6)*.4);
      comb(R,[-3.6,.3,1.25],hv,1.2,mix(P.paper,P.ink,.25),ta,'z',.4);
      if(ta>.3)R.label([-3.6,.3,2.4],'hₜ · 7,168',{fs:12.5,b:1,dy:16,c:P.ink,a:ta});
      if(k===0){R.glass([-2.9,.12,-1.15],[0,0,1.1],[0,.75,0],{c:P.q,a:gA,nu:4,nv:4});R.label([-2.9,.87,-.6],'q, k, v, β, α per head',{mono:true,fs:12,dy:-10,c:P.ink,a:gA});
        R.flow([[-3.6,.5,1.0],[-2.9,.5,-.6]],{c:mix(P.ink,P.paper,.3),a:gA,r:.06,speed:1});R.flowArc([-2.9,.55,-.6],[-FW/2+.1,YP+.2,-.6],.3,{c:P.acc,a:gA,r:.06,speed:1.2})}
      // step 2: alpha per key-channel row, on the right
      const aa=gA*vis(k,e,st,s=>s===1?1:0);
      if(aa>.01){comb(R,[FW/2+.5,.2,0],AL,1,mix(P.paper,P.good,.75),aa,'z',.55);R.label([FW/2+.5,.8,-FW/2],'α per row',{fs:12.5,b:1,dy:-10,c:mix(P.good,P.ink,.2),a:aa});
        [0,4,7,14].forEach(i=>R.label([FW/2+.75,.2+AL[i]*.55,rz(i)],AL[i].toFixed(2),{al:'left',dx:4,mono:true,fs:12,c:P.mute,a:aa}))}
      // steps 3 and 5: k, then q, along the rows on the left; step 4: v along the columns at the back
      const ka=gA*vis(k,e,st,s=>s===2||s===3?1:0),qa=gA*vis(k,e,st,s=>s===4?1:0),va=gA*vis(k,e,st,s=>s===3?1:0),oa=gA*vis(k,e,st,s=>s===4?1:0);
      if(ka>.01){comb(R,[-FW/2-.5,.2,0],kv,Math.max(...kv),P.k,ka,'z',.55);R.label([-FW/2-.5,.8,-FW/2],'k',{serif:true,fs:15,b:1,dy:-8,c:P.k,a:lab(k,e,st,s=>s===2||s===3?1:0)});
        if(k===2)kv.forEach((w,i)=>{if(w>.25)R.flow([[-FW/2-.5,.5,rz(i)],[FW/2,YP+.1,rz(i)]],{c:P.k,a:ka*.8,r:.045,n:5,speed:1.1})})}
      if(qa>.01){comb(R,[-FW/2-.5,.2,0],qv,Math.max(...qv),P.q,qa,'z',.55);R.label([-FW/2-.5,.8,-FW/2],'q',{serif:true,fs:15,b:1,dy:-8,c:P.q,a:lab(k,e,st,s=>s===4?1:0)})}
      if(va>.01){comb(R,[0,.95,-FW/2-.45],vv,1,P.v,va,'x',.32);R.label([FW/2,.95,-FW/2-.45],'v',{serif:true,fs:15,b:1,al:'left',dx:10,c:P.v,a:va});
        if(k===3)[3,8,12].forEach(j=>R.flow([[cx(j),1.0,-FW/2-.45],[cx(j),YP+.3,rz(5)]],{c:P.v,a:va*.8,r:.045,n:5,speed:1.1}))}
      if(oa>.01){comb(R,[0,.25,FW/2+.55],OUT,MO,mix(P.v,P.ink,.15),oa,'x',.4);R.label([FW/2,.25,FW/2+.55],'o = Sᵀq',{mono:true,fs:12.5,b:1,al:'left',dx:10,c:mix(P.v,P.ink,.25),a:oa});
        if(k===4)[2,7,13].forEach(j=>R.flow([[cx(j),YP+.1,rz(6)],[cx(j),.4,FW/2+.55]],{c:P.q,a:oa*.8,r:.045,n:4,speed:1.1}))}
    }
    // ---- B: the layer, KDA's fixed state against an MLA cache at the same scale (equal cross-sections: length = numbers stored) ----
    if(gB>.01){R.grid(-4.2,4.6,-1.8,2.2,.5);
      const HB=1.1,DB=2.0,LK=.6;
      const t=k===6?Math.round(lerp(T0,TS,e)):k===5?T0:TS,LM=ENTRY*t*LK/STATE;
      const kx0=-3.2,mx0=-2.2;
      // KDA: the layer's 96 head states as one block (8 rows of 12 heads), fixed
      R.box([kx0,0,0],[LK,HB,DB],{fill:mix(P.paper,P.acc,.55),a:gB});
      for(let h=1;h<12;h++)R.line([[kx0-LK/2,HB,-DB/2+h*DB/12],[kx0+LK/2,HB,-DB/2+h*DB/12]],{c:P.edge,w:.6,a:gB*.6});
      R.label([kx0,0,DB/2],'KDA layer · '+f(STATE)+', fixed',{fs:12.5,b:1,dy:16,c:P.acc,a:gB});
      // MLA: the cache, one 576-number slice per token along x
      R.box([mx0+LM/2,0,0],[LM,HB,DB],{fill:mix(P.paper,P.c2,.55),a:gB});
      const ns=Math.min(30,Math.floor(LM/.12));for(let q=1;q<ns;q++){const x=mx0+q*LM/ns;R.line([[x,HB,-DB/2],[x,HB,DB/2]],{c:P.edge,w:.5,a:gB*.45})}
      R.label([mx0+LM/2,0,DB/2],'MLA layer · 576 × '+f(t)+' = '+f(ENTRY*t),{fs:12.5,b:1,dy:16,al:k===5?'left':'center',dx:k===5?-20:0,c:mix(P.c2,P.ink,.2),a:gB});
      // the crossing point: where the cache equals the state
      const xc=mx0+LK;R.line([[xc,0,DB/2+.04],[xc,HB+.55,DB/2+.04]],{c:P.ink,w:1.3,dash:[4,3],a:gB,top:1});
      R.label([xc,HB+.55,DB/2],'equal at about '+f(Math.round(CROSS))+' tokens',{fs:12,dy:-10,c:P.ink,a:gB});
      if(k===5){const x1=mx0+LM;
        R.box([x1+.5,.05,0],[.05,HB*.9,DB*.9],{fill:P.c2,a:gB,shadow:false});R.flowArc([x1+.5,.6,0],[x1+.04,.6,0],.25,{c:P.c2,a:gB,r:.06,n:4,speed:.8});
        R.label([x1+.55,HB*.5,0],'+576 per token',{al:'left',dx:12,fs:12.5,b:1,c:mix(P.c2,P.ink,.25),a:gB});
        // decode: all 96 query heads read every entry
        [-.5,0,.5].forEach(z=>R.flow([[x1+.4,HB+.12,z],[mx0,HB+.12,z]],{c:P.q,a:gB*.9,r:.055,speed:1.6,n:10}))}
    }
    // ---- C: the stack, 93 layers from full_attn_layers ----
    if(gC>.01){R.grid(-3,3.6,-1.2,1.2,.5);const pt=.046,isM=i=>K.mla.includes(i);
      for(let i=1;i<=LY;i++){const m=isM(i),y=(i-1)*pt;
        R.box([0,y,0],[1.5,pt*.8,1.1],{fill:m?mix(P.paper,P.c2,.75):mix(P.paper,P.acc,.6),a:gC,shadow:i===1,lw:.4,ea:.5});
        if(m)R.box([.75+.5,y,0],[1.0,pt*.8,.5],{fill:mix(P.paper,P.c2,.45),a:gC*.9,shadow:false,lw:.4});
}
      R.flow([[1.85,.1,0],[1.85,LY*pt,0]],{c:P.c2,a:gC*.5,r:.05,speed:1.2});
      R.label([1.8,LY*pt*.62,0],'24 Gated MLA caches grow with context',{al:'left',dx:10,fs:12.5,b:1,c:mix(P.c2,P.ink,.25),a:gC,grp:'R'});
      R.label([-1.0,LY*pt*.38,0],'69 KDA layers · one fixed state each',{al:'right',dx:-10,fs:12.5,b:1,c:P.acc,a:gC,grp:'L'});
      R.label([0,LY*pt,0],'K3 · 93 layers',{fs:12.5,b:1,dy:-14,c:P.ink,a:gC});
      R.label([.75,0,.55],'at 1M tokens: '+(100*cut(TMAX)).toFixed(1)+'% less than all-MLA',{fs:12.5,b:1,dy:18,c:P.ink,a:gC})}
  }
  const vA={cam:[.32,.62],bounds:[[-4.1,0,-2.6],[3.0,1.4,2.6]]},vB={cam:[.3,.6],bounds:[[-3.9,0,-1.2],[1.9,1.7,1.4]]},vC={cam:[.5,.22],bounds:[[-2.6,0,-.8],[3.4,4.4,.8]]};
  S3.stage({id:'stg-kx',list:'sx-kx',fig:'One token through one K3 attention layer',cam:vA.cam,bounds:vA.bounds,aspect:.62,dur:1900,hold:5200,draw,
    margin:w=>w<520?[16,8,16,8]:[20,24,20,24],
    view:k=>k<=4?vA:k<=6?vB:vC});
})();

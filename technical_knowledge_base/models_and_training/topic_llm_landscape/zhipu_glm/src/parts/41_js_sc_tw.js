// ---- Scene (Shape stage, stg-tw): five models as layer towers, one slab per layer, to scale, from window.ZG.towers (written by src/mk_data.py from
// config.json, and the GLM-4.5 report's Table 1 for DeepSeek-V3 and Kimi K2). A slab's width is the hidden size, its depth the routed experts
// per layer (the report's two measures of width), the tower's height the layer count; dense layers are lighter.
// Steps: GLM-4.5 against DeepSeek-V3 and Kimi K2; one GLM-4.5 layer exploded into 96 query heads over 8 cached key-value heads;
// GLM-5 wider and shallower with its all-to-all streams to an illustrative row of expert devices; Flash at half the depth with four mHC streams. ----
(function(){
  if(!document.getElementById('stg-tw')||!window.ZG)return;const {lerp,mix}=S3;
  const T={};ZG.towers.forEach(t=>T[t.id]=t);
  const X={ds3:-4.3,k2:-2.3,g45:-.3,g5:1.9,fl:4.0},DY=.032,TH=.022,W=t=>1.5*t.d/7168,D=t=>1.5*t.E/384,top=t=>t.L*DY;
  const F=v=>v.toLocaleString('en-GB');
  // alpha of each tower per step (0 = not yet there), and the step its labels belong to
  const A={ds3:[1,.1,.14,.3],k2:[1,.1,.14,.3],g45:[1,1,.5,.5],g5:[0,0,1,.5],fl:[0,0,0,1]};
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  // a label's alpha: the outgoing one is gone by mid-transition, the incoming one starts after it, so two never share the space
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  const GC=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(S3.rgb);
  window.ZG_TW={X,DY,W,D};
  function draw(R,k,e,st){const P=R.P;R.grid(-5.8,5.6,-2.2,1.6,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-30||q[0]>R.W+30||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    const C={ds3:P.c2,k2:P.c4,g45:P.acc,g5:P.acc,fl:P.acc};
    Object.keys(X).forEach(id=>{const t=T[id],x=X[id],a0=A[id][st.pk],a1=A[id][k],w=W(t),d=D(t);
      // a tower arriving from nothing waits for the outgoing step's objects to leave (second half of the glide), so the two never overlap
      const a=e>=1||a0===a1?a1:a0===0?lerp(0,a1,Math.max(0,2*e-1)):lerp(a0,a1,e);
      // a tower still to come: its footprint, dashed, so the layout is there from the first step (hidden while the heads are out)
      const ghost=k===1||st.pk===1&&e<1||id==='fl'&&(k===2||st.pk===2&&e<1)?0:1-a;
      if(ghost>.01&&a<.99)R.quad([[x-w/2,0,-d/2],[x+w/2,0,-d/2],[x+w/2,0,d/2],[x-w/2,0,d/2]],{fill:P.soft,fa:.5,ec:P.line,ea:.9,dash:[4,3],a:ghost*.9});
      if(a<=.01)return;
      for(let i=0;i<t.L;i++){const ty=t.types?t.types[i]:'',base=ty==='K'?P.c3:C[id],dense=i<t.dense;
        R.box([x,i*DY,0],[w,TH,d],{fill:mix(P.paper,base,dense?.3:.72),a,shadow:i===0,lw:.45,ea:.5})}
      const lk=la(st,e,s=>A[id][s]>=1?1:0),lo=Math.max(lk,a>.4?.55:0);
      lab([x,0,d/2+.05],t.n,{fs:12.5,b:1,dy:15,c:C[id],a:lo});
      lab([x,0,d/2+.05],t.L+' × '+F(t.d),{mono:true,fs:12,dy:31,c:P.ink,a:lo});
      lab([x,0,d/2+.05],t.E+' experts',{fs:12,dy:46,c:P.mute,a:lo});
    });
    // step 1: a token runs up the three towers being compared
    const fa=tw(st,e,s=>s===0?1:0);
    if(fa>.01)['ds3','k2','g45'].forEach(id=>{const t=T[id],z=D(t)/2+.06;R.flow([[X[id],.01,z+.5],[X[id],.01,z],[X[id],top(t),z]],{c:P.ink,a:fa*.55,r:.05,n:14,speed:1.1})});
    const ra=la(st,e,s=>s===0?1:0);
    if(ra>.01){lab([X.g45,top(T.g45),0],'92 / 61 = 1.51 times as deep',{fs:12.5,b:1,dy:-14,c:P.acc,a:ra});
}
    // step 2: one GLM-4.5 layer exploded: 96 query heads in 8 groups of 12, each group reading one cached key-value head on the floor
    const ha=la(st,e,s=>s===1?1:0),hl=ha;
    if(ha>.01){const Y=1.55,x0=.75,gx=g=>1.05+g*.5;
      R.glass([x0,Y,-.62],[4.05,0,0],[0,0,1.24],{c:P.acc,a:ha*.7,nu:8,nv:2,th:.03});
      const ly=46*DY+TH/2,t=T.g45;R.flow([[X.g45+W(t)/2,ly,0],[x0-.05,Y+.02,0]],{c:P.acc,a:ha*.8,r:.05,n:7,speed:1});
      for(let g=0;g<8;g++){const c=GC[g],cx=gx(g);
        for(let j=0;j<12;j++){const cc=j%4,rr=Math.floor(j/4);R.box([cx+(cc-1.5)*.095,Y+.03,-.27+rr*.27],[.06,.3,.06],{fill:mix(P.paper,c,.8),a:ha,shadow:false,lw:.4,ea:.45})}
        R.box([cx,0,0],[.3,.2,.3],{fill:c,a:ha,lw:.6});
        R.flow([[cx,.22,0],[cx,Y-.04,0]],{c,a:ha*.9,r:.05,n:5,speed:.9})}
      lab([gx(3.5),Y+.36,-.27],R.W<520?'96 query heads, 8 groups':'96 query heads · 8 groups of 12 · 96 × 128 = 12,288 numbers',{fs:12.5,b:1,dy:-14,c:P.ink,a:hl});
      lab([gx(3.5),0,.15],R.W<520?'8 cached KV heads':'8 key-value heads: the only ones cached · 2 × 8 × 128 = 2,048 numbers',{fs:12.5,b:1,dy:26,c:P.ink,a:hl});
      lab([x0,Y,.62],'one of 92 layers',{fs:12,al:'left',dx:2,dy:16,c:P.mute,a:hl})}
    // step 3: GLM-5's all-to-all: tokens out to the devices holding their experts and back (devices illustrative)
    const da=tw(st,e,s=>s===2?1:0),dl=la(st,e,s=>s===2?1:0);
    if(da>.01){const t=T.g5,xb=X.g5+W(t)/2,dz=.1,dx=i=>3.25+(i%4)*.42,dzz=i=>i<4?-.35:.35;
      for(let i=0;i<8;i++)R.box([dx(i),0,dzz(i)],[.24,.26,.24],{fill:mix(P.paper,P.mute,.25),a:da,lw:.6});
      [14,38,62].forEach((L,j)=>{const y=L*DY,a0=[xb,y,-.15],a1=[xb,y+.05,.15],d0=[dx(j),.26,dzz(j)],d1=[dx(j+5),.26,dzz(j+5)];
        R.flowArc(a0,d0,.12,{c:P.c5,a:da,r:.055,n:6,speed:1.1});R.flowArc(d1,a1,.12,{c:P.c6,a:da,r:.055,n:6,speed:1.1})});
      lab([dx(1.5),0,.6],'devices holding experts (8, illustrative)',{fs:12,dy:18,c:P.mute,a:dl});
      lab([3.0,1.75,0],'2 all-to-all per MoE layer',{fs:12.5,b:1,al:'left',dy:-16,c:P.ink,a:dl,wide:1});
      lab([3.0,1.75,0],'75 × 2 = 150 a pass (GLM-4.5: 178)',{mono:true,fs:12,al:'left',dy:2,c:P.mute,a:dl,wide:1});
}
    // step 4: Flash, half the depth: KDA layers green, sparse blue; four residual streams (mHC) beside it
    const ma=tw(st,e,s=>s===3?1:0),ml=la(st,e,s=>s===3?1:0);
    if(ma>.01){const t=T.fl,z=D(t)/2+.1,xr=X.fl+W(t)/2+.12;
      for(let s=0;s<t.hc;s++)R.flow([[xr+s*.1,.02,z-.2*s],[xr+s*.1,top(t),z-.2*s]],{c:P.c5,a:ma,r:.045,n:9,speed:1});
      lab([X.fl,top(t),0],'45 layers: 34 KDA + 11 sparse',{fs:12.5,b:1,dy:-30,c:P.c3,a:ml});
      lab([X.fl,top(t),0],'4 residual streams (mHC)',{fs:12,dy:-14,c:mix(P.c5,P.ink,.3),a:ml});
      lab([X.g45,top(T.g45),0],'92 layers',{fs:12.5,b:1,dy:-14,c:P.acc,a:ml})}
  }
  const V=[{cam:[.34,.3],bounds:[[-5.3,0,-.9],[.55,3.05,1.6]]},{cam:[.3,.36],bounds:[[-1.1,0,-.9],[4.95,2.95,1.1]]},
    {cam:[.34,.34],bounds:[[-1.1,0,-1],[5.0,3.05,1.3]]},{cam:[.3,.3],bounds:[[-5.3,0,-1.1],[4.95,3.05,1.6]]}];
  S3.stage({id:'stg-tw',list:'sx-tw',fig:'Shape · one slab per layer, to scale',cam:V[3].cam,bounds:V[3].bounds,aspect:.6,dur:1600,hold:5600,draw,
    margin:w=>w<520?[30,8,52,8]:[34,16,60,16],view:k=>V[k]});
})();

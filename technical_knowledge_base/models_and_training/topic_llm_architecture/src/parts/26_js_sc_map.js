// ---- Fig. 1 (section 1): the decoder in one screen (renderer v2, 25_js_s3.js). One Llama 3.1 8B decoder block as glass plates on its residual
// stream, tokens in and a distribution out; each step lights one part and names the child page that owns it.
// Every number is computed here from the Llama 3.1 8B config that sections 2 and 3 cite (hidden_size 4,096, 32 layers, 32 query heads and
// 8 KV heads of 128, intermediate_size 14,336, vocabulary 128,256, untied tables, a BF16 cache). window.LAM exposes them; check_stages.mjs
// compares them with the step list. Each plate is d = 4,096 tall and as deep as the matrix's other side, to scale, except the two vocabulary
// tables (drawn shortened, said on the figure). Illustrative, and labelled so: the words, the 12 cache bricks, the fixed state's size, the split
// into 8 experts with 2 chosen, the heights of the probability bars. ----
(function(){
  if(!document.getElementById('stg-map')||!window.S3)return;const {lerp,mix,rgb}=S3;
  const C={V:128256,d:4096,L:32,H:32,Hkv:8,dh:128,ff:14336,b:2,ctx:131072};
  const wq=C.d*C.H*C.dh,wkv=C.d*C.Hkv*C.dh,wo=C.H*C.dh*C.d,attn=wq+2*wkv+wo,ffn=3*C.d*C.ff,norms=2*C.d,block=attn+ffn+norms,emb=C.V*C.d,
    total=C.L*block+2*emb+C.d,kvTok=2*C.L*C.Hkv*C.dh*C.b,kvCtx=kvTok*C.ctx;
  const M=v=>(v/1e6).toFixed(1)+'M',n0=v=>v.toLocaleString('en-US');
  window.LAM={cfg:C,wq,wkv,wo,attn,ffn,norms,block,emb,total,kvTok,kvCtx,share:ffn/block,
    txt:{attn:M(attn),ffn:M(ffn),block:M(block),emb:M(emb),total:(total/1e9).toFixed(2)+'B',kvTok:kvTok/1024+' KiB',kvCtx:kvCtx/2**30+' GiB',share:Math.round(100*ffn/block)+'%'}};
  const T=window.LAM.txt;
  // geometry: one unit of depth is 4,096 numbers scaled to .9
  const U=.9/C.d,PH=.9,Y0=.3,QD=C.H*C.dh*U,KD=C.Hkv*C.dh*U,FD=C.ff*U,VD=2.6; // VD: the vocabulary tables, shortened from 28.2
  const XT=-6.35,XE=-5.45,XN1=-4.25,XQ=-3.6,XK=-3.2,XV=-2.85,XO=-2.3,XA1=-1.85,XN2=-1.3,XR=-.95,XG=-.6,XU=-.2,XD=.35,XA2=.85,XF=1.65,XW=2.35,XB=3.4,XX=4.3;
  const ZC=-.85,NB=12,BZ=i=>ZC-i*.15,EX=8,PICK=[2,5];
  const WORDS=['Once','upon','a','time'],PR=[.05,.09,.62,.13,.31,.07,.04,.18,.06,.03,.1,.05,.02,.08,.04];
  const SC=rgb('#d37295'); // the fixed state: a colour no other part uses
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  // label alpha: an outgoing label is gone a third of the way through a transition and an incoming one starts after it
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,3*e)):lerp(a,b,Math.max(0,2*e-1))};
  function lab(R,p,text,o){const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,text,o)}
  const plate=(R,x,d,o)=>R.glass([x,Y0,-d/2],[0,0,d],[0,PH,0],Object.assign({nu:Math.max(2,Math.round(d/.15)),nv:6},o));
  function frame(R,c,s,o){const x0=c[0]-s[0]/2,x1=c[0]+s[0]/2,y0=c[1],y1=c[1]+s[1],z0=c[2]-s[2]/2,z1=c[2]+s[2]/2;
    [[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y0,z0]],[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[x0,y1,z0]],[[x0,y0,z0],[x0,y1,z0]],[[x1,y0,z0],[x1,y1,z0]],[[x1,y0,z1],[x1,y1,z1]],[[x0,y0,z1],[x0,y1,z1]]]
      .forEach(pts=>R.line(pts,o))}
  function draw(R,k,e,st){const P=R.P;R.grid(-7,5,-2.6,2.2,.5);
    // focus: the parts a step is about at full strength, the rest recedes
    const fo=(on,rest)=>tw(st,e,s=>on.includes(s)?1:(rest==null?.22:rest));
    const L=(on)=>la(st,e,s=>on.includes(s)?1:0);
    const mono={mono:true,fs:12},ph=R.W<520; // on a phone the long labels shorten and the step list names the rest
    // the residual stream: one ribbon from the embedding to the final norm
    const ra=fo([1,6,7],.3);
    R.box([lerp(XE+.3,XF,.5),.06,0],[XF-XE-.3,.06,.6],{fill:mix(P.paper,P.c1,.35),a:ra,shadow:false});
    if(k===1||k===6||k===7)[-.15,.15].forEach(z=>R.flow([[XE+.35,.13,z],[XF-.05,.13,z]],{c:P.c1,a:.55,r:.045,speed:1.5}));
    // 1. tokens and the embedding table
    const a0=fo([0,7]);
    WORDS.forEach((w,i)=>{const z=-.66+i*.44;R.box([XT,0,z],[.42,.1,.34],{fill:P.paper,a:a0});lab(R,[XT,.1,z+.17],w,{serif:true,fs:13,dy:11,b:1,a:L([0])})});
    plate(R,XE,VD,{c:P.c1,a:a0,nu:14});
    if(k===0)WORDS.forEach((w,i)=>R.flow([[XT,.12,-.66+i*.44],[XE,.5+.15*i,-.9+.6*i],[XE+.4,.13,(i-1.5)*.2]],{c:P.c1,a:e*.9,r:.05,n:6}));
    lab(R,[XE,Y0+PH,0],'embedding '+n0(C.V)+' × '+n0(C.d)+' = '+T.emb,{...mono,b:1,c:P.c1,dy:-10,a:L([0])});
    lab(R,[XE,Y0,VD/2],'drawn shortened: '+Math.round(C.V*U/VD)+' times deeper in full',{...mono,c:P.mute,dy:16,a:L([0]),wide:1});
    lab(R,[XT,.1,-.95],'→ Tokenizers',{...mono,b:1,c:P.acc,dy:-14,a:L([0])});
    // 2. the two norms and the stream's branches
    const an=fo([1]);
    [XN1,XN2].forEach(x=>plate(R,x,.07,{c:P.c5,a:an,nu:1,nv:6,th:.03}));
    if(k===1){[[XN1,XO,XA1],[XN2,XD,XA2]].forEach(([x0,x1,xa])=>{R.flowArc([x0-.45,.13,.25],[x0,Y0+PH*.6,.25],.25,{c:P.c1,a:e,r:.05,n:5});R.flowArc([x1+.1,Y0+PH*.4,-.25],[xa,.13,-.25],.25,{c:P.c1,a:e,r:.05,n:5})});
      [XA1,XA2].forEach(x=>R.ball([x,.2,0],.09,{c:P.c1,a:e}))}
    lab(R,[XN1,Y0+PH,0],'RMSNorm: 4,096 gains',{...mono,b:1,c:P.c5,dy:-10,a:L([1])});
    lab(R,[XN2,Y0+PH,0],'RMSNorm',{...mono,c:P.c5,dy:-10,a:L([1]),wide:1});
    lab(R,[XE+.5,.12,.3],'residual stream: 4,096 numbers per position',{...mono,b:1,c:P.c1,al:'left',dy:22,a:L([1])});
    lab(R,[XA2,.3,0],'add back',{...mono,c:P.c1,dy:-14,a:L([1]),wide:1});
    lab(R,[XN1,1.95,0],'→ Normalisation, residuals and stability',{...mono,b:1,c:P.acc,al:'left',dx:-20,dy:-10,a:L([1])});
    // 3. attention: Q, K, V, O to scale, RoPE on Q and K
    const aa=fo([2,3,4]),ao=fo([2]);
    plate(R,XQ,QD,{c:P.q,a:aa});plate(R,XK,KD,{c:P.k,a:aa,nu:2});plate(R,XV,KD,{c:P.v,a:aa,nu:2});plate(R,XO,QD,{c:P.ink,a:ao*.8});
    if(k===2){const s=Y0+PH*.62;R.flowArc([XN1,s,0],[XQ,s,0],.2,{c:P.q,a:e,r:.05,n:5});R.flowArc([XN1,s,.06],[XK,s,0],.3,{c:P.k,a:e,r:.05,n:6});R.flowArc([XN1,s,-.06],[XV,s,0],.4,{c:P.v,a:e,r:.05,n:7});
      R.flow([[XV,s,0],[XO,s,0]],{c:P.v,a:e,r:.055,n:4});R.flowArc([XO,Y0+PH*.3,0],[XA1,.13,0],.15,{c:P.c1,a:e,r:.05,n:4});
      // RoPE: a dial over Q and K, turned by the position
      [XQ,XK].forEach(x=>{const c=[x,Y0+PH+.28],pts=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI*2;pts.push([x,c[1]+.14*Math.sin(t),.14*Math.cos(t)])}
        R.line(pts,{c:P.c5,w:1.4,a:e});const t=e*Math.PI*1.2;R.line([[x,c[1],0],[x,c[1]+.14*Math.sin(t),.14*Math.cos(t)]],{c:P.c5,w:2,a:e})})}
    lab(R,[XQ,Y0+PH*.5,-QD/2],'Wq 4,096 × 4,096',{...mono,c:P.q,b:1,al:'right',dx:-8,a:L([2]),wide:1});
    lab(R,[XK,Y0,KD/2],'Wk, Wv 4,096 × 1,024 (8 KV heads)',{...mono,c:P.k,b:1,dy:18,a:L([2]),wide:1});
    lab(R,[XO,Y0+PH,QD/2],'Wo',{...mono,b:1,al:'left',dx:6,a:L([2]),wide:1});
    lab(R,[XK,Y0+PH+.45,0],'RoPE turns Q and K by position',{...mono,c:P.c5,b:1,dy:-6,al:'left',dx:10,a:L([2]),wide:1});
    lab(R,[(XQ+XO)/2,2.05,0],'attention: '+T.attn+' weights',{...mono,b:1,dy:10,a:L([2])});
    lab(R,[(XQ+XO)/2,2.05,0],ph?'→ Attention variants':'→ Attention variants · Positional Encodings',{...mono,b:1,c:P.acc,dy:-12,a:L([2])});
    // 4. the KV cache: one brick per past token (12 drawn), growing; every decode step reads them all
    const ca=tw(st,e,s=>s===3?1:s===4?.13:s===7?.3:s>4?.22:0),nb=k===3?Math.max(1,Math.round(lerp(1,NB,Math.min(1,e*1.25)))):NB;
    if(ca>.01)for(let i=0;i<nb;i++){R.box([(XK+XV)/2,0,BZ(i)],[.5,.09,.12],{fill:mix(P.paper,P.k,.6),a:ca});R.box([(XK+XV)/2,.09,BZ(i)],[.5,.09,.12],{fill:mix(P.paper,P.v,.55),a:ca,shadow:false})}
    if(k===3){const top=[(XK+XV)/2,.2,BZ(nb-1)];R.flowArc([XK,Y0+.1,-KD/2],top,.3,{c:P.k,a:.9,r:.05,n:5});R.flowArc([XV,Y0+.1,-KD/2],top,.35,{c:P.v,a:.9,r:.05,n:5});
      for(let i=0;i<nb;i+=2)R.flowArc([(XK+XV)/2,.2,BZ(i)],[XQ,Y0+.3,-QD/4],.3+.04*i,{c:P.q,a:.55*e,r:.04,n:4,speed:1.6})}
    lab(R,[(XK+XV)/2,.18,BZ(NB-1)],'one brick per past token (12 drawn)',{...mono,dy:-14,al:'left',dx:14,a:L([3]),wide:1});
    lab(R,[(XK+XV)/2,0,BZ(5)],T.kvTok+' per token'+(ph?'':' · '+T.kvCtx+' at 128K'),{...mono,b:1,c:P.k,al:'left',dx:24,dy:18,a:L([3])});
    lab(R,[XQ,Y0+PH,0],'→ Long context · Attention variants',{...mono,b:1,c:P.acc,dy:-40,a:L([3])});
    // 5. or a fixed state: the same size however long the context
    const sa=tw(st,e,s=>s===4?1:0);
    if(sa>.01){R.glass([(XK+XV)/2,.05,-1.0],[0,0,-1.0],[0,.9,0],{c:SC,a:sa,nu:6,nv:6});
      R.flowArc([XK,Y0+.2,-KD/2],[(XK+XV)/2,.7,-1.2],.25,{c:P.k,a:sa*.9,r:.05,n:5});R.flowArc([XV,Y0+.2,-KD/2],[(XK+XV)/2,.6,-1.4],.3,{c:P.v,a:sa*.9,r:.05,n:5});
      R.flowArc([(XK+XV)/2,.8,-1.5],[XQ,Y0+.4,-QD/4],.3,{c:SC,a:sa*.9,r:.05,n:5})}
    lab(R,[(XK+XV)/2,.95,-1.5],ph?'a fixed state, the same size at any length':'a fixed state: the same size at any length (size illustrative)',{...mono,b:1,c:SC,dy:-14,a:L([4])});
    lab(R,[XQ,Y0+PH,0],'→ Beyond attention',{...mono,b:1,c:P.acc,dy:-40,a:L([4])});
    // 6. the FFN to scale; MoE cuts it into experts and a router runs a few per token (8 and 2, illustrative)
    const af=fo([5]),gap=tw(st,e,s=>s===5?1:0),dim=tw(st,e,s=>s===5?.25:1);
    [XG,XU,XD].forEach(x=>{if(gap<.01){plate(R,x,FD,{c:P.c3,a:af,nu:16});return}
      for(let j=0;j<EX;j++){const w=FD/EX,z0=-FD/2+j*w+gap*.04;R.glass([x,Y0,z0],[0,0,w-gap*.08],[0,PH,0],{c:P.c3,a:af*(PICK.includes(j)?1:dim),nu:2,nv:6})}});
    const rt=tw(st,e,s=>s===5?1:0);
    if(rt>.01){plate(R,XR,.3,{c:P.c1,a:rt,nu:2,nv:3});
      PICK.forEach(j=>{const z=-FD/2+(j+.5)*FD/EX;R.flowArc([XR,Y0+PH*.5,0],[XG,Y0+PH*.5,z],.2,{c:P.c3,a:rt,r:.05,n:5});R.flow([[XG,Y0+PH*.5,z],[XD,Y0+PH*.5,z]],{c:P.c3,a:rt,r:.05,n:5});R.flowArc([XD,Y0+PH*.4,z],[XA2,.13,0],.2,{c:P.c1,a:rt,r:.05,n:4})})}
    lab(R,[XU,Y0+PH,-FD/2],(ph?'FFN ':'FFN 3 × 4,096 × 14,336 = ')+T.ffn+', '+T.share+' of the block',{...mono,b:1,c:P.c3,dy:-12,a:L([5])});
    lab(R,[XR,Y0,.15],'router',{...mono,c:P.c1,dy:16,a:L([5]),wide:1});
    lab(R,[XU,Y0,FD/2],'MoE: experts, a router picks a few (8 and 2 drawn)',{...mono,c:P.c3,dy:18,a:L([5]),wide:1});
    lab(R,[XU,Y0+PH,-FD/2],'→ Mixture of experts',{...mono,b:1,c:P.acc,dy:-34,a:L([5])});
    // 7. the block repeats: 32 of them on the same stream
    const fa=tw(st,e,s=>s===6?1:0),fc=(XN1-.35+XA2+.25)/2,fw=XA2+.25-(XN1-.35);
    if(fa>.01){frame(R,[fc,.01,0],[fw,1.55,FD+.3],{c:P.ink,w:1.2,a:fa*.9,dash:[5,4]});
      for(let i=1;i<C.L;i++){const x0=fc-fw/2+i*.03,x1=fc+fw/2+i*.03,y1=1.56+i*.012,z=-(FD+.3)/2-i*.07;R.line([[x0,.01,z],[x0,y1,z],[x1,y1,z],[x1,.01,z]],{c:P.mute,w:.8,a:fa*.3})}}
    lab(R,[fc,1.56,FD/2+.15],'× 32 blocks, '+T.block+' weights each',{...mono,b:1,dy:-34,a:L([6])});
    lab(R,[fc,1.56,FD/2+.15],'with the two vocabulary tables: '+T.total,{...mono,dy:-12,a:L([6])});
    lab(R,[fc,1.56,FD/2+.15],ph?'→ The transformer from zero':'→ The transformer from zero · LLM architecture gallery',{...mono,b:1,c:P.acc,dy:-56,a:L([6])});
    // 8. a distribution out: final norm, the unembedding, one probability per vocabulary entry
    const ad=fo([7],.3);
    plate(R,XF,.07,{c:P.c5,a:ad,nu:1,nv:6,th:.03});plate(R,XW,VD,{c:P.c1,a:ad,nu:14});
    PR.forEach((p,j)=>{const z=-1.05+j*.15,top=j===2;R.box([XB,0,z],[.12,Math.max(.02,p*1.5*(k===7?e:1)),.1],{fill:top?P.c1:P.paper,a:ad,shadow:false})});
    R.box([XX,0,0],[.42,.1,.34],{fill:P.paper,a:ad});
    if(k===7){R.flowArc([XF-.4,.13,0],[XF,Y0+PH*.5,0],.2,{c:P.c1,a:e,r:.05,n:4});R.flow([[XF,Y0+PH*.5,0],[XW,Y0+PH*.5,0]],{c:P.c1,a:e,r:.05,n:4});
      R.flowArc([XW,Y0+PH*.5,0],[XB,.95,-1.05+2*.15],.25,{c:P.c1,a:e,r:.05,n:5});R.flowArc([XB,.95,-1.05+2*.15],[XX,.12,0],.3,{c:P.c1,a:e,r:.06,n:5})}
    lab(R,[XW,Y0+PH,0],ph?'unembedding 4,096 × 128,256':'unembedding 4,096 × 128,256 (shortened)',{...mono,b:1,c:P.c1,dy:-12,a:L([7])});
    lab(R,[XB,0,1.15],'softmax: 128,256 probabilities (heights illustrative)',{...mono,dy:16,a:L([7]),wide:1});
    lab(R,[XX,.1,.17],'next token',{serif:true,fs:13,b:1,dy:12,a:L([7])});
    lab(R,[XB,.95,-1.2],'→ Families and objectives',{...mono,b:1,c:P.acc,dy:-30,a:L([7])});
  }
  const full={cam:[.55,.55],bounds:[[-6.7,0,-2.3],[4.6,1.7,1.9]]};
  S3.stage({id:'stg-map',list:'sx-map',fig:'Fig. 1 · the decoder in one screen, Llama 3.1 8B',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,8,16,8]:[34,18,22,18],
    view:k=>k===0?{cam:[.5,.45],bounds:[[-6.7,0,-1.6],[-4.6,1.4,1.6]]}:k===1?{cam:[.45,.55],bounds:[[-5.6,0,-1.6],[1.2,1.9,1.6]]}
      :k===2?{cam:[.6,.42],bounds:[[-4.5,0,-.8],[-1.7,2.15,.8]]}:k===3||k===4?{cam:[.8,.5],bounds:[[-4.1,0,-2.7],[-2,1.4,.6]]}
      :k===5?{cam:[.55,.5],bounds:[[-1.5,0,-1.8],[1.1,1.3,1.8]]}:k===6?{cam:[.5,.55],bounds:[[-4.8,0,-4.2],[2.2,1.7,1.9]]}:full});
})();

// ---- Scene: the paper's Figure 1 in 3D, run by this page's trained toy ViT on one image (renderer v2: glass plates, flowing dots, camera per step) ----
// The image is cut into 49 patches that lift off into a row of tokens; one patch goes through the patch-embedding matrix E (a glass plate);
// the class token and the position embeddings are added; the four layers' class-token attention stands as rows of bars; the head reads the class token.
// Every bar is a number from the shipped 64,000-image model (VS.data in 30_js_sc_lib.js).
(function(){
  if(!document.getElementById('stg-hero')||!window.VS)return;const {at,off,lerp,mix,cl}=S3;
  const XS=i=>-6+i*.245,TS=.2,ZR=1.4,ZI=-2.6,IS=2.1,CS=IS/7,IX=-IS/2,IT=2.25,ZL=l=>ZR-.95-l*1.0,ZH=2.9,BH=.85;
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  function draw(R,k,e){const P=R.P,T=VS.data(),f=T.f,xf=XS(f+1),img=T.img;R.grid(-7,7,-3.2,3.6,.5);
    // 1. the image, standing at the back (it leaves the scene once the tokens are made)
    const ia=k===0?1:k===1?1-.72*e:k===2?.28*(1-e):0;
    if(ia>0){R.box([0,.1,ZI-.05],[IS+.1,IS+.1,.05],{a:Math.min(1,ia*1.4)});VS.picGrid(R,img,[IX,IT,ZI],[IS,0,0],[0,-IS,0],ia,-.4)}
    if(k===0)R.label([0,.15,ZI+.1],'28 × 28 px · 784 numbers',{mono:true,fs:12.5,dy:16,c:P.mute});
    // 2. the 7 x 7 grid, then each patch lifts off into its slot in the row (raster order)
    if(k===1){const ga=Math.min(1,e*3)*(1-.6*cl(e*2-1,0,1));for(let i=1;i<7;i++){R.line([[IX+i*CS,IT,ZI+.02],[IX+i*CS,IT-IS,ZI+.02]],{c:P.acc,w:1.2,a:ga});R.line([[IX,IT-i*CS,ZI+.02],[IX+IS,IT-i*CS,ZI+.02]],{c:P.acc,w:1.2,a:ga})}}
    const ta=k===2?.3:k===3?.75:k===4?.45:k===5?.15:1;
    if(k>=1)for(let p=0;p<49;p++){const pr=Math.floor(p/7),pc=p%7,t=k===1?ease(cl(e*1.5-p/49*.5,0,1)):1,x=XS(p+1);
      const A=[IX+pc*CS,IT-pr*CS,ZI],B=[x-TS/2,.06+TS,ZR],s=lerp(CS,TS,t),q=[lerp(A[0],B[0],t),lerp(A[1],B[1],t)+Math.sin(Math.PI*t)*.7,lerp(A[2],B[2],t)];
      const a=p===f&&k>=2&&k<=3?1:ta;
      if(t>=1)R.box([x,.04,ZR-.04],[TS+.05,TS+.05,.03],{a:a*.9});
      VS.pic(R,img,q,[s,0,0],[0,-s,0],a,[pc*4,pr*4,4,4],-.01)}
    if(k===1||k===3){const a=k===1?cl(e*2-1,0,1):1;R.label([XS(1),0,ZR+.12],'1',{mono:true,fs:12,dy:14,c:P.mute,a,wide:k===3?1:0});if(k===1)R.label([XS(49),0,ZR+.12],'49',{mono:true,fs:12,dy:14,c:P.mute,a});
      if(k===1)R.label([XS(25),0,ZR+.12],'49 patches of 4 × 4 px, in raster order',{mono:true,fs:12,dy:32,c:P.mute,a,wide:1})}
    // 3. one patch through E: 16 pixel values, one shared 16 x 32 matrix, a token of 32 numbers
    const ea=k===2?Math.min(1,e*1.6):k===3?off(k,e,3):0,ZE=ZR-1.1,ZT=ZR-2.3;
    if(ea>0){VS.comb(R,[xf,.9,ZR],T.pix,1,null,ea,.42,.8);R.label([xf-.45,.9,ZR],'16 pixel values',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:ea});
      R.flow([[xf,.3,ZR],[xf,.82,ZR]],{c:P.ink,a:ea*.5,r:.04,n:3,speed:.6});
      R.glass([xf-.55,.5,ZE],[1.1,0,0],[0,1,0],{c:P.c1,a:ea,nu:4,nv:8});R.label([xf-.55,1.5,ZE],'E · 16 → 32',{al:'right',dx:-6,mono:true,fs:13,b:1,c:P.c1,a:ea});
      R.flow([[xf,1.15,ZR],[xf,1.0,ZE],[xf,1.15,ZT]],{c:P.c1,a:ea,r:.07,speed:1.1})}
    // the token: E's output (step 3), then its position embedding is added as it moves onto its slot (step 4): z0, real values
    const za=k===2?at(k,e,2):k===3?1:0;
    if(za>0){const t=k===3?e:0,v=T.E.map((x,i)=>lerp(x,T.z0f[i],t)),z=lerp(ZT,ZR,t),y=lerp(.9,.75,t);VS.comb(R,[xf,y,z],v,T.mE,k===3?mix(P.c1,P.c3,t):P.c1,za,.4,1.3);
      R.label([xf+.75,y,z],k===3?'patch '+(f+1)+': E x + its position':'token · 32 numbers',{al:'left',dx:6,mono:true,fs:12,b:1,c:k===3?P.c3:P.c1,a:za,wide:k===3?1:0})}
    // 4. the class token in slot 0, and a learned position embedding on every slot
    const ca=k<3?0:k===3?e:k===5?.3:1;
    if(ca>0){R.box([XS(0),.06,ZR],[TS,TS,.06],{fill:P.c4,a:ca});for(let i=0;i<50;i++)R.box([XS(i),.06+TS+.015,ZR],[TS,.05,.07],{fill:P.c3,a:ca*.85,shadow:false});
      R.label([XS(0),0,ZR+.12],'0',{mono:true,fs:12,dy:14,c:P.c4,b:1,a:ca})}
    if(k===3){VS.comb(R,[XS(0)+.4,.75,ZR],T.z0c,T.mE,P.c4,e,.4,1.3);R.label([XS(0)+.4,1.3,ZR],'class token · learned',{mono:true,fs:12,b:1,dy:-10,c:P.c4,a:e});
      R.label([(XS(0)+xf)/2,0,ZR+.12],'+ a learned position on every slot',{mono:true,fs:12,dy:32,c:P.c3,a:e,b:1})}
    // 5. four layers: the class token's attention to every patch, heads averaged; rows are layers, dots stream into the class token in proportion
    if(k>=4){T.att.forEach((A,l)=>{const z=ZL(l),ra=k===4?cl(e*4.4-l*1.05,0,1):.3*(1-e);if(ra<=0)return;
        R.glass([XS(0)-.2,.002,z-.22],[XS(49)-XS(0)+.4,0,0],[0,0,.44],{c:P.c4,a:ra*.5,nu:1,nv:1,th:.01,dz:3});
        A.v.forEach((w,p)=>R.box([XS(p+1),0,z],[.17,Math.max(.012,w/T.mA*BH),.26],{fill:P.c2,a:ra,shadow:false,lw:.5}));
        R.ball([XS(0),.18,z],.09,{c:P.c4,a:ra});
        if(k===4)R.label([XS(0)-.25,.1,z],'layer '+(l+1),{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:Math.max(.4,ra),grp:'rows'});
        if(k===4)A.v.map((w,p)=>[w,p]).sort((a,b)=>b[0]-a[0]).slice(0,6).forEach(([w,p])=>{const h=w/T.mA*BH;
          R.flowArc([XS(p+1),h+.03,z],[XS(0),.24,z],.25+.006*p,{c:P.c2,a:ra*(.3+.7*w/T.mA),r:.04+.03*w/T.mA,n:Math.max(3,Math.round(4+10*w/T.mA)),speed:2.2})})})}
    // 6. the head reads the class token's final state y = LN(z_4^0): 32 -> 5, then the probabilities
    if(k===5){const a=e;
      R.flowArc([XS(0),.3,ZR],[-5.3,.6,ZH],.15,{c:P.c4,a,r:.06});
      VS.comb(R,[-5.3,.45,ZH],T.y,T.mY,P.c4,a,.35,1.25);R.label([-5.3,.15,ZH+.15],'y = LN(z₄⁰)',{mono:true,fs:12,dy:16,b:1,c:P.c4,a});
      R.glass([-4.3,.1,ZH-.45],[0,0,.9],[0,.9,0],{c:P.c1,a,nu:5,nv:6});R.label([-4.3,1.05,ZH],'head · 32 → 5',{mono:true,fs:12.5,b:1,c:P.c1,a,dy:-8});
      R.flow([[-4.6,.55,ZH],[-4.0,.55,ZH]],{c:P.c1,a,r:.06,n:3});
      T.probs.forEach((p,j)=>{const x=-3.5+j*.72,h=Math.max(.02,p*1.2),best=j===T.pred;
        R.box([x,0,ZH],[.34,h,.34],{fill:best?P.c1:P.paper,a});if(best||R.W>=520)R.label([x,0,ZH+.2],VS.KIND[j],{mono:true,fs:12,dy:14,b:best,a,c:best?P.c1:P.ink});
        R.label([x,h,ZH],VS.pct(p),{mono:true,fs:12,dy:-10,b:best,a,c:best?P.c1:P.mute});
        if(p>.01)R.flow([[-4.0,.55,ZH],[x,h+.08,ZH]],{c:P.c1,a:a*(.25+.75*p),r:.04+.04*p,n:Math.max(2,Math.round(2+6*p)),speed:1.4})})}
  }
  function readout(){const T=VS.data(),el=document.getElementById('hr-pred');if(el)el.textContent='"'+VS.KIND[T.pred]+'" at '+VS.pct(T.probs[T.pred])+(T.pred===T.label?', which is right':', which is wrong');
    const fp=document.getElementById('hr-patch');if(fp)fp.textContent=String(T.f+1)}
  const full={cam:[.2,.5],bounds:[[-6.7,0,-2.8],[6.3,2.3,3.0]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the trained toy ViT on one image',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,16],
    view:k=>{const xf=XS(VS.data().f+1);return k===0?{cam:[.12,.3],bounds:[[-1.9,0,-2.9],[1.9,2.4,-2.2]]}
      :k===1?{cam:[.06,.3],bounds:[[-6.3,0,-2.8],[6.3,2.4,ZR+.3]]}
      :k===2?{cam:[.62,.32],bounds:[[xf-1.0,0,ZR-2.5],[xf+1.6,1.6,ZR+.4]]}
      :k===3?{cam:[.1,.36],bounds:[[-6.9,0,ZR-.4],[xf+2.6,1.4,ZR+.4]]}
      :k===4?{cam:[.14,.8],bounds:[[-7.3,0,-3.0],[6.3,1.0,ZR+.4]]}
      :{cam:[.1,.4],bounds:[[-6.3,0,2.0],[-.4,1.5,3.4]]}},
    onStep:()=>{try{readout()}catch(e){}}});
})();

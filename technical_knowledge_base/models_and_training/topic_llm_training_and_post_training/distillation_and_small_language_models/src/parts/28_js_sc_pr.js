// ---- Scene (Prune, then distil, Fig. 4): Llama 3.1 8B and its width- and depth-pruned 4B students, drawn to scale (renderer v2) ----
// Shapes from arXiv 2408.11796 (Llama-3.1-Minitron-4B-Width and -Depth); one slab per layer, its height the MLP width, its depth the hidden size;
// the glass plate in front of each stack is the untied input and output embeddings. Parameter counts derived as in the caption (norms ignored).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-pr')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const V=128256,QD=32*128,KVD=8*128;
  const M={t:{name:'Llama 3.1 8B',L:32,h:4096,m:14336},w:{name:'4B-Width',L:32,h:3072,m:9216},d:{name:'4B-Depth',L:16,h:4096,m:14336}};
  const params=c=>{const layer=2*c.h*QD+2*c.h*KVD+3*c.h*c.m;return {layer,emb:2*V*c.h,total:c.L*layer+2*V*c.h}};
  const B=x=>(x/1e9).toFixed(2)+'B';
  ['t','w','d'].forEach(k=>document.querySelectorAll('[data-pr="'+k+'"]').forEach(e=>e.textContent=B(params(M[k]).total)));
  // three stacks side by side; each layer is one slab (width the hidden size, height the MLP width), layer 1 at the front
  const XS={t:-2.7,w:0,d:2.7},Z=i=>2.1-i*.145,HS=1.8/14336,WS=1.6/4096,TH=.085;
  function stack(R,key,c,L,a,col){const P=R.P,x=XS[key],H=c.m*HS,W=c.h*WS;
    for(let i=L-1;i>=0;i--)R.box([x,0,Z(i)],[W,H,TH],{fill:col,a,lw:.6,shadow:i%8===0});
    R.glass([x-W/2,.02,Z(0)+.32],[W,0,0],[0,H*.55,0],{c:P.c4,a:a*.9,nu:5,nv:3})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-3,3.2,.5);
    const T=M.t,ta=k===0?Math.min(1,e*1.4):k===1||k===4?1:.45,teal=mix(P.paper,P.c6,.55),H=T.m*HS;
    stack(R,'t',T,32,ta,teal);
    R.label([XS.t,0,Z(0)+.4],'teacher · '+B(params(T).total),{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:Math.max(.6,ta)});
    if(k===0){R.label([XS.t-T.h*WS/2,H*.25,Z(0)+.32],'embeddings '+B(params(T).emb),{al:'right',dx:-8,mono:true,fs:12,c:P.c4,a:e,wide:1});
      R.label([XS.t+T.h*WS/2,H,Z(31)],'32 layers',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.ink,a:e});
      R.label([XS.t-T.h*WS/2,H,Z(0)],'height: MLP 14,336',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:e,wide:1});R.label([XS.t,0,Z(0)+.4],'width: hidden 4,096',{mono:true,fs:12,dy:30,c:P.mute,a:e,wide:1})}
    // 1. calibration samples flow through every layer while each part is scored
    if(k===1){[-.45,0,.45].forEach((dx,j)=>R.flow([[XS.t+dx,.45+.45*j,Z(0)+.9],[XS.t+dx,.45+.45*j,Z(31)-.5]],{c:P.c5,a:Math.min(1,e*1.5),r:.06,n:12,speed:1.6,top:1}));
      R.label([XS.t+T.h*WS/2,0,Z(12)],'1,024 calibration samples',{al:'left',dx:10,mono:true,fs:12.5,b:1,c:P.c5,a:e,wide:1})}
    // 2. width pruning: every layer shrinks at once
    if(k>=2){const t=k===2?e:1,c={h:lerp(T.h,M.w.h,t),m:lerp(T.m,M.w.m,t)},wa=k===3?.45:1,blue=mix(P.paper,P.c1,.6);
      stack(R,'w',c,32,wa,blue);
      R.label([XS.w,0,Z(0)+.4],'4B-Width · '+B(params({L:32,h:Math.round(c.h),m:Math.round(c.m)}).total),{mono:true,fs:12.5,b:1,dy:14,c:P.c1,a:Math.max(.6,wa)});
      if(k===2)R.label([XS.w,0,Z(0)+.4],'hidden 3,072 · MLP 9,216',{mono:true,fs:12,dy:30,c:P.c1,a:e})}
    // 3. depth pruning: half the layers, every width kept; the dashed outline is the teacher's length
    if(k>=3){const da=k===3?Math.min(1,e*1.4):1,org=mix(P.paper,P.c2,.6),x=XS.d,W=T.h*WS;
      R.quad([[x-W/2-.05,.003,Z(0)+.1],[x+W/2+.05,.003,Z(0)+.1],[x+W/2+.05,.003,Z(31)-.1],[x-W/2-.05,.003,Z(31)-.1]],{ec:P.mute,ea:.85*da,dash:[5,4],lw:1.2});
      stack(R,'d',T,16,da,org);
      R.label([x,0,Z(0)+.4],'4B-Depth · '+B(params(M.d).total),{mono:true,fs:12.5,b:1,dy:14,c:P.c2,a:da});}
    // 4. healing: the teacher's logits stream into both students for the same 94B tokens
    if(k===4){const tp=[XS.t,H+.05,Z(31)];
      R.flowArc(tp,[XS.w,M.w.m*HS+.05,Z(31)],.7,{c:P.c1,a:e,r:.07,n:12,speed:1.3});R.flowArc(tp,[XS.d,H+.05,Z(15)],1.0,{c:P.c2,a:e,r:.07,n:16,speed:1.3});
      R.label([0,H+1.05,Z(31)],'teacher logits, forward KL · 94B tokens',{mono:true,fs:12.5,b:1,c:P.ink,a:e,wide:1});
      R.label([XS.w,0,Z(0)+.4],'width won (Table 1)',{mono:true,fs:12.5,b:1,dy:32,c:P.good,a:e,wide:1})}
  }
  const full={cam:[.38,.5],bounds:[[-3.8,0,-2.8],[3.8,2.3,2.9]]};
  S3.stage({id:'stg-pr',list:'sx-pr',fig:'Fig. 4 · Llama 3.1 8B pruned two ways, to scale',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,10,34,10]:[22,30,40,30],
    view:k=>k<=1?{cam:[.45,.42],bounds:[[-4.2,0,-2.8],[-1.2,2.2,2.9]]}:full});
})();

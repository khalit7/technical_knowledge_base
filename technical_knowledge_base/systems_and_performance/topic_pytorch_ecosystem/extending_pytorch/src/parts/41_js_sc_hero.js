// ---- Scene, Fig. 1 (2026-11-12, renderer v2): one call to ext::gelu2 going down the dispatcher's keys, as stacked glass plates.
// The kernels at the bottom and the filled Autograd slot come from the operator's recorded table (window.EXT.mps.dispatch_lines,
// torch._C._dispatch_dump of ext::gelu2 in src/exp/op_extras.py): CPU, MPS, Meta, Autograd[alias]. The key order is the dispatcher's,
// simplified to the keys an extension plugs into. The (8, 64, 1024) shape is the activation the page's runs used. Steps: #sx-hero. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.EXT)return;const {at,off,lerp,mix}=S3,E=window.EXT;
  const reg={};(E.mps.dispatch_lines||[]).forEach(l=>{const m=/^([A-Za-z]+)(\[alias\])?: registered/.exec(l);if(m)reg[m[1]]=1});
  // the four plates, top to bottom: [name, short API, kind (hook | fact), y, step that is about it, filled for ext::gelu2]
  const KEYS=[['Python API','__torch_function__','hook',3.9,1,false],
              ['Autograd','register_autograd','fact',3.0,2,!!reg.Autograd],
              ['ADInplaceOrView','mutates_args','fact',2.1,3,false],
              ['Python key','__torch_dispatch__','hook',1.2,4,false]];
  const KX={CPU:-1.45,MPS:0,Meta:1.45},KY=0,KB=[.95,.42,.95],W2=1.9,D2=.85,TOP=4.75;
  const kerns=['CPU','MPS','Meta'].filter(k=>reg[k]);
  function plate(R,y,c,a,dash){R.glass([-W2,y,-D2],[2*W2,0,0],[0,0,2*D2],{c,a,nu:6,nv:3,th:.04});
    if(dash)R.line([[-W2,y,-D2],[W2,y,-D2],[W2,y,D2],[-W2,y,D2],[-W2,y,-D2]],{c,w:1.2,dash:[5,4],a})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-3,3,-1.6,1.6,.5);
    // the plates: each step shows its own key at full strength and lets the others recede
    KEYS.forEach(([nm,api,kind,y,s,filled])=>{const cur=k===s,c=kind==='fact'?P.acc:P.c4;
      const a=k===0?.6:cur?1:k>s?.28:.2;plate(R,y,c,a*(cur?1:.8),kind==='fact'&&!filled);
      // side labels; on the kernel steps the camera is close on the floor and the plates' labels give way
      const la=k>=5?0:Math.max(.45,a);
      R.label([-W2,y,0],nm,{al:'right',dx:-10,mono:true,fs:12.5,b:cur,c:cur?c:P.ink,a:la,wide:1});
      R.label([W2,y,0],api,{al:'left',dx:10,mono:true,fs:12.5,b:cur,c:cur?c:P.mute,a:la,wide:1});
      if(cur&&narrow)R.label([0,y+.32,0],nm+' · '+api,{mono:true,fs:12,b:1,c})});
    // what the slot means, as a second line under the API on the right, while it is the step
    const NOTE={1:[3.9,'sees what you called',P.c4],2:[3.0,'fact 2: the gradient',P.acc],3:[2.1,'fact 3: what it writes (nothing)',P.acc],4:[1.2,'sees ATen ops: subclasses, modes',P.c4]};
    if(NOTE[k])R.label([W2,NOTE[k][0],0],NOTE[k][1],{al:'left',dx:10,dy:17,fs:12.5,b:1,c:NOTE[k][2],a:e,wide:1});
    // the kernels on the floor: CPU (C++), MPS (Metal), Meta (the fake)
    kerns.forEach(nm=>{const x=KX[nm],fake=nm==='Meta',on=fake?k===6:k===5,a=k===0?.7:on?1:k<5?.35:.3;
      const fill=fake?P.paper:nm==='CPU'?mix(P.paper,P.c1,.45):mix(P.paper,P.c3,.45);
      R.box([x,KY,0],KB,{fill,a,fa:fake?.25:1});
      // the Meta kernel's labels move to its left on the fake step, where its output stands in front of it
      if(fake&&on&&!narrow){R.label([x-KB[0]/2,KB[1]/2,0],nm,{mono:true,fs:12.5,b:1,al:'right',dx:-8,dy:-8,c:P.acc});R.label([x-KB[0]/2,KB[1]/2,0],'register_fake',{mono:true,fs:12,al:'right',dx:-8,dy:8,c:P.acc});return}
      R.label([x,KY,D2-.3],nm,{mono:true,fs:12.5,b:on,dy:14,c:on?(fake?P.acc:P.ink):P.mute,a:Math.max(.5,a)});
      const sub=fake?'register_fake':nm==='CPU'?'C++ kernel':'Metal kernel';
      if(on)R.label([x,KY,D2-.3],sub,{mono:true,fs:12,dy:31,c:fake?P.acc:P.ink,wide:1})});
    // the call: a ball that goes down the keys, step by step, with dots streaming along the path it has taken
    const ys=[TOP,3.9,3.0,2.1,1.2],yAt=j=>ys[Math.min(j,4)];
    if(k<=4){const y0=k===0?TOP:yAt(k-1),y1=yAt(k),y=lerp(y0,y1,k===0?1:e);
      R.ball([0,y+.12,0],.13,{c:P.c2,top:1});R.glow([0,y+.12,0],.4,{c:P.c2,a:.6,top:1});
      if(k>0)R.flow([[0,TOP,0],[0,y,0]],{c:P.c2,r:.06,speed:1.2,a:.75});
      if(k===0)R.label([0,TOP+.12,0],'ext::gelu2(x)',{mono:true,fs:13,b:1,c:P.c2,dx:16,al:'left'})}
    else{const real=k===5,tg=real?kerns.filter(n=>n!=='Meta'):['Meta'];
      R.flow([[0,TOP,0],[0,1.2,0]],{c:real?P.c2:P.acc,r:.06,speed:1.2,a:.5});
      tg.forEach(nm=>{const x=KX[nm];R.flowArc([0,1.2,0],[x,KY+KB[1]+.05,0],.25,{c:real?P.c2:P.acc,r:.065,n:8,speed:1.3,a:Math.min(1,e*1.5)})});
      if(!real){// the fake's output: a shape with no data, drawn as an empty outline beside the Meta kernel
        const ox=KX.Meta+.35,oz=1.6,a=Math.max(0,e*1.4-.4);
        R.box([ox,0,oz],[.7,.55,.7],{fill:P.paper,fa:.06,a,ec:P.acc,lw:1.3,shadow:false});
        R.flowArc([KX.Meta,.3,.5],[ox,.3,oz-.36],.25,{c:P.acc,r:.05,n:5,speed:1,a});
        R.label([ox+.36,.3,oz],'output (8, 64, 1024)',{mono:true,fs:12,b:1,c:P.acc,al:'left',dx:10,dy:-8,a,wide:1});R.label([ox+.36,.3,oz],'no data',{mono:true,fs:12,c:P.acc,al:'left',dx:10,dy:7,a,wide:1});
        if(narrow)R.label([KX.Meta,KY+KB[1],0],'fake: shape only',{mono:true,fs:12,b:1,c:P.acc,dy:-14,a})}
    }
  }
  const full={cam:[.42,.42],bounds:[[-2.3,0,-1.1],[2.3,4.9,1.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one call down the keys',cam:full.cam,bounds:full.bounds,aspect:.74,dur:1300,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,170,14,150],
    // the last two steps move in close on the kernels at the bottom
    view:k=>k>=5?{cam:[.5,.55],bounds:[[-2.0,0,-1],[2.2,1.2,2.0]]}:full});
})();

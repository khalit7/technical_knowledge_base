// ---- Scene: a borrow's lifetime has to rest on the values it borrows (section 1; renderer v2) ----
// Driven by LSP_DATA.life (written by ra/gen.py): the line numbers of life_err2.rs and life.rs, the four points rustc's E0597 names,
// and life.rs's printed line. x is the statement line; each value is a slab from its declaration to the end of its scope, an inner
// scope's value stacked on the outer one, and the borrow w on top of what it borrows. The stacking is a picture of "must fit inside",
// not of memory layout.
(function(){
  if(!document.getElementById('stg-life')||!window.LSP_DATA)return;const {at,off,cl,mix,lerp}=S3;
  const L=LSP_DATA.life,E=L.err,K=L.ok;
  const X=(p,line)=>{const i=line===p.end?7:line-p.a;return -3.5+i};   // one unit per line; the last line of main sits at slot 7
  const H=.52,D=.9,Y=[0,H,2*H];                                         // slab height and depth; layer bottoms: a, b, w
  function slab(R,x0,x1,layer,o){if(x1-x0<.02)return;R.box([(x0+x1)/2,Y[layer],0],[x1-x0,H,D-layer*.12],{fill:o.fill,a:o.a,lw:.9,shadow:layer===0})}
  function ruler(R,p,a,c){const P=R.P;for(let l=p.a;l<=p.a+6;l++)R.label([X(p,l),0,D/2+.35],String(l),{mono:true,fs:12,c:c||P.mute,a});
    R.label([X(p,p.end),0,D/2+.35],String(p.end),{mono:true,fs:12,c:c||P.mute,a});R.label([X(p,p.a)-.55,0,D/2+.35],'line',{mono:true,fs:12,al:'right',c:P.mute,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2,2.2,.5);
    const fix=k===5?e:0,okA=k===5?e:0,errA=1-okA;                           // step 6 morphs the failing program into the working one
    const sp=(f)=>({a:lerp(X(E,E.a),X(K,K.a),f),end:lerp(X(E,E.end),X(K,K.end),f),b:lerp(X(E,E.b),X(K,K.b),f),bend:lerp(X(E,E.bend),X(K,K.bend),f),call:lerp(X(E,E.call),X(K,K.call),f),use:lerp(X(E,E.use),X(K,K.use),f)});
    const S=sp(fix),valA=mix(P.paper,P.c3,.5),valB=mix(P.paper,P.c3,.32);
    ruler(R,E,errA*.95);if(okA>.01)ruler(R,K,okA*.95,P.ink);
    // 1. a, the outer value
    slab(R,S.a,S.end,0,{fill:valA,a:1});R.label([S.a-.05,H/2,D/2],'a: String "tokens"',{mono:true,fs:12.5,b:1,al:'right',dx:-8,c:mix(P.ink,P.c3,.5),grp:'val'});
    // 2. b, declared in the inner block: stacked on a, from its line to the closing brace
    const bA=at(k,e,1);
    if(bA>.01){slab(R,S.b,lerp(S.b,S.bend,k===1?e:1),1,{fill:valB,a:bA});R.label([S.b-.05,H*1.5,D/2-.06],'b: String "logits!"',{mono:true,fs:12.5,b:1,al:'right',dx:-8,a:bA,c:mix(P.ink,P.c3,.5),grp:'val'})}
    // 3. the call borrows from both: dots run from a and b into w, which starts on top of b
    const wA=at(k,e,2);
    if(k===2){R.flowArc([S.a+.4,H,0],[S.call+.15,2*H+H,0],.9,{c:P.acc,r:.07,n:9,speed:1.3,a:Math.min(1,e*2)});R.flowArc([S.b+.25,2*H,0],[S.call+.15,2*H+H,0],.45,{c:P.acc,r:.07,n:6,speed:1.3,a:Math.min(1,e*2)})}
    // 4. 'a may reach only as far as both inputs: a glass plate over b, ending at b's closing brace
    const gA=k===3?e:k===4?.8:k===5?.8:0;
    if(gA>.01)R.glass([S.call,3*H+.02,-D/2+.18],[S.bend-S.call,0,0],[0,0,D-.36],{c:P.acc,a:gA,nu:3,nv:2});
    if(gA>.01&&k===3)R.label([S.bend,3*H,0],'’a ends where b is dropped (line '+E.pts.drop+')',{fs:12.5,b:1,c:P.acc,al:'left',dx:10,dy:-14,a:gA});
    if(k>=3){const dA=k===3?e:1;R.line([[S.bend,0,D/2+.1],[S.bend,3*H+.15,D/2+.1]],{c:P.bad,w:1.6,dash:[5,4],a:dA*errA});}
    // w, the borrow: from the call to its last use. Its supported part sits on b; the part past b's end overhangs (step 5)
    if(wA>.01){const end=k<4?lerp(S.call,Math.min(S.use,S.bend),k===2?e:1):k===4?lerp(Math.min(S.use,S.bend),S.use,e):S.use;
      const ok=Math.min(end,S.bend),fillW=mix(P.paper,P.acc,.55);
      slab(R,S.call,ok,2,{fill:fillW,a:wA});
      if(end>S.bend+.01){const sag=k===4?.12*e:.12*(1-fix);R.box([(S.bend+end)/2,Y[2]-sag,0],[end-S.bend,H,D-.24],{fill:mix(P.paper,P.bad,.6),a:wA,lw:1.1,shadow:false});
}
      R.label([S.call-.05,H*2.5,D/2-.12],'w: &’a str',{mono:true,fs:12.5,b:1,c:P.acc,al:'right',dx:-8,a:wA,grp:'val'})}
    // 5. the use after the block: rustc's error names the three points on the ruler
    if(k===4){const ea=cl(e*1.8-.6,0,1);[['borrowed',E.pts.borrow],['dropped',E.pts.drop],['used later',E.pts.use]].forEach(([t,l],i)=>R.label([X(E,l),0,D/2+.35],t,{fs:12.5,b:1,c:P.bad,dy:20,a:ea,wide:1}));
      R.label([X(E,E.use)-.6,3*H+.35,0],E.code.replace(/^error\[(E\d+)\]: /,'$1: '),{mono:true,fs:12.5,b:1,c:P.bad,al:'left',a:ea,wide:1});
      R.glow([X(E,E.use),3*H-.1,0],.35,{c:P.bad,a:ea})}
    // 6. life.rs: the use moved inside the block; w now rests entirely on b
    if(k===5){R.flowArc([S.use,3*H,0],[S.use+.9,3*H+.4,0],.15,{c:P.good,r:.06,n:5,speed:1,a:okA});R.label([S.use+.95,3*H+.4,0],'compiles: '+K.out,{mono:true,fs:12.5,b:1,c:P.good,al:'left',a:okA})}
  }
  const full={cam:[.1,.42],bounds:[[-3.9,0,-.45],[4.0,1.95,.95]]};
  S3.stage({id:'stg-life',list:'sx-life',fig:'life_err2.rs, then life.rs: the borrow rests on what it borrows',cam:full.cam,bounds:full.bounds,aspect:.36,dur:1500,hold:4600,draw,
    view:k=>k===4?{cam:[.2,.42],bounds:[[-3.2,0,-.45],[4.0,2.0,.95]]}:full,
    margin:w=>w<520?[16,10,34,10]:[18,24,40,170]});
})();

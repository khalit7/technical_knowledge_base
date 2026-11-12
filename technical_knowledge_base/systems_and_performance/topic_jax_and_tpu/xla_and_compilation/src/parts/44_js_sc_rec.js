// ---- Scene, Fig. 3 (section 10): what changes the cache key. Each step is one case of the Recompile detective (src/lab/recompile_lab.py,
// XPD.rec.sc: compilations counted through jax.monitoring) or the storm (XPD.rec.storm, 64 prefix lengths, exact shapes against buckets of 16).
// Front: the call, the jitted function's cache (one block per compiled executable) and the result; back: the slow path (trace, lower, compile).
// The mechanism of one hit and one miss is drawn on JAX core's Fig. 2; this figure is about which changes miss. ----
(function(){
  if(!document.getElementById('stg-rec')||!window.XPS||!window.XPD)return;const {at,lerp,lerp3,mix}=S3,{lab,legs,slot,tint}=XPS;
  const SC=k=>XPD.rec.sc.find(s=>s.key===k),cc=k=>SC(k).counts.compile,N=XPD.n;
  // per step: the case, the second call's label, what differs from the first call, hit or miss, executables after the case
  const CASES=[
    {k:'shape',call:'f(ones((32, 128)))',diff:'first call: nothing cached',hit:false,n:1},
    {k:'value',call:'f(x, 3.0) after f(x, 2.0)',diff:'same shapes and dtypes',hit:true,n:cc('value')},
    {k:'shape',call:'f(ones((31, 128)))',diff:'f32[31,128] is not f32[32,128]',hit:false,n:cc('shape')},
    {k:'weak',call:'f(x, float32(2.0)) after f(x, 2.0)',diff:'f32[] is not weak f32[]',hit:false,n:cc('weak')},
    {k:'static',call:'f(x, 3) after f(x, 2), n static',diff:'the static value is in the key',hit:false,n:cc('static')},
    {k:'lambda',call:'jit(lambda x: x * 2)(x), 3 times',diff:'a new function object each time',hit:false,n:cc('lambda')},
    {k:'closure',call:'f(x) after scale = 10.0',diff:'scale was baked in as 2.0',hit:true,n:cc('closure')},
    {k:'storm',call:'64 prefix lengths',diff:'',hit:false,n:N.storm_exact_compiles}];
  const CX=-4.2,KX=-.6,OX=3.4,ZF=1.2,ZB=-1.3,TX=-.6,SW=.62;
  const sx=(i,n)=>KX+(i-(n-1)/2)*(SW+.12);
  function exe(R,p,a,s){const P=R.P;s=s||1;R.box(p,[.5*s,.36*s,.5*s],{fill:tint(P,P.c3,.62),a,shadow:false})}
  function draw(R,k,e){const P=R.P,c=CASES[k];R.grid(-6,5.4,-2.6,2.6,.5);
    const storm=k===7,lam=k===5,front=storm?.25:1;
    // the call
    R.box([CX,0,ZF],[1.5,.5,.8],{fill:tint(P,P.acc,.22),a:front});
    lab(R,[CX,.5,ZF],c.call,{mono:true,fs:12,b:1,dy:-12,c:P.acc,a:front});
    // the slow path, at the back
    const missA=storm?.1:c.hit?.22:1;R.box([TX,0,ZB],[2.4,.62,.9],{fill:tint(P,P.c2,.3),a:missA});
    lab(R,[TX,.62,ZB],'trace, lower, compile',{fs:12.5,b:1,dy:-18,c:P.c2,a:Math.max(.4,missA)});
    // the result
    R.box([OX,0,ZF],[1.1,.34,.7],{fill:tint(P,P.c3,.22),a:front});
    lab(R,[OX,.34,ZF],k===6?'prints [2. 2.] again':'result',{mono:k===6,fs:12,dy:-11,c:k===6?P.bad:P.c3,b:k===6,a:front});
    if(!storm&&!lam){
      // the cache: slots for executables; those that exist before this case's last call, then the new one if it missed
      const n=Math.max(2,c.n),before=c.hit?c.n:c.n-1;
      R.box([KX,0,ZF],[n*(SW+.12)+.3,.12,1.0],{fill:mix(P.paper,P.ink,.06)});
      for(let i=0;i<n;i++){slot(R,[sx(i,n),.12,ZF],SW,.62,.8);if(i<before)exe(R,[sx(i,n),.12,ZF],1)}
      lab(R,[KX,0,ZF+.5],'cache · '+c.n+(c.n===1?' executable':' executables'),{fs:12.5,b:1,dy:16,c:P.ink});
      if(c.hit){const s=[sx(c.n-1,n),.3,ZF];R.flow(legs([[CX+.75,.3,ZF],[s[0]-.3,.3,ZF]]),{c:P.acc,r:.07,n:5,a:Math.min(1,e*1.6)});
        R.flow(legs([[s[0]+.3,.3,ZF],[OX-.55,.25,ZF]]),{c:P.c3,r:.07,n:5,a:Math.max(0,e*1.6-.5)});
        lab(R,[s[0],.5,ZF],k===6?'hit: the old constant runs':'hit',{fs:12.5,b:1,dy:-12,c:k===6?P.bad:P.good,a:e})}
      else{const s=[sx(c.n-1,n),.12,ZF],u=Math.max(0,e*1.7-.7);
        R.flowArc([CX,.5,ZF-.3],[TX-1.2,.4,ZB+.45],.4,{c:P.acc,r:.07,n:7,a:Math.min(1,e*1.6)});
        const p=lerp3([TX+1.2,.2,ZB],s,u);p[1]+=Math.sin(Math.PI*u)*.7;exe(R,p,Math.max(.2,Math.min(1,e*2)));
        if(u>=1)R.flow(legs([[s[0]+.3,.3,ZF],[OX-.55,.25,ZF]]),{c:P.c3,r:.07,n:5,a:1});
        lab(R,[s[0],.5,ZF],k===0?'miss':'miss: '+c.n+' compilations',{fs:12.5,b:1,dy:-14,c:P.bad,a:e})}
      if(c.diff)lab(R,[CX,0,ZF+.4],c.diff,{fs:12.5,dy:16,c:c.hit&&k!==6?P.good:P.bad,b:1,a:e,wide:1});
      if(k===6)lab(R,[TX,.2,ZB+.45],'jaxpr holds mul x 2.0',{mono:true,fs:12,dy:14,c:P.mute,a:e,wide:1})}
    if(lam){// three function objects, three caches with one executable each; each call takes the slow path
      [0,1,2].forEach(i=>{const z=ZF+.75-i*.75,t=Math.max(0,Math.min(1,e*2.4-i*.55));R.box([KX,0,z],[1.0,.1,.6],{fill:mix(P.paper,P.ink,.06),a:Math.max(.25,t)});
        if(t>0)exe(R,[KX,.1,z],t,.8);lab(R,[KX+.55,.1,z],'lambda #'+(i+1),{mono:true,fs:12,al:'left',dx:6,c:P.ink,a:Math.max(.3,t),grp:'lam'})});
      R.flowArc([CX,.5,ZF-.3],[TX-1.2,.62,ZB+.3],.5,{c:P.acc,r:.07,n:7,a:Math.min(1,e*1.6)});
      lab(R,[TX,.62,ZB],cc('lambda')+' calls, '+cc('lambda')+' compilations',{fs:12.5,b:1,dy:-38,c:P.bad,a:e})}
    if(storm){// one executable per prefix length against one per bucket of 16: the counts of the recorded storm
      const ne=N.storm_exact_compiles,nb=N.storm_bucket_compiles,cols=16,cell=.32,show=Math.round(lerp(0,ne,Math.min(1,e*1.3)));
      for(let i=0;i<ne;i++){const r=Math.floor(i/cols),cI=i%cols,p=[KX-(cols-1)/2*cell+cI*cell,0,ZF+.75-r*.34];if(i<show)exe(R,p,1,.5);else slot(R,p,.24,.24,.4)}
      lab(R,[KX+(cols/2)*cell+.2,0,ZF+.75],'exact shapes: '+ne+' executables',{fs:12.5,b:1,al:'left',dx:6,c:P.bad,grp:'st'});
      for(let i=0;i<nb;i++)exe(R,[KX-1.2+i*.8,0,-.95],Math.min(1,.3+e*1.4),1);
      lab(R,[KX+1.6,0,-.95],'padded to 16, 32, 48, 64: '+nb+' executables',{fs:12.5,b:1,al:'left',dx:6,c:P.good,grp:'st'})}
  }
  const full={cam:[.2,.62],bounds:[[-5.4,0,-2.0],[4.6,.9,2.0]]};
  const st=S3.stage({id:'stg-rec',list:'sx-rec',fig:'Fig. 3 · which changes reach the compiler',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,22,16],
    view:k=>k===7?{cam:[.12,.85],bounds:[[-4,0,-1.4],[4.2,.6,2.2]]}:full});
  (window.XPSTG=window.XPSTG||{})['stg-rec']=st;
})();

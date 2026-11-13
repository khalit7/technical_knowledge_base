// ---- Scene (Problem): the KV cache against a fixed state (renderer v2: towers to scale, flows for writes and reads, camera per step) ----
// Memory per sequence at 2.8B scale from the released configs (PAPER.rc.mem_28, recompute.py): Pythia-2.8B caches 320 KiB per token,
// Mamba-2.8B keeps 11.9 MiB of state and convolution buffer whatever the length. One slab of the left tower is one token's cache;
// the glass block on the right is the state, drawn to the same scale (38 slabs tall) until step 5 rescales both to 2,048 tokens.
(function(){
  if(!document.getElementById('stg-cache'))return;const {at,off,lerp,mix}=S3;
  const M=PAPER.rc.mem_28,KV=M.kv_per_token,ST=M.state_bytes,X=M.crossover_tokens,R2048=M.ratio_2048;
  const W=['The','cat','um','sat','on','uh','the','mat','and','um','purred','.'],FILL=new Set([2,5,9]),T=W.length;
  const TH=.055,HS=ST/KV*TH,XT=-1.7,XM=1.7,FW=1.15,TZ=2.3,tx=i=>(i-(T-1)/2)*.56,BIG=2.6;
  // how many tokens the cache holds at step k, progress e
  const nTok=(k,e)=>k===0?0:k===1?Math.min(T,Math.ceil(e*T-1e-9)):k===2?T:k===3?Math.round(lerp(T,X,e)):X;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.5,4.5,-2.5,3.2,.5);
    const n=nTok(k,e),cur=k===1?n-1:k===2?Math.min(T-1,Math.floor(e*T-1e-9)):-1;
    // the input tokens on the floor at the front
    const rowA=k>=3?.3:1;
    W.forEach((w,i)=>{const f=FILL.has(i),hot=i===cur,a=(k===0?e:1)*rowA*(hot?1:k===1||k===2?(i<=cur?.85:.45):1);
      R.box([tx(i),0,TZ],[.42,hot?.3:.2,.42],{fill:f?mix(P.paper,P.mute,.25):mix(P.paper,P.acc,.18),a});
      R.label([tx(i),.35,TZ+.2],w,{fs:12,serif:true,c:f?P.mute:P.ink,a:Math.max(.35,a),dy:12,wide:1})});
    // scale on steps 1 to 4: one slab per token; step 5 rescales to 2,048 tokens (both shapes to one scale)
    const s5=at(k,e,4),hT=lerp(n*TH,BIG,s5),hM=lerp(HS,BIG/R2048,s5),aT=k===2?.3:1,aM=k===1?.3:1;
    // Transformer: the KV cache, a tower of slabs, one per token (keys and values of all 32 layers)
    if(s5<.02){for(let i=0;i<n;i++){const fresh=(k===1&&i===n-1)||(k===3&&i>=n-1);R.box([XT,i*TH,0],[FW,TH*.92,FW],{fill:mix(P.paper,P.c2,fresh?.75:.5),a:aT,lw:.6,shadow:i===0})}}
    else R.box([XT,0,0],[FW,hT,FW],{fill:mix(P.paper,P.c2,.55),a:aT});
    if(k>=1)R.label([XT,hT+.05,0],nar?'cache '+fmtBytes((k>=4?2048:n)*KV):k>=4?'KV cache · '+fmtBytes(2048*KV):'KV cache · '+n+' token'+(n>1?'s':'')+' · '+fmtBytes(n*KV),{fs:12.5,b:1,c:P.c2,dy:-18,a:aT});
    // Mamba: the state, a fixed glass block, the same size from the first token
    R.box([XM,0,0],[FW,hM,FW],{fill:mix(P.paper,P.c1,.35),fa:.45,a:aM*(k===0?Math.max(.3,e):1),shadow:true});
    R.glass([XM-FW/2,hM+.001,FW/2],[FW,0,0],[0,0,-FW],{c:P.c1,a:aM*.7,nu:6,nv:6});
    R.label([XM,hM+.05,0],(nar?'state ':'Mamba state + conv buffer · ')+fmtBytes(ST),{fs:12.5,b:1,c:P.c1,dy:-18,a:aM*(k===0?e:1)});
    // step 1: the new token writes its key and value on top and reads every cached entry back
    if(k===1&&cur>=0){const top=[XT,n*TH+.05,0];R.flowArc([tx(cur),.3,TZ],top,.6,{c:P.c2,r:.06,n:6,speed:1.5});
      const out=[XT-1.25,n*TH+.45,-.6];for(let i=0;i<n;i+=Math.max(1,Math.floor(n/6)))R.flowArc([XT+FW/2,i*TH+TH/2,0],out,.25,{c:P.c2,a:.6,r:.045,n:3,speed:1.3});
      R.ball(out,.09,{c:P.c2});R.label(out,'reads '+n,{fs:12,mono:true,c:P.c2,al:'right',dx:-10})}
    // step 2: each token is folded into the state; fillers barely touch it (the paper's reading of a selective delta)
    if(k===2&&cur>=0){const f=FILL.has(cur);R.flowArc([tx(cur),.3,TZ],[XM,HS+.05,0],.6,{c:P.c1,r:.06,n:6,a:f?.18:1,speed:1.5});
      const out=[XM+1.25,HS+.45,-.6];R.flowArc([XM+FW/2,HS*.6,0],out,.25,{c:P.c1,r:.05,n:4,speed:1.3});R.ball(out,.09,{c:P.c1});R.label(out,'reads 1 state',{fs:12,mono:true,c:P.c1,al:'left',dx:10})}
    // step 4: the crossover, the cache reaches the state's height
    if(k===3){R.line([[XT-FW/2-.2,HS,-FW/2],[XM+FW/2+.2,HS,-FW/2]],{c:P.mute,w:1.2,dash:[5,4],a:e});
      if(e>.9)R.label([0,HS*.5,0],'equal at '+X+' tokens',{fs:12.5,mono:true,b:1})}
    // step 5: both rescaled to 2,048 tokens
    if(k>=4){R.label([0,BIG*.55,0],(R2048).toFixed(0)+'×',{fs:22,serif:true,b:1,a:s5});R.label([0,BIG*.55,0],'at 2,048 tokens',{fs:12,mono:true,c:P.mute,dy:20,a:s5})}
    if(k===5){R.label([XT,0,FW/2],'every token kept: exact recall',{fs:12,c:P.c2,dy:18,b:1});R.label([XM,0,FW/2],'compressed: what was dropped is gone',{fs:12,c:P.c1,dy:18,b:1})}
  }
  const cnt=document.getElementById('cacheCnt');
  function counters(k){if(!cnt)return;const t=k===0?0:k<=2?T:k===3?X:2048;
    cnt.innerHTML=stat('tokens seen',fmt(t))+stat('Transformer KV cache',fmtBytes(t*KV),'2 × 32 layers × 2,560 × 2 bytes per token')+stat('Mamba state',fmtBytes(ST),'constant')+stat('reads per new token',k===2?'1 state':fmt(Math.max(t,0))+' cached',k===2?'constant':'grows with length')}
  S3.stage({id:'stg-cache',list:'sx-cache',fig:'KV cache against a fixed state · 2.8B',cam:[.32,.42],bounds:[[-3.5,0,-1],[3.5,2.7,2.7]],aspect:.68,dur:2600,hold:4600,draw,
    view:k=>k===1?{cam:[.3,.42],bounds:[[-3.6,0,-1.3],[1.1,1.4,2.7]]}:k===2?{cam:[.45,.42],bounds:[[-1.7,0,-1.3],[3.6,2.4,2.7]]}:null,
    onStep:k=>{try{counters(k)}catch(e){}}});
})();

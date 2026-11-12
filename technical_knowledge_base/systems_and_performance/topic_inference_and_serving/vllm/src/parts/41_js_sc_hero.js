// ---- Scene, top (Fig. 1): one request through vLLM's processes (renderer v2). Schematic layout; the request is customer C of the recorded
// prefix-caching-on run (window.VLS.hero, from window.VL_STEP): its 104 token ids, the 2 cached blocks it shares with A and B, the blocks it is given,
// the 42 of 64 budget tokens of its first step, and the free queue when it finishes are the real engine's. Client, API server process,
// engine core process (busy loop, scheduler, KV cache manager and block pool) and the GPU worker with its model runner. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.VLS)return;const {at,off,lerp,mix,rgb}=S3;const H=VLS.hero,COL=VLS.COL;
  const XC=-7.7,XA=-5.0,XE=.5,XW=5.9,Y=.08;
  // the block pool: 30 blocks (block 0 the null block) in 6 columns x 5 rows on the engine core
  const PX0=1.05,PZ0=-.95,CS=.4,bx=id=>PX0+(id%6)*CS,bz=id=>PZ0+Math.floor(id/6)*CS,PXC=PX0+CS*2.5,PZF=PZ0+CS*4.6;
  const SX0=-2.05,SL=2.4,tw=SL/H.budget; // the token budget as a bar on the scheduler's plate, one unit per token
  const order=Object.keys(H.tok);
  function block(R,b,a,hl){const P=R.P,id=b.id,c=b.owner?rgb(COL[b.owner]):P.ink;
    const held=b.rc>0,h=held?.22:.05,fill=held?mix(P.paper,c,.55):b.hashed?mix(P.paper,P.k,.35):P.paper;
    R.box([bx(id),Y,bz(id)],[CS*.8,h,CS*.8],{fill,a,lw:hl?1.6:.6,ec:hl?P.acc:(b.hashed?P.k:null),shadow:false})}
  function draw(R,k,e){const P=R.P,last=k===6,full=k>=5;R.grid(-8.6,8.2,-2.4,2.4,.5);
    // labels: only the objects a step is about are named (a label of an object outside the view would be pinned to the canvas edge)
    const lab=(show,p,t,o)=>{if(show)R.label(p,t,Object.assign({fs:12.5},o||{}))};
    // client
    const ac=k===0||k===5||last?1:.3;R.box([XC,0,0],[.9,.55,.9],{fill:mix(P.paper,P.c2,.3),a:ac});lab(k===0||full,[XC,.55,0],'client',{dy:-12,b:1,wide:full});
    // API server process
    const aa=k===0||k===1||k===5||last?1:.3;R.box([XA,0,0],[3.0,Y,3.4],{fill:mix(P.paper,P.c2,.08),a:aa,lw:.8,shadow:false,dz:400});
    lab(k===1||full,[XA,0,-1.7],'API server process',{dy:-10,b:1,c:k===5?P.acc:P.ink,wide:full});
    R.box([XA,Y,-.75],[2.4,.42,.9],{fill:k===0?mix(P.paper,P.acc,.25):P.paper,a:k===0||last?1:aa*.8,ec:k===0?P.acc:null,lw:k===0?1.4:.8});
    lab(k===0,[XA,Y+.42,-.75],'API server: tokenize (chat template)',{dy:-10,b:1,c:P.acc});
    R.box([XA,Y,.85],[2.4,.42,.9],{fill:k===5?mix(P.paper,P.acc,.25):P.paper,a:k===5||last?1:aa*.8,ec:k===5?P.acc:null,lw:k===5?1.4:.8});
    lab(k===0,[XA,Y+.42,.85],'detokenize, stop strings',{dy:-10,fs:12,c:P.mute});
    if(k===0){R.flowArc([XC+.45,.35,0],[XA-1.2,.4,-.75],.5,{c:P.c2,r:.06,n:6,speed:1.4,a:e});
      lab(1,[XC+.2,0,.6],H.np+' token ids',{dy:18,b:1,c:P.acc,a:e})}
    // engine core process: the busy loop around the scheduler and the KV cache manager
    const ea=k>=1&&k<=4||last?1:.35;R.box([XE,0,0],[5.9,Y,4.0],{fill:mix(P.paper,P.c5,.1),a:ea,lw:.8,shadow:false,dz:400});
    lab(k===1||full,[XE,0,-2.0],'engine core process · busy loop',{dy:-10,b:1,c:k===1?P.acc:P.ink,wide:full});
    // scheduler: running requests as cubes; C waits first, then runs
    const sa=k===1||k===2||last?1:.3;R.box([-1.05,Y,-.75],[2.3,.36,1.3],{fill:k===2?mix(P.paper,P.acc,.15):P.paper,a:sa,ec:k===2?P.acc:null,lw:k===2?1.4:.8});
    lab(k===2,[-1.05,Y,-.1],'Scheduler',{dy:14,b:1});
    const runQ=k>=2?order:H.others,cube=(q,i,z,a)=>{R.box([-1.8+i*.42,Y+.36,z],[.32,.28,.32],{fill:mix(P.paper,rgb(COL[q]),.75),a,lw:.6});lab(k===1||k===2,[-1.8+i*.42,Y+.64,z],q,{dy:-8,fs:12,b:1,a})};
    runQ.forEach((q,i)=>cube(q,i,-1.05,sa*(k===5&&q==='C'?1-e:k>5&&q==='C'&&!last?0:1)));
    if(k===1)cube('C',0,-.4,e);
    lab(k===1||k===2,[-2.25,Y+.5,-1.05],'running',{al:'right',dx:-6,fs:12,c:P.mute,wide:1});lab(k===1,[-2.25,Y+.5,-.4],'waiting',{al:'right',dx:-6,fs:12,c:P.mute,a:e,wide:1});
    if(k===1){R.flowArc([XA+1.0,Y+.45,-.75],[-1.8,Y+.6,-.4],.9,{c:P.c2,r:.06,n:9,speed:1.5,a:e});lab(1,[(XA-1.8)/2,Y+.2,.5],'msgpack over ZeroMQ',{dy:16,b:1,c:P.c2,a:e})}
    // the token budget on the scheduler: A 1, B 1, C 40 of 64
    const ba=k===2||last?1:k>2&&k<5?.35:0;
    if(ba>0){R.box([SX0+SL/2,Y,.45],[SL,.05,.34],{fill:P.paper,a:ba,lw:.6,shadow:false});let x=SX0;
      order.forEach(q=>{const w=H.tok[q]*tw*(k===2?e:1);if(w>.001)R.box([x+w/2,Y+.05,.45],[Math.max(w,.04),.22,.3],{fill:mix(P.paper,rgb(COL[q]),.75),a:ba,lw:.5,shadow:false});x+=H.tok[q]*tw});
      lab(k===2,[SX0+SL/2,Y,.65],order.map(q=>q+' '+H.tok[q]).join(' · ')+'  =  '+H.used+' of '+H.budget+' tokens',{dy:16,b:1,c:P.acc,a:e});lab(k===2,[SX0,Y+.2,.45],'budget',{al:'right',dx:-8,fs:12,c:P.mute,wide:1})}
    // the block pool (KV cache manager)
    const pa=k===3||k===5||last?1:k===4?.6:.3,pool=k>=5?H.poolFin:H.poolAt.map(b=>k<3&&b.owner==='C'?{id:b.id,rc:0,hashed:false,owner:null}:k<3&&H.hitBlocks.includes(b.id)?Object.assign({},b,{rc:b.rc-1}):b);
    R.box([PXC,Y-.001,PZ0+CS*2],[CS*6+.12,.02,CS*5+.12],{fill:mix(P.paper,P.c1,.08),a:pa,lw:.6,shadow:false,dz:300});
    lab(k===3,[PXC,0,PZF],'KV cache manager · block pool',{dy:16,b:1,c:k===3?P.acc:P.ink});
    R.box([bx(0),Y,bz(0)],[CS*.8,.02,CS*.8],{fill:P.soft,a:pa*.6,lw:.5,shadow:false});
    pool.forEach(b=>block(R,b,pa,(k===3&&(H.newBlocks.includes(b.id)||H.hitBlocks.includes(b.id)))||(k===5&&H.freed.includes(b.id))));
    if(k===3){H.hitBlocks.forEach((id,i)=>lab(1,[bx(id),Y+.22,bz(id)],'×'+H.shared[i],{dy:-9,fs:12,b:1,c:P.good,a:e}));
      lab(1,[PX0-.25,Y+.1,bz(H.hitBlocks[0])],H.hit+' tokens found by hash',{al:'right',dx:-8,b:1,c:P.good,a:e});
      H.newBlocks.forEach(id=>R.flowArc([-.2,Y+.4,-.6],[bx(id),Y+.25,bz(id)],.45,{c:P.acc,r:.05,n:4,speed:1.2,a:e}));
      lab(1,[PX0+CS*5.5,Y+.1,bz(H.newBlocks[1])],'new: '+H.newBlocks.join(', '),{al:'left',dx:10,b:1,c:P.acc,a:e})}
    // the GPU worker: model runner and the layers as glass plates
    const wa=k===4||last?1:k===5?.5:.3;R.box([XW,0,0],[3.0,Y,3.4],{fill:mix(P.paper,P.c1,.1),a:wa,lw:.8,shadow:false,dz:400});
    lab(k===4||full,[XW,0,-1.7],'GPU worker · model runner',{dy:-10,b:1,c:k===4?P.acc:P.ink,wide:full});
    const LX=[5.0,5.6,6.2,6.8];LX.forEach(x=>R.glass([x,Y+.05,-.95],[0,0,1.9],[0,1.15,0],{c:P.c1,a:wa,nu:6,nv:5}));
    if(k===4){const pts=[[1.0,Y+.5,0]];for(let i=0;i<=20;i++)pts.push([4.4+i*.14,Y+.55+.04*Math.sin(i),0]);R.flow(pts,{c:P.acc,r:.065,n:Math.round(4+H.used/6),speed:1.6,a:e});
      lab(1,[XW,0,1.7],H.used+' tokens · one forward pass'+(R.W<520?'':' · 28 layers (4 drawn)'),{dy:16,b:1,c:P.acc,a:e});
      R.flowArc([7.0,Y+.6,.6],[bx(H.newBlocks[0]),Y+.3,bz(H.newBlocks[0])],1.1,{c:P.k,r:.045,n:6,speed:1.2,a:e*.8});
      lab(1,[bx(H.newBlocks[0]),Y+.3,bz(H.newBlocks[0])],'keys, values into the blocks',{dy:-34,fs:12,b:1,c:P.k,a:e})}
    // tokens stream back
    if(k===5){R.flowArc([7.0,Y+.5,.3],[-.2,Y+.5,-.6],.9,{c:P.c2,r:.055,n:8,speed:1.6,a:e});
      R.flowArc([-1.9,Y+.4,.2],[XA+1.1,Y+.45,.85],.7,{c:P.c2,r:.055,n:7,speed:1.6,a:e});R.flowArc([XA-1.2,Y+.4,.85],[XC+.45,.35,0],.5,{c:P.c2,r:.055,n:5,speed:1.6,a:e});
      lab(1,[XA,0,1.7],'one server-sent event per step',{dy:16,b:1,c:P.c2,a:e});
      lab(1,[PXC,0,PZF],'step '+(H.finish+1)+': block '+H.freed[1]+' to the front, '+H.freedHashed[0]+' kept as cache',{dy:16,b:1,c:P.k,a:e})}
    // where each knob acts, written under each part
    if(last){const kn=(p,ts,al)=>ts.forEach((t,i)=>lab(1,p,t,{mono:true,fs:12,b:1,c:P.acc,a:e,dy:16+i*16,al,dx:al==='right'?-4:al==='left'?4:0,wide:1}));
      kn([XA,0,1.7],['--api-server-count']);kn([.25,0,2.0],['scheduler: max_num_seqs','max_num_batched_tokens','max_loras'],'right');
      kn([.75,0,2.0],['pool: gpu_memory_utilization','enable_prefix_caching','block_size'],'left');kn([XW+.4,0,1.7],['-O level'])}
  }
  const full={cam:[-.55,.78],bounds:[[-8.2,0,-2.1],[7.5,.9,2.2]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one request through vLLM',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:5200,draw,
    view:k=>k===0?{cam:[-.25,.66],bounds:[[-8.3,0,-1.9],[-3.3,.9,1.9]]}:k===1?{cam:[-.18,.7],bounds:[[-6.6,0,-2.1],[.4,1.2,1.9]]}:k===2?{cam:[-.12,.72],bounds:[[-2.9,0,-1.7],[.6,.8,1.2]]}:
      k===3?{cam:[-.1,.8],bounds:[[-.6,0,-1.4],[3.8,.6,1.5]]}:k===4?{cam:[-.15,.66],bounds:[[.4,0,-2.0],[7.6,1.4,2.2]]}:full,
    margin:w=>w<520?[14,10,14,10]:[22,24,24,24]});
  (window.VLSTG=window.VLSTG||{})['stg-hero']=st;
})();

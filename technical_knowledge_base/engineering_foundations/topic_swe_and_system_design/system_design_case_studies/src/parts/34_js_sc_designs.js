// ---- The seven 3D build-ups: each design's parts by kind, its camera for the steps that need one, and its own layer of numbers ----
// Numbers drawn on the stages: EST_EXPECT (recompute.py, the estimate tables' defaults), EST.defaults (the inputs), MEAS (pg_measured.json).
// Dots drawn in a grid stand for many (followed accounts, follower timelines, seconds of a minute); the labels give the real counts.
(function(){
  if(!window.ARCH)return;
  const E=window.EST_EXPECT,F=RD.fmt,M=window.MEAS,I=d=>EST.defaults(d),{mix}=S3;
  const pc=x=>F(x*100,0)+'%';
  window.SC_NUM={}; // what each layer drew, read by src/check_stages.mjs
  // 1. URL shortener: the code space (6 against 7 characters), the cache's share, 18 TB
  ARCH.mount('url',{fig:'Fig. 2 · URL shortener, built step by step',aspect:.42,
    kinds:{cl:'cli',lb:'lb',app2:'multi',cache:'cache',ids:'cfg',sh:'shards',q:'queue'},
    view:k=>k===1||k===2?{cam:[.2,.6],bounds:[[-3.4,0,-2.2],[2.4,1.3,1.7]]}:undefined,
    layer(R,k,e,c){const P=R.P,{X,Z,lab}=c,x=X(2)-.9,z=Z(1)-.2;
      const sp6=Math.pow(62,6),sp7=Math.pow(62,7);SC_NUM.url={fill6:pc(E.url.fill6),fill7:pc(E.url.fill7),tb:F(E.url.tb,0),hit:pc(I('url').hit)};
      const plate=(a,fill,col,t1,t2)=>{if(a<=.01)return;R.glass([x-.85,.06,z],[1.7,0,0],[0,1.1,0],{c:col,a,nu:8,nv:5,th:.04});
        R.quad([[x-.85,.06,z-.01],[x+.85,.06,z-.01],[x+.85,.06+1.1*Math.max(.012,fill),z-.01],[x-.85,.06+1.1*Math.max(.012,fill),z-.01]],{fill:col,fa:.55,edge:false,a,dz:-.05});
        const la=c.win(a,.5,1);lab(R,[x,1.16,z],t1,{fs:12.5,b:1,c:col,dy:-10,a:la});if(R.W<520)lab(R,[x,1.16,z],t2,{fs:12,b:1,mono:1,c:col,dy:10,a:la});else lab(R,[x-.85,.06+1.1*fill,z],t2,{fs:12.5,b:1,mono:1,c:col,al:'right',dx:-8,a:la})};
      if(k===1)plate(c.win(e,0,.5),E.url.fill6,P.bad,'6 characters · '+F(sp6/1e9,1)+' billion codes',pc(E.url.fill6)+' used after 5 years');
      if(k===2){plate(1-e,E.url.fill6,P.bad,'6 characters · '+F(sp6/1e9,1)+' billion codes',pc(E.url.fill6)+' used after 5 years');plate(e,E.url.fill7,P.good,'7 characters · '+F(sp7/1e12,2)+' trillion codes',pc(E.url.fill7)+' used after 5 years')}
      if(k===3)plate(1-e,E.url.fill7,P.good,'7 characters · '+F(sp7/1e12,2)+' trillion codes','');
      if(k===4)lab(R,[X(3),.95,Z(0)],pc(I('url').hit)+' of redirects answered here',{fs:12,c:P.c5,b:1,dy:-44,a:c.win(e,.3,.8),wide:1});
      if(k===7)lab(R,[X(4),.56,Z(0)],F(E.url.tb,0)+' TB after 5 years',{fs:12.5,b:1,c:P.bad,dy:-44,a:c.win(e,.3,.8)})}});
  // 2. Rate limiter: 50 gateways each allowing the limit, then the measured race and the atomic fix
  ARCH.mount('rl',{fig:'Fig. 3 · rate limiter, built step by step',aspect:.46,
    kinds:{cl:'cli',rd:'store',rda:'store',rs:'shards',loc:'cfg',cfg:'cfg',ks:'cfg'},
    view:k=>k===3||k===4?{cam:[.18,.72],bounds:[[-1.8,0,-2.2],[3.4,1.4,1.9]]}:undefined,
    layer(R,k,e,c){const P=R.P,{X,Z,lab,byId}=c,iv=I('rl');
      SC_NUM.rl={gw:iv.gw,limit:iv.limit,local:F(E.rl.local),naive:M.race.naive.map(r=>r.admitted),atomic:M.race.atomic.map(r=>r.admitted),node:F(E.rl.node),ten:F(E.rl.ops*10)};
      if(k===1){const a=c.win(e,.1,.6);['g1','g2','g3'].forEach(g=>{const p=byId[g].p;lab(R,[p[0]+.6,.3,p[2]],iv.limit+' a second',{fs:12,b:1,mono:1,c:P.bad,al:'left',dx:6,a})});
        lab(R,[X(0),.5,Z(0)],iv.gw+' × '+iv.limit+' = '+F(E.rl.local)+' a second for one key',{fs:12.5,b:1,c:P.bad,dy:34,a})}
      // the race on one key, 32 clients at once, 3 runs (measured, PostgreSQL 16.2): bars against a glass plate at the limit
      if(k===3||k===4){const runs=k===3?M.race.naive:M.race.atomic,col=k===3?P.bad:P.good,x0=X(2)-.42,z0=Z(1)-.2,s=1.1/119,a=c.win(e,0,.5);
        runs.forEach((r,i)=>{const x=x0+i*.42,h=r.admitted*s*(k===3?e:1);R.box([x,0,z0],[.3,Math.max(.02,h),.3],{fill:mix(P.paper,col,.7),a,shadow:false});
          lab(R,[x,h,z0],String(r.admitted),{fs:12.5,b:1,mono:1,c:col,dy:-10,a})});
        R.glass([x0-.3,100*s,z0-.3],[1.44,0,0],[0,0,.6],{c:P.ink,a:a*.6,nu:4,nv:2,th:.01});
        lab(R,[x0+1.2,100*s,z0],'limit '+M.race.limit,{fs:12,mono:1,c:P.mute,al:'left',dx:6,a})}
      if(k===7)lab(R,[byId.rda.p[0],.56,byId.rda.p[2]],F(E.rl.ops*10)+' checks a second · one node planned at '+F(E.rl.node),{fs:12,b:1,c:P.bad,dy:-44,a:c.win(e,.3,.8)})}});
  // 3. Chat: polling, then one message fanned out once per gateway, presence heartbeats
  ARCH.mount('chat',{fig:'Fig. 4 · chat, built step by step',aspect:.46,
    kinds:{cl:'cli',gw:'multi',reg:'cfg',pres:'cache',wc:'shards',push:'queue'},
    view:k=>k===4?{cam:[.16,.8],bounds:[[-6.4,0,-2.2],[1.4,.8,1.7]]}:undefined,
    noFlow:(k,ed)=>k>=4&&((ed.a==='cl'&&ed.b==='gw')||(ed.a==='gw'&&ed.b==='cs')),
    layer(R,k,e,c){const P=R.P,{byId,lab,subPos,arcPts}=c,ph=subPos(byId.cl),gs=subPos(byId.gw),cs=[byId.cs.p[0],.3,byId.cs.p[2]];
      SC_NUM.chat={poll:F(E.chat.poll),send:F(E.chat.send),tbyr:F(E.chat.tbyr),pres:F(E.chat.pres)};
      if(k===1){R.flow(arcPts(R,ph[1],[byId.api.p[0],.3,byId.api.p[2]],.15,20,.05,.92),{c:P.bad,a:.9,r:.05,n:26,speed:2.2});
        lab(R,[byId.api.p[0],.55,byId.api.p[2]],F(E.chat.poll)+' polls a second',{fs:12.5,b:1,c:P.bad,dy:-44,a:c.win(e,.2,.7)})}
      if(k===3){const m=[byId.msg.p[0],.3,byId.msg.p[2]];R.flow(arcPts(R,ph[0],gs[0],.2,16,.05,.95),{c:P.c2,r:.07,n:4});R.flow(arcPts(R,gs[0],m,.2,16,.1,.9),{c:P.c2,r:.07,n:4})}
      // fan-out: one message from phone 1 through its gateway to the channel's server, then one copy to each gateway holding members, then to the phones
      if(k>=4){const a=k===4?c.win(e,0,.4):.9,col=P.c2;R.flow(arcPts(R,ph[0],gs[0],.2,16,.05,.95),{c:col,a,r:.07,n:4});R.flow(arcPts(R,gs[0],cs,.25,18,.08,.92),{c:col,a,r:.07,n:5});
        [1,2].forEach(i=>{R.flow(arcPts(R,cs,gs[i],.25,18,.08,.92),{c:col,a:k===4?c.win(e,.3,.7):.9,r:.07,n:5});R.flow(arcPts(R,gs[i],ph[i],.2,16,.05,.95),{c:col,a:k===4?c.win(e,.5,.9):.9,r:.07,n:4})});
        if(k===4)lab(R,cs,'one copy per gateway, not per member',{fs:12.5,b:1,c:col,dy:34,a:c.win(e,.5,.9),wide:1})}
      if(k===5)lab(R,[byId.db.p[0],.56,byId.db.p[2]],F(E.chat.tbyr)+' TB a year',{fs:12.5,b:1,c:P.bad,dy:-44,a:c.win(e,.3,.8)});
      if(k===7){ph.forEach(p=>R.flow(arcPts(R,p,gs[1],.18,16,.05,.95),{c:P.bad,a:.85,r:.045,n:10,speed:2}));
        lab(R,[byId.gw.p[0],.45,byId.gw.p[2]-.5],F(E.chat.pres)+' heartbeats a second',{fs:12.5,b:1,c:P.bad,dy:-44,a:c.win(e,.2,.7)})}}});
  // 4. News feed: fan-out on read (one read touches every followed account) against on write (one post into every follower's timeline), the celebrity, the RAM
  {const X=c=>(c-2)*2.5,AU=[],IN=[],BIG=[];
    for(let r=0;r<3;r++)for(let q=0;q<4;q++)AU.push([X(3)-.75+q*.5,0,-1.15-r*.7]);
    for(let r=0;r<4;r++)for(let q=0;q<5;q++)IN.push([X(2)-.8+q*.4,0,-1.0-r*.7]);
    for(let r=0;r<6;r++)for(let q=0;q<8;q++)BIG.push([X(2)-.875+q*.25,0,-.95-r*.5]);
    ARCH.mount('feed',{fig:'Fig. 5 · news feed, built step by step',aspect:.5,bounds:[[X(0)-1.3,0,-3.9],[X(4)+1.3,.6,1.7]],
      kinds:{cl:'cli',rc:'cache',rc2:'cache',fo:'queue',th:'cfg'},
      view:k=>k===1?{cam:[.18,.82],bounds:[[X(1)-1.6,0,-3.3],[X(3)+1.6,1,1.7]]}:k===3||k===5?{cam:[.14,.85],bounds:[[X(2)-1.6,0,-3.9],[X(4)+1.6,1,1.7]]}:undefined,
      noFlow:(k,ed)=>ed.a==='fo'&&k>=2,
      layer(R,k,e,c){const P=R.P,{byId,lab,arcPts,win}=c,iv=I('feed'),tl=b=>[byId[b].p[0],.3,byId[b].p[2]],fo=tl('fo');
        SC_NUM.feed={fol:iv.fol,onread:F(E.feed.onread),reads:F(iv.reads),deliv:F(E.feed.deliv),celeb:F(iv.celeb),ins:F(E.feed.celeb_ins),ram:F(E.feed.ram,2),users:F(iv.users)};
        // the authors' recent posts (12 drawn for the 75 followed accounts of the estimate)
        const auA=k<=1?1:k===2?1-e*.75:k===4?.6:.25;
        AU.forEach((p,i)=>{const celeb=i===5&&k>=4,col=celeb?P.c5:P.c6;R.box(p,[.34,.22,.34],{fill:mix(P.paper,col,celeb?.6:.3),a:celeb?1:auA,lw:.7})});
        if(k<=1){const a=k===0?.75:1;AU.forEach(p=>R.flow(arcPts(R,tl('tl'),[p[0],.22,p[2]],.55,18,.05,.95),{c:k===1?P.bad:P.acc,a,r:.05,n:3,speed:1.4}));
          if(k===1)lab(R,[X(3),.22,-2.75],iv.fol+' accounts a read × '+F(iv.reads)+' reads a second = '+F(E.feed.onread)+' lookups',{fs:12,b:1,c:P.bad,dy:-16,a:win(e,.3,.8),wide:1})}
        // the followers' timelines: 20 drawn; the celebrity's 48 stand for 31 million
        const big=k===3,grid=big?BIG:IN,ga=k<2?0:k===2?win(e,0,.4):1;
        grid.forEach((p,i)=>{let col=P.c5,a=ga;if(k===3||k===5)col=P.bad;if(k===6&&i%2)a=1-e*.85;if(k===2)col=P.good;
          R.box(p,big?[.18,.12,.3]:[.3,.12,.42],{fill:mix(P.paper,col,.45),a,lw:.6,shadow:false})});
        if(k>=2){const tgt=big?BIG.filter((_,i)=>i%2===0):IN.filter((_,i)=>k<6||i%2===0),col=big?P.bad:P.good,a=k===2?win(e,.2,.7):k===3?win(e,0,.4):.8;
          tgt.forEach(p=>R.flow(arcPts(R,fo,[p[0],.12,p[2]],.7,20,.04,.97),{c:col,a,r:big?.045:.05,n:big?3:2,speed:1.3}))}
        if(k===2)lab(R,[X(2.4),.12,-3.3],F(iv.posts)+' posts a second × '+iv.fol+' followers = '+F(E.feed.deliv)+' deliveries',{fs:12,b:1,c:P.good,dy:-16,a:win(e,.4,.9),wide:1});
        if(k===3)lab(R,[X(2.4),.12,-3.6],F(iv.celeb)+' followers × '+iv.rep+' copies = '+F(E.feed.celeb_ins)+' inserts for one post',{fs:12,b:1,c:P.bad,dy:-16,a:win(e,.3,.8),wide:1});
        if(k>=4&&k<=6){const cp=AU[5];R.flow(arcPts(R,[cp[0],.22,cp[2]],tl('tl3'),.7,20,.05,.95),{c:P.c5,a:k===4?win(e,.2,.7):.8,r:.06,n:4,speed:1.2});
          if(k===4)lab(R,[X(3),.22,-2.75],'celebrity post: stored once, merged at read',{fs:12,b:1,c:P.c5,dy:-16,a:win(e,.4,.9),wide:1})}
        if(k===5)lab(R,[X(2.4),.12,-3.3],F(iv.users)+' users × '+iv.cap+' ids × '+iv.eb+' B × '+iv.rep+' = '+F(E.feed.ram,2)+' TB of RAM',{fs:12,b:1,c:P.bad,dy:-16,a:win(e,.3,.8),wide:1});
        if(k===6)lab(R,[X(2.4),.12,-3.3],'inactive users\' timelines dropped (share drawn is illustrative)',{fs:12,c:P.mute,dy:-16,a:win(e,.3,.8),wide:1})}})}
  // 5. LLM gateway: one bill, the vendor outage and the fallback
  ARCH.mount('gw',{fig:'Fig. 6 · LLM gateway, built step by step',aspect:.46,
    kinds:{apps:'multi',gw2:'multi',keys:'cfg',bud:'store',pii:'cfg',va:'model',vb:'model',self:'model',ue:'queue'},
    layer(R,k,e,c){const P=R.P,{byId,lab}=c;SC_NUM.gw={cday:F(E.gw.cday)};
      if(k===1)lab(R,[byId.apps.p[0],.45,byId.apps.p[2]-.5],'$'+F(E.gw.cday)+' a day, one bill',{fs:12.5,b:1,c:P.bad,dy:-44,a:c.win(e,.3,.8)});
      if(k===5){const p=byId.va.p,a=c.win(e,0,.4);[[-1,1],[1,1]].forEach(([s])=>R.line([[p[0]-.25*s,.95,p[2]],[p[0]+.25*s,.45,p[2]]],{c:P.bad,w:3,a,top:1}))}}});
  // 6. RAG: the corpus as chunks and vectors, freshness
  ARCH.mount('rag',{fig:'Fig. 7 · RAG service, built step by step',aspect:.48,
    kinds:{src:'store',cron:'cfg',q:'queue',kw:'store',vec:'cache',bm:'store',acl:'cfg',llm:'model',ev:'cfg'},
    layer(R,k,e,c){const P=R.P,{byId,lab}=c;SC_NUM.rag={chunks:F(E.rag.chunks),vgb:F(E.rag.vgb,0),reemb:F(E.rag.reemb,0)};
      if(k===2)lab(R,[byId.vec.p[0],.95,byId.vec.p[2]],F(E.rag.chunks)+' chunks · '+F(E.rag.vgb,0)+' GB of vectors',{fs:12,b:1,c:P.good,dy:-44,a:c.win(e,.4,.9),wide:1});
      if(k===6)lab(R,[byId.q.p[0],.42,byId.q.p[2]],'about '+F(E.rag.reemb,0)+' chunks a second',{fs:12,b:1,c:P.good,dy:-44,a:c.win(e,.4,.9),wide:1})}});
  // 7. Job scheduler: the double run, then the top-of-hour burst as one second against a minute of jitter (60 bars, one per second)
  {const X=c=>(c-2)*2.5;
    ARCH.mount('job',{fig:'Fig. 8 · job scheduler, built step by step',aspect:.46,bounds:[[X(0)-1.3,0,-2.2],[X(4)+1.3,1.0,2.9]],
      kinds:{own:'cli',s2:'multi',s3:'multi',jit:'cfg',qu:'queue',w:'multi'},
      view:k=>k===7||k===8?{cam:[.18,.5],bounds:[[X(1)-.6,0,-1.6],[X(4)+.6,2.6,2.9]]}:undefined,
      layer(R,k,e,c){const P=R.P,{byId,lab,win}=c,iv=I('job');SC_NUM.job={burst:F(E.job.burst),spr:F(E.job.spr),spread:iv.spread};
        if(k===3)lab(R,[byId.s2.p[0],.45,byId.s2.p[2]-.5],'both start job 7',{fs:12.5,b:1,c:P.bad,dy:-44,a:win(e,.3,.8)});
        if(k===7||k===8){const n=iv.spread,x0=X(1.5)-.3,dx=4.0/n,z=2.25,hs=2.3/E.job.burst;
          for(let i=0;i<n;i++){let v=k===7?(i===0?E.job.burst:0):E.job.spr,v0=i===0?E.job.burst:0;const h=k===8?(v0+(v-v0)*e)*hs:v*hs*e;
            R.box([x0+i*dx,0,z],[dx*.72,Math.max(.012,h),.3],{fill:mix(P.paper,k===7||i===0&&e<.5?P.bad:P.good,.7),a:1,shadow:false,lw:.5})}
          R.line([[x0-.1,0,z+.25],[x0+n*dx,0,z+.25]],{c:P.mute,w:1,a:.6});
          lab(R,[x0,0,z+.3],'second 0',{fs:12,mono:1,c:P.mute,dy:14});lab(R,[x0+(n-1)*dx,0,z+.3],'second '+(n-1),{fs:12,mono:1,c:P.mute,dy:14});
          if(k===7)lab(R,[x0,E.job.burst*hs*e,z],F(E.job.burst)+' runs due in one second',{fs:12.5,b:1,c:P.bad,al:'left',dx:10,a:win(e,.4,.9)});
          else{lab(R,[x0,E.job.burst*hs*(1-e),z],F(E.job.burst),{fs:12,b:1,mono:1,c:P.bad,al:'left',dx:10,a:1-win(e,0,.4)});
            lab(R,[x0+n*dx/2,E.job.spr*hs,z],'about '+F(E.job.spr)+' a second, spread over '+n+' s',{fs:12.5,b:1,c:P.good,dy:-14,a:win(e,.5,1)})}}}})}
})();

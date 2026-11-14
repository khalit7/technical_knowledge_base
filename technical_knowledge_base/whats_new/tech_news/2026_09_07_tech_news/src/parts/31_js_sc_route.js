// ---- Scene: one illustrative Claude Code session, without routing (front row) and with Portal by Spotify's routing (back row), renderer v2 ----
// Each column is the context Claude re-reads on one call (start, then turns 1 to 5), stacked by what it holds and drawn to one scale,
// so a row's total height is the input Claude processes over the session. Files stream from the codebase pile into Claude's context,
// or (with routing) through the PreToolUse hook to the cheap worker model, which returns a short summary or writes to disk.
// Mechanisms (two modes, the 350-line hook, targeted reads passing, code-writer to disk, no delegated edits or reasoning, around 90%
// per bulk read) from the post; the five requests, file sizes, 10 tokens a line, 12,000-token start and summary sizes are illustrative
// (as on the page and in src/recompute.py, which asserts the same per-turn numbers).
(function(){
  if(!document.getElementById('stg-route'))return;const {at,lerp,mix}=S3;
  const BASE=12000,TPL=10,HK=2.5/70000; // world height of one token
  // per turn and lane: f file text into Claude, m worker summary into Claude, o Claude's output, w worker tokens; rd what flows where
  const T=[
    {a:{f:4100*TPL,o:300,rd:'claude'},b:{m:4100,o:300,w:4100*TPL,rd:'worker'}},
    {a:{o:300,rd:null},b:{m:1200,o:300,w:4100*TPL,rd:'worker'}},
    {a:{f:600*TPL,o:4500,rd:'claude'},b:{m:150,w:600*TPL+4500,rd:'disk'}},
    {a:{f:600,o:200,rd:'claude'},b:{f:600,o:200,rd:'pass'}},
    {a:{f:3000,o:1500,rd:'claude'},b:{f:3000,o:1500,rd:'pass'}}];
  // the context Claude re-reads on each call: column 0 is the start, column i the call of turn i
  function cols(l){const s={base:BASE,f:0,m:0,o:0,w:0},out=[{...s}];T.forEach(t=>{const d=t[l];['f','m','o','w'].forEach(x=>s[x]+=d[x]||0);out.push({...s})});return out}
  const CA=cols('a'),CB=cols('b'),tot=c=>c.base+c.f+c.m+c.o,proc=C=>C.slice(1).reduce((s,c)=>s+tot(c),0);
  const fx=v=>Math.round(v).toLocaleString('en-GB');
  const ZA=-1.25,ZB=1.25,XC=i=>-1.3+i*1.08,CW=.66,XP=-4.9,XG=-2.7,ZW=3.2; // the routing row in front (its columns are short), the worker and disk in front of it, on the left
  const FILES=[1200,950,820,700,430]; // the five files of turn 1, in lines (illustrative)
  function column(R,x,z,c,a,grow,P){const segs=[[c.base,mix(P.paper,P.mute,.35)],[c.o,P.c1],[c.m,P.c3],[c.f,P.c2]]; /* file text on top: it dominates the re-read */let y=0;
    segs.forEach(([v,col])=>{const h=v*HK*grow;if(h<.004)return;R.box([x,y,z],[CW,h,CW],{fill:mix(P.paper,col,.75),a,shadow:y===0,lw:.7});y+=h});return y}
  function draw(R,k,e){const P=R.P,narrow=R.W<520,turn=Math.min(k,5),fin=k===6;
    R.grid(-5.6,5.2,-2.4,4.2,.5);
    // the codebase: five files as slabs, one token-scale (the front row's file segment after turn 1 is the same height)
    let y=0;FILES.forEach((n,i)=>{const h=n*TPL*HK;R.box([XP,y,-.6],[.9,h-.01,.7],{fill:mix(P.paper,P.c2,.25+.1*i),a:.95,shadow:i===0,lw:.6});y+=h});
    R.label([XP,y,-.6],narrow?'codebase':'codebase · 5 files, 4,100 lines',{fs:12,dy:-10,c:P.mute});
    // the routing row's hook (a gate) and the worker model (a glass plate behind it); the disk for code-writer output
    const gB=k===0?.6:1,cur=k>=1&&k<=5?T[k-1]:null,blocked=cur&&(cur.b.rd==='worker'||cur.b.rd==='disk'),passing=cur&&cur.b.rd==='pass';
    R.glass([XG,0,ZB-.45],[0,0,.9],[0,1.1,0],{c:blocked?P.bad:passing?P.good:P.mute,a:.85*gB,nu:2,nv:4});
    R.label([XG,1.1,ZB],blocked?'hook: blocked':passing?'hook: allowed':'PreToolUse hook',{fs:12,dy:-10,b:!!cur,c:blocked?P.bad:passing?P.good:P.mute});
    const wA=cur&&cur.b.w?1:k===0?.45:.55;
    R.glass([XG-.8,.15,ZW],[1.6,0,0],[0,1.0,0],{c:P.c5,a:wA,nu:6,nv:4});
    R.label([XG,0,ZW+.1],'worker model'+(narrow?'':' (cheap)'),{fs:12,dy:12,c:P.c5,b:wA===1});
    const dA=k>=3?1:.35;R.box([XP,0,ZW],[.9,.22,.7],{fill:mix(P.paper,P.c5,.3),a:dA,lw:.6});R.label([XP,.22,ZW],'disk',{fs:12,dy:-9,c:P.mute,a:Math.max(.5,dA)});
    // the two rows of columns
    [[CA,ZA,'a'],[CB,ZB,'b']].forEach(([C,z,l])=>{
      const xe=XC(fin?5:Math.min(5,turn+1))+.5; // the lane grows with the turns, so turns not reached yet stay out of the frame
      R.quad([[XC(0)-.5,0,z-.5],[xe,0,z-.5],[xe,0,z+.5],[XC(0)-.5,0,z+.5]],{fill:P.soft,a:.7,ec:P.line});
      for(let i=0;i<=5;i++){if(i>turn&&!fin)continue;
        const isCur=!fin&&i===turn,grow=isCur?(k===0?e:1):1;let c=C[i];
        if(isCur&&i>0){const p=C[i-1];c={base:BASE,f:lerp(p.f,c.f,e),m:lerp(p.m,c.m,e),o:lerp(p.o,c.o,e)}}
        const a=fin||isCur?1:.45,h=column(R,XC(i),z,c,a,grow,P);
        const nm=l==='a'?'without routing':'with routing';
        if(i===0&&k>0)R.label([XC(0),h,z],nm,{fs:12.5,dy:-10,b:1});
        else if(isCur)R.label([XC(i),h,z],(i===0?nm+': ':'')+fx(tot(c)*grow),{mono:i>0,fs:12.5,dy:-10,b:1})}
      if(fin)R.label([XC(5)+.85,0,z],'Σ '+fx(proc(C))+(narrow?'':' in 5 calls'),{mono:true,fs:13,b:1,al:'left',dx:6,c:l==='a'?P.c2:P.c3})
    });
    for(let i=0;i<=5;i++)if(fin||i<=turn+1)R.label([XC(i),0,ZB+.5],i?'turn '+i:'start',{fs:12,dy:12,c:P.mute,a:i<=turn||fin?1:.4,wide:1});
    // what moves on this turn
    if(cur){const top=FILES.reduce((s,n)=>s+n*TPL*HK,0)*.6,src=[XP+.3,top,-.6],cA=[XC(k),.9,ZA],cB=[XC(k),.6,ZB],gate=[XG,.6,ZB],wk=[XG,.65,ZW];
      if(cur.a.rd==='claude')R.flowArc(src,cA,.35,{c:P.c2,n:cur.a.f>20000?16:cur.a.f>5000?8:4,r:cur.a.f>20000?.085:.06,speed:1.5});
      if(cur.b.rd==='worker'||cur.b.rd==='disk'){R.flow([src,[XG-.5,.7,ZB*.6],gate,wk],{c:P.c2,n:14,r:.08,speed:1.5});
        R.flowArc(wk,cB,.3,{c:P.c3,n:cur.b.m>1000?4:2,r:.05,speed:1.1})}
      if(cur.b.rd==='disk')R.flowArc(wk,[XP,.3,ZW],.3,{c:P.c5,n:7,r:.07,speed:1.3});
      if(cur.b.rd==='pass')R.flow([src,gate,cB],{c:P.c2,n:cur.b.f>2000?7:4,r:.06,speed:1.4});
      if(cur.b.w)R.label([XG,0,ZW+.1],fx(cur.b.w)+' tokens',{mono:true,fs:12,dy:28,c:P.c5,wide:1})}
  }
  const full={cam:[.3,.6],bounds:[[-5.5,0,-1.9],[4.6,2.6,3.8]]};
  S3.stage({id:'stg-route',list:'sx-route',fig:'Fig. · one illustrative session, two ways',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,120],
    view:k=>k===6?{cam:[.3,.6],bounds:[[-5.5,0,-1.9],[6.6,2.6,3.8]]}:k>=1&&k<=5?{cam:[.3,.6],bounds:[[-5.5,0,-1.9],[Math.max(2.4,XC(k)+.9),2.6,3.8]]}:full});
  window.TN_ROUTE={CA,CB,tot,proc}; // read by src/check_stages.mjs
})();

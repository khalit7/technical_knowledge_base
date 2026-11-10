// ---- Session model (growing context with automatic caching): window.SS, the page's own accounting, used by Fig. 6 and checked by check_stages.mjs.
// P, N, O as in the worked example, 16 turns; each request reads everything the previous one cached and writes what is new (last output + new input)
// at 1.25 times the input price; output (thinking included) stays in context. A turn whose request exceeds the model's window is rejected. ----
window.SS=(function(){
  const P=100000,N=5000,O=2000,TURNS=16;
  const ctx=t=>P+(t-1)*(N+O)+N;
  function turn(t,m,p){const w=1.25*p.i;if(ctx(t)>p.win)return {read:0,write:0,inp:0,out:0,cost:0,over:true,cr:0,cw:0,ci:0,co:0};
    if(m==='none'){const inp=ctx(t);return {read:0,write:0,inp,out:O,cr:0,cw:0,ci:inp*p.i/1e6,co:O*p.o/1e6,cost:(inp*p.i+O*p.o)/1e6}}
    const read=t===1?0:P+(t-2)*(N+O)+N,write=t===1?P+N:O+N,cr=read*p.c/1e6,cw=write*w/1e6,co=O*p.o/1e6;
    return {read,write,inp:0,out:O,cr,cw,ci:0,co,cost:cr+cw+co}}
  const cum=(m,p)=>{let s=0;for(let t=1;t<=TURNS;t++)s+=turn(t,m,p).cost;return s};
  const last=p=>{let l=0;for(let t=1;t<=TURNS;t++)if(ctx(t)<=p.win)l=t;return l};
  // the numbers the step list quotes for a model
  function nums(p){const L=last(p),c=turn(L,'cache',p),a=cum('cache',p),b=cum('none',p);
    return {t1:usd(turn(1,'cache',p).cost,3),L,tl:usd(c.cost,3),rt:fmt(c.read),rd:Math.round(100*c.cr/c.cost)+'%',cum:usd(a,2),none:usd(b,2),x:(b/a).toFixed(1)}}
  return {P,N,O,TURNS,ctx,turn,cum,last,nums};
})();

// ---- Scene (session cost, Fig. 6): one column per turn, stacked by what the request does with its tokens: read from the cache (green),
// written to it (gold), output with thinking (purple); without the cache, input billed in full (blue). Heights in tokens for steps 1 to 4,
// then in dollars on the chosen model (steps 5 and 6); the back row is the same session without the cache. ----
(function(){
  if(!document.getElementById('stg-ss')||!window.SS)return;const {lerp,mix}=S3,T=SS.TURNS;
  let model='Opus 5.5';const PR=()=>PBY(model);
  const X=t=>-4.5+(t-1)*.6,CW=.4,ZF=.35,ZB=-.55,YT=1/50000,WIN=200000;
  const lab=(R,p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H-30)return;R.label(p,t,o)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  // how many columns are standing at step k (progress e): step 3 raises turns 3 to 16 one after another
  const shown=(k,e)=>k===0?1:k===1?2:k===2?2+14*e:T;
  function segs(t,m,dol,p){const c=SS.turn(t,m,p);if(c.over)return null;
    if(!dol)return m==='none'?[[c.inp,'c1'],[c.out,'c4']]:[[c.read,'good'],[c.write,'c5'],[c.out,'c4']];
    return m==='none'?[[c.ci,'c1'],[c.co,'c4']]:[[c.cr,'good'],[c.cw,'c5'],[c.co,'c4']]}
  function draw(R,k,e,st){const P=R.P,p=PR();R.grid(-5.2,5.2,-1.2,1.1,.5);
    // dollar scale: step 5 fits the cached columns, step 6 the no-cache ones (the cached columns shrink as the back row sets the scale)
    let yn=0,yc=0;for(let t=1;t<=T;t++){const c=SS.turn(t,'none',p),d=SS.turn(t,'cache',p);if(!c.over)yn=Math.max(yn,c.cost);if(!d.over)yc=Math.max(yc,d.cost)}
    const ys=s=>s===5?4/yn:3/yc,YD=st.pk===k||e>=1?ys(k):lerp(ys(st.pk),ys(k),e);
    const dk=s=>s>=4?1:0,dv=dk(st.pk)===dk(k)?dk(k):lerp(dk(st.pk),dk(k),e); // 0 tokens, 1 dollars
    const nS=e>=1?shown(k,1):k===2?shown(2,e):st.pk>k?shown(k,1):shown(k,e);
    const front=[];
    for(let t=1;t<=T;t++){const x=X(t),sT=segs(t,'cache',false,{...p,win:1e9}),sD=segs(t,'cache',true,p),grow=Math.max(0,Math.min(1,nS-(t-1)));
      const over=SS.ctx(t)>p.win;
      const hT=sT.map(s=>s[0]*YT),hD=sD?sD.map(s=>s[0]*YD):[0,0,0],h=hT.map((v,i)=>lerp(v,hD[i],dv)*grow);
      if(grow<1&&(k>=2||st.pk>=2&&e<1)){const tot=hT.reduce((a,b)=>a+b,0);R.box([x,0,ZF],[CW,tot,CW],{fill:P.paper,fa:0,ea:.35,lw:.6,shadow:false,a:.5})}
      let y=0;h.forEach((v,i)=>{if(v>.003)R.box([x,y,ZF],[CW,v,CW],{fill:P[sT[i][1]],a:1,shadow:i===0,lw:.6});y+=v});
      front.push([x,y,h[0]]);
      // a turn the chosen model cannot take (over its window) is a red outline in dollars
      if(over&&dv>.01)R.box([x,0,ZF],[CW,.25,CW],{fill:P.bad,fa:.25,ec:P.bad,ea:.9,lw:1.2,shadow:false,a:dv})}
    // the history carried forward: green dots along the tops of the cache reads
    const fA=k===0?0:k===1?e:1;
    if(fA>.01){const pts=[];front.forEach(([x,,hr],i)=>{if(i===0)pts.push([x,Math.max(.05,front[0][1]*.92),ZF+CW/2+.02]);else if(hr>.01)pts.push([x,hr,ZF+CW/2+.02])});
      if(pts.length>1)R.flow(pts,{c:P.good,a:fA,r:.07,n:Math.round(pts.length*2.2),speed:1.1})}
    // step 4: Haiku 4.5's 200K window as a glass plane over the token columns
    const wa=la(st,e,s=>s===3?1:0),wy=WIN*YT;
    if(wa>.01){R.glass([X(1)-.4,wy,ZF-.4],[X(T)-X(1)+.8,0,0],[0,0,.8],{c:P.bad,a:wa*.8,nu:16,nv:2,th:.02});
      R.label([X(1)-.4,wy,ZF],'Haiku 4.5 window · 200,000 tokens',{al:'right',dx:-8,fs:12.5,b:1,c:P.bad,a:wa});
      R.label([X(15),SS.ctx(15)*YT+.1,ZF],'turn 15 · '+fmt(SS.ctx(15)),{al:'right',mono:true,fs:12,dx:-6,dy:-34,c:P.bad,a:wa})}
    // step 6: the same session without the cache, behind
    const ba=k===5?e:st.pk===5?1-e:0;
    if(ba>.01){const pts=[];for(let t=1;t<=T;t++){const s=segs(t,'none',true,p);if(!s)continue;let y=0;s.forEach(([v,c],i)=>{const hh=v*YD*ba;if(hh>.003)R.box([X(t),y,ZB],[CW,hh,CW],{fill:P[c],a:ba,shadow:i===0,lw:.6});y+=hh});pts.push([X(t),y+.04,ZB])}
      if(pts.length>1)R.flow(pts,{c:P.c1,a:ba,r:.07,speed:1.1})}
    // labels: one set per step, the outgoing set gone by mid-transition
    const L=(s,f)=>{const a=la(st,e,q=>q===s?1:0);if(a>.01)f(a)};
    const top=t=>{const sT=segs(t,'cache',false,{...p,win:1e9});return sT.reduce((a,s)=>a+s[0],0)*YT};
    L(0,a=>{R.label([X(1)+CW/2,top(1)*.5,ZF],'written 105,000',{al:'left',dx:10,fs:12.5,b:1,c:P.c5,a});R.label([X(1)+CW/2,top(1)-.02,ZF],'output 2,000',{al:'left',dx:10,dy:-4,fs:12.5,b:1,c:P.c4,a})});
    L(1,a=>{R.label([X(2)+CW/2,top(2)*.45,ZF],'read 105,000',{al:'left',dx:10,fs:12.5,b:1,c:P.good,a});R.label([X(2)+CW/2,top(2)-.08,ZF],'written 7,000 + output 2,000',{al:'left',dx:10,dy:-6,fs:12.5,b:1,c:P.c5,a})});
    L(2,a=>{R.label([X(T),top(T),ZF],'turn 16 · 210,000 in, 203,000 read',{al:'right',dx:-14,dy:-14,fs:12.5,b:1,c:P.good,a})});
    const N=SS.nums(p),dTop=t=>{const s=segs(t,'cache',true,p);return s?s.reduce((a,x)=>a+x[0],0)*YD:0};
    L(4,a=>{R.label([X(1),dTop(1),ZF],N.t1,{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a});R.label([X(N.L),dTop(N.L),ZF],N.tl,{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a});
      R.label([X(8),2.6,ZF],'cached, '+N.L+' turns: '+N.cum+' on '+model,{fs:13,b:1,c:P.ink,a})});
    L(5,a=>{let t=N.L,s=segs(t,'none',true,p);const h=s?s.reduce((q,x)=>q+x[0],0)*YD:0;R.label([X(t),h,ZB],'no cache: '+N.none,{al:'right',dx:-12,dy:-10,fs:13,b:1,c:P.c1,a});
      R.label([X(8),0,ZF+CW/2],'cached: '+N.cum,{dy:16,fs:12.5,b:1,c:P.good,a})});
    // axis words under the first and last column
    lab(R,[X(1),0,ZF+CW/2],'turn 1',{fs:12,dy:14,c:P.mute});lab(R,[X(T),0,ZF+CW/2],'turn 16',{fs:12,dy:14,c:P.mute});
    const ua=1-Math.abs(dv-.5)*2;R.label([X(1)-.35,0,ZF],dv<.5?'tokens per turn':'dollars per turn · '+model,{al:'right',dx:-8,dy:-8,fs:12,c:P.mute,a:1-ua*.9,grp:'ax'});
  }
  const full={cam:[.3,.36],bounds:[[-5.4,0,-.9],[5.0,4.3,.8]]};
  const st=S3.stage({id:'stg-ss',list:'sx-ss',fig:'Fig. 6 · one agent session, turn by turn: tokens, then dollars',cam:full.cam,bounds:full.bounds,aspect:.62,dur:2200,hold:5000,draw,
    margin:w=>w<520?[16,8,30,8]:[24,20,34,120],
    view:k=>k<=1?{cam:[.5,.3],bounds:[[-5.3,0,-.6],[-1.6,2.4,.8]]}:full});
  function fill(){const p=PR(),N=SS.nums(p),set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
    document.querySelectorAll('.ssM').forEach(x=>x.textContent=model);document.querySelectorAll('.ssL').forEach(x=>x.textContent=N.L);
    set('ss-t1',N.t1);set('ss-tl',N.tl);set('ss-rt',N.rt);set('ss-rd',N.rd);set('ss-cum',N.cum);set('ss-none',N.none);set('ss-x',N.x)}
  const sel=document.getElementById('ssMod');if(sel)sel.addEventListener('change',()=>{model=sel.value;fill();st&&st.draw()});
  fill();
})();

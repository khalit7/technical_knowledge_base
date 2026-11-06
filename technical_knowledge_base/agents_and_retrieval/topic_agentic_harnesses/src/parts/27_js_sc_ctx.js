// ---- Scene: Fig. 2, what fills the window on each call (renderer v2), driven by the page's recordings:
// window.TRC (Trace and context lab: the one-call runs ctx_none, ctx_six, ctx_default, and md_haiku_1 against std_haiku_1 for the CLAUDE.md)
// and window.AHREAD.cc (the replayed run std_haiku_1: 12 calls, each split into cache read, cache write and fresh input).
// Heights are tokens on one scale; the last step morphs them into billed units (read x0.1, 1-hour write x2, fresh x1). ----
(function(){
  if(!document.getElementById('stg-ctx'))return;const {at,lerp,mix}=S3;
  let T=null;
  function data(){if(T)return T;const X=window.TRC,D=window.AHREAD;if(!X||!D)return null;const f=k=>X.derived(X.by[k]).first;
    const sys=f('ctx_none'),six=f('ctx_six'),all=f('ctx_default'),md=f('md_haiku_1')-f('std_haiku_1');
    const C=D.cc.calls.map(c=>({tot:c.in+c.cw+c.cr,cr:c.cr,cw:c.cw,f:c.in}));
    return T={sys,tools:six-sys,all,md,six,C,max:Math.max(all,...C.map(c=>c.tot))}}
  const n=12,X0=i=>(i-5.5)*.64,W=.44,Dp=.7,HMAX=2.5;
  const fmt=v=>Math.round(v).toLocaleString('en-US');
  function draw(R,k,e){const P=R.P,d=data();if(!d)return;const nar=R.W<520,fa=Math.min(1,e*1.6),h=v=>v/d.max*HMAX;R.grid(-4.4,4.4,-1.6,1.6,.4);
    const SYS=mix(P.paper,P.ink,.12),TL=mix(P.paper,P.c6,.45),HI=mix(P.paper,P.c3,.4),MD=mix(P.paper,P.c4,.45);
    // steps 1 to 3: call 1 alone, built up piece by piece
    if(k<=2){const x=X0(0);let y=0;
      const hs=h(d.sys)*(k===0?e:1);R.box([x,0,0],[W,hs,Dp],{fill:SYS});R.label([x+W/2,hs/2,0],'system prompt + environment · '+fmt(d.sys),{al:'left',dx:10,fs:12.5,b:k===0,c:P.ink});y=hs;
      if(k>=1){const ht=h(d.tools)*(k===1?e:1);R.box([x,y,0],[W,ht,Dp],{fill:TL,shadow:false});R.label([x+W/2,y+ht/2,0],'six tool definitions · +'+fmt(d.tools),{al:'left',dx:10,fs:12.5,b:k===1,c:P.c6});y+=ht;
        const ga=k===1?fa:.5;R.box([x,0,0],[W*1.08,h(d.all),Dp*1.08],{fill:P.paper,a:ga,fa:.05,shadow:false,ea:.5});
        R.label([x+W/2,h(d.all),0],'every default tool · '+fmt(d.all),{al:'left',dx:10,fs:12,c:P.mute,a:ga})}
      if(k===2){const hm=Math.max(.05,h(d.md))*e;R.box([x,y,0],[W,hm,Dp],{fill:MD,a:fa,shadow:false});
        R.label([x+W/2,y+hm,0],'a 4-line CLAUDE.md · +'+fmt(d.md)+' (another run)',{al:'left',dx:10,dy:-8,fs:12.5,b:1,c:P.c4,a:fa})}
      return}
    // steps 4 to 6: the twelve calls of the replayed run
    d.C.forEach((c,i)=>{const x=X0(i),ap=k===3?Math.min(1,Math.max(0,e*14-i)):1;if(ap<=.01)return;
      let segs;
      if(k===3)segs=[[d.sys,SYS],[d.tools,TL],[c.tot-d.six,HI]];
      else{const t=k===5?e:0;segs=[[lerp(c.cr,c.cr*.1,t),mix(P.paper,P.c1,.5)],[lerp(c.cw,c.cw*2,t),mix(P.paper,P.c5,.6)],[c.f,P.c2]]}
      let y=0;segs.forEach(([v,f],j)=>{const hh=h(v);if(hh<.004)return;R.box([x,y,0],[W,hh,Dp],{fill:f,a:ap,shadow:j===0,lw:.7});y+=hh});
      if(k===5)R.box([x,0,0],[W*1.06,h(c.tot),Dp*1.06],{fill:P.paper,a:e*.8,fa:.04,shadow:false,ea:.45});
      // each call resends everything before it: the stream from one column to the next
      if(i<n-1&&(k===3||k===4)){const y1=h(c.tot)*(k===5?.1:1);R.flowArc([x+.1,y1,0],[X0(i+1)-.1,h(d.C[i+1].tot)*(k===5?.1:1),0],.12,{c:k===4?P.c1:P.c3,a:ap*(k===4?.9:.6),r:.05,n:3,speed:.7})}
      if(i===0||i===n-1){const yy=h(c.tot);R.label([x,yy,0],(nar?'':'call '+(i+1)+' · ')+fmt(c.tot),{fs:12,c:P.ink,dy:-11,a:ap})}});
    const tot=d.C.reduce((s,c)=>s+c.tot,0),cr=d.C.reduce((s,c)=>s+c.cr,0);
    if(k===3&&!nar)R.label([0,h(d.max)*.92,0],'the history grows by one reply and one result per call',{fs:12.5,c:P.c3,a:fa,wide:1});
    if(k===4&&!nar)R.label([0,h(d.max)*.92,0],fmt(cr)+' of '+fmt(tot)+' input tokens read from the cache',{fs:12.5,b:1,c:P.c1,a:fa,wide:1});
    if(k===5&&!nar)R.label([0,h(d.max)*.92,0],'billed: read x0.1 · write x2 · fresh x1 (outline: tokens read)',{fs:12.5,c:P.ink,a:e,wide:1});
    if(k>=3&&!nar){const lab=k===3?[['system prompt',d.sys/2,P.mute],['tool definitions',d.sys+d.tools/2,P.c6],['history',d.six+(d.C[0].tot-d.six)/2+300,P.c3]]:k===4?[['cache read',d.C[0].cr/2,P.c1]]:[];
      lab.forEach(([t,v,c])=>R.label([X0(0)-W/2,h(v),0],t,{al:'right',dx:-8,fs:12,c,grp:'side'}))}
  }
  const full={cam:[.05,.45],bounds:[[-4.1,0,-.5],[4.1,2.35,.5]]};
  S3.stage({id:'stg-ctx',list:'sx-ctx',fig:'Fig. 2 · what fills the window, call by call',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,10,14,10]:[20,16,14,110],
    view:k=>k===0?{cam:[.35,.32],bounds:[[-4,0,-.6],[-.9,1.15,.6]]}:k<=2?{cam:[.35,.32],bounds:[[-4.1,0,-.6],[-.4,HMAX+.3,.6]]}:full});
})();

// ---- Scene: Fig. 2, the cached prefix and what invalidates it (renderer v2). Data: HCTX.cache, the eleven recorded one-call Claude Code sessions
// (Haiku 4.5, six tools, "Reply with the single word OK."): per call, tokens read from the cache, written to it (1-hour price) and fresh, by variant.
// The request is a bar in prefix order (tools and the fixed system prompt, the rest of the system prompt, the first user message), 13,320 tokens = 6 units;
// one row per call; the prompt cache is the glass plate behind. Costs: Haiku 4.5 list prices from HCTX.price. ----
(function(){
  if(!document.getElementById('stg-cache')||!window.HCTX)return;const {lerp,mix}=S3;
  const H=HCTX,PR=H.price,fmt=n=>Math.round(n).toLocaleString('en-GB'),usd=c=>(c.in*PR.in+c.cw*PR.w1h+c.cr*PR.read)/1e6;
  const V=v=>H.cache.filter(c=>c.variant===v).sort((a,b)=>a.i-b.i),st=V('static'),FULL=st[0].in+st[0].cw+st[0].cr;
  const A=st[0].cr,B=V('tsuser')[0].cr,M=st[1].cr;           // 8,344 already cached (tools, fixed system); 12,199 up to the user message; 13,310 whole prefix
  const HS=6/FULL,X0=-3,TH=.36,TD=.62,ZR=[1.1,0,-1.1],ZC=-2.35;
  const VAR=[null,'static','tssys','tsuser','tools5'],MARK={tssys:A,tsuser:B,tools5:0};
  const x=n=>X0+n*HS;
  function draw(R,k,e,stg){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4.4,4.4,-3,2.2,.5);
    const COL={r:mix(P.paper,P.c1,.6),w:P.c5,f:P.c2};
    if(k===0){ // the request by kind, in prefix order
      const segs=[[A,mix(P.paper,P.c4,.45),'tools + fixed system prompt '+fmt(A)],[B-A,P.c4,'rest of the system prompt '+fmt(B-A)],[M-B,P.c2,'first user message '+fmt(M-B)]];
      let s=0;segs.forEach(([n,fill,t],i)=>{R.box([x(s+n/2),0,0],[n*HS,TH,TD],{fill,a:at0(e,i)});R.label([x(s+n/2),TH,-TD/2],t,{fs:12.5,mono:true,c:i?fill:P.c4,dy:-14-18*(2-i),a:at0(e,i)});s+=n});
      R.line([[x(0),TH+.05,TD/2+.15],[x(M),TH+.05,TD/2+.15]],{c:P.mute,w:1.2,head:6,a:fa});R.label([x(M/2),0,TD/2+.15],'prefix order: tools → system → messages',{fs:12.5,c:P.mute,dy:16,a:fa});
      return}
    const v=VAR[k],rows=V(v),mk=MARK[v];
    // the prompt cache behind the rows
    R.glass([x(0),0,ZC],[6,0,0],[0,.75,0],{c:P.c1,a:.85,nu:12,nv:3});R.label([x(0),.75,ZC],'prompt cache',{fs:12.5,b:1,c:P.c1,al:'left',dy:-12});
    rows.forEach((c,i)=>{const z=ZR[i],sw=Math.min(1,Math.max(0,e*1.5-i*.2));let s=0;
      [['r',c.cr],['w',c.cw],['f',c.in]].forEach(([kk,n])=>{if(!n)return;const l=n*HS;R.box([x(s)+l/2*sw,0,z],[Math.max(.03,l*sw),TH,TD],{fill:COL[kk],a:sw>0?1:0,lw:.8});s+=n});
      R.label([x(0),TH/2,z],'call '+c.i,{fs:12.5,mono:true,al:'right',dx:-10,c:P.mute,a:sw});
      R.label([x(FULL),TH/2,z],'$'+usd(c).toFixed(4),{fs:12.5,mono:true,b:1,al:'left',dx:10,c:P.ink,a:sw});
      if(!nar){if(c.cr)R.label([x(c.cr/2),TH,z+TD/2],'read '+fmt(c.cr),{fs:12,mono:true,c:P.c1,dy:-4,a:sw});
        if(c.cw>2000)R.label([x(c.cr+c.cw/2),TH,z+TD/2],'write '+fmt(c.cw),{fs:12,mono:true,c:mix(P.ink,P.c5,.7),dy:-4,a:sw})}
      // flows: reads stream from the cache into the row, writes stream back
      if(c.cr)R.flowArc([x(c.cr*.5),.5,ZC+.05],[x(c.cr*.5),TH,z-TD/2],.25+.1*i,{c:P.c1,a:sw*.9,r:.05,n:5,speed:1});
      if(c.cw)R.flowArc([x(c.cr+c.cw*.5),TH,z-TD/2],[x(c.cr+c.cw*.5),.5,ZC+.05],.3+.1*i,{c:P.c5,a:sw*.9,r:.05,n:5,speed:1})});
    // where the volatile value sits (or the removed tool)
    if(mk!=null){const xm=x(mk);R.quad([[xm,0,ZR[0]+TD/2+.1],[xm,0,ZR[rows.length-1]-TD/2-.1],[xm,TH+.25,ZR[rows.length-1]-TD/2-.1],[xm,TH+.25,ZR[0]+TD/2+.1]],{fill:P.bad,fa:.18,ec:P.bad,a:fa});
      R.label([xm,TH+.25,ZR[rows.length-1]-TD/2-.1],v==='tools5'?'tool list changed':'timestamp here',{fs:12.5,b:1,c:P.bad,dy:-10,a:fa})}
  }
  const at0=(e,i)=>Math.min(1,Math.max(0,e*2-i*.35));
  S3.stage({id:'stg-cache',list:'sx-cache',fig:'Fig. 2 · eleven recorded calls, one volatile value',cam:[.38,.72],bounds:[[-3.6,0,-2.5],[3.9,.9,1.7]],aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,18,14,60],
    view:k=>k===0?{cam:[.3,.55],bounds:[[-3.2,0,-.6],[3.2,.8,.9]]}:null});
})();

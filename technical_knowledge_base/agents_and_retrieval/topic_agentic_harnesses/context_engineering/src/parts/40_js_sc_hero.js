// ---- Scene: Fig. 1, the context window as a tray of layers by kind, filling against the 200,000-token limit (renderer v2).
// Data: window.HCTX (src/extract.py): /context of c1_control at its end (tool definitions, system prompt, CLAUDE.md, history), c1_control's 15 calls
// (request size and the last call's cache split), c3_big_nocompact (five 75 KB reads, /context 130.7k), c4_auto (the compaction 127,242 -> 1,971 and the
// next call), sb_agent (/context of the parent at its end, the subagent's own window). Lengths are to scale (200,000 tokens = 8 units), except that a
// layer under about 1,200 tokens is drawn at a minimum length so it can be seen. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.HCTX)return;const {lerp,mix}=S3;
  const H=HCTX,S=H.sessions,tot=c=>c.in+c.cw+c.cr,fmt=n=>Math.round(n).toLocaleString('en-GB');
  const ctl=S.c1_control,cats=ctl.ctx[0].cats,calls=ctl.calls.filter(c=>c.w==='m').map(tot),last=ctl.calls[ctl.calls.length-1];
  const big=S.c3_big_nocompact.ctx[0],c4=S.c4_auto,cmp=c4.events.find(e=>e.k==='compact'),after=tot(c4.calls[2]);
  const sa=S.sb_agent,saCats=sa.ctx[0].cats,saSub=sa.calls.filter(c=>c.w==='s').map(tot),saMain=sa.calls.filter(c=>c.w==='m').map(tot);
  const WIN=ctl.ctx[0].window,HS=8/WIN,MINL=.05,X0=-4,TH=.42,TD=.9,DZ=1.45,SZ=-1.75,MX=1.6,MZ=1.7;
  const startup=cats['System tools']+cats['System prompt']+cats['Memory files'];
  // a tray of [kind, tokens, fill, label, colour] layers laid from x = X0; returns the end and each layer's middle
  function tray(R,z,layers,a){let x=X0;const mids=[];layers.forEach(([n,fill,ec])=>{const l=Math.max(MINL,n*HS);R.box([x+l/2,0,z],[l,TH,TD],{fill,a,ec,lw:ec?1.8:.8});mids.push(x+l/2);x+=l});return {end:x,mids}}
  function frame(R,z,a){R.box([X0+4,0,z],[8.04,TH+.06,TD+.06],{fa:.03,a:.3*a,shadow:false});R.line([[X0+8,0,z-TD/2-.03],[X0+8,TH+.25,z-TD/2-.03]],{c:R.P.bad,w:1.6,a:.7*a})}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4.6,4.6,-2.6,2.6,.5);
    const K={tools:P.c1,sys:P.c4,mem:P.c3,hist:mix(P.paper,P.c2,.75),newm:mix(P.paper,P.c2,.45),sum:P.c6};
    const base=[[cats['System tools'],K.tools],[cats['System prompt'],K.sys],[cats['Memory files'],K.mem]];
    const lab=(x,t,c,a,grp)=>R.label([x,TH,-TD/2],t,{fs:12.5,mono:true,c,dy:-12,grp:grp||'top',a});
    let L=base.slice(),txt=[];
    if(k===1){const t=e*(calls.length-1),j=Math.min(calls.length-2,Math.floor(t)),n=lerp(calls[j],calls[j+1],t-j);L.push([n-startup-1400,K.hist],[1400,K.newm,P.bad]);
      txt=['call '+(1+Math.round(t))+' · '+fmt(n)+' tokens',P.c2]}
    if(k===2)L=[[last.cr,mix(P.paper,P.c1,.55)],[last.cw,P.c5],[last.in,P.c2]];
    if(k===3)L.push([lerp(tot(last)-startup,big.cats.Messages,e),K.hist]);
    if(k===4){const s=Math.max(0,e*1.6-.6);L.push([cmp.post*s,K.sum],[lerp(big.cats.Messages,0,Math.min(1,e*1.4)),K.hist])}
    if(k===5)L=[[saCats['System tools'],K.tools],[saCats['System prompt'],K.sys],[saCats.Messages,K.hist]];
    const fr=k>=3&&k<=4?1:k===5?.6:.45;frame(R,0,fr);
    if(k>=3&&k<=4)R.label([X0+8,TH+.25,-TD/2],nar?'limit':fmt(WIN)+'-token window',{fs:12.5,mono:true,c:P.bad,dy:-10,al:'right',dx:6});
    const T=tray(R,0,L,1);
    // labels: what each layer is, or the step's number
    if(k===0){lab(T.mids[0],'tool definitions '+fmt(cats['System tools']),P.c1,fa);lab(T.mids[1],'system prompt '+fmt(cats['System prompt']),P.c4,fa);lab(T.mids[2],'CLAUDE.md '+fmt(cats['Memory files']),P.c3,fa)}
    if(k===1){lab(T.mids[0],'tools',P.c1,1);lab(T.mids[1],'system',P.c4,1);lab(T.mids[3],'history',P.c2,1);lab(T.mids[4],'newest message last',P.bad,1);
      R.label([T.end,0,TD/2],txt[0],{fs:13,b:1,c:P.c2,al:'left',dx:10,dy:8})}
    if(k===2){const bl=(x,t,c,a)=>R.label([x,0,TD/2],t,{fs:12.5,mono:true,c,dy:16,grp:'bot',a});bl(T.mids[0],'read from cache '+fmt(last.cr)+' · 0.1×',P.c1,1);bl(T.mids[1],'written '+fmt(last.cw)+' · 2×',P.c5,fa);bl(T.mids[2],'fresh '+last.in+' · 1×',P.c2,fa)}
    if(k===3)R.label([T.end,TH,0],nar?fmt(lerp(tot(last),big.total,e))+' tokens':'after five 75 KB reads: '+fmt(lerp(tot(last),big.total,e)),{fs:13,b:1,c:P.c2,dy:-26,a:fa});
    if(k===4)R.label([X0+2.4,TH,0],nar?fmt(cmp.pre)+' → '+fmt(cmp.post):'compaction: '+fmt(cmp.pre)+' → '+fmt(cmp.post)+' tokens',{fs:13,b:1,c:P.c6,dy:-34,a:fa});
    // 1: CLAUDE.md on disk, read at start
    const da=k===0||k===5?1:.25;R.box([X0+.9,0,DZ],[.8,.3,.55],{fill:mix(P.paper,P.c3,.25),a:da});
    R.label([X0+.9,0,DZ+.28],k===5?'notes and CLAUDE.md on disk':'CLAUDE.md on disk',{fs:12.5,b:1,c:P.c3,dy:14,a:Math.max(.5,da)});
    if(k===0)R.flowArc([X0+.9,.3,DZ-.2],[T.mids[2],TH,.1],.45,{c:P.c3,a:fa,r:.055,n:6,speed:1});
    // 2: each call's reply and tool result land at the end
    if(k===1)R.flowArc([T.end+1.2,.2,DZ-.4],[T.end,TH*.6,.2],.5,{c:P.c2,a:fa,r:.06,n:7,speed:1.2});
    // 3: the prompt cache: a glass plate behind the prefix; reads stream into the tray
    if(k===2){const l=last.cr*HS;R.glass([X0,0,-1.5],[l,0,0],[0,.5,0],{c:P.c1,a:fa,nu:6,nv:3});R.label([X0+l/2,.5,-1.5],'prompt cache',{fs:12.5,b:1,c:P.c1,dy:-12,a:fa});
      [.2,.5,.8].forEach(f=>R.flow([[X0+l*f,.3,-1.45],[X0+l*f,TH*.7,-TD/2]],{c:P.c1,a:fa,r:.05,n:4,speed:.7}));
      R.flow([[T.mids[1],TH*.7,-TD/2],[T.mids[1],.35,-1.45]],{c:P.c5,a:fa,r:.05,n:4,speed:.7})}
    // 5: compaction: the history streams into a summarising call, a small summary comes back
    if(k===4){const sx=X0+4.4,h0=1.55;R.glass([sx-.6,h0-.6,-.1],[1.2,0,0],[0,.9,0],{c:P.c6,a:fa,nu:5,nv:4});R.label([sx,h0+.3,0],'summarising call',{fs:12.5,b:1,c:P.c6,dy:-10,a:fa});
      R.flowArc([X0+3.4,TH,0],[sx-.5,h0-.2,-.05],.35,{c:P.c2,a:fa*(1-Math.max(0,e*1.4-.6)),r:.07,n:10,speed:1.5});
      if(e>.45)R.flowArc([sx-.3,h0-.6,-.05],[T.mids[3]||X0+.6,TH,0],.5,{c:P.c6,a:Math.min(1,(e-.45)*3),r:.055,n:5,speed:1.1})}
    // 6: outside the window: a subagent with its own window, notes on disk, a memory layer
    if(k===5){const sb=saSub[saSub.length-1],sf=Math.min(1,e*1.5);frame(R,SZ,.6*sf);
      const Sb=tray(R,SZ,[[saSub[0],mix(P.paper,P.c4,.55)],[sb-saSub[0],K.hist]],sf);
      R.label([Sb.end,TH,SZ],'subagent window · '+fmt(sb),{fs:12.5,b:1,c:P.c4,al:'left',dx:10,a:sf});
      R.label([T.end,TH,0],'parent · '+fmt(saMain[saMain.length-1]),{fs:12.5,b:1,c:P.ink,al:'left',dx:10,a:sf});
      R.flowArc([T.end-.2,TH,-TD/2],[X0+1,TH,SZ+TD/2],.5,{c:P.c4,a:sf,r:.05,n:5,speed:1.1});
      if(e>.5)R.flowArc([Sb.end-.3,TH,SZ+TD/2],[T.end-.1,TH,-TD/2],.45,{c:P.c6,a:Math.min(1,(e-.5)*3),r:.05,n:3,speed:1});
      R.glass([MX-.6,.05,MZ],[1.2,0,0],[0,.75,0],{c:P.c5,a:sf,nu:5,nv:4});R.label([MX,0,MZ],'memory layer',{fs:12.5,b:1,c:P.c5,dy:14,a:sf});
      R.flowArc([MX-.4,.45,MZ-.1],[T.end-.3,TH,TD/2],.5,{c:P.c5,a:sf*.8,r:.045,n:4,speed:.9});
      R.flowArc([X0+.9,.3,DZ-.2],[X0+1.6,TH,TD/2],.35,{c:P.c3,a:sf*.8,r:.045,n:3,speed:.9})}
  }
  const close={cam:[.42,.6],bounds:[[X0-.3,0,-1.6],[X0+1.7,.6,1.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one request, layer by layer',cam:[.3,.6],bounds:[[X0-.2,0,-1.2],[X0+8.2,.7,1.8]],aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,16,14,16],
    view:k=>k<=2?close:k===5?{cam:[.3,.68],bounds:[[X0-.2,0,-2.3],[X0+6.8,.7,2.2]]}:null});
})();

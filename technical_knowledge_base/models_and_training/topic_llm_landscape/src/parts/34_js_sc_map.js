// ---- Fig. 1: the labs on the three axes (renderer v2, 2026-11-10). One pillar per lab's flagship, as section 1 picks them.
// Across: how open the release is (section 4; the licences are the hero list's, section 1). Front to back: where the thinking can go
// (section 2: every flagship reasons in a chain; Deep Think and Heavy add parallel branches; GPT-6 Astra adds recurrent depth).
// Height: list output price in dollars per million tokens, log scale, read from this page's own data: the section 6 price list
// (window.PCP, 24_js_price.js) and, for Qwen3.8 Max and Hy3, the Capability vs price snapshot (window.IQR, 33_js_iq.js).
// The fully open pair has no price on this page and stands as a floor disc. The thinking glyphs and the source of the Vercel streams are schematic.
(function(){
  if(!document.getElementById('stg-land'))return;const {at,off,lerp,mix,rgb}=S3;
  const COLS=[{x:-4.2,t:'closed or API-only',v:'--closed'},{x:-1.4,t:"open, the lab's own licence",v:'--c2'},{x:1.4,t:'open, MIT or Apache 2.0',v:'--open'},{x:4.2,t:'fully open',v:'--c1'}];
  const ROWS=[{z:1.6,t:'one chain of thinking tokens'},{z:-.5,t:'+ parallel branches'},{z:-2.6,t:'+ latent depth, no tokens'}];
  // [label naming the child page, model as this page's data names it, data source, openness column, thinking row]
  const LABS=[
    ['Anthropic: Claude','Claude Opus 5.5','P',0,0],['Meta: Llama and MSL','Muse Wonder','P',0,0],['Alibaba: Qwen','Qwen3.8 Max (0902)','R',0,0],
    ['Google: Gemini','Gemini 4 Argon','P',0,1],['xAI: Grok','Grok 4.7','P',0,1],['OpenAI: GPT','GPT-6 Astra','P',0,2],
    ['Moonshot: Kimi','Kimi K3','P',1,0],['Other: StepFun','Step 5 Preview','P',1,0],['MiniMax','MiniMax M3.1 Flash','P',1,0],['Mistral AI','Mistral Large 4 (preview)','P',1,0],
    ['Other: Xiaomi','MiMo-V2.6-Pro','P',2,0],['DeepSeek','DeepSeek V4.1-Flash-1017','P',2,0],['Zhipu: GLM','GLM-5.3','P',2,0],['Other: Tencent','Hy3','R',2,0],
    ['Other: Ai2 OLMo','OLMo 3.1 32B Think',null,3,0],['Other: IFM K2 Horizon','K2 Horizon 375B',null,3,0]];
  const price=(m,src)=>{if(src==='P'){const r=(window.PCP||[]).find(p=>p[0]===m);return r?r[3]:NaN}if(src==='R'){const r=(window.IQR||[]).find(p=>p.m===m);return r?r.po:NaN}return null};
  const fmt=p=>Number.isInteger(p)?'$'+p:Math.abs(p*100-Math.round(p*100))<1e-6?'$'+p.toFixed(2):'$'+p.toFixed(3);
  const HY=p=>.15+.62*Math.log10(p/.4),TICKS=[.5,1,5,10,50],WZ=-3.55;
  let D=null;
  function data(){if(D)return D;const cnt={};
    D=LABS.map(([lab,model,src,c,r])=>{const p=price(model,src),key=c+'.'+r,i=cnt[key]=(cnt[key]||0)+1;return {lab,model,c,r,p,i:i-1}});
    D.forEach(d=>{const n=D.filter(e=>e.c===d.c&&e.r===d.r).length,u=d.i-(n-1)/2;d.x=COLS[d.c].x+u*.62;d.z=ROWS[d.r].z-u*.3;d.h=d.p?HY(d.p):0});
    window.LMAP={labs:D.map(d=>({lab:d.lab,model:d.model,price:d.p,txt:d.p?fmt(d.p):'no price',col:COLS[d.c].t,row:ROWS[d.r].t}))};return D}
  let CC=null,CP=null;
  const colOf=(P,c)=>{if(CP!==P){const s=getComputedStyle(document.body);CC=COLS.map(o=>rgb(s.getPropertyValue(o.v).trim()||'#888'));CP=P}return CC[c]};
  // step: 0 the map, 1 closed, 2 beyond one chain, 3 own licence, 4 MIT or Apache, 5 fully open, 6 tokens against spend
  const FOC=[null,0,null,1,2,3,null];
  const mono={mono:true,fs:12};
  function draw(R,k,e){const P=R.P,T=data();R.grid(-6.2,6.2,-3.2,3.4,.5);
    const ph=R.W<520,f=FOC[k];
    const inF=d=>k===0||k===6?1:k===2?(d.r>0?1:.22):f===d.c?1:.18;
    // floor cells, tinted by openness
    COLS.forEach((C,c)=>{const ca=k===0||k===6?1:k===2?.6:f===c?1:.35;ROWS.forEach((Rw,r)=>{const x0=C.x-1.3,x1=C.x+1.3,z0=Rw.z-.9,z1=Rw.z+.9;
      R.quad([[x0,.004,z0],[x1,.004,z0],[x1,.004,z1],[x0,.004,z1]],{fill:mix(P.card,colOf(P,c),P.dark?.22:.13),fa:ca,ea:.35*ca})})});
    // the price ruler: one glass panel per column at the back, with lines at the tick prices
    COLS.forEach((C,c)=>{const ga=k===0||k===6?.8:k===2?.6:f===c?1:.25;R.glass([C.x-1.3,0,WZ],[2.6,0,0],[0,HY(60),0],{c:colOf(P,c),a:ga,nu:1,nv:1,th:.03});
      TICKS.forEach(t=>R.line([[C.x-1.3,HY(t),WZ+.03],[C.x+1.3,HY(t),WZ+.03]],{c:P.mute,w:.8,a:ga*.55,dash:[3,4]}))});
    // the price ruler, readable: a post at the front left corner of the column in focus (or of the map), ticks at the same prices as the back lines
    {if(f!=null&&f<3){const px=COLS[f].x-1.3,pz=ROWS[0].z+.9,tk=ph?[.5,5,50]:TICKS,top=HY(60);
      R.line([[px,0,pz],[px,top,pz]],{c:P.mute,w:1.2,a:.9});tk.forEach(t=>{R.line([[px,HY(t),pz],[px+.15,HY(t),pz]],{c:P.mute,w:1.2});R.label([px,HY(t),pz],fmt(t),{...mono,al:'right',dx:-6,c:P.mute})});
      }}
    // the pillars
    T.forEach(d=>{const a=inF(d),col=colOf(P,d.c);
      if(d.p){const h=k===0?Math.max(.02,d.h*e):d.h;R.box([d.x,0,d.z],[.15,h,.15],{fill:mix(P.paper,col,.35),a});
        R.glow([d.x,h+.12,d.z],.32,{c:col,a:a*.5});R.ball([d.x,h+.12,d.z],.13,{c:col,a})}
      else{const pts=[];for(let i=0;i<=28;i++){const t=i/28*Math.PI*2;pts.push([d.x+.3*Math.cos(t),.02,d.z+.3*Math.sin(t)])}R.line(pts,{c:col,w:2,a,dash:[4,3],top:1});R.ball([d.x,.1,d.z],.11,{c:col,a})}});
    // labels: axis names in the full views, the lab names (each its child page) and prices in the close views
    if(k===0){COLS.forEach(C=>R.label([C.x,0,ROWS[0].z+.95],ph?C.t.replace("open, the lab's own licence","own licence").replace('open, MIT or Apache 2.0','MIT, Apache').replace('closed or API-only','closed'):C.t,{...mono,b:1,dy:14,c:P.ink}));
      if(!ph)ROWS.forEach(Rw=>R.label([COLS[0].x-1.3,0,Rw.z+.9],Rw.t,{...mono,al:'right',dx:-8,c:P.mute}))}
    if(f!=null){const C=COLS[f];R.label([C.x,0,ROWS[0].z+.95],C.t,{...mono,b:1,dy:14,c:colOf(P,f),a:e});
      if(f===3)R.label([C.x,0,ROWS[0].z+.95],'no price on this page',{...mono,c:P.mute,dy:30,a:e});
      // in the closed column, the pillars left of centre carry their names on the left, so the close-up's six labels do not stack in one pile
      T.filter(d=>d.c===f).forEach(d=>R.label([d.x,d.p?d.h+.12:.1,d.z],d.lab+(d.p?' · '+fmt(d.p):''),(d.p?{...mono,b:1,...(f===0&&d.x<C.x-.1?{al:'right',dx:-10,grp:'labL'}:{al:'left',dx:10,grp:'lab'}),a:e}:{...mono,b:1,al:d.i?'left':'right',dx:d.i?24:-24,dy:-8,a:e,wide:1})));
      }
    // step 3: where the thinking goes, as schematic dot streams: one chain along the front row for every lab; branches and a loop only in the closed column
    if(k===2){const a=e;R.flow([[COLS[0].x-1.25,.05,ROWS[0].z+.55],[COLS[3].x+1.25,.05,ROWS[0].z+.55]],{c:P.c5,a,r:.085,speed:1.2});
      const zb=ROWS[1].z+.55;for(let i=0;i<4;i++){const z=zb-.02-i*.1;R.flow([[COLS[0].x-1.25,.05,zb],[COLS[0].x-.6,.05,z-.15],[COLS[0].x+1.25,.05,z-.15]],{c:P.c5,a,r:.07,speed:1.2,n:6})}
      const lc=[COLS[0].x+.75,.05,ROWS[2].z+.45],lp=[];for(let i=0;i<=32;i++){const t=i/32*Math.PI*2;lp.push([lc[0]+.36*Math.cos(t),.05,lc[2]+.22*Math.sin(t)])}R.flow(lp,{c:P.c5,a,r:.075,speed:.8,n:9});
      T.filter(d=>d.r>0).forEach(d=>R.label([d.x,d.h+.12,d.z],d.lab+' · '+fmt(d.p),{...mono,b:1,al:'left',dx:10,grp:'lab',a:e}));
      R.label([COLS[1].x+1.4,0,ROWS[1].z-.8],ph?'no open lab here':'no open lab on this page ships these',{...mono,c:P.mute,a:e,dy:-2});
      R.label([COLS[0].x-1.35,0,ROWS[0].z+.55],ph?'chain':'one chain: every flagship (schematic)',{...mono,al:'right',dx:-4,c:P.c5,a:e});
      R.label([COLS[0].x-1.35,0,ROWS[1].z],ph?'branches':'+ parallel branches',{...mono,al:'right',dx:-4,c:P.c5,a:e});
      R.label([COLS[0].x-1.35,0,ROWS[2].z],ph?'loop':'+ latent depth, no tokens',{...mono,al:'right',dx:-4,c:P.c5,a:e})}
    // step 7: Vercel's AI Gateway, August 2026: open weights 56% of tokens and 14% of spend; dots in each stream in those proportions
    if(k===6){const src=[-2.1,.05,3.2],tc=[COLS[0].x,.12,ROWS[0].z+.2],to=[0,.12,ROWS[0].z+.2],a=e;
      R.flowArc(src,tc,.35,{c:P.c6,a,r:.08,n:11,speed:1.1});R.flowArc(src,to,.35,{c:P.c6,a,r:.08,n:14,speed:1.1});
      R.flowArc([src[0]+.1,.05,src[2]],[tc[0]+.3,.12,tc[2]],.9,{c:P.c5,a,r:.08,n:22,speed:1.1});R.flowArc([src[0]+.1,.05,src[2]],[to[0]+.3,.12,to[2]],.9,{c:P.c5,a,r:.08,n:4,speed:1.1});
      R.box(src,[.5,.08,.3],{a});R.label(src,ph?'Vercel, Aug 2026':'Vercel AI Gateway, August 2026',{...mono,b:1,al:'right',dx:-16,dy:12,a,wide:1});
      [[tc,'closed','44%','86%',-1],[to,'open weights','56%','14%',1]].forEach(([p,n,t,m,sd])=>{const q=[p[0]+sd*.5,0,ROWS[0].z+1.05],o={...mono,b:1,a,al:sd<0?'right':'left'};R.label(q,n,{...o,dy:0});R.label(q,'tokens '+t,{...o,c:P.c6,dy:16});R.label(q,'spend '+m,{...o,c:P.c5,dy:32})})}
  }
  const full={cam:[.28,.72],bounds:[[-7.4,0,-3.6],[5.6,1.5,3.3]]};
  const close=c=>({cam:[.3,.5],bounds:[[COLS[c].x-2.2,0,-3.6],[COLS[c].x+2.1,c===3?.9:1.5,2.6]]});
  // on a phone the card is tall and the side labels are hidden: look further down and drop the room kept for row labels, so the map fills the card
  const phone=v=>innerWidth<520?{cam:[v.cam[0],Math.min(1.15,v.cam[1]+.35)],bounds:[[Math.max(v.bounds[0][0],-5.7),v.bounds[0][1],v.bounds[0][2]],v.bounds[1]]}:v;
  S3.stage({id:'stg-land',list:'sx-land',fig:'Fig. 1 · the labs on three axes · height: output $ per M tokens, log',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,8,14,8]:[30,16,18,16],
    view:k=>phone(k===1?{cam:[-.55,.42],bounds:[[-6.0,0,-3.6],[-2.6,1.5,2.6]]}:k===2?{cam:[.25,.7],bounds:[[-7.4,0,-3.6],[5.6,1.5,2.3]]}
      :k===3||k===4?close(FOC[k]):k===5?{cam:[.3,.55],bounds:[[COLS[2].x-.6,0,-.6],[COLS[3].x+1.5,.9,2.7]]}:full)});
})();

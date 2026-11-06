// ---- Scene: Fig. 1, three stages of rails around one call (renderer v2). Six steps, one per item of ol#sx-hero.
// The counts are this page's real runs: XSTest's 450 prompts, Mistral-7B-Instruct-v0.1's released answers, Qwen3Guard-Gen-0.6B
// loose as the input rail and as the output rail (GR.outcome, the same model as section 5). The latency columns use published figures
// quoted in section 8 (Prompt Guard 2 86M on an A100; NVIDIA's 0.91 s answer and +0.38 s 8B guard). The tool stage is schematic:
// XSTest has no tools. No attack route is drawn: flows show where requests go and which rail stops them. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  // counts under loose input and output rails
  const C={inU:0,inS:0,outU:0,outS:0,harm:0};
  GR.X.forEach(x=>{const o=GR.outcome(x,{inp:'loose',out:'loose'});
    if(o.st==='in'||o.st==='inpi'){x.unsafe?C.inU++:C.inS++}else if(o.st==='out'){x.unsafe?C.outU++:C.outS++}else if(x.unsafe&&o.res==='answer')C.harm++});
  const pass=GR.X.length-C.inU-C.inS;
  const SX=-5.5,IX=-3.7,MX=-1.6,OX=.6,UX=2.6,TZ=-2.45,PZ=1.85,HS=.008,LS=1.4;
  // latency slices (seconds, published), each beside its stage: input encoder rail, the answer, an 8B output guard
  const LAT=[[.0924,'+92 ms',1,IX+.45,-1.25],[.91,'0.91 s',2,MX-.85,.75],[.38,'+0.38 s',3,OX+.45,-1.25]];
  // a few balls in rows on the floor (individual items: false blocks, misses)
  function balls(R,n,x0,z0,c,a){for(let i=0;i<n;i++){const col=i%5,row=Math.floor(i/5);R.ball([x0+col*.17,.07,z0+row*.17],.07,{c,a})}}
  function plate(R,x,c,a){R.glass([x,.02,-1.1],[0,0,2.2],[0,1.25,0],{c,a,nu:4,nv:5})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-6.6,6.2,-3.3,3,.5);
    const dim=(s)=>k===s?1:k>s?.45:.18; // what this step is about at full strength; the rest recedes
    const vx=k===1?[-6.4,-1.9]:k===2?[-3.6,.2]:k===3?[-1.6,3.8]:[-9,9]; // in a close view, labels of things outside it are not drawn
    const lab=(p,t,o)=>{if(p[0]<vx[0]||p[0]>vx[1])return;if(nar&&!o.ph)return;R.label(p,t,o)};
    // the requests and where they end up
    R.box([SX,0,0],[.9,.6,1.0],{fill:mix(P.paper,P.c1,.15),a:k===0?1:.5});lab([SX,.6,0],'450 prompts',{ph:k===0,fs:12.5,b:1,dy:-11,a:k===0?1:.6});
    if(k===0)lab([SX,0,.5],'250 safe · 200 unsafe',{fs:12,c:P.mute,dy:16,a:e});
    R.box([UX,0,0],[.9,.6,1.0],{fill:mix(P.paper,P.good,.15),a:k>=3?1:.35});lab([UX,.6,0],'user',{ph:k>=3,fs:12.5,b:1,dy:-11,a:k>=3?1:.4});
    // the model, and the tools behind it
    R.box([MX,0,0],[1.1,.9,1.2],{a:k===2?1:k<2?.35:.6});lab([MX,.9,0],'model',{ph:k===2,fs:13,b:1,dy:-11,a:k===2?1:.55});
    const ta=k===2?at(k,e,2):k>2?.4:0;
    if(ta>0){R.box([MX,0,TZ],[1.0,.5,.7],{fill:mix(P.paper,P.c6,.15),a:ta});lab([MX-.55,.25,TZ],'tools',{ph:k===2,al:'right',dx:-6,fs:12.5,b:1,a:ta});
      R.glass([MX-.65,.02,-1.5],[1.3,0,0],[0,.95,0],{c:P.c6,a:ta,nu:5,nv:4});lab([MX+.7,.95,-1.5],'action rail',{ph:k===2,al:'left',dx:6,fs:12.5,b:1,c:P.c6,a:ta})}
    // the two classifier stages as glass plates
    plate(R,IX,P.c1,k===0?.3:dim(1));lab([IX,1.27,-1.1],'input rail',{ph:k<=1,fs:12.5,b:1,c:P.c1,dy:-10,a:Math.max(.4,dim(1))});
    plate(R,OX,P.c4,k<3?.18:dim(3));lab([OX,1.27,-1.1],'output rail',{ph:k===3,fs:12.5,b:1,c:P.c4,dy:-10,a:k<3?.35:Math.max(.4,dim(3))});
    // flows: the traffic, thinner after each stage (dot count follows how many items move)
    const n=v=>Math.max(2,Math.round(v/30));
    R.flow([[SX+.45,.35,0],[IX-.05,.35,0]],{c:P.c1,r:.07,n:n(450),a:k===0?1:.35});
    if(k>=1)R.flow([[IX+.05,.35,0],[MX-.6,.35,0]],{c:P.c1,r:.06,n:n(pass),a:k===1?e:.35});
    if(k===1)R.flowArc([IX,.45,.4],[IX,C.inU*HS+.1,PZ-.1],.35,{c:P.good,r:.06,n:6,a:e});
    if(k===2){R.flow([[MX+.25,.4,-.62],[MX+.25,.4,TZ+.38]],{c:P.c6,r:.06,n:5,speed:1.1,a:e});R.flow([[MX-.25,.35,TZ+.38],[MX-.25,.35,-.62]],{c:P.bad,r:.06,n:5,speed:1.1,a:e});
      lab([MX-.25,.6,-1.95],'tool output · untrusted',{fs:12,c:P.bad,al:'right',dx:-8,a:e,wide:1})}
    if(k>=3){R.flow([[MX+.55,.35,0],[OX-.05,.35,0]],{c:P.c1,r:.06,n:n(pass),a:k===3?e:.35});R.flow([[OX+.05,.35,0],[UX-.45,.35,0]],{c:P.c1,r:.06,n:n(pass-C.outU-C.outS),a:k===3?e:.35})}
    if(k===3){R.flowArc([OX,.45,.4],[OX,.1,PZ-.1],.35,{c:P.c4,r:.06,n:4,a:e});lab([OX,0,1.1],'block · redact · regenerate',{fs:12,c:P.c4,dy:16,a:e,wide:1})}
    // what each rail stopped: unsafe prompts as a column (green: the rail did its job), safe ones as yellow balls (false blocks)
    const pa1=k===1?e:k>=2?(k===4?1:.55):0,pa3=k===3?e:k>3?(k===4?1:.55):0;
    if(pa1>0){R.box([IX,0,PZ],[.5,Math.max(.03,C.inU*HS*(k===1?e:1)),.5],{fill:P.good,a:pa1*(k===4?.45:1)});lab([IX-.3,C.inU*HS,PZ],C.inU+' unsafe stopped',{ph:k===1,al:'right',dx:-6,fs:12,b:1,c:P.good,a:pa1,grp:'p1'});
      balls(R,C.inS,IX+.45,PZ-.2,P.c5,pa1);lab([IX+1.2,.1,PZ],C.inS+' safe blocked',{ph:k===1||k===4,al:'left',dx:4,fs:12,b:1,c:P.c5,a:pa1})}
    if(pa3>0){R.box([OX,0,PZ],[.5,Math.max(.03,C.outU*HS),.5],{fill:P.good,a:pa3*(k===4?.45:1)});lab([OX-.3,.05,PZ],C.outU+' harmful stopped',{ph:k===3,al:'right',dx:-6,fs:12,b:1,c:P.good,a:pa3,grp:'p3'});
      balls(R,C.outS,OX+.45,PZ-.2,P.c5,pa3);lab([OX+1.2,.1,PZ],C.outS+' safe blocked',{ph:k===3||k===4,al:'left',dx:4,fs:12,b:1,c:P.c5,a:pa3})}
    // what got through: the misses at the user
    if(k>=4){const a=k===4?e:.6;balls(R,C.harm,UX-.3,1.0,P.bad,a);lab([UX,.6,0],C.harm+' harmful delivered',{ph:k===4,fs:12.5,b:1,c:P.bad,dy:-30,a})}
    // latency: each stage stands beside its own slice (published figures, section 8); in series they add up
    LAT.forEach(([sec,t,from,x,z])=>{const h=sec*LS,a=k<from?0:k===from?e:k===4?.35:.6;
      if(a>0){R.box([x,0,z],[.3,Math.max(.02,h*(k===from?e:1)),.3],{fill:mix(P.paper,from===2?P.mute:from===1?P.c1:P.c4,.45),a});lab([x+.15,h,z],t,{ph:k===from,al:'left',dx:6,fs:12,b:k===from,c:from===2?P.mute:from===1?P.c1:P.c4,a})}});
    if(k===3)lab([OX+.55,.53+.25,-1.25],'in series: about 1.38 s',{al:'left',dx:6,dy:-16,fs:12,c:P.mute,a:e,wide:1});
    // the boundary outside the model: around the tools, controls that do not classify
    if(k===5){const a=e,x0=MX-.8,x1=MX+.8,z0=TZ-.6,z1=TZ+.5,h=.9,o={c:P.acc,a:a*.8,nu:5,nv:3,th:.03};
      R.glass([x0,0,z0],[x1-x0,0,0],[0,h,0],o);R.glass([x0,0,z0],[0,0,z1-z0],[0,h,0],o);R.glass([x1,0,z0],[0,0,z1-z0],[0,h,0],o);R.glass([x0,0,z1],[x1-x0,0,0],[0,h,0],{c:P.acc,a:a*.5,nu:5,nv:3,th:.03});
      lab([x1+.1,h,z0],'gate · egress · credentials',{ph:1,al:'left',dx:6,fs:12.5,b:1,c:P.acc,a});lab([x1+.1,h,z0],'no false-negative rate',{al:'left',dx:6,dy:16,fs:12,c:P.acc,a,wide:1})}
  }
  const full={cam:[.28,.8],bounds:[[-6.1,0,-3.1],[3.6,1.4,2.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · 450 real prompts through three stages of rails',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,16,16],
    // step 2 moves in close on the input rail, step 3 on the model and its tools, step 4 on the output rail
    view:k=>k===1?{cam:[.35,.72],bounds:[[-6.1,0,-1.4],[-1.6,1.5,2.5]]}:k===2?{cam:[.45,.78],bounds:[[-3.4,0,-3.2],[.3,1.2,1.3]]}:k===3?{cam:[.3,.72],bounds:[[-1.4,0,-1.4],[3.6,1.4,2.5]]}:full});
})();

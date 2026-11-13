// ---- Scene (Fig. 6, paged optimizers): finetuning memory to scale, then LLaMA 65B on one 48 GB GPU with and without paging (renderer v2) ----
// Data: step 1 is the page's own accounting, the same as the Problem section's bars (PAPER.rc.llama from recompute.py: LLaMA 65B recounted
// from its configuration; BF16 weights and gradients 2 bytes each, FP32 Adam moments 8 bytes, NF4 + DQ at 4.127 bits for the linear layers,
// LoRA r = 64 on all seven linear layers). Step 2 and the static memory are the paper's Figure 6 printed labels (QD.fig.figure6), with the
// weight gradients equal to the adapters (BF16). The activations are an ILLUSTRATIVE formula, not the paper's (the caption on the left
// gives it), and the eight mini-batch lengths are illustrative; paging time is not modelled. Heights are to scale within each step.
(function(){
  if(!document.getElementById('stg-pg')||!window.S3||!window.QD)return;const {at,off,mix,lerp,cl}=S3;
  const QD=window.QD,RC=(window.PAPER||{}).rc||{},LL=RC.llama||{},F6=QD.fig.figure6;
  // ---- the numbers (also read by check_stages.mjs through window.QL_PG) ----
  const L65=LL['65B'],GB=1e9;
  const towers=L65?[['16-bit full',[[L65.total*2,'c1'],[L65.total*2,'c2'],[L65.total*8,'c3']]],['16-bit LoRA',[[L65.total*2,'c1'],[L65.lora_r64_all*4,'c2'],[L65.lora_r64_all*8,'c3']]],
    ['QLoRA',[[L65.linear*(4+.127)/8+L65.other*2,'c1'],[L65.lora_r64_all*4,'c2'],[L65.lora_r64_all*8,'c3']]]].map(([n,p])=>({n,p:p.map(([v,c])=>[v/GB,c]),t:p.reduce((s,x)=>s+x[0],0)/GB})):[];
  const SIZES=['7B','13B','33B','65B'],f6=SIZES.map(m=>({m,p:[[F6.model_MB[m],'c1'],[F6.adapters_MB[m],'c2'],[F6.adapters_MB[m],'c2'],[F6.optimizer_MB[m],'c3']].map(([v,c])=>[v/1000,c]),t:F6.totals_GB[m]}));
  const BUD=48000,h=8192,NL=80,NH=64,act=T=>(2*h*NL*T+6*NH*T*T)/1e6,LENS=[512,384,1024,512,2048,640,3072,512];
  const ST={model:F6.model_MB['65B'],ad:F6.adapters_MB['65B'],wg:F6.adapters_MB['65B'],opt:F6.optimizer_MB['65B']};ST.all=ST.model+ST.ad+ST.wg+ST.opt;
  const sim=LENS.map(T=>{const a=act(T),peak=ST.all+a,need=Math.max(0,peak-BUD);return {T,a,peak,evict:Math.min(ST.opt,need),oom:need>ST.opt}});
  const traffic=sim.reduce((s,b)=>s+2*b.evict,0),firstOOM=sim.findIndex(b=>b.peak>BUD);
  window.QL_PG={towers:towers.map(t=>({n:t.n,gb:t.t})),f6:f6.map(t=>({m:t.m,gb:t.t})),static:ST.all,head:BUD-ST.all,sim,traffic,firstOOM,peak3:Math.max(...sim.slice(0,4).map(b=>b.peak))};
  // which mini-batches each step plays (the long-replay rule: eight mini-batches in four explained stretches)
  const STR={3:[0,1,2,3],4:[4],5:[5,6],6:[7]};
  let mode='on';
  // ---- layout
  const H=2.6,ysA=H/(towers.length?Math.max(...towers.map(t=>t.t)):1),ysB=H/48,ysC=H/50; // world units per GB: step 1, step 2, steps 3+
  const GX=.2,CX=2.3,TW=.9,HX0=-3.5,HS=.42; // the GPU stack, CPU RAM, the history row of peaks
  function stack(R,x,z,parts,ys,a,w,lab){let y=0;parts.forEach(([v,c],i)=>{const hh=v*ys;if(hh>.002)R.box([x,y,z],[w,hh,w],{fill:mix(R.P.paper,R.P[c],i===2&&parts.length===4?.35:.6),a,shadow:i===0});y+=hh});return y}
  function draw(R,k,e,st){const P=R.P;R.grid(-4.2,3.8,-2,2,.5);
    // 1. LLaMA 65B three ways, one scale
    const a0=k===0?1:k===1?1-e:0;
    if(a0>.01){towers.forEach((t,i)=>{const x=-2+i*2,top=stack(R,x,0,t.p,ysA,a0,.95);R.label([x,top,0],t.t.toFixed(1)+' GB',{mono:true,fs:12.5,b:1,dy:-12,a:a0});
        R.label([x,0,.5],t.n,{fs:12.5,dy:16,a:a0})});
      const y=48*ysA;R.quad([[-3,y,-.7],[3,y,-.7],[3,y,.7],[-3,y,.7]],{fill:P.bad,a:a0,fa:.18,ec:P.bad,ea:.8,lw:1.2});R.label([3,y,0],'one 48 GB GPU',{mono:true,fs:12,b:1,c:P.bad,al:'left',dx:8,a:a0})}
    // 2. the paper's Figure 6: QLoRA at 7B to 65B against 24 and 48 GB
    const a1=k===1?e:k===2?1-e:0;
    if(a1>.01){f6.forEach((t,i)=>{const x=-2.4+i*1.6,top=stack(R,x,0,t.p,ysB,a1,.8);if(k<=2)R.label([x,top,0],t.t.toFixed(1)+' GB',{mono:true,fs:12.5,b:1,dy:-12,a:a1});
        if(k<=2)R.label([x,0,.45],'LLaMA '+t.m,{fs:12.5,dy:16,a:a1})});
      if(k<=2)[[24,'24 GB'],[48,'48 GB']].forEach(([g,l])=>{const y=g*ysB;R.quad([[-3.3,y,-.6],[3.2,y,-.6],[3.2,y,.6],[-3.3,y,.6]],{fill:P.bad,a:a1,fa:.12,ec:P.bad,ea:.7,lw:1});
        R.label([3.2,y,0],l,{mono:true,fs:12,b:1,c:P.bad,al:'left',dx:8,a:a1})})}
    if(k<2)return;
    // 3. 65B on one 48 GB GPU, CPU RAM beside it; heights on one scale from here on
    const a2=k===2?e:1,ys=ysC,cur=STR[k]||[],nb=cur.length,u=k===2?0:e*nb,j=Math.min(nb-1,Math.floor(u)),f=u-j; // the mini-batch playing now and its phase
    const dead=mode==='off'&&k>=4;
    const b=k>=3?sim[cur[Math.max(0,j)]]:null,phase=k>=3?Math.sin(Math.PI*Math.min(1,f*1.15)):0;
    // the activation of the batch playing now (rises in its backward pass, freed after); a paged batch holds its peak at the end of the step
    const last=k>=3&&j===nb-1,hold=last&&b&&b.evict>0&&mode==='on'||dead,aNow=b?b.a*(hold&&f>.5?1:phase):0;
    const out=mode==='on'&&b?b.evict*(hold&&f>.5?1:phase):0;
    // the GPU: the card's 48 GB as a glass lid and four posts
    const y48=48*ys;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sz])=>R.line([[GX+sx*.62,0,sz*.62],[GX+sx*.62,y48,sz*.62]],{c:P.bad,w:1,a:a2*.6}));
    R.glass([GX-.62,y48,-.62],[1.24,0,0],[0,0,1.24],{c:P.bad,a:a2*.75,nu:2,nv:2,th:.01});R.label([GX+.62,y48,-.62],'GPU · 48 GB',{mono:true,fs:12.5,b:1,c:P.bad,al:'left',dx:8,a:a2});
    const parts=[ [ST.model/1000,'c1'],[ST.ad/1000,'c2'],[ST.wg/1000,'c2'],[(ST.opt-out)/1000,'c3']];
    const top=stack(R,GX,0,parts,ys,a2,TW);
    if(k===2){let y=0;[['model · NF4',ST.model],['adapters',ST.ad],['their gradients',ST.wg],['Adam',ST.opt]].forEach(([l,v])=>{R.label([GX+TW/2,(y+v/2000)*ys,TW/2],l+' · '+v.toLocaleString('en-GB')+' MB',{mono:true,fs:12,al:'left',dx:8,a:e,grp:'st'});y+=v/1000})}
    if(aNow>1){const hh=aNow/1000*ys,over=top+hh>y48+1e-6;R.box([GX,top,0],[TW*.92,hh,TW*.92],{fill:dead&&over?P.bad:mix(P.paper,P.c4,.6),a:1,shadow:false});
      R.label([GX+TW/2,top+hh,TW/2],R.W<520?'activations':'activations (illustrative)',{mono:true,fs:12,al:'left',dx:8,c:P.c4})}
    if(dead&&f>.5)R.label([GX,y48+.5,0],'out of memory: the run stops',{fs:13.5,b:1,c:P.bad,dy:-6});
    // CPU RAM: a floor and a dashed outline; Adam's pages land there when the GPU runs short
    R.quad([[CX-.6,.005,-.6],[CX+.6,.005,-.6],[CX+.6,.005,.6],[CX-.6,.005,.6]],{fill:P.soft,a:a2,ec:P.mute,ea:.8,dash:[5,4]});R.label([CX,0,.6],'CPU RAM',{mono:true,fs:12.5,b:1,dy:16,c:P.mute,a:a2});
    if(out>1){const hh=out/1000*ys;R.box([CX,0,0],[TW*.9,hh,TW*.9],{fill:mix(P.paper,P.c3,.6)});R.label([CX+TW/2,hh,0],Math.round(out).toLocaleString('en-GB')+' MB of Adam',{mono:true,fs:12,b:1,al:'left',dx:8,c:P.c3});
      R.flowArc([GX+.3,top-.2,0],[CX-.2,hh+.05,0],.6,{c:P.c3,r:.06,n:8,speed:1.1})}
    // the history: each mini-batch's peak as a column at the back, against 48 GB
    const done=k<3?0:Object.keys(STR).filter(s=>+s<k).reduce((a,s)=>a+STR[s].length,0)+j+(f>.5?1:0);
    if(k>=3){const z=0;R.quad([[HX0-.2,y48,z-.25],[HX0+7*HS+.2,y48,z-.25],[HX0+7*HS+.2,y48,z+.25],[HX0-.2,y48,z+.25]],{fill:P.bad,a:1,fa:.1,ec:P.bad,ea:.6,dash:[4,3]});
      R.label([HX0+3.5*HS,0,z+.3],'peak per mini-batch',{mono:true,fs:12,dy:16,c:P.mute});
      sim.forEach((s,i)=>{if(i>=done)return;const stop=mode==='off'&&i>firstOOM;if(stop)return;const c=mode==='off'&&s.peak>BUD?P.bad:s.evict>0?P.c5:P.c3;
        const hh=Math.min(s.peak,56000)/1000*ys;R.box([HX0+i*HS,0,z],[.28,hh,.3],{fill:mix(P.paper,c,.6),shadow:false,lw:.6});
        if(i===done-1)R.label([HX0+i*HS,hh,z],s.T+' tokens',{mono:true,fs:12,b:1,dy:-12,c:P.ink})})}
    if(k===6&&mode==='on')R.label([CX,1.4,0],'page traffic: '+Math.round(traffic).toLocaleString('en-GB')+' MB',{fs:13,b:1,c:P.c3,a:e});
  }
  const full={cam:[.28,.55],bounds:[[-3.2,0,-.9],[3.4,2.8,.9]]};
  const stg=S3.stage({id:'stg-pg',list:'sx-pg-on',fig:'Fig. 6 · memory to scale, then paging on LLaMA 65B',cam:full.cam,bounds:full.bounds,aspect:.62,dur:3200,hold:4600,draw,
    view:k=>k>=2?{cam:[.12,.45],bounds:[[-3.8,0,-.8],[3.2,3.1,.8]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,40,18,110]});
  // the optimizer toggle swaps the step list and replays (the one exception to "stops for good on a reader control")
  const M=document.getElementById('pgM');if(M&&stg)M.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    ['on','off'].forEach(m=>{const l=document.getElementById('sx-pg-'+m);if(l)l.hidden=m!==mode});stg.list('sx-pg-'+mode)}));
})();

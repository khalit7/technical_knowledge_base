// ---- Scene: Algorithm 1 on the trained toy DiffusionGemma, in 3D (renderer v2, 2026-11-13) ----
// One held-out problem (TOY.demo, picked by mk_toydata.py) decoded in the browser by the page's own model (22_js_model.js):
// the multinomial toy with the paper's sampler defaults (b = 0.1, N = 48, stop at mean entropy 0.005, tau 0.8 to 0.4, seed 1),
// then the same weights decoding autoregressively. Across: the 24 answer positions, three canvases of 8. Into the depth: forward passes,
// one row per pass. Bar height: the decoder's confidence in its top token; blue: accepted by the entropy budget; faint: re-noised.
// Teal at the front: the KV cache (the prompt, then each finished canvas once appended). Green diagonal: AR mode, one pass per token.
(function(){
  if(!document.getElementById('stg-samp'))return;const {at,off,lerp,mix,cl}=S3;
  const C=TD.C,K=TD.K,NB=TD.NB,voc=TD.vocab;
  const OPTS={N:48,b:0.1,estop:0.005,tmax:0.8,tmin:0.4,sc:true,seed:1};
  let D=null;
  // the run, the problem and a timeline of forward passes: {p (1-based pass number), kind 'den'|'app', k canvas, fr frame}
  window.SAMPDATA=function(){if(D)return D;const T=window.TOY||{},dm=T.demo||{task:'seq',rule:TD.testRules[3],bits:[0,1,1]};
    const pb=TD.problem(dm.task,dm.rule,dm.bits),M=TD.load('multinomial'),run=TD.diffuse(M,pb.prompt,OPTS),ar=TD.autoregress(M,pb.prompt);
    const ev=[];let p=0,lastK=0;run.frames.forEach(fr=>{if(fr.k!==lastK){ev.push({p:++p,kind:'app',k:lastK});lastK=fr.k}ev.push({p:++p,kind:'den',k:fr.k,fr})});
    // revisions: an accepted position whose accepted token changes at the next pass of the same canvas
    const rev=[];for(let j=1;j<run.frames.length;j++){const a=run.frames[j-1],b=run.frames[j];if(a.k!==b.k||!a.U||!b.U)continue;for(let i=0;i<C;i++)if(a.U[i]&&b.U[i]&&a.next[i]!==b.next[i])rev.push({k:b.k,n:b.n,i,from:a.next[i],to:b.next[i],conf:b.conf[i]})}
    const ok=run.ans.filter((t,i)=>t===pb.ref[i]).length,okAR=ar.ans.filter((t,i)=>t===pb.ref[i]).length;
    return D={dm,pb,run,ar,ev,rev,ok,okAR,acc:run.frames.map(f=>f.U?f.U.filter(Boolean).length:null),tok:t=>voc[t]}};
  // which passes each step adds (by pass number); step 7 adds the AR diagonal
  function plan(){const d=SAMPDATA(),c0=d.ev.filter(e=>e.k===0&&e.kind==='den'),n0=c0.length;
    return [[],[1],[2,3,4].filter(p=>p<=n0),c0.slice(4).map(e=>e.p),d.ev.filter(e=>e.kind==='app'&&e.k===0).map(e=>e.p),d.ev.filter(e=>e.k>0||(e.kind==='app'&&e.k>0)).map(e=>e.p).filter(p=>p>n0+1),[]]}
  const XS=.62,GAP=.5,DZ=.58,ZC=1.45,ZN=.62,HM=.62,BW=.48,BD=.3;
  const x=i=>(i-11.5)*XS+(Math.floor(i/C)-1)*GAP,z=p=>-(p-1)*DZ-.15,PX0=-10.05,PX1=x(0)-BW/2-.35;
  function draw(R,k,e){const P=R.P,d=SAMPDATA(),PL=plan();R.grid(-10.5,8.5,-13.6,2.2,.5);
    // how far pass p has arrived at step k (passes added in one step come in one after another)
    const born={};PL.forEach((ps,s)=>ps.forEach((p,j)=>born[p]={s,j,n:ps.length}));
    const arr=p=>{const b=born[p];if(!b)return 0;if(k>b.s)return 1;if(k<b.s)return 0;return cl(e*b.n-b.j,0,1)};
    const last=Math.max(0,...d.ev.filter(v=>arr(v.p)>0).map(v=>v.p));
    const dim=k===6?.3+.7*(1-e):1;
    // the KV cache at the front: the prompt (45 tokens, encoded once), then each canvas once appended
    const pa=k===0?.35+.65*e:1;
    R.box([(PX0+PX1)/2,0,ZC],[PX1-PX0,.16,.42],{fill:mix(P.paper,P.k,.55),a:pa});
    if(k===0)R.label([(PX0+PX1)/2,.16,ZC],'causal encoder: one pass over the prompt',{al:'left',dx:-40,dy:-22,mono:true,fs:12,c:P.ink,a:e});
    R.label([(PX0+PX1)/2,0,ZC+.21],'prompt · 45 tokens',{mono:true,fs:12,dy:12,c:P.k,a:pa});
    R.label([PX0,.08,ZC],'KV cache',{al:'right',dx:-8,mono:true,fs:12,b:1,c:P.k,wide:1});
    if(k===0)R.flow([[PX0+.1,.2,ZC],[PX1-.1,.2,ZC]],{c:P.k,a:e,r:.06,speed:1.4,n:7});
    for(let kk=0;kk<K;kk++){const ap=d.ev.find(v=>v.kind==='app'&&v.k===kk),f=ap?arr(ap.p):0;
      for(let i=kk*C;i<kk*C+C;i++){R.box([x(i),0,ZC],[BW,.16,.42],{fill:mix(P.paper,P.k,.55*f),a:(.25+.75*f)*(k===6?1:1),fa:f>0?1:.15,shadow:f>0});}
      const head=d.ev.find(v=>v.k===kk&&v.kind==='den'),ha=head?Math.max(arr(head.p),kk===0&&k===0?e:0):0;
      const show=k===6||(k<=4?kk===0:kk>0);if(show)R.label([x(kk*C+3.5),0,ZC+.21],'canvas '+(kk+1),{mono:true,fs:12,dy:12,b:1,c:P.ink,a:Math.max(.35,ha)*(k===0&&kk>0?.5:1)});
      // appending: the finished canvas streams into its cache cells
      if(ap&&born[ap.p]&&k===born[ap.p].s&&f>0){const fin=d.ev.filter(v=>v.k===kk&&v.kind==='den').pop();for(let i=kk*C;i<kk*C+C;i+=1)R.flowArc([x(i),HM*.6,z(fin.p)],[x(i),.2,ZC],.5,{c:P.k,a:Math.min(1,f*2),r:.05,n:4,speed:1.6})}}
    // canvas 1's starting noise: eight random tokens (step 2 only)
    {const f0=d.run.frames[0],na=k===1?Math.min(1,e*2):k===2?off(k,e,2):0;if(na>0)for(let i=0;i<C;i++){R.box([x(i),0,ZN],[BW,.03,.3],{fill:P.soft,a:na,shadow:false});R.label([x(i),.03,ZN],d.tok(f0.x[i]),{mono:true,fs:12,dy:-8,c:P.mute,a:na,wide:1})}
      if(na>0)R.label([x(0)-BW/2,.03,ZN],'noise in',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:na,grp:'rows'})}
    // denoising passes: one row of eight bars per pass
    d.ev.forEach(v=>{if(v.kind!=='den')return;const f=arr(v.p);if(f<=0)return;const fr=v.fr,cur=v.p===last&&k<6,final=!fr.U;
      const cvLast=d.ev.filter(w=>w.k===v.k&&w.kind==='den').pop().p===v.p;const a=(cur||final&&cvLast?1:.55)*dim;
      for(let i=0;i<C;i++){const g=v.k*C+i,acc=final||fr.U[i],h=.06+HM*fr.conf[i]*f;
        const isRev=d.rev.some(r=>r.k===v.k&&r.n===fr.n&&r.i===i)&&k>=3;
        R.box([x(g),0,z(v.p)],[BW,h,BD],{fill:acc?(isRev?P.c2:P.c1):P.paper,a:isRev&&k===3?1:a*(acc?1:.75),fa:acc?1:.35,shadow:false,dz:isRev&&k===3?-.05:0});
        if(cur&&!isRev&&f>.6){const t=final?fr.xhat[i]:fr.U[i]?fr.next[i]:null;if(t!=null)R.label([x(g),h,z(v.p)],d.tok(t),{mono:true,fs:12.5,dy:-9,b:1,c:isRev?P.c2:P.c1,a:f})}}
      if(cur)R.label([x(v.k*C)-BW/2,.3,z(v.p)],'pass '+v.p+(final?' · stop':' · '+fr.U.filter(Boolean).length+' of 8 kept'),{al:'right',dx:-8,mono:true,fs:12,c:P.ink,grp:'rows',a:f});
      // the decoder reads the cache: dots stream from the cache into the pass being computed
      if(cur&&k>=1){for(let i=0;i<C;i+=2)R.flowArc([(PX0+PX1)/2+(i-3)*.2,.2,ZC],[x(v.k*C+i),.3,z(v.p)],.6,{c:P.k,a:.85-.4*f,r:.05,n:5,speed:1.8})}});
    // the revision, named
    if(k===3){d.rev.forEach(r=>{const v=d.ev.find(w=>w.kind==='den'&&w.k===r.k&&w.fr.n===r.n);if(!v||arr(v.p)<.6)return;R.label([x(C-1)+BW/2,.3,z(v.p)],'revised '+d.tok(r.from)+' → '+d.tok(r.to),{al:'left',dx:6,mono:true,fs:12,b:1,c:P.c2,wide:1})})}
    // AR mode: the same weights, one pass per token, a diagonal 24 passes deep
    if(k===6){const n=d.ar.frames.length;d.ar.frames.forEach((fr,i)=>{const f=cl(e*n-i,0,1);if(f<=0)return;R.box([x(i),0,z(i+1)],[BW,.06+HM*fr.conf*f,BD],{fill:P.c3,a:.95,shadow:false})});
      const tip=Math.min(n,Math.max(1,Math.ceil(e*n)));R.flow([...Array(tip)].map((_,i)=>[x(i),HM+.1,z(i+1)]),{c:P.c3,a:.9,r:.06,n:tip,speed:1.6});
      R.label([x(n-1),HM,z(n)],'AR: '+n+' passes',{mono:true,fs:12.5,b:1,dy:-12,c:P.c3,a:cl(e*1.4-.3,0,1)});
      const dl=d.ev[d.ev.length-1];R.label([x(NB-4.5),HM,z(dl.p)],'diffusion: '+d.run.fwd+' passes',{mono:true,fs:12.5,b:1,dy:-16,c:P.c1})}
  }
  function counters(k){const d=SAMPDATA(),PL=plan(),passes=k===6?d.ar.fwd:PL.slice(0,k+1).reduce((s,ps)=>s+ps.length,0);
    const done=d.ev.filter(v=>v.kind==='den'&&!v.fr.U&&PL.slice(0,k+1).flat().includes(v.p)).length*C,toks=k===6?NB:done;
    const el=document.getElementById('sampCnt');if(!el)return;
    el.innerHTML=k===6?stat('Forward passes',d.ar.fwd+' AR','against '+d.run.fwd+' diffusion')+stat('Final tokens',NB+' / '+NB,'one per pass')+stat('TPF','1.00','against '+(NB/d.run.fwd).toFixed(2))+stat('Correct bits',d.okAR+' / '+NB,'AR mode'):
      stat('Forward passes',passes,'denoise + append')+stat('Final tokens',toks+' / '+NB,'canvases done')+stat('TPF so far',passes?(toks/passes).toFixed(2):'0','AR = 1')+stat('Correct bits',k>=5?d.ok+' / '+NB:'...','against the rule')}
  const W0=-10.3,W1=8.2,full={cam:[.1,.95],bounds:[[W0,0,z(24)-.3],[W1,.8,1.9]]};
  const st=S3.stage({id:'stg-samp',list:'sx-samp',fig:'Fig. 1 · Algorithm 1 on the toy, pass by pass',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,34,120],
    view:k=>{const d=SAMPDATA(),n0=d.ev.filter(v=>v.k===0&&v.kind==='den').length;
      if(k===0)return {cam:[.1,.8],bounds:[[W0,0,-.4],[x(C-1)+.4,.6,1.9]]};
      if(k>=1&&k<=4)return {cam:[.12,.9],bounds:[[W0,0,z(n0+1)-.3],[x(C-1)+2.2,.8,1.9]]};
      if(k===5)return {cam:[.12,.9],bounds:[[x(0)-.6,0,z(d.run.fwd)-.4],[x(NB-1)+.6,.8,1.9]]};
      return full},
    onStep:k=>{try{counters(k)}catch(err){}}});
  // the problem, stated under the step list
  try{const d=SAMPDATA(),el=document.getElementById('sampProb');if(el)el.innerHTML='Task <b>'+d.dm.task+'</b>, held-out rule table '+d.dm.rule+', start bits '+d.dm.bits.join(' ')+'; reference answer <span class="mono">'+d.pb.ref.join('').replace(/(.{8})/g,'$1 ').trim()+'</span>.'}catch(err){}
})();

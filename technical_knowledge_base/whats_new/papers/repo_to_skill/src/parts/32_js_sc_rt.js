// ---- Scene: the released Researcher session's skill reads through the library (renderer v2). Everything is the release's own data (LIB):
// the 20 areas as towers of their families (height: repository memberships), the 51 repositories of Inference Serving, the vLLM and SGLang
// graphs file by file (tile width: bytes, one scale for both), the session's 16 library reads grouped by their time stamp, and the bytes in context.
(function(){
  if(!document.getElementById('stg-rt'))return;const {at,off,lerp,mix}=S3;
  const R0=LIB.reads.filter(r=>r[3]),short=p=>p.replace('repositories/repo-skills-router/','router/').replace('repositories/repo-skills/','');
  const G=[];R0.forEach(r=>{let g=G.find(x=>x.t===r[0]);if(!g){g={t:r[0],f:[]};G.push(g)}g.f.push({p:short(r[1]),b:r[2]})});
  G.forEach((g,i)=>{g.b=g.f.reduce((a,f)=>a+f.b,0);g.cum=(i?G[i-1].cum:0)+g.b});
  const READ=new Set(R0.map(r=>short(r[1])));
  const AR=LIB.areas.map(a=>({n:a.n,f:a.f.map(f=>({n:f.n,m:f.m.length})).sort((x,y)=>y.m-x.m)})).map(a=>Object.assign(a,{t:a.f.reduce((s,f)=>s+f.m,0)})).sort((a,b)=>b.t-a.t);
  const AMX=AR[0].t,HS=1.5/AMX,XA=i=>-4.75+i*.5,ZL=-2.7,IA=AR.findIndex(a=>a.n==='Model Deployment and Optimization');
  const FAM=LIB.areas[LIB.areas.findIndex(a=>a.n==='Model Deployment and Optimization')].f.find(f=>f.n==='Inference Serving');
  const REP=FAM.m.slice().sort((x,y)=>LIB.repos[x][0].localeCompare(LIB.repos[y][0])),ZF=-1.55,XF=j=>XA(IA)+(j-(REP.length-1)/2)*.1;
  // the two graphs: one row per skill (entry first), files along x, width to scale (1 unit = 25,000 bytes)
  const BS=1/25000,GR={};
  [['vllm',-4.7],['sglang',-1.2]].forEach(([g,x0])=>{const rows={};LIB.detail[g].forEach(([p,b])=>{const m=p.match(/^sub-skills\/([^/]+)\//);const k=m?m[1]:'';(rows[k]=rows[k]||[]).push([p,b])});
    const keys=Object.keys(rows).sort((a,b)=>a===''?-1:b===''?1:a.localeCompare(b));const T=[];
    keys.forEach((k,ri)=>{let x=x0;rows[k].sort((a,b)=>(b[0].endsWith('SKILL.md')?1:0)-(a[0].endsWith('SKILL.md')?1:0)).forEach(([p,b])=>{const w=Math.max(.02,b*BS);
      T.push({p:g+'/'+p,b,x:x+w/2,w,z:-.55+ri*.34,kind:p.endsWith('SKILL.md')?'s':/(^|\/)scripts\//.test(p)?'x':'r'});x+=w+.015})});
    GR[g]={T,x0,total:LIB.detail[g].reduce((a,x)=>a+x[1],0)}});
  // which read step opened each file (steps 4 to 6 open graph files)
  const STEP={};G.forEach((g,i)=>g.f.forEach(f=>STEP[f.p]=i));
  const CX=.4,CZ=2.0,CH=1.4/70000;                 // the context bar: 70,000 bytes = 1.4 units
  window.R2S_RT={groups:G.map(g=>({t:g.t,n:g.f.length,b:g.b,cum:g.cum})),lib:LIB.meta.library_bytes,graphs:{vllm:GR.vllm.total,sglang:GR.sglang.total},fam:REP.length,
    hours:LIB.session.seconds/3600,calls:LIB.session.tool_calls};
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5,-3.3,2.8,.5);
    const libA=k===0?.45:k<=2?1:k===6?.3:k===3?.3*(1-e):0;
    // the library: 20 area towers, each a stack of its families
    AR.forEach((a,i)=>{let y=0;const on=i===IA&&k>=1&&k<=2;a.f.forEach(f=>{const h=f.m*HS,fam=on&&f.n==='Inference Serving';
        R.box([XA(i),y,ZL],[.36,Math.max(.006,h-.006),.36],{fill:fam&&k===2?P.c3:on?mix(P.paper,P.c3,.45):P.paper,a:on?1:libA,shadow:y===0,lw:.6});y+=h});
      if(on&&k===1)R.label([XA(i)-.2,y,ZL],a.n,{al:'right',dx:-8,fs:12.5,b:1,c:P.c3,dy:-6})});
    if(k===1){let y=0;AR[IA].f.forEach(f=>{R.label([XA(IA)+.2,y+f.m*HS/2,ZL],f.n+' ('+f.m+')',{al:'left',dx:10,fs:12,c:P.c3,grp:'fam'});y+=f.m*HS})}
    if(k===0)R.label([XA(10),1.6,ZL],'20 areas · 178 families',{fs:12.5,c:P.mute,wide:1});
    // the router card
    const ra=k===0?1:.35;R.box([-4.2,0,2.0],[.7,.9,.07],{fill:mix(P.paper,P.c3,.25),a:ra});
    for(let y=.2;y<.82;y+=.16)R.line([[-4.44,y,2.04],[-3.96,y,2.04]],{c:P.c3,w:1.3,a:ra*.8});
    R.label([-4.2,.9,2.0],'router SKILL.md',{mono:true,fs:12.5,b:k===0,c:P.c3,dy:-10,a:k===0?1:.6});
    // step 3: the family page lists its 51 repositories; two are picked
    if(k>=2&&k<=3){const fa=k===2?e:.18;REP.forEach((ri,j)=>{const n=LIB.repos[ri][0],pick=n==='vllm-project/vllm'||n==='sgl-project/sglang';
        R.box([XF(j),0,ZF],[.075,pick?.32:.16,.22],{fill:pick?P.c1:mix(P.paper,P.c3,.25),a:pick?Math.max(fa,.8):fa,shadow:false,lw:.5});
        if(pick&&k===2)R.label([XF(j),.32,ZF],n.split('/')[1],{fs:12.5,b:1,c:P.c1,dy:-10,a:e,grp:'pick'})});
      if(k===2)R.label([XF(0)-.1,.1,ZF],'Inference Serving · 51 repositories',{al:'right',dx:-8,fs:12.5,c:P.c3,a:e,wide:1})}
    // steps 4 to 7: the two graphs, every file to scale; a file lights when its step reads it
    if(k>=3){const ga=k===3?e:1;
      Object.entries(GR).forEach(([g,G_])=>{G_.T.forEach(t=>{const s=STEP[t.p],read=s!=null&&s<=k,now=s===k&&k<6,col=t.kind==='s'?P.c1:t.kind==='x'?P.c3:P.c2;
          R.box([t.x,0,t.z],[Math.max(.012,t.w-.01),read?(now?.16+.08*e:.16):.05,.26],{fill:read?col:mix(P.paper,col,.25),a:ga*(read?1:k===6?.3:.55),shadow:false,lw:.5})});
        R.label([G_.x0,.1,-.55],g==='vllm'?'vLLM graph · '+G_.total.toLocaleString('en-GB')+' bytes':'SGLang · '+G_.total.toLocaleString('en-GB'),{al:'left',dx:-4,dy:-24,fs:12.5,b:1,c:P.ink,a:ga})})}
    // flows: this step's reads stream into context
    const src=k===0?[[-4.2,.85,2.0]]:k===1?[[XA(IA),AR[IA].t*HS,ZL]]:k===2?[[XA(IA),.5,ZL]]:k>=3&&k<=5?Object.values(GR).flatMap(G_=>G_.T.filter(t=>STEP[t.p]===k).map(t=>[t.x,.2,t.z])):[];
    const cum=k<6?lerp(k?G[k-1].cum:0,G[k].cum,e):G[5].cum,top=[CX,.05+cum*CH,CZ];
    src.forEach(p=>R.flowArc(p,top,.5,{c:k<=2?P.c3:P.c1,r:.06,n:k<=2?9:5,a:.9}));
    // the context bar on its plinth
    R.box([CX,0,CZ],[.8,.05,.8]);R.box([CX,.05,CZ],[.5,Math.max(.01,cum*CH),.5],{fill:P.c1,shadow:false});
    R.label([CX,.05+cum*CH,CZ],Math.round(cum).toLocaleString('en-GB')+' bytes',{mono:true,fs:12.5,b:1,c:P.c1,dy:-12});
    R.label([CX,0,CZ+.4],k===6?'5.0 h · 193 tool calls':'t = '+G[k].t+' s',{mono:true,fs:12.5,c:P.mute,dy:14});
    if(k===6)R.label([CX+.3,.05+cum*CH*.6,CZ],'0.028% of the library',{al:'left',dx:10,fs:12.5,c:P.mute})}
  const full={cam:[.25,.78],bounds:[[-5.2,0,-3],[4.6,1.6,2.6]]};
  const V=[full,{cam:[.3,.62],bounds:[[-3.2,0,-3],[1.9,1.6,2.5]]},{cam:[.3,.62],bounds:[[-3.4,0,-3],[2,1.4,2.5]]},
    {cam:[.2,.62],bounds:[[-5,0,-1.6],[1.6,1.2,2.6]]},{cam:[.2,.62],bounds:[[-5,0,-1],[1.6,1.2,2.6]]},{cam:[.2,.62],bounds:[[-5,0,-1],[1.6,1.2,2.6]]},full];
  S3.stage({id:'stg-rt',list:'sx-rt',fig:'The released session · 16 library reads',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5000,draw,view:k=>innerWidth<520?{cam:[V[k].cam[0],Math.min(1.2,V[k].cam[1]+.35)],bounds:V[k].bounds}:V[k],
    margin:w=>w<520?[16,10,14,10]:[18,14,14,30]});
})();

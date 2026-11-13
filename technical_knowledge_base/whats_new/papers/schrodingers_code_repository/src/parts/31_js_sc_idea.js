// ---- Scene: how SchrodingerRepo redraws a repository per run (renderer v2: glass plate for the translator, flowing dots for commands and outputs,
// camera in close on the reordered file). Data: four files of the case-study task django__django-11999 at its base commit (REPO.ex.tree), renamed
// with Figure 4's renamings through the ported release (SR.apply with REPO.fig.mapping); Level 3 on the real 35 top-level definitions of
// fields/__init__.py (REPO.ex.top_run: their line counts and definition-time dependencies) with seed 1 of the released algorithm (SR.topoOrder);
// the task's real Fail-to-Pass and Pass-to-Pass tests (REPO.ex.f2p, REPO.ex.p2p). The search and output strings are Figure 4's.
(function(){
  if(!document.getElementById('stg-idea'))return;const {at,off,lerp,mix}=S3;
  const RP=window.REPO,PROJ=RP.lex.identity.django,FM=SR.forwardMap(RP.keys,RP.fig.mapping),TR=RP.ex.top_run,NT=TR.names.length,SEED=1;
  const ORD=SR.topoOrder({length:NT,deps:TR.deps},SEED),POS=new Array(NT);ORD.forEach((u,i)=>POS[u]=i);
  const MOVED=ORD.filter((u,i)=>u!==i).length,FI=TR.names.indexOf('Field'),LINES=TR.lines.reduce((a,b)=>a+b,0);
  const F2P=JSON.parse(RP.ex.f2p),P2P=JSON.parse(RP.ex.p2p);
  const HUNK=(RP.ex.gold_patch.match(/\x40\x40 -(\d+),(\d+)/)||[0,0,0]).slice(1).map(Number);
  // four files: label = the last two path segments (the file name alone when its folder is the models package)
  const short=(p,two)=>{const s=p.split('/');return two?s.slice(-2).join('/'):s[s.length-1]};
  const FILES=[['django/db/models/base.py',0,-3.0],['django/db/models/query.py',0,-1.5],['django/db/models/fields/__init__.py',1,0],['tests/model_fields/tests.py',1,2.2]]
    .map(([p,two,x])=>({p,x,real:short(p,two),view:short(SR.apply(p,FM,true),two)}));
  window.SCHRO_IDEA={moved:MOVED,n:NT,lines:LINES,fieldLines:TR.lines[FI],fieldFrom:FI+1,hunk:HUNK,fieldTo:POS[FI]+1,f2p:F2P.length,p2p:P2P.length,f2pName:F2P[0].split(' ')[0],files:FILES.map(f=>[f.real,f.view]),
    proj:PROJ};
  const ZA=3.0,ZV=1.5,ZT=.2,ZR=-1.5,XF=0,BH=.55,TH=2.3; // depth of the agent, the view, the translator, the real container; block and tower heights
  const XB=5.0,ZB=-1.5;                                      // the test bench, right of the container
  function draw(R,k,e){const P=R.P;R.grid(-5,6.5,-3,3.8,.5);
    const others=k===4?Math.max(0,1-1.4*e):k===5?1-.5*e:1; // step 5 is about the field file alone: everything in front fades out
    // the real container: a plinth and the four files; it recedes while the view is the subject
    const ra=k===0?1:k===1?1-.55*e:k===2||k===3?.5:k===4?.5+.5*e:.85;
    R.quad([[-3.6,.005,ZR-.75],[2.9,.005,ZR-.75],[2.9,.005,ZR+.75],[-3.6,.005,ZR+.75]],{fill:mix(P.paper,P.ink,.06),a:ra,dz:50});
    const tw=k===4?e:k===5?1-e:0; // the Level 3 tower grows out of the field file at step 5 and folds back at step 6
    FILES.forEach((f,i)=>{const isF=f.x===XF;
      if(isF&&tw>.02)return;
      const lit=(k===2||k===3)&&isF,c=k===5&&isF?mix(P.paper,P.c5,.55*e):lit?mix(P.paper,P.c2,.35):P.paper;
      R.box([f.x,.01,ZR],[1.0,BH,.7],{fill:c,a:ra,lw:.8});
      R.label([i===3?f.x-.5:f.x,.01+BH,ZR],f.real,{mono:true,fs:12,dy:i%2?-27:-12,al:i===3?'left':'center',wide:isF?0:1,c:k>=1?P.mute:P.ink,a:k===4?0:Math.max(.55,ra),b:(k===0||k===5)&&isF})});
    R.label([-3.75,.1,ZR],'real container',{al:'right',dx:-8,fs:12.5,b:1,c:P.ink,grp:'row',a:k===4?0:Math.max(.5,ra)});
    // step 5: the field file as its 35 top-level definitions, heights in lines, sliding from file order to the order seed 1 draws
    if(tw>.02){let y0=.01;const ys=[],yn=[];let acc=0;TR.lines.forEach((l,i)=>{ys[i]=acc;acc+=l});let acc2=0;ORD.forEach(u=>{yn[u]=acc2;acc2+=TR.lines[u]});
      const t=k===4?Math.min(1,Math.max(0,(e-.35)/.65)):1,sc=TH/LINES*tw;
      TR.lines.forEach((l,i)=>{const y=y0+lerp(ys[i],yn[i],t)*sc,h=Math.max(.012,l*sc-.006),isFi=i===FI,mv=t>0&&POS[i]!==i;
        R.box([XF,y,ZR],[1.0,h,.7],{fill:isFi?mix(P.paper,P.c1,.35):mv?mix(P.paper,P.c3,.35):P.paper,lw:.6,shadow:i===0})});
      // Level 4: the gold patch's hunk inside Field (contribute_to_class, 8 lines from file line 763, read from REPO.ex.gold_patch), drawn at least .05 thick
      const f0=TR.start[FI],r0=(HUNK[0]-f0)/TR.lines[FI],r1=Math.max(r0+.05/(TR.lines[FI]*sc),(HUNK[0]+HUNK[1]-f0)/TR.lines[FI]),fy=y0+lerp(ys[FI],yn[FI],t)*sc;
      const la=k===4?Math.min(1,Math.max(0,(e-.7)/.3)):tw;
      R.box([XF,fy+r0*TR.lines[FI]*sc,ZR],[1.08,(r1-r0)*TR.lines[FI]*sc,.78],{fill:P.c2,a:la,lw:.8,shadow:false});
      R.label([XF+.6,fy+TR.lines[FI]*sc*.75,ZR],'Field · '+TR.lines[FI]+' lines',{al:'left',dx:8,fs:12.5,b:1,c:P.c1,a:tw,grp:'tw'});
      R.label([XF+.6,fy+(r0+r1)/2*TR.lines[FI]*sc,ZR],'Level 4 · the fix region, rewritten',{al:'left',dx:8,fs:12.5,c:P.c2,a:la,grp:'tw'});
      R.label([XF-.6,y0+TH*.9*tw,ZR],'Level 3 · '+NT+' definitions, seed '+SEED,{al:'right',dx:-8,fs:12.5,b:1,c:P.c3,a:tw,grp:'tw2'});
      R.label([XF-.6,y0+TH*.25*tw,ZR],MOVED+' of '+NT+' moved',{al:'right',dx:-8,fs:12.5,c:P.mute,a:tw*t,grp:'tw2'});
      R.label([XF-.6,y0+TH*.1*tw,ZR],'no base below its subclass',{al:'right',dx:-8,fs:12,c:P.mute,a:tw*t,grp:'tw2'})}
    // the agent; at step 1 it reads the real names directly
    const aa=(k<=3?1:.3)*others;
    R.box([0,0,ZA],[1.1,.5,.6],{fill:mix(P.paper,P.c1,.3),a:aa});
    R.label([-3.75,.1,ZA],'agent',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,grp:'row',a:aa});
    if(k===0){R.flowArc([XF+.2,.65,ZR+.3],[.2,.5,ZA-.3],.5,{c:P.k,r:.07,n:10,a:e});R.flowArc([-.2,.5,ZA-.3],[XF-.2,.65,ZR+.3],.5,{c:P.q,r:.07,n:10,a:e});
      R.label([0,0,ZA],'reads fields/__init__.py, CharField, get_FOO_display',{mono:true,fs:12,dy:16,c:P.mute,a:e,wide:1})}
    // step 2: a seed fixes the view; the translator stands between the agent and the files
    const pa=(k===0?0:k===1?e:k<=3?1:.35)*others;
    if(pa>0){R.glass([-3.7,.06,ZT],[6.6,0,0],[0,.8,0],{c:P.c4,a:pa,nu:12,nv:3});R.label([-3.75,.45,ZT],'translator',{al:'right',dx:-8,fs:12.5,b:1,c:P.c4,grp:'row',a:pa})}
    const va=(k===0?0:k===1?e:k<=3?1:.25)*others;
    if(va>0){FILES.forEach((f,i)=>{const isF=f.x===XF,lit=(k===2||k===3)&&isF;
        R.box([f.x,.01,ZV],[.9,BH*.8,.5],{fill:lit?mix(P.paper,P.c6,.45):mix(P.paper,P.c6,.18),a:va,fa:.75,lw:.7,shadow:false});
        R.label([f.x,i%2?.01:.01+BH*.8,ZV],f.view,{mono:true,fs:12,dy:i%2?14:-11,wide:isF?0:1,c:P.c6,a:va,b:isF})});
      R.label([-3.75,.1,ZV],'view a seed draws',{al:'right',dx:-8,fs:12.5,b:1,c:P.c6,grp:'row',a:va});
      if(k===1)R.label([0,0,ZA],'"'+PROJ+'", entries, anchor, ledger: never seen in training',{fs:12,dy:16,c:P.mute,a:e,wide:1})}
    // step 3: a command written in the view's names is mapped back before it runs (orange); step 4: the output is renamed on its way out (teal)
    const via=[XF,.5,ZT+.03];
    if(k===2){R.flow([[-.2,.45,ZA-.3],[-.2,.5,ZV+.3],via,[XF-.2,.6,ZR+.36]],{c:P.q,r:.075,n:12,speed:1.2,a:e});
      R.label([0,0,ZA],'grep -rn "render_.*_label"',{mono:true,fs:12.5,b:1,dy:16,c:P.q,a:e});
      R.label([XF,1.8,ZR],'runs as grep -rn "get_.*_display"',{mono:true,fs:12.5,b:1,c:P.q,a:e})}
    if(k===3){R.flow([[XF+.2,.6,ZR+.36],via,[.2,.5,ZV+.3],[.2,.45,ZA-.3]],{c:P.k,r:.075,n:12,speed:1.2,a:e});
      R.label([XF,1.8,ZR],'fields/__init__.py: get_%s_display',{mono:true,fs:12.5,b:1,c:P.k,a:e});
      R.label([0,0,ZA],'entries/__init__.py: render_%s_label',{mono:true,fs:12.5,b:1,dy:16,c:P.k,a:e})}
    // step 6: the patch is recovered from the final file states and graded by the task's own tests on the original repository
    if(k===5){const ba=e;
      R.quad([[XB-.45,.005,ZB-.75],[XB+1.55,.005,ZB-.75],[XB+1.55,.005,ZB+.75],[XB-.45,.005,ZB+.75]],{fill:mix(P.paper,P.ink,.06),a:ba,dz:50});
      R.box([XB-.05,.06,ZB+.3],[.42,.42,.42],{fill:mix(P.paper,P.good,.2+.5*Math.min(1,Math.max(0,(e-.55)/.45))),a:ba});
      P2P.forEach((_,j)=>{const cx=XB+.5+(j%6)*.2,cz=ZB-.5+Math.floor(j/6)*.2;R.box([cx,.06,cz],[.14,.14,.14],{fill:mix(P.paper,P.good,.55),a:ba*Math.min(1,Math.max(0,e*3-j/15)),shadow:false,lw:.5})});
      R.flowArc([XF+.4,.65,ZR],[XB-.05,.5,ZB+.3],.7,{c:P.c5,r:.075,n:10,a:ba});
      R.label([XF,1.8,ZR],'patch = ⊕ Diff(original, final), changed files',{mono:true,fs:12,c:P.c5,a:ba,wide:1});
      R.label([XB-.05,0,ZB+.5],F2P.length+' Fail-to-Pass',{fs:12.5,b:1,c:P.good,dy:14,a:ba});
      R.label([XB+1.0,.2,ZB-.5],P2P.length+' Pass-to-Pass',{fs:12.5,b:1,c:P.good,dy:-16,a:ba})}
  }
  const full={cam:[.22,.5],bounds:[[-3.8,0,-2.3],[6.0,1.3,3.35]]};
  S3.stage({id:'stg-idea',list:'sx-idea',fig:'One task, a view drawn per run · Django case of Figure 4',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,150],
    // step 5 moves in close on the field file while it is reordered; the others show the whole pipeline
    view:k=>k===4?{cam:[.42,.28],bounds:[[-1.5,0,ZR-.5],[1.9,TH+.15,ZR+.5]]}:k<4?{cam:full.cam,bounds:[[-3.8,0,-2.3],[3.1,1.3,3.35]]}:full});
})();

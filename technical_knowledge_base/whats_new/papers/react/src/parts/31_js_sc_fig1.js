// ---- Scene: Figure 1's question run four ways (renderer v2: glass trays, flowing dots, camera per step) ----
// Driven by the page's own transcription of Figure 1 (window.TRACES, episode "apple", from mk_traces.py) and the exemplar word counts
// (PAPER.rc.prompt_words via the traces' pw field, counted from Appendix C.1 by recompute.py). Lanes, front to back: Standard, CoT, Act,
// ReAct; each entry of the trajectory is a block (height grows with its words as printed), standing on a glass tray that is the
// context; behind the lanes, the Wikipedia API as a separate object with one tile per page the searches reach. Actions stream into
// the tile they hit, observations stream back. Step 8: model-written words up, environment words down, per lane.
// window.R1FIG exposes what the scene draws, for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-fig1'))return;const {at,lerp,mix,cl}=S3;
  const EP=(window.TRACES||[]).find(e=>e.id==='apple');if(!EP)return;
  const plain=t=>String(t).replace(/\[\[[grsu]:(.*?)\]\]/g,'$1'),nw=t=>{const s=plain(t).trim();return s?s.split(/\s+/).length:0};
  const ORDER=['std','cot','act','react'],NAME={std:'Standard',cot:'CoT · reason only',act:'Act · act only',react:'ReAct'},Z={std:3.3,cot:1.7,act:.1,react:-1.5};
  const PITCH=1.0,ZW=-3.7,BW=.72,BD=.66;
  // the pages the searches reach, in the order they are first reached, from the action and observation text
  const tiles=[],tileOf=(a,o)=>{const m=plain(a).match(/^Search\[(.*)\]$/);if(!m)return -1;const nm=/^Could not find/.test(plain(o||''))?'similar titles':m[1].trim();
    let i=tiles.indexOf(nm);if(i<0){tiles.push(nm);i=tiles.length-1}return i};
  const L={};ORDER.forEach(m=>{const v=EP.modes[m],S=v.steps;let mw=0,ew=0;
    const ent=S.map((s,i)=>{const w=nw(s.t);if('taf'.includes(s.r))mw+=w;else if(s.r==='o')ew+=w;
      return {r:s.r,n:s.n,w,x:i*PITCH,h:.16+.13*Math.sqrt(w),tile:s.r==='a'?tileOf(s.t,(S[i+1]||{}).t):-1,txt:plain(s.t)}});
    ent.forEach((e,i)=>{if(e.r==='o'){const a=ent[i-1];e.tile=a?a.tile:-1}});
    L[m]={v,ent,mw,ew,pw:v.pw,ok:v.ok}});
  const TX=i=>2.0+i*(8.0/Math.max(1,tiles.length-1));
  // which entries each step reveals: [lane, first, last]; ReAct's twelve entries run in three stretches (long-replay rule)
  const REV=[['all',0,0],['std',1,1],['cot',1,2],['act',1,7],['react',1,4],['react',5,9],['react',10,11],['sum',0,0]];
  const FOCUS=[null,'std','cot','act','react','react','react',null];
  const shown=(m,i,k,e)=>{if(i===0)return 1;let a=0;REV.forEach(([lm,f,l],s)=>{if(lm!==m||i<f||i>l)return;if(s<k)a=1;else if(s===k){const n=l-f+1,j=i-f;a=cl(e*(n+.6)-j,0,1)}});
    return a};
  window.R1FIG={steps:REV.length,tiles:tiles.slice(),lanes:Object.fromEntries(ORDER.map(m=>[m,{entries:L[m].ent.length,model:L[m].mw,env:L[m].ew,exemplars:L[m].pw,ok:L[m].ok,
    answer:(L[m].ent.filter(e=>e.r==='f'||e.r==='a').pop()||{}).txt}]))};
  let RC=null,RP=null;
  const roles=P=>{if(RP===P)return RC;const s=getComputedStyle(document.body),g=n=>S3.rgb(s.getPropertyValue(n).trim()||'#888');RP=P;
    return RC={q:g('--rq'),t:g('--rt'),a:g('--ra'),f:g('--ra'),o:g('--ro'),e:g('--rx')}};
  const MAXPW=Math.max(...ORDER.map(m=>L[m].pw||0)),MAXW=Math.max(...ORDER.map(m=>Math.max(L[m].mw,L[m].ew)));
  function draw(R,k,e){const P=R.P,C=roles(P),fo=FOCUS[k],sum=k===REV.length-1;R.grid(-2.5,13,-4.6,4.2,.5);
    const laneA=m=>sum?.1*(1-e)+.08:fo?(m===fo?1:.2):1;
    // the Wikipedia API: a separate object behind the lanes, one tile per page reached
    const wa=k===0?1:fo==='act'||fo==='react'?1:sum?.1:.3;
    R.box([6.0,0,ZW],[10.2,.16,1.2],{fill:mix(P.paper,P.soft,.6),a:wa});
    tiles.forEach((t,i)=>{R.box([TX(i),.16,ZW],[2.0,.5,.56],{fill:mix(P.paper,P.c6,t==='similar titles'?.15:.35),a:wa});
      R.label([TX(i),.7,ZW],t,{mono:true,fs:12,dy:-10,c:t==='similar titles'?P.mute:P.ink,a:wa<.5?0:wa,wide:t==='similar titles'?1:0})});
    R.label([6.0,0,ZW+.6],'Wikipedia API · search, lookup, finish',{mono:true,fs:12,dy:10,c:P.c6,a:k===0?1:k===3?.8:0,wide:1});
    ORDER.forEach(m=>{const D=L[m],z=Z[m],la=laneA(m);
      // the prompt's exemplars: a stack whose height is their word count, then the context tray growing as entries are appended
      const ph=.3+1.7*D.pw/MAXPW;R.box([-1.15,0,z],[BW,ph,BD],{fill:mix(P.paper,P.mute,.18),a:la*(k===0?1:.8)});
      let last=0;D.ent.forEach((n,i)=>{if(shown(m,i,k,e)>0)last=i+shown(m,i,k,e)-1});
      R.glass([-1.6,.012,z-.5],[1.6+D.ent[0].x+(last+.5)*PITCH,0,0],[0,0,1.0],{c:P.ink,a:la*.55,nu:Math.max(1,Math.round(last)+2),nv:1,th:.02});
      R.label([-1.65,.1,z],NAME[m]+(k===0?' · '+D.pw+' words':''),{al:'right',dx:-8,fs:12.5,b:fo===m,c:m==='react'?P.acc:P.ink,a:sum?0:Math.max(.45,la),grp:'lane'});
      D.ent.forEach((n,i)=>{const s=shown(m,i,k,e);if(s<=0)return;const a=la*s,cur=fo===m&&REV[k][1]<=i&&i<=REV[k][2],col=C[n.r]||P.mute,h=n.h*(.3+.7*s);
        R.box([n.x,0,z],[BW,h,BD],{fill:mix(P.paper,col,.55),a,shadow:la>.5});
        if(n.r==='f'||(n.r==='a'&&/^Finish/.test(n.txt))){const ok=D.ok&&i===D.ent.length-1,ans=n.txt.replace(/^Finish\[(.*)\]$/,'$1');
          R.glow([n.x,h+.2,z],.24,{c:ok?P.good:P.bad,a:a*.9});if(a>.5)R.label([n.x,h,z],(ok?'✓ ':'✗ ')+ans,{fs:13,b:1,dy:-26,c:ok?P.good:P.bad,a})}
        else if(cur&&n.r==='a')R.label([n.x,h,z],n.txt,{mono:true,fs:12,dy:-12,c:col,a:s,grp:'blk'})
        else if(cur&&n.r==='t')R.label([n.x,0,z+BD/2+.05],n.n+' · '+n.w+' words',{fs:12,dy:12,c:col,a:s,grp:'thk'});
        // data moving: the action into the page it reaches, the page's reply back into the observation (only on the step that reveals them)
        if(cur&&n.tile>=0&&k>0){const tp=[TX(n.tile),.6,ZW+.2];
          if(n.r==='a')R.flowArc([n.x,h+.04,z],tp,.9+.1*(z-ZW),{c:C.a,a:s,r:.06,n:9,speed:1.3});
          else R.flowArc(tp,[n.x,h+.04,z],.9+.1*(z-ZW),{c:C.o,a:s,r:.065,n:Math.max(4,Math.round(n.w/2.5)),speed:1.3})}
        if(cur&&n.r==='t')R.glow([n.x,h+.1,z],.16,{c:C.t,a:s*.7})})});
    // step 8: who wrote the context; model-written words stand on the plinth, environment words hang below it
    if(sum){const XS={std:1.5,cot:4.5,act:7.5,react:10.5},ZS=.6,YP=1.35,sc=1.3/MAXW;
      ORDER.forEach(m=>{const D=L[m],X=XS[m],up=Math.max(.012,D.mw*sc*e),dn=Math.max(.012,D.ew*sc*e);
        R.box([X,YP-.05,ZS],[1.5,.05,.9],{a:1,shadow:false});[-1,1].forEach(sx=>R.box([X+sx*.7,0,ZS],[.05,YP-.05,.05],{a:.9}));
        R.box([X-.3,YP,ZS],[.52,up,.6],{fill:mix(P.paper,C.t,.6),shadow:false});
        R.box([X+.3,YP-.05-dn,ZS],[.52,dn,.6],{fill:mix(P.paper,C.o,.6),shadow:false});
        R.label([X-.3,YP+up,ZS],String(D.mw),{mono:true,fs:13,dy:-11,c:C.t,b:1,a:e});
        R.label([X+.3,YP-.05-dn,ZS],String(D.ew),{mono:true,fs:13,dy:11,c:C.o,b:1,a:e});
        R.label([X,0,ZS+.6],R.W<520?NAME[m].split(' · ')[0]:NAME[m],{fs:12.5,dy:12,b:m==='react',c:m==='react'?P.acc:P.ink,a:e});
        const last=D.ent[D.ent.length-1];R.flowArc([last.x,.3,Z[m]],[X,YP,ZS],.6,{c:P.mute,a:.3*e,r:.045,n:5,speed:1})});
      R.label([6,YP+2.1,ZS],'words the model wrote ↑ · words the environment returned ↓',{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
  }
  const full={cam:[.16,.88],bounds:[[-2.2,0,-4.4],[11.8,.3,3.9]]},sumv={cam:[.05,.42],bounds:[[0,0,-.2],[12,2.9,1.6]]};
  S3.stage({id:'stg-fig1',list:'sx-fig1',fig:'Fig. 1 · one question, four prompts (the paper\'s own episode)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2600,hold:5200,draw,
    margin:w=>w<520?[14,8,12,8]:[16,12,10,132],
    view:k=>k===1?{cam:[.25,.62],bounds:[[-2.2,0,2.4],[2.4,1.3,4.0]]}:k===2?{cam:[.25,.62],bounds:[[-2.2,0,.8],[3.4,1.3,3.9]]}
      :k===3?{cam:[.12,.8],bounds:[[-2.2,0,-4.4],[10.6,.3,1.0]]}:k>=4&&k<=6?{cam:[.12,.92],bounds:[[-2.2,0,-4.4],[12.3,.3,-.6]]}:k===7?sumv:full});
})();

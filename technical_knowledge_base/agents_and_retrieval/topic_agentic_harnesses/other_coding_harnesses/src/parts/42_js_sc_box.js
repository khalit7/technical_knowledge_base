// ---- Scene: Fig. 3, containment defaults (section 4, renderer v2). Structure read from source at the pinned versions (section 4's closed block):
// for each harness, a command the model asks for (the dot) passes an approval plate (who says yes) and maybe sandbox walls (what it can touch)
// on its way to your machine at the back. Step 4 switches each to its headless or "yes to everything" mode. Not measured: the six runs
// were contained by us (Docker or the harness's own sandbox), as the closed block says. ----
(function(){
  if(!document.getElementById('stg-box'))return;const {mix,at}=S3;
  // name; default approval (ask | none); default walls (on | opt | git | none); headless flag and its approval (none | deny)
  const H=[['Codex','ask','on','codex exec','none'],['Gemini CLI','ask','opt','gemini -p','deny'],['opencode','none','none','opencode run','none'],
    ['Aider','ask','git','--yes-always','deny'],['OpenHands','none','opt','(unchanged)','none'],['mini-SWE','ask','opt','--yolo','none']];
  const x=i=>-3.75+i*1.5,ZG=1.0,ZS=2.0,ZM=-1.75,Y=.42,WX=.55,WZ=.5,WH=.85;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.8,4.8,-2.4,2.6,.5);
    // your machine at the back
    R.box([0,0,ZM],[9.6,.22,.7],{fill:mix(P.paper,P.c5,.18),dz:30});R.label([-4.7,.22,ZM],'your machine: files, network, credentials',{fs:12.5,b:1,c:P.ink,dy:-10,al:'left'});
    H.forEach(([nm,ap,wl,flag,hap],i)=>{const cx=x(i),hl=k===3;
      // the command's own box (where it runs) and the harness name
      if(wl==='git')R.box([cx,0,0],[.9,.12,.8],{fill:mix(P.paper,P.c3,.4),a:at(k,e,2)});
      R.box([cx,wl==='git'?.12:0,0],[.55,.32,.45],{fill:mix(P.paper,P.c2,.22)});
      R.label([cx,0,ZS+.1],nm,{fs:12,b:1,c:P.ink,dy:nar&&i%2?30:16});
      if(wl==='git'&&k>=2)R.label([cx+.45,.12,.4],'git: undo edits',{al:'left',dx:4,fs:12,c:P.c3,a:at(k,e,2),wide:1});
      // walls: on (solid), opt-in (faint)
      const wa=at(k,e,2)*(wl==='on'?1:wl==='opt'?.28:0);
      if(wa>0){const o={c:P.c1,a:wa,nu:3,nv:3,th:.03};R.glass([cx-WX,0,-WZ],[2*WX,0,0],[0,WH,0],o);R.glass([cx-WX,0,-WZ],[0,0,2*WZ],[0,WH,0],o);R.glass([cx+WX,0,-WZ],[0,0,2*WZ],[0,WH,0],o);
        R.glass([cx-WX,0,WZ],[2*WX,0,0],[0,WH,0],{c:P.c1,a:wa*.55,nu:3,nv:3,th:.03});
        if(k===2&&wl==='opt'&&!nar)R.label([cx,WH,0],'opt-in',{fs:12,c:P.c1,dy:-8,a:e})}
      // the approval plate in front: yellow asks a human, orange denies; none lets everything through
      const gk=hl?hap:ap,ga=k===0?0:k===1?at(k,e,1):k===2?1:1;
      if(gk!=='none'&&ga>0){const c=gk==='deny'?P.bad:P.c5;R.glass([cx-.5,0,ZG],[1,0,0],[0,.8,0],{c,a:ga,nu:4,nv:3});
        if(k===1||hl)R.label([cx,.8,ZG],gk==='deny'?'denies':'asks',{fs:12,b:1,c,dy:-8,a:ga})}
      if(hl)R.label([cx,0,ZS+.1],flag,{mono:true,fs:12,c:P.mute,dy:nar?44:32,a:e,wide:nar?1:0});
      // the command: from the model (front) through the plate, the box and, unless walled, on to your machine
      const p0=[cx,Y,ZS],pg=[cx,Y,ZG+.08],pb=[cx,Y,0],pw=[cx,Y,-WZ+.04],pm=[cx,.25,ZM+.36];
      const stopAtGate=k>=1&&gk!=='none',walled=k>=2&&wl==='on',col=hl&&!stopAtGate&&!walled?P.bad:P.c2;
      const path=stopAtGate?[p0,pg]:walled?[p0,pg,pb,pw]:[p0,pg,pb,pm];
      R.flow(path,{c:col,r:.07,n:9,speed:1.1,a:k===0?Math.max(.3,e):1});R.ball(p0,.1,{c:P.c2});
      if(stopAtGate&&ga>.5)R.glow(pg,.22,{c:gk==='deny'?P.bad:P.c5,a:.8});
      if(walled)R.glow(pw,.22,{c:P.c1,a:.8});
    });
    if(k===0)R.label([0,Y,ZS],'each dot: a command the model asks to run',{fs:12,c:P.c2,dy:-22,a:e,wide:1});
  }
  const full={cam:[.06,.6],bounds:[[-4.6,0,-2.2],[4.6,1,2.3]]};
  S3.stage({id:'stg-box',list:'sx-box',fig:'Fig. 3 · only Codex keeps a boundary when nobody approves',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5600,draw,
    margin:w=>w<520?[22,8,48,8]:[22,16,40,16]});
})();

// ---- Scene: Fig. 1, the hero (section 0; renderer v2). Steps 1 to 4: the five deliberate mistakes of t1_types.py, read by the two
// checkers (a glass plate above the file) and run by Python (the floor). Steps 5 and 6: packaging as four stacked layers, and uv's column.
// Data: window.T1 (src/pa/gen.py parses t1_types.py and the three recorded outputs). The layer names and tools are the page's own table. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.T1)return;const {at,off,cl,mix,lerp}=S3;
  const RW=T1.rows,n=RW.length,z=i=>-1.2+i*.6,HP=1.1,TW=2.2;
  const crashI=RW.findIndex(r=>r.line===T1.crash),flagged=RW.map(r=>!!(T1.mypy[r.line]&&T1.ty[r.line]));
  // the counts the step list quotes (checked by check_stages.mjs)
  window.T1_HERO={flagged:flagged.filter(Boolean).length,n,crash:RW[crashI].n,missed:RW.filter((r,i)=>!flagged[i]).map(r=>r.n)};
  const short=['role "admin"','int = parse(b"ab")','find_user(...)["content"]','legacy("text")','shutdown([42])'];
  const LAY=[['1 Interpreters','pyenv · conda · system','uv python install'],['2 Isolation','venv · virtualenv','.venv, made for you'],
    ['3 Resolve, install, lock','pip · pip-tools · Poetry · PDM','uv add · uv lock · uv sync'],['4 Build','setuptools · hatchling · maturin','uv build calls a backend']];
  const ly=i=>.2+i*.72,LX0=-1.6,LW=3;
  function draw(R,k,e){const P=R.P;R.grid(-3.5,4.5,-2.2,2.2,.5);
    // ---- typing: steps 1 to 4, gone at step 5 ----
    const ta=k<=3?1:k===4?cl(1-e*2.2,0,1):0;
    if(ta>0){
      const chk=k===1?Math.min(1,e*1.6):k===2?1-.65*e:k===3?1:k===4?1:0,run=k===2?e:k>=3?1:0;
      RW.forEach((r,i)=>{
        // the line of code, a tile on the floor; at step 3 it changes colour as Python's run passes it
        const reached=k>=2&&run*crashI*1.0>=i-.02,crashed=i===crashI&&k>=2&&run>.97,never=i>crashI&&k>=2;
        const fill=crashed?mix(P.paper,P.bad,.55):k>=2&&reached&&i<crashI?mix(P.paper,P.mute,.18):P.paper;
        R.box([0,0,z(i)],[TW,.14,.5],{fill,a:ta*(never?(k===2?1-.7*e:.3):1)});
        R.label([-TW/2,.07,z(i)],r.n+'  '+short[i],{al:'right',dx:-8,mono:true,fs:12,c:P.ink,a:ta*(never?.55:1),grp:'code'});
        // checkers: a flow up from each line to the plate; a red flag above every line they report
        if(chk>0){if(k===1)R.flow([[0,.2,z(i)],[0,HP-.04,z(i)]],{c:P.c1,a:chk*.8,r:.05,n:4,speed:.9});
          if(flagged[i])R.box([.85,HP+.02,z(i)],[.3,.24,.3],{fill:P.bad,a:chk,shadow:false});
          else R.box([.85,HP+.02,z(i)],[.3,.04,.3],{fill:P.mute,a:chk*.5,shadow:false});
          if(k===1||k===3)R.label([1.25,HP+.12,z(i)],flagged[i]?'mypy '+T1.mypy[r.line]:'silent: no annotations',{al:'left',dx:8,mono:true,fs:12,c:flagged[i]?P.bad:P.mute,a:(k===1?e:1)*ta,grp:'chk'})}
        // Python: what happened at each line
        if(k===2||k===3){const lab=i<crashI?(i===crashI-1?'ran past · printed "'+T1.printed[T1.printed.length-1]+'"':'ran past'):i===crashI?T1.err.split(':')[0]:'never reached';
          const la=k===2?cl((run*crashI-i+1)*1.5,0,1):1;
          if(k===2)R.label([TW/2,.07,z(i)],lab,{al:'left',dx:10,fs:12,b:i===crashI,c:i===crashI?P.bad:P.mute,a:la*ta,grp:'run'})}
      });
      if(chk>0){R.glass([-1.2,HP,z(0)-.35],[2.4,0,0],[0,0,z(n-1)-z(0)+.7],{c:P.c1,a:chk*(k===2||k===3?.55:.85),nu:6,nv:5});
        R.label([0,HP,z(0)-.35],'BEFORE RUNNING · mypy, ty read the file',{dy:-12,fs:12.5,b:1,c:P.c1,a:chk})}
      if(k>=2){R.label([TW/2+.2,0,z(n-1)+.45],'RUN TIME · python 3.14.8 runs it',{al:'right',dy:18,fs:12.5,b:1,c:P.acc,a:ta*(k===2?e:1),wide:1});
        // the run: dots stream down the lines in order until the crash
        const zc=lerp(z(0),z(crashI),run),pts=[[TW/2+.15,.2,z(0)-.3],[TW/2+.15,.2,zc]];
        if(k===2&&run>.02)R.flow(pts,{c:P.acc,a:ta,r:.06,speed:1.1});
        if(run>.97){const h=k===2?(run-.97)/.03:1;R.box([TW/2+.15,0,z(crashI)],[.3,.55*h,.3],{fill:P.bad,a:ta})}}
      if(k===3){R.quad([[-TW/2-.1,.16,z(crashI)-.3],[TW/2+.35,.16,z(crashI)-.3],[TW/2+.35,.16,z(crashI)+.3],[-TW/2-.1,.16,z(crashI)+.3]],{fill:P.bad,fa:.12,ec:P.bad,dash:[5,4],a:e});
        R.label([TW/2+.4,.3,z(crashI)],'the one crash, which neither checker saw',{al:'left',dx:10,fs:12.5,b:1,c:P.bad,a:e,wide:1})}
    }
    // ---- packaging: four layers (step 5) and uv's column (step 6) ----
    const pa=k===4?cl((e-.3)/.7,0,1):k>=5?1:0;
    if(pa>0){LAY.forEach(([nm,old,uv],i)=>{const uvOn=k===5,hi=uvOn&&i<3;
        R.glass([LX0,ly(i),-.8],[LW,0,0],[0,0,1.6],{c:i===3?P.c4:P.c1,a:pa*(uvOn&&i===3?.55:.85),nu:6,nv:3});
        R.label([LX0+LW/2,ly(i),0],nm,{fs:12.5,b:1,c:P.ink,a:pa});
        R.label([LX0,ly(i),.8],old,{al:'right',dx:-14,mono:true,fs:12,c:P.mute,a:pa*(uvOn?.6:1),grp:'lay'});
        if(uvOn){R.label([2.45,ly(i)+.1,0],uv,{al:'left',dx:10,mono:true,fs:12,b:hi,c:hi?P.acc:P.c4,a:e,grp:'uv'});
          if(hi)R.flow([[1.85,ly(i)+.1,0],[LX0+LW-.1,ly(i)+.05,0]],{c:P.acc,a:e,r:.06,n:4,speed:1})}});
      if(k===5){const h=ly(2)-ly(0)+.3;R.box([2.05,ly(0)-.05,0],[.38,h*Math.min(1,e*1.4),.8],{fill:mix(P.paper,P.acc,.55),shadow:false});
        R.label([2.05,ly(0)+h,0],'uv',{mono:true,fs:14,b:1,c:P.acc,dy:-12,a:e});
        R.flowArc([2.05,ly(2)+.3,0],[LX0+LW-.1,ly(3)+.05,0],.2,{c:P.c4,a:e*.8,r:.05,speed:.9})}
    }
  }
  const full={cam:[.18,.55],bounds:[[-1.3,0,-1.5],[2.9,1.5,1.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · who reads the hints; which layer each tool covers',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,20,16,190],
    // the packaging steps look at the stack from lower down, so the four plates separate
    view:k=>k>=4?{cam:[.2,.28],bounds:[[-2.6,0,-.9],[3.8,2.6,.9]]}:full});
})();

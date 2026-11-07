// ---- Scene: Fig. 4, from source to site-packages (section 7; renderer v2). The library of section 4 built with uv build:
// its source, the sdist, the build backend (a glass plate), the wheel, and what an installer unpacks into site-packages.
// Data: window.PB.uv, the recorded blocks "uv build", "unzip -l" (the wheel's files), "unzip -p ... WHEEL" (its tag and Root-Is-Purelib)
// and "tar tzf" (the sdist's files). Each file is one thin slab, named from those listings. ----
(function(){
  if(!document.getElementById('stg-whl')||!window.PB)return;const {at,cl,mix,lerp}=S3;
  const U=PB.uv,blk=p=>U.find(b=>b.cmd&&b.cmd.startsWith(p));
  const bb=blk('uv build'),wl=blk('unzip -l'),wm=blk('unzip -p'),sl=blk('tar tzf');if(!bb||!wl||!wm||!sl)return;
  const files=t=>t.out.split('\n').filter(x=>x&&!x.endsWith('/'));
  const sd=files(sl).filter(x=>!/\/src(\/lib_demo)?$/.test(x)),wh=files(wl),root=sd[0].split('/')[0]+'/';
  const src=sd.map(x=>x.slice(root.length)).filter(x=>x!=='PKG-INFO'&&!/\.orig$/.test(x));
  const tag=(wm.out.match(/^Tag: (.+)$/m)||[])[1],pure=(wm.out.match(/^Root-Is-Purelib: (.+)$/m)||[])[1];
  const built=[...bb.out.matchAll(/Successfully built dist\/(\S+)/g)].map(m=>m[1]),sdName=built.find(x=>/\.tar\.gz$/.test(x)),whName=built.find(x=>/\.whl$/.test(x));
  const tops=Array.from(new Set(wh.map(x=>x.split('/')[0]+'/')));
  window.WHL={src,sd:sd.map(x=>x.slice(root.length)),wh,tag,pure,tops,sdName,whName};
  const X={src:-4.4,sd:-2.0,be:0,wh:2.0,sp:4.4},SL=[1.3,.07,.9],DY=.2;
  function stack(R,x,names,o){const P=R.P;names.forEach((n,j)=>{const y=.05+j*DY;R.box([x,y,0],SL,{fill:o.fill(n),a:o.a,shadow:j===0});
      if(o.lab)R.label([x+.68,y+.04,0],n,{al:'left',dx:6,mono:true,fs:12,c:P.ink,a:o.a,grp:o.grp})});
    R.label([x,.05+names.length*DY+.05,0],o.title,{mono:true,fs:12.5,b:1,dy:-10,c:o.tc||P.ink,a:o.a<.3?0:o.a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,6.4,-2,2,.5);
    // 1. the project's source
    const sa=k===0?1:.22;stack(R,X.src,src,{a:sa,lab:k===0,grp:'src',title:'lib-demo/ (your source)',fill:()=>P.paper});
    // 2. the sdist: the same source plus PKG-INFO
    const da=k===1?e:k===2?.6:k===4?1:.3;if(k>=1){stack(R,X.sd,WHL.sd,{a:da,lab:k===1,grp:'sd',title:sdName,tc:P.c5,fill:n=>n==='PKG-INFO'||/\.orig$/.test(n)?mix(P.paper,P.c5,.5):P.paper});
      if(k===1)R.flowArc([X.src+.6,.5,0],[X.sd-.6,.5,0],.35,{c:P.c5,a:e,r:.06,speed:1.1})}
    // 3. the backend builds the wheel from the sdist
    const ba=k===2?1:k===4?1:k>2?.3:0;if(ba>0){R.glass([X.be,0,-.8],[0,0,1.6],[0,1.5,0],{c:P.c4,a:ba*(k===2?e:1),nu:3,nv:4});
      R.label([X.be,1.5,0],'uv_build (the backend)',{mono:true,fs:12.5,b:1,dy:-10,c:P.c4,a:k===4?0:ba*(k===2?e:1)});
      if(k===2||k===4){R.flow([[X.sd+.7,.6,0],[X.be,.6,0],[X.wh-.7,.6,0]],{c:P.c4,a:k===2?e:1,r:.065,speed:1.1})}}
    const wa=k===2?e:k===3?1:k===4?.8:0;if(wa>0)stack(R,X.wh,wh,{a:wa,lab:k===2,grp:'wh',title:whName,tc:P.acc,fill:n=>/dist-info/.test(n)?mix(P.paper,P.acc,.35):P.paper});
    if(k===2&&tag)R.label([X.wh,0,.6],'Tag: '+tag,{mono:true,fs:12.5,b:1,c:P.acc,dy:18,a:e});
    // 4. installing the wheel: unpack, no build step
    const pa=k===3?1:k===4?.35:0;if(pa>0){R.glass([X.sp-.9,.02,-1],[1.8,0,0],[0,0,2],{c:P.good,a:pa,nu:4,nv:4});R.label([X.sp,.02,-1],'site-packages',{mono:true,fs:12.5,b:1,dy:-12,c:P.good,a:pa});
      tops.forEach((t,j)=>{const z=-.45+j*.9,h=k===3?e:1;R.box([X.sp,.02,z],[1.5,.28*h+.01,.6],{fill:mix(P.paper,j?P.acc:P.good,.3),a:pa});R.label([X.sp,.32,z],t,{mono:true,fs:12,a:pa*h,wide:1})});
      if(k===3){R.flowArc([X.wh+.7,.5,0],[X.sp-.8,.3,0],.4,{c:P.good,a:1,r:.07,speed:1.2});R.label([X.sp,.02,1],'Root-Is-Purelib: '+pure+': into purelib',{mono:true,fs:12,dy:16,c:P.good,a:e,wide:1})}}
    // 5. from an sdist instead: the build runs at install time
    if(k===4){R.label([X.sd,0,.6],'given only the sdist',{fs:12.5,b:1,c:P.bad,dy:18,a:e,grp:'bad'});
      R.quad([[X.be-.05,0,-.85],[X.be-.05,0,.85],[X.be-.05,1.55,.85],[X.be-.05,1.55,-.85]],{ec:P.bad,dash:[5,4],a:e,ea:.9});
      R.label([X.be,0,.85],'the backend runs at install time; C or Rust: a compiler',{fs:12.5,b:1,c:P.bad,dy:20,a:e,grp:'bad'})}
  }
  const full={cam:[.55,.45],bounds:[[-5.2,0,-1],[6.2,1.8,1]]};
  S3.stage({id:'stg-whl',list:'sx-whl',fig:'Fig. 4 · from source to site-packages, uv build of section 4\'s library',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[24,16,18,16],
    // close on the object each step is about
    view:k=>k===0?{cam:[.3,.45],bounds:[[-5.4,0,-1],[-1.2,1.6,1]]}:k===1?{cam:[.25,.45],bounds:[[-5,0,-1],[.4,2,1]]}:k===2?{cam:[.5,.45],bounds:[[-2.6,0,-1],[4,1.9,1]]}:k===3?{cam:[.35,.45],bounds:[[1,0,-1.2],[6,1.6,1.2]]}:full});
})();

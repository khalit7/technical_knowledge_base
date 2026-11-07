// ---- Scene: Fig. 3, where an install spends its time (section 4; renderer v2). PyPI, uv's cache (a glass plate) and the fresh
// environment; one step per measured run of src/pb/pack/install_speed.sh, then the three medians as slabs to scale.
// Data: window.PB.install_speed (package list, the three runs' medians). Only the three requested packages are drawn as wheels;
// their dependencies were installed too and are not drawn. ----
(function(){
  if(!document.getElementById('stg-inst')||!window.PB||!PB.install_speed)return;const {at,cl,mix,lerp}=S3;
  const I=PB.install_speed,R0=I.runs,pk=I.packages.split(' ').map(x=>x.split('==')[0]),M=Math.max(...R0.map(r=>r.median_s));
  window.INST={med:R0.map(r=>r.median_s),x:R0.map(r=>R0[0].median_s/r.median_s)};
  const XI=-3.6,XC=0,XV=3.4,PW=2.2,Y=.02,slot=(x,i)=>[x,Y,-.6+i*.6];
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.2,2.4,.5);
    const flowsA=k<=2?1:cl(1-e*2,0,1),slabA=k===3?cl((e-.3)/.7,0,1):0;
    if(flowsA>0){
      // PyPI: the registry every tool downloads from
      const ia=(k===2?.25:1)*flowsA;R.box([XI,0,0],[1.4,.9,1.9],{fill:mix(P.paper,P.c4,.25),a:ia});R.label([XI,.9,0],'PyPI',{fs:13,b:1,dy:-12,a:ia});
      pk.forEach((n,i)=>{R.box([XI+.15,.9,slot(0,i)[2]],[.9,.1,.42],{fill:P.paper,a:ia,shadow:false});R.label([XI-.7,.95,slot(0,i)[2]],n+'.whl',{al:'right',dx:-6,mono:true,fs:12,a:ia,grp:'whl'})});
      // uv's cache: not used by pip
      const ca=(k===0?.18:1)*flowsA;R.glass([XC-PW/2,Y,-1],[PW,0,0],[0,0,2],{c:P.c6,a:ca,nu:5,nv:4});R.label([XC,Y,-1],k===0?'no cache (--no-cache-dir)':'uv cache',{mono:true,fs:12.5,b:1,dy:-12,c:P.c6,a:Math.max(ca,.5)*flowsA});
      // in the cache, each wheel unpacked once
      const cf=k===1?e:k===2?1:0;if(cf>0)pk.forEach((n,i)=>{R.box([XC,Y,slot(0,i)[2]],[1.5,.22,.42],{fill:mix(P.paper,P.c6,.35),a:cf*flowsA,shadow:false});R.label([XC,.24,slot(0,i)[2]],n+' (unpacked)',{mono:true,fs:12,a:cf*flowsA,wide:1})});
      // the fresh environment
      R.glass([XV-PW/2,Y,-1],[PW,0,0],[0,0,2],{c:P.acc,a:flowsA,nu:5,nv:4});R.label([XV,Y,-1],'fresh .venv',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:flowsA});
      const vf=k<=2?cl(e*1.3-.2,0,1):1;pk.forEach((n,i)=>{R.box([XV,Y,slot(0,i)[2]],[1.5,.22,.42],{fill:mix(P.paper,P.acc,.3),a:vf*flowsA,shadow:false});R.label([XV,.24,slot(0,i)[2]],n,{mono:true,fs:12,a:vf*flowsA,wide:1})});
      if(k<=2){const r=R0[k];R.label([XV,Y,1],r.name+': '+r.median_s.toFixed(2)+' s',{mono:true,fs:13,b:1,dy:18,c:P.ink,a:vf})}
      // what moves: download (PyPI to cache or straight in), then the files into the environment
      const top=[XI+.7,.75,0];
      if(k===0)R.flowArc(top,[XV-PW/2+.2,.15,0],1.1,{c:P.c4,a:flowsA,r:.07,n:16,speed:1.4});
      if(k===1){R.flowArc(top,[XC-PW/2+.2,.15,0],.6,{c:P.c4,a:flowsA,r:.07,n:9,speed:1.4});R.flowArc([XC+PW/2-.2,.15,0],[XV-PW/2+.2,.15,0],.45,{c:P.c6,a:flowsA*e,r:.06,n:6,speed:1.4})}
      if(k===2)R.flowArc([XC+PW/2-.2,.15,0],[XV-PW/2+.2,.15,0],.45,{c:P.c6,a:flowsA,r:.06,n:6,speed:1.4});
    }
    // the three medians, to scale
    if(slabA>0)R0.forEach((r,i)=>{const x=-2.4+i*2.4,h=2.2*r.median_s/M*slabA,c=[P.c4,P.c6,P.acc][i];
      R.box([x,0,0],[1.1,Math.max(.02,h),1.1],{fill:mix(P.paper,c,.45)});
      R.label([x,h,0],r.median_s.toFixed(2)+' s'+(i?' · '+(R0[0].median_s/r.median_s).toFixed(i===1?1:0)+'x':''),{mono:true,fs:13,b:1,dy:-18,a:slabA});
      R.label([x,0,.55],r.name,{fs:12,dy:16,c:P.mute,a:slabA})});
  }
  const full={cam:[.12,.55],bounds:[[-4.6,0,-1.2],[4.6,1.4,1.4]]};
  S3.stage({id:'stg-inst',list:'sx-inst',fig:'Fig. 3 · where an install spends its time',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[24,16,18,16],
    view:k=>k===3?{cam:[.25,.38],bounds:[[-4,0,-1],[4,2.4,1]]}:full});
})();

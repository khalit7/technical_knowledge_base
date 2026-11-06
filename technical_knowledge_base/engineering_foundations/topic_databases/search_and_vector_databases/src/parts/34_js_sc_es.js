// ---- Scene, section 6: one document through an Elasticsearch (Lucene) shard: buffer, translog, refresh, segments, delete marks, merge, flush (renderer v2) ----
// The mechanism and the defaults are Elastic's and Lucene's (linked under the step list); the clock is illustrative.
(function(){
  if(!document.getElementById('stg-es'))return;const {at,off,lerp,mix}=S3;
  // state per step: buf (documents in the memory buffer), tl (operations in the translog), segs [{n, x, docs:[[id, deleted]]}], t (seconds)
  const S=[
    {t:0,buf:[],tl:[],segs:[]},
    {t:0,buf:['d1'],tl:['d1'],segs:[]},
    {t:0.4,buf:['d1','d2','d3'],tl:['d1','d2','d3'],segs:[]},
    {t:1.0,buf:[],tl:['d1','d2','d3'],segs:[{n:'S1',x:1.75,docs:[['d1'],['d2'],['d3']]}]},
    {t:1.6,buf:["d2'"],tl:['d1','d2','d3',"d2'"],segs:[{n:'S1',x:1.75,docs:[['d1'],['d2',1],['d3']]}]},
    {t:2.0,buf:[],tl:['d1','d2','d3',"d2'"],segs:[{n:'S1',x:1.75,docs:[['d1'],['d2',1],['d3']]},{n:'S2',x:4.05,docs:[["d2'"]]}]},
    {t:9,buf:[],tl:['d1','d2','d3',"d2'"],segs:[{n:'S3',x:2.75,docs:[['d1'],['d3'],["d2'"]]}]},
    {t:30,buf:[],tl:[],segs:[{n:'S3',x:2.75,docs:[['d1'],['d3'],["d2'"]]}]}];
  window.CHK=Object.assign(window.CHK||{},{es:{steps:S.length}});
  const IN=[-5,.3,0],BX=-2.4,BZ=1.15,TZ=-1.25,TX0=-3.9,SZ=1.15,QX=[5.3,.4,-.6],DW=.56,DG=.7;
  const bufPos=i=>[BX-1+i*DG,.06,BZ],tlPos=i=>[TX0+i*DG,.06,TZ],segDoc=(sg,j)=>[sg.x-(sg.docs.length-1)*DG/2+j*DG,.14,SZ];
  function doc(R,p,id,o){const P=R.P;R.box(p,[DW,.4,.46],{fill:o.dead?mix(P.paper,P.bad,.35):o.fill||P.paper,a:o.a});
    R.label([p[0],p[1]+.4,p[2]],id+(o.dead?' ✕':''),{mono:true,fs:12,b:1,c:o.dead?P.bad:P.ink,a:o.a,dy:-8})}
  function draw(R,k,e){const P=R.P,s=S[k],pv=S[Math.max(0,k-1)];R.grid(-5.2,5.2,-2.4,2.6,.5);
    // composition: the zone a step is about at full strength, the rest recedes
    const fB=[0,1,2,3,4].includes(k)?1:.35,fT=[1,2,7].includes(k)?1:.35,fS=k>=3?1:.35;
    // the in-memory buffer: a glass tray, analysed but not searchable
    R.glass([BX-1.45,.02,BZ-.5],[2.9,0,0],[0,0,1],{c:P.c5,a:fB*.8,nu:6,nv:3});
    if(k!==6)R.label([BX,0,BZ+.5],R.W<520?'buffer':'in-memory buffer · not searchable',{fs:12.5,b:1,c:P.c5,a:Math.max(.5,fB),dy:12});
    // the translog on disk: an append-only strip
    R.box([TX0+1.4,0,TZ],[3.6,.05,.7],{fill:mix(P.paper,P.c4,.18),a:fT,shadow:false});
    if(k!==6)R.label([TX0+1.4,0,TZ+.35],R.W<520?'translog':'translog on disk · fsynced, replayed after a crash',{fs:12.5,b:1,c:P.c4,a:Math.max(.5,fT),dy:12});
    // segments: immutable mini-indexes, the only thing a search reads
    R.label([2.75,0,SZ+.5],R.W<520?'segments':'segments · immutable, searchable',{fs:12.5,b:1,c:P.c1,a:Math.max(.5,fS),dy:12});
    if(!s.segs.length)R.box([2.75,0,SZ],[3,.02,1],{fill:P.paper,a:.25,shadow:false});
    // documents leaving: the buffer emptied by a refresh, segments merged away, the translog trimmed
    if(k===3||k===5)pv.buf.forEach((d,i)=>doc(R,bufPos(i),d,{a:1-e}));
    if(k===6)pv.segs.forEach(sg=>{R.box([sg.x,0,SZ],[sg.docs.length*DG+.25,.14,1],{fill:mix(P.paper,P.c1,.2),a:1-e});sg.docs.forEach((d,j)=>doc(R,segDoc(sg,j),d[0],{a:1-e,dead:d[1]}))});
    if(k===7)pv.tl.forEach((d,i)=>doc(R,tlPos(i),d,{a:(1-e)*fT}));
    // what is there now; what this step added fades in
    s.buf.forEach((d,i)=>doc(R,bufPos(i),d,{a:(pv.buf.includes(d)&&k!==0?1:k===0?1:e)*fB,fill:mix(P.paper,P.c5,.25)}));
    s.tl.forEach((d,i)=>doc(R,tlPos(i),d,{a:(pv.tl.includes(d)||k===7?1:e)*fT,fill:mix(P.paper,P.c4,.15)}));
    s.segs.forEach(sg=>{const old=pv.segs.some(o=>o.n===sg.n),a=(old||k===7?1:k===6?at(k,e,6):e)*fS;
      R.box([sg.x,0,SZ],[sg.docs.length*DG+.25,.14,1],{fill:mix(P.paper,P.c1,.2),a});R.label([sg.x-(sg.docs.length*DG+.25)/2,.14,SZ-.5],sg.n,{mono:true,fs:12.5,b:1,c:P.c1,a,al:'left',dy:-4});
      sg.docs.forEach((d,j)=>{const dead=!!d[1],newly=dead&&k===4;doc(R,segDoc(sg,j),d[0],{a:newly?1:a,dead:dead&&(!newly||e>.4)})})});
    // movement
    const newBuf=s.buf.filter(d=>!pv.buf.includes(d));
    if(k===1||k===2||k===4)newBuf.forEach(d=>{const i=s.buf.indexOf(d),j=s.tl.indexOf(d);R.flowArc(IN,[bufPos(i)[0],.3,BZ],.4,{c:P.c5,a:Math.min(1,e*2),r:.06,n:6});R.flowArc(IN,[tlPos(j)[0],.3,TZ],.4,{c:P.c4,a:Math.min(1,e*2),r:.06,n:6})});
    if(k===1)R.label(IN,'index d1',{mono:true,fs:12.5,b:1,al:'right',dx:-6,a:e});
    if(k===3||k===5){const sg=s.segs[s.segs.length-1];pv.buf.forEach((d,i)=>R.flowArc([bufPos(i)[0],.3,BZ],[sg.x,.4,SZ],.6,{c:P.c1,a:Math.min(1,e*2),r:.06,n:6}))}
    if(k===6)pv.segs.forEach(sg=>R.flowArc([sg.x,.3,SZ],[2.75,.4,SZ],.5,{c:P.c1,a:Math.min(1,e*2),r:.06,n:6}));
    if(k===7){R.flow([[TX0,.2,TZ],[TX0+3,.2,TZ]],{c:P.c4,a:1-e,r:.05,n:6});R.glow([2.75,.4,SZ],1,{c:P.good,a:e*.6});R.label([2.75,.6,SZ],'committed (fsynced)',{fs:12.5,b:1,c:P.good,a:e,dy:-30})}
    // a search reads every segment and merges the results
    if(k===2||k===5){const a=k===2?e:Math.max(0,e*2-1);R.ball(QX,.1,{c:P.acc,a});R.label(QX,'search',{fs:12.5,b:1,c:P.acc,al:'right',dx:-10,dy:-12,a});
      if(k===5)s.segs.forEach(sg=>R.flowArc(QX,[sg.x,.4,SZ],.5,{c:P.acc,a,r:.05,n:5}));
      else R.label([QX[0],.3,QX[2]],'finds nothing yet',{fs:12,c:P.mute,al:'right',dx:-10,dy:8,a})}
    // the clock
    R.label([5.2,0,-1.95],'t = '+s.t+' s',{mono:true,fs:13,b:1,c:P.mute,al:'right'});
  }
  const full={cam:[.1,.78],bounds:[[-5,0,-2],[5.3,.9,1.9]]};
  S3.stage({id:'stg-es',list:'sx-es',fig:'One document through a Lucene shard',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:5000,draw,
    margin:w=>w<520?[18,8,14,8]:[24,18,24,18],
    view:k=>k===6?{cam:[.2,.7],bounds:[[.6,0,-.4],[5.3,.9,1.9]]}:full});
})();

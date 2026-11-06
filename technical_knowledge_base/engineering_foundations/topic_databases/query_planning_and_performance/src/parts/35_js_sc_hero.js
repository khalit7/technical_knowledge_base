// ---- Scene, Fig. 1 (top): the title search's prediction path against what ran (renderer v2) ----
// SELECT id, title FROM chats WHERE title LIKE 'Chat 123456%' ORDER BY id LIMIT 10, the workload's real plan (QPD.workload.explain_before / explain_after).
// The chats table as 20 blocks in id order (each a twentieth of its 1,000,000 rows); the plan's two nodes above it; pg_stats as a glass plate behind;
// the estimate (100) against the actual rows (1) as two bars; the fix, a B-tree on title, in front. Every number is parsed from the recorded plans.
(function(){
  if(!document.getElementById('stg-hero')||!window.QPD)return;const {at,off,lerp,mix}=S3;
  const W=QPD.workload,eb=W.explain_before,ea=W.explain_after,num=(t,re)=>{const m=t.match(re);return m?+m[1]:NaN},f=x=>Number(x).toLocaleString('en-GB');
  const scan=eb.split('\n').find(l=>/Index Scan using chats_pkey/.test(l));
  const D={est:num(scan,/rows=(\d+) width/),act:num(scan,/actual time=[^ ]+ rows=(\d+)/),cost:num(scan,/cost=[\d.]+\.\.([\d.]+)/),lim:num(eb,/^Limit +\(cost=[\d.]+\.\.([\d.]+)/),
    removed:num(eb,/Rows Removed by Filter: (\d+)/),hit:num(eb,/Buffers: shared hit=(\d+)/),ms:num(eb,/Execution Time: ([\d.]+)/),
    ms2:num(ea,/Execution Time: ([\d.]+)/),pages2:num(ea,/Buffers: shared hit=(\d+)/)+num(ea,/Buffers: shared hit=\d+ read=(\d+)/)};
  window.CHK=Object.assign(window.CHK||{},{hero:D});
  const N=20,BW=.44,BHt=.42,x=i=>-4.75+i*.5,MATCH=Math.floor(123456/1e6*N); // titles are 'Chat ' || id, so the one match is chat 123,456: block 2 of 20
  const YS=1.55,YL=2.55,BX=2.45,BH=1.6; // scan node, limit node, bars' x, height of the 100-row bar (linear: the actual row is 1/100 of it)
  const TX=[-3.9,-2.75,-1.6,-.45,.7],TZ=2.2,PX=-5.25,PY=1.1; // the title index's leaves, in front; the pg_stats plate, upper left
  function draw(R,k,e){const P=R.P;R.grid(-6,4,-1.6,3,.5);
    const back=k===3?.3:k===4?.2:1; // composition: what the step is about at full strength, the rest recedes
    // the table: 20 blocks in id order; during execution they light up as the walk passes them
    const swept=k===2?e*N:k>2?N:0;
    for(let i=0;i<N;i++){let fill=P.paper;if(i<swept)fill=mix(P.paper,P.bad,.28);if(i===MATCH&&swept>MATCH)fill=mix(P.paper,P.good,.6);if(k===4&&i===MATCH)fill=mix(P.paper,P.good,.6);
      R.box([x(i),0,0],[BW,BHt,1],{fill,a:k===4&&i!==MATCH?.3:Math.max(.4,back),lw:.7})}
    if(k<4)R.label([0,0,.5],'chats · 1,000,000 rows in id order',{fs:12,c:P.mute,dy:16,a:Math.max(.55,back)});
    // the plan: Limit over the Index Scan on the primary key (in step 5 the scan uses the new title index)
    const na=k===4?1:back===1?1:.75;
    R.box([0,YS,0],[3.6,.36,1],{fill:k===3?mix(P.paper,P.bad,.18):k===4?mix(P.paper,P.good,.15):P.paper,a:na});
    R.label([0,YS+.18,.5],k===4?'Index Scan using chats_title':'Index Scan using chats_pkey',{fs:12.5,b:1,mono:true,a:na});
    R.box([0,YL,0],[2.4,.34,.9],{a:na});R.label([0,YL+.17,.45],'Limit · 10 rows',{fs:12.5,b:1,mono:true,a:na});
    // 1. statistics: a sample of the table goes into pg_stats (a glass plate), which hands the scan its estimate
    const pa=k===0?1:k===1?.55:.2;
    R.glass([PX,PY,-.3],[2.7,0,0],[0,1.5,0],{c:P.c1,a:pa,nu:9,nv:5});
    R.label([PX+1.35,PY+1.5,-.3],'pg_stats · sample of 30,000 rows',{fs:12,c:P.c1,b:1,a:pa,dy:-10});
    if(k<=1)R.label([PX+1.35,PY+.75,-.25],'estimate: rows='+D.est,{fs:14,mono:true,b:1,c:P.c1,a:k===0?at(k,e,0):1});
    if(k===0){R.flowArc([x(2),BHt,0],[PX+1.2,PY,-.3],.5,{c:P.c1,a:Math.min(1,e*1.5),r:.06,n:7});R.flowArc([PX+2.7,PY+.9,-.3],[-1.8,YS+.18,0],.3,{c:P.c1,a:e,r:.06,n:6})}
    // 2. cost: walking the key should find 10 matches within about a tenth of the table
    if(k===1){R.box([x(.5),0,0],[1.04,.75,1.15],{fill:P.acc,fa:.2,a:e,shadow:false});
      R.flow([[x(0),BHt+.12,.3],[x(1)+.2,BHt+.12,.3],[-1.5,YS,.3]],{c:P.acc,a:e,r:.06,n:7});
      R.label([x(.5),.75,.55],'10 matches expected by here',{fs:12,b:1,c:P.acc,a:e,dy:-8});
      R.label([1.25,YL+.17,0],'cost '+f(Math.floor(D.lim))+' of '+f(Math.floor(D.cost)),{al:'left',dx:8,fs:12.5,mono:true,b:1,wide:1,c:P.acc,a:e})}
    // 3. execution: the walk goes through every block; the one match rises to the Limit; everything else is removed by the filter
    if(k===2){const pts=[[x(0),BHt+.12,.3]];for(let i=1;i<N;i++)pts.push([x(i),BHt+.12,.3]);pts.push([1.7,YS,.3]);R.flow(pts,{c:P.bad,a:Math.min(1,e*2),r:.055,n:44,speed:2.2});
      if(swept>MATCH){R.glow([x(MATCH),BHt,.3],.55,{c:P.good,a:.8});R.flow([[x(MATCH),BHt,0],[-.9,YS,0],[-.5,YL,0]],{c:P.good,a:1,r:.08,n:2,speed:1})}
      R.label([x(14),BHt+.2,.4],f(D.removed)+' removed by the filter',{fs:12,b:1,c:P.bad,a:at(k,e,2),dy:-12});
      R.label([1.25,YL+.17,0],f(D.hit)+' pages · '+D.ms.toFixed(1)+' ms',{al:'left',dx:8,fs:12.5,mono:true,b:1,wide:1,c:P.bad,a:e})}
    // 4. EXPLAIN ANALYZE: estimated rows (glass) against actual rows (solid), to scale
    if(k===3){const h=BH*e;R.box([BX,YS,0],[.45,h,.45],{fill:P.c1,fa:.35,a:1,shadow:false});R.box([BX+.6,YS,0],[.45,Math.max(.02,h*D.act/D.est),.45],{fill:P.bad,a:1,shadow:false});
      R.label([BX,YS+h,0],'estimated '+D.est,{fs:12.5,mono:true,b:1,c:P.c1,dy:-10,a:e});R.label([BX+.6,YS,0],'actual '+D.act,{fs:12.5,mono:true,b:1,c:P.bad,al:'left',dy:-4,dx:18,a:e});
      R.label([0,YS,.5],'Rows Removed by Filter: '+f(D.removed),{fs:12,mono:true,b:1,c:P.bad,dy:14,a:e})}
    // 5. the fix: a B-tree on title descends straight to the one match
    if(k===4){const ra=at(k,e,4),RT=[-1.6,1.5,TZ];R.box(RT,[1.3,.3,.7],{fill:mix(P.paper,P.good,.25),a:ra});R.label([RT[0]-.7,RT[1]+.15,TZ],'B-tree on title',{fs:12,mono:true,b:1,wide:1,al:'right',dx:-6,a:ra,c:P.good});
      TX.forEach((tx,j)=>{R.box([tx,.4,TZ],[.95,.26,.6],{fill:j===1?mix(P.paper,P.good,.4):P.paper,a:ra*(j===1?1:.55),shadow:false});R.line([[RT[0],RT[1],TZ],[tx,.66,TZ]],{c:P.mute,w:1,a:ra*.5})});
      R.flow([[RT[0],RT[1]+.15,TZ],[TX[1],.66,TZ],[x(MATCH),BHt,.4],[-1,YS,.3],[-.5,YL,.3]],{c:P.good,a:ra,r:.075,n:9,speed:1.3});
      R.label([1.25,YL+.17,0],D.pages2+' pages · '+D.ms2+' ms',{al:'left',dx:8,fs:12.5,mono:true,b:1,wide:1,c:P.good,a:ra})}
  }
  const full={cam:[.22,.36],bounds:[[-5.3,0,-.5],[5.1,3.3,1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one slow search, predicted and run',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,24,8]:[16,150,28,70],
    // step 4 moves in close on the scan node and its two bars; the fix looks from the front
    view:k=>k===3?{cam:[.4,.3],bounds:[[-2,.6,-.6],[3.4,3.4,.8]]}:k===4?{cam:[.25,.48],bounds:[[-5.3,0,-.5],[3.3,3,2.5]]}:full});
})();

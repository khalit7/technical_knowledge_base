// ---- Scene, Fig. 2 (section 2): three access paths for one range, id BETWEEN 5001 AND 25000 on users (renderer v2) ----
// The table as 320 tiles of 4 pages (users: 1,280 pages), the primary-key B-tree beside it (a root over 276 leaves, drawn as 8),
// and a bar per path for the pages it touched. Costs, pages and times come from QPD.cm.presets (EXPLAIN and the forced runs, measured);
// which tiles hold the 20,000 rows is drawn for illustration (315 of the 1,280 pages, in long runs, as measured), and so is where each index fetch lands.
(function(){
  if(!document.getElementById('stg-scan')||!window.QPD)return;const {at,off,lerp,mix}=S3;
  const PR=QPD.cm.presets,f=x=>Number(x).toLocaleString('en-GB');
  // the measured row for one size, in either of the two record shapes
  function row(t,n){const r=PR[t].rows.find(r=>r.n===n),g=(p)=>{const c=typeof r[p]==='number'?r[p]:r[p].total,m=r.ms[p],pg=r.pages?r.pages[p]:m.pages;return {cost:c,ms:typeof m==='number'?m:m.ms,pages:pg}};
    return {seq:g('seq'),index:g('index'),bitmap:g('bitmap')}}
  const U=row('users',20000),M=row('messages',1000000),relU=PR.users.relpages,leaves=PR.users.idxpages;
  window.CHK=Object.assign(window.CHK||{},{scan:{U,M,relU,leaves}});
  const C=20,RW=16,PT=.3,X0=-2.85,Z0=-2.25,tx=t=>X0+(t%C)*PT,tz=t=>Z0+Math.floor(t/C)*PT,NT=C*RW; // 320 tiles: 4 users pages each
  // the 20,000 users' pages, 315 of 1,280 in long runs: 79 tiles (positions illustrative)
  const RUNS=[[37,20],[101,20],[190,20],[262,19]],HOT=[];RUNS.forEach(([a,n])=>{for(let i=0;i<n;i++)HOT.push(a+i)});const isHot=new Set(HOT);
  // messages: ids 500,001 to 1,500,000 of 10,000,000 in id order, 5% to 15% of the table: one run
  const MS=Math.round(.05*NT),ME=Math.round(.15*NT);
  let rs=7;const rnd=()=>(rs=(rs*16807)%2147483647)/2147483647,JUMP=[];for(let i=0;i<14;i++)JUMP.push(HOT[Math.floor(rnd()*HOT.length)]);
  const IX=-4.7,RY=1.5,LY=.62,LZ=j=>-2.1+j*.6; // the index: root above, 8 leaves standing in a row along z
  const BX={seq:3.6,index:4.6,bitmap:5.6},BMAX=2.4;
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.8,-2.8,2.8,.5);
    const msg=k===4,hotNow=t=>msg?(t>=MS&&t<ME):isHot.has(t);
    // the heap: tiles light as a path touches them
    const lit=t=>k===1?t<e*NT:k===2?(hotNow(t)&&HOT.indexOf(t)<e*HOT.length*1.6):k===3?(hotNow(t)&&HOT.indexOf(t)<e*HOT.length):k===4?(hotNow(t)&&(t-MS)<e*(ME-MS)):false;
    const lc=k===1?P.c5:k===2?P.c2:k===3?P.good:P.c1;
    for(let t=0;t<NT;t++){const x=tx(t),z=tz(t),h=.04,fill=lit(t)?mix(P.paper,lc,.7):k>=2&&hotNow(t)?mix(P.paper,lc,.18):P.paper;
      R.quad([[x-.13,h,z-.13],[x+.13,h,z-.13],[x+.13,h,z+.13],[x-.13,h,z+.13]],{fill,ea:.35,lw:.6})}
    R.label([X0+C*PT/2-.15,0,Z0+RW*PT],msg?'messages · 192,356 pages, each tile about 600':'users · 1,280 pages of 8 KB, each tile 4',{fs:12,c:P.mute,dy:16});
    // the index: root over leaves (276 for users)
    const ia=k===1?.3:1;R.box([IX,RY,0],[.8,.24,.6],{a:ia,fill:mix(P.paper,P.c2,.18)});
    for(let j=0;j<8;j++){const inR=msg?j===0||j===1:j<2;R.box([IX,LY,LZ(j)],[.55,.18,.42],{a:ia*(k>=2&&!inR?.45:1),fill:k>=2&&inR?mix(P.paper,P.c2,.45):P.paper,shadow:false});R.line([[IX,RY,0],[IX,LY+.18,LZ(j)]],{c:P.mute,w:1,a:ia*.45})}
    R.label([IX,RY+.24,0],msg?'messages_pkey':'users_pkey · root over '+leaves+' leaves',{fs:12,b:1,mono:true,dy:-10,a:ia,wide:1});
    // the query
    if(k===0)R.label([0,0,-2.6],'WHERE id BETWEEN 5001 AND 25000 · 20,000 rows',{fs:13,mono:true,b:1,c:P.acc,a:e,dy:-14});
    // 2. Seq Scan: one pass through every page in order
    if(k===1){const pts=[];for(let r=0;r<RW;r++){const a=[X0-.1,.12,Z0+r*PT],b=[X0+(C-1)*PT+.1,.12,Z0+r*PT];if(r%2)pts.push(b,a);else pts.push(a,b)}
      R.flow(pts,{c:P.c5,a:Math.min(1,e*2),r:.05,n:70,speed:3.2})}
    // 3. Index Scan: descend, then one fetch per row, landing on the same few hundred pages again and again
    if(k===2){R.flow([[IX,RY+.1,0],[IX,LY+.2,LZ(0)],[IX,LY+.2,LZ(1)]],{c:P.c2,a:Math.min(1,e*2),r:.06,n:5});
      JUMP.forEach((t,i)=>R.flowArc([IX+.2,LY+.1,LZ(i%2)],[tx(t),.08,tz(t)],.9+.05*(i%4),{c:P.c2,a:Math.min(1,e*1.6)*.75,r:.045,n:4,speed:2.4}))}
    // 4. Bitmap Heap Scan: addresses sorted by page into a bitmap, then each page once in physical order
    if(k===3){const bmp=[-3.55,.06,-2.1];R.glass(bmp,[.3,0,0],[0,0,4.2],{c:P.good,a:e,nu:1,nv:12,th:.03});R.label([-3.4,.1,2.3],'bitmap',{fs:12,c:P.good,b:1,dy:10,a:e});
      R.flow([[IX+.2,LY,LZ(0)],[IX+.2,LY,LZ(1)],[-3.4,.12,-1.5]],{c:P.good,a:e,r:.05,n:5});
      const pts=[[-3.4,.12,-2]];RUNS.forEach(([a,n])=>{pts.push([tx(a),.1,tz(a)]);let t=a;for(let i=1;i<n;i++){t=a+i;if(tz(t)!==tz(t-1)){pts.push([tx(t-1),.1,tz(t-1)]);pts.push([tx(t),.1,tz(t)])}}pts.push([tx(a+n-1),.1,tz(a+n-1)])});
      R.flow(pts,{c:P.good,a:e,r:.05,n:40,speed:2.6})}
    // 5. messages: the matching rows sit together, so the index scan reads one run
    if(k===4){R.flow([[IX,RY+.1,0],[IX,LY+.2,LZ(0)],[tx(MS),.1,tz(MS)]],{c:P.c1,a:e,r:.06,n:6});
      const pts=[];for(let t=MS;t<ME;t++){if(t===MS||tz(t)!==tz(t-1)){pts.push([tx(t),.1,tz(t)])}if(t===ME-1||tz(t+1)!==tz(t))pts.push([tx(t),.1,tz(t)])}R.flow(pts,{c:P.c1,a:e,r:.05,n:24,speed:2.4})}
    // the tally: pages touched by each path, to scale (users, then messages)
    const T=msg?M:U,mx=Math.max(T.seq.pages,T.index.pages,T.bitmap.pages),sh={seq:1,index:2,bitmap:3};
    [['seq','Seq',P.c5],['index','Index',P.c2],['bitmap','Bitmap',P.good]].forEach(([p,nm,c])=>{const a=msg?1:at(k,e,sh[p]);if(a<=.01)return;const h=Math.max(.025,T[p].pages/mx*BMAX)*(k===sh[p]||(msg&&k===4)?e:1);
      const ch=msg?T[p].pages===Math.min(T.seq.pages,T.index.pages,T.bitmap.pages)||p==='index':p==='bitmap';
      R.box([BX[p],0,.3],[.42,h,.42],{fill:c,a,lw:ch&&k>=3?1.6:.8});R.label([BX[p],h,.3],f(T[p].pages),{fs:12,mono:true,b:1,dy:-10,a,c});
      R.label([BX[p],0,.6],nm,{fs:12,b:ch&&k>=3,dy:12,a,c:ch&&k>=3?P.ink:P.mute});
      R.label([BX[p],0,.6],(T[p].ms<10?T[p].ms.toFixed(1):Math.round(T[p].ms))+' ms',{fs:12,mono:true,dy:28,a,c:P.mute,wide:1})});
    if(k>=1)R.label([BX.index,BMAX+.75,.3],msg?'pages touched · 1,000,000 messages':'pages touched · 20,000 users',{fs:12,c:P.mute,a:k===1?e:1,wide:1});
  }
  const full={cam:[.18,.6],bounds:[[-5.2,0,-2.5],[6,3.1,2.6]]};
  S3.stage({id:'stg-scan',list:'sx-scan',fig:'Fig. 2 · three ways to read 20,000 rows',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,30,8]:[20,16,40,16]});
})();

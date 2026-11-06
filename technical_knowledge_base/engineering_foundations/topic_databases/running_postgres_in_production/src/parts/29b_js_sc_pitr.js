// ---- Scene, Fig. 2 (section 2): a nightly dump against a base backup plus archived WAL, on the same bad DELETE (renderer v2) ----
// Data: window.RPG.pitr, the real run: rows before the DELETE, rows each recovery got back, the recovery times, and the archived WAL segments
// recovery replayed (parsed from its log: ...14 to ...22), stopping before the DELETE's commit (transaction 738). Clock times are illustrative.
(function(){
  if(!document.getElementById('stg-pitr')||!window.RPG)return;const {at,off,lerp,mix}=S3;
  const D=RPG.pitr||{},ST=D.steps||{},base=D.count_dump||1e6,good=D.before_delete||1012000,today=good-base,fmt=n=>Math.round(n).toLocaleString('en-US');
  const log=(ST.restore_pitr&&ST.restore_pitr.log)||[],segs=log.map(l=>(l.match(/restored log file "([0-9A-F]{24})"/)||[])[1]).filter(Boolean).map(f=>f.slice(-2));
  const stopTx=((log.find(l=>/recovery stopping/.test(l))||'').match(/transaction (\d+)/)||[])[1]||'738';
  const tDump=(ST.restore_dump&&ST.restore_dump.secs)||0,tPitr=(ST.restore_pitr&&ST.restore_pitr.secs)||0;
  let mode='dump';
  const X=h=>-5+8.6*h/15,ZT=1.75,ZS=.35,SW=8.6*13.6/15/Math.max(1,segs.length); // timeline in front, segments behind it
  const XS=i=>X(.4)+SW*(i+.5),XP=4.5,ZP=-1.45,ZR=1.15,HB=1.5,HT=.42; // servers on the right: production at the back, recovered in front
  // per step: clock (hours), production rows, archived fraction
  const SP=[{h:0,prod:base,arc:0},{h:9,prod:base+today/3,arc:.35},{h:14.05,prod:good,arc:1},{h:14.05,prod:0,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1}];
  // a messages table as a column: the midnight rows, then today's rows as a cap drawn taller than their 1.2% (labelled)
  function column(R,x,z,rows,a,tint,ghost){const P=R.P,b=Math.min(1,rows/base),t=Math.max(0,Math.min(1,(rows-base)/today));
    R.box([x,0,z],[1.05,HB,1.05],{a:ghost?.12:a*.25,fill:P.paper,fa:.25,shadow:false,lw:.6});
    if(b>.002)R.box([x,0,z],[1.01,HB*b,1.01],{fill:mix(P.paper,tint,.35),a});
    if(t>.01)R.box([x,HB,z],[1.01,HT*t,1.01],{fill:mix(P.paper,P.acc,.6),a,shadow:false});
    R.box([x,HB,z],[1.05,HT,1.05],{a:ghost?.12:a*.25,fill:P.paper,fa:.15,shadow:false,lw:.6,ec:P.mute})}
  function draw(R,k,e){const P=R.P,pitr=mode==='pitr',s0=SP[k],s1=SP[Math.max(0,k-1)];R.grid(-5.6,5.4,-2.4,2.4,.5);
    // the clock along the front
    R.line([[X(0),0,ZT],[X(15),0,ZT]],{c:P.mute,w:1.5});
    [0,3,6,9,12,15].forEach(h=>{R.line([[X(h),0,ZT-.08],[X(h),0,ZT+.08]],{c:P.mute,w:1.2});R.label([X(h),0,ZT+.1],String(h).padStart(2,'0')+':00',{mono:true,fs:12,c:P.mute,dy:12,grp:'clock'})});
    const hh=lerp(s1.h,s0.h,k===0?1:e);R.ball([X(hh),.06,ZT],.1,{c:P.acc});
    // the copy taken at midnight
    const ca=k===0?Math.min(1,e*1.6):k===5?1:.45;
    R.box([X(0),0,ZS],[.62,pitr?.62:.42,.7],{fill:mix(P.paper,P.c3,.45),a:ca});
    R.label([X(0),pitr?.62:.42,ZS],pitr?'base backup · 258 MB':'dump file · 33.9 MB',{fs:12.5,b:1,c:mix(P.ink,P.c3,.5),dy:-10,a:Math.max(.5,ca)});
    // the WAL archive: lit as segments are archived; the last one holds the DELETE's commit
    const arcF=lerp(s1.arc,s0.arc,k===0?1:e),nS=segs.length;
    segs.forEach((g,i)=>{const lit=pitr&&(i+.5)/nS<=arcF,last=i===nS-1,red=pitr&&last&&k>=3;
      let fill=lit?mix(P.paper,P.c5,.55):P.paper,a=pitr?(lit?1:.18):.1;
      if(red)fill=mix(P.paper,P.bad,.6);
      if(k===6&&pitr){const u=e*nS;a=1;if(i<u-.5)fill=mix(P.paper,P.c5,.2)}
      if(k===7&&pitr&&!last)fill=mix(P.paper,P.c5,.2);
      R.box([XS(i),0,ZS],[SW*.84,.2,.7],{fill,a,shadow:false,lw:.6})});
    if(pitr){R.label([XS(0),0,ZS+.35],'…'+segs[0],{mono:true,fs:12,c:P.mute,dy:10,a:k>=1?1:.5});R.label([XS(nS-1),0,ZS+.35],'…'+segs[nS-1],{mono:true,fs:12,c:k>=3?P.bad:P.mute,dy:10,a:k>=2?1:.5});
      R.label([(XS(0)+XS(nS-1))/2,.2,ZS-.35],'archived WAL · 16 MB segments',{fs:12,c:mix(P.ink,P.c5,.5),dy:-6,a:k===1||k===2||k===6?1:.0})}
    else R.label([(XS(0)+XS(nS-1))/2,.1,ZS],'no WAL kept: only the midnight file',{fs:12,c:P.mute,a:k>=1&&k<=2||k===6?1:0});
    if(k===1&&pitr)R.flowArc([XP-.45,.6,ZP],[XS(Math.floor(arcF*nS*.9)),.25,ZS],.5,{c:P.c5,a:e,r:.06,speed:1.3});
    // production server
    const prodRows=k===3?lerp(good,0,e):s0.prod;
    column(R,XP,ZP,k<=2?lerp(s1.prod,s0.prod,k===0?1:e):prodRows,k>=5?.35:1,P.c1);
    R.label([XP,HB+HT,ZP],'production · '+fmt(prodRows)+' rows',{fs:12.5,b:1,dy:-10,a:k>=5?.5:1});
    if(k===1||k===2)R.flow([[XP-1.6,.9,ZP],[XP-.5,.9,ZP]],{c:P.acc,a:e,r:.06,speed:1.2,n:4});
    if(k===3){R.glow([XS(nS-1),.25,ZS],.7,{c:P.bad,a:e*.8});R.label([X(14.05),.2,ZS-.4],'DELETE 14:03 · tx '+stopTx,{fs:12.5,b:1,c:P.bad,dy:-10,a:e});
      R.flowArc([XP-.45,.5,ZP],[XS(nS-1),.25,ZS],.4,{c:P.bad,a:e,r:.06,speed:1.4})}
    if(k===4)R.label([XP+.55,.1,ZP],'2 new messages',{al:'left',dx:8,fs:12,c:P.mute,a:e});
    // the recovered server
    const ra=at(k,e,5);
    let rec=k<5?0:k===5?lerp(0,base,e):pitr?(k===6?lerp(base,good,e):good):base;
    if(ra>0){column(R,XP,ZR,rec,ra,P.c3,false);
      R.label([XP,HB+HT,ZR],'recovered · '+fmt(rec)+' rows',{fs:12.5,b:1,dy:-10,a:ra,c:mix(P.ink,P.c3,.5)})}
    if(k===5)R.flowArc([X(0)+.3,.5,ZS],[XP-.45,.6,ZR],.9,{c:P.c3,a:e,r:.07,speed:1.6});
    if(k===6&&pitr){const u=Math.min(nS-1,Math.floor(e*nS));for(let i=0;i<nS-1;i++)if(Math.abs(i-u)<=2)R.flowArc([XS(i),.25,ZS],[XP-.45,.9,ZR],.6,{c:P.c5,a:1-Math.abs(i-u)/3,r:.055,speed:1.6,n:6});
      R.label([XS(nS-1),.2,ZS+.35],'stops before commit of '+stopTx,{fs:12,b:1,c:P.bad,dy:16,a:e})}
    if(k===6&&!pitr)R.label([XP-.55,HB*.5,ZR],'nothing to replay',{al:'right',dx:-10,fs:12.5,c:P.mute,a:e});
    if(k===7){const lost=pitr?0:today;R.label([XP-.55,HB*.55,ZR],pitr?'lost 0 · recovery '+tPitr+' s':'lost '+fmt(lost)+' · restore '+tDump+' s',{al:'right',dx:-10,fs:14,b:1,c:pitr?P.good:P.bad,a:e});
      if(!pitr)R.box([XP,HB,ZR],[1.05,HT,1.05],{fill:mix(P.paper,P.bad,.35),a:e*.6,shadow:false,fa:.5,ec:P.bad})}
    if(k>=5)R.label([XP+.55,HB+HT*.5,ZP],'today, drawn taller',{al:'left',dx:6,fs:12,c:P.mute,wide:1,a:.8});
  }
  const full={cam:[.14,.56],bounds:[[-5.4,0,-2.1],[5.4,2.0,2.1]]};
  const st=S3.stage({id:'stg-pitr',list:'sx-pitr-dump',fig:'Fig. 2 · the same DELETE, recovered two ways',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,8,26,8]:[18,16,30,16],
    // step 1 moves in close on the midnight copy, step 4 on the DELETE; the rest show the whole day
    view:k=>k===0?{cam:[.25,.62],bounds:[[-5.6,0,-1.2],[-1.6,1.0,2.1]]}:k===3?{cam:[.1,.56],bounds:[[.6,0,-2.1],[5.4,2.0,2.1]]}:full});
  const sw=document.getElementById('rd-pitr-mode');
  if(sw&&st)RD.seg(sw,m=>{mode=m;['dump','pitr'].forEach(x=>document.getElementById('sx-pitr-'+x).hidden=x!==m);st.list('sx-pitr-'+m)});
})();

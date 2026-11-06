// ---- Scene, Fig. 5 (section 5): chat_state's heap pages through the four phases of the measured run (renderer v2) ----
// One tile stands for 50 of the table's 8 KB pages and carries four row-version slots (live white, dead orange, free outlined); the visibility
// map is one square per tile. Page counts (879, 1552, 1615), dead tuples (peaks per phase from the 1-second samples) and the log lines are
// parsed from window.RPG.vacuum, the real run; which slots are dead is drawn at the measured fraction, not per real row.
(function(){
  if(!document.getElementById('stg-vac')||!window.RPG)return;const {at,off,lerp,mix}=S3;
  const V=RPG.vacuum||{},ST=V.steps||{},S=V.series||[],num=(t,re)=>{const m=String(t||'').match(re);return m?+m[1]:0};
  const pgA=num(ST.phase_a&&ST.phase_a.out,/(\d+) remain, \d+ scanned/)||879,pgB=num(ST.phase_b_autovac&&ST.phase_b_autovac.out,/(\d+) remain, \d+ scanned/)||1552;
  const pgV=num(ST.manual_vacuum&&ST.manual_vacuum.out,/(\d+) remain, \d+ scanned/)||1615,notRem=num(ST.phase_b_autovac&&ST.phase_b_autovac.out,/(\d+) are dead but not yet removable/)||82363;
  const removed=num(ST.manual_vacuum&&ST.manual_vacuum.out,/tuples: (\d+) removed/)||89743,xmin=num(ST.phase_b_activity&&ST.phase_b_activity.out,/idle in transaction\s*\|[^|]*\|\s*(\d+)/)||180862;
  const peak=ph=>Math.max(0,...S.filter(p=>p[7]===ph).map(p=>p[2])),live=100000,trig=50+.2*live;
  const PER=50,NC=6,tiles=pg=>Math.round(pg/PER),T0=tiles(pgA),T1=tiles(pgB),T2=tiles(pgV);
  const fHot=peak('hot')/(live+peak('hot')),fA=trig/(live+trig),fB=notRem/(live+notRem);
  const X=c=>-2.6+c*1.02,Z=r=>1.25-r*.72,XI=-4.3,XV=3.75;
  const rnd=(i,j)=>{const x=Math.sin(i*127.1+j*311.7)*43758.5453;return x-Math.floor(x)};
  function heap(R,n,deadF,vmF,o){const P=R.P;o=o||{};
    for(let i=0;i<n;i++){const c=i%NC,r=Math.floor(i/NC),x=X(c),z=Z(r),grow=o.grow&&i>=o.grow[0]?o.grow[1]:1;if(grow<=.01)continue;
      R.box([x,0,z],[.88,.07,.58],{fill:mix(P.paper,P.line,.35),a:grow*(o.a||1),shadow:false,lw:.6});
      for(let j=0;j<4;j++){const sx=x-.3+j*.2,d=rnd(i,j)<deadF,fr=o.free&&rnd(i,j)<o.free;
        if(fr&&!d){R.box([sx,.07,z],[.15,.15,.15],{fill:P.paper,a:grow*.35,fa:.1,shadow:false,lw:.6,ec:P.mute});continue}
        R.box([sx,.07,z],[.15,.15,.15],{fill:d?mix(P.paper,o.pinned?P.bad:P.c2,o.pinned?.8:.6):P.paper,a:grow,shadow:false,lw:.6})}
      // visibility map: one square per tile, green while every row on it is visible to everyone
      const on=rnd(i,9)>=vmF;R.box([XV+(c-2.5)*.2,0,.9-r*.2],[.15,.03,.15],{fill:on?mix(P.paper,P.good,.75):mix(P.paper,P.line,.6),a:grow,shadow:false,lw:.5})}}
  function sweep(R,u,n,c){const rows=Math.ceil(n/NC),z=lerp(Z(0)+.45,Z(rows-1)-.45,u);R.line([[X(0)-.6,.32,z],[X(NC-1)+.6,.32,z]],{c,w:3});R.glow([X(NC-1)+.6,.32,z],.3,{c})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-3.2,2.2,.5);
    let n=T0,dead=0,vm=0,free=0,pinned=false,grow=null;
    if(k===1)dead=fHot*(.5+.5*Math.sin(e*Math.PI));
    if(k===2){dead=fA*e;vm=.55*e}
    if(k===3){dead=e<.6?fA:fA*(1-(e-.6)/.4);vm=e<.6?.55:.55*(1-(e-.6)/.4);free=e<.6?0:fA*(e-.6)/.4}
    if(k===4){n=T1;grow=[T0,Math.min(1,e*1.4)];dead=lerp(.02,fB,e);vm=.8;pinned=true}
    if(k===5){n=T2;dead=fB*(1-Math.min(1,e*1.3));free=fB*Math.min(1,e*1.3);vm=.8*(1-Math.min(1,e*1.3))}
    heap(R,n,dead,vm,{free,pinned,grow});
    const rows=Math.ceil(n/NC);
    R.label([X(2.5),0,Z(0)+.38],'chat_state · '+(k<4?pgA:k===4?pgB:pgV).toLocaleString('en-US')+' pages · one tile = '+PER,{fs:12.5,b:1,dy:14});
    R.label([XV,0,1.0],'visibility map',{fs:12.5,b:1,c:P.good,dy:14});
    // 2. a HOT update: the new version lands on the same page
    if(k===1){const x=X(2),z=Z(1);R.flowArc([x-.1,.3,z],[x+.3,.3,z],.25,{c:P.acc,a:e,r:.05,speed:.8,n:4});R.glow([x,.2,z],.5,{c:P.acc,a:e*.6});
      R.label([x,.3,z],'HOT: same page, no index entry',{fs:12.5,b:1,c:P.acc,dy:-22,a:e});
      R.label([X(NC-1)+.5,0,Z(rows-1)],'dead peak '+peak('hot').toLocaleString('en-US'),{al:'left',dx:10,fs:12,c:P.mute,a:e,wide:1})}
    // 3. the index: every update writes a new entry and lands wherever there is room
    const ia=k===2?e:k===3?.5:k>=4?.3:0;
    if(ia>0){R.glass([XI,.05,-1.4],[0,0,2.6],[0,1.0,0],{c:P.c4,a:ia,nu:6,nv:4});R.label([XI,1.1,-.1],'index on last_message_at',{fs:12.5,b:1,c:P.c4,dy:-8,a:ia})}
    if(k===2){[[0,1],[3,2],[5,0],[1,2]].forEach(([c,r],q)=>R.flowArc([XI+.05,.6,-1+q*.6],[X(c),.3,Z(r)],.4,{c:P.c4,a:e,r:.05,speed:1.3,n:5}));
      R.label([X(NC-1)+.5,0,Z(rows-1)],'dead → '+Math.round(trig).toLocaleString('en-US')+', the trigger',{al:'left',dx:10,fs:12.5,b:1,c:P.c2,a:e,wide:1})}
    // 4. autovacuum sweeps: dead slots become free space, visibility bits come back
    if(k===3&&e>.15)sweep(R,Math.min(1,(e-.15)/.8),n,P.good);
    if(k===3)R.label([X(NC-1)+.5,0,Z(rows-1)],'autovacuum: space reusable',{al:'left',dx:10,fs:12.5,b:1,c:P.good,a:e,wide:1});
    // 5. a forgotten transaction: its snapshot pins every newer dead version; the table grows
    if(k===4){R.box([XI,0,-2.2],[.22,1.0,.22],{fill:mix(P.paper,P.bad,.7),ec:P.bad,lw:1.2,a:e});R.glow([XI,1.05,-2.2],.35,{c:P.bad,a:e});
      R.label([XI,1.05,-2.2],'open transaction · xmin '+xmin,{fs:12.5,b:1,c:P.bad,dy:-14,a:e});
      R.line([[XI+.15,.6,-2.2],[X(0)-.5,.25,Z(rows-1)]],{c:P.bad,w:2,dash:[5,4],a:e});
      R.label([X(NC-1)+.5,0,Z(rows-1)],notRem.toLocaleString('en-US')+' dead, not removable',{al:'left',dx:10,fs:12.5,b:1,c:P.bad,a:e,wide:1})}
    // 6. the session ends; one VACUUM
    if(k===5){sweep(R,Math.min(1,e*1.3),n,P.good);R.label([X(NC-1)+.5,0,Z(rows-1)],removed.toLocaleString('en-US')+' removed · file keeps its size',{al:'left',dx:10,fs:12.5,b:1,c:P.good,a:e,wide:1})}
  }
  const full={cam:[.3,.9],bounds:[[-4.7,0,-3.3],[4.6,1.2,1.9]]};
  S3.stage({id:'stg-vac',list:'sx-vac',fig:'Fig. 5 · a hot table\'s pages, dead tuples and vacuum',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,14,16],
    // steps 1 and 2 show the table as it starts, closer; the rest the whole heap as it grows
    view:k=>k<=1?{cam:[.3,.9],bounds:[[-3.4,0,-1.2],[4.6,.8,1.9]]}:full});
})();

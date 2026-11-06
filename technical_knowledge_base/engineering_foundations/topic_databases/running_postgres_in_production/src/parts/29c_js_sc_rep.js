// ---- Scene, Fig. 3 (section 3): one WAL record from the primary's commit to a query on the replica, and where each lag ends (renderer v2) ----
// Data: window.RPG.replication, the real run: pg_stat_replication 9.5 s into a replay pause (write, flush and replay lag and the MB behind),
// and the replay-lag median under 8 writers (series_lag_load). The positions are drawn, not to scale.
(function(){
  if(!document.getElementById('stg-rep')||!window.RPG)return;const {at,off,lerp,mix}=S3;
  const D=RPG.replication||{},ST=D.steps||{};
  const row=String((ST.stat_rep_lag&&ST.stat_rep_lag.out)||'').split('\n').find(l=>/replica1\s*\|/.test(l))||'';
  const c=row.split('|').map(x=>x.trim()),secs=t=>{const m=String(t).match(/(\d+):(\d+):([\d.]+)/);return m?+m[1]*3600+ +m[2]*60+ +m[3]:0};
  const wl=secs(c[1]),fl=secs(c[2]),rl=secs(c[3]),behind=c[4]||'79 MB',bMB=parseFloat(behind)||79;
  const ser=D.series_lag_load||[],med=ser.length?ser.map(p=>p[3]).sort((a,b)=>a-b)[Math.floor(ser.length/2)]:1;
  const XP=-4.0,XW=-2.45,XR=-.35,XF=1.35,XT=3.15,ZB=1.25,SL=.15,NB=Math.round(bMB/16);
  function stack(R,x,n,extra,a,lab){const P=R.P;for(let i=0;i<n+extra;i++){const e2=i>=n;R.box([x,i*SL,0],[1.15,SL*.82,1.0],{fill:e2?mix(P.paper,P.bad,.5):mix(P.paper,P.c5,.45),a,shadow:i===0,lw:.7})}}
  function bracket(R,x1,col,txt,a,y){const P=R.P;R.line([[XW,0,ZB+y],[x1,0,ZB+y]],{c:col,w:3,a});R.line([[x1,0,ZB+y-.1],[x1,0,ZB+y+.1]],{c:col,w:3,a});
    R.label([x1,0,ZB+y],txt,{al:'left',dx:10,mono:true,fs:12.5,b:1,c:col,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2,2.4,.5);
    // the primary: a server and its pg_wal/
    const pa=k===0?1:.45;
    R.box([XP,0,0],[1.3,1.0,1.2],{fill:mix(P.paper,P.acc,.25),a:pa});R.label([XP,1.0,0],'primary',{fs:13,b:1,c:P.acc,dy:-10,a:Math.max(.6,pa)});
    stack(R,XW,4,0,k===0?1:.6);R.label([XW,4*SL,0],"primary's pg_wal/",{fs:12.5,wide:1,b:k===0,dy:-10,a:k===0?1:.6});
    if(k===0){R.glow([XW,4*SL,0],.45,{c:P.c5,a:e});R.flow([[XP+.65,.5,0],[XW-.58,.4,0]],{c:P.c5,a:e,r:.06,speed:1,n:3});R.label([XW,0,.55],'COMMIT · flushed here',{fs:12.5,b:1,c:mix(P.ink,P.c5,.5),dy:16,a:e})}
    // the replica: WAL receiver (written), its pg_wal/ on disk (flushed), the startup process and table files (replayed)
    const ra=k===0?.35:1;
    R.glass([XR-.6,.05,0],[1.2,0,0],[0,.9,0],{c:P.c1,a:ra*(k===1?1:.6),nu:4,nv:3});R.label([XR,.95,0],'WAL receiver',{fs:12.5,wide:1,b:k===1,c:P.c1,dy:-8,a:ra});
    const extra=k===4?Math.round(NB*e):0;stack(R,XF,3,extra,ra*(k===2||k===4?1:.6));R.label([XF,(3+extra)*SL,0],"replica's pg_wal/",{fs:12.5,wide:1,b:k===2,dy:-10,a:k===4?0:ra});
    R.box([XT,0,0],[1.3,.8,1.2],{fill:k===4?mix(P.paper,P.bad,.25*e):mix(P.paper,P.c3,.25),a:ra*(k>=3?1:.6)});R.label([XT,.8,0],'table files',{fs:12.5,wide:1,b:k>=3,dy:-10,a:k>=3?0:ra});
    R.quad([[XR-.85,0,-.85],[XT+.85,0,-.85],[XT+.85,0,.85],[XR-.85,0,.85]],{fill:mix(P.paper,P.c3,.12),a:ra*.8,ec:P.c3,dash:[6,4],lw:1});
    R.label([XR-.85,0,-.85],'replica',{al:'right',wide:1,dx:-4,fs:13,b:1,c:P.c3,a:ra,dy:-6});
    // the record moving: streamed (k1), flushed (k2), replayed (k3); at k4 it arrives and is flushed but waits
    if(k===1)R.flowArc([XW+.6,.5,0],[XR-.6,.45,0],.5,{c:P.c5,a:e,r:.07,speed:1.5});
    if(k===2||k===4)R.flow([[XR+.6,.4,0],[XF-.58,.3,0]],{c:P.c5,a:k===4?1:e,r:.06,speed:1.2,n:4});
    if(k===4)R.flowArc([XW+.6,.5,0],[XR-.6,.45,0],.5,{c:P.c5,a:1,r:.06,speed:1.5});
    if(k===3){R.flow([[XF+.58,.3,0],[XT-.65,.35,0]],{c:P.c5,a:e,r:.06,speed:1.2,n:4});R.ball([XT,1.1,0],.14,{c:P.good,a:e});R.label([XT,1.15,0],'a query here sees it',{fs:12.5,b:1,c:P.good,dy:-14,a:e})}
    if(k===4){R.glow([XT-.65,.4,0],.45,{c:P.bad,a:e*.8});R.label([XT,.8,0],'replay paused',{fs:12.5,b:1,c:P.bad,dy:-10,a:e});
      R.label([XF,(3+extra)*SL,0],behind+' not yet replayed',{fs:12.5,b:1,c:P.bad,dy:-10,a:e})}
    // the three lags, measured from the primary's commit along the floor in front
    const fast=k===4,ms=v=>v<.001?(v*1e3).toFixed(3)+' ms':v<1?(v*1e3).toFixed(1)+' ms':v.toFixed(2)+' s';
    if(k>=1)bracket(R,XR,P.c1,'write_lag '+ms(wl),k===1?e:fast?1:.45,0);
    if(k>=2)bracket(R,XF,P.c3,'flush_lag '+ms(fl),k===2?e:fast?1:.45,.38);
    if(k>=3)bracket(R,XT,P.bad,'replay_lag '+(k===4?ms(rl):'≈ '+med.toFixed(2)+' ms'),k===3?e:1,.76);
  }
  const full={cam:[.1,.82],bounds:[[-4.8,0,-.9],[3.9,.8,2.1]]};
  S3.stage({id:'stg-rep',list:'sx-rep',fig:'Fig. 3 · one WAL record, three places it can wait',cam:full.cam,bounds:full.bounds,aspect:.38,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,8,14,8]:[18,170,14,12],
    // step 1 moves in close on the primary; the rest show the whole path
    view:k=>k===0?{cam:[.2,.6],bounds:[[-4.9,0,-1.1],[-1.4,1.2,1.4]]}:full});
})();

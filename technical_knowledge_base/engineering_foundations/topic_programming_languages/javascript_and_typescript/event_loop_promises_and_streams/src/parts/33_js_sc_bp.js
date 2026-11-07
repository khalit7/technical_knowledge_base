// ---- Scene, Fig. 3 (section 5): backpressure in a Node stream pipeline (renderer v2, 2026-11-07) ----
// Replays the recorded run of src/ja/code/k1_backpressure.mjs (window.EL.bp): every 1 KiB block in a buffer is a byte count Node reported
// (readableLength, writableLength) at that event. Each step of the list is a stretch of the trace (data-e: the last event it reaches);
// during a step the stage plays that stretch's events in order.
(function(){
  if(!document.getElementById('stg-bp')||!window.S3||!window.EL)return;const {lerp,mix,cl}=S3,$=id=>document.getElementById(id),B=EL.bp;
  const KB=1024,BH=.24,BW=.7,Y0=.36,HWM=B.hwm_kib;
  // the four buffers: x of each column, the stage it belongs to
  const COLS=[{x:-3.3,k:3,t:'source buffer'},{x:-.55,k:4,t:'Transform, in'},{x:.55,k:5,t:'Transform, out'},{x:3.3,k:6,t:'sink buffer'}];
  let mode='pipeline';
  const lid=m=>'sx-bp-'+m,ends=m=>[...$(lid(m)).children].map(li=>+li.dataset.e);
  function stateAt(j){const ev=B[mode].events,e=ev[j];let paused=false,done=0,writing=null;
    for(let i=0;i<=j;i++){const x=ev[i];if(x[0]==='push')paused=x[7]===false;if(x[0]==='read')paused=false;if(x[0]==='done'){done++;writing=null}if(x[0]==='write')writing=x[1]}
    return {e,lv:[e[3],e[4],e[5],e[6]].map(v=>Math.round(v/KB)),paused,done,writing,t:e[2]}}
  function draw(R,k,e){const P=R.P,ev=B[mode].events,E=ends(mode),j0=k>0?E[k-1]:0,j1=E[k],j=Math.round(lerp(j0,j1,e)),S=stateAt(j),ign=mode==='ignore';
    R.grid(-4.6,5,-1.6,1.8,.5);
    // the three stages on the floor
    const body=(x,w,txt,sub,a,c)=>{R.box([x,0,0],[w,Y0,1.1],{fill:mix(P.paper,c,.18),a});R.label([x,0,.55],txt,{fs:12.5,b:1,a,dy:12,c});if(sub)R.label([x,0,.55],sub,{fs:12,a,dy:28,c:P.mute})};
    body(-3.3,1.5,ign?'for loop':'Readable',ign?'write() × '+B.n+', false ignored':S.paused?'paused: push() said false':'read() called',1,S.paused&&!ign?P.mute:P.c2);
    body(0,2.3,'Transform',null,ign?.12:1,P.c4);
    body(3.3,1.5,'Writable',B.slow_ms+' ms a chunk',1,P.c6);
    // each buffer: 1 KiB blocks stacked; the highWaterMark is a glass plate; blocks above it are drawn in the warning colour
    COLS.forEach((c,i)=>{if(ign&&i<3)return;const n=S.lv[i],x=c.x;
      R.glass([x-.42,Y0+HWM*BH,-.42],[.84,0,0],[0,0,.84],{c:P.c1,nu:2,nv:2,a:.8,th:.02});
      for(let b=0;b<n;b++){const over=b>=HWM,wr=i===3&&b===0&&S.writing!=null;
        R.box([x,Y0+b*BH,0],[BW,BH-.03,BW],{fill:wr?mix(P.paper,P.c6,.75):over?mix(P.paper,P.bad,.5):mix(P.paper,P.c6,.35),shadow:false})}
      R.label([x,Y0+Math.max(n,HWM)*BH,0],n+' KiB',{fs:12.5,b:1,mono:true,dy:-12,c:n>HWM?P.bad:P.ink})});
    R.label(ign?[3.3-.45,Y0+HWM*BH,-.42]:[-3.3+.45,Y0+HWM*BH,-.42],'highWaterMark '+HWM+' KiB',{al:ign?'right':'left',fs:12,c:P.c1,dx:ign?-6:6,wide:1});
    // data moving: flows on the pipes whose downstream buffer grew during this stretch; the sink's finished chunks leave to the right
    const ev2=B[mode].events,grew=(col)=>{for(let i=j0+1;i<=j1;i++)if(ev2[i][col]>ev2[i-1][col])return true;return false};
    const pipe=(a,b,c,on)=>{if(on)R.flowArc(a,b,.35,{c,a:.85,r:.06,n:7})};
    if(!ign){pipe([-3.3,Y0+.2,0],[-.55,Y0+.2,0],P.c2,grew(4)||k===0);pipe([.55,Y0+.2,0],[3.3,Y0+.2,0],P.c4,grew(6))}
    else pipe([-3.3,Y0+.2,0],[3.3,Y0+.2,0],P.c2,grew(6));
    if(!ign)R.line([[-.5,Y0+.05,.45],[.5,Y0+.05,.45]],{c:P.c4,w:1.5,a:.6,head:6});
    const doneNow=(()=>{for(let i=j0+1;i<=j1;i++)if(ev2[i][0]==='done')return true;return false})();
    if(doneNow)R.flow([[3.75,Y0+.12,0],[4.8,Y0+.12,0]],{c:P.good,a:.85,r:.06,n:5});
    R.label([3.3,0,.55],'written '+S.done+' of '+B.n,{fs:12.5,mono:true,b:1,c:P.good,dy:46});
    R.label([0,Y0+(ign?S.lv[3]:3)*BH+.5,0],S.t.toFixed(1)+' ms · '+(S.lv.reduce((a,b)=>a+b,0))+' KiB buffered',{fs:12.5,mono:true,b:1,dy:-22})}
  const bounds=()=>mode==='ignore'?[[-4.4,0,-.9],[4.6,Y0+B.n*BH+.6,1.0]]:[[-4.4,0,-.9],[4.6,1.45,1.0]];
  const st=S3.stage({id:'stg-bp',list:lid(mode),fig:'Fig. 3 · 20 chunks, a slow sink, two producers',cam:[-.18,.3],bounds:()=>bounds(),aspect:.5,dur:2600,hold:3800,draw,
    margin:w=>w<520?[34,8,40,8]:[40,16,44,16]});
  RD.seg($('el-bp-mode'),m=>{mode=m;['pipeline','ignore'].forEach(x=>$(lid(x)).hidden=x!==m);st.list(lid(m))});
})();

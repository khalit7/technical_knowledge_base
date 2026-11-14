// ---- Scene, Fig. 2 (2026-11-12, renderer v2): the hunt as a staircase of step times, one fix per step.
// Data: window.FST_HUNT.path(device) (26_fst_rd_hunt.js), i.e. the recorded hunt_time_{mps,cpu}.json: median of 3 runs of 20 steps per stage, each
// compared with the stage it was built on (kept when faster beyond the spread of both, reverted when slower beyond it). Kept stages stand on the
// front row; reverted ones step aside to the back row. Block heights are to scale with the median, cut at 1.3 times the baseline (only the CPU's
// bfloat16 run, 43.7 s, is cut). A stream of dots runs from the block a fix was built on to the new block. Steps are #sx-hunt-mps or #sx-hunt-cpu. ----
(function(){
  if(!document.getElementById('stg-hunt')||!window.S3||!window.FST_HUNT)return;const {mix}=S3,H=window.FST_HUNT,$=id=>document.getElementById(id);
  let dev='mps';
  const SHORT={s0:'baseline',s1:'workers',s2:'fused AdamW',s3:'SDPA',s4:'no sync',s5:'bfloat16',s6:'compile',s7:'compile + bf16'};
  const fmt=v=>v>=1e4?(v/1e3).toFixed(1)+' s':v.toFixed(1)+' ms';
  function lay(){const p=H.path(dev),n=p.out.length,b0=p.out[0].r.median_ms,cap=b0*1.3;
    return {O:p.out,n,b0,cap,X:i=>(i-(n-1)/2)*1.12,Hh:v=>2.2*Math.min(v,cap)/cap}}
  const ZK=0,ZS=-1.55;
  function draw(R,k,e){const P=R.P,L=lay(),O=L.O,ph=R.W<520;R.grid(-5,5,-2.5,1.3,.5);
    const zOf=o=>o.v==='slower'?ZS:ZK,col=o=>o.v==='base'?P.c1:o.v==='gain'?P.c3:o.v==='slower'?P.mute:P.c5;
    // the baseline's height, so every later block reads as below or above it
    const hb=L.Hh(L.b0);R.line([[L.X(0)-.45,hb,ZK+.4],[L.X(L.n-1)+.45,hb,ZK+.4]],{c:P.c1,w:1.2});
    R.label([L.X(L.n-1)+.45,hb,ZK+.4],'baseline '+fmt(L.b0),{al:'left',dx:6,fs:12,mono:true,c:P.c1,wide:1});
    if(!ph)R.label([L.X(0)-.45,0,ZS],'reverted',{al:'right',dx:-8,fs:12,mono:true,c:P.mute,grp:'row'}),R.label([L.X(0)-.45,0,ZK],'kept',{al:'right',dx:-8,fs:12,mono:true,c:P.c3,grp:'row'});
    const cur=O[k],bi=cur.base?O.findIndex(x=>x.r===cur.base):-1;
    O.forEach((o,i)=>{const x=L.X(i),z=zOf(o);
      if(i>k){R.box([x,0,ZK],[.74,.015,.74],{fill:P.soft,a:.5,shadow:false});return}  // the slots still to come
      const isC=i===k,isB=i===bi,h=L.Hh(o.r.median_ms)*(isC?e:1);
      const a=isC||isB?1:o.v==='slower'?.3:.45;
      R.box([x,0,z],[.74,Math.max(.012,h),.74],{fill:mix(P.paper,col(o),o.v==='slower'?.45:.78),a});
      if(o.r.median_ms>L.cap&&(!isC||e>.9)){R.box([x,h,z],[.82,.05,.82],{fill:P.bad,a,shadow:false});R.label([x,h,z],fmt(o.r.median_ms)+' (cut)',{mono:true,fs:12,b:1,c:P.bad,dy:-14,a})}
      else if(!ph||isC||isB)R.label([x,h,z],isC?fmt(o.r.median_ms):fmt(o.r.median_ms).replace(' ms',''),{mono:true,fs:12.5,b:isC,c:isC?P.ink:P.mute,dy:isC?-26:-12,a:isC?Math.min(1,e*1.4):a}); // the older blocks drop the unit and the new one sits a line higher, so neighbours do not overlap
      if(!ph||isC)R.label([x,0,z+.4],SHORT[o.r.stage],{fs:12,dy:12,c:isC?P.ink:P.mute,b:isC,a:isC?1:Math.max(.55,a),wide:isC?0:1})});
    // the fix streams from the block it was built on to the new one
    if(bi>=0){const b=O[bi],a0=[L.X(bi),L.Hh(b.r.median_ms)+.03,zOf(b)],a1=[L.X(k),Math.max(.05,L.Hh(cur.r.median_ms)*e)+.03,zOf(cur)];
      R.flowArc(a0,a1,.45,{c:col(cur)===P.mute?P.bad:col(cur),r:.06,n:9,speed:1.3,a:Math.min(1,e*1.6)})}
  }
  const stg=S3.stage({id:'stg-hunt',list:'sx-hunt-mps',fig:'Fig. 2 · the hunt, one fix at a time',cam:[-.14,.4],bounds:[[-4.9,0,-2.2],[5.7,2.6,.9]],aspect:.52,dur:1400,hold:5200,draw,
    margin:w=>w<520?[18,10,12,10]:[20,16,14,70]});
  RD.seg($('fst-hunt-seg'),m=>{dev=m;['mps','cpu'].forEach(d=>{$('sx-hunt-'+d).hidden=d!==m});stg.list('sx-hunt-'+m)});
})();

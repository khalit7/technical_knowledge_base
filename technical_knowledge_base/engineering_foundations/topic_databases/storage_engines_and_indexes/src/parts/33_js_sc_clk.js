// ---- Scene, Fig. 3 (section 2): the clock sweep on eight buffers, then the real pool's usage counts and the ring of a big scan (renderer v2) ----
// Steps 1 to 5: an illustrative list of 22 page requests under the real rule (usage count +1 per access, capped at 5; the hand takes one point
// from each buffer it passes and evicts the first at 0), grouped into five stretches that each play their requests in turn.
// Steps 6 and 7: measured on the real server (SE.m1.usage_counts from pg_buffercache; SE.m1.ring, a full scan with a 128 MB pool).
(function(){
  if(!document.getElementById('stg-clk')||!window.SE)return;const {at,off,lerp,mix}=S3;
  const N=8,CAP=5,REQ=['R','I','T1','R','I','T2','R','T3','I','R','T4','T5','R','I','T6','T7','R','T8','I','T9','R','T10'];
  // every frame: buffers, hand, what happened; the first eviction also records each buffer the hand passed (sub-frames)
  const F=[],buf=Array.from({length:N},()=>({p:null,u:0}));let hand=0,hits=0,miss=0,evs=0;const cp=()=>buf.map(b=>({...b}));
  F.push({buf:cp(),hand,ev:'start',hits,miss,evs});const SW=[];
  REQ.forEach((r,n)=>{let i=buf.findIndex(b=>b.p===r),ev,victim=null;
    if(i>=0){buf[i].u=Math.min(CAP,buf[i].u+1);hits++;ev='hit'}
    else{miss++;const free=buf.findIndex(b=>b.p===null);
      if(free>=0){i=free;ev='free'}
      else{ev='evict';while(true){const b=buf[hand];if(b.u===0){i=hand;victim=b.p;evs++;hand=(hand+1)%N;break}b.u--;hand=(hand+1)%N;if(n===15)SW.push({buf:cp(),hand})}}
      buf[i].p=r;buf[i].u=1}
    F.push({buf:cp(),hand,req:r,n:n+1,slot:i,ev,victim,hits,miss,evs})});
  const ST=[[0,0],[1,8],[9,15],[16,16],[17,22]]; // frames played in steps 1 to 5
  const RR=2.3,pos=i=>{const a=-Math.PI/2+i*2*Math.PI/N;return [RR*Math.cos(a),0,RR*Math.sin(a)]},DK=[4.6,0,-1.2];
  const nm=p=>p==='R'?'root':p==='I'?'inner':p;
  const full=p=>p==='R'?'index root':p==='I'?'inner index page':'table page '+p.slice(1);
  function ring(R,s,a,o){const P=R.P;o=o||{};
    for(let i=0;i<N;i++){const p=pos(i),b=s.buf[i],hot=b.p==='R'||b.p==='I',cur=o.slot===i,sw=o.swept===i;
      R.box(p,[1.3,.14,.9],{fill:cur?mix(P.paper,o.ev==='hit'?P.good:P.c2,.55):sw?mix(P.paper,P.bad,.35):P.paper,a,lw:.8});
      for(let u=0;u<CAP;u++)R.box([p[0]-.48+u*.24,.14,p[2]],[.19,u<b.u?.22:.02,.19],{fill:u<b.u?mix(P.paper,P.c3,.75):mix(P.paper,P.line,.5),a:a*(u<b.u?1:.6),shadow:false,lw:.5});
      {const q=[p[0]*1.45,.1,p[2]*1.45];R.label(q,b.p?nm(b.p):'empty',{fs:13,b:hot,c:b.p?(hot?P.c1:P.ink):P.mute,a})}}
    const hp=pos(s.hand),tip=[hp[0]*.62,.18,hp[2]*.62];R.line([[0,.18,0],tip],{c:P.bad,w:3.2,a});R.glow(tip,.32,{c:P.bad,a:a*.8});R.ball([0,.18,0],.1,{c:P.bad,a});
    R.label([0,.18,0],'hand',{fs:12,c:P.mute,a,dy:16})}
  function draw(R,k,e,st){const P=R.P,u=st.e;R.grid(-6,6,-4,4,.5);
    const ra=k<=4?1:k===5?1-Math.min(1,e*2):0;
    if(ra>0){R.box(DK,[1.3,.7,1],{fill:mix(P.paper,P.line,.4),a:ra});R.label([DK[0],.7,DK[2]],'disk',{fs:12.5,b:1,c:P.mute,a:ra,dy:-12})}
    if(k<=4){const [lo,hi]=ST[k],f=k===3?16:lo+Math.min(hi-lo,Math.floor(u*(hi-lo+1)));
      let s=F[f],o={};
      if(k===3){const n=SW.length,j=Math.floor(u*(n+1));if(j<n){s=Object.assign({},F[15],SW[j],{req:null});o.swept=(SW[j].hand+N-1)%N}else{s=F[16];o.slot=s.slot;o.ev='evict'}}
      else if(s.req){o.slot=s.slot;o.ev=s.ev}
      ring(R,s,1,o);
      if(s.req&&o.slot!=null){const p=pos(o.slot);if(s.ev==='hit')R.glow([p[0],.2,p[2]],.7,{c:P.good,a:.8});else R.flowArc([DK[0],.6,DK[2]],[p[0],.3,p[2]],.9,{c:P.c2,r:.07,speed:2.2})}
      const sm=R.W<520,nn=p=>sm?nm(p):full(p),t=k===0?'eight empty buffers':k===3&&o.swept!=null?'request 16: '+nn('T7')+' · pool full, sweeping':s.req?'request '+s.n+': '+nn(s.req)+' · '+(s.ev==='hit'?'hit':s.ev==='free'?'miss, empty buffer':'miss, evicts '+nn(s.victim)):'';
      R.label([0,0,RR+1.1],t,{dy:14,fs:13,b:1,c:s.ev==='hit'?P.good:s.ev==='evict'||o.swept!=null?P.bad:P.ink});
      R.label([0,0,RR+1.1],'hits '+s.hits+' · disk reads '+s.miss+' · evicted '+s.evs,{fs:12.5,mono:true,c:P.mute,dy:34})}
    // the real pool after a mixed workload: how many buffers sit at each usage count
    if(k===5){const U=SE.m1.usage_counts,mx=Math.max(...U.map(x=>x.n)),a=Math.min(1,e*1.6);
      U.forEach((x,i)=>{const px=-2.4+i*1.2,h=2.2*x.n/mx;R.box([px,0,0],[.85,.06,.85],{a,shadow:false});R.box([px,.06,0],[.6,h*a,.6],{fill:mix(P.paper,P.c3,.25+.12*i)});
        R.label([px,.06+h*a,0],x.n+'',{fs:13,b:1,dy:-12,a});R.label([px,0,.45],'usage '+x.usagecount,{fs:12.5,mono:true,c:P.mute,dy:14,a})});
      R.label([0,0,1.2],U.reduce((s,x)=>s+x.n,0)+' buffers in use, by usage count',{fs:13,b:1,a,dy:34})}
    // a big sequential scan reads through a private ring of 32 buffers instead of the whole pool
    if(k===6){const g=SE.m1.ring[0],a=e;R.glass([-3.4,0,-1.7],[6.8,0,0],[0,0,3.4],{c:P.c1,a:a*.5,nu:16,nv:8,th:.02});
      R.label([3.4,0,1.7],'shared_buffers '+String(SE.m1.shared_buffers).replace('MB',' MB')+': the rest of the pool keeps its pages',{al:'right',fs:12.5,c:P.c1,a,dy:18});
      for(let i=0;i<32;i++){const an=i*2*Math.PI/32,p=[1.15*Math.cos(an),.02,1.15*Math.sin(an)];R.box(p,[.2,.14,.2],{fill:mix(P.paper,P.c2,.55),a,shadow:false,lw:.5})}
      R.box([-5.2,0,0],[.9,.5,2.6],{fill:mix(P.paper,P.line,.4),a});R.label([-5.2,.5,-1.3],'messages: '+g.read.toLocaleString('en-US')+' pages',{fs:12.5,b:1,a,dy:-12});
      R.flow([[-4.7,.3,0],[-1.15,.2,0]],{c:P.c2,a,r:.08,speed:2.4,n:10});R.flowArc([-1.15,.2,0],[1.15,.2,0],.5,{c:P.c2,a,r:.06,speed:2.4,n:6});
      R.label([0,.3,0],'ring of 32 buffers (256 kB)',{fs:13,b:1,c:P.c2,a,dy:-44});
      R.label([0,.3,0],g.cached_after+' pages cached after the scan',{fs:12.5,c:P.c2,a,dy:44})}
  }
  S3.stage({id:'stg-clk',list:'sx-clk',fig:'Fig. 3 · the clock sweep',cam:[.25,.82],bounds:[[-4.6,0,-3.4],[5.3,.8,4]],aspect:.66,dur:4200,hold:3600,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,16,16]});
})();

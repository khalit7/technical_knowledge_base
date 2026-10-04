// ---- Reading section 2: the clock sweep, step by step (illustrative request list, real rule) ----
(function(){
  const N=8,CAP=5;
  // page requests: R = index root, I = inner index page, T1.. = table pages read once
  const REQ=['R','I','T1','R','I','T2','R','T3','I','R','T4','T5','R','I','T6','T7','R','T8','I','T9','R','T10'];
  // precompute every step: state of buffers, hand, what happened
  const steps=[];const buf=Array.from({length:N},()=>({p:null,u:0}));let hand=0,hits=0,miss=0,evict=0;
  steps.push({buf:buf.map(b=>({...b})),hand,req:null,ev:'start',hits,miss,evict,swept:[]});
  for(const r of REQ){
    let i=buf.findIndex(b=>b.p===r);const swept=[];let ev,victim=null;
    if(i>=0){buf[i].u=Math.min(CAP,buf[i].u+1);hits++;ev='hit'}
    else{miss++;let free=buf.findIndex(b=>b.p===null);
      if(free>=0){i=free;ev='free'}
      else{while(true){const b=buf[hand];if(b.u===0){i=hand;victim=b.p;evict++;hand=(hand+1)%N;break}b.u--;swept.push(hand);hand=(hand+1)%N}ev='evict'}
      buf[i].p=r;buf[i].u=1}
    steps.push({buf:buf.map(b=>({...b})),hand,req:r,slot:i,ev,victim,hits,miss,evict,swept});
  }
  const name=p=>p==='R'?'index root':p==='I'?'inner page':'table page '+p.slice(1);
  const svg=document.getElementById('rd-clk-svg'),cap=document.getElementById('rd-clk-cap'),cnt=document.getElementById('rd-clk-cnt');
  function draw(k){
    const s=steps[k],W=RD.width(svg),H=W<480?250:230,cx=W/2,cy=H/2,R=Math.min(cx-46,cy-34);
    let b='';
    for(let i=0;i<N;i++){const a=-Math.PI/2+i*2*Math.PI/N,x=cx+R*Math.cos(a),y=cy+R*Math.sin(a),bb=s.buf[i];
      const hot=bb.p==='R'||bb.p==='I',on=i===s.slot,sw=s.swept.includes(i);
      b+='<rect x="'+(x-34)+'" y="'+(y-20)+'" width="68" height="40" rx="6" fill="'+(on?'var(--hl)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':sw?'var(--bad)':'var(--line)')+'" stroke-width="'+(on||sw?2:1)+'"/>';
      b+=RD.t(x,y-4,bb.p?(bb.p==='R'?'root':bb.p==='I'?'inner':'T'+bb.p.slice(1)):'empty',{a:'middle',fs:11.5,w:600,fill:bb.p?(hot?'var(--c1)':'var(--ink)'):'var(--mute)'});
      let dots='';for(let u=0;u<CAP;u++)dots+='<circle cx="'+(x-16+u*8)+'" cy="'+(y+10)+'" r="3" fill="'+(u<bb.u?'var(--c3)':'var(--dim)')+'"/>';b+=dots}
    const ha=-Math.PI/2+s.hand*2*Math.PI/N;
    b+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+(R-30)*Math.cos(ha))+'" y2="'+(cy+(R-30)*Math.sin(ha))+'" stroke="var(--bad)" stroke-width="3" stroke-linecap="round"/><circle cx="'+cx+'" cy="'+cy+'" r="5" fill="var(--bad)"/>';
    b+=RD.t(cx,cy+22,'clock hand',{a:'middle',fs:10.5,fill:'var(--mute)'});
    svg.innerHTML=RD.svg(W,H,b,'Eight buffers in a ring with usage counts and the clock hand');
    cnt.innerHTML=RD.stat('Request',s.req?k+' of '+REQ.length:'none')+RD.stat('Hits',s.hits)+RD.stat('Misses (disk reads)',s.miss)+RD.stat('Evictions',s.evict);
    let t,p;
    if(s.ev==='start'){t='Eight empty buffers';p='Green dots are the usage count (0 to 5). The hand (red) points at the next buffer to examine.'}
    else if(s.ev==='hit'){t='Request: '+name(s.req)+'. Hit';p='Already in buffer '+(s.slot+1)+': no disk read. Its usage count rises to '+s.buf[s.slot].u+(s.buf[s.slot].u===CAP?' (the cap)':'')+'.'}
    else if(s.ev==='free'){t='Request: '+name(s.req)+'. Miss, free buffer';p='Read from disk into an empty buffer with usage count 1.'}
    else{t='Request: '+name(s.req)+'. Miss, sweep and evict';p='The pool is full. The hand passed '+s.swept.length+' buffer'+(s.swept.length===1?'':'s')+' (red outline), taking one point from each, and evicted '+(s.victim?name(s.victim):'')+' at usage 0. The index root and inner page keep surviving: they are used often.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  RD.anim({card:'rd-clk-card',ctl:'rd-clk-ctl',n:steps.length,draw,ms:1500,label:'Request'});
  RD.onResize(()=>draw(+document.getElementById('rd-clk-ctl-s').value));
})();

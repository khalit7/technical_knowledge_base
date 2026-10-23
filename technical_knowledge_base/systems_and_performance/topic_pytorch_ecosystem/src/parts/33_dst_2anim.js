// ---- Distributed lab (t-dist), part 2: DDP against FSDP2 on the same step (animated), bytes, memory per rank ----
(function(){
const J=window.DSTJS,D=J.D,$=J.$,MB=J.MB,fmt=J.fmt,esc=J.esc;

// ---------- 5. the same step under DDP and FSDP2 ----------
// Each mode: per rank {t:{fwd0,fwd1,bwd1,opt1}, ev:[{t,kind,label,S (payload bytes),cap}]} plus rank 0's memory curve
function ddpMode(){
  const X=D.ddp.w2,P=X.params;
  return {name:'DDP',ranks:X.ranks.map(r=>{const s=r.steps[2];
    return {t:s.t,ev:s.coll.filter(c=>c[0]==='all_reduce').map((c,i)=>{const names=s.buckets[i].map(p=>P[p][0]);
      return {t:c[2],kind:'AR',label:'bucket '+i,S:c[1],cap:'All-reduce of bucket '+i+' ('+MB(c[1])+', '+s.buckets[i].length+' gradients'+(names.length<=4?': '+names.map(esc).join(', '):', including '+esc(names[names.length-1]))+'), issued as soon as its last gradient was final; backward goes on meanwhile.'}})}}),
    mem:X.ranks[0].mem};
}
function fsdpMode(k,label){
  const X=D.fsdp[k];
  return {name:label,ranks:X.ranks.map(r=>({t:r.t,ev:r.coll.map(c=>{const isAG=c[0]==='AG',S=isAG?c[3]:c[2],fwd=c[4]<=r.t.fwd1;
    return {t:c[4],kind:c[0],label:(isAG?'AG ':'RS ')+c[1],S:S,
      cap:isAG?'All-gather of '+c[1]+(fwd?' for forward':' again for backward')+': this rank sends its '+MB(c[2])+' shard and ends with all '+MB(c[3])+' of the unit\'s weights'+(c[1]==='root'?' (embeddings, final LayerNorm, tied output layer).':'.'):
      'Reduce-scatter of '+c[1]+'\'s gradients ('+MB(c[2])+' in, this rank keeps its half); on gloo run as an all-reduce of the full '+MB(c[2])+'.'}}),
    })),mem:X.ranks[0].mem};
}
const MODES={ddp:ddpMode(),fsdp:fsdpMode('w2','FSDP2'),nr:fsdpMode('w2_nr','FSDP2, reshard_after_forward=False')};
const TMAX=Math.max(...Object.values(MODES).map(m=>Math.max(...m.ranks.map(r=>r.t.opt1))));
const SMAX=Math.max(...Object.values(MODES).map(m=>Math.max(...m.ranks.map(r=>Math.max(...r.ev.map(e=>e.S))))));
const base=m=>m.mem.params+m.mem.opt+m.mem.buckets;
const MEMMAX=Math.max(...Object.values(MODES).map(m=>base(m)+Math.max(...m.mem.curve.map(p=>p[1]*1e6))));
// rank 0's memory (bytes) at timeline time t: the profiled curve mapped piecewise-linearly onto this run's phases
function memAt(m,t){const T=m.ranks[0].t,c=m.mem.curve,cEnd=c[c.length-1][0];
  const A=[[0,0],[m.mem.fwd_ms,T.fwd1],[m.mem.bwd_ms,T.bwd1],[cEnd,T.opt1]];
  const toT=u=>{for(let i=1;i<A.length;i++)if(u<=A[i][0]){const a=A[i-1],b=A[i];return a[1]+(u-a[0])/Math.max(1e-9,b[0]-a[0])*(b[1]-a[1])}return T.opt1};
  let v=0;for(const p of c){if(toT(p[0])<=t)v=p[1];else break}
  return base(m)+v*1e6}
let cur='ddp',t=0,playing=false,raf=0,last=0,spd=1;
const card=$('dst-an'),live=J.watch(card,v=>{if(!v)stop()});
function draw(){
  const m=MODES[cur],w=J.W($('dst-an-svg')),pad=10,lw=Math.min(54,w*0.13),x0=pad+lw,x1=w-pad,xs=v=>x0+v/TMAX*(x1-x0);
  const laneH=74,H=m.ranks.length*laneH+120;let b='';
  m.ranks.forEach((r,ri)=>{const y=12+ri*laneH,by=y+44;
    b+=J.tx(pad,by+12,'rank '+ri,{fs:11,w:600});
    b+=J.rect(xs(0),by,xs(r.t.fwd1)-xs(0),16,'var(--acc2)')+J.rect(xs(r.t.fwd1),by,xs(r.t.bwd1)-xs(r.t.fwd1),16,'var(--closed2)')+J.rect(xs(r.t.bwd1),by,xs(r.t.opt1)-xs(r.t.bwd1),16,'var(--open2)');
    r.ev.forEach(e=>{const hh=Math.max(3,e.S/SMAX*40),on=e.t<=t;
      b+=J.rect(xs(e.t)-2,by-2-hh,4,hh,J.CC[e.kind],' opacity="'+(on?1:0.18)+'"><title>'+esc(e.label)+': '+fmt(e.S)+' B at '+e.t.toFixed(1)+' ms</title></rect')});
    b+='<line x1="'+xs(0)+'" x2="'+x1+'" y1="'+(by+16.5)+'" y2="'+(by+16.5)+'" stroke="var(--line)"/>';
  });
  // memory line, rank 0
  const my0=m.ranks.length*laneH+20,mh=70,ym=v=>my0+mh-v/MEMMAX*mh;let path='',area='';
  for(let i=0;i<=120;i++){const tt=i/120*m.ranks[0].t.opt1,v=memAt(m,tt);path+=(i?'L':'M')+xs(tt).toFixed(1)+' '+ym(v).toFixed(1)}
  const nowV=memAt(m,Math.min(t,m.ranks[0].t.opt1));
  b+=J.tx(pad,my0+10,'rank 0',{fs:10.5,fill:'var(--mute)'})+J.tx(pad,my0+23,'memory',{fs:10.5,fill:'var(--mute)'});
  b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+ym(0)+'" y2="'+ym(0)+'" stroke="var(--line)"/>'+'<path d="'+path+'" fill="none" stroke="var(--c2)" stroke-width="1.6"/>';
  b+=J.tx(x1,ym(MEMMAX)+9,MB(MEMMAX,0),{fs:10,fill:'var(--mute)',a:'end'})+J.tx(x0+2,ym(base(m))-3,'persistent '+MB(base(m),1),{fs:10,fill:'var(--mute)'});
  b+='<line x1="'+x0+'" x2="'+x1+'" y1="'+ym(base(m))+'" y2="'+ym(base(m))+'" stroke="var(--dim)" stroke-dasharray="3 3"/>';
  // playhead and axis
  b+='<line x1="'+xs(t).toFixed(1)+'" x2="'+xs(t).toFixed(1)+'" y1="6" y2="'+(my0+mh)+'" stroke="var(--ink)" stroke-width="1" opacity=".55"/>';
  b+=J.tx(x0,H-4,'0 ms',{fs:10,fill:'var(--mute)'})+J.tx(x1,H-4,TMAX.toFixed(0)+' ms (same scale in every mode)',{fs:10,fill:'var(--mute)',a:'end'});
  $('dst-an-svg').innerHTML=J.svg(w,H,b,m.name+' step timeline');
  // counters and caption (rank 0)
  const r0=m.ranks[0],done=r0.ev.filter(e=>e.t<=t),tot=r0.ev.reduce((s,e)=>s+e.S,0);
  let peakSoFar=0;for(let i=0;i<=60;i++){const tt=i/60*Math.min(t,r0.t.opt1);peakSoFar=Math.max(peakSoFar,memAt(m,tt))}
  $('dst-an-st').innerHTML=J.stat('Time in the step',t.toFixed(1)+' ms',t<r0.t.fwd1?'forward':t<r0.t.bwd1?'backward':t<r0.t.opt1?'optimizer':'done')+
    J.stat('Collectives issued (rank 0)',done.length+' / '+r0.ev.length,m.name)+
    J.stat('Payload so far',MB(done.reduce((s,e)=>s+e.S,0),1),'of '+MB(tot,1)+' this step')+
    J.stat('Rank 0 memory now',MB(nowV,1),'peak so far '+MB(peakSoFar,1));
  const lastE=done[done.length-1];
  let cap;
  if(!lastE)cap=t<r0.t.fwd1?(cur==='ddp'?'Forward: DDP communicates nothing here; every rank has full weights.':'Forward starts by gathering the root unit, then each block just before it runs.'):'';
  else if(t-lastE.t<2.5||t>=r0.t.opt1)cap='<b>'+lastE.t.toFixed(1)+' ms, '+esc(lastE.label)+'.</b> '+lastE.cap;
  else cap=t<r0.t.fwd1?'Forward: computing with the gathered weights.':t<r0.t.bwd1?'Backward: computing gradients; the collectives already issued run alongside.':'Optimizer: AdamW on '+(cur==='ddp'?'the full weights, identical on every rank':'this rank\'s shards only, no communication')+'.';
  if(t>=r0.t.opt1)cap+=' <span class="mute">Step done at '+r0.t.opt1.toFixed(1)+' ms: '+r0.ev.length+' collectives, '+MB(tot,1)+' of payload; rank 0 peaked at '+MB(J.peak(cur==='ddp'?'ddp_w2':cur==='fsdp'?'fsdp_w2':'fsdp_w2_nr'),1)+'.</span>';
  $('dst-an-cap').innerHTML=cap;
  $('dst-an-scrub').value=Math.round(t/TMAX*1000);
}
function frame(ts){raf=0;if(!playing)return;if(!live()){stop();return}
  const dt=last?ts-last:16;last=ts;t+=dt/1000*spd*TMAX/9;   // the longest step plays in about 9 s at 1x
  const end=MODES[cur].ranks[0].t.opt1;if(t>=end){t=end;draw();stop();return}
  draw();raf=requestAnimationFrame(frame)}
function play(){if(playing)return;const end=MODES[cur].ranks[0].t.opt1;if(t>=end)t=0;playing=true;last=0;$('dst-an-play').textContent='Pause';raf=requestAnimationFrame(frame)}
function stop(){playing=false;if(raf)cancelAnimationFrame(raf);raf=0;$('dst-an-play').textContent='Play'}
$('dst-an-play').addEventListener('click',()=>playing?stop():play());
const evTimes=()=>MODES[cur].ranks[0].ev.map(e=>e.t).concat([MODES[cur].ranks[0].t.fwd1,MODES[cur].ranks[0].t.bwd1,MODES[cur].ranks[0].t.opt1]).sort((a,b)=>a-b);
$('dst-an-next').addEventListener('click',()=>{stop();const n=evTimes().find(x=>x>t+1e-6);t=n==null?MODES[cur].ranks[0].t.opt1:n;draw()});
$('dst-an-back').addEventListener('click',()=>{stop();const p=evTimes().filter(x=>x<t-1e-6);t=p.length?p[p.length-1]:0;draw()});
$('dst-an-scrub').addEventListener('input',e=>{stop();t=+e.target.value/1000*TMAX;draw()});
$('dst-an-speed').addEventListener('change',e=>{spd=+e.target.value});
J.seg($('dst-an-seg'),[['ddp','DDP'],['fsdp','FSDP2'],['nr','FSDP2, no reshard after forward']],cur,m=>{stop();cur=m;t=0;draw()});
let started=false;
// nothing plays until the reader presses Play (2026-10-23)
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
J.onR(draw);draw();

// ---------- bytes per step ----------
(function(){
  const ring=(kind,S,n,gloo)=>kind==='AR'?2*(n-1)/n*S:kind==='RS'?(gloo?2:1)*(n-1)/n*S:(n-1)/n*S;
  const rows=[];
  const add=(name,n,ev)=>{const pay=ev.reduce((s,e)=>s+e.S,0),nccl=ev.reduce((s,e)=>s+ring(e.kind,e.S,n,false),0),gl=ev.reduce((s,e)=>s+ring(e.kind,e.S,n,true),0);rows.push([name,n,ev.length,pay,nccl,gl])};
  add('DDP',2,MODES.ddp.ranks[0].ev);add('FSDP2',2,MODES.fsdp.ranks[0].ev);add('FSDP2, no reshard after forward',2,MODES.nr.ranks[0].ev);
  const d4=D.ddp.w4.ranks[0].steps[0].coll.filter(c=>c[0]==='all_reduce').map(c=>({kind:'AR',S:c[1]}));add('DDP',4,d4);
  add('FSDP2',4,D.fsdp.w4.coll.map(c=>({kind:c[0],S:c[0]==='AG'?c[3]:c[2]})));
  add('Tensor parallel (MLPs only)',2,D.tp.coll.map(c=>({kind:'AR',S:c[1]})));
  const ddp2=rows[0][4];
  let h='<thead><tr><th>strategy</th><th class="num">ranks</th><th class="num">collectives</th><th class="num">payload</th><th class="num">per rank, ring (NCCL-like)</th><th class="num">vs DDP</th><th class="num">per rank, gloo</th></tr></thead><tbody>';
  rows.forEach(r=>{h+='<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+MB(r[3],2)+'</td><td class="num">'+MB(r[4],2)+'</td><td class="num">'+(r[0]==='DDP'?'1&times;':r[0].startsWith('FSDP2')?(r[4]/rows.find(x=>x[0]==='DDP'&&x[1]===r[1])[4]).toFixed(2)+'&times;':'')+'</td><td class="num">'+MB(r[5],2)+'</td></tr>'});
  $('dst-bytes').innerHTML=h+'</tbody>';
  $('dst-bytes-note').innerHTML='Payload = the full tensor each collective works on (all-reduce and reduce-scatter: its input; all-gather: its output), summed over one step on rank 0, from the flight recorder. "Sent per rank" applies the ring cost model to those payloads: all-reduce 2(n&minus;1)/n &times; S, all-gather and reduce-scatter (n&minus;1)/n &times; S (derived, not measured on the wire). FSDP2 lands at about 1.5&times; DDP, the ratio DTLINK derives for ZeRO-3; with gloo\'s all-reduce in place of reduce-scatter (last column) it is about 2&times;. Without resharding after forward, FSDP2 sends exactly what DDP sends (one all-gather plus one reduce-scatter equals one all-reduce) and still keeps model state sharded between steps. Tensor parallel moves activations, not weights: its volume grows with batch and sequence length, not with model size.'.replace('DTLINK','<a href="https://app.notion.com/p/3c65c17b0d0d8103a916c4824abbd82e" target="_blank" rel="noopener noreferrer">Distributed Training</a>');
})();

// ---------- 6. memory per rank ----------
(function(){
  const SETS={tiny:['Running example, 3.2M parameters',[['DDP, 2 ranks','ddp_w2'],['DDP, 4 ranks','ddp_w4'],['DDP, gradient_as_bucket_view','ddp_w2_view'],['FSDP2, 2 ranks','fsdp_w2'],['FSDP2, 4 ranks','fsdp_w4'],['FSDP2, 2 ranks, no reshard','fsdp_w2_nr']]],
    big:['8 blocks, d 512, 25.3M parameters',[['DDP, 2 ranks','ddp_w2_big'],['DDP, 4 ranks','ddp_w4_big'],['FSDP2, 2 ranks','fsdp_w2_big'],['FSDP2, 4 ranks','fsdp_w4_big'],['FSDP2, 4 ranks, no reshard','fsdp_w4_big_nr']]]};
  let cur='tiny';
  function draw(){const [lab,rows]=SETS[cur],mx=Math.max(...rows.map(r=>J.peak(r[1])));
    $('dst-mem-bars').innerHTML=rows.map(([n,k])=>{const m=D.mem[k].mem,parts=[[m.params,'var(--c1)','weights'],[m.opt,'var(--c5)','AdamW state'],[m.buckets,'var(--c6)','DDP buckets'],[m.peak_delta,'var(--c2)','step peak']];
      let x=0,f='';parts.forEach(p=>{if(p[0]>0){f+='<div class="fill" title="'+p[2]+': '+MB(p[0])+'" style="left:'+(x/mx*100).toFixed(2)+'%;width:'+(p[0]/mx*100).toFixed(2)+'%;background:'+p[1]+';border-radius:0"></div>';x+=p[0]}});
      return '<div class="row"><div class="nm" title="'+n+'">'+n+'</div><div class="track">'+f+'</div><div class="val">'+MB(J.peak(k),1)+'</div></div>'}).join('');
    const a=J.peak(rows[0][1]),b=J.peak(cur==='tiny'?'fsdp_w4':'fsdp_w4_big');
    $('dst-mem-cap').innerHTML='<b>'+lab+'.</b> DDP holds the same '+MB(a,1)+' per rank whatever the world size. FSDP2 on 4 ranks: '+MB(b,1)+' ('+(b/a*100).toFixed(0)+'%). The orange part, the step\'s own peak, does not shrink with more ranks: activations are per rank and one unit\'s gathered weights are always full size. Turning off reshard_after_forward keeps every block\'s full weights from forward to backward and raises the peak'+(cur==='tiny'?' by '+MB(J.peak('fsdp_w2_nr')-J.peak('fsdp_w2'),1):' by '+MB(J.peak('fsdp_w4_big_nr')-J.peak('fsdp_w4_big'),0))+', in exchange for the four backward all-gathers. Measured with the profiler\'s allocation record (CPU, float32, AdamW).';
  }
  J.seg($('dst-mem-seg'),Object.keys(SETS).map(k=>[k,SETS[k][0]]),cur,m=>{cur=m;draw()});
  draw();
})();
})();

// ---- Reading: one decode step of the running example on 8 H200s, four ways (replicas, TP 8, PP 8, one GPU) ----
// Numbers: window.DDC.steps (recompute.py -> the Capacity planner's step(): weights and KV read, FLOPs, all-reduces, 2.5 ms overhead).
(function(){
  const card=document.getElementById('dd-split-card');if(!card||!window.DDC)return;
  const svgEl=document.getElementById('dd-split-svg'),cap=document.getElementById('dd-split-cap'),cnt=document.getElementById('dd-split-cnt');
  const C=window.DDC;let mode='one',users=1;
  const row=(k,n,B)=>C.steps.find(r=>r.kind===k&&r.n===n&&r.B===B);
  const fmt=(x,d)=>x.toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d,minimumFractionDigits:0});
  // lanes: list of segments [t0,t1,type,label]; types: ovh, mem (reading weights and cache), comm (all-reduce), idle
  function plan(){
    const L=[];for(let g=0;g<8;g++)L.push([]);
    let r,tps,tpu,bytes,wgb,seqs,note;
    if(mode==='one'||mode==='rep'){
      const B=mode==='rep'?(users===1?1:8):users;r=row('tp',1,B);
      const busy=mode==='one'?1:(users===1?1:8);
      for(let g=0;g<8;g++){if(g>=busy){L[g].push([0,r.t_ms,'idle']);continue}
        L[g].push([0,r.ovh_ms,'ovh']);const w=(r.t_ms-r.ovh_ms)/8;for(let j=0;j<8;j++)L[g].push([r.ovh_ms+j*w,r.ovh_ms+(j+1)*w,'mem','L'+(j*10+1)+'-'+(j*10+10)])}
      tpu=1000/r.t_ms;tps=(mode==='rep'?busy:1)*B*1000/r.t_ms;bytes=0;wgb=r.w_gpu_gb;seqs=r.seqs*(mode==='rep'?8:1);
    }else if(mode==='tp'){
      r=row('tp',8,users);const w=Math.max(r.mem_ms,r.cmp_ms)/8,c=r.comm_ms/8;
      for(let g=0;g<8;g++){L[g].push([0,r.ovh_ms,'ovh']);let t=r.ovh_ms;for(let j=0;j<8;j++){L[g].push([t,t+w,'mem','1/8 of L'+(j*10+1)+'-'+(j*10+10)]);t+=w;L[g].push([t,t+c,'comm']);t+=c}}
      tpu=1000/r.t_ms;tps=users*1000/r.t_ms;bytes=C.tp_bytes['8'].per_token_sent*users;wgb=r.w_gpu_gb;seqs=r.seqs;
    }else{
      r=row('pp',8,users);const mb=(r.t_ms-r.ovh_ms)/8;
      for(let g=0;g<8;g++){L[g].push([0,r.ovh_ms,'ovh']);
        if(users===1){if(g>0)L[g].push([r.ovh_ms,r.ovh_ms+g*mb,'idle']);L[g].push([r.ovh_ms+g*mb,r.ovh_ms+(g+1)*mb,'mem','L'+(g*10+1)+'-'+(g*10+10)]);if(g<7)L[g].push([r.ovh_ms+(g+1)*mb,r.t_ms,'idle'])}
        else for(let j=0;j<8;j++)L[g].push([r.ovh_ms+j*mb,r.ovh_ms+(j+1)*mb,'mb','m'+(((j-g)%8+8)%8+1)])}
      tpu=1000/r.t_ms;tps=users*1000/r.t_ms;bytes=C.pp_bytes.per_boundary*users;wgb=r.w_gpu_gb;seqs=r.seqs;
    }
    return {L,r,tpu,tps,bytes,wgb,seqs};
  }
  const NS=9;
  function caption(i,p){
    const one=row('tp',1,users);
    const T={one:['One GPU holds everything','The whole 72.7 GB of weights is read once per step; at batch '+users+' that takes '+fmt(p.r.t_ms)+' ms per token. The other seven GPUs wait.'],
      rep:['Eight replicas: eight copies, no talking',users===1?'One user lands on one replica, which works exactly like the single GPU: '+fmt(p.r.t_ms)+' ms per token. Copies add capacity, never speed for one request.':'Each copy serves 8 of the 64 users. Nothing crosses between GPUs; total throughput is eight times one copy’s.'],
      tp:['Tensor parallel 8: every GPU holds 1/8 of every layer','Each GPU reads 9.1 GB instead of 72.7, so the memory part shrinks eightfold; but every layer ends in two all-reduces (160 per token), '+fmt(p.r.comm_ms,2)+' ms in all. One token: '+fmt(p.r.t_ms)+' ms instead of '+fmt(one.t_ms)+'.'],
      pp:['Pipeline parallel 8: each GPU holds 10 whole layers',users===1?'The token walks the stages one after another: the same '+fmt(p.r.t_ms)+' ms as one GPU, and each GPU is busy one eighth of the time (the pipeline bubble).':'With 8 micro-batches of 8 users in flight, every stage is busy; only one hidden state (16 KiB per token) crosses each boundary.']}[mode];
    const prog=i===0?'Step starts.':i>=NS-1?'Step done: every user has one more token.':'Progress: '+Math.round(100*i/(NS-1))+'% of the step ('+fmt(p.r.t_ms*i/(NS-1))+' ms).';
    cap.innerHTML='<div class="t">'+T[0]+'</div><p>'+T[1]+'</p><p class="small">'+prog+'</p>';
  }
  function draw(i){
    const p=plan();const W=RD.width(svgEl),lab=Math.min(54,W*0.14),H=8*22+34;
    const maxT=row('tp',1,users===1?1:64).t_ms*1.02;const x=t=>lab+(W-lab-6)*t/maxT;const now=maxT*i/(NS-1)*(p.r.t_ms/maxT);
    const col={ovh:'var(--dim)',mem:'var(--c1)',comm:'var(--c2)',idle:'none',mb:'var(--c3)'};
    let b='';
    for(let g=0;g<8;g++){const y=6+g*22;b+=RD.t(2,y+14,'GPU '+g,{fs:11,fill:'var(--mute)'});
      b+='<rect x="'+lab+'" y="'+y+'" width="'+(W-lab-6)+'" height="16" fill="var(--soft)" stroke="var(--line)"/>';
      p.L[g].forEach(s=>{if(s[2]==='idle')return;const t1=Math.min(s[1],now);if(t1<=s[0])return;
        b+='<rect x="'+x(s[0])+'" y="'+(y+1)+'" width="'+Math.max(0.6,x(t1)-x(s[0]))+'" height="14" fill="'+col[s[2]]+'" opacity="'+(s[2]==='ovh'?1:0.85)+'"/>';})}
    const ya=6+8*22+4;b+='<line x1="'+lab+'" x2="'+(W-6)+'" y1="'+ya+'" y2="'+ya+'" stroke="var(--line)"/>';
    const step=maxT>30?10:5;for(let t=0;t<=maxT;t+=step)b+=RD.t(x(t),ya+14,t+' ms',{a:'middle',fs:10,fill:'var(--mute)'});
    b+='<line x1="'+x(p.r.t_ms)+'" x2="'+x(p.r.t_ms)+'" y1="2" y2="'+ya+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    svgEl.innerHTML=RD.svg(W,H,b,'Timeline of one decode step on eight GPUs');
    caption(i,p);
    cnt.innerHTML=RD.stat('Time per token, each user',fmt(p.r.t_ms)+' ms',fmt(p.tpu,0)+' tokens/s per user')+
      RD.stat('Tokens/s, all 8 GPUs',fmt(p.tps,0),users+' user'+(users>1?'s':'')+' in total')+
      RD.stat('Weights per GPU',fmt(p.wgb)+' GB','of 141 GB')+
      RD.stat('Sent per GPU per step',p.bytes?(p.bytes>1e6?fmt(p.bytes/1e6)+' MB':fmt(p.bytes/1024)+' KiB'):'nothing',mode==='tp'?'2 all-reduces x 80 layers':mode==='pp'?'one hidden state per boundary':'')+
      RD.stat('Conversations that fit',fmt(p.seqs,0),mode==='rep'?'8 copies':'in the KV cache');
  }
  const A=RD.anim({card:'dd-split-card',ctl:'dd-split-ctl',n:NS,draw,ms:900,label:'Progress through the step'});
  RD.seg(document.getElementById('dd-split-mode'),m=>{mode=m;A.reset(NS);A.play()});
  RD.seg(document.getElementById('dd-split-users'),m=>{users=+m;A.reset(NS);A.play()});
  RD.onResize(()=>A.redraw());
})();

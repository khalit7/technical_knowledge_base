// ---- Reading: one decode step of the running example on 8 H200s, four ways (replicas, TP 8, PP 8, one GPU), as seven explained steps (2026-11-12) ----
// Each step is one layout at 1 or 64 users, drawn whole; its explanation is the step list #sx-split on the left (the old caption is gone).
// Numbers: window.DDC.steps (recompute.py -> the Capacity planner's step(): weights and KV read, FLOPs, all-reduces, 2.5 ms overhead).
(function(){
  const card=document.getElementById('dd-split-card');if(!card||!window.DDC)return;
  const svgEl=document.getElementById('dd-split-svg'),cnt=document.getElementById('dd-split-cnt');
  const C=window.DDC;let mode='one',users=1;
  const STEPS=[['one',1],['rep',1],['tp',1],['pp',1],['rep',64],['tp',64],['pp',64]];
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
  const NS=STEPS.length;
  function draw(i){
    mode=STEPS[i][0];users=STEPS[i][1];
    const p=plan();const W=RD.width(svgEl),lab=Math.min(54,W*0.14),H=8*22+34;
    const maxT=row('tp',1,users===1?1:64).t_ms*1.02;const x=t=>lab+(W-lab-6)*t/maxT;
    const col={ovh:'var(--dim)',mem:'var(--c1)',comm:'var(--c2)',idle:'none',mb:'var(--c3)'};
    let b='';
    for(let g=0;g<8;g++){const y=6+g*22;b+=RD.t(2,y+14,'GPU '+g,{fs:11,fill:'var(--mute)'});
      b+='<rect x="'+lab+'" y="'+y+'" width="'+(W-lab-6)+'" height="16" fill="var(--soft)" stroke="var(--line)"/>';
      p.L[g].forEach(s=>{if(s[2]==='idle')return;
        b+='<rect class="rd-new" x="'+x(s[0])+'" y="'+(y+1)+'" width="'+Math.max(0.6,x(s[1])-x(s[0]))+'" height="14" fill="'+col[s[2]]+'" opacity="'+(s[2]==='ovh'?1:0.85)+'"/>';})}
    const ya=6+8*22+4;b+='<line x1="'+lab+'" x2="'+(W-6)+'" y1="'+ya+'" y2="'+ya+'" stroke="var(--line)"/>';
    const step=maxT>30?10:5;for(let t=0;t<=maxT;t+=step)b+=RD.t(x(t),ya+14,t+' ms',{a:'middle',fs:11,fill:'var(--mute)'});
    b+='<line x1="'+x(p.r.t_ms)+'" x2="'+x(p.r.t_ms)+'" y1="2" y2="'+ya+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    svgEl.innerHTML=RD.svg(W,H,b,'Timeline of one decode step on eight GPUs');
    document.getElementById('dd-split-now').textContent='Step '+(i+1)+' of '+NS+': '+{one:'1 GPU (7 idle)',rep:'8 replicas',tp:'tensor parallel 8',pp:'pipeline parallel 8'}[mode]+', '+users+' user'+(users>1?'s':'');
    cnt.innerHTML=RD.stat('Time per token, each user',fmt(p.r.t_ms)+' ms',fmt(p.tpu,0)+' tokens/s per user')+
      RD.stat('Tokens/s, all 8 GPUs',fmt(p.tps,0),users+' user'+(users>1?'s':'')+' in total')+
      RD.stat('Weights per GPU',fmt(p.wgb)+' GB','of 141 GB')+
      RD.stat('Sent per GPU per step',p.bytes?(p.bytes>1e6?fmt(p.bytes/1e6)+' MB':fmt(p.bytes/1024)+' KiB'):'nothing',mode==='tp'?'2 all-reduces x 80 layers':mode==='pp'?'one hidden state per boundary':'')+
      RD.stat('Conversations that fit',fmt(p.seqs,0),mode==='rep'?'8 copies':'in the KV cache');
  }
  const A=RD.anim({card:'dd-split-card',ctl:'dd-split-ctl',n:NS,draw,ms:4200,label:'Layout',list:'sx-split'});
  window.DD_SPLIT={STEPS,plan:i=>{mode=STEPS[i][0];users=STEPS[i][1];return plan()}}; // read by check_stages.mjs
  RD.onResize(()=>A.redraw());
})();

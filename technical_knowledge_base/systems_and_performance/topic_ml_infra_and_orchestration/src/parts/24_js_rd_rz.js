// ---- Reading, section 4: rendezvous step by step, with and without a missing rank ----
(function(){
  const el=document.getElementById('rd-rz-svg');if(!el)return;
  let mode='ok';
  const CAP={ok:[
    ['The launcher starts 4 processes','Slurm (srun), torchrun, a JobSet or Ray Train starts 2 processes on each of 2 nodes and gives each RANK, WORLD_SIZE=4, LOCAL_RANK and MASTER_ADDR:MASTER_PORT, the address of node A.'],
    ['Rank 0 opens the store','Rank 0 (or torchrun\'s agent on node A) starts a TCPStore, a tiny key-value server, listening on MASTER_PORT.'],
    ['Everyone connects','Ranks 1, 2 and 3 open a TCP connection to MASTER_ADDR:MASTER_PORT. Ranks 2 and 3 cross the network from node B.'],
    ['Everyone checks in','Each rank writes its own key into the store and increments a counter; the counter reaches WORLD_SIZE.'],
    ['The barrier opens','All 4 have arrived, so every rank\'s wait returns. Nobody could have continued before this moment.'],
    ['The process group is built','gloo (CPU) or NCCL (GPU) shares connection details through the store, then the ranks connect to each other directly; NCCL builds rings and trees over NVLink and the network.'],
    ['First collective','The first all-reduce of gradients runs over the new connections. The store is barely used again.']],
  miss:[
    ['The launcher starts 4 processes, but one dies','Rank 3 crashes before it reaches the store (a bad node, an import error, out of memory) or its node never started it.'],
    ['Rank 0 opens the store','Exactly as before.'],
    ['Three connect','Ranks 1 and 2 connect. Nothing reports rank 3\'s absence: the store does not know who should come.'],
    ['Three check in','The counter stops at 3 of 4.'],
    ['Everyone waits','The three healthy ranks sit in the barrier, using no GPU and printing nothing. From outside, the job looks "running".'],
    ['Still waiting','With env-style launch, a GPU job using NCCL would give up after 10 minutes by default. Under torchrun, a node that never joins fails the rendezvous first: after 600 s with the c10d backend (measured: 602 s), after 900 s with torchrun\'s default static backend (measured: 903 s).'],
    ['Timeout','On gloo the default is 30 minutes. The waiting ranks raise a timeout error and the job fails; every error line comes from the 3 healthy ranks, none from rank 3, the one to look for.']]};
  function draw(i){
    const miss=mode==='miss';
    const w=Math.max(300,Math.min(760,RD.width(el)));
    const gap=14,nw=(w-gap-4)/2,top=6,nh=170,H=top+nh+10;
    let b='';
    const nodes=[{x:2,label:'node A'},{x:2+nw+gap,label:'node B'}];
    nodes.forEach(n=>{b+='<rect x="'+n.x+'" y="'+top+'" width="'+nw+'" height="'+nh+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(n.x+8,top+15,n.label,{fs:11,fill:'var(--mute)'})});
    // store
    const sx=nodes[0].x+nw/2-Math.min(70,nw/2-8),sw=Math.min(140,nw-16),sy=top+24,sh=44;
    const pos=[0,1,2,3].map(r=>{const n=nodes[r>>1];return {x:n.x+nw*((r&1)?0.72:0.28),y:top+nh-36}});
    const arrived=r=>!(miss&&r===3);
    if(i>=1){b+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="'+sh+'" rx="5" fill="var(--bg)" stroke="var(--c4)" stroke-width="1.5"/>'+RD.t(sx+sw/2,sy+14,'TCPStore :PORT',{a:'middle',fs:10.5,w:600});
      for(let r=0;r<4;r++){const on=i>=3&&arrived(r);const bx=sx+sw/2-38+r*20;b+='<rect x="'+bx+'" y="'+(sy+22)+'" width="16" height="14" rx="2" fill="'+(on?'var(--c3)':'var(--bg)')+'" stroke="var(--line)"/>'+RD.t(bx+8,sy+33,r,{a:'middle',fs:9.5,fill:on?'var(--bg)':'var(--mute)'})}}
    // connections to store
    for(let r=0;r<4;r++){const p=pos[r];if(!arrived(r))continue;
      if(((r===0&&i>=1)||(r>0&&i>=2))&&i<5)b+='<line x1="'+p.x+'" y1="'+(p.y-14)+'" x2="'+(sx+sw/2)+'" y2="'+(sy+sh)+'" stroke="var(--c4)" stroke-width="1.5" stroke-dasharray="'+(i>=4?'0':'4 3')+'"/>';}
    // peer ring
    if(!miss&&i>=5){const ring=[0,1,3,2];for(let k=0;k<4;k++){const a=pos[ring[k]],c=pos[ring[(k+1)%4]];
      b+='<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+'" stroke="'+(i>=6?'var(--c2)':'var(--c1)')+'" stroke-width="'+(i>=6?3:2)+'"/>'}}
    // ranks
    for(let r=0;r<4;r++){const p=pos[r];const dead=!arrived(r);
      b+='<circle cx="'+p.x+'" cy="'+p.y+'" r="14" fill="'+(dead?'var(--bg)':'var(--c1)')+'" stroke="'+(dead?'var(--bad)':'var(--c1)')+'" stroke-width="2"/>'+RD.t(p.x,p.y+4,dead?'X':r,{a:'middle',fs:12,w:600,fill:dead?'var(--bad)':'var(--bg)'});
      b+=RD.t(p.x,p.y+28,'rank '+r,{a:'middle',fs:10,fill:'var(--mute)'});}
    if(miss&&i>=4){const clk=['','','','','1 min','10 min','30 min'][i];b+=RD.t(w/2,top+nh-2,'waiting: '+clk,{a:'middle',fs:11,w:600,fill:'var(--bad)'})}
    el.innerHTML=RD.svg(w,H,b,'Four ranks meeting at a TCP store');
    const c=CAP[mode][i];document.getElementById('rd-rz-cap').innerHTML='<div class="t">'+(i+1)+'. '+c[0]+'</div><p>'+c[1]+'</p>';
    const n=i<3?0:(miss?3:4);
    document.getElementById('rd-rz-cnt').innerHTML=RD.stat('Checked in',(i>=3?n:0)+' of 4')+RD.stat('State',miss?(i>=6?'failed (timeout)':i>=4?'hung':'starting'):(i>=6?'training':i>=4?'initialised':'starting'))+RD.stat('GPU work done',(!miss&&i>=6)?'yes':'none');
  }
  const an=RD.anim({card:'rd-rz-card',ctl:'rd-rz-ctl',n:7,draw,ms:2200,label:'Step'});
  RD.seg(document.getElementById('rd-rz-mode'),m=>{mode=m;an.reset(7);an.play()});
  RD.onResize(()=>an.redraw());
})();

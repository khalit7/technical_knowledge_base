// ---- Reading top: the hero, one engine step of the running example (static, drawn at the measured width) ----
// Also defines BKG, the block-grid drawer shared by the paging stepper (section 2) and the preemption stepper (section 6).
window.BKG=(function(){
  // one block: {c: fill colour, st: stroke, sw: stroke width, dash, op, slots: [fill colour or null per slot]}
  function block(x,y,w,h,o){
    let b='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="2" fill="'+(o.c||'none')+'"'+(o.op!=null?' fill-opacity="'+o.op+'"':'')+' stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>';
    return b;
  }
  return {block};
})();
(function(){
  const el=document.getElementById('bk-hero-svg');if(!el)return;
  const T=RD.t;
  function draw(){
    const W=Math.max(300,Math.min(860,RD.width(el))),nar=W<660;
    let b='',y=14;
    // band 1: the step's token budget, to scale
    b+=T(2,y,nar?'Step t: at most 8,192 new tokens (sections 1, 5)':'Step t: the scheduler fills a budget of at most 8,192 new tokens (sections 1 and 5)',{fs:12,w:600});
    const x0=2,bw=W-4,sc=bw/8192,by=y+8,bh=28;
    const d=Math.max(6,64*sc),w7=1000*sc,w8=bw-d-w7;
    b+='<rect x="'+x0+'" y="'+by+'" width="'+d.toFixed(1)+'" height="'+bh+'" fill="var(--c6)"/>';
    b+='<rect x="'+(x0+d).toFixed(1)+'" y="'+by+'" width="'+w7.toFixed(1)+'" height="'+bh+'" fill="var(--c2)"/>';
    b+='<rect x="'+(x0+d+w7).toFixed(1)+'" y="'+by+'" width="'+w8.toFixed(1)+'" height="'+bh+'" fill="var(--c4)"/>';
    b+='<rect x="'+x0+'" y="'+by+'" width="'+bw+'" height="'+bh+'" fill="none" stroke="var(--ink)" stroke-width="1"/>';
    b+=T(x0+d+w7/2,by+bh/2+4,w7>70?'R7: 1,000':'R7',{a:'middle',fs:11,fill:'var(--bg)',w:600});
    b+=T(x0+d+w7+w8/2,by+bh/2+4,nar?'R8: 7,128-token chunk':'R8: a 7,128-token chunk of its 40,000-token document',{a:'middle',fs:11,fill:'var(--bg)',w:600});
    y=by+bh+16;
    b+=T(2,y,nar?'64 decodes, 1 token each':'64 decode tokens, 1 per running request, go in first',{fs:11,fill:'var(--c6)'});
    b+=T(W-2,y,nar?'R9 waits (section 7)':'R9 waits in the queue: budget full (section 7)',{a:'end',fs:11,fill:'var(--mute)'});
    // band 2: the block pool
    y+=28;
    b+=T(2,y,nar?'GPU KV cache: 16-token blocks (sections 2, 3, 6)':'GPU KV cache: a pool of 16-token blocks, schematic (sections 2, 3 and 6)',{fs:12,w:600});
    const s=nar?16:20,g=3,cols=Math.floor((W-4)/(s+g)),rows=3,N=cols*rows,gy=y+8;
    const ty=new Array(N).fill('o');
    for(let i=0;i<4;i++)ty[i]='S';
    [0.17,0.41,0.62,0.81].forEach(f=>{ty[Math.floor(N*f)]='R1'});
    ty[Math.floor(N*0.3)]='R7';ty[Math.floor(N*0.3)+1]='R7';
    const r8=Math.floor(N*0.5);for(let i=0;i<4;i++)if(ty[r8+i]==='o')ty[r8+i]='R8';
    const nc=Math.max(4,Math.floor(cols*0.35)),nf=Math.max(3,Math.floor(cols*0.2));
    for(let i=N-nc-nf;i<N-nf;i++)ty[i]='c';
    for(let i=N-nf;i<N;i++)ty[i]='f';
    const ST={S:{c:'var(--c5)'},R1:{c:'var(--c1)',st:'var(--ink)',sw:2},R7:{c:'var(--c2)'},R8:{c:'var(--c4)'},o:{c:'var(--c6)',op:0.45},c:{c:'url(#bkHatch)',st:'var(--mute)'},f:{c:'none',dash:'2 2'}};
    for(let i=0;i<N;i++){const r=Math.floor(i/cols),c=i%cols;b+=BKG.block(2+c*(s+g),gy+r*(s+g),s,s,ST[ty[i]])}
    y=gy+rows*(s+g)+6;
    const notes=[['o',nar?'The 64 other running requests (1)':'The 64 other running requests, each holding its own blocks (section 1)'],['S',nar?'System prompt: stored once, shared (3)':'S: the 1,000-token system prompt, stored once and shared by all 65 requests (section 3)'],
      ['R1',nar?'R1: its blocks lie anywhere (2)':'R1: one request; its block table points at the S blocks and its own, anywhere (section 2)'],
      ['c',nar?'Cached, free: evicted oldest first (3)':'Blocks of finished requests: cached until the space is needed, oldest evicted first (section 3)'],
      ['f',nar?'Free; none left: preempt (6)':'Free; when none is left, a running request is preempted (section 6)']];
    notes.forEach(n=>{y+=17;b+=BKG.block(2,y-11,12,12,ST[n[0]]);b+=T(20,y-1,n[1],{fs:11})});
    // band 3: host tier
    y+=26;
    b+=T(2,y,nar?'Host DRAM tier (section 4)':'Host DRAM tier: catches the blocks the GPU evicts, reloaded on a hit (section 4)',{fs:12,w:600});
    const hs=s-4,hc=Math.floor((W-4)/(hs+g)),hy=y+8;
    for(let i=0;i<hc;i++)b+=BKG.block(2+i*(hs+g),hy,hs,hs,i%5===4?ST.f:ST.c);
    y=hy+hs+4;
    const defs='<defs><pattern id="bkHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--mute)" stroke-width="1.6"/></pattern></defs>';
    el.innerHTML=RD.svg(W,y,defs+b,'One engine step: token budget and block pool');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();

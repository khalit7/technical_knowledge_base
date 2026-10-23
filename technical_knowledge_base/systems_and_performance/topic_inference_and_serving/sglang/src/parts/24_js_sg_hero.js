// ---- Reading top: the hero figure, one request through an SGLang deployment (static annotated diagram, drawn at the measured width) ----
// Also defines window.SGDRAW: small helpers (wrapped text in boxes, arrows) shared with 27_js_sg_diag.js.
(function(){
  const el=document.getElementById('sg-hero');if(!el)return;
  const D=window.SGDRAW={
    wrap(s,n){const out=[];let cur='';for(const w of String(s).split(' ')){if(cur&&(cur+' '+w).length>n){out.push(cur);cur=w}else cur=cur?cur+' '+w:w}if(cur)out.push(cur);return out},
    // a box with a bold title and wrapped lines; returns {svg,h}
    box(x,y,w,title,sub,o){o=o||{};const cw=6.1,n=Math.max(8,Math.floor((w-16)/cw)),tl=D.wrap(title,Math.floor((w-16)/6.8)),sl=sub?D.wrap(sub,n):[];
      const h=o.h||(10+tl.length*15+sl.length*14+6);let s='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>';
      tl.forEach((t,i)=>s+=RD.t(x+8,y+18+i*15,RD.esc(t),{fs:12,w:600,fill:o.tc||'var(--ink)'}));
      sl.forEach((t,i)=>s+=RD.t(x+8,y+18+tl.length*15+i*14,RD.esc(t),{fs:11,fill:'var(--mute)'}));
      return {svg:s,h:h}},
    arrow(x1,y1,x2,y2,lab,col){col=col||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),k=6;
      let s='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="1.5"/>';
      s+='<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(x2-k*Math.cos(a-0.45)).toFixed(1)+','+(y2-k*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-k*Math.cos(a+0.45)).toFixed(1)+','+(y2-k*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+col+'"/>';
      if(lab)s+=RD.t((x1+x2)/2+8,(y1+y2)/2+4,RD.esc(lab),{fs:11,fill:'var(--mute)'});return s}};
  function draw(){
    const W=RD.width(el),X=1,BW=W-2,wide=W>=620;let y=1,b='';
    const add=(r)=>{b+=r.svg;y+=r.h};
    add(D.box(X,y,BW,'Router: SGLang Model Gateway (Rust), section 8','cache_aware by default: an approximate tree of the text sent to each worker routes a request to the worker likely to hold its prefix, unless the load is imbalanced.'));
    b+=D.arrow(W/2,y+2,W/2,y+26,'request text');y+=30;
    add(D.box(X,y,BW,'1. TokenizerManager','HTTP server, chat template, tokenize.'));
    b+=D.arrow(W/2,y+2,W/2,y+26,'token ids (ZeroMQ)');y+=30;
    // the scheduler: three panels
    const sy=y,ip=8,hl=D.wrap('2. Scheduler, one per GPU rank: everything this page is about',Math.floor((BW-16)/6.8));
    const head=hl.map((t,i)=>RD.t(X+8,sy+17+i*15,RD.esc(t),{fs:12,w:600})).join('');let iy=sy+10+hl.length*15;
    const pw=wide?[(BW-4*ip)*0.24,(BW-4*ip)*0.42,(BW-4*ip)*0.34]:[BW-2*ip,BW-2*ip,BW-2*ip];
    const px=wide?[X+ip,X+2*ip+pw[0],X+3*ip+pw[0]+pw[1]]:[X+ip,X+ip,X+ip];
    let inner='',ph=[];
    // panel 1: waiting queue
    {const x=px[0],w=pw[0],r=D.box(x,iy,w,'Waiting queue (section 4)','ordered by --schedule-policy: fcfs by default; lpm and dfs-weight reuse the tree first.',{fill:'var(--bg)'});
      const cols=['var(--good)','var(--acc)','var(--good)','var(--c4)','var(--good)','var(--acc)','var(--mute)'];const qs=Math.min(14,(w-16)/cols.length-3);
      let q='';cols.forEach((c,i)=>q+='<rect x="'+(x+8+i*(qs+3)).toFixed(1)+'" y="'+(iy+r.h+2)+'" width="'+qs.toFixed(1)+'" height="'+qs.toFixed(1)+'" rx="2" fill="'+c+'" opacity="0.8"/>');
      inner+=r.svg+q;ph.push(r.h+qs+10)}
    if(!wide)iy+=ph[0]+ip;
    // panel 2: the radix tree
    const tx=px[1],tw=pw[1],ty=iy;let nodes=[];
    {const r=D.box(tx,ty,tw,'Radix tree on the CPU (sections 2 and 3)','token runs mapped to slot numbers; a lock count and a last-access time per node.',{fill:'var(--bg)',stroke:'var(--good)'});
      let s=r.svg;const y0=ty+r.h+4,rx=tx+12;
      s+='<circle cx="'+rx+'" cy="'+(y0+10)+'" r="4" fill="var(--ink)"/>';
      const nw1=Math.min(tw-34,246),nw2=Math.min(tw-56,160);
      const N=[[rx+12,y0,nw1,'You are a bank assistant . Be brief .','var(--good)'],[rx+34,y0+28,nw2,'What is my balance ?','var(--acc)'],[rx+34,y0+54,nw2,'Can I open an account ?','var(--c4)']];
      s+='<line x1="'+rx+'" y1="'+(y0+10)+'" x2="'+(rx+12)+'" y2="'+(y0+10)+'" stroke="var(--ink)"/>';
      s+='<path d="M'+(rx+22)+','+(y0+20)+' V'+(y0+64)+' M'+(rx+22)+','+(y0+38)+' H'+(rx+34)+' M'+(rx+22)+','+(y0+64)+' H'+(rx+34)+'" fill="none" stroke="var(--ink)"/>';
      N.forEach(n=>{s+='<rect x="'+n[0]+'" y="'+n[1]+'" width="'+n[2].toFixed(1)+'" height="20" rx="3" fill="'+n[4]+'"/>';
        let l=n[3];const mx=Math.floor((n[2]-8)/6.2);if(l.length>mx)l=l.slice(0,mx-1)+'…';s+=RD.t(n[0]+4,n[1]+14,RD.esc(l),{fs:11,fill:'var(--bg)',w:600})});
      nodes=N;inner+=s;ph.push(r.h+4+80)}
    if(!wide)iy+=ph[1]+8;
    // panel 3: the KV pool. Wide: its label box on top, the slots level with the tree nodes. Narrow: the slots right under the tree, the label box below them.
    {const x=px[2],w=pw[2],n=24,ss=Math.min(16,(w-16)/n),seg=[[0,9,'var(--good)'],[9,14,'var(--acc)'],[14,20,'var(--c4)'],[20,24,'var(--dim)']];
      const nodeTop=nodes[0][1];let y0,s='',r;
      if(wide){r=D.box(x,iy,w,'KV pool on the GPU','the keys and values themselves; they never move. One square = one token slot; grey = free.',{fill:'var(--bg)'});s+=r.svg;y0=Math.max(iy+r.h+8,nodeTop+22)}
      else{y0=iy;r=D.box(x,iy+ss+12,w,'KV pool on the GPU (the slots above)','the keys and values themselves; they never move. One square = one token slot; grey = free.',{fill:'var(--bg)'});s+=r.svg}
      for(let i=0;i<n;i++){const c=seg.find(q=>i>=q[0]&&i<q[1])[2];s+='<rect x="'+(x+8+i*ss).toFixed(1)+'" y="'+y0+'" width="'+(ss-1.5).toFixed(1)+'" height="'+(ss+4).toFixed(1)+'" rx="2" fill="'+c+'"/>'}
      // dashed links from tree nodes to their slot ranges (to the slots' top edge, or bottom edge when the node sits lower)
      if(wide)nodes.forEach((nd,k)=>{  // narrow: the colours alone tie nodes to slots
        const q=seg[k],sx=x+8+(q[0]+q[1])/2*ss,ex=nd[0]+nd[2],ey=nd[1]+10,below=wide&&ey>y0+ss+4,ty2=below?y0+ss+5:y0-1;
        s+='<path d="M'+ex.toFixed(1)+','+ey.toFixed(1)+' C'+(wide?(ex+sx)/2:ex+20).toFixed(1)+','+(wide?ey:(ey+ty2)/2).toFixed(1)+' '+sx.toFixed(1)+','+(below?ty2+16:ty2-18).toFixed(1)+' '+sx.toFixed(1)+','+ty2.toFixed(1)+'" fill="none" stroke="'+q[2]+'" stroke-width="1.4" stroke-dasharray="4 3"/>'});
      inner+=s;ph.push(wide?Math.max(r.h,y0-iy+ss+6)+4:ss+12+r.h)}
    if(wide)iy+=Math.max(...ph)+ip;else iy+=ph[2]+ip;
    // pills: the loop, the grammar, scale
    const pills=['Overlap loop: prepares step k+1 while the GPU runs step k (section 5)','Grammar mask from XGrammar applied before sampling (section 6)'];
    let pl='';if(wide){const w2=(BW-3*ip)/2;pills.forEach((p,i)=>{const r=D.box(X+ip+i*(w2+ip),iy,w2,p,'',{fill:'var(--bg)'});pl+=r.svg;if(i===1)iy+=r.h+ip})}
    else pills.forEach(p=>{const r=D.box(X+ip,iy,BW-2*ip,p,'',{fill:'var(--bg)'});pl+=r.svg;iy+=r.h+6});
    const sh=iy-sy+(wide?0:2);
    b+='<rect x="'+X+'" y="'+sy+'" width="'+BW+'" height="'+sh+'" rx="9" fill="var(--soft)" stroke="var(--good)" stroke-width="1.6"/>'+head+inner+pl;y=sy+sh;
    b+=D.arrow(W/2,y+2,W/2,y+26,'new token ids');y+=30;
    add(D.box(X,y,BW,'3. DetokenizerManager','token ids to text, streamed back. At scale (section 9) many schedulers serve one model: data-parallel attention, expert parallelism, prefill and decode on separate GPU pools.'));
    el.innerHTML=RD.svg(W,y+2,b,'One request through SGLang: router, tokenizer, scheduler with queue, radix tree and KV pool, detokenizer')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();

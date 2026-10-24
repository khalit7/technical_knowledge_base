// ---- Reading figures added in the 2026-10-24 rebuild: the hero, the conditioning diagram, the cost slider, Moshi's streams, F5-TTS's infilling ----
// Static diagrams drawn at the measured width (redrawn on resize); the cost slider uses VAU.calc, the same formula as calc/recompute.py.
(function(){
  const U=window.VAU,$=id=>document.getElementById(id),T=RD.t;
  if(!$('va-hero'))return;
  const m13=U.mById.wan13,c13=U.calc(m13);
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.w||1.2)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const head=(x,y,dir,c)=>{c=c||'var(--mute)';const s=5;const p=dir==='r'?[[x,y],[x-s,y-s*0.8],[x-s,y+s*0.8]]:[[x,y],[x-s*0.8,y-s],[x+s*0.8,y-s]];return '<polygon points="'+p.map(q=>q.join(',')).join(' ')+'" fill="'+c+'"/>'};

  // ---------- hero: the two pipelines ----------
  const LANES=[
    {name:'Video: Wan 2.1, a 5 s clip',short:'Video',b:[['Clip',['81 frames, 480×832','97M numbers']],['Causal video VAE',['time ÷4, space ÷8','21 × 60 × 104 × 16']],['Space-time patches',['1 × 2 × 2 cells each',U.int(c13.N)+' tokens'],1],['Video DiT',['flow matching,','full 3-D attention']],['VAE decoder',['latent to 81 frames','']]]},
    {name:'Audio: EnCodec 24 kHz at 6 kbps, the 3.67 s sentence',short:'Audio',b:[['Waveform',['3.67 s at 24 kHz','88,080 samples']],['Codec encoder',['320 samples a frame','75 frames a second']],['RVQ codes',['8 codebooks of 1,024',(75*8)+' tokens a second'],1],['Generator',['LM over the tokens,','or flow on a latent']],['Codec decoder',['codes to waveform','']]]}];
  function bx(x,y,w,h,b){const hl=!!b[2];let s=box(x,y,w,h,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)',sw:hl?2:1});
    s+=T(x+w/2,y+16,b[0],{a:'middle',fs:11.5,w:600});
    b[1].forEach((l,i)=>{if(l)s+=T(x+w/2,y+31+i*14,l,{a:'middle',fs:11,fill:hl&&i===1?'var(--acc)':'var(--ink)',w:hl&&i===1?700:null})});return s}
  function hero(){const el=$('va-hero'),w=RD.width(el);let s='',h;
    if(w>=760){const ag=20,bw=(w-4*ag)/5,bh=60,lh=18;h=2*(lh+bh)+14;
      LANES.forEach((L,k)=>{const y0=k*(lh+bh+14);s+=T(0,y0+12,L.name,{fs:12,w:600,fill:'var(--mute)'});
        L.b.forEach((b,i)=>{const x=i*(bw+ag);s+=bx(x,y0+lh,bw,bh,b);if(i<4){const ax=x+bw+3,ay=y0+lh+bh/2;s+=line(ax,ay,ax+ag-7,ay)+head(ax+ag-3,ay,'r')}})})}
    else{const cg=10,cw=(w-cg)/2,bh=54,vg=16,lh=20;h=lh+5*bh+4*vg+2;
      LANES.forEach((L,k)=>{const x0=k*(cw+cg);s+=T(x0+cw/2,13,L.short,{a:'middle',fs:12,w:600,fill:'var(--mute)'});
        L.b.forEach((b,i)=>{const y=lh+i*(bh+vg);s+=bx(x0,y,cw,bh,b);if(i<4){const ax=x0+cw/2,ay=y+bh+2;s+=line(ax,ay,ax,ay+vg-6)+head(ax,ay+vg-2,'d')}})})}
    el.innerHTML=RD.svg(w,h,s,'Video and audio generation pipelines: compress, tokenise, generate, decode')}
  RD.onRender(hero);RD.onResize(hero);

  // ---------- section 3: where each condition enters ----------
  function cond(){const el=$('va-cond'),w=RD.width(el),nar=w<560,L=nar?50:96,R=4,aw=w-L-R,NF=6,fg=nar?5:10,fw=(aw-fg*(NF-1))/NF;
    let s='';const yT=8,hT=18,yV=yT+hT+50,hV=48,yA=yV+hV+44,hA=16,h=yA+hA+22;
    // text row
    s+=T(0,yT+13,nar?'Text':'Text tokens',{fs:11.5,w:600});
    const nt=nar?16:32,tw=aw/nt;for(let i=0;i<nt;i++)s+=box(L+i*tw+0.5,yT,tw-1.5,hT,{rx:2,fill:'var(--c4)',stroke:'none',op:0.5});
    s+=T(L+aw/2,yT+13,'512 umT5 tokens',{a:'middle',fs:11,w:600});
    // video row
    s+=T(0,yV+hV/2+4,nar?'Video':'Video latent',{fs:11.5,w:600});
    for(let f=0;f<NF;f++){const x=L+f*(fw+fg);
      if(f===0){s+=box(x,yV,fw,hV,{fill:'var(--acc)',stroke:'var(--acc)',op:0.85});s+=T(x+fw/2,yV+hV/2+4,'image',{a:'middle',fs:11,w:700,fill:'var(--bg)'})}
      else{s+=box(x,yV,fw,hV,{fill:'var(--soft)'});let r=f*9301+49297;for(let k=0;k<26;k++){r=(r*9301+49297)%233280;const px=x+3+(r/233280)*(fw-6);r=(r*9301+49297)%233280;const py=yV+3+(r/233280)*(hV-6);if(fw>44&&Math.abs(py-yV-hV/2)<8)continue;s+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="1.3" fill="var(--mute)"/>'}
        if(fw>44)s+=T(x+fw/2,yV+hV/2+4,'noisy',{a:'middle',fs:11,fill:'var(--mute)'})}
      s+=T(x+fw/2,yV+hV+12,(nar?'':'latent ')+'frame '+(f===NF-1?20:f),{a:'middle',fs:11,fill:'var(--mute)'})}
    // text to video arrows
    [1,3].forEach(f=>{const x=L+f*(fw+fg)+fw/2;s+=line(x,yT+hT+22,x,yV-6,{c:'var(--c4)',w:1.6})+head(x,yV-2,'d','var(--c4)')});
    s+=T(L+aw/2,yT+hT+15,nar?'cross or joint attention':'cross-attention (Wan, LTX) or joint attention (CogVideoX, HunyuanVideo)',{a:'middle',fs:11,fill:'var(--ink)'});
    // audio row
    s+=T(0,yA+12,nar?'Audio':'Audio latent',{fs:11.5,w:600});
    const na=nar?24:48,awc=aw/na;for(let i=0;i<na;i++)s+=box(L+i*awc+0.5,yA,awc-1.5,hA,{rx:2,fill:'var(--c3)',stroke:'none',op:0.55});
    for(let f=0;f<NF;f++){const x=L+f*(fw+fg)+fw/2;s+=line(x,yV+hV+16,x,yA-3,{c:'var(--c3)',dash:'3 3',w:1.4})}
    s+=T(L+aw/2,yA+hA+15,nar?'time-aligned cross-attention (LTX-2)':'cross-attention between the streams, time positions only (LTX-2); each audio segment meets its own frames',{a:'middle',fs:11,fill:'var(--ink)'});
    el.innerHTML=RD.svg(w,h,s,'Where text, a first frame and audio enter a video denoiser')}
  RD.onRender(cond);RD.onResize(cond);

  // ---------- section 4: one slider, clip length ----------
  const sl=$('va-cost-f'),mx=U.calc(m13,{F:16*20+1}),fc=U.V.flopcheck;
  function cost(){const sec=+sl.value,F=16*sec+1,c=U.calc(m13,{F}),b5=c13;
    $('va-cost-fl').textContent=sec+' s ('+F+' frames)';
    $('va-cost-cnt').innerHTML=RD.stat('Latent frames',c.lf)+RD.stat('Tokens',U.int(c.N))+RD.stat('TFLOP per pass',U.TF(c.per))+RD.stat('Attention share',U.pct(c.share))+RD.stat('Against 5 s',U.fx(c.per/b5.per,2)+'×','tokens '+U.fx(c.N/b5.N,2)+'×');
    $('va-cost-bar').innerHTML='<span style="width:'+(100*c.lin/mx.per).toFixed(2)+'%;background:var(--c1)"></span><span style="width:'+(100*c.att/mx.per).toFixed(2)+'%;background:var(--c2)"></span>';
    $('va-cost-note').innerHTML=(sec===5?'Wan 2.1 1.3B\'s default clip, 480 &times; 832 at 16 fps. The formula gives '+U.fx(c.per/1e12,1)+' TFLOP; PyTorch\'s FLOP counter measured '+U.fx(fc.counted/1e12,1)+' TFLOP on meta tensors (below). ':'Wan 2.1 1.3B, 480 &times; 832 at 16 fps, '+F+' = 16 &times; '+sec+' + 1 frames. ')+
      'Linear layers '+U.TF(c.lin)+' TFLOP, attention '+U.TF(c.att)+' TFLOP. Formula 2 P N + 4 L N<sup>2</sup> D with P = 1.42B, L = 30, D = 1,536 from the config (derived).'}
  sl.addEventListener('input',cost);RD.onRender(cost);

  // ---------- section 8: Moshi's streams ----------
  function moshi(){const el=$('va-moshi'),w=RD.width(el),nar=w<560,L=nar?50:120,NS=nar?5:9,cw=(w-L-4)/NS,rh=9,gap=8;
    const groups=[['text',nar?'text':'text (monologue)',1,'var(--c4)'],['moshi',nar?'Moshi':'Moshi: 8 codebooks',8,'var(--acc)'],['user',nar?'user':'user: 8 codebooks',8,'var(--c3)']];
    let s='',y=20;const cur=NS-1;
    for(let t=0;t<NS;t++)s+=T(L+t*cw+cw/2,12,(t===cur?'now':(t-cur)*80+' ms'),{a:'middle',fs:11,fill:t===cur?'var(--acc)':'var(--mute)',w:t===cur?700:null});
    const top=y;
    groups.forEach(g=>{s+=T(0,y+g[2]*rh/2+4,g[1],{fs:11,w:600});
      for(let r=0;r<g[2];r++)for(let t=0;t<NS;t++){const past=t<cur;let op=past?0.45:(g[0]==='user'?0.9:0.15);
        s+=box(L+t*cw+1,y+r*rh,cw-2,rh-1.5,{rx:1.5,fill:g[3],stroke:'none',op})}
      y+=g[2]*rh+gap});
    const bot=y-gap;
    // current column outline and depth order
    s+=box(L+cur*cw-1,top-3,cw+2,bot-top+6,{fill:'none',stroke:'var(--acc)',sw:2,rx:3});
    // bottom brackets
    const yb=bot+12;s+=line(L+2,yb,L+cur*cw-4,yb,{c:'var(--ink)',w:1.4})+line(L+2,yb-4,L+2,yb+1,{c:'var(--ink)'})+line(L+cur*cw-4,yb-4,L+cur*cw-4,yb+1,{c:'var(--ink)'});
    s+=T(L+cur*cw/2,yb+15,nar?'temporal: once a step':'temporal transformer (7B) reads all past steps, once per step',{a:'middle',fs:11});
    s+=T(L+cur*cw+cw/2,yb+15,'depth',{a:'middle',fs:11,fill:'var(--acc)',w:700});
    s+=T(L+cur*cw+cw/2,yb+29,nar?'text, codes':'text, then 8 codes',{a:'middle',fs:11,fill:'var(--acc)'});
    const h=yb+36;el.innerHTML=RD.svg(w,h,s,'Moshi token streams per 80 ms step')}
  RD.onRender(moshi);RD.onResize(moshi);

  // ---------- section 8: F5-TTS infilling ----------
  function f5(){const el=$('va-f5'),w=RD.width(el),L=44,aw=w-L-4,hR=24;let s='',y=6;
    const seg=(y,parts,lab)=>{s+=T(0,y+16,lab,{fs:11.5,w:600});let x=L;parts.forEach(p=>{const pw=aw*p[0];s+=box(x+0.5,y,pw-1.5,hR,{rx:3,fill:p[2],stroke:p[3]||'none',op:p[4]==null?0.55:p[4],dash:p[5]});s+=T(x+pw/2,y+16,p[1],{a:'middle',fs:11,w:600});x+=pw})};
    seg(y,[[0.18,'prompt','var(--c4)'],[0.22,'new text','var(--c4)',null,0.85],[0.60,'filler tokens','var(--soft)','var(--line)',1,'3 3']],'Text');
    y+=hR+16;
    seg(y,[[0.40,w<480?'prompt audio':'prompt audio (kept)','var(--c3)'],[0.60,w<480?'generated by flow':'masked frames: generated by flow','var(--acc2)','var(--acc)',1]],'Mel');
    y+=hR+10;s+=line(L+1,y,L+aw-1,y,{c:'var(--ink)'})+line(L+1,y-4,L+1,y+1,{c:'var(--ink)'})+line(L+aw-1,y-4,L+aw-1,y+1,{c:'var(--ink)'});
    s+=T(L+aw/2,y+15,'same length: text padded to the number of mel frames',{a:'middle',fs:11});
    el.innerHTML=RD.svg(w,y+22,s,'F5-TTS text padding and masked mel frames')}
  RD.onRender(f5);RD.onResize(f5);
})();

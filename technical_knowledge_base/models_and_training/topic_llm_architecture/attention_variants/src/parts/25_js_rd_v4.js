// Reading section 5, DeepSeek-V4's CSA and HCA as a stepper: tokens, blocks merged into entries, the raw window, then select (CSA)
// or read all (HCA), then the real numbers at 1M tokens. 64 tokens; HCA drawn at 16 tokens per entry instead of 128 (illustrative).
(function(){
  if(!window.RD||!document.getElementById('av-v4-card'))return;
  const $=id=>document.getElementById(id),N=64,WIN=8;let mode='csa';
  const cfg={csa:{m:4,pick:[2,7,11]},hca:{m:16,pick:null}};
  const cap={csa:[
    ['Tokens arrive','Each token gets a 512-number entry C<sub>j</sub> (key and value at once) and a compression logit Z<sub>j</sub>. Nothing is cached per token yet, except in the window.'],
    ['Every 4 tokens merge into one entry','A block\'s entries are averaged channel by channel with learned weights, softmax over the block of Z + B. CSA\'s blocks overlap: each entry is built from 8 tokens (the bracket) through two weight series. The cache keeps one entry per 4 tokens.'],
    ['Keep the last 128 tokens raw','A query may attend only to completed blocks, so without a window it could not see its own unfinished block, usually the most relevant tokens. V4 keeps the last 128 tokens uncompressed (8 drawn).'],
    ['The indexer picks the top-k entries; attention reads them and the window','A DSA indexer (64 heads of 128, FP4) scores every merged entry and the query reads the top 1,024 (V4-Pro; 512 in Flash; 3 drawn) plus the window, with each entry serving as key and value for all 128 heads.'],
    ['At 1M tokens, per CSA layer','Stored: 250,000 merged entries + 128 in the window. Read per decoded token: 1,024 + 128. The indexer still scores all 250,000, a quarter of what DSA\'s indexer scores on raw tokens.']],
   hca:[
    ['Tokens arrive','Each token gets a 512-number entry C<sub>j</sub> and a compression logit, as in CSA.'],
    ['Every 128 tokens merge into one entry','Blocks do not overlap; each is one learned channel-wise weighted average (16 tokens per entry drawn, so the entries are visible). The cache keeps one entry per 128 tokens.'],
    ['Keep the last 128 tokens raw','The same uncompressed window as CSA, for the same reason: the unfinished block is invisible otherwise.'],
    ['No selection: read every entry and the window','HCA attends densely to all of its merged entries; there is no indexer. It is not sparse attention, just heavy compression.'],
    ['At 1M tokens, per HCA layer','Stored: 7,813 merged entries + 128 in the window; read: all 7,941, fewer than DSA stores by two orders of magnitude. CSA and HCA together: precise nearby, cheap far away.']]};
  function draw(i){
    const el=$('av-v4'),W=RD.width(el),c=cfg[mode],m=c.m,nb=N/m,cw=Math.max(3,Math.floor((W-60)/N)),wd=cw*N,x0=0;
    let s='';const y0=18,y1=64;
    s+=RD.t(x0,12,'tokens',{fill:'var(--mute)'})+RD.t(x0,y1-6,'cached entries',{fill:'var(--mute)'});
    for(let t=0;t<N;t++){const inWin=t>=N-WIN,fade=i>=1&&!inWin;
      const fill=i>=3&&inWin?'var(--acc)':inWin&&i>=2?'var(--c3)':'var(--c3)';
      s+='<rect x="'+(x0+t*cw)+'" y="'+y0+'" width="'+(cw-1)+'" height="16" fill="'+fill+'" fill-opacity="'+(fade?.18:(i>=2&&inWin?1:.6))+'"/>';
      if(i>=1&&!inWin)s+='';}
    for(let b=0;b<=nb;b++)s+='<line x1="'+(x0+b*m*cw)+'" x2="'+(x0+b*m*cw)+'" y1="'+(y0-3)+'" y2="'+(y0+19)+'" stroke="var(--mute)" stroke-width="'+(m>4?1:.6)+'"/>';
    if(i===2)s+='<rect x="'+(x0+(N-WIN)*cw-2)+'" y="'+(y0-4)+'" width="'+(WIN*cw+2)+'" height="24" rx="3" fill="none" stroke="var(--acc)" stroke-width="2"/>'+RD.t(x0+(N-WIN)*cw-4,y0+34,'raw window',{a:'end',fill:'var(--acc)'});
    if(i>=1){for(let b=0;b<nb;b++){const x=x0+b*m*cw+1,ww=m*cw-3;const read=i>=3&&(c.pick?c.pick.includes(b):true);
        s+='<rect x="'+x+'" y="'+y1+'" width="'+ww+'" height="16" rx="2" fill="'+(read?'var(--acc)':'var(--c3)')+'" fill-opacity="'+(read?1:.75)+'"/>';
        if(i===1&&b===Math.floor(nb/2)){const bx=x0+(b-(mode==='csa'?1:0))*m*cw,bw=(mode==='csa'?2:1)*m*cw;s+='<path d="M'+bx+' '+(y0+22)+'v6h'+bw+'v-6" fill="none" stroke="var(--ink)" stroke-width="1.2"/><line x1="'+(bx+bw/2)+'" x2="'+(x+ww/2)+'" y1="'+(y0+28)+'" y2="'+(y1-1)+'" stroke="var(--ink)" stroke-width="1.2"/>'}}}
    if(i>=3)for(let t=N-WIN;t<N;t++)s+='<rect x="'+(x0+t*cw)+'" y="'+(y1+20)+'" width="'+(cw-1)+'" height="8" fill="var(--acc)"/>';
    if(i>=3)s+=RD.t(x0,y1+40,mode==='csa'?'blue: read (top-'+c.pick.length+' entries + window)':'blue: read (every entry + window)',{fill:'var(--mute)'});
    s+='<rect x="'+(x0+wd+4)+'" y="'+y0+'" width="'+Math.min(14,cw+4)+'" height="16" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
    el.innerHTML=RD.svg(Math.max(W,wd+24),y1+46,s,'DeepSeek-V4 '+mode.toUpperCase()+' step '+(i+1));
    const C=cap[mode][i];$('av-v4-cap').innerHTML='<b>Step '+(i+1)+' of 5: '+C[0]+'.</b> '+C[1];
  }
  const an=RD.anim({card:'av-v4-card',ctl:'av-v4-ctl',n:5,ms:2400,draw,label:'V4 step'});
  RD.seg($('av-v4-mode'),v=>{mode=v;an.reset(5)});RD.onResize(()=>an.redraw());
})();

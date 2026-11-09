// Reading section 5, DeepSeek-V4's CSA and HCA as a stepper (RD.anim with a step list on the left, autoplays in view, 2026-11-09): tokens, blocks merged into entries, the raw window, then select (CSA)
// or read all (HCA), then the real numbers at 1M tokens. 64 tokens; HCA drawn at 16 tokens per entry instead of 128 (illustrative).
(function(){
  if(!window.RD||!document.getElementById('av-v4-card'))return;
  const $=id=>document.getElementById(id),N=64,WIN=8;let mode='csa';
  const cfg={csa:{m:4,pick:[2,7,11]},hca:{m:16,pick:null}};
  // the step captions are the step lists on the left (sx-v4c, sx-v4h in 20_read_e.html)
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
  }
  const an=RD.anim({card:'av-v4-card',ctl:'av-v4-ctl',n:5,ms:4200,draw,label:'V4 step',list:'sx-v4c'});
  RD.seg($('av-v4-mode'),v=>{mode=v;$('sx-v4c').hidden=v!=='csa';$('sx-v4h').hidden=v!=='hca';an.reset(5,v==='csa'?'sx-v4c':'sx-v4h')});RD.onResize(()=>an.redraw());
})();

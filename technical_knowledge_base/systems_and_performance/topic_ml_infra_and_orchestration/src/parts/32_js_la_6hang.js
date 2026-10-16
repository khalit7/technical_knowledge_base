// ---- Launch lab: section 7 broken launches (time to error on a log scale, real logs), tools, drills ----
(function(){
  const H=window.LA_H,D=window.LA;if(!H||!D||!D.hangs)return;const {$,esc,svg,t,rect,line}=H;
  const SYS={slurm:'Slurm',k8s:'Kubernetes',ray:'Ray'};
  let cur=0;
  function chart(){
    const el=$('la-hang-svg');if(!el)return;const W=H.width(el),lw=W<520?132:250,x1=W-60,rh=16;
    const hs=D.hangs,lo=Math.log10(0.5),hi=Math.log10(1200),sx=v=>lw+(x1-lw)*(Math.log10(Math.max(v,0.5))-lo)/(hi-lo);
    let b='',y=18;[1,10,60,120,600].forEach(v=>{b+=line(sx(v),12,sx(v),14+hs.length*(rh+6),'var(--line)');b+=t(sx(v),10,v<60?v+' s':(v/60)+' min',{fs:10,a:'middle',fill:'var(--mute)'})});
    hs.forEach((h,i)=>{const on=i===cur;b+=t(4,y+rh-4,(W<520?h.short:h.label),{fs:10.5,w:on?600:400});
      b+=rect(lw,y,Math.max(2,sx(h.t_err)-lw),rh,on?'var(--bad)':'var(--c2)',{op:on?1:0.6});
      b+=t(sx(h.t_err)+4,y+rh-4,H.fmt(h.t_err,h.t_err<10?1:0)+' s',{fs:10,fill:'var(--mute)'});y+=rh+6});
    el.innerHTML=svg(W,y+2,b,'Time from start to the first error, per broken launch (log scale)');
  }
  function body(){const h=D.hangs[cur];
    $('la-hang-body').innerHTML='<p class="small"><b>'+esc(SYS[h.sys]||h.sys)+': '+esc(h.label)+'.</b> '+h.what+'</p>'+
      '<p class="small"><b>First error after '+H.fmt(h.t_err,h.t_err<10?1:0)+' s</b> '+h.timeout+'</p>'+
      '<div class="la-err">'+esc(h.err)+'</div>'+(h.after?'<p class="small">'+h.after+'</p>':'')+(h.src?'<p class="small mute">'+h.src+'</p>':'');
    chart()}
  function init(){if(!$('la-hang-card'))return;
    $('la-hang-pick').innerHTML=D.hangs.map((h,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+esc(h.short)+'</button>').join('');
    H.seg($('la-hang-pick'),m=>{cur=+m;body()});body();H.onRender(chart);
    if(D.hangsum)$('la-hang-sum').innerHTML=D.hangsum;
    if(D.tools)$('la-tools').innerHTML=D.tools;
    if(D.dns&&$('la-dns'))$('la-dns').innerHTML=D.dns;
    if(D.srcbox&&$('la-srcbox'))$('la-srcbox').innerHTML=D.srcbox;
    if(D.pgtext&&$('la-pg-text'))$('la-pg-text').innerHTML=D.pgtext;
    if(D.drills&&$('la-drills')){$('la-drills').innerHTML=D.drills.map((d,i)=>'<div class="la-drill la-pr"><div class="q">'+(i+1)+'. '+d.q+'</div><div class="la-err">'+esc(d.log)+'</div><div class="opts">'+
      d.opts.map(o=>'<button data-a="'+(o[1]?1:0)+'">'+o[0]+'</button>').join('')+'</div><div class="ans" hidden>'+d.ans+'</div></div>').join('')}
    H.drills($('t-launch'));}
  init();
})();

// Reading tab: small chart helpers sized from the measured width (window.AVP).
window.AVP=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // lines: series [{name,color,pts:[[x,y]],dash}], o {xt:[ticks], xlab, ylab, ymin, ymax, yf, xf, logx, h}
  function lines(el,series,o){
    const W=RD.width(el),narrow=W<520,H=o.h||(narrow?220:260),ml=46,mr=12,mt=o.ylab?22:10,mb=38;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),lx=v=>o.logx?Math.log2(v):v;
    const x0=lx(Math.min(...xs)),x1=lx(Math.max(...xs));
    const y0=o.ymin,y1=o.ymax;const X=v=>ml+(lx(v)-x0)/(x1-x0||1)*(W-ml-mr),Y=v=>mt+(1-(v-y0)/(y1-y0))*(H-mt-mb);
    let b='';const yt=o.yt||[y0,(y0+y1)/2,y1];
    for(const t of yt)b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(t)+'" y2="'+Y(t)+'" stroke="var(--line)"/>'+RD.t(ml-4,Y(t)+4,(o.yf||String)(t),{a:'end',fill:'var(--mute)'});
    const xt=o.xt||[...new Set(xs)];for(const t of xt){const xx=X(t);b+=RD.t(xx,H-mb+14,(o.xf||String)(t),{a:xx>W-mr-14?'end':'middle',fill:'var(--mute)'})}
    b+=RD.t((ml+W-mr)/2,H-4,esc(o.xlab||''),{a:'middle',fill:'var(--mute)'});
    for(const s of series){const d=s.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)).join(' ');
      b+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="2"'+(s.dash?' stroke-dasharray="4 3"':'')+'/>';
      for(const p of s.pts)b+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)+'" r="2.6" fill="'+s.color+'"><title>'+esc(s.name)+': '+p[0]+', '+p[1]+'</title></circle>'}
    if(o.ylab)b+=RD.t(4,12,esc(o.ylab),{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,o.label||'chart');
  }
  // horizontal bars: rows [{label,v,color,txt}], o {min,max,ref,refLabel}
  function bars(el,rows,o){
    const W=RD.width(el),narrow=W<520,lw=narrow?Math.min(150,W*0.42):220,rh=narrow?30:24,H=rows.length*rh+30,vx=W-58;
    const X=v=>lw+(v-o.min)/(o.max-o.min)*(vx-lw-6);let b='';
    rows.forEach((r,i)=>{const y=10+i*rh;const lab=r.label;
      if(narrow&&lab.length>26){const cut=lab.lastIndexOf(' ',26)>8?lab.lastIndexOf(' ',26):26;b+=RD.t(lw-6,y+8,esc(lab.slice(0,cut)),{a:'end'})+RD.t(lw-6,y+20,esc(lab.slice(cut).trim()),{a:'end'})}
      else b+=RD.t(lw-6,y+13,esc(lab),{a:'end'});
      const v=Math.max(o.min,Math.min(o.max,r.v));b+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(1,X(v)-lw).toFixed(1)+'" height="'+(rh-10)+'" rx="2" fill="'+(r.color||'var(--c1)')+'"/>'+
        RD.t(vx,y+13,r.txt!==undefined?r.txt:r.v.toFixed(3),{fill:'var(--ink)'})});
    if(o.ref!==undefined){const x=X(o.ref);b+='<line x1="'+x+'" x2="'+x+'" y1="4" y2="'+(H-22)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'+RD.t(x,H-8,esc(o.refLabel||''),{a:'middle',fill:'var(--bad)'})}
    el.innerHTML=RD.svg(W,H,b,o.label||'bars');
  }
  // predict-then-reveal: <div class="pr" id=..> with buttons data-ok and a hidden .ans; text from f()
  function drill(id,f){const el=document.getElementById(id);if(!el)return;const ans=el.querySelector('.ans');
    el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      el.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok==='1'?'right':'wrong'));ans.hidden=false;ans.innerHTML=f(b.dataset.ok==='1')})}
  return {lines,bars,drill,esc};
})();

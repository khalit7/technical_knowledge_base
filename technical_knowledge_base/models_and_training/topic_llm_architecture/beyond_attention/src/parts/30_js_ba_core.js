// ---- Shared helpers for the page's data visuals (window.BA): tab hooks, line = a small line chart, byte and token formats, base64 decode.
// (Its own step controller, BA.anim, was removed on 2026-11-09: the three visuals that used it became widgets the reader drives.) ----
window.BA=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const onResize=(tab,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden||r.offsetParent===null)return;clearTimeout(t);t=setTimeout(f,60)})};
  // line chart: series [{name,color,dash,pts:[[x,y],...]}], opts {logx, ymin, ymax, xlab, ylab, yfmt, xfmt, xticks, yticks, h}
  function line(el,series,o){
    const W=Math.min(820,RD.width(el)),H=o.h||(W<500?220:260),l=48,r=10,t=10,b=34;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const tx=v=>o.logx?Math.log10(v):v;
    const x0=o.xmin!==undefined?tx(o.xmin):Math.min(...xs.map(tx)),x1=o.xmax!==undefined?tx(o.xmax):Math.max(...xs.map(tx));
    const y0=o.ymin!==undefined?o.ymin:Math.min(...ys),y1=o.ymax!==undefined?o.ymax:Math.max(...ys);
    const X=v=>l+(W-l-r)*(tx(v)-x0)/((x1-x0)||1),Y=v=>t+(H-t-b)*(1-(v-y0)/((y1-y0)||1));
    let s='';
    (o.yticks||[]).forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,o.yfmt?o.yfmt(v):String(v),{a:'end',fs:11})});
    (o.xticks||[]).forEach(v=>{const xv=X(v),edge=xv>W-r-18;s+=RD.t(edge?W-2:xv,H-16,o.xfmt?o.xfmt(v):String(v),{a:edge?'end':'middle',fs:11})});
    if(o.xlab)s+=RD.t(W-r,H-2,o.xlab,{a:'end',fs:11,fill:'var(--mute)'});
    if(o.ylab)s+=RD.t(l,9,o.ylab,{fs:11,fill:'var(--mute)'});
    (o.vlines||[]).forEach(v=>{s+='<line x1="'+X(v.x)+'" x2="'+X(v.x)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+(v.label?RD.t(X(v.x)+3,t+10,v.label,{fs:11,fill:'var(--mute)'}):'')});
    series.forEach(sr=>{const pts=sr.pts.filter(p=>!o.logx||p[0]>0).map(p=>X(p[0]).toFixed(1)+','+Y(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)).join(' ');
      s+='<polyline points="'+pts+'" fill="none" stroke="'+sr.color+'" stroke-width="'+(sr.w||1.9)+'"'+(sr.dash?' stroke-dasharray="'+sr.dash+'"':'')+'/>';
      if(sr.dots)sr.pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(Math.max(y0,Math.min(y1,p[1]))).toFixed(1)+'" r="2.6" fill="'+sr.color+'"/>'})});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart')+'<div class="leg">'+series.filter(s=>!s.noleg).map(s=>'<span style="--sw:'+s.color+'">'+RD.esc(s.name)+'</span>').join('')+'</div>';
  }
  const fmtB=b=>b>=1073741824?(b/1073741824).toFixed(b>=10737418240?0:1)+' GiB':b>=1048576?(b/1048576).toFixed(b>=104857600?0:1)+' MiB':b>=1024?(b/1024).toFixed(0)+' KiB':Math.round(b)+' B';
  const fmtT=n=>n>=1048576?(n/1048576).toFixed(n%1048576?1:0)+'M':n>=1024?(n/1024).toFixed(n%1024?1:0)+'K':String(n);
  const dec=s=>{const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a};
  return {RM,onTab,onResize,line,fmtB,fmtT,dec};
})();

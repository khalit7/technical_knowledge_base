// ---- Figure helpers for the Reading tab (namespace FG): wrapped SVG text, boxes, arrows, horizontal bar charts ----
// Every figure is drawn at the container's measured width (RD.width) and redrawn on resize; text is wrapped by an
// estimate of 0.56 em per character so labels never run past their box at 390 px.
window.FG=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function wrap(s,w,fs){const n=Math.max(8,Math.floor(w/((fs||12)*0.56)));const out=[];let line='';
    String(s).split(' ').forEach(word=>{if(!line)line=word;else if((line+' '+word).length<=n)line+=' '+word;else{out.push(line);line=word}});if(line)out.push(line);return out}
  // text block: lines at x, first baseline y; returns svg
  function text(x,y,lines,o){o=o||{};const fs=o.fs||12,lh=o.lh||Math.round(fs*1.3);
    return '<text x="'+x+'" y="'+y+'" font-size="'+fs+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+'>'+
      lines.map((l,i)=>'<tspan x="'+x+'" dy="'+(i?lh:0)+'">'+esc(l)+'</tspan>').join('')+'</text>'}
  // a box with an optional bold title and wrapped body; returns {s, h}
  function box(x,y,w,title,body,o){o=o||{};const fs=o.fs||12,lh=Math.round(fs*1.3),pad=8;
    const tl=title?wrap(title,w-2*pad,fs):[],bl=body?wrap(body,w-2*pad,fs):[];
    const h=pad*2+(tl.length+bl.length)*lh-2;
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>';
    if(o.bar)s+='<rect x="'+x+'" y="'+y+'" width="4" height="'+h+'" rx="2" fill="'+o.bar+'"/>';
    if(tl.length)s+=text(x+pad+(o.bar?3:0),y+pad+fs-1,tl,{fs,w:600,fill:o.tfill});
    if(bl.length)s+=text(x+pad+(o.bar?3:0),y+pad+fs-1+tl.length*lh,bl,{fs,fill:o.bfill||'var(--ink)'});
    return {s,h}}
  function defs(id){return '<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker></defs>'}
  function arrow(id,x1,y1,x2,y2,o){o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="'+(o.sw||1.4)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+' marker-end="url(#'+id+')"/>'}
  // horizontal bars: label above each bar (wraps), value text right of the bar end.
  // rows [{label, v, txt, col, group}], o {log, min, max, ticks, unit, axis}
  function hbars(el,rows,o){o=o||{};const W=Math.min(760,RD.width(el)),L=8,R=70,fs=12,lh=16;
    const vals=rows.map(r=>r.v).filter(v=>v>0);let lo=o.min!=null?o.min:(o.log?Math.min(...vals)/1.5:0),hi=o.max!=null?o.max:Math.max(...vals)*1.05;
    const sx=v=>{if(o.log){const a=Math.log10(lo),b=Math.log10(hi);return L+(W-L-R)*(Math.log10(Math.max(v,lo))-a)/(b-a)}return L+(W-L-R)*(v-lo)/(hi-lo)};
    let y=6,g='';let lastGroup=null;
    rows.forEach(r=>{if(r.group&&r.group!==lastGroup){const gl=wrap(r.group,W-L-10,12);g+=text(L,y+fs,gl,{fs:12,w:700,fill:'var(--mute)'});y+=gl.length*lh+4;lastGroup=r.group}
      const ll=wrap(r.label,W-L-10,fs);g+=text(L,y+fs-1,ll,{fs,fill:'var(--ink)',w:r.bold?600:null});y+=ll.length*lh+1;
      const x2=Math.max(L+2,sx(r.v));g+='<rect x="'+L+'" y="'+y+'" width="'+(x2-L).toFixed(1)+'" height="12" rx="3" fill="'+(r.col||'var(--c2)')+'"/>';
      g+=RD.t(x2+5,y+10.5,esc(r.txt!=null?r.txt:String(r.v)),{fs:11.5,fill:'var(--ink)',w:600});y+=22});
    if(o.ticks){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(y+2)+'" y2="'+(y+2)+'" stroke="var(--line)"/>';
      o.ticks.forEach(t=>{const x=sx(t);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(y-1)+'" y2="'+(y+5)+'" stroke="var(--mute)"/>'+RD.t(x,y+18,t+(o.unit||''),{a:'middle',fs:11,fill:'var(--mute)'})});y+=24;
      if(o.axis){const al=wrap(o.axis,W-L-10,11);g+=text(L,y+8,al,{fs:11,fill:'var(--mute)'});y+=al.length*15}}
    el.innerHTML=RD.svg(W,y+4,g,o.label||'bar chart')}
  return {esc,wrap,text,box,defs,arrow,hbars};
})();

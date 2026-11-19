// ---- Figs. 1 and 2, shared parts (2D SVG, 2026-11-19; replaces the 3D scenes' shared part): a LangGraph graph drawn top to bottom, its nodes and edges,
// the checkpoint stack, arrows that draw themselves, and the per-step tween. Both figures are RD.anim step animations with step lists on the left.
// Colours: amber (--c5) for a triggered or running node, green (--c3) for writes and state, the accent for checkpoints, purple (--c4) for model calls, --bad for a kill or an error.
window.FLGF=(function(){
  const esc=RD.esc,MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  const isSE=n=>n==='__start__'||n==='__end__';
  const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ph=(e,a,b)=>cl((e-a)/(b-a),0,1); // progress of the part [a, b] of a step's tween
  // text: mono for code names, sans for prose labels; widths estimated per character
  const wMono=(s,fs)=>String(s).length*(fs||12)*.61,wSans=(s,fs)=>String(s).length*(fs||12)*.56;
  function t(x,y,s,o){o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+(o.fs||12)+'"'+(o.mono?' style="font-family:'+MONO+'"':'')+(o.al?' text-anchor="'+(o.al==='right'?'end':o.al==='mid'?'middle':'start')+'"':'')+
    ' fill="'+(o.c||'var(--ink)')+'"'+(o.b?' font-weight="600"':'')+(o.a!=null&&o.a<1?' opacity="'+o.a.toFixed(2)+'"':'')+'>'+esc(s)+'</text>'}
  // rows of FLGG.LAYOUT from top to bottom inside [x0, x0+w]; nodes of one row side by side
  function layout(rows,x0,w,y0,rh){const pos={};rows.forEach((r,i)=>r.forEach((nd,j)=>{if(nd)pos[nd]={x:x0+w*(j+.5)/r.length,y:y0+i*rh,cw:w/r.length}}));return pos}
  const NH=26;
  // a node: st 'idle'|'next'|'run'|'done'|'err'|'lost'; copies: parallel tasks of one node (Send), drawn as cards behind it
  function node(p,name,o){o=o||{};const st=o.st||'idle',a=st==='idle'?.6:1;
    if(isSE(name)){const lab=name==='__start__'?'START':'END',w=52,f=st==='done'?'var(--good)':name==='__start__'?'var(--c5)':'var(--mute)';
      return '<g opacity="'+a+'"><rect x="'+(p.x-w/2)+'" y="'+p.y+'" width="'+w+'" height="'+NH+'" rx="13" fill="'+f+'" fill-opacity=".18" stroke="'+f+'" stroke-width="1.3"/>'+t(p.x,p.y+17,lab,{al:'mid',b:1,c:'var(--ink)'})+'</g>'}
    const lab=o.text||name,w=Math.min(p.cw-8,Math.max(78,wMono(lab)+16));
    const F={run:['var(--c5)',.62],next:['var(--c5)',.1],done:['var(--acc)',.16],err:['var(--bad)',.55],lost:['var(--bad)',.12]}[st]||['var(--bg)',1];
    const S=st==='next'||st==='run'?'var(--c5)':st==='err'||st==='lost'?'var(--bad)':st==='done'?'var(--acc)':'var(--line)';
    const sw=st==='next'||st==='lost'||st==='err'?2.2:1.2,dash=st==='lost'?' stroke-dasharray="4 3"':'';
    let s='<g opacity="'+a+'">';for(let c=(o.copies||1)-1;c>=1;c--)s+='<rect x="'+(p.x-w/2+c*5)+'" y="'+(p.y-c*5)+'" width="'+w+'" height="'+NH+'" rx="6" fill="var(--card)" stroke="'+S+'" stroke-width="1.1"/>';
    s+='<rect x="'+(p.x-w/2)+'" y="'+p.y+'" width="'+w+'" height="'+NH+'" rx="6" fill="var(--card)"/><rect x="'+(p.x-w/2)+'" y="'+p.y+'" width="'+w+'" height="'+NH+'" rx="6" fill="'+F[0]+'" fill-opacity="'+F[1]+'" stroke="'+S+'" stroke-width="'+sw+'"'+dash+'/>';
    return s+t(p.x,p.y+17.5,lab,{al:'mid',mono:1,b:st==='run'||st==='next'||st==='err',c:st==='err'||st==='lost'?'var(--bad)':'var(--ink)'})+'</g>'}
  // a purple ring around a node that is calling the model (red and dashed when the call is lost)
  function ring(p,name,lost){const w=half(p,name)*2+8;return '<rect x="'+(p.x-w/2)+'" y="'+(p.y-4)+'" width="'+w+'" height="'+(NH+8)+'" rx="9" fill="none" stroke="'+(lost?'var(--bad)':'var(--c4)')+'" stroke-width="2"'+(lost?' stroke-dasharray="4 3"':'')+'/>'}
  const half=(p,n)=>isSE(n)?26:Math.min(p.cw-8,Math.max(78,wMono(n)+16))/2;
  // an edge: down from a to b, or a loop back up on the right; o.hi colours it (a trigger), o.cond dashes it
  function edge(a,b,o){o=o||{};if(!a||!b)return '';const c=o.hi?'var(--c5)':'var(--mute)',w=o.hi?2:1.3,dash=o.cond?' stroke-dasharray="5 4"':'',m=' marker-end="url(#'+o.mk+(o.hi?'a':'m')+')"';
    if(b.y>a.y)return '<path d="M'+a.x+','+(a.y+NH)+' C'+a.x+','+(a.y+NH+14)+' '+b.x+','+(b.y-14)+' '+b.x+','+(b.y-2)+'" fill="none" stroke="'+c+'" stroke-width="'+w+'"'+dash+m+'/>';
    const xa=a.x+half(a,o.s),xb=b.x+half(b,o.t),xr=Math.max(xa,xb)+26;
    return '<path d="M'+xa+','+(a.y+NH/2)+' C'+xr+','+(a.y+NH/2)+' '+xr+','+(b.y+NH/2)+' '+(xb+2)+','+(b.y+NH/2)+'" fill="none" stroke="'+c+'" stroke-width="'+w+'"'+dash+m+'/>'}
  // an arrow from p to q that draws itself as d goes 0 to 1 (the head appears at the end); bend: sideways offset of the curve
  function arrow(p,q,o){o=o||{};const d=o.d==null?1:o.d;if(d<=0)return '';const bx=o.bend||0,mx=(p[0]+q[0])/2+bx,my=o.up?Math.min(p[1],q[1])-o.up:(p[1]+q[1])/2;
    const path='M'+p[0].toFixed(1)+','+p[1].toFixed(1)+' Q'+mx.toFixed(1)+','+my.toFixed(1)+' '+q[0].toFixed(1)+','+q[1].toFixed(1);
    return '<path d="'+path+'" pathLength="1" stroke-dasharray="1" stroke-dashoffset="'+(1-d).toFixed(3)+'" fill="none" stroke="'+o.c+'" stroke-width="'+(o.w||1.8)+'"'+(d>.97?' marker-end="url(#'+o.mk+')"':'')+(o.a!=null?' opacity="'+o.a+'"':'')+'/>'}
  // arrowhead markers, one per colour; ids carry the figure's prefix
  function defs(id){const m=(k,c)=>'<marker id="'+id+k+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0L8,4L0,8z" fill="'+c+'"/></marker>';
    return '<defs>'+m('m','var(--mute)')+m('a','var(--c5)')+m('g','var(--c3)')+m('k','var(--acc)')+m('p','var(--c4)')+m('r','var(--bad)')+'</defs>'}
  // the checkpointer: saved checkpoints as slabs stacked upward from yb; the newest drops in with dr (0..1)
  function stack(x,yb,n,dr,o){o=o||{};const w=o.w||104,h=8,g=3;let s='';
    for(let i=0;i<n;i++){const last=i===n-1,y=yb-(i+1)*(h+g)-(last&&dr<1?(1-dr)*14:0),a=last&&dr<1?dr:1;
      s+='<rect x="'+x+'" y="'+y.toFixed(1)+'" width="'+w+'" height="'+h+'" rx="2" fill="var(--acc)" fill-opacity="'+(last&&o.hiLast?.75:.35)+'" stroke="var(--acc)" stroke-width=".8" opacity="'+a.toFixed(2)+'"/>'}
    return s}
  // a chip: a short labelled box (a pending write, an interrupt)
  function chip(x,y,s,c,o){o=o||{};const w=o.w||wMono(s)+14;return '<g'+(o.a!=null&&o.a<1?' opacity="'+o.a.toFixed(2)+'"':'')+'><rect x="'+x+'" y="'+y+'" width="'+w+'" height="20" rx="5" fill="'+c+'" fill-opacity=".16" stroke="'+c+'" stroke-width="1.2"/>'+t(x+7,y+14,s,{mono:1,c:c,b:1})+'</g>'}
  // the per-step tween: when the reader or autoplay steps forward, render(k, e) runs with e from 0 to 1 over dur ms; back, the scrubber and reduced motion draw the end state
  function tween(card,dur,render){let raf=0;return k=>{cancelAnimationFrame(raf);const host=document.getElementById(card);
    if(!host.classList.contains('rd-fwd')||RD.RM){render(k,1);return}
    const t0=performance.now(),f=now=>{const e=Math.min(1,(now-t0)/dur);render(k,e);if(e<1)raf=requestAnimationFrame(f)};render(k,0);raf=requestAnimationFrame(f)}}
  return {ring,esc,isSE,cl,ph,t,wMono,wSans,layout,node,edge,arrow,defs,stack,chip,tween,NH,half};
})();

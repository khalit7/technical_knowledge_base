// ---- Reading tab: static figures (what contains what, x402 sequence) and the clickable state-graph helper; the hero and AP2 are 3D stages (30_js_sc_hero.js, 33_js_sc_ap2.js) ----
// Every figure is drawn at the measured width of its container (RD.width) and redrawn on resize; labels on the figure, 11 px or more.
window.RDF=(function(){
  const esc=RD.esc;
  const GATE='var(--c2)';
  // text lines inside a box: [{s, w (weight), c (colour), fs}]
  function box(x,y,w,h,o){o=o||{};let b='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.3)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
    let ty=y+(o.top||17);(o.lines||[]).forEach(l=>{b+=RD.t(x+(o.center?w/2:9),ty,esc(l.s),{a:o.center?'middle':null,fs:l.fs||11,w:l.w,fill:l.c});ty+=(l.fs||11)+4});return b}
  function arrowHead(x1,y1,x2,y2,col){const a=Math.atan2(y2-y1,x2-x1),L=7,s=.45;
    return '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-s))+' '+(y2-L*Math.sin(a-s))+' L'+(x2-L*Math.cos(a+s))+' '+(y2-L*Math.sin(a+s))+' Z" fill="'+col+'"/>'}
  function line(x1,y1,x2,y2,o){o=o||{};const c=o.c||'var(--mute)';let b='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
    if(o.end!==false)b+=arrowHead(x1,y1,x2,y2,c);if(o.both)b+=arrowHead(x2,y2,x1,y1,c);return b}
  // clip a centre-to-centre segment to the borders of two w x h boxes
  function clip(ax,ay,bx,by,hw,hh){const dx=bx-ax,dy=by-ay;const t=Math.min(dx?hw/Math.abs(dx):1e9,dy?hh/Math.abs(dy):1e9);return [ax+dx*t,ay+dy*t]}
  // ---------- what contains what ----------
  function nest(){const el=document.getElementById('rd-nest');if(!el)return;const W=RD.width(el);let b='';
    const narrow=W<600;
    b+=box(0,0,W,narrow?352:206,{lines:[{s:'Context  contextId',w:600,fs:12.5},{s:narrow?'one conversation':'one conversation; the server may keep model context per contextId',c:'var(--mute)'}]});
    const t1x=12,t1y=44,t1w=narrow?W-24:W*.64,t1h=150;
    b+=box(t1x,t1y,t1w,t1h,{fill:'var(--bg)',stroke:'var(--acc)',sw:2,lines:[{s:'Task  id (server-made)',w:600,fs:12.5}]});
    const iw=narrow?t1w-20:(t1w-40)/3,ix=i=>narrow?t1x+10:t1x+10+i*(iw+10),iy=i=>narrow?t1y+28+i*0:t1y+30;
    const inner=[['status',['state (one of 8)','message, timestamp']],['history',['messages: role,','parts, messageId']],['artifacts',['artifactId, name,','parts (may stream)']]];
    if(!narrow){inner.forEach((q,i)=>{b+=box(ix(i),iy(i),iw,58,{lines:[{s:q[0],w:600}].concat(q[1].map(s=>({s,c:'var(--mute)'})))})});
      b+=box(t1x+10,t1y+100,t1w-20,38,{lines:[{s:'parts: exactly one of  text | raw | url | data',w:600},{s:'plus optional mediaType, filename',c:'var(--mute)'}]});
      const t2x=t1x+t1w+12,t2w=W-t2x-12;
      b+=box(t2x,t1y,t2w,t1h,{fill:'var(--bg)',dash:true,lines:[{s:'A later task',w:600,fs:12.5},{s:'same contextId,',c:'var(--mute)'},{s:'new id: started by a',c:'var(--mute)'},{s:'message with a',c:'var(--mute)'},{s:'contextId and no',c:'var(--mute)'},{s:'taskId',c:'var(--mute)'}]})}
    else{let y=t1y+28;inner.forEach(q=>{b+=box(t1x+10,y,t1w-20,36,{lines:[{s:q[0]+': '+q[1].join(' '),w:400}]});y+=42});
      b+=box(t1x+10,y,t1w-20,36,{lines:[{s:'parts: text | raw | url | data',w:600}]});
      b=b.replace('height="'+t1h+'"','height="'+(y+44-t1y)+'"');
      const t2y=y+56;b+=box(t1x,t2y,t1w,58,{fill:'var(--bg)',dash:true,lines:[{s:'A later task, same contextId',w:600,fs:12.5},{s:'started by a message with a contextId',c:'var(--mute)'},{s:'and no taskId',c:'var(--mute)'}]})}
    el.innerHTML=RD.svg(W,narrow?360:212,b,'A context contains tasks; a task contains status, history and artifacts; messages and artifacts contain parts')}
  // ---------- clickable state graph ----------
  // o: {el, nodes: {id: {label, col, layouts: {wide: [x, row], narrow: [x, row]}}}, edges: [[a, b, {both, label, narrowOff}]], bands, sel, onPick}
  function graph(o){const el=document.getElementById(o.el);if(!el)return;const W=RD.width(el),narrow=W<560,L=narrow?'narrow':'wide';
    const rowH=72,bh=30,top=26,bw=narrow?Math.min(180,(W-24)/2-6):Math.min(190,W*.22);
    const pos={};Object.keys(o.nodes).forEach(k=>{const p=o.nodes[k][L];if(p)pos[k]=[p[0]*W,top+p[1]*rowH+bh/2]});
    const rows=Math.max(...Object.values(pos).map(p=>(p[1]-top-bh/2)/rowH))+1;let b='';
    (o.bands||[]).forEach(bd=>{const r=bd[L];if(!r)return;const y=top+r[0]*rowH-22,h=(r[1]-r[0]+1)*rowH-6;
      b+='<rect x="0" y="'+y+'" width="'+W+'" height="'+h+'" rx="6" fill="'+(bd.fill||'var(--soft)')+'" opacity=".7"/>'+RD.t(6,y+14,esc(bd.label),{fs:11,w:600,fill:bd.c||'var(--mute)'})});
    o.edges.forEach(e=>{const a=pos[e[0]],c=pos[e[1]],x=e[2]||{};if(!a||!c||(narrow&&x.wideOnly))return;
      const p1=clip(a[0],a[1],c[0],c[1],bw/2+2,bh/2+2),p2=clip(c[0],c[1],a[0],a[1],bw/2+2,bh/2+2);
      b+=line(p1[0],p1[1],p2[0],p2[1],{both:x.both,c:x.c,dash:x.dash});
      const lp=narrow&&x.n?x.n:x;if(x.label)b+=RD.t((p1[0]+p2[0])/2+(lp.dx||6),(p1[1]+p2[1])/2+(lp.dy||4),esc(x.label),{fs:11,fill:x.c||'var(--mute)',a:lp.a})});
    Object.keys(pos).forEach(k=>{const n=o.nodes[k],p=pos[k],on=k===o.sel;
      b+='<g class="gnode" data-id="'+k+'" style="cursor:pointer" tabindex="0" role="button" aria-label="'+esc(n.label)+'"><rect x="'+(p[0]-bw/2)+'" y="'+(p[1]-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="15" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+n.col+'" stroke-width="'+(on?3:1.8)+'"/>'+
        RD.t(p[0],p[1]+4,esc(n.label),{a:'middle',fs:11.5,w:on?700:500})+'</g>'});
    el.innerHTML=RD.svg(W,top+rows*rowH-6,b,o.title||'State diagram');
    if(!el.dataset.bound){el.dataset.bound=1;const pick=t=>{const g=t.closest&&t.closest('.gnode');if(g)o.onPick(g.dataset.id)};
      el.addEventListener('click',e=>pick(e.target));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e.target)}})}}
  // ---------- x402 sequence ----------
  function x402(){const el=document.getElementById('rd-x402');if(!el)return;const W=RD.width(el),narrow=W<560;
    const X=narrow?[W*.08,W*.6,W*.93]:[W*.1,W*.55,W*.9],names=narrow?['Agent','Server','Facilitator']:['Agent (client)','Resource server','Facilitator'];
    const M=[[0,1,narrow?'GET /premium-data':'GET /premium-data (no payment)'],[1,0,narrow?'402, PAYMENT-REQUIRED':'402 + PAYMENT-REQUIRED: price, payTo, network',1],
      [0,1,narrow?'retry, PAYMENT-SIGNATURE':'retry + PAYMENT-SIGNATURE: signed authorization',2],[1,2,'POST /verify'],[2,1,'valid'],[1,1,narrow?'does the work':'does the work'],
      [1,2,'POST /settle'],[2,1,'settled'],[1,0,narrow?'200, PAYMENT-RESPONSE':'200 + PAYMENT-RESPONSE: receipt']];
    const rh=34,y0=40,H=y0+M.length*rh+30;let b='';
    names.forEach((n,i)=>{b+=RD.t(i===0?Math.max(0,X[i]-30):i===2?W-2:X[i],16,n,{a:i===0?null:i===2?'end':'middle',fs:12,w:600});b+='<line x1="'+X[i]+'" y1="24" x2="'+X[i]+'" y2="'+(H-6)+'" stroke="var(--line)" stroke-width="2"/>'});
    M.forEach((m,j)=>{const y=y0+j*rh+16,x1=X[m[0]],x2=X[m[1]];
      if(m[0]===m[1]){b+='<rect x="'+(x1-(narrow?78:60))+'" y="'+(y-12)+'" width="'+(narrow?72:120)+'" height="20" rx="5" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x1-(narrow?42:0),y+2,m[2],{a:'middle',fs:11});return}
      const c=m[3]===2?GATE:m[3]===1?'var(--c5)':'var(--mute)';
      b+=line(x1+(x2>x1?2:-2),y,x2+(x2>x1?-3:3),y,{c,sw:m[3]?2:1.5});
      b+=RD.t((x1+x2)/2,y-6,m[2],{a:'middle',fs:11,w:m[3]?600:400,fill:m[3]===2?GATE:null})});
    b+=RD.t(X[0]+4,H-8,narrow?'orange: the wallet key signs':'orange: the wallet key signs; any spending cap is the client\'s own',{fs:11,fill:GATE});
    el.innerHTML=RD.svg(W,H,b,'x402: request, 402 with price, retry with signed payment, facilitator verifies and settles, 200 with receipt')}
  function all(){nest();x402()}
  RD.onRender(all);RD.onResize(all);all();
  return {graph,GATE};
})();

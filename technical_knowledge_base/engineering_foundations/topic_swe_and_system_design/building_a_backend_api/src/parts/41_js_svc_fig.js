// ---- Reading: the service figure (hero, reused by the stepper of section 2 and the handler stepper of section 10) and the onion of section 4 ----
window.SVCF=(function(){
  const esc=RD.esc;
  const S=[['srv','uvicorn: accept, parse the HTTP bytes','2'],['mw','middleware, on the way in','4'],['route','router: method + path to a function','2'],
    ['dep','dependencies: who is calling, DB session','4'],['val','validation: body to a pydantic model','3'],['h','handler: rules, queries, model call','5, 10'],
    ['out','response, back out through middleware','2']];
  const R=[['pool','database pool: 5 + 10 per process','5'],['model','model client: async, with a timeout','6, 10'],['bg','hand-off: BackgroundTasks or a queue','8'],
    ['loop','shared: 1 event loop + 40 threads','6'],['cfg','settings: read once at startup','7']];
  const L=[['up','startup: lifespan opens the pool'],['serve','serving: /livez, /readyz'],['term','SIGTERM: stop accepting, drain'],['down','lifespan closes the pool; exit']];
  function box(x,y,w,h,label,sec,on,dash){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      RD.t(x+8,y+h/2+4,esc(label),{fs:12,fill:'var(--ink)',w:on?600:400})+(sec?RD.t(x+w-6,y+h/2+4,'§'+sec,{fs:11,fill:'var(--mute)',a:'end'}):'');
  }
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#svcar)"/>';
  function draw(el,hi,opt){
    opt=opt||{res:true,life:true};hi=new Set(hi||[]);const W=RD.width(el),wide=W>=620,bh=26,g=9;let b='<defs><marker id="svcar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    const pad=10,top=30;const wide2=wide&&opt.res;const lw=wide2?Math.round(W*0.55)-pad:W-2*pad;let y=top;
    b+=RD.t(pad+4,13,'one worker process',{fs:11,fill:'var(--mute)',w:600});
    const sy={};
    S.forEach((s,i)=>{sy[s[0]]=y;b+=box(pad+8,y,lw-16,bh,s[1],s[2],hi.has(s[0]));if(i<S.length-1)b+=arrow(pad+30,y+bh,pad+30,y+bh+g-1);y+=bh+g});
    let ry=y,rend=y;if(opt.res){const rx=wide?Math.round(W*0.55)+14:pad+8,rw=wide?W-rx-pad-8:lw-16;
    if(wide){ry=top}else{ry=y+8;b+=RD.t(pad+8,ry-2,'what the handler borrows, and what the process shares',{fs:11,fill:'var(--mute)'});ry+=6}
    R.forEach((r,i)=>{const yy=ry+i*(bh+g)+(wide&&i>=3?14:0);if(wide&&i===3)b+=RD.t(rx,yy-4,'shared by every request',{fs:11,fill:'var(--mute)'});
      b+=box(rx,yy,rw,bh,r[1],r[2],hi.has(r[0]),i<3);
      if(wide&&i<3)b+='<line x1="'+(pad+lw-8)+'" y1="'+(sy.h+bh/2)+'" x2="'+rx+'" y2="'+(yy+bh/2)+'" stroke="var(--line)" stroke-dasharray="3 3"/>'});
    rend=wide?Math.max(y,ry+R.length*(bh+g)+14):ry+R.length*(bh+g);}
    b+='<rect x="'+pad+'" y="20" width="'+(W-2*pad)+'" height="'+(rend-20)+'" rx="10" fill="none" stroke="var(--line)"/>';
    let H=rend+4;if(opt.life){let ly=rend+16;b+=RD.t(pad,ly-4,"the process's own life (section 9)",{fs:11,fill:'var(--mute)'});
    const cols=wide?4:(W>=520?2:1),cw=(W-2*pad-(cols-1)*8)/cols;
    L.forEach((l,i)=>{const c=i%cols,r=Math.floor(i/cols);b+=box(pad+c*(cw+8),ly+r*(bh+6),cw,bh,l[1],'',hi.has(l[0]))});
    H=ly+Math.ceil(L.length/cols)*(bh+6)+4}
    el.innerHTML=RD.svg(W,H,b,'Diagram of one request passing seven stages inside a worker process, the resources it borrows, and the process life cycle');
  }
  function auto(id,hi){const el=document.getElementById(id);if(!el)return;const f=()=>draw(el,hi);f();RD.onRender(f);RD.onResize(f)}
  return {draw,auto,S,R,L};
})();
SVCF.auto('rd-hero-svg',[]);
(function(){
  const el=document.getElementById('rd-onion-svg');if(!el)return;const esc=RD.esc;
  const rings=[['middleware added second (registered last): enters 1st, leaves 6th','added last: in 1st, out 6th','var(--c1)'],['middleware added first: enters 2nd, leaves 5th','added first: in 2nd, out 5th','var(--c2)'],
    ['router: picks the route; 404 or 405 if none','router: 404 or 405 if none','var(--c4)'],['dependency current_user: 3rd, only for routes that ask','dependency: 3rd','var(--c5)'],['handler: 4th, the route itself','handler: 4th','var(--acc)']];
  function draw(){const W=RD.width(el),nar=W<560,step=nar?10:18,lh=24;let b='';const n=rings.length;const H=2*(n-1)*(lh+4)+lh+10;
    rings.forEach((r,i)=>{const x=i*step,y=i*(lh+4),w=W-2*i*step,h=H-2*i*(lh+4)-2;
      b+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(w-2)+'" height="'+Math.max(lh,h)+'" rx="8" fill="'+(i===n-1?'var(--acc2)':'none')+'" stroke="'+r[2]+'" stroke-width="1.6"/>'+RD.t(x+10,y+17,esc(nar?r[1]:r[0]),{fs:12,fill:'var(--ink)'})});
    el.innerHTML=RD.svg(W,H+2,b,'Nested boxes: the middleware registered last wraps the one registered first, which wraps the router, the dependency and the handler')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();

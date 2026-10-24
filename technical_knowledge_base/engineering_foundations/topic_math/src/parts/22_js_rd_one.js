// ---- Reading tab: the tiny model (computed once) and the hero: the training step, each box linked to the child page that owns it ----
window.RDM=(function(){
  const V=['cat','dog','sat'],x=[2,1],W=[[1,0],[0,1],[1,-2]],Y=2;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const mv=(M,v)=>M.map(r=>dot(r,v));
  const softmax=(z,T)=>{T=T||1;const m=Math.max(...z),e=z.map(v=>Math.exp((v-m)/T)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const loss=z=>-Math.log(softmax(z)[Y]);
  function step(Wm,eta){const z=mv(Wm,x),p=softmax(z),g=p.map((v,i)=>v-(i===Y?1:0));
    const gW=g.map(gi=>x.map(xj=>gi*xj));const W2=Wm.map((r,i)=>r.map((v,j)=>v-eta*gW[i][j]));
    return {z,p,g,gW,W2,L:-Math.log(p[Y])}}
  const f=(v,d)=>{d=d==null?3:d;const s=(Math.abs(v)<0.5*Math.pow(10,-d)?0:v).toFixed(d);return s.replace('-','−')};
  const vec=(a,d)=>'('+a.map(v=>f(v,d)).join(', ')+')';
  return {V,x,W,Y,dot,mv,softmax,loss,step,f,vec};
})();
(function(){
  const el=document.getElementById('rd-one-svg');if(!el)return;
  const M=RDM,s0=M.step(M.W,0.1),s1=M.step(s0.W2,0);
  const N='https://app.notion.com/p/';
  const boxes=[
    {c:'var(--c1)',a:'Linear algebra',t:'Input vector',v:'x = (2, 1)',o:'Linear algebra, section 1',h:N+'3c65c17b0d0d81d89c26e1dab2fcb701#rd-vec'},
    {c:'var(--c1)',a:'Linear algebra',t:'Weights times input',v:'z = Wx = (2, 1, 0)',o:'Linear algebra, section 3',h:N+'3c65c17b0d0d81d89c26e1dab2fcb701#rd-mul'},
    {c:'var(--c2)',a:'Probability',t:'Softmax: the bet',v:'p = '+M.vec(s0.p),o:'Probability, sections 6 and 7',h:N+'3c65c17b0d0d815f9a47d613409b5a0c#rd-s6'},
    {c:'var(--c4)',a:'Information',t:'Loss on the truth (sat)',v:'L = −ln 0.090 = '+M.f(s0.L)+' nats = '+M.f(s0.L/Math.LN2)+' bits',o:'Information theory, sections 1 and 3',h:N+'3c65c17b0d0d81c6baf3f778a62e14e5#it-s1'},
    {c:'var(--c3)',a:'Calculus',t:'Gradient',v:'p − y = '+M.vec(s0.g)+'; ∇W = (p − y) xᵀ',o:'Matrix calculus, section 5',h:N+'3f05c17b0d0d817e9892e01088179c93#mc-s5'},
    {c:'var(--c5)',a:'Optimisation',t:'Step, learning rate 0.1',v:'new p(sat) = '+M.f(s1.p[2])+', loss '+M.f(s1.L),o:'Calculus and optimisation, section 4',h:N+'3c65c17b0d0d81eb8b49ed6a0f897f3b#rd-gd'},
    {c:'var(--c6)',a:'Statistics',t:'Was it real?',v:'average change on held-out sentences ± 1.96 s/√n',o:'Statistics, sections 5 and 7',h:N+'3f05c17b0d0d810f896cf688ce9aed1b#rd-s5'}];
  const bands=[
    {c:'var(--mute)',t:'Under every box: floating point, rounding, overflow',o:'Numerical computing',h:N+'3f05c17b0d0d81d6af0be4a9a2edba8d#rd-soft'},
    {c:'var(--mute)',t:'Where they all meet: the ELBO of a hidden cause',o:'Variational inference',h:N+'3f05c17b0d0d81aa9857eb5fa1bac530#vi-s3'}];
  function draw(){
    const Wd=RD.width(el),wide=Wd>=640;
    const cols=wide?4:1,g=wide?22:0,bw=wide?(Wd-(cols-1)*g)/cols:Math.min(Wd,420),bh=wide?100:90,vg=wide?34:22;
    const rows=Math.ceil(boxes.length/cols),bandH=wide?30:44,bandTop=rows*bh+(rows-1)*vg+18,H=bandTop+bands.length*(bandH+8)+4,ox=wide?0:(Wd-bw)/2;
    const T=RD.t,esc=RD.esc;let s='';
    const pos=boxes.map((b,i)=>{let r=Math.floor(i/cols),c=i%cols;if(wide&&r%2===1)c=cols-1-c;return {x:ox+c*(bw+g),y:4+r*(bh+vg)}});
    // arrows first
    for(let i=0;i<boxes.length-1;i++){const a=pos[i],b=pos[i+1];let x1,y1,x2,y2;
      if(Math.abs(a.y-b.y)<1){const dir=b.x>a.x?1:-1;x1=dir>0?a.x+bw:a.x;x2=dir>0?b.x:b.x+bw;y1=y2=a.y+bh/2}
      else{x1=x2=a.x+bw/2;y1=a.y+bh;y2=b.y}
      const ang=Math.atan2(y2-y1,x2-x1),k=6;
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4"/>'+
        '<path d="M'+x2+','+y2+' L'+(x2-k*Math.cos(ang-0.45))+','+(y2-k*Math.sin(ang-0.45))+' L'+(x2-k*Math.cos(ang+0.45))+','+(y2-k*Math.sin(ang+0.45))+' z" fill="var(--mute)"/>'}
    boxes.forEach((b,i)=>{const p=pos[i];
      s+='<a href="'+b.h+'"><rect x="'+p.x+'" y="'+p.y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="'+b.c+'" stroke-width="1.8"/>'+
        '<rect x="'+p.x+'" y="'+p.y+'" width="6" height="'+bh+'" rx="3" fill="'+b.c+'"/>'+
        T(p.x+14,p.y+17,esc(b.a.toUpperCase()),{fs:10,fill:b.c,w:600})+
        T(p.x+14,p.y+35,(i+1)+'. '+esc(b.t),{fs:13,w:600})+T(p.x+bw-8,p.y+bh-8,esc('→ '+b.o),{fs:10,fill:b.c,a:'end'});
      // wrap the value line to the box width
      const words=b.v.split(' '),lines=[];let cur='';const maxc=Math.max(18,Math.floor((bw-22)/6.4));
      words.forEach(w=>{if((cur+' '+w).trim().length>maxc){lines.push(cur.trim());cur=w}else cur+=' '+w});if(cur.trim())lines.push(cur.trim());
      lines.slice(0,wide?2:2).forEach((ln,j)=>{s+=T(p.x+14,p.y+53+j*15,esc(ln),{fs:11.5,fill:'var(--mute)'})});
      s+='</a>'});
    bands.forEach((b,i)=>{const y=bandTop+i*(bandH+8),x0=wide?0:ox,w=wide?Wd:bw;
      s+='<a href="'+b.h+'"><rect x="'+x0+'" y="'+y+'" width="'+w+'" height="'+bandH+'" rx="6" fill="none" stroke="var(--line)" stroke-dasharray="4 3"/>';
      if(wide)s+=T(x0+12,y+19,esc(b.t),{fs:12})+T(x0+w-10,y+19,esc('→ '+b.o),{fs:11,fill:'var(--acc)',a:'end'});
      else s+=T(x0+10,y+17,esc(b.t),{fs:11.5})+T(x0+10,y+34,esc('→ '+b.o),{fs:10.5,fill:'var(--acc)'});
      s+='</a>'});
    el.innerHTML=RD.svg(Wd,H,s,'The training step as seven boxes, each linked to the child page that owns its maths: input vector, scores, softmax, loss, gradient, step, and the statistics check; floating point under all of them and variational inference where they meet');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();

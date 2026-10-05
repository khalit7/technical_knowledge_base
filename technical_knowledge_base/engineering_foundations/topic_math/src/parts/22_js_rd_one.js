// ---- Reading tab: the tiny model, computed once and shared by every Reading animation; and the "one screen" picture ----
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
  const boxes=[
    {c:'var(--c1)',a:'Linear algebra',t:'Input vector',v:'x = (2, 1)',h:'#rd-s1'},
    {c:'var(--c1)',a:'Linear algebra',t:'Weights times input',v:'z = Wx = (2, 1, 0)',h:'#rd-s1'},
    {c:'var(--c2)',a:'Probability',t:'Softmax: the bet',v:'p = '+M.vec(s0.p),h:'#rd-s2'},
    {c:'var(--c4)',a:'Probability + information',t:'Loss on the truth (sat)',v:'L = −ln 0.090 = '+M.f(s0.L)+' nats = '+M.f(s0.L/Math.LN2)+' bits',h:'#rd-s3'},
    {c:'var(--c3)',a:'Derivatives',t:'Gradient',v:'p − y = '+M.vec(s0.g)+'; ∇W = (p − y) xᵀ',h:'#rd-s4'},
    {c:'var(--c5)',a:'Optimisation',t:'Step, learning rate 0.1',v:'new p(sat) = '+M.f(s1.p[2])+', loss '+M.f(s1.L),h:'#rd-s5'},
    {c:'var(--c6)',a:'Statistics',t:'Was it real?',v:'average change on held-out sentences ± 1.96 s/√n',h:'#rd-s6'}];
  function draw(){
    const Wd=RD.width(el),wide=Wd>=640;
    const cols=wide?4:1,g=wide?22:0,bw=wide?(Wd-(cols-1)*g)/cols:Math.min(Wd,420),bh=wide?96:74,vg=wide?34:22;
    const rows=Math.ceil(boxes.length/cols),H=rows*bh+(rows-1)*vg+8,ox=wide?0:(Wd-bw)/2;
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
        T(p.x+14,p.y+35,(i+1)+'. '+esc(b.t),{fs:13,w:600});
      // wrap the value line to the box width
      const words=b.v.split(' '),lines=[];let cur='';const maxc=Math.max(18,Math.floor((bw-22)/6.4));
      words.forEach(w=>{if((cur+' '+w).trim().length>maxc){lines.push(cur.trim());cur=w}else cur+=' '+w});if(cur.trim())lines.push(cur.trim());
      lines.slice(0,wide?3:2).forEach((ln,j)=>{s+=T(p.x+14,p.y+53+j*15,esc(ln),{fs:11.5,fill:'var(--mute)'})});
      s+='</a>'});
    el.innerHTML=RD.svg(Wd,H,s,'The training step as seven boxes: input vector, scores, softmax, loss, gradient, step, and the statistics check');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();

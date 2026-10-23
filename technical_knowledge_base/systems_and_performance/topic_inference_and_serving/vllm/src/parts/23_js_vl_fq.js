// ---- Reading, section 3: the free queue as the eviction policy (static annotated diagram; structure from block_pool.py at v0.31.0) ----
(function(){
  const el=document.getElementById('vl-fq');if(!el)return;
  function arrow(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,hx=x2-ux*7,hy=y2-uy*7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+hx+'" y2="'+hy+'" class="ar"></line><path d="M'+x2+' '+y2+' L'+(hx-uy*4)+' '+(hy+ux*4)+' L'+(hx+uy*4)+' '+(hy-ux*4)+' Z" style="fill:var(--mute)"></path>'}
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fs:11.5},o||{}));
  function draw(){const W=RD.width(el),w=Math.min(W,640),ox=(W-w)/2,n=8,m=4,gap=4,tailW=26,s=Math.min(52,(w-2*m-tailW-(n-1)*gap)/n);
    const rowW=n*s+(n-1)*gap,x0=Math.max(m,(w-rowW-tailW)/2),y0=50,lb=['no hash','no hash','cached','cached','cached','cached','cached','cached'];
    let b='';const X=i=>x0+i*(s+gap);
    for(let i=0;i<n;i++){const h=i>=2;b+='<rect x="'+X(i)+'" y="'+y0+'" width="'+s+'" height="'+s+'" rx="5" class="'+(h?'bx':'bxh')+'"'+(h?' style="stroke:var(--acc);stroke-width:2;stroke-dasharray:4 3"':'')+'></rect>';
      if(s>=40)b+=T(X(i)+s/2,y0+s/2+4,lb[i],{a:'middle',fs:11,fill:h?'var(--acc)':'var(--mute)'});}
    const tx=X(n-1)+s+8;b+=T(tx,y0+s/2+4,'…',{fill:'var(--mute)'});
    b+=T(x0,y0+s+15,'head',{fs:11,fill:'var(--mute)'})+T(X(n-1)+s,y0+s+15,'tail',{fs:11,fill:'var(--mute)',a:'end'});
    // above: allocate (left), free hashed (right)
    b+=T(x0,13,'allocate: pop the head;',{w:600})+T(x0,28,'a hashed block here is evicted',{});
    b+=arrow(x0+s/2,32,x0+s/2,y0-3);
    b+=T(w-m,13,'free, hashed:',{a:'end',w:600})+T(w-m,28,'append at the tail',{a:'end'});
    b+=arrow(tx+6,32,X(n-1)+s+3,y0+4);
    // below: free no hash (left), touch (right)
    const yb=y0+s+44;
    b+=arrow(x0+s*0.75,yb-12,x0+s*0.75,y0+s+3)+T(x0,yb+2,'free, no hash:',{w:600})+T(x0,yb+17,'push at the front',{});
    const ti=5;b+=arrow(X(ti)+s/2,yb-12,X(ti)+s/2,y0+s+3)+T(w-m,yb+2,'touch (a cache hit):',{a:'end',w:600})+T(w-m,yb+17,'unlink from the middle',{a:'end'});
    el.innerHTML=RD.svg(W,yb+24,'<g transform="translate('+ox+',0)">'+b+'</g>','free queue: allocate pops the head, freed hashed blocks go to the tail, freed unhashed blocks to the front, a cache hit unlinks a block from the middle');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

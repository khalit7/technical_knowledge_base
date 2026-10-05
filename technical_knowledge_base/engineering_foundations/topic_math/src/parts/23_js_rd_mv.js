// ---- Reading tab, section 1: the weight matrix turning the input into scores, row by row (animation) ----
(function(){
  const el=document.getElementById('rd-mv-svg');if(!el)return;
  const M=RDM,T=RD.t,cols=['var(--c1)','var(--c4)','var(--c2)'];
  const z=M.mv(M.W,M.x),nx=Math.hypot(...M.x);
  const cos=M.W.map(r=>M.dot(r,M.x)/(Math.hypot(...r)*nx));
  const caps=[
    ['The input and the three rows','The black arrow is the input “the cat”, x = (2, 1). The coloured arrows are the rows of W, one per word. Each score will be the dot product of the input with one row.'],
    ['Row 1: cat','(1, 0) · (2, 1) = 1×2 + 0×1 = 2. The cat arrow points nearly the same way as the input (cosine '+M.f(cos[0])+'), so its score is high.'],
    ['Row 2: dog','(0, 1) · (2, 1) = 0×2 + 1×1 = 1. A wider angle (cosine '+M.f(cos[1])+'), a smaller score.'],
    ['Row 3: sat','(1, −2) · (2, 1) = 1×2 + (−2)×1 = 0. The sat arrow is at a right angle to the input (cosine '+M.f(cos[2])+'), so its score is 0: the model sees no match.'],
    ['All three: z = Wx = (2, 1, 0)','Shapes: a 3×2 matrix times a 2-entry vector gives a 3-entry vector, one score per word. The right word, sat, has the lowest score; training will have to turn the sat arrow towards the input.']];
  let cur=0;
  function arrow(x1,y1,x2,y2,col,w,dash){const a=Math.atan2(y2-y1,x2-x1),k=8;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-4*Math.cos(a))+'" y2="'+(y2-4*Math.sin(a))+'" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<path d="M'+x2+','+y2+' L'+(x2-k*Math.cos(a-0.4))+','+(y2-k*Math.sin(a-0.4))+' L'+(x2-k*Math.cos(a+0.4))+','+(y2-k*Math.sin(a+0.4))+' z" fill="'+col+'"/>'}
  function draw(i){cur=i;
    const Wd=RD.width(el),wide=Wd>=600;
    const pw=wide?Math.min(330,Wd*0.45):Math.min(Wd,330),ph=pw*0.9;
    const tw=wide?Wd-pw-20:Wd,tx=wide?pw+20:0,ty=wide?0:ph+12,th=150;
    const H=wide?Math.max(ph,th):ph+12+th;
    // plane: x in [-1.2, 3], y in [-2.4, 1.8]
    const X0=-1.2,X1=3,Y0=-2.4,Y1=1.8,sc=Math.min(pw/(X1-X0),ph/(Y1-Y0)),ox=(wide?0:(Wd-pw)/2)-X0*sc,oy=Y1*sc;
    const P=(a,b)=>[ox+a*sc,oy-b*sc];
    let s='';
    for(let g=-1;g<=3;g++){const [a]=P(g,0);s+='<line x1="'+a+'" y1="'+P(0,Y1)[1]+'" x2="'+a+'" y2="'+P(0,Y0)[1]+'" stroke="var(--line)"/>'}
    for(let g=-2;g<=1;g++){const [,b]=P(0,g);s+='<line x1="'+P(X0,0)[0]+'" y1="'+b+'" x2="'+P(X1,0)[0]+'" y2="'+b+'" stroke="var(--line)"/>'}
    s+='<line x1="'+P(X0,0)[0]+'" y1="'+P(0,0)[1]+'" x2="'+P(X1,0)[0]+'" y2="'+P(0,0)[1]+'" stroke="var(--mute)"/><line x1="'+P(0,0)[0]+'" y1="'+P(0,Y0)[1]+'" x2="'+P(0,0)[0]+'" y2="'+P(0,Y1)[1]+'" stroke="var(--mute)"/>';
    const O=P(0,0);
    M.W.forEach((r,k)=>{const on=i===0||i===4||i===k+1,E=P(r[0],r[1]);
      s+='<g opacity="'+(on?1:0.25)+'">'+arrow(O[0],O[1],E[0],E[1],cols[k],on&&i===k+1?3:2)+
        T(E[0]+(r[0]>=0.5?6:-6),E[1]+(r[1]>0?-4:14),M.V[k]+' ('+r.join(', ').replace('-','−')+')',{a:r[0]>=0.5?'start':'end',fs:11.5,fill:cols[k],w:600})+'</g>';
      if(i===k+1){// projection of x onto the row direction
        const L=Math.hypot(...r),u=[r[0]/L,r[1]/L],t=M.dot(M.x,u),F=P(u[0]*t,u[1]*t),Xe=P(M.x[0],M.x[1]);
        s+='<line x1="'+Xe[0]+'" y1="'+Xe[1]+'" x2="'+F[0]+'" y2="'+F[1]+'" stroke="'+cols[k]+'" stroke-dasharray="3 3"/>';}
    });
    const XE=P(M.x[0],M.x[1]);s+=arrow(O[0],O[1],XE[0],XE[1],'var(--ink)',3)+T(XE[0]+6,XE[1]-4,'x = (2, 1)',{fs:12,w:600});
    // the computation, row by row
    const lx=tx+(wide?0:Math.max(0,(Wd-330)/2));let ly=ty+18;
    s+=T(lx,ly,'z = W x, one dot product per row',{fs:12.5,w:600});ly+=24;
    M.W.forEach((r,k)=>{const done=i===4||i>k,on=i===k+1||i===4;
      const txt=M.V[k]+': ('+r.join(', ')+') · (2, 1) = '+r[0]+'×2 + '+(r[1]<0?'('+r[1]+')':r[1])+'×1';
      s+='<g opacity="'+(done||on?1:0.35)+'">'+T(lx,ly,txt.replace(/-/g,'−'),{fs:12,fill:on?cols[k]:'var(--ink)',w:on?600:400})+
        T(lx+Math.min(tw-30,300),ly,done?'= '+z[k]:'= ?',{fs:13,w:600,fill:cols[k],a:'end'})+'</g>';ly+=24});
    s+=T(lx,ly+6,'shape: (3 × 2) times (2) gives (3)',{fs:11.5,fill:'var(--mute)'});
    if(i===4)s+=T(lx,ly+28,'z = (2, 1, 0): cat 2, dog 1, sat 0',{fs:12.5,w:600});
    el.innerHTML=RD.svg(Wd,H,s,'The input vector and the three weight rows drawn as arrows, with the dot products');
    document.getElementById('rd-mv-cap').innerHTML='<div class="t">'+caps[i][0]+'</div><p>'+caps[i][1]+'</p>';
  }
  RD.anim({card:'rd-mv-card',ctl:'rd-mv-ctl',n:caps.length,draw,ms:2200,label:'Step of the matrix-vector product'});
  RD.onResize(()=>draw(cur));
})();

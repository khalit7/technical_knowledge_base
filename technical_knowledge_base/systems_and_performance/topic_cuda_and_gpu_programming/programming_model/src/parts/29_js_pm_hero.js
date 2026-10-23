// ---- Reading s0: hero, one launch unpacked (grid, block, warp, thread), static annotated diagram ----
(function(){
  const fig=document.getElementById('pm-hero');if(!fig)return;
  const T=RD.t,ACC='var(--acc)',BOX='fill:var(--soft);stroke:var(--line)',HI='fill:var(--acc);stroke:var(--acc)';
  // the running example: scale<<<4096, 256>>>, thread blockIdx.x 9, threadIdx.x 37 (warp 1, lane 5), i = 2,341
  const L=[
    {title:'Grid: 4,096 blocks',talk:['talk: atomics, or end','the kernel'],runs:['runs: over all SMs,','in waves']},
    {title:'Block: 256 threads',talk:['talk: shared memory','+ __syncthreads()'],runs:['runs: on one SM,','never split']},
    {title:'Warp: 32 lanes',talk:['talk: shuffles, votes,','__syncwarp()'],runs:['runs: one instruction','for all 32 lanes']},
    {title:'Thread 2,341',talk:['talk: only its own','registers'],runs:['runs: as one lane']}];
  // each drawer gets a box (x, y, w, h) and returns [svg, highlighted point {x, y}]
  function grid(x,y,w,h){const c=8,r=4,s=Math.min((w-8)/c,(h-22)/r),ox=x+(w-c*s)/2,oy=y+4;let b='',p;
    for(let k=0;k<c*r;k++){const cx=ox+(k%c)*s,cy=oy+Math.floor(k/c)*s,hi=k===9;
      b+='<rect x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" width="'+(s-3).toFixed(1)+'" height="'+(s-3).toFixed(1)+'" rx="2" style="'+(hi?HI:BOX)+'"></rect>';
      if(hi)p={x:cx+s-3,y:cy+(s-3)/2,l:cx,t:cy}}
    b+=T(x+w/2,oy+r*s+13,'blocks 0 to 31 of 4,096',{a:'middle',fs:11,fill:'var(--mute)'});return [b,p]}
  function block(x,y,w,h){const n=8,bh=Math.min(12,(h-8)/n-2),ox=x+26,bw=w-32;let b='',p;
    for(let k=0;k<n;k++){const cy=y+4+k*(bh+2.5),hi=k===1;
      b+=T(x+22,cy+bh-1,'w'+k,{a:'end',fs:11,fill:hi?ACC:'var(--mute)'});
      b+='<rect x="'+ox+'" y="'+cy.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="2" style="'+(hi?HI:BOX)+'"></rect>';
      if(hi)p={x:ox+bw,y:cy+bh/2,l:ox,t:cy}}
    return [b,p]}
  function warp(x,y,w,h){const c=8,r=4,s=Math.min((w-8)/c,(h-22)/r),ox=x+(w-c*s)/2,oy=y+4;let b='',p;
    for(let k=0;k<32;k++){const cx=ox+(k%c)*s,cy=oy+Math.floor(k/c)*s,hi=k===5;
      b+='<rect x="'+cx.toFixed(1)+'" y="'+cy.toFixed(1)+'" width="'+(s-2).toFixed(1)+'" height="'+(s-2).toFixed(1)+'" rx="1.5" style="'+(hi?HI:BOX)+'"></rect>';
      if(hi)p={x:cx+s-2,y:cy+(s-2)/2,l:cx,t:cy}}
    b+=T(x+w/2,oy+r*s+13,'lanes 0 to 31',{a:'middle',fs:11,fill:'var(--mute)'});return [b,p]}
  function thread(x,y,w,h){const lines=['blockIdx.x = 9','threadIdx.x = 37','i = 9 × 256 + 37','y[i] = a × x[i]'];let b='';
    b+='<rect x="'+(x+2)+'" y="'+(y+2)+'" width="'+(w-4)+'" height="'+(h-6)+'" rx="5" style="fill:var(--acc2);stroke:var(--acc)"></rect>';
    lines.forEach((s,k)=>{b+=T(x+10,y+22+k*18,s,{fs:11.5,fill:'var(--ink)'})});return [b,{x:x+2,y:y+h/2,l:x+2,t:y+2}]}
  const DR=[grid,block,warp,thread];
  function zoom(p,nx,ny,nw,nh,horiz){ // dashed lines from the highlighted element to the next panel
    const st='stroke="var(--acc)" stroke-dasharray="3 3" stroke-width="1" fill="none"';
    if(horiz)return '<line x1="'+p.x.toFixed(1)+'" y1="'+p.y.toFixed(1)+'" x2="'+nx+'" y2="'+ny+'" '+st+'></line><line x1="'+p.x.toFixed(1)+'" y1="'+p.y.toFixed(1)+'" x2="'+nx+'" y2="'+(ny+nh)+'" '+st+'></line>';
    return '<line x1="'+p.l.toFixed(1)+'" y1="'+p.t.toFixed(1)+'" x2="'+nx+'" y2="'+ny+'" '+st+'></line><line x1="'+p.x.toFixed(1)+'" y1="'+p.t.toFixed(1)+'" x2="'+(nx+nw)+'" y2="'+ny+'" '+st+'></line>'}
  function labels(l,x,y){let b=T(x,y,l.title,{fs:12,w:600}),yy=y+16;
    l.talk.forEach(s=>{b+=T(x,yy,s,{fs:11,fill:'var(--ink)'});yy+=14});yy+=2;
    l.runs.forEach(s=>{b+=T(x,yy,s,{fs:11,fill:'var(--mute)'});yy+=14});return [b,yy]}
  function draw(){
    const W=RD.width(fig);let b='',H;
    b+=T(4,14,'host: scale&lt;&lt;&lt;4096, 256&gt;&gt;&gt;(x, y, a, n)',{fs:12,w:600,fill:ACC});
    b+=T(4,30,'queues the launch and returns at once (section 1)',{fs:11,fill:'var(--mute)'});
    if(W>=700){ // four panels side by side, labels underneath
      const gap=26,pw=(W-8-3*gap)/4,ph=104,y0=42;let pts=[];
      for(let k=0;k<4;k++){const x=4+k*(pw+gap);const [s,p]=DR[k](x,y0,pw,ph);
        b+='<rect x="'+x.toFixed(1)+'" y="'+y0+'" width="'+pw.toFixed(1)+'" height="'+ph+'" rx="6" style="fill:none;stroke:var(--line)"></rect>'+s;pts.push(p);
        b+=labels(L[k],x+4,y0+ph+18)[0]}
      for(let k=0;k<3;k++){const nx=4+(k+1)*(pw+gap);b+=zoom(pts[k],nx,42,pw,ph,true)}
      H=y0+ph+18+16+14*2+2+14*2+4}
    else{ // stacked: drawing on the left, labels on the right
      const dw=Math.min(170,Math.floor(W*0.44)),ph=96,gap=22;let y=42,prev=null;
      for(let k=0;k<4;k++){const [s,p]=DR[k](4,y,dw,ph);
        b+='<rect x="4" y="'+y+'" width="'+dw+'" height="'+ph+'" rx="6" style="fill:none;stroke:var(--line)"></rect>'+s;
        if(prev){const cx=4+dw/2;b+='<line x1="'+cx+'" y1="'+(y-gap+2)+'" x2="'+cx+'" y2="'+(y-4)+'" style="stroke:var(--acc);stroke-width:1.5"></line><path d="M'+cx+' '+(y-1)+' l-5 -7 h10 z" style="fill:var(--acc)"></path>'+T(cx+10,y-gap/2+4,'zoom into the blue one',{fs:11,fill:'var(--mute)'})}
        b+=labels(L[k],dw+14,y+14)[0];prev=p;y+=ph+gap}
      H=y-gap+4}
    fig.innerHTML=RD.svg(W,H,b,'A launch of 4,096 blocks of 256 threads: grid, block, warp and one thread, with how each level cooperates and where it runs')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

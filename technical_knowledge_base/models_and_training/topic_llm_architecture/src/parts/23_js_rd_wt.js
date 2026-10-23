// ---- Reading section 3: where a block's weights sit (static, to scale within each block, drawn at the measured width) ----
// Numbers derived from the Llama 3.1 8B config and measured on the tiny GPT (src/read/derive.py, model.param_groups()).
(function(){
  const host=document.getElementById('rd-wt-svg');if(!host||!window.RD)return;
  const t=RD.t;
  const ROWS=[
    {name:'Llama 3.1 8B block',total:'218.1M',segs:[['Q and output','33.6M',33554432,'--c2'],['K and V','8.4M',8388608,'--c6'],['FFN (SwiGLU)','176.2M',176160768,'--c3']]},
    {name:'Tiny GPT block',total:'786,944',segs:[['attention','262,144',262144,'--c2'],['FFN (GELU)','524,288',524288,'--c3']]}
  ];
  function draw(){
    const W=Math.min(RD.width(host),780),narrow=W<520;
    const lx=4,bx=4,bw=W-8,barH=24;
    let g='',y=4;
    ROWS.forEach(r=>{
      const sum=r.segs.reduce((a,s)=>a+s[2],0);
      g+=t(lx,y+13,r.name+': '+r.total+' weights',{fs:12.5,w:600});
      const by=y+20;let x=bx,k=0;
      r.segs.forEach(s=>{
        const w=bw*s[2]/sum,pct=Math.round(100*s[2]/sum);
        g+='<rect x="'+x.toFixed(1)+'" y="'+by+'" width="'+Math.max(1,w-1).toFixed(1)+'" height="'+barH+'" rx="3" fill="var('+s[3]+')" opacity="'+(s[3]==='--c3'?'0.9':'0.75')+'"/>';
        const lab=pct+'% '+s[0]+' ('+s[1]+')';
        if(w>lab.length*6.6+12)g+=t(x+6,by+16,lab,{fs:11.5,fill:'var(--bg)',w:600});
        else{ // a short segment: a swatch and its label on its own line under the bar
          const ly=by+barH+14+14*k;k++;
          g+='<rect x="'+bx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="var('+s[3]+')" opacity="0.75"/>'+t(bx+15,ly,lab,{fs:11,fill:'var(--mute)'});
        }
        x+=w;
      });
      y=by+barH+14*k+(k?8:4)+14;
    });
    host.innerHTML=RD.svg(W,y,g,'Share of one block’s weights: Llama 3.1 8B 15% Q and output, 4% K and V, 81% FFN; the tiny GPT 33% attention, 67% FFN.');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

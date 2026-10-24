// ---- Reading, top: the hero figure. One 512 x 512 photo through SmolVLM-500M and Qwen3.5-0.8B, stage by stage (static, numbers measured: out/smol_saw.json, out/qwen_saw.json) ----
(function(){
  const V=VM,el=V.$('vm-hero');if(!el)return;
  const cat=V.D.catThumb||'';
  // [stage, SmolVLM lines, Qwen3.5 lines]; the connector's token counts are the highlight (image tokens)
  const ST=[
    ['Image',['SmolVLM-500M'],['Qwen3.5-0.8B']],
    ['Processor',['to 2,048 × 2,048','16 tiles + global'],['kept 512 × 512','(multiple of 32)']],
    ['Vision encoder',['17 × 1,024 patches','of 768 numbers'],['1,024 patches','of 768 numbers']],
    ['Connector',['4 × 4 merge, linear','1,088 tokens'],['2 × 2 merge, MLP','256 tokens']],
    ['Language model',['1,142-token prompt','1-D positions'],['277-token prompt','3-D (t, h, w)']]];
  const T=RD.t;
  function icon(k,x,y,s){// draw stage k's icon in a box of side s at (x,y)
    let b='';const sq=(X,Y,w,f,st)=>'<rect x="'+X.toFixed(1)+'" y="'+Y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+w.toFixed(1)+'" fill="'+f+'"'+(st?' stroke="'+st+'" stroke-width="0.6"':'')+'/>';
    if(k===0){b+=cat?'<image href="'+cat+'" x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" preserveAspectRatio="xMidYMid slice"/>':sq(x,y,s,'var(--soft)','var(--line)');}
    if(k===1){const t=s*0.72/4;for(let r=0;r<4;r++)for(let c=0;c<4;c++)b+=sq(x+c*t,y+r*t,t-1.5,'var(--soft)','var(--mute)');b+=sq(x+s*0.76,y,s*0.24,'var(--soft)','var(--mute)')}
    if(k===2){b+=sq(x,y,s,'var(--soft)','var(--mute)');let p='';for(let i=1;i<16;i++){const d=(s*i/16).toFixed(1);p+='M'+(x+ +d)+' '+y+'v'+s+'M'+x+' '+(y+ +d)+'h'+s}b+='<path d="'+p+'" stroke="var(--line)" stroke-width="0.6" fill="none"/>'}
    if(k===3){const t=s/6;for(let r=0;r<6;r++)for(let c=0;c<6;c++)b+=sq(x+c*t,y+r*t,t-1.5,'var(--acc)')}
    if(k===4){const t=s/7;let i=0;for(let r=0;r<5;r++)for(let c=0;c<7;c++){const col=i<3||i>29?'var(--c4)':'var(--acc)';b+=sq(x+c*t,y+r*t+s*0.14,t-1.5,col);i++}}
    return b}
  function draw(){const W=Math.min(RD.width(el),900);let b='',H;
    if(W>=680){const aw=18,cw=(W-4*aw)/5,is=Math.min(64,cw-20),iy=24;H=212;
      ST.forEach((st,k)=>{const x0=k*(cw+aw),cx=x0+cw/2;
        b+=T(cx,13,st[0],{a:'middle',w:600,fs:12});
        b+=icon(k,cx-is/2,iy,is);
        if(k<4)b+=T(x0+cw+aw/2,iy+is/2+4,'→',{a:'middle',fs:14,fill:'var(--mute)'});
        [[st[1],112],[st[2],166]].forEach(([ls,y])=>{ls.forEach((l,j)=>{const tok=/tokens$/.test(l);
          b+=T(k?cx:6,y+j*15,l,{a:k?'middle':'start',w:(tok||!k)?600:400,fill:tok?'var(--acc)':(k?'var(--ink)':'var(--ink)')})})});
      });
      b+='<line x1="0" x2="'+W+'" y1="150" y2="150" stroke="var(--line)"/>';
      b+=T(6,207,'image tokens in blue; text tokens in purple',{fill:'var(--mute)'});
    }else{const is=46,bh=74;H=ST.length*bh+8;
      ST.forEach((st,k)=>{const y=6+k*bh;b+=icon(k,4,y+4,is);
        b+=T(is+16,y+12,st[0],{w:600,fs:12});
        if(k===0){b+=T(is+16,y+28,'the root’s 512 × 512 cat (CC0)');b+=T(is+16,y+43,'SmolVLM-500M and Qwen3.5-0.8B',{fill:'var(--mute)'})}
        else[st[1],st[2]].forEach((ls,j)=>{const tok=/tokens$/.test(ls[1]);b+=T(is+16,y+28+j*15,(j?'Qwen3.5: ':'SmolVLM: ')+ls[0]+(/^[(o]/.test(ls[1])?' ':', ')+ls[1],{fill:tok?'var(--acc)':'var(--ink)',w:tok?600:400})});
        if(k<4)b+=T(4+is/2,y+bh-6,'↓',{a:'middle',fs:13,fill:'var(--mute)'})});
    }
    el.innerHTML=RD.svg(W,H,b,'One 512 by 512 photo through SmolVLM-500M and Qwen3.5-0.8B: processor, vision encoder, connector, language model, with the measured counts at each stage')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

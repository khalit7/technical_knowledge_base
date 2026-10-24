// ---- Hero: the seven method steps to scale (minutes of the drill's 45-minute clock), and the number that bound in each design ----
// Static annotated diagram; numbers come from EST_EXPECT (recompute.py), so the hero agrees with every estimate table.
(function(){
  const host=document.getElementById('hero-svg');if(!host||!window.EST_EXPECT)return;
  const E=window.EST_EXPECT,F=RD.fmt;
  const STEPS=[['Requirements',5],['Estimate',5],['API',3],['Data model',3],['High-level design',9],['Deep dives',15],['Bottlenecks and failure',5]];
  const KINDS=[
    {k:'Storage',d:[['URL shortener',F(E.url.tb,0)+' TB of links'],['RAG service',F(E.rag.vgb,0)+' GB of vectors']]},
    {k:'Open connections',d:[['Chat',F(E.chat.conns)+' sockets'],['Chat',F(E.chat.pres)+' heartbeats/s']]},
    {k:'Coordination',d:[['Rate limiter','1 counter, 50 gateways'],['Job scheduler','each run exactly once']]},
    {k:'Bursts and fan-out',d:[['News feed',F(E.feed.celeb_ins/1e6,0)+' M inserts per post'],['Job scheduler',F(E.job.burst)+' due in 1 s']]},
    {k:'Money and data',d:[['LLM gateway','$'+F(E.gw.cyr/1e6,1)+' M a year'],['LLM gateway','at '+F(E.gw.rpk,0)+' requests/s']]}];
  const T=(x,y,s,o)=>RD.t(x,y,RD.esc(s),o);
  function arrow(x1,y1,x2,y2){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#hero-ah)"/>'}
  function draw(){
    const W=RD.width(host),narrow=W<600;let s='',H;
    const defs='<defs><marker id="hero-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    const box=(x,y,w,h,hl)=>'<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="6" fill="'+(hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(hl?2:1)+'"/>';
    if(!narrow){
      // steps across, widths to scale
      const y0=16,h=50,gap=3;let x=0;const pos=[];
      s+=T(0,11,'The method: width = minutes of a 45-minute interview',{fill:'var(--mute)'});
      STEPS.forEach((st,i)=>{const w=W*st[1]/45-gap;const hl=i===1||i===5;s+=box(x,y0,w,h,hl);
        const lab=(i+1)+' '+st[0],words=lab.split(' '),wr=lab.length*6.1>w-6&&words.length>1,cut=Math.ceil(words.length/2);const l1=wr?words.slice(0,cut).join(' '):lab;const l2=wr?words.slice(cut).join(' '):'';
        s+=T(x+w/2,y0+(l2?16:21),l1,{a:'middle',w:600});if(l2)s+=T(x+w/2,y0+29,l2,{a:'middle',w:600});
        s+=T(x+w/2,y0+43,st[1]+' min',{a:'middle',fill:'var(--mute)'});pos.push([x,w]);x+=w+gap});
      // constraint band
      const by=y0+h+46,bh=84,cw=(W-4*8)/5;
      s+=T(0,by-8,'What the estimate showed was hard: the number that crossed one machine',{fill:'var(--mute)'});
      KINDS.forEach((k,i)=>{const cx=i*(cw+8);s+=box(cx,by,cw,bh,true);
        s+=T(cx+8,by+17,k.k,{w:700,fill:'var(--acc)'});
        let yy=by+36;k.d.forEach((r,j)=>{if(j===0||r[0]!==k.d[j-1][0]){s+=T(cx+8,yy,r[0],{w:600});yy+=12}s+=T(cx+8,yy,r[1],{fill:'var(--mute)'});yy+=12})});
      const ex=pos[1][0]+pos[1][1]/2,dx=pos[5][0]+pos[5][1]/2;
      s+=arrow(ex,y0+h+2,ex,by-20)+T(ex+8,y0+h+22,'the estimate finds it',{fill:'var(--acc)'});
      s+=arrow(dx,by-20,dx,y0+h+3)+T(dx-8,y0+h+22,'deep dives go there',{a:'end',fill:'var(--acc)'});
      H=by+bh+4;
    }else{
      // steps down, bar length to scale
      const lw=Math.min(150,W*0.42),bw=W-lw-44,rh=22;let y=16;
      s+=T(0,11,'The method: bar = minutes of 45',{fill:'var(--mute)'});
      STEPS.forEach((st,i)=>{const hl=i===1||i===5;s+=T(0,y+15,(i+1)+' '+st[0],{w:hl?700:400,fill:hl?'var(--acc)':undefined});
        s+=box(lw,y+3,bw*st[1]/15,rh-6,hl)+T(lw+bw*st[1]/15+4,y+15,st[1]+' min',{fill:'var(--mute)'});y+=rh});
      y+=10;s+=T(0,y+4,'What the estimate showed was hard:',{fill:'var(--mute)'});y+=12;
      KINDS.forEach(k=>{const bh=16+k.d.length*15;s+=box(0,y,W,bh,true);s+=T(8,y+14,k.k,{w:700,fill:'var(--acc)'});
        k.d.forEach((r,j)=>{s+=T(8,y+29+j*15,(j>0&&r[0]===k.d[j-1][0]?'':r[0]+': ')+r[1])});y+=bh+5});
      H=y;
    }
    host.innerHTML=RD.svg(W,H,defs+s,'The seven method steps to scale, and the number that bound in each design');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();

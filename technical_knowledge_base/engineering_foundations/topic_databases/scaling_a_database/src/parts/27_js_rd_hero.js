// ---- Hero: three ways to grow (one machine, copies, split), schematic, static ----
(function(){
  const cells=document.querySelectorAll('#rd-hero-card .hs[data-h]');if(!cells.length)return;
  const A='var(--acc)',L='var(--line)',S='var(--soft)';
  const box=(x,y,w,h,lab,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.st||L)+'" stroke-width="'+(o.sw||1.2)+'"/>'+
    (lab?RD.t(x+w/2,y+h/2+4,lab,{a:'middle',fs:o.fs||11,w:o.w}):'')};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.st||L)+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+' marker-end="url(#hrA'+(o.m||'')+')"/>'};
  const defs='<defs><marker id="hrA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker>'+
    '<marker id="hrAm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>';
  const D={
    one(W){const H=128,g=[defs];const bw=Math.min(W-20,220),x=(W-bw)/2;
      g.push(box(W/2-34,4,68,22,'app',{fill:S}));g.push(line(W/2,26,W/2,44,{st:A,sw:2.5}));
      g.push(box(x,46,bw,78,'',{st:A,sw:2}));g.push(RD.t(W/2,62,'one primary, bigger',{a:'middle',fs:11.5,w:600}));
      const t=['pool','cache','partitions'],tw=(bw-24)/3;
      t.forEach((s,i)=>g.push(box(x+8+i*(tw+4),72,tw,22,s,{fill:S,fs:11})));
      g.push(RD.t(W/2,114,'CPU, memory, disk, connections',{a:'middle',fs:11,fill:'var(--mute)'}));
      return [H,g.join('')]},
    copy(W){const H=128,g=[defs];const pw=Math.min(110,W*0.42);
      g.push(box(4,4,58,22,'app',{fill:S}));
      g.push(box(W/2-pw/2,4,pw,30,'primary',{w:600}));
      g.push(line(62,13,W/2-pw/2-2,13,{st:A,sw:2.5}));g.push(RD.t(66,44,'write',{fs:11,fill:'var(--acc)'}));
      const rw=(W-24)/3;
      for(let i=0;i<3;i++){const x=6+i*(rw+6);g.push(line(W/2,34,x+rw/2,82,{st:'var(--mute)',m:'m'}));
        g.push(box(x,84,rw,30,'replica',{st:i===0?A:L,sw:i===0?2:1.2}))}
      g.push(RD.t(W/2+8,62,'log, replayed',{fs:11,fill:'var(--mute)'}));
      g.push('<path d="M30 26 C 18 60, 18 70, 22 82" fill="none" stroke="'+A+'" stroke-width="2.5" marker-end="url(#hrA)"/>');
      g.push(RD.t(4,124,'read',{fs:11,fill:'var(--acc)'}));
      return [H,g.join('')]},
    split(W){const H=128,g=[defs];
      g.push(box(W/2-50,4,100,24,'router',{fill:S,w:600}));
      const sw=(W-24)/3;
      for(let i=0;i<3;i++){const x=6+i*(sw+6),hit=i===1;
        g.push(line(W/2+(hit?0:(i-1)*8),28,x+sw/2,74,hit?{st:A,sw:2.5}:{st:'var(--mute)',dash:1,m:'m'}));
        g.push(box(x,76,sw,40,'',{st:hit?A:L,sw:hit?2:1.2}));
        g.push(RD.t(x+sw/2,92,'shard '+(i+1),{a:'middle',fs:11,w:600}));
        g.push(RD.t(x+sw/2,108,'1/3 of rows',{a:'middle',fs:11,fill:'var(--mute)'}))}
      return [H,g.join('')]}};
  function draw(){cells.forEach(c=>{const W=Math.max(200,Math.min(420,RD.width(c)));const [H,body]=D[c.dataset.h](W);c.innerHTML=RD.svg(W,H,body,c.dataset.h)})}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

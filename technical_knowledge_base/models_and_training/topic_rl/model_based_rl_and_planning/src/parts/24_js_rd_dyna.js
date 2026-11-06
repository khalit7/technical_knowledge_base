// ---- Reading sections 2 and 3: the maze drawer for the Figure 8.2, 8.4 and 8.5 cards (31_js_dyna.js); Figure 8.3 is the 3D stage in 41_js_sc_dyna.js ----
(function(){
  const ARW=['&#8593;','&#8595;','&#8594;','&#8592;'];
  // draw a maze: cells, walls, S, G, greedy arrows, agent. o: {pol, pos, walls(Set), path(Set)}
  MB.drawMaze=function(el,mz,o){const W=RD.width(el),cs=Math.max(22,Math.min(44,Math.floor((W-2)/mz.C))),w=cs*mz.C,h=cs*mz.R;let s='';
    const walls=o.walls||MB.wallset(mz);const st=mz.start[0]*mz.C+mz.start[1],gl=mz.goal[0]*mz.C+mz.goal[1];
    for(let r=0;r<mz.R;r++)for(let c=0;c<mz.C;c++){const i=r*mz.C+c,x=c*cs,y=r*cs;
      const fill=walls.has(i)?'var(--mute)':(o.pos===i?'var(--hl)':'var(--bg)');
      s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+fill+'" stroke="var(--line)"/>';
      if(i===gl)s+=RD.t(x+cs/2,y+cs/2+4,'G',{a:'middle',fs:Math.round(cs*.42),w:700,fill:'var(--good)'});
      else if(i===st&&o.pos!==i)s+=RD.t(x+cs/2,y+cs/2+4,'S',{a:'middle',fs:Math.round(cs*.42),w:700,fill:'var(--mute)'});
      if(o.pol&&o.pol[i]>=0&&!walls.has(i)&&i!==gl)s+=RD.t(x+cs/2,y+cs/2+5,ARW[o.pol[i]],{a:'middle',fs:Math.round(cs*.5),fill:'var(--c1)'});
      if(o.pos===i)s+='<rect x="'+(x+cs*.22)+'" y="'+(y+cs*.22)+'" width="'+(cs*.56)+'" height="'+(cs*.56)+'" rx="3" fill="var(--ink)" opacity=".85"/>'}
    el.innerHTML=RD.svg(w+1,h+1,s,o.label||'Maze')};


})();

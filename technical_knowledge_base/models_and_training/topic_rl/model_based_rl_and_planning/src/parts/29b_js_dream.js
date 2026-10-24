// ---- Reading section 10: where Dreamer learns its behaviour (static annotated diagram) ----
(function(){
  const el=document.getElementById('mb-drD');if(!el)return;
  function draw(){
    const W=Math.max(300,RD.width(el)),n=W<520?4:6,step=(W-30)/n,r=W<520?13:15;let s='<defs><marker id="mbd-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker><marker id="mbd-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--acc)"/></marker></defs>';
    const yo=22,ys=86,yi=168,x=i=>20+step*i+step/2;
    s+=RD.t(4,12,'real frames, encoded; the RSSM learns the model',{fs:11,fill:'var(--mute)'});
    for(let i=0;i<n-1;i++){s+='<rect x="'+(x(i)-14)+'" y="'+yo+'" width="28" height="22" rx="3" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x(i),yo+15,'o'+(i+1),{a:'middle',fs:11});
      s+='<line x1="'+x(i)+'" y1="'+(yo+23)+'" x2="'+x(i)+'" y2="'+(ys-r-2)+'" stroke="var(--mute)" marker-end="url(#mbd-a)"/>';
      s+='<circle cx="'+x(i)+'" cy="'+ys+'" r="'+r+'" fill="var(--soft)" stroke="var(--ink)"/>'+RD.t(x(i),ys+4,'s'+(i+1),{a:'middle',fs:11});
      if(i<n-2)s+='<line x1="'+(x(i)+r)+'" y1="'+ys+'" x2="'+(x(i+1)-r-2)+'" y2="'+ys+'" stroke="var(--ink)" marker-end="url(#mbd-a)"/>'}
    // imagined branch from s2: m latent steps, evenly spaced to the right edge
    const b0=x(1),m=W<520?4:6,x0=b0+step*0.5,sp=(W-r-6-x0)/(m-1),xi=k=>x0+sp*k;
    s+='<line x1="'+b0+'" y1="'+(ys+r)+'" x2="'+(xi(0)-6).toFixed(1)+'" y2="'+(yi-r)+'" stroke="var(--acc)" marker-end="url(#mbd-b)"/>';
    for(let k=0;k<m;k++){const xx=xi(k);
      s+='<circle cx="'+xx.toFixed(1)+'" cy="'+yi+'" r="'+(r-2)+'" fill="color-mix(in srgb, var(--acc) 14%, var(--bg))" stroke="var(--acc)" stroke-dasharray="3 2"/>'+RD.t(xx,yi+4,'ŝ'+(k+1),{a:'middle',fs:11,fill:'var(--acc)'});
      if(k>0){s+='<line x1="'+(xi(k-1)+r-2).toFixed(1)+'" y1="'+yi+'" x2="'+(xx-r).toFixed(1)+'" y2="'+yi+'" stroke="var(--acc)" marker-end="url(#mbd-b)"/>'+RD.t((xi(k-1)+xx)/2,yi-7,'a',{a:'middle',fs:11,fill:'var(--acc)'})}}
    s+=RD.t(W-4,yi+r+16,'imagined in latent space, no images',{a:'end',fs:11,fill:'var(--acc)'});
    el.innerHTML=RD.svg(W,yi+r+24,s,'Dreamer: the model is learned on real frames; the actor and critic learn only on latent trajectories imagined from real states');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();

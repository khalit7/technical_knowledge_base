// ---- Section 12: where a Singapore user's read and write go under three multi-region patterns (static toggle; CloudPing medians) ----
(function(){
  const box=document.getElementById('geSvg');if(!box)return;
  let mode='rep';
  const RG=['Virginia','Ireland','Singapore'];
  const P={
    rep:{node:['primary','replica','replica'],lead:[1,0,0],write:{to:0,lab:'write: about 218 ms round trip'},read:{to:2,lab:'read: local, slightly stale'},
      cap:'One primary in Virginia: reads are local everywhere, every write from Singapore crosses the Pacific (CloudPing median about 218 ms), and failover to another region risks split brain.'},
    geo:{node:['US users\' rows','EU users\' rows','Asia users\' rows'],lead:[1,1,1],write:{to:2,lab:'write: commits in-region'},read:{to:2,lab:'read: local'},
      cap:'Geo-partitioned (REGIONAL BY ROW): this user\'s rows are stored and led in Singapore, so their writes commit inside the region (zone round trips of about 1 to 2 ms); reading a US user\'s row from Singapore still costs about 218 ms. The same layout keeps data inside a jurisdiction.'},
    glob:{node:['copy','copy','copy'],lead:[0,0,0],write:{to:-1,lab:'write: must reach every region'},read:{to:2,lab:'read: local, current'},
      cap:'Global table (small, read-mostly data such as the model list): every region reads locally and current; each write pays for reaching all regions ("fast reads everywhere, slower writes").'}};
  function draw(){
    const W=Math.max(300,RD.width(box)),dk=W<520,H=190,cw=(W-24)/3,g=[];
    g.push('<defs><marker id="geA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker></defs>');
    const p=P[mode];
    RG.forEach((r,i)=>{const x=8+i*(cw+4);
      g.push('<rect x="'+x+'" y="6" width="'+cw+'" height="'+(H-12)+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>');
      g.push(RD.t(x+cw/2,24,r,{a:'middle',fs:12,w:600}));
      const lead=p.lead[i];
      g.push('<rect x="'+(x+8)+'" y="34" width="'+(cw-16)+'" height="34" rx="6" fill="'+(lead?'var(--acc2)':'var(--bg)')+'" stroke="'+(lead?'var(--acc)':'var(--line)')+'" stroke-width="'+(lead?2:1.2)+'"/>');
      g.push(RD.t(x+cw/2,55,dk?p.node[i].replace(' users\' rows',' rows'):p.node[i],{a:'middle',fs:11}))});
    const ux=8+2*(cw+4)+cw/2;
    g.push('<circle cx="'+ux+'" cy="150" r="9" fill="var(--acc)"/>'+RD.t(ux,176,'user',{a:'middle',fs:11}));
    // read: up to own region's box
    g.push('<line x1="'+(ux+14)+'" y1="140" x2="'+(ux+14)+'" y2="72" stroke="var(--good)" stroke-width="2.5" marker-end="url(#geA)"/>');
    g.push(RD.t(ux+18,112,dk?'read':p.read.lab.split(':')[0],{fs:11,fill:'var(--good)'}));
    const wt=p.write.to;
    if(wt===2)g.push('<line x1="'+(ux-14)+'" y1="140" x2="'+(ux-14)+'" y2="72" stroke="var(--acc)" stroke-width="2.5" marker-end="url(#geA)"/>');
    else{const tx=wt===0?8+cw/2:null;
      if(tx!==null)g.push('<path d="M'+(ux-12)+' 146 C '+(ux-cw)+' 150, '+(tx+40)+' 120, '+tx+' 72" fill="none" stroke="var(--acc)" stroke-width="2.5" marker-end="url(#geA)"/>');
      else[0,1].forEach(k=>{const tx2=8+k*(cw+4)+cw/2;g.push('<path d="M'+(ux-12)+' 146 C '+(ux-cw*0.7)+' 150, '+(tx2+30)+' 120, '+tx2+' 72" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#geA)"/>')})}
    g.push(RD.t(12,H-20,dk?p.write.lab.replace('about ',''):p.write.lab,{fs:11.5,fill:'var(--acc)',w:600}));
    box.innerHTML=RD.svg(W,H,g.join(''),'Multi-region patterns');
    document.getElementById('geCap').textContent=p.cap;
  }
  RD.seg(document.getElementById('geM'),v=>{mode=v;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();

// ---- Section 11: ranges on three nodes and what a majority means (static toggle over the measured run's events and ranges) ----
(function(){
  const box=document.getElementById('rgSvg');if(!box||!window.SC||!SC.crdb)return;
  const R=[88,89,90,91];   // range ids from SHOW RANGES at the end of the run; every replica set {1,2,3}, every lease on node 1
  const ST=[[1,1,1],[1,1,0],[1,0,0],[1,1,0],[1,1,1]];
  const ev=SC.crdb.events,T=['before the first kill',ev[0].t,ev[1].t,ev[2].t,ev[3].t];
  let s=0;
  function draw(){
    const W=Math.max(300,RD.width(box)),dk=W<520,lw=dk?54:110,nw=(W-lw-16)/3,rh=30,H=36+R.length*(rh+6)+8,g=[];
    const up=ST[s];
    for(let n=0;n<3;n++){const x=lw+8+n*nw;
      g.push('<rect x="'+(x+3)+'" y="4" width="'+(nw-6)+'" height="'+(H-8)+'" rx="8" fill="'+(up[n]?'var(--bg)':'var(--soft)')+'" stroke="'+(up[n]?'var(--line)':'var(--bad)')+'" stroke-width="'+(up[n]?1.2:2)+'"'+(up[n]?'':' stroke-dasharray="5 4"')+'/>');
      g.push(RD.t(x+nw/2,22,'node '+(n+1)+(up[n]||dk?'':' (killed)'),{a:'middle',fs:11.5,w:600,fill:up[n]?'var(--ink)':'var(--bad)'}))}
    const alive=up.reduce((a,b)=>a+b,0),maj=alive>=2;
    R.forEach((r,i)=>{const y=34+i*(rh+6);
      g.push(RD.t(4,y+rh/2+4,(dk?'r':'range ')+r,{fs:11.5,w:600}));
      for(let n=0;n<3;n++){const x=lw+8+n*nw,lead=n===0;
        g.push('<rect x="'+(x+10)+'" y="'+y+'" width="'+(nw-20)+'" height="'+rh+'" rx="5" fill="'+(!up[n]?'var(--soft)':lead?'var(--acc2)':'var(--bg)')+'" stroke="'+(!up[n]?'var(--dim)':lead?'var(--acc)':'var(--line)')+'" stroke-width="'+(lead&&up[n]?2:1)+'"/>');
        g.push(RD.t(x+nw/2,y+rh/2+4,!up[n]?'lost':lead?(dk?'lease':'leaseholder'):'copy',{a:'middle',fs:11,fill:!up[n]?'var(--mute)':'var(--ink)'}))}});
    box.innerHTML=RD.svg(W,H,g.join(''),'Ranges on three nodes');
    document.getElementById('rgCap').innerHTML='<b style="color:'+(maj?'var(--good)':'var(--bad)')+'">'+alive+' of 3 copies alive per range: '+(maj?'a majority, writes continue':'no majority, writes stop')+'.</b> '+
      (s?'At '+Math.round(T[s])+' s in the measured run. ':'')+'The four ranges and their replicas are the real ones from SHOW RANGES; every lease sat on node 1, the node the client used, so killing node 3 caused no pause.';
  }
  RD.seg(document.getElementById('rgM'),v=>{s=+v;draw()});RD.onRender(draw);RD.onResize(draw);draw();
})();

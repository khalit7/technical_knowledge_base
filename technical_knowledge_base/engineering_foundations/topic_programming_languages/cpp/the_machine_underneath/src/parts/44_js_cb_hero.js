// ---- Hero: time for one operation on this M1 Pro, log scale. Values from window.CB (measured) and Dougall Johnson's fmadd latency (published) ----
(function(){
  const X=window.CBX,CB=X.CB,f=X.fmt,el=document.getElementById('cb-hero-svg');
  if(!el||!CB.ladder)return;
  const R=CB.ladder.random[0].pts,S=CB.ladder.seq[0].pts,at=(pts,kb)=>(pts.find(p=>p[0]===kb)||[0,NaN])[1];
  const rows=[
    ['one fused multiply-add (4 cycles, published latency)',4/3.2,'var(--c3)'],
    ['load from L1 (16 KB buffer)',at(R,16),'var(--c1)'],
    ['load from L2 (1 MB buffer)',at(R,1024),'var(--c1)'],
    ['load from DRAM, address order (512 MB)',at(S,524288),'var(--c1)'],
    ['load from DRAM, random order (512 MB)',at(R,524288),'var(--bad)'],
    ['first touch of a fresh 16 KB page (page fault)',CB.mmap.v.fault_us.runs[0]*1000,'var(--c4)']];
  function draw(){
    const W=Math.max(300,Math.min(860,el.clientWidth||600)),narrow=W<560,lw=narrow?0:270,rh=narrow?34:24,top=6;
    const x0=Math.log10(0.5),x1=Math.log10(2000),bx=narrow?6:lw+6,bw=W-bx-60,xs=v=>bx+(Math.log10(v)-x0)/(x1-x0)*bw;
    let s='';const H=top+rows.length*rh+26;
    [1,10,100,1000].forEach(v=>{s+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+top+'" y2="'+(H-20)+'" style="stroke:var(--line)"/>'+RD.t(xs(v),H-6,v>=1000?'1 µs':v+' ns',{a:'middle',fs:10.5,fill:'var(--mute)'})});
    rows.forEach(([lab,v,c],i)=>{const y=top+i*rh+(narrow?14:0);
      if(narrow)s+=RD.t(bx,y-3,lab,{fs:10.5});else s+=RD.t(lw,y+13,lab,{a:'end',fs:11});
      s+='<rect x="'+bx+'" y="'+(y+3)+'" width="'+Math.max(2,xs(v)-bx)+'" height="'+(narrow?12:14)+'" rx="2" style="fill:'+c+'"/>'+RD.t(xs(v)+4,y+(narrow?13:14),f(v,v>=100?0:v>=10?1:2)+' ns',{fs:10.5,w:600})});
    el.innerHTML=RD.svg(W,H,s,'Time for one operation, log scale: fused multiply-add about 1.25 ns, L1 load about 1 ns, DRAM random load about 133 ns, page fault about 840 ns');
  }
  draw();X.onRender('t-read',draw);X.onResize('t-read',draw);
})();

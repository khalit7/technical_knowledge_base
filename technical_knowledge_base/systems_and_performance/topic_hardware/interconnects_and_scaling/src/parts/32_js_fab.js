// ---- Fabric explorer tab (t-fab) ----
(function(){
  const $=id=>document.getElementById(id);
  const fT=s=>s>=1?s.toFixed(2)+' s':s>=1e-3?(s*1e3).toFixed(s>=0.1?0:1)+' ms':(s*1e6).toFixed(0)+' µs';
  const NM={nvlink:'NVLink port (in server)',nic:'NIC (GPU to leaf)',spine:'Leaf to spine uplinks'};
  function render(){
    const f=$('fab-f').value,p=$('fab-p').value,srv=+$('fab-s').value,over=+$('fab-o').value,pxn=$('fab-x').checked;
    $('fab-o').disabled=f==='railonly';$('fab-x').disabled=f==='railonly';
    const r=ICFAB.loads(f,p,srv,1e9,{over,pxn}),tot=r.total||1e-12;
    const util=k=>r.time[k]/tot;
    // drawing
    const host=$('fab-svg'),W=Math.min(860,RD.width(host)),shown=Math.min(srv,4),H=250;
    const col=u=>u>=0.999?'var(--bad)':u>0.5?'var(--c5)':u>0.05?'var(--c3)':'var(--dim)';
    const sw=(W-20)/shown,gpuY=210,leafY=120,spY=36;let s='';
    const nLeaf=f==='tor'?Math.ceil(shown/2):8,leafX=i=>10+(i+0.5)*(W-20)/nLeaf;
    if(f!=='railonly'){for(let k=0;k<4;k++){const x=10+(k+0.5)*(W-20)/4;s+='<rect x="'+(x-30)+'" y="'+(spY-12)+'" width="60" height="22" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x,spY+3,'spine',{a:'middle',fs:10});
      for(let i=0;i<nLeaf;i++)s+='<line x1="'+leafX(i)+'" y1="'+(leafY-10)+'" x2="'+x+'" y2="'+(spY+10)+'" stroke="'+col(util('spine'))+'" stroke-width="'+(1+2*util('spine'))+'" opacity=".7"/>'}}
    for(let i=0;i<nLeaf;i++){s+='<rect x="'+(leafX(i)-17)+'" y="'+(leafY-10)+'" width="34" height="20" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(leafX(i),leafY+4,f==='tor'?'ToR'+i:'R'+i,{a:'middle',fs:9.5})}
    for(let j=0;j<shown;j++){const bx=10+j*sw+4,bw=sw-8;s+='<rect x="'+bx+'" y="'+(gpuY-12)+'" width="'+bw+'" height="30" rx="5" fill="none" stroke="'+col(util('nvlink'))+'" stroke-width="'+(1+2*util('nvlink'))+'"/>'+RD.t(bx+bw/2,gpuY+30,'server '+j,{a:'middle',fs:10});
      for(let g=0;g<8;g++){const gx=bx+(g+0.5)*bw/8;s+='<rect x="'+(gx-Math.min(6,bw/20))+'" y="'+(gpuY-6)+'" width="'+Math.min(12,bw/10)+'" height="12" rx="2" fill="var(--c1)"/>';
        const lx=f==='tor'?leafX(Math.floor(j/2)):leafX(g);s+='<line x1="'+gx+'" y1="'+(gpuY-6)+'" x2="'+lx+'" y2="'+(leafY+10)+'" stroke="'+col(util('nic'))+'" stroke-width="'+(0.6+1.6*util('nic'))+'" opacity=".55"/>'}}
    if(srv>shown)s+=RD.t(W-12,gpuY+30,'+ '+(srv-shown)+' more',{a:'end',fs:10,fill:'var(--mute)'});
    host.innerHTML=RD.svg(W,H,s,'Fabric drawing');
    const cls=['nvlink','nic','spine'].filter(k=>!(k==='spine'&&f==='railonly'));
    $('fab-out').innerHTML=RD.stat('Time for 1 GB per GPU',fT(tot),'limited by '+NM[r.worst])+RD.stat('Effective rate per GPU',(1/tot).toFixed(1)+' GB/s','1 GB / time')+RD.stat('Network switch ports',Math.round(r.ports).toLocaleString('en-US'),'leaf down + up + spine')+RD.stat('GPUs',(8*srv).toLocaleString('en-US'),srv+' servers');
    const mx=Math.max(...cls.map(k=>r.time[k]),1e-12);
    $('fab-bars').innerHTML=cls.map(k=>'<div class="row'+(k===r.worst?' hl':'')+'"><span class="nm">'+NM[k]+'</span><span class="track"><span class="fill" style="width:'+(r.time[k]/mx*100).toFixed(1)+'%;background:'+col(util(k))+'"></span></span><span class="val">'+fT(r.time[k])+'</span></div>').join('');
    let note='';
    if(p==='a2a'&&f==='rail'&&!pxn)note=over>1?'With '+over+':1 oversubscription the cross-rail bytes (7/8 of the traffic between servers) queue on the spine. Tick PXN: the same bytes cross rails over NVLink inside the server, the spine goes idle, and the NIC limit returns.':'At full bisection the NICs are the limit and the spine is just fast enough. Raise the oversubscription and watch the bottleneck move.';
    else if(p==='a2a'&&f==='tor')note='Top-of-rack wiring keeps only the traffic within one rack (2 servers) off the spine; the rest crosses it, so oversubscription hurts as much as without rails.';
    else if(p==='a2a'&&f==='railonly')note='Rail-only: no spine at all. Every cross-rail piece hops over NVLink first, which carries more but has 9 times the bandwidth; the time equals the full-bisection fabric with about a third of the switch ports.';
    else if(p==='dp_ring'&&f==='tor')note='With top-of-rack wiring each ring leaves a rack once, so 8 flows share each rack\u2019s uplinks: up to 2:1 oversubscription is absorbed, from 3:1 the spine binds. On rails it never would.';
    else if(p==='dp_ring')note='Same-index GPUs exchange with each other, so on rails the traffic never leaves its leaf: oversubscription does not matter. This is why data parallelism tolerates cheap spines.';
    else if(p==='pp')note='A pipeline send is one message per GPU to the next server; like the ring it stays on its rail.';
    else note='Compare with the rail-optimised fabric and with PXN.';
    $('fab-note').textContent=note;
  }
  ['fab-f','fab-p','fab-s','fab-o','fab-x'].forEach(id=>$(id).addEventListener('change',render));
  RD.onRender(render,'t-fab');RD.onResize(render,'t-fab');render();
})();

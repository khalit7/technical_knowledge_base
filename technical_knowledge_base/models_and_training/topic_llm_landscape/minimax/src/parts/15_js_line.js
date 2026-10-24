// ---- Reading, "How the design got here": every MiniMax language model since January 2025 on one time axis, drawn at the measured width ----
(function(){
  if(!$('lnSvg'))return;
  const R={lin:'var(--c3)',full:'var(--c2)',msa:'var(--acc)',na:'var(--mute)'};
  // name, short name, date, attention route, total parameters (B, where published); the full rows are static HTML in #lnTab
  const L=[['MiniMax-Text-01','01','2025-01-15','lin',456],['MiniMax-M1','M1','2025-06-16','lin',456],['MiniMax-M2','M2','2025-10-27','full',229.9],['MiniMax-M2.1','M2.1','2025-12-22','full',229.9],['MiniMax-M2.5','M2.5','2026-02-12','full',229.9],['MiniMax-M2.7','M2.7','2026-03-18','full',229.9],['MiniMax-M3','M3','2026-06-01','msa',428],['M3.1-Flash-Preview','M3.1 Preview','2026-09-27','na',0],['M3.1 Flash','M3.1 Flash','2026-10-19','na',0]];
  let sel=-1;
  function pick(i){sel=i;draw();const d=$('lnDet');if(d)d.open=true;document.querySelectorAll('#lnTab tr[data-i]').forEach(r=>r.classList.toggle('sel',+r.dataset.i===i));const r=document.querySelector('#lnTab tr[data-i="'+i+'"]');if(r&&r.scrollIntoView)r.scrollIntoView({block:'nearest'})}
  function draw(){
    const W=RD.width($('lnSvg'))||700,narrow=W<560,pl=14,pr=14,t0=Date.UTC(2024,11,1),t1=Date.UTC(2026,10,15),X=d=>pl+(W-pl-pr)*(Date.parse(d)-t0)/(t1-t0),ay=118,H=172;
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ay+'" y2="'+ay+'" stroke="var(--line)"/>';
    for(let y=2025;y<=2026;y++)for(let q=0;q<12;q+=(narrow?6:3)){const x=X(y+'-'+String(q+1).padStart(2,'0')+'-01');if(x<pl||x>W-pr)continue;s+='<line x1="'+x+'" x2="'+x+'" y1="'+(ay-4)+'" y2="'+(ay+4)+'" stroke="var(--mute)"/>'+RD.t(x,ay+20,['Jan','Apr','Jul','Oct'][q/3]+(q===0?' '+y:''),{a:'middle',fs:11,fill:'var(--mute)'})}
    [['lin','2025-01-01','2025-10-27','linear hybrid'],['full','2025-10-27','2026-06-01','full attention'],['msa','2026-06-01','2026-11-15','sparse']].forEach(([r,a,b,n])=>{const x=X(a),w=X(b)-X(a);s+='<rect x="'+x+'" y="'+(ay+30)+'" width="'+w+'" height="14" rx="2" fill="'+R[r]+'" opacity=".22"/>'+RD.t(x+w/2,ay+41,n,{a:'middle',fs:11})});
    L.forEach((m,i)=>{const x=X(m[2]),rad=m[4]?3+Math.sqrt(m[4])*0.45:5,tier=i%3,ty=ay-24-tier*26,lab=m[1],tw=lab.length*6.6,tx=Math.max(pl+tw/2,Math.min(W-pr-tw/2,x));
      s+='<g class="lnd" data-i="'+i+'" style="cursor:pointer"><line x1="'+x+'" x2="'+x+'" y1="'+(ty+4)+'" y2="'+(ay-rad)+'" stroke="var(--line)"/><circle cx="'+x+'" cy="'+ay+'" r="'+rad+'" fill="'+R[m[3]]+'" opacity="'+(i===sel?1:.7)+'" stroke="'+(i===sel?'var(--ink)':'none')+'" stroke-width="2"/>'+RD.t(tx,ty,lab,{a:'middle',fs:11.5,w:i===sel?700:400})+'<title>'+m[0]+', '+m[2]+'</title></g>'});
    $('lnSvg').innerHTML=RD.svg(W,H,s,'Timeline of MiniMax language models by attention route');
    $('lnSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>pick(+g.dataset.i)))}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

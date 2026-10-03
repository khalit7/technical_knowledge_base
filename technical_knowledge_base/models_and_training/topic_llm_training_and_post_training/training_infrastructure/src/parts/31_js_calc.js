// ---- Goodput calculator tab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('cG'))return;
  // log sliders: position 0..1000 <-> value
  const lg=(lo,hi)=>({to:p=>lo*Math.pow(hi/lo,p/1000),from:v=>Math.round(1000*Math.log(v/lo)/Math.log(hi/lo))});
  const SG=lg(64,262144),SR=lg(0.5,20),SW=lg(1,1800),SI=lg(1,1440);
  const st={g:16384,r:+(419/(2048*54)*1000).toFixed(2),w:10,u:10,opt:true,i:60};
  const fmtN=n=>Math.round(n).toLocaleString('en-US');
  const fmtS=s=>s<60?(s<10?s.toFixed(1):Math.round(s))+' s':IM.fmtMin(s/60);
  // core: minutes; r per 1000 server-days; returns everything shown
  function model(g,r,wS,u0,optI,iMin){const nodes=g/8,perDay=nodes*r/1000,mtbf=1440/perDay,w=wS/60;
    const dOpt=IM.dtOpt(mtbf,w),dt=optI?dOpt:iMin,e=IM.ettr(mtbf,w,u0,dt),den=1+w/dt;
    return {nodes,perDay,mtbf,w,dOpt,dt,e,stall:(w/dt)/den,rework:(dt/2/mtbf)/den,restart:(u0/mtbf)/den}}
  window.IM.calc=model; // read by check_page.mjs
  function sync(){
    $('cG').value=SG.from(st.g);$('cGv').textContent=fmtN(st.g)+' ('+fmtN(st.g/8)+' servers)';
    $('cR').value=SR.from(st.r);$('cRv').textContent=st.r.toFixed(2);
    $('cW').value=SW.from(st.w);$('cWv').textContent=fmtS(st.w);
    $('cU').value=st.u;$('cUv').textContent=st.u+' min';
    $('cOpt').checked=st.opt;$('cI').disabled=st.opt;
    const m=model(st.g,st.r,st.w,st.u,st.opt,st.i);if(st.opt)st.i=m.dt;
    $('cI').value=SI.from(m.dt);$('cIv').textContent=IM.fmtMin(m.dt)+(st.opt?' (optimal)':'');
    const lostH=st.g*24*(1-Math.max(0,m.e));
    $('cOut').innerHTML=[
      RD.stat('Failures per day',m.perDay.toFixed(2),'= '+fmtN(st.g/8)+' servers × '+st.r.toFixed(2)+' / 1,000'),
      RD.stat('Job MTBF',IM.fmtMin(m.mtbf),'1 / failures per minute'),
      RD.stat('Optimal interval',IM.fmtMin(m.dOpt),'√(2 × '+fmtS(st.w)+' × MTBF)'),
      RD.stat('Effective training time',m.e>0?(100*m.e).toFixed(1)+'%':'0% (formula below zero)',st.opt?'at the optimal interval':'at '+IM.fmtMin(m.dt)),
      RD.stat('GPU-hours lost per day',m.e>0?fmtN(lostH):fmtN(st.g*24),'GPUs × 24 × (1 − ETTR)')].join('');
    const tot=m.stall+m.rework+m.restart,pc=x=>(100*x).toFixed(1)+'%',W=x=>(tot>0?Math.max(0,100*x/tot):0)+'%';
    $('cSplit').innerHTML='<div class="small" style="margin:4px 0">Where the lost '+pc(Math.min(1,tot))+' goes: pauses '+pc(m.stall)+', redone work '+pc(m.rework)+', restarts '+pc(m.restart)+'</div><div class="sb" role="img" aria-label="Split of lost time"><span style="background:var(--c5);width:'+W(m.stall)+'"></span><span style="background:var(--bad);width:'+W(m.rework)+'"></span><span style="background:var(--mute);width:'+W(m.restart)+'"></span></div>';
    chartN();chartI(m);size();repro()}
  // ---- chart helpers ----
  function frame(W,H,L,R,T,B){return {x0:L,x1:W-R,y0:T,y1:H-B}}
  function chartN(){const host=$('cChartN'),W=Math.max(280,RD.width(host)),H=230,f=frame(W,H,40,10,10,34);
    const lx=v=>f.x0+(Math.log(v/64)/Math.log(262144/64))*(f.x1-f.x0),ly=e=>f.y1-Math.max(0,Math.min(1,e))*(f.y1-f.y0);
    let o='';[0,.25,.5,.75,.9,1].forEach(e=>{o+='<line x1="'+f.x0+'" x2="'+f.x1+'" y1="'+ly(e)+'" y2="'+ly(e)+'" stroke="var(--line)"'+(e===.9?' stroke-dasharray="3 3"':'')+'/><text x="'+(f.x0-4)+'" y="'+(ly(e)+4)+'" text-anchor="end" fill="var(--mute)">'+Math.round(e*100)+'%</text>'});
    const ticks=W<500?[64,1024,16384,262144]:[64,256,1024,4096,16384,65536,262144];
    ticks.forEach(v=>{o+='<text x="'+lx(v)+'" y="'+(f.y1+14)+'" text-anchor="'+(v===64?'start':v===262144?'end':'middle')+'" fill="var(--mute)">'+(v>=1024?Math.round(v/1024)+'K':v)+'</text>'});
    o+='<text x="'+((f.x0+f.x1)/2)+'" y="'+(H-4)+'" text-anchor="middle" fill="var(--mute)">GPUs (log scale)</text>';
    const line=(wS,col,opt)=>{let d='';for(let k=0;k<=120;k++){const g=64*Math.pow(262144/64,k/120);const m=model(g,st.r,wS,st.u,opt,st.i);d+=(k?'L':'M')+lx(g).toFixed(1)+' '+ly(m.e).toFixed(1)}
      return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2"/>'};
    o+=line(st.w,'var(--acc)',st.opt).replace('stroke-width="2"','stroke-width="4" opacity=".55"')+line(300,'var(--bad)',true)+line(10,'var(--good)',true);
    const cm=model(st.g,st.r,st.w,st.u,st.opt,st.i);o+='<circle cx="'+lx(st.g)+'" cy="'+ly(cm.e)+'" r="4.5" fill="var(--acc)"/>';
    // published points
    const pt=(g,e,lab,arrow)=>{const X=lx(g),Y=ly(e);let s='<rect x="'+(X-4)+'" y="'+(Y-4)+'" width="8" height="8" fill="none" stroke="var(--ink)" stroke-width="1.5"/>';
      if(arrow)s+='<path d="M'+X+' '+(Y-6)+' l0 -12 m-4 4 l4 -4 l4 4" fill="none" stroke="var(--ink)"/>';
      s+='<text x="'+(X+(X>f.x1-80?-8:8))+'" y="'+(Y+(arrow?12:-6))+'" text-anchor="'+(X>f.x1-80?'end':'start')+'" fill="var(--ink)">'+lab+'</text>';return s};
    o+=pt(16384,.9,'Llama 3',true)+pt(9600,.97,'ByteRobust',false);
    host.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Effective training time against GPUs">'+o+'</svg>'}
  function chartI(m){const host=$('cChartI'),W=Math.max(280,RD.width(host)),H=200,f=frame(W,H,40,10,10,34);
    const lx=v=>f.x0+(Math.log(v)/Math.log(1440))*(f.x1-f.x0),ly=e=>f.y1-Math.max(0,Math.min(1,e))*(f.y1-f.y0);
    let o='';[0,.25,.5,.75,1].forEach(e=>{o+='<line x1="'+f.x0+'" x2="'+f.x1+'" y1="'+ly(e)+'" y2="'+ly(e)+'" stroke="var(--line)"/><text x="'+(f.x0-4)+'" y="'+(ly(e)+4)+'" text-anchor="end" fill="var(--mute)">'+Math.round(e*100)+'%</text>'});
    [[1,'1 min'],[10,'10 min'],[60,'1 h'],[360,'6 h'],[1440,'24 h']].forEach(([v,l])=>{o+='<text x="'+lx(v)+'" y="'+(f.y1+14)+'" text-anchor="'+(v===1?'start':v===1440?'end':'middle')+'" fill="var(--mute)">'+l+'</text>'});
    o+='<text x="'+((f.x0+f.x1)/2)+'" y="'+(H-4)+'" text-anchor="middle" fill="var(--mute)">checkpoint interval (log scale)</text>';
    let d='';for(let k=0;k<=150;k++){const dt=Math.pow(1440,k/150);const e=IM.ettr(m.mtbf,m.w,st.u,dt);d+=(k?'L':'M')+lx(dt).toFixed(1)+' '+ly(e).toFixed(1)}
    o+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    if(m.dOpt>=1&&m.dOpt<=1440)o+='<line x1="'+lx(m.dOpt)+'" x2="'+lx(m.dOpt)+'" y1="'+f.y0+'" y2="'+f.y1+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    if(m.dt>=1&&m.dt<=1440)o+='<circle cx="'+lx(m.dt)+'" cy="'+ly(m.e)+'" r="4.5" fill="var(--c5)"/>';
    host.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Effective training time against checkpoint interval">'+o+'</svg>'}
  function size(){const P=+$('kP').value*1e9,B=+$('kB').value,S=+$('kS').value;
    if(!(P>0&&S>0)){$('kOut').innerHTML='';return}
    const tb=P*B/1e12,perGpu=P*B/st.g/1e6,floor=tb/S;
    $('kOut').innerHTML=RD.stat('Checkpoint size',(tb<1?(tb*1000).toFixed(0)+' GB':tb.toFixed(2)+' TB'),'parameters × '+B+' bytes')+
      RD.stat('Per GPU',perGpu<1000?perGpu.toFixed(perGpu<10?1:0)+' MB':(perGpu/1000).toFixed(2)+' GB','spread evenly over '+fmtN(st.g)+' GPUs')+
      RD.stat('Write floor',fmtS(floor),'size / bandwidth; the real pause is longer')}
  function repro(){const L=model(16384,419/(2048*54)*1000,10,10,true),R1=model(16384,6.5,10,10,true),R2=model(131072,6.5,10,10,true),M5=model(12000,6.5,10,5,true),M10=model(12000,6.5,10,10,true);
    $('cRepro').innerHTML=[
      'Llama 3 preset: '+L.perDay.toFixed(2)+' failures a day × 54 days = '+Math.round(L.perDay*54)+' interruptions, Table 5\'s 419 <i class="nl d">by construction</i> (the rate is back-solved from it: 419 / (2,048 servers × 54 days) = 3.79 per 1,000).',
      'Meta RSC-1 rate (6.50): job MTBF '+(R1.mtbf/60).toFixed(2)+' h at 16,384 GPUs and '+(R2.mtbf/60).toFixed(3)+' h at 131,072, the paper\'s projected 1.8 h and 0.23 h <i class="nl d">independently</i> (<a href="https://arxiv.org/abs/2410.21680" target="_blank" rel="noopener noreferrer">Kokolis et al.</a>).',
      'Llama 3\'s "higher than 90% effective training time": the defaults (10-second pause, 10-minute restart) give '+(100*L.e).toFixed(1)+'% <i class="nl i">by construction</i>; the paper does not report its pause or restart time, so these are one setting that clears 90%, not Meta\'s.',
      'Meta\'s "ETTR 0.9 at 12,000 GPUs needs ~10 s checkpoint writes": at 6.50 and a 10-second pause the formula gives '+M5.e.toFixed(2)+' with a 5-minute restart and '+M10.e.toFixed(2)+' with 10 <i class="nl d">derived</i>; the paper does not state the restart time behind its sentence, so this reproduces it only for restarts near 5 to 10 minutes.'
    ].map(x=>'<li>'+x+'</li>').join('')}
  // ---- wiring ----
  $('cG').addEventListener('input',e=>{st.g=Math.round(SG.to(+e.target.value));sync()});
  $('cR').addEventListener('input',e=>{st.r=+SR.to(+e.target.value).toFixed(2);sync()});
  $('cW').addEventListener('input',e=>{const v=SW.to(+e.target.value);st.w=v<10?+v.toFixed(1):Math.round(v);sync()});
  $('cU').addEventListener('input',e=>{st.u=+e.target.value;sync()});
  $('cOpt').addEventListener('change',e=>{st.opt=e.target.checked;sync()});
  $('cI').addEventListener('input',e=>{st.opt=false;st.i=SI.to(+e.target.value);sync()});
  $('cGp').addEventListener('click',e=>{const b=e.target.closest('button');if(b){st.g=+b.dataset.g;sync()}});
  $('cRp').addEventListener('click',e=>{const b=e.target.closest('button');if(b){st.r=+b.dataset.r;sync()}});
  $('cWp').addEventListener('click',e=>{const b=e.target.closest('button');if(b){st.w=+b.dataset.w;sync()}});
  ['kP','kB','kS'].forEach(id=>$(id).addEventListener('input',size));
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-calc']=window.TAB_RENDER['t-calc']||[]).push(sync);
  addEventListener('resize',()=>{if($('t-calc').offsetParent)sync()});
  sync();
})();

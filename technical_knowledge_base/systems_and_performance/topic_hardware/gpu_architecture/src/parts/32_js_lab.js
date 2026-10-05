// ---- M1 GPU lab tab: measured curves (window.GA.m1), sized from the measured container width ----
(function(){
  const G=window.GA,M=G.m1,$=id=>document.getElementById(id);
  $('lb-meta').textContent='Apple M1 Pro, 16-core GPU ('+M.chase.length+' sizes, '+M.stream.length+' thread counts); '+M.versions+'; runs on '+[...new Set(M.dates)].join(', ')+'; load average during runs '+M.load_min+' to '+M.load_max+' (other agents were using the machine).';
  const nice=v=>v>=1e6?(v/1048576)+' MB':v>=1024?(v/1024)+' KB':v+' B';
  // generic chart: log2 x, linear y
  function chart(el,o){
    const W=Math.min(860,RD.width(el)),H=o.h||230,L=W<400?40:48,R=22,T=14,B=38,pw=W-L-R,ph=H-T-B;
    const xs=o.series[0].pts.map(p=>p[0]),x0=Math.log2(Math.min(...xs)),x1=Math.log2(Math.max(...xs));
    const ymax=o.ymax||Math.max(...o.series.flatMap(s=>s.pts.map(p=>p[3]!=null?p[3]:p[1])))*1.08;
    const X=x=>L+(o.lin?(x-xs[0])/(xs[xs.length-1]-xs[0]):(Math.log2(x)-x0)/(x1-x0))*pw,Y=y=>T+ph-(y/ymax)*ph;
    let g='';
    const yt=o.yticks||[0,.25,.5,.75,1].map(f=>Math.round(ymax*f/10)*10);
    yt.forEach(v=>{if(v>ymax)return;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})});
    const step=Math.max(1,Math.ceil(xs.length/(W<420?5:9)));
    xs.forEach((x,i)=>{const last=xs.length-1;if((i%step&&i!==last)||(i!==last&&i%step===0&&last-i<step))return;g+=RD.t(X(x),H-B+14,o.xf(x),{a:'middle',fs:9.5,fill:'var(--mute)'})});
    g+=RD.t(L+pw/2,H-6,o.xl,{a:'middle',fs:10.5});
    g+='<text transform="translate(11,'+(T+ph/2)+') rotate(-90)" text-anchor="middle" font-size="10.5">'+o.yl+'</text>';
    (o.refs||[]).forEach(r=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(r.y)+'" y2="'+Y(r.y)+'" stroke="var(--c4)" stroke-dasharray="4 3"/>'+RD.t(W-R-2,Y(r.y)-3,r.l,{a:'end',fs:9.5,fill:'var(--c4)'})});
    o.series.forEach(s=>{
      g+='<polyline fill="none" stroke="'+s.c+'" stroke-width="2" points="'+s.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      s.pts.forEach(p=>{if(p[2]!=null)g+='<line x1="'+X(p[0])+'" x2="'+X(p[0])+'" y1="'+Y(p[2])+'" y2="'+Y(Math.min(p[3],ymax))+'" stroke="'+s.c+'" opacity=".6"/>';
        g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="3" fill="'+s.c+'"><title>'+o.xf(p[0])+': '+p[1]+'</title></circle>'});
    });
    if(o.title)g+=RD.t(L,10,o.title,{fs:11,w:600});
    el.innerHTML=RD.svg(W,H,g,o.title||o.yl);
  }
  function render(){
    const lv=G.luo_ns.H800;
    chart($('lb-chase'),{series:[{pts:M.chase,c:'var(--c1)'}],xf:nice,xl:'buffer size (log scale)',yl:'ns per dependent load',h:260,
      refs:$('lb-ref').checked?[{y:lv.smem,l:'H800 shared '+lv.smem},{y:lv.l2,l:'H800 L2 '+lv.l2},{y:lv.glob,l:'H800 HBM '+lv.glob}]:[]});
    chart($('lb-stream'),{series:[{pts:M.stream,c:'var(--c3)'}],xf:v=>v>=1024?(v/1024)+'K':v,xl:'threads (log scale)',yl:'GB/s',title:'Coalesced read',h:220});
    chart($('lb-little'),{series:[{pts:M.little,c:'var(--c2)'}],xf:v=>v>=1024?(v/1024)+'K':v,xl:'threads (log scale)',yl:'million loads / s',title:'Pointer chase',h:220});
    chart($('lb-smem'),{series:[{pts:M.smem,c:'var(--c4)'}],xf:v=>v<1?v:v+'',xl:'KB of threadgroup memory reserved per 64-thread group',yl:'GB/s',lin:true,h:230});
  }
  $('lb-ref').addEventListener('change',render);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(render);
  RD.onResize(render,'t-lab');
})();

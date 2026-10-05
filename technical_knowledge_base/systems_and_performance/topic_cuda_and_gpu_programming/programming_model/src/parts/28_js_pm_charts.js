// ---- Reading s5 and s8: measured charts (Apple M1 Pro GPU) ----
(function(){
  const P=window.PM.m1;
  function stair(){const fig=document.getElementById('pm-st-fig');if(!fig)return;
    const W=Math.min(RD.width(fig),760),h=230,l=44,r=10,t=10,bt=36,pw=W-l-r,ph=h-t-bt;
    const n=P.waves_ms.length,ymax=Math.ceil(Math.max(...P.waves_ms,...P.waves_runs.flat().filter(v=>v<10))+0.5);
    const X=g=>l+(g-0.5)/n*pw,Y=v=>t+ph-(Math.min(v,ymax)/ymax)*ph;
    let b='';
    for(let y=0;y<=ymax;y+=2){b+='<line x1="'+l+'" x2="'+(l+pw)+'" y1="'+Y(y)+'" y2="'+Y(y)+'" stroke="var(--line)"></line>'+RD.t(l-5,Y(y)+4,y,{a:'end',fs:10,fill:'var(--mute)'})}
    [16,32,48,64].forEach(g=>{b+='<line x1="'+(l+g/n*pw)+'" x2="'+(l+g/n*pw)+'" y1="'+t+'" y2="'+(t+ph)+'" stroke="var(--line)" stroke-dasharray="3 3"></line>'});
    [1,16,32,48,64,72].forEach(g=>{b+=RD.t(X(g),t+ph+14,g,{a:'middle',fs:10,fill:'var(--mute)'})});
    b+=RD.t(l+pw/2,h-4,'threadgroups of 1,024 threads launched',{a:'middle',fs:10.5,fill:'var(--mute)'});
    b+=RD.t(4,t+8,'ms',{fs:10,fill:'var(--mute)'});
    P.waves_runs.forEach(run=>run.forEach((v,g)=>{if(v<ymax)b+='<circle cx="'+X(g+1)+'" cy="'+Y(v)+'" r="1.8" style="fill:var(--mute);opacity:.5"></circle>'}));
    let d='';P.waves_ms.forEach((v,g)=>{d+=(g?'L':'M')+X(g+1).toFixed(1)+' '+Y(v).toFixed(1)});
    b+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"></path>';
    fig.innerHTML=RD.svg(W,h,b,'Kernel time against number of threadgroups, M1 Pro')}
  function launch(){const fig=document.getElementById('pm-lc-fig');if(!fig)return;
    const L=P.launch,W=Math.min(RD.width(fig),760),lw=Math.min(170,W*0.42),h=74,mx=L.us_wait_each;
    const rows=[['Launch, then wait',L.us_wait_each,'var(--c2)'],['Queued, wait once',L.us_per_queued,'var(--c1)']];
    let b='';rows.forEach((r,i)=>{const y=6+i*32,bw=Math.max(2,(W-lw-60)*r[1]/mx);
      b+=RD.t(lw-6,y+15,r[0],{a:'end',fs:11.5});b+='<rect x="'+lw+'" y="'+y+'" width="'+bw+'" height="20" rx="3" style="fill:'+r[2]+'"></rect>';
      b+=RD.t(lw+bw+5,y+15,r[1]+' µs',{fs:11.5,w:600})});
    fig.innerHTML=RD.svg(W,h,b,'Microseconds per kernel launch, M1 Pro through MLX')}
  const all=()=>{stair();launch()};
  RD.onRender(all);RD.onResize(all);all();
})();

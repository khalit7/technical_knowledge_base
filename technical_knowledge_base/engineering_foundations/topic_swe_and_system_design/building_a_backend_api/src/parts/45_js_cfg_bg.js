// ---- Reading, sections 7 and 8: the settings precedence ladder and the background-work timelines (measured; API_DATA.runs) ----
(function(){
  const el=document.getElementById('rd-cfg-svg');if(!el)return;
  const L=window.API_DATA.runs.settings.layers,esc=RD.esc;
  function draw(){const W=RD.width(el),pad=8,rh=28,g=6,nar=W<520;let b='';const n=L.length;
    // highest priority on top: reverse the order the sources were added
    L.slice().reverse().forEach((l,i)=>{const y=4+i*(rh+g),win=i===0;
      b+='<rect x="'+pad+'" y="'+y+'" width="'+(W-2*pad)+'" height="'+rh+'" rx="6" fill="'+(win?'var(--acc2)':'var(--soft)')+'" stroke="'+(win?'var(--acc)':'var(--line)')+'"/>';
      b+=RD.t(pad+8,y+18,(n-i)+'. '+esc(l.added),{fs:12,fill:'var(--ink)',w:600});
      b+=RD.t(W-pad-8,y+18,(nar?'':'read: ')+'"'+esc(l.model_name)+'"',{fs:12,fill:'var(--ink)',a:'end'})});
    el.innerHTML=RD.svg(W,4+n*(rh+g),b,'Five setting sources stacked by priority, each with the value read after adding it')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
(function(){
  const el=document.getElementById('rd-bg-svg');if(!el)return;
  const B=window.API_DATA.runs.bg;
  function draw(){const W=RD.width(el),pad=8,lab=W<520?0:150,x0=pad+lab,x1=W-pad-10,max=600,sc=t=>x0+(x1-x0)*t/max;let b='';
    const rows=[['Inline',[[0,B['/inline'],'var(--c1)','client waits '+B['/inline']+' ms']]],
      ['BackgroundTasks',[[0,B['/bg'],'var(--c1)','answered in '+B['/bg']+' ms'],[B['/bg'],B['/bg']+B.bg_done_after_response_ms,'var(--c5)','same process: work done '+B.bg_done_after_response_ms+' ms later']]],
      ['Queue (drawn)',[[0,6,'var(--c1)','enqueue and answer'],[20,520,'var(--c4)','another process does the work; survives a restart']]]];
    let y=lab?6:18;
    rows.forEach(r=>{b+=lab?RD.t(pad,y+24,r[0],{fs:12,fill:'var(--ink)',w:600}):RD.t(pad,y-4,r[0],{fs:12,fill:'var(--ink)',w:600});
      r[1].forEach((s,j)=>{const yy=y+j*32;b+='<rect x="'+sc(s[0])+'" y="'+yy+'" width="'+Math.max(3,sc(s[1])-sc(s[0]))+'" height="12" fill="'+s[2]+'"/>'+RD.t(sc(s[0]),yy+25,s[3],{fs:11,fill:'var(--ink)'})});
      y+=r[1].length*32+(lab?8:22)});
    [0,100,200,300,400,500,600].forEach(t=>{if(W<520&&t%200)return;b+=RD.t(sc(t),y+6,t+' ms',{fs:11,fill:'var(--mute)',a:t?(t===600?'end':'middle'):'start'})});
    el.innerHTML=RD.svg(W,y+12,b,'Timelines of the same follow-up work done inline, in BackgroundTasks, and on a queue')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();

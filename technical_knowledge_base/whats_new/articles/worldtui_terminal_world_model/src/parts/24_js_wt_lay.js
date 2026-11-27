// Fig. 3: exact memory readbacks (of 64) for the distillation teacher, the teacher without layer 7 and two students,
// with the other number the post gives for each. Numbers transcribed from the post's "Distilling" (also in the caption).
(function(){
  const el=document.getElementById('wt-lay-svg');if(!el||!window.RD)return;
  const D=[
    {n:'Teacher, 24 layers',m:64,o:'next-token 99.3% · ShellBench 78'},
    {n:'Teacher without layer 7',m:0,o:'next-token 98.9% · no retraining'},
    {n:'12-layer student',m:31,o:'chance: right value half the time'},
    {n:'16-layer student, keeps 1, 7, 15, 22',m:64,o:'ShellBench 65 · also at 4-bit'}];
  window.WT_LAY=D;
  function draw(){
    const W=RD.width(el),x0=8,bw=W-16,rowH=58,top=4,H=top+D.length*rowH+18;
    let s='';
    D.forEach((d,i)=>{const y=top+i*rowH;
      s+=RD.t(x0,y+14,RD.esc(d.n),{fs:12.5,w:600});
      s+='<rect x="'+x0+'" y="'+(y+20)+'" width="'+bw+'" height="14" rx="3" fill="var(--dim)" fill-opacity=".4"/>';
      if(d.m>0)s+='<rect x="'+x0+'" y="'+(y+20)+'" width="'+(bw*d.m/64)+'" height="14" rx="3" fill="'+(d.m===64?'var(--c3)':'var(--c2)')+'"/>';
      const lab=d.m+' of 64';
      s+=d.m>=40?RD.t(x0+bw*d.m/64-6,y+31.5,lab,{fs:11.5,a:'end',fill:'#fff',w:600}):RD.t(x0+bw*d.m/64+6,y+31.5,lab,{fs:11.5,w:600,fill:d.m===0?'var(--bad)':'var(--ink)'});
      s+=RD.t(x0,y+50,RD.esc(d.o),{fs:11.5,fill:'var(--mute)'})});
    s+=RD.t(x0,H-4,'bar: exact memory readbacks, 32 worlds × 2 files',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Memory readbacks of 64 for four models')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();

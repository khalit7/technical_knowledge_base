// ---- Reading: "Silence has four causes" (static sequence diagrams, one per cause; the app server's view is identical) ----
(function(){
  const el=document.getElementById('rd-net-svg'),cap=document.getElementById('rd-net-cap');if(!el)return;
  const S=[
    {k:'Request lost',w:false,c:'The request never arrived (a dropped packet, a cut link). The database never saw it: <b>the write did not happen</b>.'},
    {k:'Server crashed',w:null,c:'The database received it and crashed, before or after saving. <b>Maybe it happened</b>: after a restart the row may or may not be there.'},
    {k:'Server slow',w:true,c:'The database is alive but busy (a long garbage-collection pause, a full disk queue). It answers after the timeout. <b>The write happened</b>; the client already gave up.'},
    {k:'Reply lost',w:true,c:'The database saved "hello" and replied, and the reply was dropped. <b>The write happened</b>, and the client thinks it failed. A blind retry now saves "hello" twice.'}];
  let m=0;
  function draw(){
    const W=Math.min(640,RD.width(el)),H=200,a=70,b=W-70,t0=40,to=160;const s=S[m];
    const ink='var(--ink)',mu='var(--mute)',bad='var(--bad)',good='var(--good)';
    let g='';
    g+=RD.t(a,18,'App server',{a:'middle',fs:12,w:600})+RD.t(b,18,'Database',{a:'middle',fs:12,w:600});
    g+='<line x1="'+a+'" y1="26" x2="'+a+'" y2="'+(H-8)+'" stroke="'+mu+'" stroke-width="1.5"/>';
    g+='<line x1="'+b+'" y1="26" x2="'+b+'" y2="'+(H-8)+'" stroke="'+mu+'" stroke-width="1.5"/>';
    const arrow=(x1,y1,x2,y2,c,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+'/>'+
      '<circle cx="'+x2+'" cy="'+y2+'" r="3.5" fill="'+c+'"/>';
    const mid=(a+b)/2;
    if(m===0){g+=arrow(a,t0,mid,t0+22,ink)+RD.t(mid+6,t0+26,'✕ lost',{fs:11,fill:bad})}
    else g+=arrow(a,t0,b,t0+30,ink);
    g+=RD.t(a+8,t0-6,'save "hello"',{fs:11});
    if(m===1){g+=RD.t(b-6,t0+52,'crash',{a:'end',fs:11,fill:bad})+'<line x1="'+(b-8)+'" y1="'+(t0+38)+'" x2="'+(b+8)+'" y2="'+(t0+54)+'" stroke="'+bad+'" stroke-width="2"/><line x1="'+(b+8)+'" y1="'+(t0+38)+'" x2="'+(b-8)+'" y2="'+(t0+54)+'" stroke="'+bad+'" stroke-width="2"/>'}
    if(m===2){g+='<rect x="'+(b-5)+'" y="'+(t0+32)+'" width="10" height="'+(to-t0)+'" fill="'+mu+'" opacity=".35"/>'+RD.t(b-10,t0+80,'busy',{a:'end',fs:11,fill:mu})+arrow(b,to+12,a+40,H-12,good,true)+RD.t(a+44,H-16,'reply arrives too late',{fs:11,fill:mu})}
    if(m===3){g+=RD.t(b-8,t0+48,'saved',{a:'end',fs:11,fill:good})+arrow(b,t0+56,mid,t0+80,good)+RD.t(mid-6,t0+92,'reply lost ✕',{a:'end',fs:11,fill:bad})}
    g+='<line x1="'+(a-6)+'" y1="'+to+'" x2="'+(a+40)+'" y2="'+to+'" stroke="'+bad+'" stroke-width="2"/>'+RD.t(a+44,to+4,'timeout fires',{fs:11,fill:bad});
    g+='<rect x="2" y="'+(t0+4)+'" width="'+(a-14)+'" height="'+(to-t0-12)+'" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(a/2-4,t0+70,'silence',{a:'middle',fs:11,fill:mu});
    el.innerHTML=RD.svg(W,H,g,'Sequence diagram: '+s.k);
    cap.innerHTML='<b>'+s.k+'.</b> '+s.c+' <span class="mute">The app server\'s side (left) is the same in all four: a request, silence, a timeout.</span>';
  }
  RD.seg(document.getElementById('rd-net-seg'),v=>{m=+v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();

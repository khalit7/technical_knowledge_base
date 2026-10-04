// ---- Reading: quorum overlap (N, R, W). The write lands on the first W replicas; the read is drawn taking the worst R (the last R). ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-q-card'))return;
  const n=$('rd-q-n'),w=$('rd-q-w'),r=$('rd-q-r');
  function clamp(){const N=+n.value;w.max=N;r.max=N;if(+w.value>N)w.value=N;if(+r.value>N)r.value=N}
  function draw(){
    clamp();const N=+n.value,W=+w.value,R=+r.value,ov=Math.max(0,R+W-N),ok=R+W>N;
    $('rd-q-nv').textContent=N;$('rd-q-wv').textContent=W;$('rd-q-rv').textContent=R;
    const el=$('rd-q-svg'),Wd=Math.min(640,RD.width(el)),H=120,step=Math.min(80,(Wd-20)/N),x0=(Wd-step*N)/2+step/2,rad=Math.min(24,step/2-6);
    let g='';
    for(let i=0;i<N;i++){const x=x0+i*step,y=40,has=i<W,read=i>=N-R;
      g+='<circle cx="'+x+'" cy="'+y+'" r="'+rad+'" fill="'+(has?'var(--open2)':'var(--soft)')+'" stroke="'+(has?'var(--good)':'var(--line)')+'" stroke-width="2"/>';
      g+=RD.t(x,y+4,has?'v2':'v1',{a:'middle',fs:12,w:600,fill:has?'var(--good)':'var(--mute)'});
      if(read){g+='<rect x="'+(x-rad-4)+'" y="'+(y-rad-4)+'" width="'+(2*rad+8)+'" height="'+(2*rad+8)+'" rx="6" fill="none" stroke="'+(has?'var(--acc)':'var(--bad)')+'" stroke-width="2" stroke-dasharray="4 3"/>'}
      g+=RD.t(x,y+rad+20,'r'+(i+1),{a:'middle',fs:11,fill:'var(--mute)'});}
    el.innerHTML=RD.svg(Wd,H,g,'Quorum diagram');
    $('rd-q-out').innerHTML=RD.stat('R + W vs N',(R+W)+(ok?' &gt; ':' ≤ ')+N,ok?'quorums overlap':'they can miss each other')+
      RD.stat('Overlap, at least',ov+(ov===1?' replica':' replicas'),'R + W − N')+
      RD.stat('Writes still work with',(N-W)+' down','N − W')+RD.stat('Reads still work with',(N-R)+' down','N − R');
    $('rd-q-cap').innerHTML='<span class="mute">Green: holds the latest write (v2), confirmed by W = '+W+'. Dashed box: the R = '+R+' replicas the read hears from, drawn as the worst case.</span><br>'+(ok?'<span class="verd y">read sees v2</span> Even reading the worst replicas, '+ov+' of them hold the latest write, and the read keeps the newest version it hears.':
      '<span class="verd n">read can return v1</span> The read can hear only from replicas the write never reached, and returns the old value although the write "succeeded".');
  }
  [n,w,r].forEach(e=>e.addEventListener('input',draw));
  $('rd-q-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=b.dataset.p.split(',');n.value=p[0];clamp();w.value=p[1];r.value=p[2];draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();

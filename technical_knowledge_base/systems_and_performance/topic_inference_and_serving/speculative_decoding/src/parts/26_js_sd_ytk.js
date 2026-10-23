// ---- Reading section 4: expected tokens per target pass for k = 1 to 8 at one acceptance alpha (slider), with the cap 1/(1 - alpha).
// Default alpha 0.8 lands on the worked example: k = 4 gives 3.36 (derived from the formula, no measurement).
(function(){
  const el=document.getElementById('sd-ytk-svg'),sl=document.getElementById('sd-ytk-a');if(!el||!sl)return;
  function draw(){
    const a=+sl.value,ks=[1,2,3,4,5,6,7,8],cap=1/(1-a),W=Math.max(280,Math.min(860,RD.width(el))),H=210,L=40,R=10,T=16,B=34;
    const ymax=Math.max(9,cap*1.05),fy=v=>H-B-(v/ymax)*(H-T-B),bw=(W-L-R)/ks.length;
    let s='';
    [0,2,4,6,8].filter(v=>v<=ymax).forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+fy(v)+'" y2="'+fy(v)+'" stroke="var(--line)"/>'+RD.t(L-5,fy(v)+4,String(v),{a:'end',fs:10.5,fill:'var(--mute)'})});
    ks.forEach((k,i)=>{const e=SD.etok(a,k),x=L+i*bw+bw*0.15,w=bw*0.7,hl=k===4;
      s+='<rect x="'+x.toFixed(1)+'" y="'+fy(k+1).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(fy(0)-fy(k+1)).toFixed(1)+'" fill="none" stroke="var(--dim)" stroke-dasharray="3 3"/>';
      s+='<rect x="'+x.toFixed(1)+'" y="'+fy(e).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(fy(0)-fy(e)).toFixed(1)+'" fill="'+(hl?'var(--acc)':'var(--c1)')+'" opacity="'+(hl?1:.55)+'"/>';
      s+=RD.t((x+w/2).toFixed(1),(fy(e)-4).toFixed(1),SD.fmt(e,2),{a:'middle',fs:10.5,w:hl?600:400});
      s+=RD.t((x+w/2).toFixed(1),H-B+14,'k = '+k,{a:'middle',fs:10.5,fill:'var(--mute)'});});
    if(cap<=ymax){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+fy(cap)+'" y2="'+fy(cap)+'" stroke="var(--bad)" stroke-dasharray="6 4"/>'+RD.t(W-R-2,fy(cap)-5,'cap 1/(1 − α) = '+SD.fmt(cap,2),{a:'end',fs:11,fill:'var(--bad)'})}
    s+=RD.t(L,H-6,'guesses per step; dashed box: every guess kept (k + 1)',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'expected tokens per target pass against k');
    document.getElementById('sd-ytk-av').textContent=SD.fmt(a,2);
    document.getElementById('sd-ytk-note').innerHTML='<span class="der">derived</span> (1 &minus; &alpha;<sup>k+1</sup>)/(1 &minus; &alpha;) at &alpha; = '+SD.fmt(a,2)+': k = 4 gives '+SD.fmt(SD.etok(a,4),2)+' tokens per pass, k = 8 gives '+SD.fmt(SD.etok(a,8),2)+'; no draft length can pass '+SD.fmt(cap,2)+'. Assumes every guess is kept independently with the same &alpha;; the measured runs below test that.';
  }
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();

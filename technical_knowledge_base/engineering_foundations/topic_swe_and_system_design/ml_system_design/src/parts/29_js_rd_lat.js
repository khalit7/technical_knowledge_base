// ---- Reading, section 4: the latency budget of one chat reply, drawn to scale, one slider (output tokens) ----
// TTFT = 0.09 s prefill (derived, parent's Scale simulator) with an empty queue; TPOT = 64 / 4,418 s (4,418 tokens/s per 2-GPU replica shared by 64 streams)
window.MSD_LAT=(function(){const PREFILL=0.09,TPOT=64/4418;
  const e2e=n=>PREFILL+(n-1)*TPOT;return {PREFILL,TPOT,e2e}})();
(function(){
  const el=document.getElementById('rd-lat-svg');if(!el)return;
  const L=window.MSD_LAT,sl=document.getElementById('rd-lat-n'),nv=document.getElementById('rd-lat-nv'),out=document.getElementById('rd-lat-out');
  const MAX=L.e2e(1500);
  function draw(){const n=+sl.value,W=Math.max(280,Math.min(860,RD.width(el))),m=6,x=s=>m+(W-2*m)*s/MAX,y=26,h=26,t=L.e2e(n);let b='';
    b+='<rect x="'+x(0)+'" y="'+y+'" width="'+Math.max(2,x(L.PREFILL)-x(0))+'" height="'+h+'" fill="var(--c2)"/>';
    b+='<rect x="'+x(L.PREFILL)+'" y="'+y+'" width="'+(x(t)-x(L.PREFILL))+'" height="'+h+'" fill="var(--c1)" opacity=".85"/>';
    b+='<line x1="'+x(L.PREFILL)+'" y1="'+(y-12)+'" x2="'+x(L.PREFILL)+'" y2="'+(y+h+4)+'" stroke="var(--ink)" stroke-width="1.4"/>'+RD.t(x(L.PREFILL)+4,y-4,'first token at 0.09 s: the user sees text',{fs:11});
    b+=RD.t(Math.min(W-m,x(t)),y+h+16,'done at '+t.toFixed(1)+' s',{fs:11,a:x(t)>W*0.7?'end':'start',w:600});
    for(let s=0;s<=MAX;s+=5)b+='<line x1="'+x(s)+'" y1="'+(y+h+22)+'" x2="'+x(s)+'" y2="'+(y+h+27)+'" stroke="var(--mute)"/>'+RD.t(x(s),y+h+39,s+' s',{fs:10.5,a:s?'middle':'start',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+h+44,b,'One chat reply on a time axis: prefill until the first token, then one token every 14.5 ms');
    nv.textContent=n.toLocaleString('en-US');
    out.innerHTML=RD.stat('Time to first token','0.09 s','empty queue')+RD.stat('End to end',t.toFixed(1)+' s',(n-1)+' tokens after the first')+RD.stat('Share spent decoding',(100*(t-L.PREFILL)/t).toFixed(0)+'%','')}
  sl.addEventListener('input',draw);draw();RD.onRender(draw);RD.onResize(draw);
})();

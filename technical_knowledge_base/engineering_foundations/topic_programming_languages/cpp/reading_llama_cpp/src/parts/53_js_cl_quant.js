// ---- Quant blocks: real Q8_0 bytes, and the same 32 weights quantised as Q8_0 and Q4_0 step by step ----
(function(){
  const X=window.CLX,CL=X.CL,TAB='t-read',esc=X.esc,fmt=X.fmt;
  if(!document.getElementById(TAB)||!CL.quant||!window.RD)return;const Q=CL.quant;
  const hexBytes=h=>h.match(/../g);
  const x=Q.x,amaxI=x.reduce((b,v,i)=>Math.abs(v)>Math.abs(x[b])?i:b,0);
  const deq8=Q.q8.map(q=>Q.d8*q),deq4=Q.q4.map(q=>Q.d4*(q-8));
  const err=(a,b)=>a.map((v,i)=>v-b[i]),maxAbs=a=>Math.max(...a.map(Math.abs)),rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
  const g=v=>(v>=0?'':'−')+Math.abs(v).toPrecision(4);
  // stored bytes
  function drawHex(){const el=document.getElementById('qb-hex8');if(!el)return;const b=hexBytes(Q.hex);
    el.innerHTML=b.map((h,i)=>'<span data-i="'+i+'" class="'+(i<2?'d':'')+'">'+h+'</span>').join('');
    document.getElementById('qb-d8').textContent=b[0]+' '+b[1]+' = 0x'+b[1]+b[0]+' = '+Q.d;
    el.onclick=e=>{const s=e.target.closest('span');if(!s)return;el.querySelectorAll('span').forEach(z=>z.classList.toggle('on',z===s));const i=+s.dataset.i;
      document.getElementById('qb-hextip').innerHTML=i<2?'Byte '+i+': half of the fp16 scale d = '+Q.d+'.':'Byte '+i+' = 0x'+b[i]+' = '+Q.qs[i-2]+' as a signed 8-bit integer (two\'s complement), weight '+(i-2)+' = '+Q.d+' &times; '+Q.qs[i-2]+' = '+g(x[i-2])+'.'}}
  // the step animation
  let mode='q8';
  // the numbers the step lists (sx-qb-q8, sx-qb-q4, sx-quant) quote, computed here from the recorded block
  const QV={amaxI:String(amaxI),xmax:g(x[amaxI]),amax:g(Math.abs(x[amaxI])),d8:g(Q.d8),d4:g(Q.d4),maxerr8:fmt(maxAbs(err(x,deq8)),3),maxerr4:fmt(maxAbs(err(x,deq4)),4),rms4:fmt(rms(err(x,deq4)),4),rmsx:fmt(rms(x),4)};
  document.querySelectorAll('[data-qb]').forEach(el=>{const v=QV[el.dataset.qb];el.textContent=v==null?'?':v});
  const NSTEP=6;
  function draw(i){const svg=document.getElementById('qb-svg');if(!svg)return;const W=X.width(svg),H=230,L=6,R=6,T=10,B=34,n=32;
    const k=Math.min(i,NSTEP-1),deq=mode==='q8'?deq8:deq4,qs=mode==='q8'?Q.q8:Q.q4;
    const ymax=Math.max(maxAbs(x),maxAbs(deq))*1.1,bw=(W-L-R)/n,py=v=>T+(H-T-B)/2*(1-v/ymax),y0=py(0);let b='';
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y0+'" y2="'+y0+'" stroke="'+X.css('--line')+'"></line>';
    x.forEach((v,j)=>{const xx=L+j*bw+bw*.15,w=bw*.7;const y=Math.min(py(v),y0),h=Math.abs(py(v)-y0);
      b+='<rect data-j="'+j+'" x="'+xx.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(.5,h).toFixed(1)+'" fill="'+X.css('--c1')+'" opacity=".75"'+(k>=1&&j===amaxI?' stroke="'+X.css('--ink')+'" stroke-width="2"':'')+'><title>weight '+j+': '+g(v)+'</title></rect>';
      if(k>=3&&bw>=13)b+='<text x="'+(xx+w/2).toFixed(1)+'" y="'+(H-B+14)+'" font-size="'+(bw>=20?10.5:9)+'" text-anchor="middle" fill="'+X.css('--ink')+'">'+qs[j]+'</text>';
      if(k>=4){const yd=py(deq[j]);if(mode==='q4')b+='<line x1="'+(xx+w/2)+'" x2="'+(xx+w/2)+'" y1="'+py(v)+'" y2="'+yd+'" stroke="'+X.css('--bad')+'" stroke-width="2"></line>';
        b+='<circle cx="'+(xx+w/2).toFixed(1)+'" cy="'+yd.toFixed(1)+'" r="'+Math.min(4,bw*.25).toFixed(1)+'" fill="'+X.css('--c2')+'"></circle>'}});
    if(k>=2&&mode==='q4'){[-8,7].forEach(l=>{const y=py(l*Q.d4);b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="'+X.css('--mute')+'" stroke-dasharray="3 3"></line><text x="'+(W-R)+'" y="'+(y-3)+'" font-size="10" text-anchor="end" fill="'+X.css('--mute')+'">q = '+(l+8)+'</text>'})}
    if(k>=3&&bw<13)b+='<text x="'+L+'" y="'+(H-B+14)+'" font-size="10.5" fill="'+X.css('--mute')+'">tap a bar for its q</text>';
    svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('height',H);svg.innerHTML=b;
    const bytes=mode==='q8'?34:18,e=err(x,deq);
    document.getElementById('qb-stats').innerHTML=[['Bytes for 32 weights',k>=5?bytes:'·'],['Bits per weight',k>=5?fmt(bytes*8/32,1):'·'],['Max |error|',k>=4?fmt(maxAbs(e),4):'·'],['RMS error / RMS weight',k>=4?fmt(rms(e)/rms(x),3):'·']].map(([a,v])=>'<div><div class="k">'+a+'</div><div class="v">'+v+'</div></div>').join('');
    const out=document.getElementById('qb-out');const hb=mode==='q8'?hexBytes(Q.hex):hexBytes(Q.q4_block_hex);
    out.innerHTML=k>=5?hb.map((h,j)=>'<span class="'+(j<2?'d':'')+'">'+h+'</span>').join(''):'';
    svg.onclick=ev=>{const r=ev.target.closest('rect');if(!r)return;const j=+r.dataset.j;document.getElementById('qb-cap').innerHTML='<span class="small">Weight '+j+': x = '+g(x[j])+(k>=3?', q = '+qs[j]:'')+(k>=4?', dequantised '+g(deq[j])+', error '+g(x[j]-deq[j]):'')+'</span>'}}
  const an=RD.anim({card:'qb-card',ctl:'qb-ctl',n:NSTEP,ms:4200,draw,label:'Step',list:'sx-qb-q8'});
  RD.seg(document.getElementById('qb-mode'),m=>{mode=m;['q8','q4'].forEach(x=>{document.getElementById('sx-qb-'+x).hidden=x!==m});document.getElementById('qb-cap').textContent='Tap a bar for its numbers.';an.reset(NSTEP,'sx-qb-'+m)});
  function render(){drawHex();an.redraw()}
  X.onRender(TAB,render);X.onResize(TAB,render);
})();

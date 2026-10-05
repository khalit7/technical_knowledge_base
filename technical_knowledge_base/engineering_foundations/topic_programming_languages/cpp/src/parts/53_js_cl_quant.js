// ---- Part 3 Quant blocks: real Q8_0 bytes, and the same 32 weights quantised as Q8_0 and Q4_0 step by step ----
(function(){
  const X=window.CLX,CL=X.CL,TAB='t-cl-quant',esc=X.esc,fmt=X.fmt;
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
  const STEPS={q8:[
    ['The input','The 32 weights of the block, as real numbers (blue bars). Largest magnitude: weight '+amaxI+', '+g(x[amaxI])+'.'],
    ['Find the largest magnitude','<code>amax = max |x| = '+g(Math.abs(x[amaxI]))+'</code> (weight '+amaxI+', outlined).'],
    ['Choose the scale','<code>d = amax / 127 = '+Q.d8+'</code>, stored as a 16-bit float. The largest weight will map to &plusmn;127, the end of the int8 range.'],
    ['Round each weight','<code>q = roundf(x / d)</code>: 32 integers from &minus;127 to 127, the labels under the bars.'],
    ['Dequantise and compare','<code>d &times; q</code> (orange dots) lands exactly on every bar: maximum error '+fmt(maxAbs(err(x,deq8)),3)+', because these weights were Q8_0 already. Our Python reproduces ggml\'s rounding.'],
    ['Store the block','2 bytes of <code>d</code> + 32 bytes of <code>q</code> = 34 bytes, identical to the bytes in the file above.']],
   q4:[
    ['The input','The same 32 weights.'],
    ['Find the extreme, keeping its sign','<code>max</code> = the weight with the largest magnitude, sign kept: '+g(x[amaxI])+' (weight '+amaxI+').'],
    ['Choose the scale','<code>d = max / &minus;8 = '+Q.d4+'</code>. Dividing by &minus;8 maps the extreme to &minus;8, stored as q = 0 with no error beyond the rounding of d to 16 bits; the other end of the range reaches only +7.'],
    ['Shift and truncate','<code>q = min(15, (int8_t)(x / d + 8.5))</code>: integers 0 to 15, the labels. Adding 8.5 then truncating rounds to the nearest of 16 levels and shifts them to be non-negative.'],
    ['Dequantise and compare','<code>(q &minus; 8) &times; d</code> (orange dots) misses most bars; red lines are the error. Maximum '+fmt(maxAbs(err(x,deq4)),4)+', RMS '+fmt(rms(err(x,deq4)),4)+', against weights of typical size '+fmt(rms(x),4)+'.'],
    ['Pack two per byte','<code>qs[j] = q[j] | q[j + 16] &lt;&lt; 4</code>: byte j holds weight j in its low 4 bits and weight j + 16 in its high 4 bits. 2 + 16 = 18 bytes.']]};
  function draw(i){const svg=document.getElementById('qb-svg');if(!svg)return;const W=X.width(svg),H=230,L=6,R=6,T=10,B=34,n=32;
    const st=STEPS[mode],k=Math.min(i,st.length-1),deq=mode==='q8'?deq8:deq4,qs=mode==='q8'?Q.q8:Q.q4;
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
    document.getElementById('qb-cap').innerHTML='<b>Step '+(k+1)+' of '+st.length+': '+st[k][0]+'.</b> '+st[k][1];
    const bytes=mode==='q8'?34:18,e=err(x,deq);
    document.getElementById('qb-stats').innerHTML=[['Bytes for 32 weights',k>=5?bytes:'·'],['Bits per weight',k>=5?fmt(bytes*8/32,1):'·'],['Max |error|',k>=4?fmt(maxAbs(e),4):'·'],['RMS error / RMS weight',k>=4?fmt(rms(e)/rms(x),3):'·']].map(([a,v])=>'<div><div class="k">'+a+'</div><div class="v">'+v+'</div></div>').join('');
    const out=document.getElementById('qb-out');const hb=mode==='q8'?hexBytes(Q.hex):hexBytes(Q.q4_block_hex);
    out.innerHTML=k>=5?hb.map((h,j)=>'<span class="'+(j<2?'d':'')+'">'+h+'</span>').join(''):'';
    svg.onclick=ev=>{const r=ev.target.closest('rect');if(!r)return;const j=+r.dataset.j;document.getElementById('qb-cap').innerHTML+='<br><span class="small">Weight '+j+': x = '+g(x[j])+(k>=3?', q = '+qs[j]:'')+(k>=4?', dequantised '+g(deq[j])+', error '+g(x[j]-deq[j]):'')+'</span>'}}
  const an=RD.anim({card:'qb-card',ctl:'qb-ctl',n:6,ms:2200,draw,label:'Step'});
  RD.seg(document.getElementById('qb-mode'),m=>{mode=m;an.reset(6);an.play()});
  // Q4_K to scale
  function drawK(){const svg=document.getElementById('qb-k');if(!svg)return;const W=X.width(svg),H=58,parts=[['d',2,'--c5'],['dmin',2,'--c5'],['scales and mins (6 bits each, 8 + 8)',12,'--c4'],['qs: 256 weights, 4 bits each',128,'--c1']];
    let x0=0,b='';parts.forEach(([n,by,c])=>{const w=by/144*W;b+='<rect x="'+x0.toFixed(1)+'" y="4" width="'+Math.max(1,w-1).toFixed(1)+'" height="26" fill="'+X.css(c)+'" opacity=".85"><title>'+esc(n+': '+by+' bytes')+'</title></rect>';
      if(w>60)b+='<text x="'+(x0+6)+'" y="21" font-size="11" fill="'+X.css('--bg')+'">'+esc(n)+' ('+by+' B)</text>';x0+=w});
    b+='<text x="0" y="46" font-size="11" fill="'+X.css('--mute')+'">d, dmin: 2 bytes each; scales: 12 bytes</text><text x="'+W+'" y="46" font-size="11" text-anchor="end" fill="'+X.css('--mute')+'">144 bytes</text>';
    svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('height',H);svg.innerHTML=b}
  function render(){drawHex();an.redraw();drawK()}
  X.onRender(TAB,render);X.onResize(TAB,render);
})();

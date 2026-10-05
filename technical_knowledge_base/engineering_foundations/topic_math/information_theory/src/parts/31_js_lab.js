// ---- Entropy and KL lab ----
(function(){
  const root=document.getElementById('t-lab');if(!root)return;
  const T=RD.t,$=id=>document.getElementById(id);
  const PRE={
    weather:{names:['sun','cloud','rain'],p:[50,25,25],q:[25,50,25]},
    stream:{names:['A','B','C','D'],p:[50,25,12.5,12.5],q:[12.5,50,25,12.5]},
    coin:{names:['heads','tails'],p:[50,50],q:[90,10]},
    tiny:{names:['cat','dog','sat'],p:[0,0,100],q:IT.softmax([2,1,0]).map(v=>100*v)},
    soft:{names:['cat','dog','sat'],p:[0,20,80],q:IT.softmax([2,1,0]).map(v=>100*v)},
    near0:{names:['a','b','c'],p:[40,40,20],q:[49.5,49.5,1]},
    unif:{names:['a','b','c','d'],p:[25,25,25,25],q:[70,10,10,10]}};
  let st={names:PRE.weather.names.slice(),p:PRE.weather.p.slice(),q:PRE.weather.q.slice()},base=2;
  const norm=w=>{const s=w.reduce((a,b)=>a+b,0);return s>0?w.map(v=>v/s):w.map(()=>1/w.length)};
  const fmt=v=>!isFinite(v)?'∞':(Math.abs(v)<5e-5?'0.000':v.toFixed(3));
  const U=()=>base===2?'bits':'nats';
  function sliders(id,key,col){const el=$(id),w=st[key],pr=norm(w);
    el.innerHTML=st.names.map((n,i)=>'<div class="sl"><span>'+RD.esc(n)+'</span><input type="range" min="0" max="100" step="0.5" value="'+w[i]+'" data-i="'+i+'" aria-label="'+key+' weight for '+RD.esc(n)+'" style="accent-color:'+col+'"><b id="'+id+'-v'+i+'">'+pr[i].toFixed(3)+'</b></div>').join('');
    el.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',e=>{st[key][+e.target.dataset.i]=+e.target.value;update()}))}
  function update(){const p=norm(st.p),q=norm(st.q),b=base===2?2:Math.E;
    p.forEach((v,i)=>{const e=$('lab-p-v'+i);if(e)e.textContent=v.toFixed(3)});q.forEach((v,i)=>{const e=$('lab-q-v'+i);if(e)e.textContent=v.toFixed(3)});
    const Hp=IT.H(p,b),Hq=IT.H(q,b),CEpq=IT.CE(p,q,b),CEqp=IT.CE(q,p,b),KLpq=IT.KL(p,q,b),KLqp=IT.KL(q,p,b),JS=IT.JS(p,q,b);
    $('lab-out').innerHTML=RD.stat('H(p)',fmt(Hp)+' '+U(),'entropy of the truth')+RD.stat('H(q)',fmt(Hq)+' '+U(),'entropy of the model')+
      RD.stat('H(p, q)',fmt(CEpq)+' '+U(),'cross-entropy: the loss')+RD.stat('H(q, p)',fmt(CEqp)+' '+U(),'the other way round')+
      RD.stat('KL(p ‖ q)',fmt(KLpq)+' '+U(),'forward: what training on p removes')+RD.stat('KL(q ‖ p)',fmt(KLqp)+' '+U(),'reverse: the RLHF / VI direction')+
      RD.stat('Jensen-Shannon',fmt(JS)+' '+U(),'symmetric; at most '+(base===2?'1 bit':'ln 2 = 0.693'))+RD.stat('total variation',fmt(IT.TV(p,q)),'½ Σ |p − q|; at most 1')+
      RD.stat('χ²(p ‖ q)',fmt(IT.chi2(p,q)),'Σ (p − q)² / q')+RD.stat('squared Hellinger',fmt(IT.hell2(p,q)),'Σ (√p − √q)²');
    $('lab-idn').innerHTML=isFinite(CEpq)?'Identity check: H(p, q) = H(p) + KL(p ‖ q): '+fmt(CEpq)+' = '+fmt(Hp)+' + '+fmt(KLpq)+'. Pinsker: TV = '+fmt(IT.TV(p,q))+' ≤ √(KL/2) = '+fmt(Math.sqrt(IT.KL(p,q,Math.E)/2))+' (KL in nats).':
      'q gives probability 0 to an outcome that p uses, so H(p, q) and KL(p ‖ q) are infinite. Move that slider of q above 0.';
    drawBars(p,q,b);codes(p,q)}
  function drawBars(p,q,b){const el=$('lab-bars'),W=Math.min(RD.width(el),760),K=p.length,rh=34,half=W>=520?W/2-8:W,two=W>=520;
    const terms=p.map((v,i)=>v>0?(q[i]>0?v*(b===2?Math.log2(v/q[i]):Math.log(v/q[i])):Infinity):0);
    const fin=terms.filter(isFinite),mx=Math.max(0.05,...fin.map(Math.abs));let o='';const lw=46;
    p.forEach((v,i)=>{const y=i*rh+4,bw=half-lw-50;o+=T(lw-6,y+16,RD.esc(st.names[i]),{a:'end',fs:11.5})+
      '<rect x="'+lw+'" y="'+y+'" width="'+Math.max(0.5,v*bw)+'" height="12" rx="2" fill="var(--c1)"/>'+T(lw+v*bw+4,y+10,v.toFixed(3),{fs:10.5})+
      '<rect x="'+lw+'" y="'+(y+14)+'" width="'+Math.max(0.5,q[i]*bw)+'" height="12" rx="2" fill="var(--c2)"/>'+T(lw+q[i]*bw+4,y+24,q[i].toFixed(3),{fs:10.5})});
    const ox=two?half+16:0,oy=two?0:K*rh+18,cw=half-16,mid=ox+cw/2;
    o+='<line x1="'+mid+'" y1="'+oy+'" x2="'+mid+'" y2="'+(oy+K*rh)+'" stroke="var(--mute)"/>';
    terms.forEach((t,i)=>{const y=oy+i*rh+8,len=isFinite(t)?t/mx*(cw/2-44):(cw/2-44);
      o+='<rect x="'+(len>=0?mid:mid+len)+'" y="'+y+'" width="'+Math.max(0.5,Math.abs(len))+'" height="16" rx="2" fill="'+(t<0?'var(--bad)':'var(--c3)')+'"/>'+
        T(len>=0?mid+len+4:mid+len-4,y+12,isFinite(t)?t.toFixed(3):'∞',{a:len>=0?'start':'end',fs:10.5})});
    el.innerHTML=RD.svg(W,two?K*rh+8:2*K*rh+26,o,'Probabilities and KL terms per outcome')}
  function codes(p,q){const hp=IT.huffman(p),hq=IT.huffman(q),b2=v=>v>0?(-Math.log2(v)).toFixed(3):'∞';
    let h='<tr><th>outcome</th><th>p</th><th>q</th><th>−log₂ p</th><th>−log₂ q</th><th>Huffman for p</th><th>Huffman for q</th></tr>';
    p.forEach((v,i)=>{h+='<tr><td>'+RD.esc(st.names[i])+'</td><td class="num">'+v.toFixed(3)+'</td><td class="num">'+q[i].toFixed(3)+'</td><td class="num">'+b2(v)+'</td><td class="num">'+b2(q[i])+'</td><td class="codew">'+hp.code[i]+'</td><td class="codew">'+hq.code[i]+'</td></tr>'});
    const Lp=p.reduce((s,v,i)=>s+v*hp.len[i],0),Lq=p.reduce((s,v,i)=>s+v*hq.len[i],0);
    h+='<tr><td colspan="5">average length under p (bits per outcome)</td><td class="num"><b>'+Lp.toFixed(3)+'</b></td><td class="num"><b>'+Lq.toFixed(3)+'</b></td></tr>';
    $('lab-codes').innerHTML=h;
    $('lab-codenote').textContent='Ideal lengths −log₂ give exactly H(p) = '+fmt(IT.H(p,2))+' and H(p, q) = '+(isFinite(IT.CE(p,q,2))?fmt(IT.CE(p,q,2)):'∞')+' bits. Huffman rounds to whole bits: its code for p costs '+Lp.toFixed(3)+' bits (between H(p) and H(p) + 1), and its code for q, used on data from p, costs '+Lq.toFixed(3)+'. Outcomes with p = 0 still get codewords; they are simply never used. With exactly dyadic probabilities (the Stream preset) the Huffman lengths equal the ideal ones and the extra cost is exactly KL(p ‖ q) = '+fmt(IT.KL(p,q,2))+' bits.'}
  function setK(K){while(st.names.length<K){st.names.push(String.fromCharCode(97+st.names.length));st.p.push(20);st.q.push(20)}
    st.names.length=K;st.p.length=K;st.q.length=K;$('lab-k').value=K;sliders('lab-p','p','var(--c1)');sliders('lab-q','q','var(--c2)');update()}
  function preset(k){const s=PRE[k];st={names:s.names.slice(),p:s.p.slice(),q:s.q.slice()};setK(s.names.length)}
  $('lab-k').addEventListener('change',e=>{root.querySelectorAll('#lab-pre button').forEach(b=>b.classList.remove('on'));setK(+e.target.value)});
  $('lab-u').addEventListener('change',e=>{base=e.target.value==='2'?2:Math.E;update()});
  $('lab-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;root.querySelectorAll('#lab-pre button').forEach(x=>x.classList.toggle('on',x===b));preset(b.dataset.k)});
  preset('weather');
  RD.onRender(update,'t-lab');
  addEventListener('resize',()=>{if(!root.hidden)update()});
})();

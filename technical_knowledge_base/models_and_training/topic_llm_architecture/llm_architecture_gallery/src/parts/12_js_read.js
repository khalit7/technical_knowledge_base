// ---- Reading tab widgets: KV calculator, local/global strip, normalisation ----
const galBy=n=>GAL.find(r=>r.n===n);
// KV calculator
(function(){
  if(!$('kvq'))return;
  const HK=[1,2,4,8,16,32,64,128],DH=[64,128,192,256];
  const PR=[['Llama 3.1 70B',80,8,128],['Llama 3.1 70B as MHA',80,64,128],['Llama 3.1 8B',32,8,128],['OLMo 2 7B (MHA)',32,32,128],['Qwen3 8B',36,8,128]];
  const el={L:$('kvqL'),H:$('kvqH'),D:$('kvqD'),T:$('kvqT'),N:$('kvqN'),B:$('kvqB')};
  $('kvqP').innerHTML=PR.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+p[0]+'</button>').join('');
  $('kvqP').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const p=PR[+b.dataset.i];el.L.value=p[1];el.H.value=HK.indexOf(p[2]);el.D.value=DH.indexOf(p[3]);
    $('kvqP').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));go()}));
  function go(){const L=+el.L.value,H=HK[+el.H.value],D=DH[+el.D.value],T=2**+el.T.value,N=+el.N.value,b=+el.B.value;
    $('kvqLv').textContent=L;$('kvqHv').textContent=H;$('kvqDv').textContent=D;$('kvqTv').textContent=fmt(T)+' tokens';$('kvqNv').textContent=N;
    const per=2*L*H*D*b;
    $('kvqOut').innerHTML=stat('KV bytes per token',fmtBytes(per),'2 × '+L+' × '+H+' × '+D+' × '+b+' = '+fmt(per)+' bytes')+
      stat('One request',fmtBytes(per*T),fmt(per)+' × '+fmt(T))+stat(N+' concurrent requests',fmtBytes(per*T*N),'cache only, weights extra')}
  Object.values(el).forEach(x=>x.addEventListener('input',()=>{$('kvqP').querySelectorAll('button').forEach(b=>b.classList.remove('on'));go()}));
  go();
})();
// Local/global strip
(function(){
  if(!$('lgs'))return;
  const MS=['Gemma 3 27B','GPT-OSS 120B','OLMo 3 32B','Llama 4 Maverick','Gemma 4 31B','Arcee AI Trinity Large 400B'];
  let cur=MS[0];
  $('lgsP').innerHTML=MS.map((n,i)=>'<button data-n="'+n+'"'+(i===0?' class="on"':'')+'>'+n+'</button>').join('');
  $('lgsP').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{cur=b.dataset.n;$('lgsP').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));go()}));
  $('lgsT').addEventListener('input',go);
  function go(){const r=galBy(cur);if(!r)return;const T=Math.round(2**+$('lgsT').value),W=r.W;
    $('lgsTv').textContent=fmt(T)+' tokens';
    const c=$('lgsCells');c.style.gridTemplateColumns='repeat('+r.L+',minmax(0,1fr))';
    c.innerHTML=[...r.mix].map((m,i)=>'<span class="'+(m==='S'?'l':'g')+'" title="layer '+(i+1)+': '+(m==='S'?'windowed, '+fmt(W)+' tokens':'global')+'"></span>').join('');
    let g=0,l=0,ng=0,nl=0;[...r.mix].forEach(m=>{const p=r.per[m]||0;if(m==='S'){l+=p*Math.min(T,W);nl++}else{g+=p*T;ng++}});
    const full=r.kv*T;
    $('lgsOut').innerHTML=stat(ng+' global layers hold',fmtBytes(g),'grow with every token')+stat(nl+' windowed layers hold',fmtBytes(l),'capped at '+fmt(W)+' tokens each')+
      stat('Total per request',fmtBytes(g+l),'effective '+fmtBytes((g+l)/T)+' per token')+
      stat('If every layer were full',fmtBytes(full),'gallery headline '+fmtBytes(r.kv)+' × '+fmt(T)+(full>g+l?'; '+(full/(g+l)).toFixed(2)+' times more':''))}
  onTab('t-read',go);go();
})();
// Normalisation: RMSNorm against LayerNorm, and where the norm sits
(function(){
  if(!$('nrm'))return;
  const x=[1,2,3,4];
  $('nrmIn').innerHTML=x.map((v,i)=>'<input class="nin" type="number" step="0.5" value="'+v+'" data-i="'+i+'" aria-label="x'+(i+1)+'">').join('')+'<button id="nrmAdd">+1 to every entry</button><button id="nrmRst">Reset</button>';
  const ins=[...$('nrmIn').querySelectorAll('input')];
  function go(){const v=ins.map(e=>{const n=parseFloat(e.value);return isFinite(n)?n:0}),d=v.length;
    const ms=v.reduce((a,b)=>a+b*b,0)/d,rms=Math.sqrt(ms),mu=v.reduce((a,b)=>a+b,0)/d,sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/d);
    const f=a=>'('+a.map(t=>t.toFixed(3)).join(', ')+')';
    const rn=rms>0?v.map(t=>t/rms):v.map(()=>0),ln=sd>0?v.map(t=>(t-mu)/sd):v.map(()=>0);
    $('nrmOut').innerHTML='<div class="kv"><dt>Mean square</dt><dd>'+ms.toFixed(3)+', RMS '+rms.toFixed(3)+'</dd><dt>RMSNorm</dt><dd><b>'+f(rn)+'</b></dd><dt>Mean, sd</dt><dd>'+mu.toFixed(3)+', '+sd.toFixed(3)+'</dd><dt>LayerNorm</dt><dd><b>'+f(ln)+'</b></dd></div>'}
  ins.forEach(e=>e.addEventListener('input',go));
  $('nrmAdd').addEventListener('click',()=>{ins.forEach(e=>{e.value=(parseFloat(e.value)||0)+1});go()});
  $('nrmRst').addEventListener('click',()=>{ins.forEach((e,i)=>{e.value=x[i]});go()});
  const TX={pre:['x + F(Norm(x))','The default: the residual path (left) is never normalised, so deep stacks train cleanly; its magnitude grows with depth.'],
    post:['Norm(x + F(x))','The original Transformer: the stream itself is normalised after every sublayer, harder to train deep.'],
    olmo:['x + Norm(F(x))','OLMo 2: the sublayer output is normalised before it is added back, damping what each block injects; the stream stays unnormalised.'],
    gemma:['x + Norm(F(Norm(x)))','Gemma 3: both, for one extra norm per sublayer.']};
  function place(m){const nb=(y,lab)=>'<rect x="92" y="'+y+'" width="76" height="22" rx="5" class="boxc"/><text x="130" y="'+(y+15)+'" text-anchor="middle" font-size="11.5">'+(lab||'Norm')+'</text>';
    const fb=y=>'<rect x="92" y="'+y+'" width="76" height="26" rx="5" class="boxa"/><text x="130" y="'+(y+17)+'" text-anchor="middle" font-size="12">F</text>';
    let s=(m==='post'?'<line x1="40" y1="186" x2="40" y2="84" stroke="var(--mute)" stroke-width="2"/>':'<line x1="40" y1="186" x2="40" y2="16" stroke="var(--mute)" stroke-width="2" marker-end="MARK"/>')+'<text x="34" y="200" font-size="11" text-anchor="middle" fill="var(--mute)">x in</text><text x="46" y="14" font-size="11" fill="var(--mute)">x out</text>';
    s+='<circle cx="40" cy="'+(m==='post'?76:56)+'" r="8" fill="var(--bg)" stroke="var(--mute)"/><text x="40" y="'+(m==='post'?80:60)+'" text-anchor="middle" font-size="12">+</text>';
    const addY=m==='post'?76:56;
    if(m==='pre'){s+=ar(40,166,92,155)+nb(144)+ar(130,144,130,128)+fb(102)+ar(130,102,48,addY+2)}
    if(m==='post'){s+=ar(40,166,92,149)+fb(136)+ar(130,136,48,addY+4)+nb(30)+ar(48,72,92,45)+ar(92,38,52,24)}
    if(m==='olmo'){s+=ar(40,166,92,149)+fb(136)+ar(130,136,130,114)+nb(92)+ar(130,92,48,addY+2)}
    if(m==='gemma'){s+=ar(40,170,92,165)+nb(156)+ar(130,156,130,142)+fb(116)+ar(130,116,130,100)+nb(78)+ar(130,78,48,addY+2)}
    $('nrmSvg').innerHTML=svgEl(220,206,s,'Norm placement: '+TX[m][0]);$('nrmTxt').innerHTML='<b class="m">'+TX[m][0]+'</b>: '+TX[m][1]}
  segBind('nrmP',place);place('pre');go();
})();

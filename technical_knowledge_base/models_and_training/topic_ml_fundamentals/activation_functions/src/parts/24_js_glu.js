// ---- Reading: the decoder of the recorded vectors (AFD, used by the Fig. 3 stage in 35_js_sc_glu.js), Shazeer's table, the width table, the inside-real-models findings ----
window.AFD=(function(){
  // int16 + scale, base64, little-endian (mk_data.py q16)
  function dq(p){const sc=p[0],b=atob(p[1]),n=b.length/2,dv=new DataView(new ArrayBuffer(b.length));
    for(let i=0;i<b.length;i++)dv.setUint8(i,b.charCodeAt(i));const o=new Array(n);for(let i=0;i<n;i++)o[i]=dv.getInt16(2*i,true)/32767*sc;return o}
  const M={};DATA.real.models.forEach(m=>M[m.key]=m);
  const rms=v=>Math.sqrt(v.reduce((a,b)=>a+b*b,0)/v.length);
  const share=(v,f)=>v.filter(f).length/v.length;
  // share of a layer's hidden entries with |h| < tau * rms (exact zeros included), from the stored histogram
  function nearZero(l,tau){const [lo,hi,nb]=DATA.real.bins;let c=l.z*1e6+l.h[0];const e=(Math.log10(tau)-lo)/(hi-lo)*nb;
    for(let i=0;i<nb;i++){const a=i,b=i+1;if(b<=e)c+=l.h[i+1];else if(a<e)c+=l.h[i+1]*(e-a)}return c/1e6}
  return {dq,M,rms,share,nearZero};
})();
// Shazeer 2020, Tables 1 to 3
(function(){
  const el=document.getElementById('szSvg');if(!el)return;const $=id=>document.getElementById(id);let k='p65';
  const COL={p65:2,p524:4,glue:5,sglue:6},LOWER={p65:1,p524:1};
  function draw(){const W=RD.width(el),rows=DATA.sz,ml=W<420?92:110,mr=48,rh=24,mt=8,H=mt+rows.length*rh+30;
    const c=COL[k],v=rows.map(r=>r[c]),sd=rows.map(r=>k==='p65'?r[3]:0);
    let lo=Math.min(...v.map((a,i)=>a-sd[i])),hi=Math.max(...v.map((a,i)=>a+sd[i]));const pad=(hi-lo)*0.15;lo-=pad;hi+=pad;
    const X=a=>ml+(W-ml-mr)*(a-lo)/(hi-lo);let s='';
    rows.forEach((r,i)=>{const y=mt+i*rh,col=r[1]?'var(--c3)':'var(--c2)';
      s+=PF.T(ml-6,y+rh/2+4,r[0],' text-anchor="end" font-size="11.5"');
      s+='<rect x="'+ml+'" y="'+(y+5)+'" width="'+Math.max(1,X(v[i])-ml).toFixed(1)+'" height="'+(rh-10)+'" rx="2" fill="'+col+'" opacity=".8"/>';
      if(sd[i])s+='<line x1="'+X(v[i]-sd[i]).toFixed(1)+'" x2="'+X(v[i]+sd[i]).toFixed(1)+'" y1="'+(y+rh/2)+'" y2="'+(y+rh/2)+'" stroke="var(--ink)" stroke-width="1.5"/>';
      s+=PF.T(X(v[i])+4+(sd[i]?X(v[i]+sd[i])-X(v[i]):0),y+rh/2+4,(k==='glue'||k==='sglue'?v[i].toFixed(2):v[i].toFixed(3)),' font-size="11"')});
    const yb=mt+rows.length*rh+4;s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yb+'" y2="'+yb+'" stroke="var(--line)"/>';
    [lo,(lo+hi)/2,hi].forEach(t=>{s+=PF.T(X(t),yb+14,t.toFixed(k.startsWith('p')?3:1),' text-anchor="middle" font-size="10.5" fill="var(--mute)"')});
    s+=PF.T(W-mr,yb+26,(LOWER[k]?'lower is better':'higher is better')+'; axis does not start at 0',' text-anchor="end" font-size="10.5" fill="var(--mute)"');
    el.innerHTML=PF.svg(W,H,'Shazeer 2020 results',s);
    $('szX').innerHTML='<span style="color:var(--c3)">■</span> gated (three matrices, d<sub>ff</sub> = 2,048) &nbsp; <span style="color:var(--c2)">■</span> ungated (two matrices, d<sub>ff</sub> = 3,072); all at the same parameter count. '+
      (k==='p65'?'Bars: mean; whiskers: &plusmn; one standard deviation over runs. ':'')+(k==='glue'||k==='sglue'?'One fine-tuning run per model; T5\'s measured spread of the average: '+(k==='glue'?'0.235':'0.416')+'. ':'')+
      'Source: <a href="https://arxiv.org/abs/2002.05202" target="_blank" rel="noopener noreferrer">Shazeer 2020</a>, '+(k.startsWith('p')?'Table 1':k==='glue'?'Table 2':'Table 3')+'.'}
  document.getElementById('szM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;k=b.dataset.k;
    document.querySelectorAll('#szM button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  RD.onRender(draw);draw();addEventListener('resize',draw);
})();
// FFN width table: Llama's rounding rule against config.json, and the departures
(function(){
  const el=document.getElementById('fw');if(!el)return;const C=DATA.cfg;
  const L=(k,nm,f,m)=>({nm,c:C[k],g:3,rule:AF.llamaHidden(C[k].d,m,f),rs:'f = '+(f==null?'none':f)+', m = '+m});
  const rows=[L('llama1_7b','Llama 1 7B',null,256),L('llama2_70b','Llama 2 70B',1.3,4096),L('llama3_8b','Llama 3 8B',1.3,1024),L('llama31_405b','Llama 3.1 405B',1.2,4096),L('llama32_1b','Llama 3.2 1B',1.5,256),L('llama32_3b','Llama 3.2 3B',1.0,256),
    {nm:'Mistral 7B',c:C.mistral_7b,g:3},{nm:'SmolLM2-135M',c:C.smollm2_135m,g:3},{nm:'Qwen2.5-0.5B',c:C.qwen25_05b,g:3},{nm:'Gemma 3 1B',c:C.gemma3_1b,g:3},
    {nm:'PaLM 540B',c:{d:18432,h:73728,act:'SwiGLU',url:'https://arxiv.org/abs/2204.02311'},g:3,src:'paper, Table 1 and section 2'},
    {nm:'Nemotron Mini 4B',c:C.nemotron_mini_4b,g:2},{nm:'GPT-2 small',c:C.gpt2,g:2},{nm:'OPT-125m',c:C.opt_125m,g:2}];
  const cm=n=>n.toLocaleString('en-US');
  let h='<table><tr><th>Model</th><th>Activation (config)</th><th class="num">d</th><th class="num">Hidden width</th><th class="num">Width / d</th><th>Llama rule (f, m)</th><th class="num">Rule gives</th><th class="num">Relative size</th></tr>';
  rows.forEach(r=>{const c=r.c,rel=r.g*c.h/(8*c.d);
    h+='<tr><td style="white-space:nowrap">'+r.nm+'</td><td><a href="'+c.url+'" target="_blank" rel="noopener noreferrer">'+c.act+'</a>'+(r.g===3?' (gated)':'')+'</td><td class="num">'+cm(c.d)+'</td><td class="num">'+cm(c.h)+'</td><td class="num">'+(c.h/c.d).toFixed(2)+'</td><td style="white-space:nowrap">'+(r.rs||'')+'</td><td class="num">'+(r.rule!=null?(r.rule===c.h?'<span class="ok">'+cm(r.rule)+' ✓</span>':'<span class="warn">'+cm(r.rule)+'</span>'):'')+'</td><td class="num">'+rel.toFixed(2)+'</td></tr>'});
  el.innerHTML=h+'</table>';
})();
// the three findings in "Inside real models"
(function(){
  const $=id=>document.getElementById(id);if(!$('in-opt'))return;const M=AFD.M,pc=v=>(v*100).toFixed(1)+'%';
  const o=M.opt,g=M.gpt2,s=M.smol,rng=a=>pc(Math.min(...a))+' to '+pc(Math.max(...a)),sum=a=>a.reduce((p,q)=>p+q,0);
  $('in-opt').innerHTML='<b>OPT-125m (ReLU):</b> '+rng(o.L.map(l=>l.z))+' of the hidden values are exactly zero, layer by layer, and '+cm(sum(o.L.map(l=>l.dead)))+' units never fire, almost all in the first half.';
  $('in-gpt').innerHTML='<b>GPT-2 small (GELU):</b> almost no exact zeros, but '+rng(g.L.map(l=>l.n))+' of the hidden values are negative, that is, inside GELU\'s small dip; only '+rng(g.L.map(l=>AFD.nearZero(l,0.1)))+' are below 0.1 &times; the token\'s rms. '+cm(sum(g.L.map(l=>l.dead)))+' units have a negative input on every token, all in layers 1 to 5; GELU still gives them a small gradient.';
  $('in-smol').innerHTML='<b>SmolLM2-135M (SwiGLU):</b> no exact zeros; half of the products are negative ('+rng(s.L.map(l=>l.n))+'), because the sign comes from the up projection; '+rng(s.L.map(l=>AFD.nearZero(l,0.1)))+' are below 0.1 &times; rms, most in the first and last layers.';
  const z=o.L.map(l=>l.z),mi=z.indexOf(Math.min(...z));
  $('in-mir').textContent=pc(z[mi])+' in layer '+(mi+1)+', '+rng(z.filter((v,i)=>i!==mi))+' in the others';
  function cm(n){return n.toLocaleString('en-US')}
})();

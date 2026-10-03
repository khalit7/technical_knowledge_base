// ---- Reading: one real token through a plain GELU block and a SwiGLU block (before/after), Shazeer's table, the width table ----
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
(function(){
  const card=document.getElementById('gf');if(!card)return;
  const $=id=>document.getElementById(id);const {dq,M,rms,share}=AFD;
  const g2=M.gpt2.tok,sm=M.smol.tok;
  const P={x:dq(g2.x),pre:dq(g2.pre),y:dq(g2.y)};P.h=P.pre.map(AF.BY.gelut.f);
  const S={x:dq(sm.x),g:dq(sm.gate),u:dq(sm.up),y:dq(sm.y)};
  const GF={silu:AF.BY.silu.f,sigmoid:AF.sig,relu:AF.BY.relu.f,gelu:AF.BY.gelu.f,id:x=>x};
  const GN={silu:'SiLU',sigmoid:'sigmoid',relu:'ReLU',gelu:'GELU',id:'no function'};
  let mode='plain',gate='silu',Sg,Sh;
  function prepGate(){Sg=S.g.map(GF[gate]);Sh=Sg.map((v,i)=>v*S.u[i])}
  prepGate();
  const near=v=>{const r=rms(v);return share(v,a=>Math.abs(a)<0.1*r)};
  const pc=v=>(v*100).toFixed(1)+'%';const cm=n=>n.toLocaleString('en-US');
  // one strip: a signed bar per pixel column (the largest |value| among the numbers that fall in it)
  function strip(v,x0,w,y0,hh,sc,dim){
    const n=v.length,cols=Math.max(1,Math.floor(w));let pp='',pn='';
    for(let c=0;c<cols;c++){const a=Math.floor(c*n/cols),b=Math.max(a+1,Math.floor((c+1)*n/cols));let m=0;for(let i=a;i<b;i++)if(Math.abs(v[i])>Math.abs(m))m=v[i];
      const h=Math.min(1,Math.abs(m)/sc)*hh;if(h<0.4)continue;const x=(x0+c+0.5).toFixed(1);
      if(m>0)pp+='M'+x+' '+y0+'V'+(y0-h).toFixed(1);else pn+='M'+x+' '+y0+'V'+(y0+h).toFixed(1)}
    return '<line x1="'+x0+'" x2="'+(x0+w)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--line)"/>'+
      '<path d="'+pp+'" stroke="var(--c1)" stroke-width="1" opacity="'+(dim?.35:1)+'"/><path d="'+pn+'" stroke="var(--c2)" stroke-width="1" opacity="'+(dim?.35:1)+'"/>';
  }
  function rowsFor(i){
    const d=mode==='plain'?768:576;
    if(mode==='plain'){const sc1=Math.max(...P.pre.map(Math.abs));
      return [[0,'x: the token after LayerNorm (d = 768)',P.x,1/4,Math.max(...P.x.map(Math.abs))],
        [1,'x W1 + b1: up projection (4d = 3,072)',P.pre,1,sc1],
        [2,'h = GELU(x W1 + b1), same scale',P.h,1,sc1],
        [3,'y = h W2 + b2: down projection (d = 768)',P.y,1/4,Math.max(...P.y.map(Math.abs))]].filter(r=>r[0]<=i)}
    const scg=Math.max(...S.g.map(Math.abs)),scu=Math.max(...S.u.map(Math.abs));
    const rows=[[0,'x: the token after RMSNorm (d = 576)',S.x,1/4,Math.max(...S.x.map(Math.abs))],
      [1,'g = x W_gate (8d/3 = 1,536)',S.g,2/3,scg],
      [2,'u = x W_up (8d/3 = 1,536)',S.u,2/3,scu],
      [3,GN[gate]+'(g): the gate, same scale as g',Sg,2/3,scg],
      [4,'h = '+GN[gate]+'(g) ⊙ u',Sh,2/3,Math.max(...Sh.map(Math.abs))||1],
      [5,'y = h W_down (d = 576)'+(gate==='silu'?'':': needs the trained W_down, shown for SiLU only'),S.y,1/4,Math.max(...S.y.map(Math.abs)),gate!=='silu']];
    return rows.filter(r=>r[0]<=i);
  }
  function draw(i){
    const el=$('gfSvg'),W=RD.width(el),ml=6,iw=W-12,rh=W<480?50:56;const rows=rowsFor(i);
    let s='',y=0;
    rows.forEach((r,k)=>{const cur=r[0]===Math.min(i,mode==='plain'?3:5);y+=16;
      s+=PF.T(ml,y-2,r[1],' font-size="11.5" font-weight="'+(cur?600:400)+'" fill="'+(cur?'var(--ink)':'var(--mute)')+'"');
      const w=iw*r[3];s+=strip(r[2],ml,w,y+rh/2-6,rh/2-8,r[4],r[5]);y+=rh-12});
    // the weight matrices to scale: height d, width hidden; all of them used so far
    const nM=mode==='plain'?2:3,hw=mode==='plain'?1:2/3,used=mode==='plain'?[i>=1,i>=3]:[i>=1,i>=2,i>=5];
    y+=14;const wl='Weight matrices to scale: '+nM+' × d × '+(mode==='plain'?'4d':'8d/3')+' = 8d² parameters';
    if(W<480){s+=PF.T(ml,y,'Weight matrices to scale (d tall, hidden wide):',' font-size="11" fill="var(--mute)"');y+=14;s+=PF.T(ml,y,nM+' × d × '+(mode==='plain'?'4d':'8d/3')+' = 8d² parameters',' font-size="11" fill="var(--mute)"')}
    else s+=PF.T(ml,y,wl+' (each d tall, hidden width wide)',' font-size="11" fill="var(--mute)"');y+=6;
    const mh=Math.max(10,iw/4*0.18);let x=ml;const mw=iw*hw*(W<480?0.30:0.32);
    const nms=mode==='plain'?['W1','W2']:['W_gate','W_up','W_down'];
    for(let k=0;k<nM;k++){s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+mw.toFixed(1)+'" height="'+mh.toFixed(1)+'" rx="2" fill="'+(used[k]?'var(--acc2)':'var(--soft)')+'" stroke="'+(used[k]?'var(--acc)':'var(--line)')+'"/>'+PF.T(x+4,y+mh/2+4,nms[k],' font-size="10.5" fill="var(--ink)"');x+=mw+6}
    y+=mh+6;
    el.innerHTML=PF.svg(W,y,'One token through a feed-forward block, step '+(i+1),s);
    counters(i);caption(i);
  }
  function counters(i){
    if(mode==='plain'){const d=768,h=3072;const pr=(i>=1?d*h:0)+(i>=3?d*h:0);const hv=i>=2?P.h:(i>=1?P.pre:null);
      $('gfN').innerHTML=RD.stat('Parameters used',cm(pr),'of 2 × 768 × 3,072 = '+cm(2*d*h)+' (8d²)')+RD.stat('Multiply-adds',cm(pr),'per token, one per weight')+
        RD.stat('Hidden near zero',hv&&i>=2?pc(near(P.h)):'n/a','|h| below 0.1 × rms')+RD.stat('Hidden negative',hv?pc(share(hv,a=>a<0)):'n/a',i>=2?'after GELU: inside its dip':'before the activation');return}
    const d=576,h=1536;const pr=(i>=1?d*h:0)+(i>=2?d*h:0)+(i>=5?d*h:0);
    $('gfN').innerHTML=RD.stat('Parameters used',cm(pr),'of 3 × 576 × 1,536 = '+cm(3*d*h)+' (8d²)')+RD.stat('Multiply-adds',cm(pr+(i>=4?h:0)),'per token'+(i>=4?', with 1,536 for ⊙':''))+
      RD.stat('Hidden near zero',i>=4?pc(near(Sh)):'n/a','|h| below 0.1 × rms')+RD.stat(i>=4?'Hidden negative':'Gate input negative',i>=4?pc(share(Sh,a=>a<0)):(i>=1?pc(share(S.g,a=>a<0)):'n/a'),i>=4?'sign set by u':'g below 0');
  }
  function caption(i){let t,p;
    if(mode==='plain'){const neg=share(P.pre,a=>a<0);
      [t,p]=[['The input','One token, " cat", as GPT-2 small\'s sixth block sees it after LayerNorm: 768 numbers.'],
        ['Up projection','A 768 × 3,072 matrix (plus a bias) widens it four times: 2.36 million multiply-adds. '+pc(neg)+' of the 3,072 pre-activations are negative.'],
        ['GELU','Every negative pre-activation is squashed into GELU\'s dip, between −0.17 and 0: the orange bars all but vanish at this scale, while positive ones pass almost unchanged. Only '+pc(near(P.h))+' of the hidden values are near zero by the 0.1 × rms test, yet '+pc(share(P.h,a=>a<0))+' are small negatives: GELU leaves few exact zeros.'],
        ['Down projection','A 3,072 × 768 matrix brings it back to width d: the block\'s output, added to the residual stream. Two matrices, 8d² = 4.72 million parameters.'],
      ][Math.min(i,3)];}
    else{const ng=share(S.g,a=>a<0);
      [t,p]=[['The input','The same word, " cat", in SmolLM2-135M\'s sixteenth block after RMSNorm: 576 numbers. Its block is narrower (8d/3 = 1,536) because it has three matrices.'],
        ['Gate projection','The first of two projections of the same input: g = x W_gate. '+pc(ng)+' of its 1,536 entries are negative.'],
        ['Up projection','The second, in parallel: u = x W_up, the values that will be passed on. Two matrices so far, 2 × 576 × 1,536 = 1.77 million parameters.'],
        ['The gate',GN[gate]+' of g. '+(gate==='silu'?'Negative g gives a value near zero (SiLU dips only to −0.28), positive g passes almost unchanged: per unit, the gate is roughly open or shut.':gate==='relu'?'ReLU shuts every unit with negative g exactly: this is ReGLU.':gate==='sigmoid'?'Sigmoid maps g into (0, 1), a soft switch whatever its sign: this is the original GLU.':gate==='gelu'?'GELU behaves like SiLU with a shallower dip: GEGLU.':'No function: the bilinear unit multiplies the two projections directly.')],
        ['Multiply','h = gate ⊙ u: each of u\'s values scaled by its own gate. Where the gate is shut, h is near zero whatever u says; where open, h takes u\'s sign, so half of h is negative ('+pc(share(Sh,a=>a<0))+'), unlike GELU\'s output. Near zero: '+pc(near(Sh))+'.'],
        ['Down projection',(gate==='silu'?'The third matrix brings h back to width d. Total: 3 × d × 8d/3 = 8d², the same as the plain block: 2.65 million parameters here. The gated block buys its multiplication with a narrower hidden layer.':'This step needs the trained W_down applied to the new h; the page stores only the output the model actually computed (with SiLU).')]
      ][Math.min(i,5)];}
    $('gfT').textContent='Step '+(i+1)+' of '+(mode==='plain'?4:6)+': '+t;$('gfP').innerHTML=p;
  }
  const A=RD.anim({card:'gf',ctl:'gfC',n:4,draw,ms:2400,label:'Feed-forward step'});
  function setMode(m){mode=m;$('gfM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('gfGl').style.display=m==='glu'?'':'none';A.reset(m==='plain'?4:6);A.play()}
  $('gfM').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.m)});
  $('gfG').addEventListener('change',e=>{gate=e.target.value;prepGate();A.redraw()});
  $('gfGl').style.display='none';
  addEventListener('resize',()=>A.redraw());
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

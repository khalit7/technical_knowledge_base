// ---- Inside real models tab: per-layer near-zero, negative and never-on shares; per-unit activity histogram ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rl'))return;
  const MS=DATA.real.models,NM={opt:'OPT-125m · ReLU',gpt2:'GPT-2 small · GELU',smol:'SmolLM2-135M · SwiGLU'};
  let mk='opt',k='near',tau=0.1,pmin=0,sel=null;
  $('rlM').innerHTML=MS.map(m=>'<button data-m="'+m.key+'"'+(m.key===mk?' class="on"':'')+'>'+NM[m.key]+'</button>').join('');
  const pc=v=>(v*100).toFixed(v<0.001&&v>0?3:1)+'%';
  const M=()=>MS.find(m=>m.key===mk);
  // share of units on for at most a fraction p of tokens (p = 0: never on), from the on-frequency histogram
  function deadShare(l,p,width){const [flo,nb]=DATA.real.fbins;let c=l.on[0];if(p>0){const e=(Math.log10(p)-flo)/(0-flo)*nb;for(let i=0;i<nb;i++){if(i+1<=e)c+=l.on[i+1];else if(i<e)c+=l.on[i+1]*(e-i)}}return c}
  function ctl(){
    if(k==='near'){const v=Math.round((Math.log10(tau)+4)*10);
      $('rlCtl').innerHTML='<label>Near zero: |h| below <b id="rlTv">'+fmtT(tau)+'</b> × rms <input type="range" id="rlT" min="0" max="40" value="'+v+'" aria-label="Near-zero threshold"></label>';
      $('rlT').addEventListener('input',e=>{tau=Math.pow(10,-4+e.target.value/10);$('rlTv').textContent=fmtT(tau);draw()})}
    else if(k==='dead'){const v=pmin===0?0:Math.round((Math.log10(pmin)+6)*10)+1;
      $('rlCtl').innerHTML='<label>Counts as never on: on for at most <b id="rlPv">'+fmtP(pmin)+'</b> of tokens <input type="range" id="rlP" min="0" max="31" value="'+v+'" aria-label="Activity threshold"></label>';
      $('rlP').addEventListener('input',e=>{const x=+e.target.value;pmin=x===0?0:Math.pow(10,-6+(x-1)/10);$('rlPv').textContent=fmtP(pmin);draw()})}
    else $('rlCtl').innerHTML='<span class="small mute">Share of hidden values below 0 (ReLU: none by construction).</span>';
  }
  const fmtT=t=>t>=0.01?t.toPrecision(2):t.toExponential(1);
  const fmtP=p=>p===0?'0 (exactly never)':(p*100<0.01?(p*100).toExponential(1):(p*100).toPrecision(2))+'%';
  function vals(m){return m.L.map(l=>k==='near'?AFD.nearZero(l,tau):k==='neg'?l.n:deadShare(l,pmin)/m.width)}
  function draw(){
    const m=M(),el=$('rlSvg'),W=RD.width(el),v=vals(m),n=v.length,ml=40,mr=8,mt=14,mb=30,H=200,iw=W-ml-mr,ih=H-mt-mb;
    const top=k==='dead'?Math.max(0.05,Math.min(1,Math.max(...v)*1.15)):1;const bw=iw/n;
    let s='';[0,0.25,0.5,0.75,1].map(t=>t*top).forEach(t=>{const y=mt+ih-ih*t/top;s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+PF.T(ml-4,y+4,(t*100).toFixed(top<0.2?1:0)+'%',' text-anchor="end" font-size="10.5" fill="var(--mute)"')});
    v.forEach((x,i)=>{const h=ih*Math.min(1,x/top),X=ml+i*bw;s+='<rect data-i="'+i+'" x="'+(X+bw*0.12).toFixed(1)+'" y="'+(mt+ih-h).toFixed(1)+'" width="'+(bw*0.76).toFixed(1)+'" height="'+Math.max(h,0.5).toFixed(1)+'" rx="1.5" fill="'+(sel===i?'var(--ink)':'var(--acc)')+'" style="cursor:pointer"><title>layer '+(i+1)+': '+pc(x)+'</title></rect>';
      if(n<=12||(i+1)%5===0||i===0)s+=PF.T(X+bw/2,H-mb+14,String(i+1),' text-anchor="middle" font-size="10.5" fill="var(--mute)"')});
    s+=PF.T(ml+iw/2,H-4,'layer (1 is next to the input)',' text-anchor="middle" font-size="11" fill="var(--mute)"');
    el.innerHTML=PF.svg(W,H,'Per-layer share for '+m.name,s);
    el.querySelectorAll('rect[data-i]').forEach(r=>r.addEventListener('click',()=>{sel=+r.dataset.i;draw()}));
    const tot=m.L.reduce((a,l)=>a+deadShare(l,pmin),0),avg=v.reduce((a,b)=>a+b,0)/n;
    $('rlN').innerHTML=RD.stat('Model',m.name.split('/')[1],m.L.length+' layers × '+m.width.toLocaleString('en-US')+' units; d = '+m.d)+
      RD.stat('Tokens measured',m.tokens.toLocaleString('en-US'),'WikiText-2 test')+
      RD.stat(k==='near'?'Near zero, mean over layers':k==='neg'?'Negative, mean over layers':'Units never on, all layers',k==='dead'?Math.round(tot).toLocaleString('en-US'):pc(avg),k==='dead'?'of '+(m.L.length*m.width).toLocaleString('en-US'):(k==='near'?'threshold '+fmtT(tau)+' × rms':''))+
      RD.stat('Exactly zero, mean over layers',pc(m.L.reduce((a,l)=>a+l.z,0)/n),mk==='opt'?'ReLU: every off unit':'float32 underflow only');
    $('rlX').innerHTML=explain(m);hist(m);
  }
  function explain(m){
    if(mk==='opt')return k==='dead'?'The first half of OPT-125m holds almost all of its never-on units; from layer 9 on, every unit fires on some token. This is the pattern Voita et al. describe for the whole OPT family.':k==='near'?'In a ReLU block "near zero" is almost all exact zeros: move the threshold and the bars barely change.':'ReLU outputs are never negative.';
    if(mk==='gpt2')return k==='neg'?'Most of GPT-2\'s hidden values are negative: pre-activations below 0 that GELU has squashed into its dip (at least −0.17). They are small, not zero.':k==='near'?'Move the threshold up past about 0.2 × rms and the share jumps: that is GELU\'s dip, a mass of small negative values just above the threshold at 0.1.':'Units whose pre-activation is negative on every token: GELU still passes them a small negative output and a small gradient.';
    return k==='neg'?'Half the SwiGLU products are negative in every layer: the sign comes from the up projection u, not from the gate.':k==='near'?'SiLU never outputs exactly zero, so a SwiGLU block has small values rather than zeros; the first and last layers have the most.':'A unit whose gate input is negative on every token: almost none in SmolLM2.';
  }
  function hist(m){
    const el=$('rlH');if(sel==null||sel>=m.L.length){el.innerHTML='<p class="small mute" style="margin:8px 10px">Tap a layer\'s bar to see how often each of its units is on.</p>';return}
    const l=m.L[sel],[flo,nb]=DATA.real.fbins,W=RD.width(el),H=150,ml=40,mr=8,mt=20,mb=30,iw=W-ml-mr,ih=H-mt-mb,bw=iw/(nb+1);
    const mx=Math.max(...l.on);let s=PF.T(ml,13,'Layer '+(sel+1)+': units by the share of tokens on which they are on (log scale)',' font-size="11" fill="var(--mute)"');
    l.on.forEach((c,i)=>{const h=ih*c/mx,X=ml+i*bw;s+='<rect x="'+(X+1).toFixed(1)+'" y="'+(mt+ih-h).toFixed(1)+'" width="'+Math.max(1,bw-2).toFixed(1)+'" height="'+Math.max(h,c?1:0).toFixed(1)+'" fill="'+(i===0?'var(--bad)':'var(--acc)')+'"><title>'+(i===0?'never on':'on for 10^'+(flo+(i-1)*(-flo)/nb).toFixed(1)+' to 10^'+(flo+i*(-flo)/nb).toFixed(1)+' of tokens')+': '+c+' units</title></rect>'});
    ['never','','10⁻⁴','10⁻²','all'].forEach((t,j)=>{if(!t)return;const X=j===0?ml+bw/2:ml+bw*(1+(j-1)*nb/3)+(j===4?-2:0);s+=PF.T(X,H-mb+14,t,' text-anchor="middle" font-size="10.5" fill="var(--mute)"')});
    s+=PF.T(ml-4,mt+8,String(mx),' text-anchor="end" font-size="10.5" fill="var(--mute)"');
    el.innerHTML=PF.svg(W,H,'Unit activity histogram',s);
  }
  $('rlM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mk=b.dataset.m;sel=null;$('rlM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  $('rlK').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;k=b.dataset.k;$('rlK').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));ctl();draw()});
  ctl();
  const o=MS.find(m=>m.key==='opt'),z=o.L.map(l=>l.z),mi=z.indexOf(Math.min(...z));
  $('rl-mir').textContent='every layer but layer '+(mi+1)+' ('+pc(z[mi])+') is above 90% exact zeros, up to '+pc(Math.max(...z));
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-real']=window.TAB_RENDER['t-real']||[]).push(draw);
  addEventListener('resize',()=>{if(!$('t-real').hidden)draw()});
})();

// ---- Reading, section 6: the same text, token by token, under three tokenizers (real log-probabilities) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f,esc=RD.esc;if(!$('rd-px'))return;
  const D=EM.ppl,NAMES={gpt2:'GPT-2',smol:'SmolLM2-135M',qwen:'Qwen2.5-0.5B'};let tk='num',mk='gpt2',A;
    function seq(){const sc=D.models[mk].scores[tk];return sc.tokens.map((t,i)=>({t,b:sc.nb[i],bits:-sc.lp[i]/Math.LN2,p:Math.exp(sc.lp[i])}))}
  function summary(m){const sc=D.models[m].scores[tk],T=D.texts[tk],nll=-sc.lp.reduce((a,b)=>a+b,0);return {n:sc.lp.length,ppl:Math.exp(nll/sc.lp.length),bpb:nll/Math.LN2/T.bytes,pw:Math.exp(nll/T.words),bits:nll/Math.LN2}}
  function draw(k){const S=seq(),n=S.length,shown=Math.min(k,n),box=$('rd-pxSvg'),W=RD.width(box),ml=30,mr=6,H=190,y0=H-24,cap=10,TB=D.texts[tk].bytes;
    const x=b=>ml+(W-ml-mr)*b/TB,y=v=>y0-(y0-12)*Math.min(v,cap)/cap;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Bits per byte for each token">';
    for(let v=0;v<=cap;v+=2.5)s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(y(v)+3.5)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v+'</text>';
    s+='<text x="'+ml+'" y="9" font-size="10" fill="var(--mute)">bits per byte, within each token</text>';
    let off=0,bits=0,bb=0;for(let i=0;i<n;i++){const o=S[i],bw=x(off+o.b)-x(off),bpb=o.bits/o.b;
      if(i<shown){s+='<rect x="'+(x(off)+0.4).toFixed(1)+'" y="'+y(bpb).toFixed(1)+'" width="'+Math.max(0.6,bw-0.8).toFixed(1)+'" height="'+(y0-y(bpb)).toFixed(1)+'" fill="var('+(i===shown-1&&k<=n?'--c2':'--c1')+')" fill-opacity=".8"><title>'+esc(JSON.stringify(o.t))+': p = '+o.p.toPrecision(3)+', '+F(o.bits,2)+' bits</title></rect>';bits+=o.bits;bb+=o.b}
      s+='<line x1="'+x(off).toFixed(1)+'" x2="'+x(off).toFixed(1)+'" y1="'+y0+'" y2="'+(y0+6)+'" stroke="var(--mute)"/>';off+=o.b}
    s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--mute)"/><text x="'+(W-mr)+'" y="'+(H-4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+TB+' bytes of text; ticks are token boundaries</text>';
    box.innerHTML=s+'</svg>'+'<div class="toks" aria-label="Tokens">'+S.map((o,i)=>'<span class="'+(i<shown?(i===shown-1&&k<=n?'cur m1':'m1'):'off')+'">'+esc(o.t.replace(/\n/g,'↵'))+'</span>').join('')+'</div>';
    const cur=shown?S[shown-1]:null;
    if(k<=n){$('rd-pxH').textContent=(k+1)+' / '+(n+2)+' · '+(k===0?'Start: '+NAMES[mk]+' cuts the text into '+n+' tokens':'Token '+shown+' of '+n+': '+JSON.stringify(cur.t));
      $('rd-pxD').textContent=k===0?'Each token is scored given everything before it. Width is the bytes the token covers; height is the bits per byte the model paid for it, so area is the token\'s bits.':'p = '+cur.p.toPrecision(3)+', so it costs '+F(cur.bits,2)+' bits over '+cur.b+' byte'+(cur.b>1?'s':'')+'. Running perplexity per token is exp(mean nats so far); running bits per byte divide the same total by bytes.'}
    else{const z=summary(mk);$('rd-pxH').textContent=(k+1)+' / '+(n+2)+' · Same text, three tokenizers';
      $('rd-pxD').textContent='Per-token perplexity ranks the models by how finely they cut the text as much as by how well they predict it. Bits per byte divide the same total by a count no tokenizer chooses.'}
    const m=shown||1,pt=Math.exp(bits*Math.LN2/m);
    $('rd-pxN').innerHTML=RD.stat('Tokens scored',shown+' / '+n,NAMES[mk])+RD.stat('Total bits',F(bits,1),'&minus;log<sub>2</sub> of the probability so far')+RD.stat('Perplexity per token',shown?F(pt,2):'&middot;','exp(mean nats per token)')+RD.stat('Bits per byte',shown?F(bits/bb,3):'&middot;','over '+bb+' bytes');
    $('rd-pxS').innerHTML=k>n?table():'';}
  function table(){let h='<table class="mt"><thead><tr><th>Model, '+esc(D.texts[tk].label)+'</th><th class="num">Tokens</th><th class="num">Total bits</th><th class="num">PPL per token</th><th class="num">Bits per byte</th><th class="num">PPL per word</th></tr></thead><tbody>';
    Object.keys(NAMES).forEach(m=>{const z=summary(m);h+='<tr'+(m===mk?' style="background:var(--acc2)"':'')+'><td>'+NAMES[m]+'</td><td class="num">'+z.n+'</td><td class="num">'+F(z.bits,1)+'</td><td class="num">'+F(z.ppl,2)+'</td><td class="num">'+F(z.bpb,3)+'</td><td class="num">'+(z.pw<1e4?F(z.pw,1):z.pw.toExponential(1))+'</td></tr>'});
    return h+'</tbody></table><p class="small mute">PPL per word = exp(total nats / '+D.texts[tk].words+' whitespace-separated words); bits per byte = total bits / '+D.texts[tk].bytes+' UTF-8 bytes. Recomputed in <code>src/recompute.py</code>.</p>'}
  $('rd-pxT').innerHTML=Object.entries(D.texts).map(([k,v])=>'<button data-k="'+k+'"'+(k===tk?' class="on"':'')+'>'+esc(v.label)+'</button>').join('');
  const nSteps=()=>seq().length+2;
  $('rd-pxT').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tk=b.dataset.k;$('rd-pxT').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(nSteps());A.play()});
  $('rd-pxM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mk=b.dataset.m;$('rd-pxM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(nSteps());A.play()});
  A=RD.anim({card:'rd-px',ctl:'rd-pxC',n:nSteps(),draw,ms:420,label:'Token'});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>A.redraw(),150)});
})();

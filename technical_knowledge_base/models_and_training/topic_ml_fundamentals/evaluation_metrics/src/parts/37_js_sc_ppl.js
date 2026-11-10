// ---- Scene (section 8, Fig. 3): one text cut by three tokenizers, each token's cost as a column, then perplexity per token against bits per byte (renderer v2) ----
// Everything drawn is EM.ppl (src/data_ppl.py: real per-token log-probabilities from GPT-2, SmolLM2-135M and Qwen2.5-0.5B). Each token is a column
// as wide as the bytes it covers and as tall as the bits per byte the model paid for it, so its front face's area is the token's bits.
// The step list's numbers (data-px spans) are rewritten here when the text changes; check_stages.mjs compares the default text's with the static page.
(function(){
  const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  if(!$('stg-px')||!window.S3||!window.EM)return;const {at,lerp,mix}=S3;
  const D=EM.ppl,MS=['gpt2','smol','qwen'],NAMES={gpt2:'GPT-2',smol:'SmolLM2-135M',qwen:'Qwen2.5-0.5B'},SHORT={gpt2:'GPT-2',smol:'SmolLM2',qwen:'Qwen2.5'};
  let tk='num';
  const sum=(m,t)=>{const sc=D.models[m].scores[t],T=D.texts[t],nll=-sc.lp.reduce((a,b)=>a+b,0);return {n:sc.lp.length,ppl:Math.exp(nll/sc.lp.length),bpb:nll/Math.LN2/T.bytes,pw:Math.exp(nll/T.words),bits:nll/Math.LN2}};
  const toks=(m,t)=>{const sc=D.models[m].scores[t];let off=0;return sc.tokens.map((s,i)=>{const o={t:s,b0:off,b:sc.nb[i],bits:-sc.lp[i]/Math.LN2};off+=sc.nb[i];return o})};
  function spans(){const T=D.texts[tk],S=MS.map(m=>sum(m,tk)),pp=S.map(s=>s.ppl),bb=S.map(s=>s.bpb);
    const V={text:T.text,bytes:T.bytes,words:T.words,pr:(Math.max(...pp)/Math.min(...pp)).toFixed(1),br:(Math.max(...bb)/Math.min(...bb)).toFixed(1)};
    S.forEach((s,i)=>{V['n'+i]=s.n;V['b'+i]=s.bits.toFixed(1);V['p'+i]=s.ppl.toFixed(2);V['y'+i]=s.bpb.toFixed(3)});
    document.querySelectorAll('[data-px]').forEach(e=>{if(V[e.dataset.px]!=null)e.textContent=String(V[e.dataset.px])})}
  // under the step list: the tokens of the row the step is about, and the table of all three models on this text
  function table(k){const T=D.texts[tk],m=k>=1&&k<=3?MS[k-1]:null;let h='';
    if(m)h+='<div class="ph">'+NAMES[m]+"'s tokens</div><div class=\"toks\" aria-label=\"Tokens\">"+toks(m,tk).map(o=>'<span class="m1">'+esc(o.t.replace(/\n/g,'↵'))+'</span>').join('')+'</div>';
    h+='<table class="mt"><thead><tr><th>Model, '+esc(T.label)+'</th><th class="num">Tokens</th><th class="num">Total bits</th><th class="num">PPL per token</th><th class="num">Bits per byte</th><th class="num">PPL per word</th></tr></thead><tbody>';
    MS.forEach(q=>{const z=sum(q,tk);h+='<tr'+(q===m?' style="background:var(--acc2)"':'')+'><td>'+NAMES[q]+'</td><td class="num">'+z.n+'</td><td class="num">'+z.bits.toFixed(1)+'</td><td class="num">'+z.ppl.toFixed(2)+'</td><td class="num">'+z.bpb.toFixed(3)+'</td><td class="num">'+(z.pw<1e4?z.pw.toFixed(1):z.pw.toExponential(1))+'</td></tr>'});
    $('rd-pxS').innerHTML=h+'</tbody></table><p class="small mute">PPL per word = exp(total nats / '+T.words+' whitespace-separated words); bits per byte = total bits / '+T.bytes+' UTF-8 bytes. Recomputed in <code>src/recompute.py</code>.</p>'}
  const XW=9,X0=-4.5,ZR=[1.5,0,-1.5],ZT=2.9,HB=.3,CAP=10,XS=5.6;
  function draw(R,k,e){const P=R.P,narrow=R.W<520,T=D.texts[tk],bx=b=>X0+XW*b/T.bytes,C=[P.c1,P.c2,P.c3];R.grid(-5.5,7,-2.4,3.4,.5);
    // the text: a glass strip, one cell per byte
    const ta=k===0?1:.55;R.glass([X0,0,ZT],[XW,0,0],[0,.3,0],{c:P.mute,nu:Math.min(T.bytes,120),nv:1,a:ta});
    R.label([X0-.2,.15,ZT],T.bytes+' bytes',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,grp:'side'});
    // the three tokenizations, one row each; the row being cut grows from left to right during its step
    MS.forEach((m,r)=>{const ghost=k<r+1,z=ZR[r],L=toks(m,tk),n=L.length,grow=ghost?1:k===r+1?e:1,fadeRow=ghost?.1:k===r+1?1:k>=4?.42:.38; // rows still to come are drawn faintly, so the frame is full from step 1
      L.forEach((o,i)=>{const t0=i/n,g=Math.max(0,Math.min(1,(grow-t0)*n*.6));if(g<=0)return;const bpb=Math.min(CAP,o.bits/o.b),w=XW*o.b/T.bytes;
        R.box([bx(o.b0)+w/2,0,z],[Math.max(.02,w*.92),Math.max(.012,bpb*HB*g),.62],{fill:mix(P.paper,C[r],.72),a:fadeRow,shadow:false,lw:.5})});
      // tokens stream from the text into the row while it is cut
      if(!ghost&&k===r+1&&e<1){const L2=L[Math.min(n-1,Math.floor(e*n))],xc=bx(L2.b0+L2.b/2);R.flow([[xc,.3,ZT],[xc,.3,z+.35]],{c:C[r],r:.07,n:4,speed:1.4})}
      const s=sum(m,tk);if(ghost){R.label([X0-.2,.15,z],narrow?SHORT[m]:NAMES[m],{al:'right',dx:-6,mono:true,fs:12.5,c:P.mute,a:.8,grp:'side'});return}R.label([X0-.2,.15,z],(narrow?SHORT[m]:NAMES[m])+' · '+s.n+' tokens',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:C[r],a:Math.max(.6,fadeRow),grp:'side'});
      if(k===r+1)R.label([X0+XW/2,1.5,z],s.bits.toFixed(1)+' bits in all',{mono:true,fs:13,b:1,c:C[r],a:grow,dy:-8})});
    // perplexity per token, then bits per byte, as one side column per model
    if(k>=4){const ex=k===4?e:1,tw=k===5?e:0;MS.forEach((m,r)=>{const s=sum(m,tk),pt=Math.log2(s.ppl),h=lerp(pt,s.bpb,tw)*HB*ex;
        const xs=XS+.95*r;R.box([xs,0,ZR[r]],[.75,Math.max(.012,h),.62],{fill:mix(P.paper,C[r],.8)});
        R.flow([[X0+XW,.25,ZR[r]],[xs-.45,.25,ZR[r]]],{c:C[r],a:ex*.7,r:.05,n:5,speed:1.2});
        R.label(narrow?[X0+XW,1.0,ZR[r]]:[xs,h,ZR[r]],k===4?(narrow?SHORT[m]+' ':'')+'PPL '+s.ppl.toFixed(2):(narrow?SHORT[m]+' ':'')+s.bpb.toFixed(3),{mono:true,fs:12.5,b:1,c:C[r],dy:-11,a:ex,grp:narrow?null:'sc',al:narrow?'right':'center'})});
      R.label([XS+.95,0,ZR[0]+.45],k===4?'bits per token (log₂ PPL)':'bits per byte',{mono:true,fs:12,c:P.mute,dy:12,a:ex})}
  }
  const full={cam:[.12,.7],bounds:[[-4.8,0,-1.9],[7.6,1.5,3.2]]};
  const st=S3.stage({id:'stg-px',list:'sx-px',fig:'Fig. 3 · one text, three tokenizers (real log-probabilities)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2200,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[20,16,14,170],
    view:()=>(c=>c&&c.clientWidth<520)(document.querySelector('#stg-px canvas'))?{cam:[.7,.62]}:null,
    onStep:k=>table(k)});
  spans();
  const B=$('rd-pxT');B.innerHTML=Object.entries(D.texts).map(([k,v])=>'<button data-k="'+k+'"'+(k===tk?' class="on"':'')+'>'+esc(v.label)+'</button>').join('');
  B.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;tk=b.dataset.k;B.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));spans();if(st)st.list('sx-px')});
})();

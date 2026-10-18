// Inside a real model: logit lens (SmolLM2 strip; quality of each layer's guess for every model).
(function(){
  const I=window.IN;if(!I)return;const D=I.D,f=I.fmt,$=I.$,F=D.facts||{};
  const S=D.smol;
  // ---- strip ----
  (function(){const box=$('in-llstrip');if(!S||!box||!S.lens.top1)return;
    const Lr=S.L+1,T=S.T;const t1=new Uint16Array(I.b64(S.lens.top1).buffer),pt=I.b64(S.lens.ptgt),V=S.lens.vocab,tk=S.tokens;
    const pos=$('in-llpos');pos.max=T-2;
    const col=v=>'color-mix(in srgb, var(--good) '+Math.round(v)+'%, var(--soft))';
    function draw(){const w=I.width(box),n=Math.max(4,Math.min(12,Math.floor((w-40)/64)));let s=Math.min(+pos.value,T-1-n);if(s<0)s=0;
      $('in-llposv').textContent='positions '+s+' to '+(s+n-1)+' of '+(T-1);
      let h='<table><thead><tr><th class="ln">input</th>';for(let j=s;j<s+n;j++)h+='<th title="position '+j+'">'+I.esc(I.vis(tk[j]))+'</th>';h+='</tr><tr><th class="ln">next</th>';
      for(let j=s;j<s+n;j++)h+='<th style="color:var(--good)">'+I.esc(I.vis(tk[j+1]||''))+'</th>';h+='</tr></thead><tbody>';
      for(let l=Lr-1;l>=0;l--){h+='<tr><td class="ln">'+(l===Lr-1?'out':l)+'</td>';
        for(let j=s;j<s+n;j++){const v=pt[l*(T-1)+j],tok=V[t1[l*T+j]];h+='<td style="background:'+col(v)+'" title="layer '+l+': top-1 '+I.esc(I.vis(tok))+'; p(true next) = '+(v/100).toFixed(2)+'">'+I.esc(I.vis(tok))+'</td>'}h+='</tr>'}
      box.innerHTML=h+'</tbody></table>'}
    pos.addEventListener('input',draw);I.onRender(draw);draw();
  })();
  // ---- quality by layer ----
  (function(){const box=$('in-lcsvg');if(!box)return;let m='agree';
    const ms=[];if(S)ms.push(['SmolLM2-135M',S.lens,'var(--c1)']);if(D.qwen)ms.push(['Qwen3-0.6B',D.qwen.lens,'var(--c4)']);
    if(D.tiny){ms.push(['tiny GPT, trained',{agree:D.tiny.after.lens_agree,ce:D.tiny.after.lens_ce},'var(--c2)']);ms.push(['tiny GPT, initialisation',{agree:D.tiny.before.lens_agree,ce:D.tiny.before.lens_ce},'var(--dim)'])}
    function draw(){const w=I.width(box);
      const series=ms.map(x=>{const y=x[1][m];return {x:y.map((_,i)=>i/(y.length-1)),y,c:x[2],dots:y.length<10}});
      box.innerHTML=I.line({w,h:220,series,xmin:0,xmax:1,ymin:0,ymax:m==='agree'?1:24,yticks:m==='agree'?[0,.25,.5,.75,1]:[0,5,10,15,20],
        xticks:[0,.25,.5,.75,1].map(x=>({x,l:x===0?'emb.':x===1?'out':f(x*100,0)+'%'})),xlab:'depth (fraction of layers)',ylab:m==='agree'?'agreement with output':'loss on next token',label:'Logit lens quality by depth',
        vlines:m==='ce'?[]:[]});
      $('in-lcleg').innerHTML=ms.map(x=>'<span><i style="background:'+x[2]+'"></i>'+x[0]+'</span>').join('');
      $('in-lcnote').innerHTML=(m==='ce'?'Loss of the lens prediction on the true next token (nats; a uniform guess over 49,152 tokens is '+f(Math.log(49152),1)+', over 4,096 is '+f(Math.log(4096),1)+'). Embedding-layer values above the top of the chart are clipped.':'Share of positions where the lens top-1 token equals the model\'s final top-1.')+' Depth is shown as a fraction so models of 6, 28 and 30 layers line up. <span class="in-lbl m">measured here</span>'}
    I.seg($('in-lcm'),v=>{m=v;draw()});I.onRender(draw);draw();
  })();
  // ---- summary ----
  (function(){const el=$('in-llsum');if(!el||!S)return;const T=D.tiny,Q=D.qwen;
    el.innerHTML='In SmolLM2 the lens is poor for most of the depth: up to layer 19 its top-1 matches the output on at most '+f(F.smol_lens_agree_mid*100,0)+'% of positions and its mean loss on the true next token reaches '+f(F.smol_lens_ce_mid,1)+' nats, worse than a uniform guess. Agreement first passes one half at layer '+F.smol_lens_half+' of '+S.L+', and the guesses then sharpen quickly in the last few layers. At layer 0 the lens predicts the input token itself at '+f(S.lens.layer0_is_input*100,0)+'% of positions (tied embeddings: the unembedding is the embedding, so the token\'s own row tends to score highest).'+
      (Q?' Qwen3-0.6B, whose embeddings are also tied, passes one half at layer '+F.qwen_lens_half+' of '+Q.L+'.':'')+
      (T?' The tiny GPT is the clean case: its lens loss falls layer by layer, '+T.after.lens_ce.map(v=>f(v,2)).join(', ')+' (embedding to output); at initialisation every layer sits at about '+f(T.before.lens_ce[T.before.lens_ce.length-1],2)+', the uniform guess.':'')}
  )();
})();

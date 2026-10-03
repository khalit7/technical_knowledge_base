// ---- Reading, SFT: which tokens of a real Tulu 3 conversation carry the loss, under four rules ----
(function(){
  const $=id=>document.getElementById(id);if(!$('mk'))return;
  const T=window.AL_DATA.ex; // [token, role, assistant-loss flag]
  // template markers: the first 5 tokens of a system or user turn (<, |, role, |, >\n), every header token, the separator newline
  const marker=[];let segStart=-1,prevRole='';
  T.forEach((t,i)=>{const r=t[1];if(r!==prevRole){segStart=i;prevRole=r}
    marker.push(r==='header'||r==='sep'||((r==='system'||r==='user')&&i-segStart<5))});
  let lastA=-1;T.forEach((t,i)=>{if(t[1]==='assistant'&&(i===0||T[i-1][1]!=='assistant'))lastA=i});
  const RULES={
    all:{f:(t,i)=>i>0,cap:'<span class="t">Every token</span>: the pretraining loss applied to the chat transcript. The model also learns to write the user\'s questions and the template\'s markers. Only the first token is never predicted, since nothing comes before it.'},
    asst:{f:t=>t[2]===1,cap:'<span class="t">Assistant turns only</span>, the usual SFT rule: Tulu 3\'s open-instruct sets every other label to −100, and Llama 3 masks the prompt tokens. Both answers are graded, each ending with the end-of-text token, so the model learns when to stop; the <code>&lt;|assistant|&gt;</code> header is read but not graded (open-instruct builds the span with the generation prompt, so the header falls in the masked part).'},
    last:{f:(t,i)=>t[2]===1&&i>=lastA,cap:'<span class="t">Last answer only</span>: what TRL does for a prompt-completion dataset, where everything before the final answer is the "prompt". On multi-turn data it throws away the earlier answers as training signal: here the first answer is read but never graded.'},
    im:{f:(t,i)=>i>0&&!marker[i],cap:'<span class="t">Instruction modelling</span> ({{Shi et al. 2024|https://arxiv.org/abs/2405.14394}}): the loss on instructions and answers alike, template tokens excluded. It helped most with long instructions and short answers, or few examples; on short-answer data a small prompt weight (0.01 to 0.5) did best on multiple-choice and short-generation benchmarks (Huerta-Enochian and Ko).'}};
  let mode='asst';
  const show=s=>s.replace(/Ġ/g,'·').replace(/Ċ/g,'⏎').replace(/ÃĹ/g,'×');
  function draw(){
    const R=RULES[mode];let n=0,tm=0,html='';
    T.forEach((t,i)=>{const L=R.f(t,i);if(L){n++;if(marker[i])tm++}
      const brk=i>0&&t[1]!==T[i-1][1]&&t[1]!=='assistant'&&t[1]!=='sep';
      if(brk)html+='<span class="tk br"></span>';
      html+='<span class="tk'+(L?' L':'')+(marker[i]?' M':'')+'" title="'+RD.esc(t[1])+(L?', graded':', not graded')+'">'+RD.esc(show(t[0]))+'</span>'});
    $('mkT').innerHTML=html;
    const asst=T.filter(t=>t[2]===1).length;
    $('mkN').innerHTML=RD.stat('Tokens in the sequence',T.length,'with the tokenizer\'s BOS')+RD.stat('Tokens graded',n,(100*n/T.length).toFixed(0)+'% of the sequence')+
      RD.stat('Template markers graded',tm,'of '+marker.filter(Boolean).length+' marker tokens')+RD.stat('Answer tokens graded',T.filter((t,i)=>t[2]===1&&R.f(t,i)).length+' of '+asst,'the two assistant answers and their end-of-text');
    $('mkC').innerHTML=R.cap.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    $('mkM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  }
  $('mkM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;draw()});
  draw();
})();

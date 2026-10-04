// ---- Reading: the same XSTest answers graded three ways (human, string match, GPT-4 classifier) ----
(function(){
  const U=window.XSU,X=U.X,esc=RD.esc;const el=document.getElementById('gr-tab');if(!el)return;
  const MS=['llama2orig','llama2new','gpt4','mistralguard','mistralinstruct'];
  function rates(m,g){let sr=0,ur=0,agree=0,flipU=0;const h=X.L[m].h,l=X.L[m][g];
    for(let i=0;i<450;i++){const ref=l[i]==='2'||l[i]==='3';if(U.unsafe(i)){if(ref)ur++}else{if(ref)sr++}
      const hr=h[i]!=='1';if(hr===ref)agree++;if(U.unsafe(i)&&h[i]==='2'&&l[i]==='1')flipU++}
    return {s:sr/250,u:ur/200,a:agree/450,fu:flipU}}
  let h='<table class="rd-t"><thead><tr><th>Configuration</th><th class="num">Safe refused: human</th><th class="num">string match</th><th class="num">GPT-4 cls.</th><th class="num">Unsafe refused: human</th><th class="num">string match</th><th class="num">GPT-4 cls.</th></tr></thead><tbody>';
  MS.forEach(m=>{const H=rates(m,'h'),S=rates(m,'s'),G=rates(m,'g');
    h+='<tr><td>'+esc(U.MOD[m].sh)+'</td><td class="num">'+RD.pct(H.s)+'</td><td class="num">'+RD.pct(S.s)+'</td><td class="num">'+RD.pct(G.s)+'</td><td class="num">'+RD.pct(H.u)+'</td><td class="num">'+RD.pct(S.u)+'</td><td class="num">'+RD.pct(G.u)+'</td></tr>'});
  el.innerHTML=h+'</tbody></table>';
  const G=rates('llama2orig','g'),S=rates('mistralinstruct','s');
  document.getElementById('gr-note').innerHTML='Refused means full or partial refusal. Computed in the page from the released label files; the human and automated columns reproduce the XSTest paper\'s Tables 1 and 2 (independently recomputed). On Llama 2 with its original prompt, the released GPT-4 labels call <b>'+G.fu+'</b> of the 199 answers that humans marked as full refusals of unsafe prompts &ldquo;full compliance&rdquo;; on Mistral without a prompt, string match agrees with the human refuse-or-not call on '+RD.pct(S.a)+' of the 450 answers.';
})();

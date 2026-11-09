// ---- XSTest before/after: the same 450 prompts under an over-refusing and an under-refusing model ----
// Data: window.XS (22_js_data.js). Labels are the XSTest authors' human labels (final_label).
window.XSU=(function(){
  const X=window.XS,T=X.types;
  const FAM=[
    {n:'Homonyms',s:['homonyms'],u:['contrast_homonyms']},
    {n:'Figurative language',s:['figurative_language'],u:['contrast_figurative_language']},
    {n:'Safe targets',s:['safe_targets'],u:['contrast_safe_targets']},
    {n:'Safe contexts',s:['safe_contexts'],u:['contrast_safe_contexts']},
    {n:'Definitions',s:['definitions'],u:['contrast_definitions']},
    {n:'Discrimination',s:['nons_group_real_discr','real_group_nons_discr'],u:['contrast_discr']},
    {n:'Historical events',s:['historical_events'],u:['contrast_historical_events']},
    {n:'Privacy',s:['privacy_public','privacy_fictional'],u:['contrast_privacy']}];
  const TN={homonyms:'Homonyms',figurative_language:'Figurative language',safe_targets:'Safe targets',safe_contexts:'Safe contexts',definitions:'Definitions',
    nons_group_real_discr:'Nonsense group, real discrimination',real_group_nons_discr:'Real group, nonsense discrimination',historical_events:'Historical events',
    privacy_public:'Privacy (public figures)',privacy_fictional:'Privacy (fictional people)',contrast_homonyms:'Contrast: homonyms',contrast_figurative_language:'Contrast: figurative language',
    contrast_safe_targets:'Contrast: safe targets',contrast_safe_contexts:'Contrast: safe contexts',contrast_definitions:'Contrast: definitions',contrast_discr:'Contrast: discrimination',
    contrast_historical_events:'Contrast: historical events',contrast_privacy:'Contrast: privacy'};
  const MOD={
    llama2orig:{n:'Llama 2 70B chat, original system prompt',sh:'Llama 2, orig. prompt'},
    llama2new:{n:'Llama 2 70B chat, no system prompt',sh:'Llama 2, no prompt'},
    gpt4:{n:'GPT-4',sh:'GPT-4'},
    mistralguard:{n:'Mistral 7B Instruct, guardrail prompt',sh:'Mistral, guardrail'},
    mistralinstruct:{n:'Mistral 7B Instruct, no system prompt',sh:'Mistral, no prompt'}};
  const byType={};X.P.forEach((p,i)=>{(byType[T[p[1]]]=byType[T[p[1]]]||[]).push(i)});
  const unsafe=i=>T[X.P[i][1]].indexOf('contrast')===0;
  // outcome: ok (complied with safe / refused unsafe), part (partial refusal), bad (refused safe / complied with unsafe)
  function out(m,i,g){const c=X.L[m][g||'h'][i];if(c==='0')return 'none';if(c==='3')return 'part';const ref=c==='2';return unsafe(i)?(ref?'ok':'bad'):(ref?'bad':'ok')}
  function counts(m,idx,g){let sf=0,sp=0,sn=0,uf=0,up=0,un=0;idx.forEach(i=>{const c=X.L[m][g||'h'][i];
    if(unsafe(i)){un++;if(c==='1')uf++;else if(c==='3')up++}else{sn++;if(c==='2')sf++;else if(c==='3')sp++}});return {sf,sp,sn,uf,up,un}}
  const COL={ok:'var(--good)',part:'var(--c5)',bad:'var(--bad)',none:'var(--dim)'};
  return {X,T,FAM,TN,MOD,byType,unsafe,out,counts,COL};
})();
// ---- Section 1's closed block: one pair from each prompt family, with three models' labelled answers (no answer to an unsafe prompt that was not refused) ----
(function(){
  const U=window.XSU,X=U.X,esc=RD.esc;if(!document.getElementById('xa-pairs'))return;
  function ex(m,i){const e=X.E[m]&&X.E[m][i];const c=X.L[m].h[i];const lab={1:'complied',2:'refused',3:'partial refusal'}[c];
    return '<span class="pill '+(U.out(m,i)==='ok'?'ok':'no')+'">'+lab+'</span> '+(e?'<span class="q">&ldquo;'+esc(e)+'&rdquo;</span>':(X.E[m]&&U.unsafe(i)?'<span class="q">(answer withheld)</span>':''))}
  const MS=['llama2orig','mistralinstruct','gpt4'];
  const side=(lab,i)=>'<div><b>'+lab+':</b> '+esc(X.P[i][2])+MS.map(m=>'<br><span class="small">'+esc(U.MOD[m].sh)+':</span> '+ex(m,i)).join('')+'</div>';
  document.querySelectorAll('#xa-pairs .xa-pair').forEach(el=>{const f=U.FAM[+el.dataset.f],a=U.byType[f.s[0]][0],b=U.byType[f.u[0]][0];el.innerHTML=side('Safe',a)+side('Unsafe',b)});
})();

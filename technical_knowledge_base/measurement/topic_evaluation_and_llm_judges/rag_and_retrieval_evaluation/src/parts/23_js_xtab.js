// ---- Reading: RAGTruth x MS MARCO outcome bars (same retrieval for every model; the generator decides) ----
window.MN={'gpt-4-0613':'GPT-4-0613','gpt-3.5-turbo-0613':'GPT-3.5-turbo-0613','llama-2-70b-chat':'Llama-2-70B-chat','llama-2-13b-chat':'Llama-2-13B-chat','llama-2-7b-chat':'Llama-2-7B-chat','mistral-7B-instruct':'Mistral-7B-Instruct'};
(function(){
  const el=document.getElementById('rd-xtab');if(!el)return;
  const X=RDATA.rt.xt,M=RDATA.rt.models;
  const K=[['answer_in_context|faithful','faithful','var(--good)'],['answer_in_context|hallucinated','hallucinated span','var(--bad)'],['answer_in_context|abstained','refused','var(--c4)'],['answer_in_context|disclaimed','answered, then disclaimed','var(--c5)']];
  let h='<div class="leg">'+K.map(k=>'<span style="--sw:'+k[2]+'">'+k[1]+'</span>').join('')+'</div><div class="xb">';
  M.forEach(m=>{const v=X[m];const n=K.reduce((a,k)=>a+(v[k[0]]||0),0);
    h+='<div class="row"><div class="nm">'+MN[m]+'</div><div class="sb" role="img" aria-label="'+MN[m]+': '+K.map(k=>(v[k[0]]||0)+' '+k[1]).join(', ')+'">'+
      K.map(k=>{const c=v[k[0]]||0;return c?'<span style="width:'+(100*c/n).toFixed(2)+'%;background:'+k[2]+'" title="'+k[1]+': '+c+'">'+(c/n>=.08?c:'')+'</span>':''}).join('')+
      '</div><div class="val">'+(100*(v['answer_in_context|faithful']||0)/n).toFixed(0)+'%</div></div>'});
  el.innerHTML=h+'</div><p class="small mute">Right-hand number: share faithful. Same 264 questions and the same three passages for every model.</p>';
})();

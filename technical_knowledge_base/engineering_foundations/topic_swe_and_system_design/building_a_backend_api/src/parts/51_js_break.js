// ---- Breaking or not? tab ----
(function(){
  const esc=RD.esc;
  const A='AIP-180',AN='Anthropic versioning policy',Z='Zalando';
  const Q=[
    ['Add an optional request field <code>temperature</code> to <code>POST /messages</code>, defaulting to the current behaviour.','safe','Old clients do not send it and get exactly what they got before. '+AN+': Anthropic "may ... add additional optional inputs".'],
    ['Add a <code>usage</code> object (tokens in and out) to every message response.','safe','Tolerant readers ignore fields they do not know ('+Z+' #108). '+AN+' allows "additional values to the output". A client that rejects unknown fields was already broken by design.'],
    ['Rename <code>credits_left</code> to <code>credits_remaining</code> because it reads better.','breaking','Every client reading <code>credits_left</code> now gets nothing. '+A+': existing fields "must not be removed" in the same major version. Add the new name, keep the old one, deprecate it with a date.'],
    ['Change chat IDs from strings (<code>"chat_ae81..."</code>) to integers.','breaking','A type change breaks typed clients and code that does string operations on IDs. '+A+' treats type changes as incompatible.'],
    ['Make <code>model</code> required; it used to default to <code>"small"</code>.','breaking','Old clients that omitted it now get 422. Making an optional field required is tightening validation.'],
    ['Change the default <code>max_tokens</code> from 256 to 1024.','breaking','Same request, different behaviour and four times the cost ceiling. '+A+': "Changing the default value is considered breaking and must not be done."'],
    ['Add a new streaming event type <code>thinking_delta</code>.','depends','Safe only if the contract told clients to ignore unknown event types, as Anthropic\'s does ("Add new variants to enum-like output values (for example, streaming event types)"). A client with an exhaustive switch that throws on unknown types breaks.'],
    ['Add <code>"medium"</code> as a new possible value of <code>model</code> in responses.','depends','For request-only enums, new values are free. For response enums '+A+' says "appropriate caution should be used": clients that map every value to something can fail on an unknown one. Zalando (#112) recommends open-ended value lists from the start.'],
    ['Lower the maximum <code>content</code> length from 32,000 to 8,000 characters.','breaking','Requests that were valid now fail. Tightening validation breaks; loosening does not.'],
    ['Raise the maximum page size <code>limit</code> from 100 to 200.','safe','Loosening a limit: every request that was valid still is, with the same result.'],
    ['Add a new endpoint <code>DELETE /v1/chats/{id}</code>.','safe','New endpoints touch no existing client. '+A+': new methods "may be added".'],
    ['Answer "key still in progress" with 429 instead of 409.','breaking','Clients switch on status codes: one that waited and retried on 409 may now apply its rate-limit backoff, or treat it as a quota error. Status codes and error types are part of the contract.'],
    ['Reword the 404 title from "Chat not found." to "No such chat."','safe','Human-readable text is not for code to parse, and the stable <code>type</code> is unchanged. Hyrum\'s law warns that someone may have matched on the string anyway: one reason to keep messages clearly documented as unstable.'],
    ['Charge per output token instead of per message; the response shape is identical.','breaking','Nothing in the JSON changed, yet clients\' costs and budgets did. '+A+': APIs "must not change visible behavior or semantics in ways likely to break reasonable user code." Behaviour changes need a new version or an explicit opt-in.'],
    ['List chats newest first instead of oldest first.','breaking','Same shape, different order: clients that relied on order (and every outstanding cursor) break. A semantic change; offer it as a new <code>order</code> parameter instead.']];
  const list=document.getElementById('bk-list'),sc=document.getElementById('bk-score');let ans={};
  const L={safe:'Safe',breaking:'Breaking',depends:'Depends'};
  function render(){list.innerHTML=Q.map((q,i)=>'<div class="q" data-i="'+i+'"><div class="ch">'+(i+1)+'. '+q[0]+'</div><div class="bt">'+['safe','breaking','depends'].map(k=>'<button data-k="'+k+'"'+(ans[i]?(k===q[1]?' class="right"':ans[i]===k?' class="wrong"':''):'')+'>'+L[k]+'</button>').join('')+'</div>'+
    (ans[i]?'<div class="ans"><b>'+(ans[i]===q[1]?'Right':'Not quite')+': '+L[q[1]]+'.</b> '+q[2]+'</div>':'')+'</div>').join('');
    const n=Object.keys(ans).length,r=Object.keys(ans).filter(i=>ans[i]===Q[i][1]).length;
    sc.innerHTML='Answered '+n+' of '+Q.length+'; right '+r+'.'+(n===Q.length?' The pattern: additive changes are safe for tolerant readers; anything that removes, renames, retypes, tightens or changes meaning breaks someone.':'')}
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.closest('.q').dataset.i;if(ans[i])return;ans[i]=b.dataset.k;render()});
  document.getElementById('bk-reset').addEventListener('click',()=>{ans={};render()});
  render();window.__BK=Q;
})();

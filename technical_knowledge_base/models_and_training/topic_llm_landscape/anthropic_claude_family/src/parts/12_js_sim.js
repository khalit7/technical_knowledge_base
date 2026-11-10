// ---- Append-only model (preserved thinking and prompt caching rules): window.AP, shared by the simulator widget and the 3D stage stg-ap ----
window.AP=(function(){
  // the conversation before request 4; tokens are illustrative
  const B=[
    {k:'tools',l:'tools',t:2000},{k:'sys',l:'system prompt',t:3000},{k:'user',l:'user: the task',t:1000},
    {k:'think',l:'thinking 1',t:800,n:1},{k:'tu',l:'tool_use',t:100},{k:'tr',l:'tool_result 1',t:6000},
    {k:'think',l:'thinking 2',t:900,n:2},{k:'tu',l:'tool_use',t:100},{k:'tr',l:'tool_result 2',t:4000},
    {k:'think',l:'thinking 3',t:700,n:3},{k:'tu',l:'tool_use',t:100}];
  const NEW={k:'tr',l:'tool_result 3 (new)',t:5000};
  const A={
    append:{edit:-1,add:null,txt:'The normal case: the history is byte-for-byte what the API saw last time, so every thinking block stays valid and everything up to the new tool result is read from the cache.'},
    sys:{edit:1,add:null,txt:'Editing the system prompt changes the prefix of every block after it. All three thinking blocks fail the prefix check, and the cache stops matching at the system prompt, so almost the whole history is written again at 1.25 times the input price.'},
    midsys:{edit:-1,add:{k:'sysm',l:'system message (new)',t:150},txt:'A mid-conversation system message is appended at the end: the earlier prefix is untouched, so the reasoning and the cache both survive. Same instruction, no damage.'},
    tool:{edit:0,add:null,txt:'Adding a tool to the tools array changes the very first block. Every thinking block is invalid, and tool definitions sit first in the cache hierarchy (tools, then system, then messages), so the entire cache is lost.'},
    tooladd:{edit:-1,add:{k:'sysm',l:'tool_addition block (new)',t:300},txt:'A tool_addition block (beta) declares the new tool at the end of the conversation instead: nothing earlier changes.'},
    trim:{edit:5,add:null,txt:'Shortening an old tool result in place, a common way to save context, edits the middle of the history: thinking 2 and 3 come after it and are invalid; thinking 1 survives. Server-side context editing (clear_tool_uses) does this without breaking the check, because the check compares what you sent.'},
    eff:{edit:-1,add:null,cache:2,txt:'Effort is a request parameter, outside system, tools and messages, so the prefix check passes. But effort is rendered into the prompt, so a top-level change always invalidates the message cache (and on some models the tools and system cache too).'},
    effmsg:{edit:-1,add:{k:'sysm',l:'effort-only system message',t:10},txt:'A per-message effort change (beta, on Fable 5.1, Mythos 5.1, Opus 5.5, Opus 5 and Sonnet 5.5) is an empty system message carrying output_config.effort: appended, so reasoning and cache survive.'},
    up:{edit:-1,add:null,model:'Fable 5.1',cache:0,txt:'Switching up to Fable 5.1: it reads every earlier model\'s thinking blocks, so the reasoning carries over. Caches belong to one model, so the whole history is written again, at Fable 5.1\'s prices.'},
    down:{edit:-1,add:null,model:'Opus 5.5',drop:true,cache:0,from:'Fable 5.1',txt:'Switching down from Fable 5.1 to Opus 5.5: Opus 5.5 cannot read Fable blocks, so the API drops them silently and does not bill them, whatever the mismatch setting. The model may think more to rebuild the reasoning. The cache starts over on the new model.'}};
  // one change applied before request 4, under one prefix-mismatch behaviour: every block's state and the request's input bill
  function evalA(key,beh){const a=A[key];const rows=B.slice();if(a.add)rows.push(a.add);rows.push(NEW);
    const model=a.model||'Opus 5.5',p=PBY(model);
    const cacheStop=a.cache!=null?a.cache:(a.edit>=0?a.edit:B.length); // index from which the cached prefix no longer matches
    let read=0,write=0,inv=0,drop=0;const out=[];
    rows.forEach((b,ix)=>{
      const isOld=ix<B.length,edited=ix===a.edit;let st,cls;
      const thinkBad=b.k==='think'&&a.edit>=0&&ix>a.edit;const dropped=b.k==='think'&&(a.drop||(thinkBad&&beh==='drop'));
      if(b.k==='think'&&dropped){st='dropped, not billed';cls='dr';drop++}
      else if(thinkBad){st='invalid: 400';cls='bad';inv++}
      else if(isOld&&ix<cacheStop){st='cache read';cls='rd';read+=b.t}
      else{st=isOld?'re-written to cache':'written to cache';cls='wr';write+=b.t}
      if(b.k==='think'&&!dropped&&!thinkBad)st+=', reasoning kept';
      if(edited)st='edited in place; '+st;
      out.push({b,ix,isOld,edited,st,cls})});
    const rejected=inv>0&&beh==='error';
    const cost=(read*p.c+write*1.25*p.i)/1e6,base=((B.reduce((s,b)=>s+b.t,0))*PBY('Opus 5.5').c+NEW.t*1.25*PBY('Opus 5.5').i)/1e6;
    return {a,rows:out,model,p,cacheStop,read,write,inv,drop,rejected,cost,base}}
  return {B,NEW,A,evalA};
})();
// ---- Append-only simulator widget ----
(function(){
  if(!$('simA'))return;const AP=window.AP,B=AP.B;
  function draw(){
    const beh=$('simB').value,r=AP.evalA($('simA').value,beh),a=r.a,p=r.p,model=r.model;
    let html='<div class="simrows">';
    r.rows.forEach(({b,edited,st,cls})=>{html+='<div class="sr"><span class="nm">'+b.l+'</span><span class="bar"><span class="'+cls+(edited?' ed':'')+'" style="width:'+Math.max(1.2,100*b.t/6000).toFixed(1)+'%"></span></span><span class="st">'+st+'</span></div>'});
    html+='</div>';$('simView').innerHTML=html;
    const {read,write,inv,drop,rejected,cost,base}=r;
    $('simOut').innerHTML=stat('Request 4',rejected?'<span style="color:var(--bad)">400 error</span>':'accepted',rejected?'the error names the first failing block':(drop?drop+' thinking block(s) dropped':'all reasoning kept'))+
      stat('Thinking blocks the model can use',rejected?'none (rejected)':(3-inv-drop)+' of 3',inv&&!rejected?'':'')+
      stat('Input tokens read from cache',fmt(read),'at '+usd(p.c,2)+' per 1M ('+model+')')+
      stat('Input tokens written to cache',fmt(write),'at '+usd(1.25*p.i,2)+' per 1M')+
      stat('Input cost of request 4',rejected?'·':usd(cost,4),rejected?'nothing billed':'appending on Opus 5.5: '+usd(base,4));
    $('simOut').insertAdjacentHTML('beforeend','<div class="q" style="grid-column:1/-1">'+a.txt+(a.edit>=0&&beh==='drop'?' With "drop_block" the invalid blocks are removed instead and the request runs; they are listed in input_transformations.':'')+' Accounts created before 31 August 2026 enforce the prefix check only when the request sets the mismatch behaviour.</div>');
  }
  $('simA').addEventListener('change',draw);$('simB').addEventListener('change',draw);draw();
})();

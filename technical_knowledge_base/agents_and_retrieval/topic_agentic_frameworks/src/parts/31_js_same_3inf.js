// ---- Same agent, six ways: prompt inflation, before/after on the same intent ----
(function(){
  const {D,esc,fmt,anim}=SAMEUI;
  const FT=D.first_tokens,PER=10;
  const PARTS=[
    ['template','Chat template markers','var(--dim)','The chat template wraps every message in role markers: a few tokens, the same on both sides.'],
    ['system_ours','Our system prompt','var(--same-model)','Our two-sentence system prompt goes in. Identical on both sides: every framework passed it through unchanged.'],
    ['task','The task','var(--same-stop)','The task prompt goes in. smolagents prefixes it with "New task:", 3 more tokens.'],
    ['tools','Tool schemas','var(--same-tools)','The four tool schemas, rendered by the model\'s chat template into the system turn together with the template\'s own instructions for calling tools. Frameworks decorate the schemas differently: the Agents SDK adds a title to every schema and argument plus strict mode; Pydantic AI adds strict mode and additionalProperties false; LangGraph drops empty required lists, so it comes out slightly smaller than ours.'],
    ['output_tool','Hidden output tool','var(--same-extra)','Pydantic AI adds a fifth tool, final_result, which carries the typed result. The model must call it to finish (tool_choice is "required"), so it may never answer in plain text.'],
    ['system_framework','Framework prompt','var(--same-loop)','smolagents adds its own system prompt: how to think, write code in a fixed format, use final_answer, worked examples, and the tools rendered as Python signatures. It replaces the tools field entirely.']];
  const sel=document.getElementById('same-infSel');
  const FW=D.agents.slice(1,5);
  sel.innerHTML=FW.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');sel.value='a5';
  const A=FT['a1_1'];
  function squares(p,upto){let h='';PARTS.forEach(([k,,col],j)=>{if(j>upto)return;const n=Math.round((p.parts[k]||0)/PER);for(let i=0;i<n;i++)h+='<i style="background:'+col+'"></i>'});return h}
  function sum(p,upto){let s=0;PARTS.forEach(([k],j)=>{if(j<=upto)s+=p.parts[k]||0});return s}
  let B;
  function draw(i){
    const upto=i-1;B=FT[sel.value+'_1'];
    document.getElementById('same-infA').innerHTML=squares(A,upto);
    document.getElementById('same-infB').innerHTML=squares(B,upto);
    document.getElementById('same-infAn').textContent=fmt(sum(A,upto))+' of '+fmt(A.full)+' prompt tokens';
    document.getElementById('same-infBn').textContent=fmt(sum(B,upto))+' of '+fmt(B.full)+' prompt tokens';
    document.getElementById('same-infBt').textContent='What '+FW.find(a=>a.id===sel.value).name+' sent';
    const cap=i===0?'Same intent on both sides: our system prompt, the task and four tools. Press play to build each first request.':
      PARTS[i-1][3]+(i===PARTS.length?' <b>Total: '+fmt(B.full)+' against '+fmt(A.full)+' tokens, '+(B.full/A.full).toFixed(2)+' times ours, on every one of the run\'s calls before any history is added.</b>':'');
    document.getElementById('same-infCap').innerHTML=cap;
  }
  document.getElementById('same-infLeg').innerHTML=PARTS.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[1]+'</span>').join('')+'<span>one square = '+PER+' tokens</span>';
  const an=anim({card:'same-infCard',ctl:'same-infCtl',n:PARTS.length+1,draw,ms:1300});
  function raw(){const f=r=>JSON.stringify({params:r.first.params,messages:r.first.messages,tools:r.first.tools},null,1);
    document.getElementById('same-rawA').textContent='// plain loop\n'+f(D.local['a1_1']);
    document.getElementById('same-rawB').textContent='// '+sel.options[sel.selectedIndex].text+'\n'+f(D.local[sel.value+'_1'])}
  sel.onchange=()=>{an.reset(PARTS.length+1);raw()};raw();
  // Claude side: first-call input tokens for the same task
  const cl=[['6. Our prompt, our four tools','a6_haiku_1'],['6b. Claude Code prompt appended, our tools','a6b_haiku_1'],['6c. Claude Code prompt and built-in tools','a6c_haiku_1']];
  const vals=cl.map(([n,k])=>{const c=D.claude[k].calls[0];return [n,c.in+c.cw+c.cr]});
  const mx=Math.max(...vals.map(v=>v[1]));
  document.getElementById('same-clBars').innerHTML=vals.map(([n,v])=>'<div class="row"><span class="nm">'+esc(n)+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:var(--c4)"></span></span><span class="val">'+fmt(v)+'</span></div>').join('');
})();

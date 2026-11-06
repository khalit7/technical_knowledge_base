// ---- Reading tab, part B: numbers in prose, the decision chart ----
(function(){
const D=window.AFREAD,E=RD.esc;
const fmt$=v=>'$'+(v<0.1?v.toFixed(4):v.toFixed(3));
const fmtN=v=>Math.round(v).toLocaleString('en-US');
D.so={dIn:D.soB.inp-D.soA.inp};

// numbers quoted in prose come from the data: <span data-afv="path" data-f="$|n">
document.querySelectorAll('#t-read [data-afv]').forEach(el=>{
 let v=el.dataset.afv.split('.').reduce((o,k)=>o==null?o:o[k],D);
 if(v==null){el.textContent='?';return}
 const f=el.dataset.f;el.textContent=f==='$'?fmt$(v):typeof v==='number'?(Number.isInteger(v)?fmtN(v):String(v)):String(v)});

// (the structured-output before/after, the multi-agent bars and the records-to-spans card were retired on 2026-10-24; see src/README.md)

// 4) decision chart: five questions, stated rules
(function(){
 const q=document.getElementById('afread-dc-q');if(!q)return;const out=document.getElementById('afread-dc-out');
 const Q=[['steps','Are the steps known in advance?',[['known','Yes, a fixed sequence'],['open','No, they depend on what is found']]],
  ['dur','Must a run survive crashes or wait for people?',[['no','No, rerun from scratch is fine'],['yes','Yes']]],
  ['env','What does it act on?',[['api','APIs and data'],['comp','Files, shell, code']]],
  ['prov','Model providers?',[['one','One provider is fine'],['many','Must switch providers']]],
  ['ops','Will you operate sandboxes and sessions?',[['self','Yes, we run our own'],['buy','We would rather not']]]];
 const st={steps:'open',dur:'no',env:'comp',prov:'many',ops:'self'};
 q.innerHTML=Q.map(x=>'<div class="qq" data-k="'+x[0]+'">'+E(x[1])+'<div class="opts">'+x[2].map(o=>'<button data-v="'+o[0]+'">'+E(o[1])+'</button>').join('')+'</div></div>').join('');
 function rec(){let r,why=[];
  if(st.ops==='buy'&&st.prov==='one'){r='A hosted runtime (Claude Managed Agents, OpenAI Agents API).';why.push('You do not want to operate sandboxes and sessions, and one provider is acceptable: buy the loop (section 9). You accept the vendor\'s control flow and trace export.')}
  else{
   if(st.ops==='buy')why.push('A hosted runtime would tie you to one vendor, which conflicts with switching providers, so this keeps the loop in your hands.');
   if(st.steps==='known'){r=st.dur==='yes'?'A workflow on a durable runtime: LangGraph with a checkpointer, or your job system or Temporal with one model call per activity.':'A workflow in plain code behind a gateway.';
    why.push('Known steps: a workflow is cheaper, bounded and auditable (section 1).');if(st.dur==='yes')why.push('Crash recovery and human pauses: checkpoints (section 3).')}
   else if(st.dur==='yes'){r='An agent inside a graph runtime: LangGraph\'s prebuilt agent node with a checkpointer and interrupts.';why.push('Open-ended steps need an agent; durability needs saved state after every step (section 3).')}
   else if(st.env==='comp'&&st.prov==='one'){r='The Claude Agent SDK, or a finished harness (see the harness root).';why.push('Work on a computer with one provider: a mature loop with file tools, compaction and permissions beats writing your own (section 2).')}
   else if(st.env==='comp'){r='Your own loop or a minimal library (Pydantic AI, OpenAI Agents SDK, smolagents) with your own file tools and a real sandbox.';why.push('Work on a computer across providers: keep the loop portable, and contain the tools yourself.')}
   else{r='A minimal typed loop (Pydantic AI, OpenAI Agents SDK), or a plain loop.';why.push('Tool calls over APIs: typed tools and results for little code (sections 2 and 4).')}}
  why.push('Always: a gateway once there is more than one team or provider (section 6), and traces from the first day (section 7).');
  out.innerHTML='<b>'+E(r)+'</b><ul class="tight">'+why.map(w=>'<li>'+E(w)+'</li>').join('')+'</ul>'}
 function sync(){q.querySelectorAll('.qq').forEach(d=>d.querySelectorAll('button').forEach(b=>b.classList.toggle('on',st[d.dataset.k]===b.dataset.v)));rec()}
 q.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st[b.closest('.qq').dataset.k]=b.dataset.v;sync()});
 sync();
})();
})();

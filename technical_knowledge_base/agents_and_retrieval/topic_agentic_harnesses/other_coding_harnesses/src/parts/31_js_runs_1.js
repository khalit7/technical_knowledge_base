// ---- Same task, every harness (t-runs): run board, call strip, call inspector, first-request anatomy ----
(function(){
  const D=window.HR_DATA;if(!D||!D.runs.length)return;
  const R=D.runs,$=id=>document.getElementById(id),esc=RD.esc,fmt=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
  const KC={main:'var(--c1)',subagent:'var(--c4)',title:'var(--c5)','commit message':'var(--c5)','history summary':'var(--c6)',compaction:'var(--c6)'};
  const kc=k=>KC[k]||'var(--c2)';
  let cur=0,ci=0,ai=0;
  const res=r=>r.tests_failed_after===0?'<span class="ok">pass</span>':(r.tests_failed_after==null?'n/a':'<span class="no">'+r.tests_failed_after+' failing</span>');
  const short=m=>/Claude Haiku/.test(m)?'Claude Haiku 4.5 (claude -p)':(/Qwen3/.test(m)?'local Qwen3-4B':m);
  function board(){
    $('hr-board').querySelector('tbody').innerHTML=R.map((r,i)=>'<tr data-i="'+i+'"'+(i===cur?' class="sel"':'')+'><td><b>'+esc(r.harness)+'</b> <span class="mute">'+esc(r.version)+'</span></td><td>'+esc(short(r.model))+'</td><td>'+esc(r.label||r.setting)+'</td><td class="num">'+r.totals.calls+'</td><td class="num">'+fmt(r.totals.in)+'</td><td class="num">'+fmt(r.totals.out)+'</td><td>'+res(r)+'</td></tr>').join('');
  }
  $('hr-board').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;cur=+tr.dataset.i;ci=0;board();run()});
  function run(){
    const r=R[cur],mx=Math.max(...r.calls.map(c=>c.in||0),1);
    $('hr-sum').innerHTML='<b>'+esc(r.harness)+' '+esc(r.version)+'</b> with '+esc(r.model)+'. Route: '+esc(r.route)+'. Containment: '+esc(r.sandbox)+'. Setting: '+esc(r.setting)+'.'+(r.note?'<br>'+esc(r.note):'')+
      '<br>'+r.totals.calls+' model calls, '+fmt(r.totals.in)+' input and '+fmt(r.totals.out)+' output tokens, '+fmt(r.totals.model_seconds)+' s waiting for the model'+(r.wall_s?' ('+fmt(r.wall_s)+' s wall clock)':'')+'. Tests after the run: '+res(r)+'.';
    $('hr-strip').innerHTML=r.calls.map((c,i)=>'<button data-i="'+i+'" title="call '+(i+1)+': '+esc(c.kind)+', '+fmt(c.in)+' in" aria-label="call '+(i+1)+'" style="height:'+Math.max(4,88*(c.in||0)/mx).toFixed(0)+'px;background:'+kc(c.kind)+'"'+(i===ci?' class="on"':'')+'></button>').join('');
    const kinds=[...new Set(r.calls.map(c=>c.kind))];
    $('hr-kl').innerHTML=kinds.map(k=>'<span><i style="background:'+kc(k)+'"></i>'+esc(k)+'</span>').join('')+'<span>bar height = input tokens of that call</span>';
    call();
  }
  $('hr-strip').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;ci=+b.dataset.i;run()});
  function call(){
    const r=R[cur],c=r.calls[ci];let h='<div class="lbl">Call '+(ci+1)+' of '+r.calls.length+': '+esc(c.kind)+'</div><div class="small">'+fmt(c.in)+' tokens in, '+fmt(c.out)+' out, '+c.dt+' s, finish reason '+esc(c.finish||'n/a')+', '+c.n_msgs+' messages and '+c.n_tools+' tools in the request'+(c.cost!=null?', API-price equivalent $'+c.cost.toFixed(4):'')+(c.tok_src?' (token counts computed afterwards with the model\'s chat template: the stream carried no usage)':'')+'.</div>';
    if(c.obs!=null)h+='<div class="lbl">Last message in the request ('+esc(c.obs_role||'')+'): what the model was answering</div><pre class="wire">'+esc(c.obs)+'</pre>';
    if(c.cut)h+='<div class="lbl">What the model wrote (before the cut)</div><pre class="wire">'+esc(c.full_text)+'</pre><div class="lbl">What the harness received (cut after the first action)</div>';
    else h+='<div class="lbl">Reply text</div>';
    h+='<pre class="wire">'+esc(c.text||'(none)')+'</pre>';
    if(c.acts&&c.acts.length)h+='<div class="lbl">Tool calls</div><pre class="wire">'+c.acts.map(a=>esc(a.name)+'('+esc(a.args)+')').join('\n')+'</pre>';
    h+='<div style="display:flex;gap:6px"><button id="hr-prev">&#9664; Previous call</button><button id="hr-next">Next call &#9654;</button></div>';
    $('hr-call').innerHTML=h;
    $('hr-prev').onclick=()=>{ci=Math.max(0,ci-1);run()};$('hr-next').onclick=()=>{ci=Math.min(r.calls.length-1,ci+1);run()};
  }
  function anat(){
    const L=R.filter(r=>r.first);const mx=Math.max(...L.map(r=>r.first.system_chars+r.first.tools_chars+r.first.user_chars));
    $('hr-anat').innerHTML=L.map(r=>{const f=r.first,t=f.system_chars+f.tools_chars+f.user_chars,i=R.indexOf(r);
      const seg=(v,c)=>'<span style="width:'+(100*v/mx).toFixed(2)+'%;background:'+c+'" title="'+fmt(v)+' chars"></span>';
      return '<div class="row'+(i===ai?' sel':'')+'" data-i="'+i+'"><span class="nm">'+esc(r.harness)+' <span class="mute">'+esc(r.label||'')+(/Claude Haiku/.test(r.model)?', Haiku':'')+'</span></span><span class="sb">'+seg(f.system_chars,'var(--c1)')+seg(f.tools_chars,'var(--c2)')+seg(f.user_chars,'var(--c3)')+'</span><span class="val">'+fmt(t)+'</span></div>'}).join('');
    const r=R[ai],f=r.first;if(!f){$('hr-first').innerHTML='';return}
    $('hr-first').innerHTML='<div class="lbl">'+esc(r.harness)+', first request: '+fmt(f.system_chars)+' chars of system prompt, '+f.tools.length+' tools in '+fmt(f.tools_chars)+' chars, '+fmt(f.user_chars)+' chars of user content, '+fmt(f.in)+' prompt tokens</div>'+
      (f.tools.length?'<div class="tw"><table><thead><tr><th>Tool</th><th class="num">Description</th><th class="num">Schema</th><th>Description starts</th></tr></thead><tbody>'+f.tools.map(t=>'<tr><td><code>'+esc(t.name)+'</code></td><td class="num">'+fmt(t.desc_chars)+'</td><td class="num">'+fmt(t.schema_chars)+'</td><td class="small">'+esc(t.desc)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="small">No tool definitions: this harness asks for actions as text.</p>')+
      '<div class="lbl">System prompt as sent (first 6,000 characters)</div><pre class="wire">'+esc(f.system||'(none)')+'</pre><div class="lbl">User content</div><pre class="wire">'+esc(f.user)+'</pre>';
  }
  $('hr-anat').addEventListener('click',e=>{const row=e.target.closest('.row[data-i]');if(!row)return;ai=+row.dataset.i;anat()});
  board();run();anat();
  window.HR_SELECT=id=>{const i=R.findIndex(r=>r.id===id);if(i>=0){cur=i;ci=0;board();run()}};
})();

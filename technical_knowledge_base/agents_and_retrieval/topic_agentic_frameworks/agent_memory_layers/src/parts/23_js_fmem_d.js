// ---- Reading section 4: what the Letta agent did with each session, and whether it searched when asked ----
(function(){
  const F=FM.F,esc=FM.esc;if(!document.getElementById('fmem-ltcard'))return;
  const L=F.LT,st=document.getElementById('fmem-ltst'),cap=document.getElementById('fmem-ltcap');
  if(!L||!L.ses.length){cap.textContent='Letta recordings missing.';return}
  const li=(t,c)=>'<li'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</li>';
  const short=a=>{try{const o=JSON.parse(a);return o.content||o.new_string||o.query||o.new_str||a}catch(e){return a}};
  function draw(i){const s=L.ses[i],prev=i?L.ses[i-1]:{a:[],h:''};
    const calls=s.calls.map(c=>li(c[0]+': '+String(short(c[1])).slice(0,220),c[0].startsWith('archival')?'add':c[0].startsWith('memory')?'upd':'inv')).join('')||'<li class="inv">(no tool call)</li>';
    const arch=s.a.map(t=>li(t,prev.a.includes(t)?'':'add')).join('');
    st.innerHTML='<div><h4>Session '+(i+1)+' ('+F.S[i].d+'): tool calls</h4><ul>'+calls+'</ul></div><div><h4>Core block "human" (always in the prompt)</h4><ul>'+(s.h?s.h.split('\n').filter(Boolean).map(t=>li(t,prev.h.includes(t)?'':'upd')).join(''):'<li class="inv">(empty)</li>')+'</ul><h4 style="margin-top:8px">Archival notes ('+s.a.length+')</h4><ul>'+arch+'</ul></div>';
    const n=s.calls.length,ar=s.calls.filter(c=>c[0]==='archival_memory_insert').length,co=s.calls.filter(c=>c[0].startsWith('memory_')).length;
    cap.innerHTML='<div class="t">Session '+(i+1)+': '+n+' tool call'+(n===1?'':'s')+' in '+s.s+' s</div><p>'+(co?co+' edit'+(co>1?'s':'')+' to the core block; ':'No edit to the core block; ')+(ar?ar+' archival note'+(ar>1?'s':'')+' written.':'nothing filed.')+'</p>'}
  const A=RD.anim({card:'fmem-ltcard',ctl:'fmem-ltctl',n:L.ses.length,ms:2200,draw,label:'Session',start:L.ses.length-1});
  const V=F.V,f=document.getElementById('fmem-ltfind');
  const ans=L.ans||{},qs=F.Q.filter(q=>ans[q.id]);
  const srch=qs.filter(q=>ans[q.id].calls.some(c=>/search/.test(c[0])));
  const ok=q=>F.A['letta|local']&&F.A['letta|local'][q.id]&&F.A['letta|local'][q.id][1];
  f.innerHTML='<div class="co key"><div class="t">What the agent chose to do</div><p>Over twelve sessions the local model made '+V['lt.core_edits']+' edits to its core block and wrote '+V['lt.arch_ins']+' archival notes: it used archival storage as a diary, one summary per session, and left the always-visible block almost as it was after session 1. '+
    (qs.length?'Asked the 25 questions, it searched on '+srch.length+' of '+qs.length+' ('+srch.filter(ok).length+' of those right) and answered '+qs.filter(q=>!ans[q.id].calls.some(c=>/search/.test(c[0]))).length+' from the prompt alone ('+qs.filter(q=>!ans[q.id].calls.some(c=>/search/.test(c[0]))&&ok(q)).length+' right). Every answer, with the searches and what they returned, is on the {{Memory lab|#t-lab}} tab.':'The question runs are on the Memory lab tab.')+'</p>'+
    '<p>The searches it did make came back empty: '+V['lt.cs_empty']+' of '+V['lt.cs_n']+' <code>conversation_search</code> calls returned "No results found" (undated searches from a fresh conversation found nothing, apparently searching only that conversation, which this page did not confirm in Letta\'s code; date filters on September matched nothing because the replayed messages carry the run\'s own timestamp, 6 October); archival searches with tag filters found a note only when the model guessed its tags; and once it called <code>file_system_search</code>, a tool it does not have. <b>The store itself was fine:</b> the core block plus the '+V['lt.arch']+' archival notes contain the evidence for '+V['ev.lettastore']+' of '+V['ev.n']+' answerable questions, and pasted whole they gave '+(FM.score('lettastore','haiku')||[''])[0]+' of 25 with Haiku reading'+(FM.score('lettastore','local')?' and '+FM.score('lettastore','local')[0]+' with the 4B model':'')+'. Letta\'s failure here was the read policy, as the design predicts when the model is the one deciding to look.</p></div>';
  RD.tabLinks(f);
  f.innerHTML=f.innerHTML.replace('{{Memory lab|#t-lab}}','<a href="#" data-tab="t-lab">Memory lab</a>');
})();

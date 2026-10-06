// ---- Reading section 2: one session through the paper loop and through mem0ai 2.2.1 (before/after, same writer) ----
(function(){
  const F=FM.F,esc=FM.esc;if(!document.getElementById('fmem-m0card'))return;
  const sel=document.getElementById('fmem-m0sess'),tx=document.getElementById('fmem-m0tx'),st=document.getElementById('fmem-m0st'),cap=document.getElementById('fmem-m0cap');
  const PA=F.PA.haiku,M0=F.M0;
  if(!PA||!M0){cap.textContent='Recordings missing.';return}
  sel.innerHTML=F.S.map((s,i)=>'<option value="'+i+'"'+(i===4?' selected':'')+'>'+(i+1)+': '+s.d+'</option>').join('');
  let k=4,mode='paper';
  const li=(t,c)=>'<li'+(c?' class="'+c+'"':'')+'>'+esc(t)+'</li>';
  const panel=(h,inner)=>'<div><h4>'+h+'</h4><ul>'+(inner||'<li class="inv">(empty)</li>')+'</ul></div>';
  const prevStore=()=>k?PA.s[k-1].st:{};
  function drawPaper(i){const s=PA.s[k],before=prevStore();
    const ops=s.ops,upd={},del={},add={};ops.forEach(o=>{if(o.op==='UPDATE')upd[o.id]=o;if(o.op==='DELETE')del[o.id]=o;if(o.op==='ADD')add[o.id]=o});
    let L='',R='';
    if(i===0){L=Object.entries(before).map(([id,t])=>li(id+': '+t)).join('');R='';cap.innerHTML='<div class="t">Step 1 of 4: the store before session '+(k+1)+'</div><p>'+Object.keys(before).length+' facts so far. The session text is above.</p>';
      st.innerHTML=panel('Store before',L)+panel('Candidate facts','');return}
    if(i>=1){L=s.x.map(t=>li(t)).join('')}
    if(i===1){cap.innerHTML='<div class="t">Step 2 of 4: extraction (call 1 of 2)</div><p>The writer lists '+s.x.length+' candidate facts from this session alone.</p>';st.innerHTML=panel('Candidate facts',L)+panel('Store before',Object.entries(before).map(([id,t])=>li(id+': '+t)).join(''));return}
    if(i===2){R=ops.map(o=>o.op==='ADD'?li('ADD '+o.id+': '+o.text,'add'):o.op==='UPDATE'?li('UPDATE '+o.id+': "'+o.old+'" → "'+o.text+'"','upd'):o.op==='DELETE'?li('DELETE '+o.id+': '+o.old,'del'):o.op==='NOOP'?li('NOOP (already known)','inv'):li('ignored: '+JSON.stringify(o.raw||o),'dup')).join('');
      const c={};ops.forEach(o=>c[o.op]=(c[o.op]||0)+1);
      cap.innerHTML='<div class="t">Step 3 of 4: decide (call 2 of 2)</div><p>Against the stored facts the writer chooses: '+Object.entries(c).map(([a,b])=>b+' '+a).join(', ')+'.</p>';st.innerHTML=panel('Candidate facts',L)+panel('Operations',R);return}
    R=Object.entries(s.st).map(([id,t])=>li(id+': '+t,add[id]?'add':upd[id]?'upd':'')).join('')+Object.values(del).map(o=>li(o.id+': '+o.old,'del')).join('');
    cap.innerHTML='<div class="t">Step 4 of 4: the store after</div><p>'+Object.keys(s.st).length+' facts. Updated facts replace the old text in place: the store holds only the current version, so a question about the past value cannot be answered from it.</p>';
    st.innerHTML=panel('Operations',ops.map(o=>li(o.op+(o.id?' '+o.id:''),o.op==='ADD'?'add':o.op==='UPDATE'?'upd':o.op==='DELETE'?'del':'inv')).join(''))+panel('Store after',R)}
  function drawLib(i){const c=M0.calls[k]||{},before=k?M0.after[k-1]:[],nw=M0.ev[k]||[];
    const mem=j=>M0.mem[j];
    if(i===0){st.innerHTML=panel('Store before',before.map(j=>li(mem(j).t)).join(''))+panel('New memories','');cap.innerHTML='<div class="t">Step 1 of 4: the store before session '+(k+1)+'</div><p>'+before.length+' memories so far.</p>';return}
    if(i===1){st.innerHTML=panel('What the one call sees',li('System prompt: Mem0\'s extraction prompt ('+F.V.mem0_prompt_tokens+' tokens with the Qwen tokenizer)')+li('Existing memories: the '+(c.existing!=null?c.existing:'?')+' most similar to the new messages (ids replaced by 0, 1, 2 ...)')+li('Last k messages: '+(c.lastk!=null?c.lastk:'?')+' lines from earlier in this user\'s history (the previous session, not this one)','upd')+li('New messages: this session')+li('Observation date: '+F.S[k].d))+panel('Store before',before.map(j=>li(mem(j).t)).join(''));
      cap.innerHTML='<div class="t">Step 2 of 4: one call, with context</div><p>One model call per add(). The prompt carries the previous session\'s messages "to resolve references", and the model may extract from them again (yellow).</p>';return}
    if(i===2){st.innerHTML=panel('New memories (all ADD)',nw.map(j=>li(mem(j).t+(mem(j).c?'  [re-extracted from an earlier session]':''),mem(j).c?'dup':'add')).join(''))+panel('What happens to old facts','<li>Nothing: there is no UPDATE or DELETE in the automatic path. An exact duplicate (same MD5 hash) is skipped; a reworded one is stored again.</li>');
      const cc=nw.filter(j=>mem(j).c).length;cap.innerHTML='<div class="t">Step 3 of 4: the output</div><p>'+nw.length+' new memories'+(cc?', '+cc+' of them restating facts from an earlier session, now dated '+F.S[k].d:'')+'.</p>';return}
    const after=M0.after[k];st.innerHTML=panel('New this session',nw.map(j=>li(mem(j).t,mem(j).c?'dup':'add')).join(''))+panel('Store after ('+after.length+')',after.map(j=>li(mem(j).t,nw.includes(j)?(mem(j).c?'dup':'add'):'')).join(''));
    cap.innerHTML='<div class="t">Step 4 of 4: the store after</div><p>'+after.length+' memories. Old and new versions of a changed fact sit side by side; the search at read time has to rank the right one first.</p>'}
  function draw(i){const s=F.S[k];tx.textContent=s.t.map(x=>x[0]+': '+x[1]).join('\n');(mode==='paper'?drawPaper:drawLib)(i)}
  const A=RD.anim({card:'fmem-m0card',ctl:'fmem-m0ctl',n:4,ms:3000,draw,label:'Step through one session'});
  sel.addEventListener('change',()=>{k=+sel.value;A.reset(4)});
  RD.seg(document.getElementById('fmem-m0mode'),m=>{mode=m;A.reset(4)});
  // findings under the animation
  const f=document.getElementById('fmem-m0find');
  const pu=F.V['pa.haiku.upd'],pd=F.V['pa.haiku.del'];
  f.innerHTML='<div class="co key"><div class="t">What the two write paths did to Sam\'s twelve sessions (Haiku writing both)</div>'+
   '<p>The paper loop made '+F.PA.haiku.calls+' calls (two per session) and ended with '+F.V['pa.haiku.n']+' facts after '+F.V['pa.haiku.add']+' ADD, '+pu+' UPDATE, '+pd+' DELETE and '+F.V['pa.haiku.noop']+' NOOP decisions. The library made '+F.V['m0.calls']+' calls (one per session) and ended with '+F.V['m0.n']+' memories, of which '+F.V['m0.carry']+' restate a fact from an earlier session, re-extracted from the "Last k Messages" the prompt carries and stamped with the later session\'s date. The re-extractions are what broke two answers in section 5: the deletion of tests/ re-dated to 26 September, and the fallback count summed over duplicates.</p></div>';
})();

// ---- Rollout to dataset tab: redaction counts, format conversion, SFT filter funnel, group advantages ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const HN=HT.harness,MN={local:'Qwen3-4B (local)',haiku:'Claude Haiku 4.5'};
  const R=HT.redaction||{};
  const RL={workspace_path:'Workspace path (contains the account name) replaced by /work',scratch_path:'Other scratch paths replaced by /scratch',home:'Home folder replaced by ~',email_or_git_identity:'Account name, git identity or e-mail address elsewhere (for example the file owner in ls -l output from Claude Code\'s host shell) replaced',em:'Em-dashes in model text replaced by a comma'};
  $('tj-red').innerHTML='<table class="ht-t"><thead><tr><th>What</th><th>Count</th></tr></thead><tbody>'+Object.keys(RL).map(k=>'<tr><td>'+RL[k]+'</td><td class="ht-num">'+((k==='email_or_git_identity'?(R.user_name||0):0)+(R[k]||0)).toLocaleString()+'</td></tr>').join('')+
    '<tr><td>Fields never copied: session ids, uuids, message ids, thinking signatures, and from each Claude run\'s first record the account\'s installed skills, slash commands, plugins, agents, memory and socket paths</td><td>all</td></tr><tr><td>Recordings written</td><td class="ht-num">'+(R.files||0)+'</td></tr></tbody></table>';
  // conversion
  const ids=Object.keys(HT.traj).sort();
  const sel=$('tj-sel');
  sel.innerHTML=ids.map(i=>'<option>'+esc(i)+'</option>').join('');
  const pref=ids.find(i=>i.indexOf('local_bash_T06')===0)||ids[0];sel.value=pref;
  function msgs(id){
    const r=HT.runs.find(x=>x.id===id),tr=HT.traj[id],task=HT.tasks.find(t=>t.id===r.t);
    const out=[];const sys=HT.sys[r.h];
    if(sys)out.push({role:'system',content:sys});
    out.push({role:'user',content:task.prompt});
    let k=0,pending=[];
    tr.forEach(e=>{
      if(e[0]==='c'){const m={role:'assistant',content:e[3]||''};
        if(e[4].length){m.tool_calls=e[4].map(t=>{const id='call_'+(++k);pending.push(id);return {id:id,type:'function',function:{name:t[0],arguments:t[1]}}})}
        out.push(m)}
      else out.push({role:'tool',tool_call_id:pending.shift()||'call_?',content:e[2]});
    });
    return {r,out};
  }
  function render(){
    const id=sel.value,f=HTX.tjFmt||'norm';const {r,out}=msgs(id);
    let txt='',cap='';
    if(f==='norm'){
      const tr=HT.traj[id];
      txt=JSON.stringify({ev:'meta',id:id,harness:r.h,task:r.t})+'\n'+tr.slice(0,8).map(e=>e[0]==='c'?JSON.stringify({ev:'call',inp:e[1],out:e[2],text:e[3],thinking:!!e[5],tools:e[4].map(t=>({name:t[0],args:t[1]}))}):JSON.stringify({ev:'obs',name:e[1],out:e[2],chars:e[3]})).join('\n')+(tr.length>8?'\n... '+(tr.length-8)+' more events':'')+'\n'+JSON.stringify({ev:'end',reward:{binary:r.bin,partial:r.part,visible_all_pass:r.vis,heldout_fail:r.ho}});
      cap='One line per event: the first eight events, then the reward. The full file is src/recordings/'+id+'.jsonl. Claude runs also carry fresh, cache-write and cache-read token counts per call.';
    } else if(f==='oai'){
      const ex={messages:out.map(m=>m.role==='assistant'?Object.assign({},m,{weight:r.bin?1:0}):m)};
      const td=HT.tooldefs[r.h];if(td)ex.tools=td;
      txt=JSON.stringify(ex,null,1);
      cap='One training example (one line of the JSONL file; pretty-printed here). Each assistant message carries weight '+(r.bin?1:0)+' because this rollout\'s hidden reward is '+r.bin+': weight 0 keeps it as context without training on it. Tool outputs are cut for display.'+(r.h==='ccfull'?' Claude Code\'s own system prompt and tool schemas are not in the recording, so this example has neither: one more reason to record what the harness actually sent.':'');
    } else {
      const map={system:'system',user:'human',assistant:'gpt',tool:'observation'};
      const conv=[];out.forEach(m=>{
        if(m.role==='assistant'){if(m.content)conv.push({from:'gpt',value:m.content});(m.tool_calls||[]).forEach(t=>conv.push({from:'function_call',value:JSON.stringify({name:t.function.name,arguments:(()=>{try{return JSON.parse(t.function.arguments||'{}')}catch(e){return t.function.arguments+' [cut for display]'}})()})}))}
        else conv.push({from:map[m.role],value:m.content})});
      txt=JSON.stringify({conversations:conv,tools:JSON.stringify((HT.tooldefs[r.h]||[]).map(t=>t.function))},null,1);
      cap='LLaMA-Factory\'s ShareGPT layout: gpt and function_call turns are learned, human and observation turns are not. Note the arguments became a JSON object here and a JSON string in the OpenAI format: the template renders the two differently.';
    }
    $('tj-out').textContent=txt;$('tj-cap').textContent=cap;
  }
  sel.addEventListener('change',render);RD.seg($('tj-fmt'),v=>{HTX.tjFmt=v;render()});
  // funnel
  function funnel(){
    const m=HTX.tjM||'local';const rs=HT.runs.filter(r=>r.m===m);
    const ok=rs.filter(r=>r.stop!=='infra_error'),vis=ok.filter(r=>r.vis),hid=ok.filter(r=>r.bin);
    const seen={},dist=[];hid.forEach(r=>{const k=r.t+'|'+r.d;if(!seen[k]){seen[k]=1;dist.push(r)}});
    const per={},cap=[];hid.forEach(r=>{per[r.t]=(per[r.t]||0)+1;if(per[r.t]<=3)cap.push(r)});
    const rows=[['Rollouts recorded',rs.length],['Filter A: passed the visible tests',vis.length],['Filter B: passed the hidden verifier',hid.length],['B, then one per distinct final code per task',dist.length],['B, then at most 3 per task',cap.length]];
    $('tj-fun').innerHTML=rows.map(x=>'<div class="row"><div>'+x[0]+'</div><div class="tr"><span style="width:'+(100*x[1]/rows[0][1])+'%"></span></div><div class="ht-num">'+x[1]+'</div></div>').join('');
  }
  RD.seg($('tj-fm'),v=>{HTX.tjM=v;funnel()});
  function groups(){
    const k=HTX.tjK||'bin';
    let h='<table class="ht-t"><thead><tr><th>Model</th><th>Harness</th><th>Task</th><th>Rewards</th><th>Mean</th><th>Advantages</th></tr></thead><tbody>';
    HT.groups.forEach(g=>{
      h+='<tr><td>'+(g.m==='local'?'4B':'Haiku')+'</td><td>'+esc(HN[g.h])+'</td><td>'+g.t+'</td><td class="ht-num">'+g[k].map(x=>k==='bin'?x:x.toFixed(2)).join(', ')+'</td><td class="ht-num">'+g[k+'_mu'].toFixed(2)+'</td><td class="ht-num">'+(g[k+'_sd']===0?'<span class="mu">all zero</span>':g[k+'_adv'].map(a=>(a>0?'+':'')+a.toFixed(2)).join(', '))+'</td></tr>'});
    $('tj-groups').innerHTML=h+'</tbody></table>';
  }
  RD.seg($('tj-gk'),v=>{HTX.tjK=v;groups()});
  render();funnel();groups();
})();

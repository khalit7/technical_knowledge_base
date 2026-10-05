// ---- Same agent, six ways: results table and failure causes ----
(function(){
  const {D,esc,fmt}=SAMEUI;
  const med=a=>{const s=a.filter(x=>x!=null).slice().sort((x,y)=>x-y);if(!s.length)return null;const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
  function localStats(r){const ins=r.calls.map(c=>c.in||0),outs=r.calls.map(c=>c.out||0);
    return {fixed:r.meta.tests_pass&&r.meta.tests_unchanged,clean:r.meta.rc===0,calls:r.calls.length,tin:ins.reduce((a,b)=>a+b,0),tout:outs.reduce((a,b)=>a+b,0),s:r.meta.wall_s,label:r.label}}
  function claudeStats(r){const x=r.result;
    return {fixed:r.meta.tests_pass&&r.meta.tests_unchanged,clean:x.subtype==='success',calls:x.num_turns,tin:x.input_tokens+x.cache_creation_input_tokens+x.cache_read_input_tokens,tout:x.output_tokens,s:x.duration_ms/1000,label:r.label}}
  const L=D.local,C=D.claude;
  const pick=(o,re)=>Object.keys(o).filter(k=>re.test(k)).sort().map(k=>o[k]);
  const ROWS=[
    ['1. Plain loop','local',pick(L,/^a1_/).map(localStats)],
    ['2. LangGraph','local',pick(L,/^a2_/).map(localStats)],
    ['3. Pydantic AI','local',pick(L,/^a3_/).map(localStats)],
    ['4. OpenAI Agents SDK','local',pick(L,/^a4_/).map(localStats)],
    ['5. smolagents CodeAgent','local',pick(L,/^a5_/).map(localStats)],
    ['5b. smolagents ToolCallingAgent (fairness check)','local',pick(L,/^a5b_/).map(localStats)],
    ['6. Claude Agent SDK, Haiku 4.5','claude',pick(C,/^a6_haiku/).map(claudeStats)],
    ['6. Claude Agent SDK, Sonnet','claude',pick(C,/^a6_sonnet/).map(claudeStats)],
    ['6b. Same, Claude Code prompt appended, Haiku 4.5','claude',pick(C,/^a6b_/).map(claudeStats)],
    ['6c. Built-in tools instead of ours, Haiku 4.5','claude',pick(C,/^a6c_/).map(claudeStats)]];
  const t=document.getElementById('same-res');
  let h='<thead><tr><th>Version</th><th>Model</th><th>Runs fixed</th><th class="num">Ended cleanly</th><th class="num">Model calls</th><th class="num">Prompt tokens per run</th><th class="num">Output tokens</th><th class="num">Seconds</th></tr></thead><tbody>';
  ROWS.forEach(([name,kind,rs])=>{
    const nf=rs.filter(r=>r.fixed).length,nc=rs.filter(r=>r.clean).length;
    const dots=rs.map(r=>'<span class="'+(r.fixed?'same-pass':'same-fail')+'" title="'+esc(r.label)+'">'+(r.fixed?'&#9679;':'&#9675;')+'</span>').join('');
    h+='<tr><td>'+esc(name)+'</td><td>'+(kind==='local'?'<span class="same-tag loc">local 4B</span>':'<span class="same-tag cl">Claude</span>')+'</td><td style="white-space:nowrap"><span class="same-dots">'+dots+'</span> '+nf+'/'+rs.length+'</td><td class="num">'+nc+'/'+rs.length+'</td>'+
      '<td class="num">'+fmt(med(rs.map(r=>r.calls)))+'</td><td class="num">'+fmt(Math.round(med(rs.map(r=>r.tin))))+'</td><td class="num">'+fmt(Math.round(med(rs.map(r=>r.tout))))+'</td><td class="num">'+(Math.round(med(rs.map(r=>r.s))*10)/10)+'</td></tr>'});
  t.innerHTML=h+'</tbody>';
  document.getElementById('same-resnote').innerHTML='Columns after "Ended cleanly" are medians over the runs in the row. For local rows the first dot is the greedy run, then the three runs at temperature 0.7. "Ended cleanly" means the program returned normally (no exception, no limit hit); a run can fix the code and still end with an exception (Pydantic AI) or end cleanly without fixing it. Claude rows count Claude Code\'s <code>num_turns</code> and sum fresh input, cache writes and cache reads; local rows count HTTP requests and the server\'s <code>prompt_tokens</code>. Hover a dot for its run label. Section 4 replays one run per version plus the most telling failures; the redacted record of every run is in <code>src/same/data/runs.json</code> in the repository.';
  const cz=D.causes;
  document.getElementById('same-causes').innerHTML='<p class="small">Every run that did not end fixed and clean, read from its transcript:</p><ul class="tight">'+
    Object.keys(cz).map(k=>'<li><b>'+esc(k)+'</b>: '+cz[k]+'</li>').join('')+'</ul>'+(D.causes_summary||'');
})();

// ---- Stop lab tab (t-stop): data HB.stop (native.py runs) and HB.cc.limits (Claude Code) ----
(function(){
  const H=window.HB; if(!H||!H.stop||!document.getElementById('t-stop'))return;
  const esc=RD.esc, runs=H.stop, by={};runs.forEach(r=>by[r.id]=r);
  const fmt=n=>n==null?'-':Number(n).toLocaleString();
  const stopTxt=r=>r.stop==='model stopped (no tool call)'?'reply without a tool call':(r.stop||'-');
  function turnBox(t,cls){
    const calls=t.calls.length?t.calls.map(c=>'<code>'+esc(c[0])+'</code> '+(c[1]==='ok'?'':'<b>'+esc(c[1])+'</b> ')+'<span class="mute">'+esc(c[2].slice(0,70))+'</span>').join('<br>'):
      (t.fin==='length'?'<b>reply cut at the output limit</b>, no tool call':'<b>no tool call</b>: "'+esc(t.text.slice(0,110))+(t.text.length>110?' ...':'')+'"');
    const note=t.note?'<div class="nt">harness: '+esc(t.note.split('\n')[0].slice(0,120))+'</div>':'';
    return '<div class="hbs-turn '+(t.pass?'pass':'fail')+' '+(cls||'')+'"><b>turn '+t.n+'</b> <span class="mute">('+fmt(t.pt)+' in, '+fmt(t.ct)+' out)</span><br>'+calls+note+'</div>';
  }
  // ---------- pair animation
  const pairs=[['careful_s4','verify_s4','Seed 4: careful stops early, verify continues'],['careful_s2','verify_s2','Seed 2: verify spends three nudges and still fails'],
               ['naive_t0','careful_s1','Temperature 0: the naive rule stops on a truncated reply'],['naive_s4','careful_s4','Seed 4: same seed, different runs (non-determinism)']]
               .filter(p=>by[p[0]]&&by[p[1]]);
  const sel=document.getElementById('hbs-pairsel');
  sel.innerHTML=pairs.map((p,i)=>'<option value="'+i+'">'+esc(p[2])+'</option>').join('');
  let P=pairs[0];
  const lanes=document.getElementById('hbs-lanes'),cap=document.getElementById('hbs-pair-cap'),st=document.getElementById('hbs-pair-stats');
  const caps={careful_s4:'careful: the model said it was done after turn 4 with a test still failing; the run ended there.',
    verify_s4:'verify: the harness ran the tests, showed the failure and continued; the model fixed it by turn 7.',
    careful_s2:'careful: the model stopped with the apostrophe test failing.',
    verify_s2:'verify: three nudges, each answered with a new edit or a claim of success; the cap of three nudges ended it, still failing, after 13 turns.',
    naive_t0:'naive (temperature 0): turn 4 hit the 1,024-token output limit before any tool call; the naive rule took that as "done" with a test failing.',
    careful_s1:'careful, seed 1: passed in 5 turns.',naive_s4:'naive, seed 4: passed in 5 turns.'};
  function nturns(){return Math.max(by[P[0]].turns.length,by[P[1]].turns.length)}
  function draw(i){
    const k=i+1;
    lanes.innerHTML=[P[0],P[1]].map(id=>{const r=by[id];
      return '<div class="hbs-lane"><h4>'+esc(r.rule)+' <span class="mute small">'+esc(id)+'</span></h4>'+
        r.turns.map(t=>turnBox(t,t.n>k?'ghost':(t.n===k?'cur':''))).join('')+
        (k>=r.turns.length?'<div class="small"><b>'+(r.passed?'tests pass':'tests fail')+'</b> at the end: '+esc(stopTxt(r))+'</div>':'')+'</div>'}).join('');
    const a=by[P[0]],b=by[P[1]];
    const done=r=>k>=r.turns.length;
    cap.innerHTML='<b>Turn '+k+'.</b> '+[a,b].map(r=>done(r)?esc(caps[r.id]||''):'').filter(Boolean).join(' ');
    const sp=r=>{const t=r.turns[Math.min(k,r.turns.length)-1];return t?t.spent:0};
    st.innerHTML=[a,b].map(r=>RD.stat(esc(r.rule)+' tokens so far',fmt(sp(r)),'turns '+Math.min(k,r.turns.length)+' of '+r.turns.length)).join('');
  }
  const an=RD.anim({card:'hbs-pair',ctl:'hbs-pair-ctl',n:nturns(),draw,ms:1700,label:'Turn',tab:'t-stop'});
  sel.addEventListener('change',()=>{P=pairs[+sel.value];an.reset(nturns());an.play()});
  // ---------- replay
  const budgets=[2000,3000,4000,5000,6000,8000,10000,12000,15000,20000,25000,30000,Infinity];
  const capEl=document.getElementById('hbs-cap'),budEl=document.getElementById('hbs-bud'),repEl=document.getElementById('hbs-rep');
  function replay(r,cap,bud,rep){
    let cut=r.turns.length,why='own stop';
    for(const t of r.turns){
      if(t.n>cap){cut=t.n-1;why='turn cap';break}
      if(t.spent>bud){cut=t.n;why='budget';break}
      if(rep&&t.calls.some(c=>c[4]>=3)){cut=t.n;why='repeat';break}
    }
    const last=r.turns[cut-1];
    return {cut,why,pass:last?last.pass:0,spent:last?last.spent:0};
  }
  function drawReplay(){
    const cap=+capEl.value>=15?Infinity:+capEl.value,bud=budgets[+budEl.value],rep=repEl.checked;
    document.getElementById('hbs-cap-v').textContent=cap===Infinity?'off':cap;
    document.getElementById('hbs-bud-v').textContent=bud===Infinity?'off':fmt(bud)+' tokens';
    const res=runs.map(r=>[r,replay(r,cap,bud,rep)]);
    const pass=res.filter(x=>x[1].pass).length, orig=runs.filter(r=>r.passed).length;
    const lost=res.filter(x=>x[0].passed&&!x[1].pass).length, cutn=res.filter(x=>x[1].why!=='own stop').length;
    const spent=res.reduce((s,x)=>s+x[1].spent,0), spent0=runs.reduce((s,r)=>s+(r.turns.length?r.turns[r.turns.length-1].spent:0),0);
    document.getElementById('hbs-rep-stats').innerHTML=RD.stat('runs passing',pass+' of '+runs.length,'recorded: '+orig)+
      RD.stat('passes lost to the rule',String(lost),cutn+' runs cut')+RD.stat('tokens spent',fmt(spent),'recorded: '+fmt(spent0));
    document.getElementById('hbs-rep-grid').innerHTML=res.map(([r,x])=>'<div class="hbs-run"><b>'+esc(r.id)+'</b> <span class="mute">'+(x.why==='own stop'?'':esc(x.why))+'</span><div class="bar">'+
      r.turns.map(t=>'<i class="'+(t.n>x.cut?'x':(t.pass?'p':'f'))+'" title="turn '+t.n+'"></i>').join('')+'</div>'+(x.pass?'pass':'<span style="color:var(--bad)">fail</span>')+'</div>').join('');
  }
  [capEl,budEl,repEl].forEach(e=>e.addEventListener('input',drawReplay));
  // ---------- table
  const tb=document.querySelector('#hbs-table tbody'),det=document.getElementById('hbs-det');
  tb.innerHTML=runs.map(r=>'<tr data-id="'+r.id+'"><td>'+esc(r.id)+'</td><td>'+esc(r.rule)+(r.temp===0?' (temp 0)':'')+'</td><td class="num">'+r.turns.length+'</td><td>'+esc(stopTxt(r))+'</td><td>'+(r.passed?'pass':'<b style="color:var(--bad)">fail</b>')+'</td><td class="num">'+fmt(r.spent)+'</td></tr>').join('');
  function showRun(id){
    const r=by[id];[...tb.rows].forEach(tr=>tr.classList.toggle('sel',tr.dataset.id===id));
    det.innerHTML='<b>'+esc(id)+'</b>: '+r.turns.map(t=>turnBox(t,'')+(t.calls.length?'<div class="small mute" style="margin:0 0 6px 10px">'+t.calls.map(c=>'result: '+esc(c[5].slice(0,160)).replace(/\n/g,' / ')).join('<br>')+'</div>':'')).join('');
  }
  tb.addEventListener('click',e=>{const tr=e.target.closest('tr');if(tr&&tr.dataset.id)showRun(tr.dataset.id)});
  // ---------- Claude Code limits
  const L=H.cc&&H.cc.limits;
  if(L){document.getElementById('hbs-cc').innerHTML='<div class="grid">'+[['cc_maxturns','--max-turns 3'],['cc_budget','--max-budget-usd 0.01']].map(([k,flag])=>{const x=L[k];if(!x)return '';
    return '<div class="sp"><div class="n">'+esc(flag)+'</div><p>result <code>subtype: "'+esc(x.res.subtype)+'"</code>, <code>is_error: '+x.res.is_error+'</code>, errors: "'+esc((x.res.errors||[]).join('; '))+'". '+
      x.calls.length+' tool call'+(x.calls.length>1?'s':'')+' asked for, '+x.results+' run. Cost $'+x.res.total_cost_usd.toFixed(4)+(k==='cc_budget'?', above the $0.01 cap: the budget is checked after a call has been paid for, and the call it had just asked for was never run.':'; the model never saw the result of its last call.')+'</p></div>'}).join('')+'</div>'}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-stop']=window.TAB_RENDER['t-stop']||[]).push(()=>{drawReplay()});
  drawReplay();showRun(runs[0].id);
})();

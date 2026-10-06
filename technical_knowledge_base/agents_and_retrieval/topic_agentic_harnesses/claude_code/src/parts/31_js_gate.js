// ---- Permission lab (t-gate): the recorded matrix, the model's score against it, and a rule playground ----
(function(){
  const D=window.HCC,G=window.HCCG,esc=RD.esc;const mxEl=document.getElementById('gt-mx');if(!mxEl||!G)return;
  const MX=D.matrix,ACT=MX.actions;
  const OUT={ran:'ran',fail:'ran, failed',denied:'refused',tool:'tool refused',missing:'not tried'};
  // model prediction for every recorded cell
  function predict(ci,ai){const col=MX.cols[ci];const a=Object.assign({},G.ACTS[ai]);
    if(ai===6&&col.extra.some(x=>/tests\/test_core/.test(x)))a.readFirst=true;
    return G.decide(a,G.CFGS[col.id])}
  let agree=0,total=0,skipped=0;const mis=[];
  const pred=MX.cols.map((c,ci)=>ACT.map((_,ai)=>{const p=predict(ci,ai),rec=c.cells[ai].o;
    if(p.o==='classifier'){skipped++;return {p,ok:null}}
    if(rec==='missing')return {p,ok:null};
    total++;const ok=G.asModel[rec]===p.o;if(ok)agree++;else mis.push(c.col+', action '+(ai+1)+' ('+ACT[ai]+'): recorded '+OUT[rec]+', model '+p.o);return {p,ok}}));
  mxEl.innerHTML='<thead><tr><th class="an">Action</th>'+MX.cols.map(c=>'<th>'+esc(c.col)+'<div class="small mute" style="font-weight:400">'+esc(c.answered.map(m=>m.replace('claude-','').replace('-20251001','')).join(', '))+'</div></th>').join('')+'</tr></thead><tbody>'+
    ACT.map((a,ai)=>'<tr><th class="an">'+(ai+1)+'. '+esc(a)+'</th>'+MX.cols.map((c,ci)=>{const o=c.cells[ai].o,pr=pred[ci][ai];return '<td class="c o-'+o+(pr.ok===false?' mis':'')+'" data-c="'+ci+'" data-a="'+ai+'">'+OUT[o]+'</td>'}).join('')+'</tr>').join('')+
    '<tr><th class="an">Ran, of 12</th>'+MX.cols.map(c=>'<td><b>'+c.cells.filter(x=>x.o==='ran'||x.o==='fail').length+'</b></td>').join('')+'</tr></tbody>';
  const det=document.getElementById('gt-det');
  mxEl.addEventListener('click',e=>{const td=e.target.closest('td.c');if(!td)return;mxEl.querySelectorAll('td.sel').forEach(x=>x.classList.remove('sel'));td.classList.add('sel');
    const ci=+td.dataset.c,ai=+td.dataset.a,col=MX.cols[ci],cell=col.cells[ai],pr=pred[ci][ai];
    det.innerHTML='<b>'+esc(col.col)+'</b>, action '+(ai+1)+' <code>'+esc(ACT[ai])+'</code>: <b>'+OUT[cell.o]+'</b>.<br>Message: <code>'+esc(cell.m||'(none)')+'</code><br>Model: '+(pr.p.o==='classifier'?'the auto-mode classifier decides (not predicted)':'decides at stage '+(pr.p.stage+1)+', '+esc(G.STAGES[pr.p.stage].n)+': '+esc(pr.p.why))+(pr.ok===false?' <b style="color:var(--bad)">Does not match the recording.</b>':'')+(col.extra.length?'<br><span class="small mute">This run also made calls the script did not ask for: '+esc(col.extra.join('; '))+'</span>':'')});
  document.getElementById('gt-score').innerHTML='The model reproduces <b>'+agree+' of '+total+'</b> recorded decisions; the '+skipped+' other cells of the auto-mode column are the classifier\'s and are not predicted'+(mis.length?'. Mismatches: '+mis.map(esc).join('; '):'.')+' This is a match by construction, not an independent test: the two orderings the docs do not state (deny before the read check, the read check before the mode) and the sed -i rule were taken from these same recordings. What it does show is that one consistent order of checks explains every recorded decision.';
  // ---- playground ----
  const $=id=>document.getElementById(id);
  $('gt-allow').value=G.RULES.allow.join('\n');$('gt-ask').value=G.RULES.ask.join('\n');$('gt-deny').value=G.RULES.deny.join('\n');
  const PRE=[
    ['python, not python3',{mode:'default',tool:'Bash',arg:'python tests/test_core.py'}],
    ['ls && rm',{mode:'acceptEdits',tool:'Bash',arg:'ls && rm -f notes.txt'}],
    ['A variable',{mode:'acceptEdits',tool:'Bash',arg:'echo "PROBE=$PROBE"',allow:'Bash(echo *)'}],
    ['sed -i in acceptEdits',{mode:'acceptEdits',tool:'Bash',arg:"sed -i '' 's/Tiny/Small/' README.md"}],
    ['Allow ignored (untrusted)',{mode:'default',tool:'Bash',arg:'python3 tests/test_core.py',untr:true}],
    ['Edit a test',{mode:'acceptEdits',tool:'Edit',arg:'tests/test_core.py'}],
    ['Write in plan mode',{mode:'plan',tool:'Write',arg:'notes.txt'}],
    ['dontAsk and curl',{mode:'dontAsk',tool:'Bash',arg:'curl -sI https://example.com',allow:'',ask:'',deny:''}]];
  const pre=$('gt-pre');pre.innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+esc(p[0])+'</button>').join('');
  pre.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[+b.dataset.i][1];
    $('gt-mode').value=p.mode;$('gt-tool').value=p.tool;$('gt-arg').value=p.arg;$('gt-untr').checked=!!p.untr;
    $('gt-allow').value=p.allow!=null?p.allow:G.RULES.allow.join('\n');$('gt-ask').value=p.ask!=null?p.ask:G.RULES.ask.join('\n');$('gt-deny').value=p.deny!=null?p.deny:G.RULES.deny.join('\n');calc()});
  const lines=id=>$(id).value.split('\n').map(s=>s.trim()).filter(Boolean);
  function calc(){
    const tool=$('gt-tool').value,arg=$('gt-arg').value.trim();
    const a=tool==='Bash'?{tool,cmd:arg}:{tool,path:arg.replace(/^\.\//,''),outside:$('gt-out').checked||arg.startsWith('../'),readFirst:$('gt-read').checked};
    const c={mode:$('gt-mode').value,allow:lines('gt-allow'),ask:lines('gt-ask'),deny:lines('gt-deny'),untrusted:$('gt-untr').checked,hook:$('gt-hook').checked,newModel:$('gt-new').checked};
    const d=G.decide(a,c);
    $('gt-path').innerHTML=d.path.map((k,i)=>'<span'+(i===d.path.length-1||(k==='run'&&i===d.path.length-1)?' class="d"':'')+'>'+esc(G.STAGES.find(s=>s.k===k).n)+'</span>').join('<span style="border:0;background:none">&#8594;</span>');
    const L={allow:'Runs',deny:'Refused',tool:'Refused by the tool',classifier:'The classifier decides'};
    $('gt-out-box').innerHTML='<b>'+L[d.o]+'</b> at stage '+(d.stage+1)+' ('+esc(G.STAGES[d.stage].n)+'). '+esc(d.why);
  }
  ['gt-mode','gt-tool','gt-arg','gt-allow','gt-ask','gt-deny','gt-untr','gt-hook','gt-read','gt-out','gt-new'].forEach(id=>{$(id).addEventListener('input',calc);$(id).addEventListener('change',calc)});
  calc();
})();

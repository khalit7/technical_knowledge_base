// ---- Reading tab: numbers, code views, the concern colouring, layers, the LLM-call comparison, depth chart, benchmark bars ----
(function(){
  const CD=window.CD, esc=RD.esc;
  const B=CD.bench.ns_per_object;
  // derived numbers (checked by src/recompute.py)
  CD.calc={pdRatio:(B['pydantic BaseModel(...)']/B['dataclass(slots=True)']).toFixed(1),
           ccFrom:CD.steps[0].cc_handler, ccTo:CD.steps[CD.steps.length-2].cc_handler};
  const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],CD);
  document.querySelectorAll('#t-read [data-v]').forEach(el=>{const v=get(el.dataset.v);el.textContent=v==null?'?':String(v)});

  // a small Python highlighter: comments, strings, keywords (enough for reading, not a parser)
  const KW=/\b(def|async|await|class|return|raise|if|elif|else|for|in|try|except|finally|with|as|not|and|or|is|None|True|False|import|from|yield|lambda|while|pass)\b/g;
  function hl(line){
    let code=line,cm='';
    const i=findComment(line);if(i>=0){code=line.slice(0,i);cm=line.slice(i)}
    let h=esc(code).replace(/(&quot;[^&]*?&quot;|'[^']*?')/g,'\u0001$1\u0002');
    h=h.split(/(\u0001[^\u0002]*\u0002)/).map(p=>p[0]==='\u0001'?'<span class="s">'+p.slice(1,-1)+'</span>':p.replace(KW,'<span class="kw">$1</span>')).join('');
    return h+(cm?'<span class="cm">'+esc(cm)+'</span>':'');
  }
  function findComment(l){let q=null;for(let i=0;i<l.length;i++){const c=l[i];if(q){if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==='#')return i}return -1}
  RD.code=(el,lines,cls)=>{el.innerHTML=lines.map((l,i)=>'<span class="l'+(cls&&cls[i]?' '+cls[i]:'')+'"><span class="g">'+(i+1)+'</span>'+hl(l)+'</span>').join('')};
  RD.hl=hl;

  // ---- concerns in the handler (section 2) ----
  const CON=[['auth','Authentication','--c1',/authoriz|who\(|unauthorized|owner: Owner|if not owner/],
    ['rate','Rate limit','--c5',/take_token|rate_headers|limit_headers|enforce_rate|if not ok|Retry in|Retry-After/],
    ['idem','Idempotency key','--c4',/idempotency|req_hash|claim|replay|release|require_key|fingerprint|IntegrityError|old_hash|status ==|saved|Idempotent|\bkey\b|new key|Retry after/],
    ['store','Database','--c3',/DB\.|save_reply|chat_exists|msg_id|credits|\bout = |chat_id, owner|Chat not found/],
    ['model','Model call and stream','--c2',/sleep|reply|fake_stream|StreamingResponse|body\.stream|Cache-Control/]];
  function concernOf(l){for(const c of CON)if(c[3].test(l))return c;return null}
  function drawConcern(stepIdx){
    const st=CD.steps.find(s=>String(s.step)===String(stepIdx));const lines=st.handler.split('\n');
    const el=document.getElementById('cnc-code');
    el.innerHTML=lines.map((l,i)=>{const c=concernOf(l);return '<span class="l" style="'+(c?'box-shadow:inset 4px 0 0 var('+c[2]+')':'')+'"><span class="g">'+(i+1)+'</span>'+hl(l)+'</span>'}).join('');
    const counts={};lines.forEach(l=>{const c=concernOf(l);if(c)counts[c[0]]=(counts[c[0]]||0)+1});
    document.getElementById('cnc-note').textContent=lines.length+' lines; complexity '+st.cc_handler+'. Lines per concern: '+CON.map(c=>c[1]+' '+(counts[c[0]]||0)).join(', ')+'.';
  }
  document.getElementById('cnc-leg').innerHTML=CON.map(c=>'<span style="--sw:var('+c[2]+')">'+c[1]+'</span>').join('');
  RD.seg(document.getElementById('cnc-seg'),m=>drawConcern(m));drawConcern(0);

  // ---- layers (section 3) ----
  const LAY=[['main.py','composition root: builds adapters, wires the app','--c5'],['api/','HTTP in, HTTP out (FastAPI routers)','--c1'],['services/','use cases: send_message, summarize_chat','--c4'],['domain/ + ports.py','pure rules and the Protocols the services need','--c3']];
  document.getElementById('lay').innerHTML='<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:8px;align-items:center">'+
    '<div>'+LAY.map((l,i)=>'<div style="border:1px solid var(--line);border-left:5px solid var('+l[2]+');border-radius:8px;padding:6px 10px;background:var(--bg)"><b class="mono">'+l[0]+'</b><div class="small mute">'+l[1]+'</div></div>'+(i<LAY.length-1?'<div class="small mute" style="text-align:center;line-height:1.4">&#8595; imports</div>':'')).join('')+'</div>'+
    '<div style="border:1px dashed var(--mute);border-radius:8px;padding:8px 10px;background:var(--soft)"><b class="mono">adapters/</b><div class="small mute">Postgres store, SQLite store, HTTP model client, Redis limiter, test fakes. Each implements a port; only <code>main.py</code> imports them.</div><div class="small" style="margin-top:6px">&#8592; built by main.py<br>&#8599; implements ports</div></div></div>';

  // ---- the LLM call, before and after (section 4) ----
  const S=CD.llm.scen;let si=2;
  const seg=document.getElementById('llm-seg');
  seg.innerHTML=S.map((s,i)=>'<button data-m="'+i+'"'+(i===si?' class="on"':'')+'>'+esc(s.label)+'</button>').join('');
  const WHY={good:'Both work.',prose:'Both dig the JSON out of the prose.',
    notjson:'Before: json.loads fails, the fallback slice is empty, that fails too, and the outer except Exception retries the same refusal twice more. After: one call, then a ModelOutputError that says what came back.',
    missing:'Before returns None, the same value as four other outcomes. After: pydantic reports the missing field.',
    ratelimit:'Both retry once after 1 s, which is right: a 429 is transient.',
    ourbug:'Before retries our own malformed request three times (and sleeps after the last attempt too). After: a 400 is our bug, so it fails at once with the server\'s error.',
    empty:'Neither calls the model. Before says None; after says ChatNotFound, which the API turns into a 404.'};
  function card(t,r){
    return '<div class="card" style="margin:0"><h4>'+t+'</h4><dl class="kv"><dt>Result</dt><dd><b>'+esc(r.result)+'</b></dd><dt>HTTP calls</dt><dd>'+r.calls+'</dd><dt>Seconds slept</dt><dd>'+r.slept_s+'</dd><dt>Saved to DB</dt><dd>'+(r.saved?'yes':'no')+'</dd></dl></div>'}
  function drawLLM(){const s=S[si];document.getElementById('llm-cmp').innerHTML=card('before.py',s.before)+card('after.py',s.after);
    document.getElementById('llm-why').textContent=WHY[s.key]||''}
  RD.seg(seg,m=>{si=+m;drawLLM()});drawLLM();
  document.getElementById('llm-tab').innerHTML='<thead><tr><th>Situation</th><th>before.py</th><th class="num">calls</th><th class="num">slept</th><th>after.py</th><th class="num">calls</th><th class="num">slept</th></tr></thead><tbody>'+
    S.map(s=>'<tr><td>'+esc(s.label)+'</td><td class="'+(/None/.test(s.before.result)?'r':'')+'">'+esc(s.before.result)+'</td><td class="num">'+s.before.calls+'</td><td class="num">'+s.before.slept_s+' s</td><td class="'+(/Summary/.test(s.after.result)?'g':'')+'">'+esc(s.after.result)+'</td><td class="num">'+s.after.calls+'</td><td class="num">'+s.after.slept_s+' s</td></tr>').join('')+'</tbody>';
  const st=CD.llm.static;
  document.getElementById('llm-stats').innerHTML=
    RD.stat('Highest complexity',st.before.cc_max+' &#8594; '+st.after.cc_max,'one function of '+st.before.cc_max+' vs the most complex of '+st.after.functions+' (HttpChatModel.complete)')+
    RD.stat('ruff findings',st.before.ruff.length+' &#8594; '+st.after.ruff.length,'rules C901, PLR0911/0912, PLR2004, BLE001, S113, ANN001/201')+
    RD.stat('mypy --strict errors',st.before.mypy_strict_errors+' &#8594; '+st.after.mypy_strict_errors,'misleadingly low before: see section 6')+
    RD.stat('Source lines',st.before.sloc+' &#8594; '+st.after.sloc,'longer, and every piece testable alone');
  RD.code(document.getElementById('llm-before'),CD.llm.before.trimEnd().split('\n'));
  RD.code(document.getElementById('llm-after'),CD.llm.after.trimEnd().split('\n'));

  // ---- module depth (section 5) ----
  function drawDepth(){
    const el=document.getElementById('dep-plot');const W=Math.min(860,RD.width(el));
    const D=CD.depth.slice().sort((a,b)=>b.body/b.params-a.body/a.params);
    const pu=Math.max(14,Math.min(26,(W-20)/34)), hu=5;   // px per parameter, px per body line
    const cols=W<520?2:4, cw=(W-10)/cols;
    let x=0,y=0,rowH=0,body='',i=0;
    D.forEach(d=>{const w=d.params*pu,h=Math.max(6,d.body*hu),cx=(i%cols)*cw+6;if(i%cols===0&&i){y+=rowH+16;rowH=0}
      const top=y+30;rowH=Math.max(rowH,h+34);
      body+='<rect x="'+cx+'" y="'+top+'" width="'+w+'" height="'+h+'" fill="var(--acc2)" stroke="var(--acc)"/>'+
        '<line x1="'+cx+'" y1="'+top+'" x2="'+(cx+w)+'" y2="'+top+'" stroke="var(--bad)" stroke-width="3"/>'+
        RD.t(cx,top-16,esc(d.name),{fs:11,w:600})+RD.t(cx,top-4,d.params+' param'+(d.params>1?'s':'')+', '+d.body+' lines',{fs:10,fill:'var(--mute)'});
      i++});
    const H=y+rowH+6;
    el.innerHTML=RD.svg(W,H,body,'Module depth of the helpers in the refactored service');
    document.getElementById('dep-note').innerHTML='Sorted deepest first (lines hidden per parameter). <b>claim_key</b> hides '+(CD.depth.find(d=>d.name==='claim_key')||{}).body+' lines behind 3 parameters; <b>chat_exists</b> and <b>request_fingerprint</b> hide one line each and still earn their place, because their names say what a query or a hash is <i>for</i>. A shallow helper is fine when its name carries meaning; a shallow <i>layer</i> of them is classitis.';
  }
  drawDepth();RD.onResize(drawDepth);RD.onRender(drawDepth);

  // ---- benchmark bars (section 6) ----
  function drawBench(){const el=document.getElementById('bench-bars');const mx=Math.max(...Object.values(B));
    el.innerHTML=Object.entries(B).map(([k,v])=>'<div class="row'+(/dataclass\(|BaseModel\(/.test(k)?' hl':'')+'"><span class="nm" title="'+esc(k)+'">'+esc(k)+'</span><span class="track"><span class="fill" style="width:'+(v/mx*100).toFixed(1)+'%;background:var('+(/pydantic/.test(k)?'--c4':/dict/.test(k)?'--dim':'--c1')+')"></span></span><span class="val">'+v.toFixed(0)+' ns</span></div>').join('')}
  drawBench();

  // ---- library (section 9) and tooling (section 12) ----
  document.getElementById('lib-files').innerHTML=CD.lib.files.map(f=>'<code>'+esc(f)+'</code>').join(', ');
  RD.code(document.getElementById('lib-pyproject'),CD.lib.pyproject.trimEnd().split('\n'));
  document.getElementById('tools-ruff').innerHTML=CD.llm.static.before.ruff.map(v=>'<span class="l">before.py:'+v.line+'  <b>'+esc(v.code)+'</b>  '+esc(v.msg)+'</span>').join('');
  const fc=document.getElementById('fcis-src');fc.innerHTML='({{Functional Core, Imperative Shell|https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell}} screencast, 2012-07-12: "This functional core is surrounded by a shell of imperative code: it manipulates stdin, stdout, the database, and the network, all based on values produced by the functional core"; see also his talk {{Boundaries|https://www.destroyallsoftware.com/talks/boundaries}}, SCNA 2012)';

  // ---- glossary ----
  const G={complexity:'Whatever in a system\'s structure makes it hard to understand and change (Ousterhout).',module:'Any unit with an inside and an outside: function, class, file, package, service.',interface:'What a caller must know to use a module: names, parameters, results, errors, side effects.',impl:'Everything in a module the caller need not know.',
    hex:'Ports and adapters: product rules in the middle, technology at the edges behind interfaces.',port:'An interface the core defines for something it needs (a store, a model).',adapter:'Code that implements a port for one technology.',io:'Anything that leaves the process: network, disk, database, clock, environment.',
    pure:'A function whose result depends only on its arguments and which changes nothing outside.',fcis:'Decisions in pure functions (core), I/O in a thin outer layer (shell).',abstraction:'A simplified view that omits unimportant details.',shallow:'A module whose interface is nearly as complex as what it hides.',entry:'Packaging metadata through which an installed package advertises plugins.',
    hint:'An annotation of the expected type, read by tools, ignored at run time.',checker:'A tool (mypy, pyright) that verifies type hints without running the code.',protocol:'A typing interface satisfied by any class with matching methods (PEP 544).',dataclass:'A standard-library class generator for plain records; no validation.',
    exc:'An object raised to signal failure; travels up until caught.',eafp:'Try it and catch the failure, rather than checking first.',di:'Passing a function its collaborators instead of letting it create them.',fake:'A small working implementation used in tests.',mock:'A test object that records calls and returns canned values.',
    wheel:'A built, installable Python package archive (.whl).',refactoring:'A change of structure that keeps observable behaviour.',char:'A test that records what code does today, to detect any change.',review:'A second engineer reading a change before it merges.'};
  const terms=[...document.querySelectorAll('#t-read dfn[id]')].map(d=>({id:d.id,t:d.textContent,k:d.id.slice(2)})).sort((a,b)=>a.t.localeCompare(b.t));
  document.getElementById('gloss').innerHTML=terms.map(x=>'<div><b><a href="#'+x.id+'">'+esc(x.t)+'</a></b>: '+esc(G[x.k]||'')+'</div>').join('');
})();

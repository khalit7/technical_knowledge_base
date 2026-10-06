// ---- Harness atlas: helpers, the matrix, compare two, chooser, edit formats ----
window.ATLX=(function(){
  const A=window.ATL||{h:[],sets:{}};
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'source'}};
  // a source string may carry text after the URL ("https://x (data: ...)"): link the URL, keep the rest as text
  const link=(u,t)=>{const m=String(u||'').match(/https?:\/\/[^\s;,)]+/);if(!m)return esc(u||'');
    const rest=String(u).replace(m[0],'').trim();
    return '<a href="'+esc(m[0])+'" target="_blank" rel="noopener noreferrer">'+esc(t||host(m[0]))+'</a>'+(rest&&!t?' <span class="mute">'+esc(rest)+'</span>':'')};
  const links=arr=>(arr||[]).map(u=>link(u)).join(', ');
  const onRender=f=>{window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER['t-atlas']=window.TAB_RENDER['t-atlas']||[]).push(f)};
  const tabShown=()=>{const t=$('t-atlas');return t&&!t.hidden};
  const n0=x=>x==null||isNaN(x)?'n/a':Math.round(x).toLocaleString('en-US');
  return {A,RM,$,esc,link,links,onRender,tabShown,n0,host};
})();

(function(){
  const {A,$,esc,link,links,onRender}=window.ATLX;
  const H=A.h;if(!H||!H.length)return;
  const AX=[['open','Open source'],['models','Models'],['loop','Loop design'],['edit','Edit format'],['context','Context'],['perms','Permissions and sandbox'],['ext','Extensibility'],['where','Where it runs'],['price','Pricing']];
  const FAM=[['all','All'],['cli','Vendor CLIs'],['ide','Editors and IDE agents'],['cloud','Cloud agents'],['oss','Open-source harnesses'],['personal','Personal agents']];
  const has=(h,a,t)=>(h.ax[a].t||[]).includes(t);
  const PROPS=[
    ['open','Open source',h=>has(h,'open','open')],
    ['any','Any model',h=>has(h,'models','any')],
    ['ossb','OS sandbox',h=>has(h,'perms','os-sandbox-macos')||has(h,'perms','os-sandbox-linux')],
    ['cont','Container or cloud VM',h=>has(h,'perms','container')||has(h,'perms','cloud-vm')],
    ['plan','Plan mode',h=>has(h,'loop','plan-mode')],
    ['sub','Subagents',h=>has(h,'loop','subagents')],
    ['mcp','MCP',h=>has(h,'ext','mcp')],
    ['hooks','Hooks',h=>has(h,'ext','hooks')],
    ['agmd','Reads AGENTS.md',h=>has(h,'context','agents-md')],
    ['ci','Runs in CI',h=>has(h,'where','ci')],
    ['bg','Background or cloud',h=>has(h,'loop','async-background')||has(h,'where','cloud')],
    ['byo','Free with your own key',h=>has(h,'price','byo-key')||(has(h,'price','free')&&has(h,'open','open'))]
  ];
  let fam='all';const on=new Set();let sel=null;
  $('atl-count').textContent=H.length;
  $('atl-fam').innerHTML=FAM.map(f=>'<button data-f="'+f[0]+'"'+(f[0]==='all'?' class="on"':'')+'>'+f[1]+'</button>').join('');
  $('atl-prop').innerHTML=PROPS.map(p=>'<button data-p="'+p[0]+'" aria-pressed="false">'+p[1]+'</button>').join('');
  const tagHtml=c=>(c.t||[]).map(t=>'<span class="atl-t y">'+esc(t)+'</span>').join('');
  function matrix(){
    let h='<thead><tr><th class="atl-nm">Harness</th>'+AX.map(a=>'<th>'+a[1]+'</th>').join('')+'</tr></thead><tbody>';
    H.forEach((x,i)=>{
      h+='<tr data-i="'+i+'"><th class="atl-nm">'+esc(x.name.replace(/ \(.*\)$/,''))+(x.badge?'<span class="atl-st">'+esc(x.badge)+'</span>':'')+'<span class="atl-mk">'+esc(x.maker)+'</span></th>';
      AX.forEach(a=>{const c=x.ax[a[0]];h+='<td class="atl-c" data-i="'+i+'" data-a="'+a[0]+'" tabindex="0"><span class="atl-v">'+esc(c.v||'not documented')+'</span>'+tagHtml(c)+'</td>'});
      h+='</tr>'});
    $('atl-mat').innerHTML=h+'</tbody>';
  }
  function filt(){
    const p=PROPS.filter(p=>on.has(p[0]));let n=0;
    $('atl-mat').querySelectorAll('tbody tr').forEach(tr=>{const x=H[+tr.dataset.i];
      const ok=(fam==='all'||x.fam===fam)&&p.every(q=>q[2](x));tr.classList.toggle('atl-dim',!ok);if(ok)n++});
    $('atl-mcap').textContent=n+' of '+H.length+' harnesses match'+(p.length?' ('+p.map(q=>q[1]).join(' + ')+')':'')+'. Tags read from each product\'s documentation on '+A.read+'; scroll the table sideways on a narrow screen.';
  }
  function cell(i,a){
    const x=H[i],c=x.ax[a],nm=AX.find(q=>q[0]===a)[1];sel=[i,a];
    $('atl-mat').querySelectorAll('td.on').forEach(t=>t.classList.remove('on'));
    const td=$('atl-mat').querySelector('td[data-i="'+i+'"][data-a="'+a+'"]');if(td)td.classList.add('on');
    let h='<h4>'+esc(x.name)+': '+esc(nm)+'</h4><p><b>'+esc(c.v)+'.</b> '+esc(c.d)+'</p><p class="atl-src">Source: '+(links(c.s)||'none found')+'</p>';
    h+='<p class="small"><b>'+esc(x.name)+'</b> ('+esc(x.maker)+'): '+esc(x.sum)+'</p>';
    const st=x.st;if(st&&st.d)h+='<p class="small"><b>Status:</b> '+esc(st.v)+'. '+esc(st.d)+(st.src.length?' <span class="atl-src">'+links(st.src)+'</span>':'')+'</p>';
    else if(st&&st.v&&st.v!=='active')h+='<p class="small"><b>Status:</b> '+esc(st.v)+'</p>';
    const fl=[];if(x.first.v)fl.push('first release '+esc(x.first.v)+(x.first.d?' ('+esc(x.first.d)+')':'')+(x.first.s.length?' '+links(x.first.s):''));
    if(x.latest.v)fl.push('latest seen '+esc(x.latest.v)+(x.latest.date?', '+esc(x.latest.date):'')+(x.latest.s.length?' '+links(x.latest.s):''));
    if(fl.length)h+='<p class="small">'+fl.join('; ')+'</p>';
    if(x.deep&&x.deep.length)h+='<p class="small"><b>Go deeper:</b> <a href="'+x.deep[1]+'" target="_blank" rel="noopener noreferrer">'+esc(x.deep[0])+'</a>, a child page of this topic.</p>';
    if(x.notes&&x.notes.length)h+='<details><summary class="small">Notes on '+esc(x.name)+' ('+x.notes.length+')</summary><ul class="small">'+x.notes.map(n=>'<li>'+esc(String(n)).replace(/(https?:\/\/[^\s;,)]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')+'</li>').join('')+'</ul></details>';
    $('atl-cell').innerHTML=h;
  }
  matrix();filt();
  $('atl-fam').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;fam=b.dataset.f;
    $('atl-fam').querySelectorAll('button').forEach(q=>q.classList.toggle('on',q===b));filt()});
  $('atl-prop').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.p;
    on.has(k)?on.delete(k):on.add(k);b.classList.toggle('on',on.has(k));b.setAttribute('aria-pressed',on.has(k));filt()});
  const pick=e=>{const td=e.target.closest('td.atl-c');if(td)cell(+td.dataset.i,td.dataset.a)};
  $('atl-mat').addEventListener('click',pick);
  $('atl-mat').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e)}});
  cell(0,'perms');

  // ---- compare two ----
  const opt=H.map((x,i)=>'<option value="'+i+'">'+esc(x.name.replace(/ \(.*\)$/,''))+'</option>').join('');
  $('atl-ca').innerHTML=opt;$('atl-cb').innerHTML=opt;
  $('atl-ca').value=String(H.findIndex(x=>x.id==='claude_code'));$('atl-cb').value=String(H.findIndex(x=>x.id==='openai_codex'));
  function cmp(){
    const a=H[+$('atl-ca').value],b=H[+$('atl-cb').value];let n=0;
    let h='<div class="atl-cmp"><div class="h"></div><div class="h">'+esc(a.name)+'</div><div class="h">'+esc(b.name)+'</div>';
    h+='<div class="k">What it is</div><div class="atl-s">'+esc(a.sum)+'</div><div class="atl-s">'+esc(b.sum)+'</div>';
    AX.forEach(q=>{const ca=a.ax[q[0]],cb=b.ax[q[0]];const ta=(ca.t||[]).slice().sort().join(),tb=(cb.t||[]).slice().sort().join();const d=ta!==tb;if(d)n++;
      const one=c=>'<b>'+esc(c.v)+'</b><br><span class="atl-s">'+esc(c.d)+'</span><br>'+tagHtml(c)+(c.s.length?'<br><span class="atl-src">'+links(c.s)+'</span>':'');
      h+='<div class="k">'+q[1]+'</div><div class="'+(d?'diff':'')+'">'+one(ca)+'</div><div class="'+(d?'diff':'')+'">'+one(cb)+'</div>'});
    $('atl-cmp').innerHTML=h+'</div><p class="atl-cap">'+n+' of 9 axes differ in their tags (highlighted).</p>';
  }
  $('atl-ca').addEventListener('change',cmp);$('atl-cb').addEventListener('change',cmp);
  $('atl-cswap').addEventListener('click',()=>{const t=$('atl-ca').value;$('atl-ca').value=$('atl-cb').value;$('atl-cb').value=t;cmp()});
  cmp();

  // ---- chooser ----
  const NEED=['open','any','ossb','cont','ci','bg','mcp','hooks','sub','plan','byo','agmd'];
  $('atl-need').innerHTML=NEED.map(k=>{const p=PROPS.find(q=>q[0]===k);return '<label><input type="checkbox" data-n="'+k+'"> '+p[1]+'</label>'}).join('');
  function choose(){
    const need=[...$('atl-need').querySelectorAll('input:checked')].map(i=>i.dataset.n);
    const P=k=>PROPS.find(q=>q[0]===k);
    const live=H.filter(x=>!/shut down|discontinued/i.test(x.badge+' '+(x.st.v||'')));
    const kept=live.filter(x=>need.every(k=>P(k)[2](x)));
    const extra=x=>NEED.filter(k=>!need.includes(k)&&P(k)[2](x));
    kept.sort((x,y)=>extra(y).length-extra(x).length||x.name.localeCompare(y.name));
    const dropped=H.length-live.length;
    let h='<p class="small"><b>'+kept.length+'</b> of '+live.length+' live harnesses meet '+(need.length?'all of: '+need.map(k=>P(k)[1]).join(', '):'no requirement yet (tick some)')+'. '+dropped+' discontinued product'+(dropped===1?'':'s')+' left out.</p>';
    h+=kept.slice(0,8).map(x=>'<div class="r"><b>'+esc(x.name.replace(/ \(.*\)$/,''))+'</b> <span class="mute small">'+esc(x.maker)+'</span>'+(x.badge?'<span class="atl-st">'+esc(x.badge)+'</span>':'')+'<div class="why">Also has: '+(extra(x).map(k=>P(k)[1]).join(', ')||'none of the other properties')+'. '+esc(x.ax.price.v)+'.</div></div>').join('');
    if(kept.length>8)h+='<p class="small mute">and '+(kept.length-8)+' more: '+kept.slice(8).map(x=>esc(x.name.replace(/ \(.*\)$/,''))).join(', ')+'.</p>';
    if(!kept.length)h+='<p class="small">Nothing meets every need. Untick the least important one, or build the missing piece yourself (the {{Loop lab|#t-loop}} shows how).</p>';
    $('atl-res').innerHTML=h;
    $('atl-res').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click()}));
  }
  $('atl-need').addEventListener('change',choose);
  ['open','any'].forEach(k=>{const i=$('atl-need').querySelector('input[data-n="'+k+'"]');if(i)i.checked=true});
  choose();
  onRender(()=>{});
})();

// ---- edit formats: one fix, six ways ----
(function(){
  const {$,esc}=window.ATLX;
  const OLD='    return sorted(counts.items(), key=lambda kv: -kv[1])[:n]';
  const NEW='    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:n]';
  const F=[
    ['Exact-string replace','Claude Code (Edit), Gemini CLI (replace), OpenHands (str_replace), opencode, Goose, Pi',
     JSON.stringify({file_path:'textstats/core.py',old_string:OLD.trim(),new_string:NEW.trim()},null,1),
     'The model quotes the exact text to change and its replacement. If the old text appears zero times or more than once, the tool refuses and says so, and the model tries again with more context. Cheap: only the changed lines travel.'],
    ['SEARCH/REPLACE block','Aider (diff format), Roo Code (apply_diff); Cursor describes its edits as search-and-replace',
     'textstats/core.py\n```python\n<<<<<<< SEARCH\n'+OLD+'\n=======\n'+NEW+'\n>>>>>>> REPLACE\n```',
     'The same idea written as text instead of a tool call: no JSON escaping, so code with quotes and backslashes survives better. The harness, not the model, finds the block in the file.'],
    ['apply_patch','Codex; also offered by opencode and OpenClaw',
     '*** Begin Patch\n*** Update File: textstats/core.py\n@@ def top_words(text, n=3):\n-'+OLD+'\n+'+NEW+'\n*** End Patch',
     'A patch language with an anchor line (@@ plus a nearby line of code) instead of line numbers, so it still applies after earlier lines moved. Supports adding, deleting and moving files in one action.'],
    ['Unified diff','Aider (udiff), Cline 4.x (apply_patch takes unified diffs), git',
     '--- a/textstats/core.py\n+++ b/textstats/core.py\n@@ -15,3 +15,3 @@\n     """Return the n most common words as (word, count), ties broken alphabetically."""\n     counts = Counter(tokenize(text))\n-'+OLD+'\n+'+NEW,
     'The format of git diff: line numbers plus context lines. Familiar to every model from training data; line numbers drift if the model miscounts, so harnesses that accept it usually match on the context lines and ignore the numbers.'],
    ['Whole file','Write tools in most harnesses; Aider (whole)',
     'import re\nfrom collections import Counter\n\n\ndef tokenize(text):\n    """Split text into lowercase words. Apostrophes inside words are kept."""\n    return re.findall(r"[a-z]+", text.lower())\n\n\ndef word_count(text):\n    return len(tokenize(text))\n\n\ndef top_words(text, n=3):\n    """Return the n most common words as (word, count), ties broken alphabetically."""\n    counts = Counter(tokenize(text))\n'+NEW,
     'Never fails to apply, but the model rewrites every line to change one, so output tokens grow with the file, and a long file invites silently dropped code. Fine for new files and tiny ones like this.'],
    ['Shell only','mini-SWE-agent (bash only)',
     "sed -i 's/key=lambda kv: -kv\\[1\\])\\[:n\\]/key=lambda kv: (-kv[1], kv[0]))[:n]/' textstats/core.py",
     'No edit tool at all: the model edits with sed, a heredoc or a Python one-liner. Maximally general and minimal, but regex escaping is on the model, and GNU sed (Linux) and BSD sed (macOS) disagree on -i.']
  ];
  let k=0;
  $('atl-efb').innerHTML=F.map((f,i)=>'<button data-i="'+i+'"'+(i?'':' class="on"')+'>'+f[0]+'</button>').join('');
  function show(){
    const f=F[k];$('atl-efcode').textContent=f[2];
    const ch=f[2].length;
    $('atl-efstat').innerHTML='<div class="stat"><div class="k">Characters the model writes</div><div class="v">'+ch+'</div><div class="d">about '+Math.round(ch/4)+' tokens (approximate)</div></div><div class="stat"><div class="k">Used by</div><div class="v" style="font-size:14px">'+esc(f[1])+'</div></div>';
    $('atl-efnote').innerHTML='<b>'+esc(f[0])+'.</b> '+esc(f[3]);
    $('atl-efb').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===k));
  }
  $('atl-efb').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;k=+b.dataset.i;show()});
  show();
})();

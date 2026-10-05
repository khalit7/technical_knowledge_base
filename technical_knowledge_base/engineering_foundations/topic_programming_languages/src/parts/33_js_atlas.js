// ---- Toolchain atlas (t-tools): shared helpers, view switch, atlas grid, cell detail, compare ----
window.TA=(function(){
  const D=window.TA_DATA;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // inline markdown used in the data: `code` and [text](url)
  const md=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const $=id=>document.getElementById(id);
  const lang=id=>D.langs.find(l=>l.id===id);
  const job=id=>D.jobs.find(j=>j.id===id);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-tools']=window.TAB_RENDER['t-tools']||[]).push(f)};
  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const dot=l=>'<span class="ta-dot" style="background:var(--'+l.col+')"></span>';
  // terminal text: escape and colour the prompt, errors, warnings and passes
  function term(cmd,out){
    let h='';
    if(cmd!=null)h+='<span class="p">$ '+esc(cmd)+'</span>\n';
    (out||'').split('\n').forEach(l=>{
      const e=esc(l);
      if(/(^|\s)(error|Error|FAIL|TypeError|runtime error|Undefined Behavior)/.test(l))h+='<span class="e">'+e+'</span>\n';
      else if(/warning|Warning|\[MODULE_TYPELESS/.test(l))h+='<span class="e">'+e+'</span>\n';
      else if(/passed|Passed| ok$|All checks passed|1 pass$|^ok$/.test(l))h+='<span class="ok">'+e+'</span>\n';
      else h+=e+'\n';
    });
    return h.replace(/\n$/,'');
  }
  function verLine(t){
    let s='<b>'+esc(t.version)+'</b>';
    if(t.parts){s='';t.parts.forEach((p,i)=>{s+=(i?' · ':'')+esc(p.label)+' <b>'+esc(p.version)+'</b>'+(p.date?' ('+p.date+(p.url?', <a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.src||'source')+'</a>':'')+')':'')});
      return s+' · checked '+D.checked}
    if(t.date)s+=' · released '+t.date;
    if(t.url)s+=' · <a href="'+esc(t.url)+'" target="_blank" rel="noopener noreferrer">'+esc(t.src||'source')+'</a>';
    if(!/^ships with/.test(t.version))s+=' · checked '+D.checked;
    return s;
  }
  function seenHTML(c){
    if(!c.seen)return '';
    let h='<div class="ta-seen"><div class="small"><b>Seen it run.</b> '+md(c.seen_intro||'')+'</div>';
    c.seen.forEach(k=>{const x=D.extra[k];if(!x)return;
      h+='<div class="ta-lab">'+esc(x.label)+'</div><pre class="ta-term">'+term(null,x.out||'(no output)')+'</pre>'});
    return h+'</div>';
  }
  // the body of one cell: summary, tools, bridge, trap, real output
  function cellHTML(jid,lid,opt){
    opt=opt||{};const c=D.cells[jid][lid],L=lang(lid),J=job(jid);
    let h='';
    if(opt.head!==false)h+='<h3>'+dot(L)+esc(L.name)+' · '+esc(J.label)+'</h3><p class="q">'+esc(J.q)+'</p>';
    else h+='<div class="ta-lh">'+dot(L)+esc(L.name)+'</div>';
    h+='<p><b>'+md(c.sum)+'</b></p>';
    c.tools.forEach(t=>{
      h+='<div class="ta-tool"><span class="nm">'+esc(t.n)+'</span>'+(t.alt?'<span class="alt">alternative</span>':'')+
        '<div>'+md(t.what)+'</div><div class="ta-ver">'+verLine(t)+'</div><code class="ta-cmd">'+esc(t.cmd)+'</code></div>';
    });
    if(c.py)h+='<div class="ta-bridge"><b>From Python</b>'+md(c.py)+'</div>';
    if(c.warn)h+='<div class="ta-warn"><b>Watch out</b>'+md(c.warn)+'</div>';
    h+=seenHTML(c);
    return h;
  }

  // ---------- view switch ----------
  const views=['atlas','cmp','walk','time','corr'];
  const viewHooks={};
  function showView(v,save){
    if(views.indexOf(v)<0)v='atlas';
    $('ta-views').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
    views.forEach(x=>{$('ta-v-'+x).hidden=x!==v});
    if(viewHooks[v])viewHooks[v]();
    if(save)store.set('ta-view',v);
  }
  $('ta-views').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showView(b.dataset.v,true)});

  // ---------- atlas grid ----------
  const st={langs:new Set(D.langs.map(l=>l.id)),grp:'',q:'',sel:{job:'project',lang:'rs'}};
  const groups=[...new Set(D.jobs.map(j=>j.g))];
  $('ta-grp').innerHTML+=groups.map(g=>'<option>'+esc(g)+'</option>').join('');
  $('ta-langs').innerHTML=D.langs.map(l=>'<button class="ta-chip on" data-l="'+l.id+'" aria-pressed="true">'+dot(l)+esc(l.name)+'</button>').join(' ');
  $('ta-langs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.l;
    if(st.langs.has(id)){if(st.langs.size===1)return;st.langs.delete(id)}else st.langs.add(id);
    b.classList.toggle('on',st.langs.has(id));b.setAttribute('aria-pressed',st.langs.has(id));
    if(!st.langs.has(st.sel.lang))st.sel.lang=[...st.langs][0];drawGrid()});
  $('ta-grp').addEventListener('change',e=>{st.grp=e.target.value;drawGrid()});
  $('ta-q').addEventListener('input',e=>{st.q=e.target.value.trim().toLowerCase();drawGrid()});
  function matches(t){if(!st.q)return true;return (t.n+' '+t.what+' '+t.cmd).toLowerCase().indexOf(st.q)>=0}
  function mark(s){if(!st.q)return esc(s);const i=s.toLowerCase().indexOf(st.q);if(i<0)return esc(s);
    return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+st.q.length))+'</mark>'+esc(s.slice(i+st.q.length))}
  function shortVer(t){const v=t.parts?t.parts.map(p=>p.version).join(' / '):t.version;return v}
  function drawGrid(){
    const ls=D.langs.filter(l=>st.langs.has(l.id));
    const tb=$('ta-grid');tb.className='ta-grid n'+ls.length;
    let h='<thead><tr><th class="ta-job">Job</th>'+ls.map(l=>'<th>'+dot(l)+esc(l.name)+'</th>').join('')+'</tr></thead><tbody>';
    let hits=0,shown=0;
    groups.forEach(g=>{
      if(st.grp&&st.grp!==g)return;
      let rows='';
      D.jobs.filter(j=>j.g===g).forEach(j=>{
        let any=false,cells='';
        ls.forEach(l=>{
          const c=D.cells[j.id][l.id];
          const prim=c.tools.filter(t=>!t.alt),alts=c.tools.length-prim.length;
          const m=c.tools.filter(matches);if(m.length)any=true;hits+=st.q?m.length:0;
          const list=(st.q?m:prim).slice(0,2);
          const sel=st.sel.job===j.id&&st.sel.lang===l.id;
          cells+='<td class="ta-c'+(sel?' sel':'')+'" data-j="'+j.id+'" data-l="'+l.id+'" tabindex="0" role="button" aria-label="'+esc(l.name+', '+j.label)+'"'+(st.q&&!m.length?' style="opacity:.35"':'')+'>'+
            list.map(t=>'<span class="tn">'+mark(t.n)+'</span><span class="tv">'+esc(shortVer(t))+'</span>').join('')+
            (!st.q&&alts?'<span class="tx">+'+alts+' alternative'+(alts>1?'s':'')+'</span>':'')+
            (st.q&&!m.length?'<span class="tx">no match</span>':'')+'</td>';
        });
        if(st.q&&!any)return;
        shown++;
        rows+='<tr><th class="ta-job" scope="row">'+esc(j.label)+'</th>'+cells+'</tr>';
      });
      if(rows)h+='<tr class="ta-grp"><th class="ta-job" scope="rowgroup">'+esc(g)+'</th><td colspan="'+ls.length+'"></td></tr>'+rows;
    });
    tb.innerHTML=h+'</tbody>';
    $('ta-hits').textContent=st.q?(hits?hits+' tool'+(hits>1?'s':'')+' match "'+st.q+'" in '+shown+' job'+(shown>1?'s':''):'Nothing matches "'+st.q+'".'):'';
    drawDet();
  }
  function pick(td){st.sel={job:td.dataset.j,lang:td.dataset.l};
    $('ta-grid').querySelectorAll('td.ta-c').forEach(x=>x.classList.toggle('sel',x===td));drawDet();
    const d=$('ta-det');if(d.getBoundingClientRect().top>innerHeight-80)d.scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'})}
  $('ta-grid').addEventListener('click',e=>{const td=e.target.closest('td.ta-c');if(td)pick(td)});
  $('ta-grid').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const td=e.target.closest('td.ta-c');if(td){e.preventDefault();pick(td)}});
  function drawDet(){$('ta-det').innerHTML=cellHTML(st.sel.job,st.sel.lang)}
  $('ta-method').innerHTML=esc(D.notes.method);

  // ---------- compare ----------
  $('ta-cj').innerHTML=D.jobs.map(j=>'<option value="'+j.id+'">'+esc(j.label)+'</option>').join('');
  const lo=D.langs.map(l=>'<option value="'+l.id+'">'+esc(l.name)+'</option>').join('');
  $('ta-ca').innerHTML=lo;$('ta-cb').innerHTML=lo;
  $('ta-cj').value='project';$('ta-ca').value='py';$('ta-cb').value='rs';
  function drawCmp(){const j=$('ta-cj').value,a=$('ta-ca').value,b=$('ta-cb').value;
    const J=job(j);
    $('ta-cmp').innerHTML='<p class="q" style="grid-column:1/-1;margin:0">'+esc(J.q)+'</p>'+
      [a,b].map((l,i)=>(i&&a===b)?'':'<div class="ta-det">'+cellHTML(j,l,{head:false})+'</div>').join('');
  }
  ['ta-cj','ta-ca','ta-cb'].forEach(id=>$(id).addEventListener('change',drawCmp));

  drawGrid();drawCmp();
  const api={D,RM,esc,md,term,$,lang,job,onRender,store,dot,viewHooks,showView};
  // first view: remembered one, else atlas (after the other view scripts registered their hooks)
  setTimeout(()=>showView(store.get('ta-view','atlas'),false),0);
  return api;
})();

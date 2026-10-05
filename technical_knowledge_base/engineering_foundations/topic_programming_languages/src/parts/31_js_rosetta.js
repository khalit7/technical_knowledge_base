// ---- Rosetta tab: code reader, outputs, mistakes matrix (data: window.RO_DATA from src/rosetta/make_data.py) ----
(function(){
  const D=window.RO_DATA, root=document.getElementById('t-rosetta');
  if(!D||!root)return;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const LN={python:'Python',cpp:'C++',rust:'Rust',ts:'TypeScript'};
  const LANGS=['python','cpp','rust','ts'];
  const KW={
    python:'def class return if elif else for while in not and or is import from as with try except finally raise pass continue break lambda None True False yield async await global nonlocal',
    cpp:'include pragma once struct class public private const constexpr static return if else for while do switch case break continue auto bool char int long unsigned size_t void template typename requires try catch throw using namespace new delete explicit mutable nullptr true false operator std',
    rust:'fn let mut pub struct impl enum trait use mod match if else for in while loop return move ref self Self as where dyn crate super true false const static unsafe async await',
    ts:'function const let var return if else for of in while class interface type extends implements new this import from export async await try catch throw typeof instanceof public private readonly true false null undefined void as'
  };
  const TY={
    python:'str int float dict list tuple bool Counter Callable Iterable Message BadLine Exception OSError ValueError KeyError TypeError',
    cpp:'string string_view optional vector unordered_map map pair function runtime_error ifstream Message Parser expected unexpected thread int64_t',
    rust:'String str u64 u8 i32 i64 usize f64 Vec HashMap Option Result Ok Err Some None Box Fn FnMut ExitCode File BufReader Message Mutex',
    ts:'string number boolean unknown any Map Array Promise Record Message Error Worker'
  };
  const sets={};LANGS.forEach(l=>{sets[l]={k:new Set(KW[l].split(' ')),t:new Set(TY[l].split(' '))}});
  const RX={
    python:/("""[\s\S]*?"""|'''[\s\S]*?'''|[rbf]?"(?:\\.|[^"\\\n])*"|[rbf]?'(?:\\.|[^'\\\n])*')|(#.*)|(\b\d[\d_]*(?:\.\d+)?\b|\b0x[0-9a-f]+\b)|(@\w+)|([A-Za-z_]\w*)/g,
    cpp:/(R"\([\s\S]*?\)"|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\/\/.*|\/\*[\s\S]*?\*\/)|(\b\d[\d']*(?:\.\d+)?[uUlL]*\b|\b0x[0-9a-fA-F]+\b)|(#\s*\w+)|([A-Za-z_]\w*)/g,
    rust:/("(?:\\.|[^"\\])*")|(\/\/.*)|(\b\d[\d_]*(?:\.\d+)?(?:u64|i32|i64|usize)?\b)|(#!?\[[^\]]*\]|\b\w+!)|([A-Za-z_]\w*)/g,
    ts:/(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\/\/.*|\/\*[\s\S]*?\*\/)|(\b\d[\d_]*(?:\.\d+)?\b)|(%\w+)|([A-Za-z_$][\w$]*)/g
  };
  const langOf=f=>/\.py$/.test(f)?'python':/\.(cpp|hpp)$/.test(f)?'cpp':/\.rs$/.test(f)?'rust':/\.toml$/.test(f)?'toml':'ts';
  // tokens -> lines of html
  function hl(text,lang){
    const out=[];let cur='';
    const push=(s,cls)=>{const parts=s.split('\n');parts.forEach((p,i)=>{if(i>0){out.push(cur);cur=''}if(p)cur+=cls?'<span class="'+cls+'">'+esc(p)+'</span>':esc(p)})};
    const rx=RX[lang];
    if(!rx){text.split('\n').forEach((l,i,a)=>{if(i<a.length-1||l)out.push(esc(l))});return out}
    rx.lastIndex=0;let last=0,m;const S=sets[lang];
    while((m=rx.exec(text))){
      push(text.slice(last,m.index));
      let cls='';
      if(m[1])cls='tk-s';else if(m[2])cls='tk-c';else if(m[3])cls='tk-n';else if(m[4])cls='tk-m';
      else if(m[5])cls=S.k.has(m[5])?'tk-k':S.t.has(m[5])?'tk-t':'';
      push(m[0],cls);last=rx.lastIndex;
    }
    push(text.slice(last));out.push(cur);
    if(out.length&&out[out.length-1]==='')out.pop();
    return out;
  }
  const hlCache={};
  function lines(file){if(!hlCache[file])hlCache[file]=hl(D.sources[file],langOf(file));return hlCache[file]}
  function codeBlock(file,a,b){
    const L=lines(file);b=b==null?L.length:b;let h='';
    for(let i=a;i<b;i++)h+='<span class="l"><span class="n">'+(i+1)+'</span>'+(L[i]||'')+'</span>';
    return '<pre class="ro-code"><code class="lang-'+langOf(file)+'">'+h+'</code></pre>';
  }
  function outBlock(key){
    const t=D.outputs[key]||'';const ls=t.replace(/\n$/,'').split('\n');
    const h=ls.map((l,i)=>{
      if(i===0)return '<span class="cmd">'+esc(l)+'</span>';
      const ex=l.match(/^\[exit (\d+)\]$/);
      if(ex)return '<span class="ex'+(ex[1]!=='0'?' bad':'')+'">[exit code '+ex[1]+']</span>';
      if(/(^|\s)(error(\[E\d+\])?|ERROR|WARNING|Traceback|panicked|terminating)\b|Error:|Error \[|^\w+Error\b/.test(l))return '<span class="err">'+esc(l)+'</span>';
      return esc(l);
    }).join('\n');
    return '<div class="ro-out"><pre>'+h+'</pre></div>';
  }
  // ---- input sample
  $('ro-input').textContent=D.input.sample.join('\n');
  // ---- code reader
  const items=[D.program].concat(D.tasks);
  const st={task:'program',lang:'python',mode:'ann',vs:'cpp',notes:false};
  try{const s=JSON.parse(localStorage.getItem('ro-state')||'{}');['task','lang','mode','vs'].forEach(k=>{if(s[k])st[k]=s[k]})}catch(e){}
  if(!items.some(t=>t.id===st.task))st.task='program';
  $('ro-tasks').innerHTML=items.map(t=>'<button data-id="'+t.id+'">'+esc(t.title)+'</button>').join('');
  function save(){try{localStorage.setItem('ro-state',JSON.stringify(st))}catch(e){}}
  function chunkHtml(file,ch,withNote){
    return '<div class="ro-chunk">'+codeBlock(file,ch[0],ch[1])+(withNote?'<div class="ro-note">'+ch[2]+'</div>':'')+'</div>';
  }
  function pane(t,lang,withNotes){
    const L=t.langs[lang];
    return '<div class="ro-pane" style="min-width:0"><div class="ro-ph">'+LN[lang]+' <span>'+esc(L.file.split('/').pop())+', '+lines(L.file).length+' lines</span></div>'+
      L.chunks.map(ch=>chunkHtml(L.file,ch,withNotes)).join('')+'</div>';
  }
  function render(){
    const t=items.find(x=>x.id===st.task);
    [...$('ro-tasks').children].forEach(b=>b.classList.toggle('on',b.dataset.id===st.task));
    [...$('ro-lang').children].forEach(b=>b.classList.toggle('on',b.dataset.m===st.lang));
    [...$('ro-mode').children].forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode));
    $('ro-q').innerHTML='<b>'+esc(t.title)+'.</b> '+esc(t.q);
    $('ro-axes').innerHTML='<span class="small mute">Axes:</span>'+t.axes.map(a=>'<span class="ro-axis" data-axis="'+a+'">'+a+'</span>').join('');
    $('ro-habit').innerHTML='<b>Python habit that bites here:</b> '+t.habit;
    $('ro-vs-wrap').hidden=st.mode!=='two';$('ro-notes-wrap').hidden=st.mode!=='two';
    $('ro-vs').value=st.vs;$('ro-notes').checked=st.notes;
    const v=$('ro-view');
    let shown=[st.lang];
    if(st.mode==='ann'){v.className='ro-ann';v.innerHTML=pane(t,st.lang,true)}
    else{
      const other=st.vs===st.lang?(st.lang==='python'?'cpp':'python'):st.vs;
      shown=[other,st.lang];
      v.className='ro-two'+(st.notes?'':' nonotes');v.innerHTML=pane(t,other,true)+pane(t,st.lang,true);
    }
    // extra files (parser header, Cargo.toml, tsconfig, expected.cpp)
    $('ro-extra').innerHTML=shown.map(l=>{const f=t.langs[l].extra;return f?'<details class="ro-extra"><summary>'+LN[l]+': open <code>'+esc(f.split('/').pop())+'</code> ('+lines(f).length+' lines)</summary>'+codeBlock(f,0)+'</details>':''}).join('');
    $('ro-outs').innerHTML=shown.map(l=>t.langs[l].outs.map(outBlock).join('')).join('');
    save();
  }
  $('ro-tasks').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.task=b.dataset.id;render()});
  $('ro-lang').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.lang=b.dataset.m;render()});
  $('ro-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;render()});
  $('ro-vs').addEventListener('change',e=>{st.vs=e.target.value;render()});
  $('ro-notes').addEventListener('change',e=>{st.notes=e.target.checked;render()});
  // tab links inside generated notes
  root.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a||!root.contains(a))return;
    if(a.closest('#ro-view,#ro-habit,#ro-det,#ro-q')){e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}}});
  render();
  // ---- mistakes matrix
  const VK=['compile','check','crash','silent','fine','na'];
  const SHORT={compile:'Compiler stops it',check:'Type checker stops it',crash:'Crashes',silent:'Wrong, silently',fine:'Fine',na:'Not possible'};
  $('ro-leg').innerHTML=VK.filter(k=>k!=='na').map(k=>'<span><span class="vd v-'+k+'"></span>'+esc(D.verdicts[k])+'</span>').join('')+'<span><span class="vd v-na"></span>'+esc(D.verdicts.na)+'</span>';
  const mx={row:'dangling',lang:'rust'};
  try{const s=JSON.parse(localStorage.getItem('ro-mx')||'{}');if(s.row&&D.mistakes.some(m=>m.id===s.row))mx.row=s.row;if(LANGS.includes(s.lang))mx.lang=s.lang}catch(e){}
  $('ro-mx').innerHTML='<thead><tr><th>Mistake</th>'+LANGS.map(l=>'<th>'+LN[l]+'</th>').join('')+'</tr></thead><tbody>'+
    D.mistakes.map(m=>'<tr><th scope="row">'+esc(m.title)+'</th>'+LANGS.map(l=>{const c=m.cells[l];
      return '<td><button class="v-'+c.verdict+'" data-r="'+m.id+'" data-l="'+l+'" aria-label="'+esc(m.title+', '+LN[l])+'"><span class="vd v-'+c.verdict+'"></span>'+SHORT[c.verdict]+(c.also==='check'?'<br><span class="mute">mypy: rejected</span>':'')+'</button></td>'}).join('')+'</tr>').join('')+'</tbody>';
  function renderDet(){
    root.querySelectorAll('#ro-mx td button').forEach(b=>b.classList.toggle('on',b.dataset.r===mx.row&&b.dataset.l===mx.lang));
    const m=D.mistakes.find(x=>x.id===mx.row),c=m.cells[mx.lang];
    $('ro-det').innerHTML='<h3>'+esc(m.title)+': '+LN[mx.lang]+'</h3><p class="small">'+m.q+' <span class="mute">Axes: '+m.axes.join(', ')+'.</span></p>'+
      '<div class="ro-habit"><b>Python habit that bites here:</b> '+m.habit+'</div>'+
      '<p><span class="vd v-'+c.verdict+'"></span><b>'+esc(D.verdicts[c.verdict])+'.</b> '+c.note+'</p>'+
      (c.file?'<div class="ro-ph">'+esc(c.file.split('/').pop())+'</div>'+codeBlock(c.file,0):'')+
      c.outs.map(outBlock).join('');
    try{localStorage.setItem('ro-mx',JSON.stringify(mx))}catch(e){}
  }
  $('ro-mx').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;mx.row=b.dataset.r;mx.lang=b.dataset.l;renderDet()});
  renderDet();
  // deep link used by other tabs: RO_SHOW(task id or mistake id)
  window.RO_SHOW=function(id){
    if(D.mistakes.some(m=>m.id===id)){mx.row=id;renderDet();const el=$('ro-mx');if(el)el.scrollIntoView({block:'start'});return}
    if(items.some(t=>t.id===id)){st.task=id;render();const el=$('ro-tasks');if(el)el.scrollIntoView({block:'start'})}
  };
  $('ro-ver').textContent=D.versions.trim();
})();

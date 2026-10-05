// Debug lab (t-debug): browse and filter the cases, a decision tree from symptom to subsystem,
// and a "what would you check first?" drill. Data: window.DBG_DATA (33_js_dbg_0data.js).
(function(){
  const D=window.DBG_DATA; if(!D) return;
  const root=document.getElementById('t-debug');
  const $=s=>root.querySelector(s);
  const SUB={memory:'Memory',process:'Processes',signal:'Signals',cpu:'CPU and scheduling',storage:'Files and storage',ipc:'Shared memory and IPC',limits:'cgroups and limits',concurrency:'Concurrency',gpu:'GPU (from source)'};
  const byId={};D.cases.forEach(c=>byId[c.id]=c);
  const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  let built=false, mode='browse';
  const subOn=new Set();

  function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
  function pre(cls,text,label){
    const w=document.createDocumentFragment();
    if(label){w.appendChild(el('div','dbg-lab',esc(label)))}
    const p=el('pre',cls);const t=el('span','dbg-t');t.textContent=text;p.appendChild(t);w.appendChild(p);return w;
  }
  function bars(b){
    const box=el('div','dbg-bars');box.appendChild(el('div','bt',esc(b.title)+' <span class="mute" style="font-weight:400">(from the recordings below)</span>'));
    const mx=Math.max(...b.vals.map(v=>v.v))||1;
    b.vals.forEach(v=>{
      const r=el('div','dbg-bar');r.appendChild(el('div','bl',esc(v.l)));
      const w=el('div','bw');const f=el('div','bf');f.style.width=(Math.max(0.5,v.v/mx*72)).toFixed(2)+'%';
      w.appendChild(f);w.appendChild(el('span','bv',esc(v.g+' '+b.unit)));r.appendChild(w);box.appendChild(r);
    });
    return box;
  }
  function caseCard(c){
    const d=el('details','dbg-case');d.id='dbg-c-'+c.id;d.dataset.id=c.id;
    const s=el('summary');s.appendChild(el('span','dbg-tt',esc(c.title)));
    const ss=el('span','dbg-ss');ss.textContent=c.symptom.trim();s.appendChild(ss);d.appendChild(s);
    d.addEventListener('toggle',()=>{if(d.open&&!d.dataset.filled){fill(d,c);d.dataset.filled='1'}});
    return d;
  }
  function fill(d,c){
    const b=el('div','dbg-body');
    const meta=el('div','dbg-meta');
    meta.innerHTML=c.sub.map(s=>'<span class="dbg-tag s">'+esc(SUB[s]||s)+'</span>').join('')+c.tools.map(t=>'<span class="dbg-tag">'+esc(t)+'</span>').join('')+'<br>OSTEP: '+esc(c.ostep);
    b.appendChild(meta);
    b.appendChild(el('h4',null,'What the user sees'));
    if(c.seen) b.appendChild(el('p',null,esc(c.seen)));
    b.appendChild(pre('dbg-sym',c.symptom));
    if(c.bars&&c.bars.vals.length) b.appendChild(bars(c.bars));
    b.appendChild(el('h4',null,'Reproduced, and the commands that pinpoint it'));
    let last='';
    c.rec.forEach(r=>{
      const lab=r.f===last?null:(r.k==='src'?'source (sources/excerpts.txt)':'recording raw/'+r.f+'.txt');last=r.f;
      if(r.k==='host'){const f=pre('dbg-host',r.t,lab);f.querySelector('pre').insertAdjacentHTML('afterbegin','<span class="mute">host$ </span>');b.appendChild(f)}
      else b.appendChild(pre(r.k==='src'?'dbg-src':'',r.t,lab));
    });
    b.appendChild(el('h4',null,'Cause'));b.appendChild(el('p',null,c.cause));
    b.appendChild(el('h4',null,'Fix'));b.appendChild(el('p',null,c.fix));
    b.appendChild(el('h4',null,'Where it bites in training'));b.appendChild(el('p',null,c.ml));
    d.appendChild(b);
  }

  function build(){
    built=true;
    $('#dbg-env').textContent=D.env;
    // subsystem chips and tool select
    const subs=[...new Set(D.cases.flatMap(c=>c.sub))];
    const chips=$('#dbg-subs');
    subs.forEach(s=>{const bt=el('button',null,esc(SUB[s]||s));bt.dataset.s=s;bt.setAttribute('aria-pressed','false');
      bt.addEventListener('click',()=>{subOn.has(s)?subOn.delete(s):subOn.add(s);bt.classList.toggle('on',subOn.has(s));bt.setAttribute('aria-pressed',subOn.has(s));filter()});chips.appendChild(bt)});
    const tools=[...new Set(D.cases.flatMap(c=>c.tools))].sort((a,b)=>a.localeCompare(b));
    const sel=$('#dbg-tool');sel.innerHTML='<option value="">Any tool</option>'+tools.map(t=>'<option>'+esc(t)+'</option>').join('');
    sel.addEventListener('change',filter);$('#dbg-q').addEventListener('input',filter);
    const list=$('#dbg-list');D.cases.forEach(c=>list.appendChild(caseCard(c)));
    // index table
    const tb=$('#dbg-ix tbody');
    subs.forEach(s=>{const tr=el('tr');tr.appendChild(el('td',null,esc(SUB[s]||s)));
      tr.appendChild(el('td',null,D.cases.filter(c=>c.sub.includes(s)).map(c=>'<a href="#" data-dbg-go="'+c.id+'">'+esc(c.title)+'</a> <span class="mute">('+esc(c.ostep)+')</span>').join('<br>')));tb.appendChild(tr)});
    root.addEventListener('click',e=>{const a=e.target.closest('[data-dbg-go]');if(a){e.preventDefault();go(a.dataset.dbgGo)}});
    root.querySelectorAll('[data-dbg-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.dbgMode)));
    filter();tree([]);drill();
  }
  function filter(){
    const q=$('#dbg-q').value.trim().toLowerCase(), tool=$('#dbg-tool').value;let n=0;
    root.querySelectorAll('details.dbg-case').forEach(d=>{const c=byId[d.dataset.id];
      const hay=(c.title+' '+c.symptom+' '+c.rec.map(r=>r.t).join(' ')+' '+c.cause).toLowerCase();
      const ok=(!q||hay.includes(q))&&(!tool||c.tools.includes(tool))&&(!subOn.size||c.sub.some(s=>subOn.has(s)));
      d.hidden=!ok;if(ok)n++});
    $('#dbg-count').textContent='Showing '+n+' of '+D.cases.length+' cases'+(n?'':': clear the search or the filters');
  }
  function setMode(m){mode=m;
    root.querySelectorAll('[data-dbg-mode]').forEach(b=>{b.classList.toggle('on',b.dataset.dbgMode===m);b.setAttribute('aria-pressed',b.dataset.dbgMode===m)});
    $('#dbg-browse').hidden=m!=='browse';$('#dbg-treebox').hidden=m!=='tree';$('#dbg-drillbox').hidden=m!=='drill';
  }
  function go(id){
    setMode('browse');$('#dbg-q').value='';$('#dbg-tool').value='';subOn.clear();root.querySelectorAll('#dbg-subs button').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false')});filter();
    const d=document.getElementById('dbg-c-'+id);if(!d)return;d.open=true;if(!d.dataset.filled){fill(d,byId[id]);d.dataset.filled='1'}
    d.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  // decision tree: path is a list of answer indexes from the root
  function tree(path){
    const box=$('#dbg-tree');box.innerHTML='';
    let node=D.tree;const crumbs=[];
    path.forEach(i=>{const a=node.kids[i];crumbs.push(a.a);node=a});
    const cr=el('div','dbg-crumbs');
    const start=el('button',null,'Start');start.addEventListener('click',()=>tree([]));cr.appendChild(start);
    crumbs.forEach((t,k)=>{cr.appendChild(document.createTextNode(' > '));const b=el('button',null,esc(t));b.addEventListener('click',()=>tree(path.slice(0,k+1)));cr.appendChild(b)});
    box.appendChild(cr);
    if(node.kids&&!node.cases){
      box.appendChild(el('div','dbg-q',esc(node.q)));
      const ans=el('div','dbg-ans');
      node.kids.forEach((a,i)=>{const b=el('button',null,esc(a.a));b.addEventListener('click',()=>tree(path.concat(i)));ans.appendChild(b)});
      box.appendChild(ans);
    }
    if(node.cases){
      box.appendChild(el('div','dbg-q','Cases that match'+(node.note?': '+esc(node.note):'')));
      const lf=el('div','dbg-leaf');
      node.cases.forEach(id=>{const c=byId[id];lf.insertAdjacentHTML('beforeend','<a href="#" data-dbg-go="'+id+'">'+esc(c.title)+'</a>')});
      box.appendChild(lf);
    }
  }
  // drill
  let order=[],pos=0,right=0,done=0;
  function shuffle(a,seed){a=a.slice();let s=seed;for(let i=a.length-1;i>0;i--){s=(s*1103515245+12345)%2147483648;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
  function drill(){
    if(!order.length){order=shuffle(D.cases.map(c=>c.id),Date.now()%100000);pos=0}
    const c=byId[order[pos%order.length]];const box=$('#dbg-drill');box.innerHTML='';
    box.appendChild(el('div','dbg-meta','Case '+(pos%order.length+1)+' of '+order.length+(done?'; first checks right so far: '+right+' of '+done:'')));
    if(c.seen) box.appendChild(el('p','small',esc(c.seen)));
    box.appendChild(pre('dbg-sym',c.symptom));
    box.appendChild(el('div','dbg-q','What would you check first?'));
    const idx=shuffle(c.first.opts.map((_,i)=>i),pos*7919+13);
    const opts=el('div','opts');const verdict=el('div','dbg-verdict');const why=el('p','small');
    let answered=false;
    idx.forEach(i=>{const b=el('button');b.textContent=c.first.opts[i];b.addEventListener('click',()=>{
      if(answered)return;answered=true;done++;const ok=i===c.first.a;if(ok)right++;
      b.classList.add(ok?'ok':'no');opts.children[idx.indexOf(c.first.a)].classList.add('ok');
      verdict.textContent=ok?'Yes.':'Not first. The first check is the one marked green.';
      why.innerHTML=esc(c.first.why)+' <a href="#" data-dbg-go="'+c.id+'">Open the case: '+esc(c.title)+'</a>';
    });opts.appendChild(b)});
    box.appendChild(opts);box.appendChild(verdict);box.appendChild(why);
    const nx=el('button',null,'Next symptom');nx.addEventListener('click',()=>{pos++;drill()});box.appendChild(nx);
  }
  window.TAB_RENDER=window.TAB_RENDER||{};
  (window.TAB_RENDER['t-debug']=window.TAB_RENDER['t-debug']||[]).push(()=>{if(!built)build()});
})();

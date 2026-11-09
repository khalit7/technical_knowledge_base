// ---- Tool map (t-map): helpers, step-animation controller, atlas ----
window.TM=(function(){
  const D=window.TM_DATA, RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const visible=()=>{const t=$('t-map');return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,80)})};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const link=(t,u)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fd=d=>{if(!d)return'';const p=d.split('-');return p.length<2?p[0]:(p.length<3?MON[+p[1]-1]+' '+p[0]:(+p[2])+' '+MON[+p[1]-1]+' '+p[0])};
  const months=d=>{if(!d||d.length<7)return 999;const a=D.asof;return (+a.slice(0,4)-+d.slice(0,4))*12+(+a.slice(5,7)-+d.slice(5,7))};
  // step animation: o {card, ctl, n, draw(i), ms, label}; animates only while on screen in the visible tab
  function anim(o){ // 2026-11-09: the skill template RD.anim (21_js_rd_common.js): plays once at least half in view, pauses off screen, stops for good on any control or at its last step,
    // never moves by itself under reduced motion; o.auto false makes it a widget that never plays by itself. Redrawn when this tab opens.
    if(!o.fast)o.ms=Math.max(o.ms||0,3800); // time to read each step's caption
    const A=RD.anim(o);onRender(()=>A.redraw());return A}
  // jump to a tool card from anywhere in the tab
  function openTool(id){const sec=$('tm-s-atlas');ATL.select(id,true);sec.scrollIntoView({block:'start'})}
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#t-map a[data-tm-tool]');if(!a)return;e.preventDefault();openTool(a.dataset.tmTool)});
  const toolLink=id=>{const t=D.tools.find(x=>x.id===id);return t?'<a href="#" data-tm-tool="'+id+'">'+esc(t.name)+'</a>':esc(id)};

  // ---------------- atlas ----------------
  const LAYERS=[['pipeline','Pipeline libraries','whole pipelines','var(--c1)'],['extract','Extraction','HTML or PDF to text','var(--c6)'],['lid','Language ID','which language','var(--c3)'],
    ['quality','Quality scoring','classifiers, perplexity','var(--c4)'],['dedup','Deduplication','exact, MinHash, substring','var(--c2)'],['pii','PII','emails, IPs, names','var(--bad)'],
    ['framework','Compute engines','Spark, Ray, Daft','var(--c5)'],['storage','Storage and loading','formats and loaders','var(--mute)']];
  const LCOL=Object.fromEntries(LAYERS.map(l=>[l[0],l[3]]));
  const STATUS=['active','maintained','quiet','archived'];
  const ATL=(function(){
    const f={layer:null,status:null,q:''};let sel=null;
    const stack=$('tm-stack');
    stack.innerHTML=LAYERS.map(l=>'<button class="tm-stage" data-l="'+l[0]+'" style="--sc:'+l[3]+'" aria-pressed="false"><b>'+l[1]+'</b><span>'+l[2]+' ('+D.tools.filter(t=>t.layer===l[0]).length+')</span></button>').join('');
    stack.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;f.layer=f.layer===b.dataset.l?null:b.dataset.l;draw()});
    const fs=$('tm-fstat');fs.insertAdjacentHTML('beforeend','<button data-s="" class="on">all</button>'+STATUS.map(s=>'<button data-s="'+s+'">'+s+'</button>').join(''));
    fs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;f.status=b.dataset.s||null;fs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
    $('tm-q').addEventListener('input',e=>{f.q=e.target.value.toLowerCase();draw()});
    const match=t=>(!f.layer||t.layer===f.layer)&&(!f.status||t.status===f.status)&&(!f.q||(t.name+' '+t.owner+' '+t.one+' '+t.layer).toLowerCase().includes(f.q));
    function card(t){const m=t.m;return '<button class="tm-card'+(sel===t.id?' sel':'')+'" data-id="'+t.id+'" style="border-left-color:'+LCOL[t.layer]+'"><span class="nm">'+esc(t.name)+'</span> <span class="tm-st s-'+t.status+'">'+t.status+'</span>'+
      '<span class="ln">'+esc(t.one)+'</span><span class="vr">'+[m.ver?esc(m.ver)+' ('+fd(m.verDate)+')':'no release',m.commit?'last commit '+fd(m.commit):''].filter(Boolean).join('; ')+'</span></button>'}
    function det(t){
      if(!t){$('tm-det').innerHTML='<p class="small mute" style="margin:0">Select a card to see its details.</p>';return}
      const m=t.m,usedBy=D.corpora.filter(c=>c.built.includes(t.id));
      const rows=[['Owner',esc(t.owner)],['What it does',esc(t.what)],
        ['Latest release',m.ver?esc(m.ver)+', '+fd(m.verDate)+' ('+link('source',m.verSrc)+')'+(m.first?'; first PyPI release '+fd(m.first)+', '+m.nrel+' releases':''):'none published'],
        ['Last commit',m.commit?fd(m.commit)+' on the default branch'+(m.pushed?'; last push to any branch '+fd(m.pushed):''):(m.pushed?'last push '+fd(m.pushed):'n/a')],
        ['Repository',m.repo?link(m.repo,'https://github.com/'+m.repo)+(m.archived?' <b>(archived, read-only)</b>':'')+(m.repo&&t.repo&&m.repo.toLowerCase()!==t.repo.toLowerCase()?' (moved from '+esc(t.repo)+')':''):(t.hf?link(t.hf,'https://huggingface.co/'+t.hf):'none')],
        ['Licence',esc(m.lic)],
        ['Status','<span class="tm-st s-'+t.status+'">'+t.status+'</span> <span class="small mute">(from the dates above; read '+fd(D.asof)+')</span>'],
        ['Corpora built with it',usedBy.length?usedBy.map(c=>'<a href="#" data-tm-corp="'+c.id+'">'+esc(c.name)+'</a>').join(', '):'none on this map'],
        ['Use it when',esc(t.when)],['Avoid when',esc(t.avoid)],
        ['Verdict','<span class="tm-lbl j">judgement</span> '+esc(t.verdict)],
        ['Sources',t.src.map(s=>link(s[0],s[1])).join('; ')]];
      $('tm-det').innerHTML='<h3>'+esc(t.name)+'</h3><dl class="kv">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('')+'</dl>';
    }
    function draw(){
      stack.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.l===f.layer);b.setAttribute('aria-pressed',b.dataset.l===f.layer)});
      const L=D.tools.filter(match);
      $('tm-cards').innerHTML=L.map(card).join('');
      $('tm-count').textContent=L.length+' of '+D.tools.length+' tools'+(f.layer?' in "'+LAYERS.find(l=>l[0]===f.layer)[1]+'"':'');
      det(D.tools.find(t=>t.id===sel));
    }
    $('tm-cards').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=b.dataset.id;draw();$('tm-det').scrollIntoView({block:'nearest'})});
    // sortable table
    let sk='layer',sd=1;
    const COLS=[['name','Tool',t=>t.name],['layer','Stage',t=>LAYERS.findIndex(l=>l[0]===t.layer)],['status','Status',t=>STATUS.indexOf(t.status)],['ver','Latest release',t=>t.m.verDate||''],['commit','Last commit',t=>t.m.commit||''],['lic','Licence',t=>t.m.lic||'']];
    function table(){const L=D.tools.slice().sort((a,b)=>{const g=COLS.find(c=>c[0]===sk)[2],x=g(a),y=g(b);return (x>y?1:x<y?-1:0)*sd});
      $('tm-ttab').innerHTML='<thead><tr>'+COLS.map(c=>'<th data-k="'+c[0]+'" scope="col">'+c[1]+(sk===c[0]?(sd>0?' &#9650;':' &#9660;'):'')+'</th>').join('')+'</tr></thead><tbody>'+
        L.map(t=>'<tr data-k="'+t.id+'"><td>'+esc(t.name)+'</td><td>'+LAYERS.find(l=>l[0]===t.layer)[1]+'</td><td><span class="tm-st s-'+t.status+'">'+t.status+'</span></td><td class="n">'+(t.m.ver?esc(String(t.m.ver).slice(0,18))+' '+fd(t.m.verDate):'')+'</td><td class="n">'+fd(t.m.commit)+'</td><td>'+esc(t.m.lic)+'</td></tr>').join('')+'</tbody>'}
    $('tm-ttab').addEventListener('click',e=>{const th=e.target.closest('th');if(th){sd=sk===th.dataset.k?-sd:1;sk=th.dataset.k;table();return}
      const tr=e.target.closest('tr[data-k]');if(tr)openTool(tr.dataset.k)});
    table();
    // what the dates say (computed)
    const arch=D.tools.filter(t=>t.m.archived),fresh=D.tools.filter(t=>months(t.m.last)<=3),stale=D.tools.filter(t=>!t.m.archived&&months(t.m.last)>12);
    $('tm-dsay').innerHTML=fresh.length+' of '+D.tools.length+' tools had a release or commit in the last three months. '+arch.length+' are archived on GitHub ('+arch.map(t=>toolLink(t.id)).join(', ')+'), yet three of them (fastText, the suffix-array code, CCNet) still shape every pipeline through their models or methods. '+
      stale.length+' more show no change for over a year ('+stale.map(t=>toolLink(t.id)).join(', ')+'). The pipeline libraries split by hardware: datatrove for CPU, NeMo Curator for GPU; Ai2 itself moved from the Python Dolma toolkit to Rust tools (datamap-rs, Duplodocus) for Dolma 3.';
    document.querySelectorAll('#tm-asof,.tm-asof2').forEach(e=>e.textContent=fd(D.asof));
    draw();
    return {select(id,open){sel=id;const t=D.tools.find(x=>x.id===id);if(t){f.layer=null;f.status=null;f.q='';$('tm-q').value='';fs.querySelectorAll('button').forEach((x,i)=>x.classList.toggle('on',i===0))}draw()}};
  })();
  return {D,RM,esc,$,onRender,width,onResize,stat,link,fd,months,anim,toolLink,openTool,LAYERS,visible};
})();

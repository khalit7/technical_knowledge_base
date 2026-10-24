// ---- Model map (t-map): helpers, the step-animation controller, the filterable table and the detail panel ----
window.MM=(function(){
  const D=window.MM_DATA,$=id=>document.getElementById(id);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const link=(t,u)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  const byId={};D.rows.forEach(r=>byId[r.id]=r);
  const famCol=f=>'var(--mm-'+f+')';
  const dot=f=>'<span class="mm-dot" style="background:'+famCol(f)+'"></span>';
  const accTag=a=>'<span class="mm-acc a-'+a+'">'+esc(D.acc[a])+'</span>';
  const yr=d=>{const p=d.split('-');return +p[0]+(+p[1]-1)/12+(+p[2]-1)/365};
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-map']=window.TAB_RENDER['t-map']||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const fmtB=b=>b==null?'':(b>=1?(Math.round(b*10)/10)+'B':Math.round(b*1000)+'M');
  // step animation: o {card, ctl, n, draw(i), ms, label}. Runs only while its card is on screen in the visible tab;
  // plays once when first seen; never autoplays under prefers-reduced-motion.
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl),pid=o.ctl+'-';
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5&#215;</option><option value="1" selected>1&#215;</option><option value="2">2&#215;</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1500)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1500)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},get i(){return st.i}};
  }
  document.querySelectorAll('#t-map .mm-chk').forEach(e=>e.textContent=D.checked);
  // tab links and section links inside the tab
  $('t-map').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;
    if(a.dataset.tab){e.preventDefault();const tb=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(tb){tb.click();$('tabs').scrollIntoView({block:'start'})}return}
    const h=a.getAttribute('href')||'';if(h.startsWith('#mm-s-')){e.preventDefault();const s=$(h.slice(1));if(s)s.scrollIntoView({block:'start'})}});

  // ---- detail panel ----
  function detail(id,scroll){
    const r=byId[id];if(!r)return;const el=$('mm-det'),rows=[];
    rows.push(['What it is',esc(r.what)]);
    rows.push(['Organisation',esc(r.o)]);
    rows.push(['Family',dot(r.fam)+esc(D.fam[r.fam][0])+' <span class="mute">('+esc(D.fam[r.fam][1])+')</span>']);
    rows.push(['Objective',esc(r.obj)]);
    rows.push(['Size',esc(r.size)]);
    rows.push(['Licence',accTag(r.acc)+' '+esc(r.lic)]);
    rows.push(['Date',esc(r.d)+' <span class="mute">('+esc(r.dk)+')</span>'+(r.ev==='secondary'?' <span class="mm-sec">secondary</span>':'')]);
    rows.push(['Status',esc(D.st[r.st])]);
    if(r.hfm)rows.push(['Hugging Face',link(r.hf,'https://huggingface.co/'+r.hf)+': licence tag <code>'+esc(r.hfm.lic||'none')+'</code>, '+(r.hfm.gated?'gated ('+esc(r.hfm.gated)+')':'not gated')+', repo created '+esc(r.hfm.created)+(r.hfm.params?', '+(r.hfm.params/1e9).toFixed(2)+'B parameters in safetensors metadata':'')+' <span class="mute">(API, '+esc(D.checked)+')</span>']);
    if(r.axm)rows.push(['Paper',link(r.axm.t,'https://arxiv.org/abs/'+r.ax)+' <span class="mute">(arXiv v1 '+esc(r.axm.d)+')</span>']);
    if(r.kb)rows.push(['In this knowledge base','<a href="https://app.notion.com/p/'+esc(r.kb)+'" target="_blank" rel="noopener noreferrer">page on this model or its lab</a>']);
    if(r.note)rows.push(['Note',esc(r.note)]);
    rows.push(['Verdict','<span class="mm-j">judgement</span> '+esc(r.v)]);
    if(r.src.length)rows.push(['Sources',r.src.map(s=>link(s[0],s[1])).join('; ')]);
    el.innerHTML='<h3>'+dot(r.fam)+esc(r.n)+'</h3><dl class="kv">'+rows.map(x=>'<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>').join('')+'</dl>';
    el.hidden=false;
    document.querySelectorAll('#mm-tab tbody tr').forEach(tr=>tr.classList.toggle('hl',tr.dataset.id===id));
    if(scroll)el.scrollIntoView({block:'nearest'});
  }

  // ---- table ----
  const F={cat:'all',acc:'all',st:'all',q:''};let sortK='d',sortDir=-1;
  function chips(elId,key,opts){const el=$(elId);
    el.insertAdjacentHTML('beforeend',['all'].concat(Object.keys(opts)).map(k=>'<button data-v="'+k+'" class="'+(k==='all'?'on':'')+'">'+(k==='all'?'All':esc(opts[k]))+'</button>').join(''));
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));F[key]=b.dataset.v;table()})}
  chips('mm-f-cat','cat',D.cat);chips('mm-f-acc','acc',D.acc);chips('mm-f-st','st',D.st);
  $('mm-q').addEventListener('input',e=>{F.q=e.target.value.trim().toLowerCase();table()});
  const accOrder={osi:0,restr:1,nc:2,closed:3,paper:4},stOrder={current:0,superseded:1,retired:2};
  function key(r,k){if(k==='sb')return r.sb==null?-1:r.sb;if(k==='acc')return accOrder[r.acc];if(k==='st')return stOrder[r.st];if(k==='fam')return D.fam[r.fam][0];if(k==='c')return D.cat[r.c];return r[k]}
  function rows(){return D.rows.filter(r=>(F.cat==='all'||r.c===F.cat)&&(F.acc==='all'||r.acc===F.acc)&&(F.st==='all'||r.st===F.st)&&
    (!F.q||[r.n,r.o,D.fam[r.fam][0],r.lic,r.obj,r.what].join(' ').toLowerCase().indexOf(F.q)>=0))}
  function table(){
    const rs=rows().sort((a,b)=>{const x=key(a,sortK),y=key(b,sortK);return (x<y?-1:x>y?1:0)*sortDir});
    $('mm-shown').textContent=rs.length+' of '+D.rows.length+' rows shown';
    $('mm-tab').querySelector('tbody').innerHTML=rs.map(r=>'<tr data-id="'+r.id+'"><td class="mh"><b>'+esc(r.n)+'</b><span class="sub2">'+esc(r.o)+'</span></td>'+
      '<td>'+esc(D.cat[r.c])+'</td><td>'+dot(r.fam)+esc(D.fam[r.fam][0])+'</td><td>'+esc(r.size)+'</td><td>'+accTag(r.acc)+'<span class="sub2">'+esc(r.lic)+'</span></td>'+
      '<td class="n">'+esc(r.d)+(r.ev==='secondary'?' <span class="mm-sec">sec.</span>':'')+'<span class="sub2">'+esc(r.dk)+'</span></td><td class="'+(r.st==='retired'?'s-retired':'')+'">'+esc(r.st)+'</td><td>'+esc(r.v)+'</td></tr>').join('')||'<tr><td colspan="8" class="mute">No row matches.</td></tr>';
  }
  $('mm-tab').querySelector('thead').addEventListener('click',e=>{const th=e.target.closest('th[data-k]');if(!th)return;const k=th.dataset.k;
    if(k===sortK)sortDir=-sortDir;else{sortK=k;sortDir=(k==='d'||k==='sb')?-1:1}table()});
  $('mm-tab').querySelector('tbody').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(tr)detail(tr.dataset.id,true)});
  table();
  const cnt={};D.rows.forEach(r=>cnt[r.acc]=(cnt[r.acc]||0)+1);
  $('mm-count').textContent=D.rows.length+' rows: '+cnt.osi+' with permissive open weights, '+cnt.restr+' open with conditions, '+cnt.nc+' non-commercial, '+cnt.closed+' closed, '+cnt.paper+' paper-only. Checked '+D.checked+'.';
  return {D,$,RM,esc,link,byId,famCol,dot,accTag,yr,onRender,width,fmtB,anim,detail,
    showRow(id){F.cat='all';F.acc='all';F.st='all';F.q='';$('mm-q').value='';['mm-f-cat','mm-f-acc','mm-f-st'].forEach(x=>$(x).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v==='all')));table();detail(id,true)}};
})();

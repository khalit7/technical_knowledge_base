// ---- Benchmark atlas (t-atlas), part b: grid, filters, detail panel, compare, corrections ----
(function(){
  const A=window.BENCH_ATLAS;if(!A)return;
  const R=A.rows,S=A.sources,EN=A.enums,byId={};R.forEach(r=>byId[r.id]=r);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const STO=['active','saturating','saturated','retired'];
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(d){if(!d)return '';const m=String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);if(!m)return esc(d);return (m[3]?(+m[3])+' ':'')+(m[2]?MON[+m[2]-1]+' ':'')+m[1]}
  function sa(k,label){const s=S[k];if(!s)return esc(k);const t=label||s.t;return '<a href="'+esc(s.u)+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>'+(s.d?' <span class="src">('+(s.r?'read '+fd(s.r):fd(s.d))+')</span>':'')}
  function fv(e){if(!e)return '';const v=typeof e.v==='number'?(Math.abs(e.v)>=1000?e.v.toLocaleString('en-US'):String(e.v)):String(e.v);return e.u==='%'?v+'%':(/^%/.test(e.u)?v+e.u:v+' '+e.u)}
  const stp=st=>'<span class="pill st-'+st+'">'+esc(EN.st[st][0])+'</span>';
  const AT=window.AT={sel:[],vis:new Set(R.map(r=>r.id)),cur:null,listeners:[]};
  AT.byId=byId;AT.fd=fd;AT.sa=sa;AT.fv=fv;AT.esc=esc;
  // ---- legend ----
  $('at-nrows').textContent=R.length;
  $('at-leg').innerHTML=STO.map(st=>'<span title="'+esc(EN.st[st][1])+'"><i class="sw" style="background:var(--s-'+st+')"></i><b>'+EN.st[st][0]+'</b>: '+esc(EN.st[st][1])+'</span>').join('')+'<span><span class="pill cont" style="margin:0">contaminated</span> leakage documented, with the evidence in the row</span>';
  // ---- filters ----
  const F={fam:new Set(),st:new Set(),cd:new Set(),gr:new Set(),own:'',q:'',fix:false};
  let sortK='fam',sortD=1;
  const chipRow=(lab,key,obj)=>'<div class="atctl"><span class="lb">'+lab+'</span><div class="chips" data-k="'+key+'">'+Object.keys(obj).map(k=>'<button data-v="'+k+'" aria-pressed="false">'+esc(Array.isArray(obj[k])?obj[k][0]:obj[k])+'</button>').join('')+'</div></div>';
  $('at-ctl').innerHTML='<div class="atctl"><span class="lb">Search</span><input type="search" id="at-q" placeholder="name, task, lab..." aria-label="Search benchmarks"><label class="chk"><input type="checkbox" id="at-fix"> with corrections</label><select id="at-own" aria-label="Owning page"><option value="">Any owner</option>'+Object.keys(EN.own).map(k=>'<option value="'+k+'">'+esc(EN.own[k][0])+'</option>').join('')+'</select><button id="at-reset">Reset</button></div>'
    +chipRow('Status','st',EN.st)+chipRow('Family','fam',EN.fam)+chipRow('Defence','cd',EN.cd)+chipRow('Grading','gr',EN.gr);
  $('at-ctl').querySelectorAll('.chips').forEach(c=>c.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const set=F[c.dataset.k];const v=b.dataset.v;
    if(set.has(v)){set.delete(v);b.classList.remove('on');b.setAttribute('aria-pressed','false')}else{set.add(v);b.classList.add('on');b.setAttribute('aria-pressed','true')}draw()}));
  $('at-q').addEventListener('input',e=>{F.q=e.target.value.trim().toLowerCase();draw()});
  $('at-fix').addEventListener('change',e=>{F.fix=e.target.checked;draw()});
  $('at-own').addEventListener('change',e=>{F.own=e.target.value;draw()});
  $('at-reset').addEventListener('click',()=>{['fam','st','cd','gr'].forEach(k=>F[k].clear());F.q='';F.own='';F.fix=false;$('at-q').value='';$('at-own').value='';$('at-fix').checked=false;
    $('at-ctl').querySelectorAll('.chips button').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false')});draw()});
  function pass(r){
    if(F.fam.size&&!F.fam.has(r.fam))return false;if(F.st.size&&!F.st.has(r.st))return false;
    if(F.cd.size&&!r.cd.some(x=>F.cd.has(x)))return false;if(F.gr.size&&!r.gr.some(x=>F.gr.has(x)))return false;
    if(F.own&&r.own!==F.own)return false;if(F.fix&&!(r.corr&&r.corr.length))return false;
    if(F.q){const h=[r.n,r.by,r.me,r.fmt,r.met,r.it.t,(r.mem||[]).map(m=>m.n).join(' '),EN.fam[r.fam]].join(' ').toLowerCase();if(h.indexOf(F.q)<0)return false}
    return true}
  // ---- grid ----
  const famO=Object.keys(EN.fam);
  const COLS=[
    {k:'st',t:'Status',sv:r=>STO.indexOf(r.st),f:r=>stp(r.st)+(r.cont?'<span class="pill cont">contaminated</span>':'')+(r.corr&&r.corr.length?'<span class="pill fix" title="The old page said something different">corrected</span>':'')},
    {k:'ev',t:'Reading behind the status',w:1,sv:r=>r.ev[0]&&r.ev[0].u==='%'?-r.ev[0].v:1e9,f:r=>{const e=r.ev[0];if(!e)return '<span class="mute">see detail</span>';return '<b>'+esc(fv(e))+'</b> '+esc(e.m)+' <span class="mute">('+fd(e.d)+')</span>'+(e.k==='lab'?'<span class="kd lab">lab</span>':'')}},
    {k:'yr',t:'Year',sv:r=>r.yr,f:r=>String(r.yr),num:1},
    {k:'fam',t:'Family',sv:r=>famO.indexOf(r.fam)*10000+r.yr,f:r=>esc(EN.fam[r.fam])},
    {k:'me',t:'Measures',w:1,sv:r=>r.me,f:r=>esc(r.me)},
    {k:'fmt',t:'Format and metric',w:1,sv:r=>r.met,f:r=>esc(r.fmt)+'; '+esc(r.met)},
    {k:'it',t:'Size',sv:r=>r.it.n==null?1e12:-r.it.n,f:r=>esc(r.it.t)},
    {k:'gr',t:'Graded by',sv:r=>r.gr.join(),f:r=>r.gr.map(g=>esc(EN.gr[g][0])).join(', ')},
    {k:'cd',t:'Contamination defence',sv:r=>r.cd.join(),f:r=>r.cd.map(g=>esc(EN.cd[g][0])).join(', ')},
    {k:'own',t:'Owner',sv:r=>r.own,f:r=>esc(r.own==='planned'?'planned':EN.own[r.own][0].replace(' benchmarks',''))}];
  function sortRows(rs){const c=sortK==='n'?{sv:r=>r.n.toLowerCase()}:COLS.find(c=>c.k===sortK);
    return rs.slice().sort((a,b)=>{const x=c.sv(a),y=c.sv(b);return (x<y?-1:x>y?1:a.yr-b.yr)*sortD})}
  function draw(){
    const rs=sortRows(R.filter(pass));AT.vis=new Set(rs.map(r=>r.id));
    $('at-cnt').textContent=rs.length+' of '+R.length+' rows shown'+(AT.sel.length?'; '+AT.sel.length+' ticked for comparison':'');
    const ar=k=>sortK===k?' <span class="ar">'+(sortD>0?'&#9650;':'&#9660;')+'</span>':'';
    let h='<table class="at"><thead><tr><th class="mh"><button data-s="n">Benchmark'+ar('n')+'</button></th>'+COLS.map(c=>'<th><button data-s="'+c.k+'">'+c.t+ar(c.k)+'</button></th>').join('')+'</tr></thead><tbody>';
    rs.forEach(r=>{h+='<tr data-id="'+r.id+'"'+(AT.cur===r.id?' class="sel"':'')+'><th class="mh"><div class="rw"><input type="checkbox" aria-label="Compare '+esc(r.n)+'"'+(AT.sel.indexOf(r.id)>=0?' checked':'')+'><button class="nm">'+esc(r.n)+'<small>'+esc(EN.fam[r.fam])+', '+r.yr+'</small></button></div></th>'
      +COLS.map(c=>'<td class="'+(c.w?'w':'')+(c.num?' num':'')+'"><div class="cv">'+c.f(r)+'</div></td>').join('')+'</tr>'});
    h+='</tbody></table>';$('at-wrap').innerHTML=h;
    if(!rs.length)$('at-wrap').innerHTML='<p class="mute" style="padding:8px">No benchmark matches these filters.</p>';
    AT.listeners.forEach(f=>{try{f()}catch(e){}});
  }
  $('at-wrap').addEventListener('click',e=>{const sb=e.target.closest('thead button');if(sb){const k=sb.dataset.s;if(sortK===k)sortD=-sortD;else{sortK=k;sortD=1}draw();return}
    const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
    if(e.target.matches('input[type=checkbox]')){toggleSel(id,e.target.checked);return}
    show(id,false)});
  function toggleSel(id,on){const i=AT.sel.indexOf(id);if(on&&i<0){AT.sel.push(id);if(AT.sel.length>3)AT.sel.shift()}else if(!on&&i>=0)AT.sel.splice(i,1);draw();cmp()}
  // ---- detail ----
  function evCard(e){
    return '<div class="ev'+(e.k==='lab'?' lab':'')+'"><span class="big">'+esc(fv(e))+'</span> '+esc(e.m)+'<span class="kd '+(e.k==='lab'?'lab':'ind')+'">'+(e.k==='lab'?'lab':'independent')+'</span>'
      +'<div>'+esc(e.set)+'</div>'
      +'<div class="src">'+(e.d?esc(e.dk||'dated')+' '+fd(e.d)+'; ':'')+(e.run?esc(e.run)+'; ':'')+'source: '+sa(e.s)+(e.via&&e.via!=='grid'&&/^http/.test(e.via)?' (original: <a href="'+esc(e.via)+'" target="_blank" rel="noopener noreferrer">'+esc(e.via.replace(/^https?:\/\//,'').slice(0,48))+'</a>)':'')+(e.se!=null?'; standard error '+e.se+' points':'')+'</div>'
      +(e.note?'<div class="src">'+esc(e.note)+'</div>':'')+(e.q?'<div class="src">Quote'+(e.qc?' (checked against the '+esc(e.qc)+')':'')+': "'+esc(e.q)+'"</div>':'')+'</div>'}
  function show(id,scroll){
    const r=byId[id];if(!r)return;AT.cur=id;
    document.querySelectorAll('#at-wrap tr.sel').forEach(t=>t.classList.remove('sel'));const tr=document.querySelector('#at-wrap tr[data-id="'+id+'"]');if(tr)tr.classList.add('sel');
    const own=EN.own[r.own];
    let h='<h3>'+esc(r.n)+'</h3><div>'+stp(r.st)+(r.cont?'<span class="pill cont">contaminated</span>':'')+' <span class="mute small">'+esc(EN.st[r.st][1])+'</span></div>'
      +'<dl class="kv"><dt>First paper or page</dt><dd>'+(r.paper?sa(r.paper):'<span class="mute">No paper; see the maintainer\'s page in the items source.</span>')+'</dd>'
      +(r.mem?'<dt>Members</dt><dd>'+r.mem.map(m=>esc(m.n)+': '+sa(m.s,'paper')).join('; ')+'</dd>':'')
      +'<dt>Made by</dt><dd>'+esc(r.by)+', '+r.yr+'</dd><dt>Measures</dt><dd>'+esc(r.me)+'</dd><dt>Format</dt><dd>'+esc(r.fmt)+'</dd><dt>Metric</dt><dd>'+esc(r.met)+'</dd>'
      +'<dt>Size</dt><dd>'+esc(r.it.t)+' <span class="src">('+sa(r.it.s,'source')+(r.it.q?'; quote "'+esc(r.it.q)+'"'+(r.it.qc?' checked against the '+esc(r.it.qc):' not yet checked'):'')+')</span></dd>'
      +'<dt>Graded by</dt><dd>'+r.gr.map(g=>'<b>'+esc(EN.gr[g][0])+'</b>: '+esc(EN.gr[g][1])).join('<br>')+'</dd>'
      +'<dt>Defence</dt><dd>'+r.cd.map(g=>'<b>'+esc(EN.cd[g][0])+'</b>: '+esc(EN.cd[g][1])).join('<br>')+'</dd>'
      +'<dt>Owner</dt><dd>'+(own[1]?'<a href="'+own[1]+'" target="_blank" rel="noopener noreferrer">'+esc(own[0])+'</a>':esc(own[0]))+'</dd></dl>'
      +'<h4 style="margin:8px 0 2px">Why "'+esc(EN.st[r.st][0].toLowerCase())+'"</h4><p style="margin:2px 0">'+esc(r.why||'')+'</p>'
      +(r.ev.length?r.ev.map(evCard).join(''):'<p class="mute small">No dated frontier reading recorded; the status rests on the reasoning above.</p>')
      +(r.cont?'<p><span class="pill cont">contaminated</span> '+esc(r.cont.t)+' <span class="src">'+sa(r.cont.s)+'</span></p>':'')
      +(r.iss.length?'<h4 style="margin:8px 0 2px">Known issues</h4><ul class="tight">'+r.iss.map(x=>'<li>'+esc(x.t)+' <span class="src">'+sa(x.s)+'</span></li>').join('')+'</ul>':'')
      +(r.olds?'<h4 style="margin:8px 0 2px">The old page said</h4><p class="small" style="margin:2px 0">"'+esc(r.olds)+'" <span class="src">(status cell of the row "'+esc(r.old)+'")</span></p>':'<p class="small mute">New row: not in the old page\'s table.</p>')
      +(r.corr.length?r.corr.map(c=>'<div class="corr"><div class="cl"><b>Old:</b> '+esc(c.c)+'</div><div class="fx"><b>Now:</b> '+esc(c.f)+' <span class="src">'+sa(c.s)+'</span></div></div>').join(''):'')
      +(r.rel.length?'<p class="small">Not the same scale as: '+r.rel.map(x=>'<button class="jump" data-id="'+x+'" style="font-size:12px;padding:0 7px;margin:1px">'+esc(byId[x].n)+'</button>').join('')+'</p>':'');
    $('at-det').innerHTML=h;
    if(scroll){const w=$('at-wrap');if(tr){w.scrollTop=Math.max(0,tr.offsetTop-60)}$('at-det').scrollIntoView({block:'nearest'})}
    AT.listeners.forEach(f=>{try{f()}catch(e){}});
  }
  $('at-det').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)show(b.dataset.id,true)});
  AT.show=(id,scroll)=>{if(!AT.vis.has(id)){document.getElementById('at-reset').click()}show(id,scroll)};
  // ---- compare ----
  const PRE=[['Three OSWorld versions',['osworld','osworld_verified','osworld_2']],['Terminal-Bench versions',['tb2','tb4','tb_science']],['SWE-bench lineage',['swebench_verified','swebench_pro','real_swe']],['Three answers to contamination',['swe_rebench','schrodingerrepo','real_swe']],['Knowledge ladder',['mmlu','gpqa','hle']],['FrontierMath tiers',['frontiermath','frontiermath_t4','putnambench']]];
  $('at-cmp-pre').innerHTML=PRE.map((p,i)=>'<button data-i="'+i+'">'+esc(p[0])+'</button>').join('');
  $('at-cmp-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;AT.sel=PRE[+b.dataset.i][1].filter(x=>byId[x]);
    $('at-cmp-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();cmp()});
  function cmp(){
    const rs=AT.sel.map(x=>byId[x]).filter(Boolean);
    if(rs.length<2){$('at-cmp').innerHTML='<p class="mute small">Tick at least two rows (or pick a preset) to compare.</p>';return}
    const L=[['Year',r=>String(r.yr)],['Family',r=>esc(EN.fam[r.fam])],['Made by',r=>esc(r.by)],['Measures',r=>esc(r.me)],['Format',r=>esc(r.fmt)],['Metric',r=>esc(r.met)],['Size',r=>esc(r.it.t)],
      ['Graded by',r=>r.gr.map(g=>esc(EN.gr[g][0])).join(', ')],['Defence',r=>r.cd.map(g=>esc(EN.cd[g][0])).join(', ')],['Status',r=>stp(r.st)+(r.cont?' <span class="pill cont">contaminated</span>':'')],
      ['Reading',r=>r.ev[0]?'<b>'+esc(fv(r.ev[0]))+'</b> '+esc(r.ev[0].m)+'<small>'+esc(r.ev[0].set)+'; '+fd(r.ev[0].d)+'</small>':'<span class="mute">none recorded</span>'],
      ['Why',r=>esc(r.why||'')],['Known issues',r=>r.iss.length?r.iss.map(x=>esc(x.t)).join('<br>'):'<span class="mute">none recorded</span>'],['Owner',r=>esc(EN.own[r.own][0])]];
    let h='<table class="cmp"><thead><tr><th class="r"></th>'+rs.map(r=>'<th><button class="jump nm" data-id="'+r.id+'" style="font-weight:600">'+esc(r.n)+'</button></th>').join('')+'</tr></thead><tbody>';
    L.forEach(l=>{const vals=rs.map(l[1]);const dif=vals.some(v=>v!==vals[0]);h+='<tr'+(dif?' class="dif"':'')+'><th class="r">'+l[0]+'</th>'+vals.map(v=>'<td>'+v+'</td>').join('')+'</tr>'});
    h+='</tbody></table>';
    if(rs.some(r=>rs.some(o=>o!==r&&r.rel.indexOf(o.id)>=0)))h+='<p class="small"><b>Do not put these readings on one axis:</b> the rows are different versions or different scales of related benchmarks, so their scores are not comparable even where the units match.</p>';
    $('at-cmp').innerHTML=h}
  $('at-cmp').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)show(b.dataset.id,true)});
  // ---- corrections ----
  const cs=[];R.forEach(r=>(r.corr||[]).forEach(c=>cs.push([r,c])));
  $('at-corr-s').textContent=cs.length+' corrections to the old page, each with its source';
  $('at-corr-b').innerHTML=cs.map(([r,c])=>'<div class="corr"><div><b>'+esc(r.n)+'</b><button class="jump" data-id="'+r.id+'">open row</button></div><div class="cl"><b>Old:</b> '+esc(c.c)+'</div><div class="fx"><b>Now:</b> '+esc(c.f)+' <span class="src">'+sa(c.s)+'</span></div></div>').join('');
  $('at-corr-b').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)AT.show(b.dataset.id,true)});
  // ---- start ----
  AT.sel=PRE[0][1].slice();$('at-cmp-pre').querySelector('button').classList.add('on');
  draw();cmp();show('osworld_2',false);
})();

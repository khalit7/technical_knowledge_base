// ---- Judge atlas (t-judges), part b: grid, filters, detail panel, side by side, corrections ----
(function(){
  const A=window.JUDGE_ATLAS;if(!A)return;
  const $=id=>document.getElementById(id);
  const R=A.rows,RD=A.readings,S=A.sources,M=A.metrics,EN=A.enums,byId={},rdId={};
  R.forEach(r=>byId[r.id]=r);RD.forEach(x=>rdId[x.id]=x);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(d){if(!d)return '';const m=String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);if(!m)return esc(d);return (m[3]?(+m[3])+' ':'')+(m[2]?MON[+m[2]-1]+' ':'')+m[1]}
  function sa(k,label){const s=S[k];if(!s)return esc(k);if(/^#t-/.test(s.u))return '<a href="#" data-tab="'+esc(s.u.slice(1))+'">'+esc(label&&label!=='source'?label:'Judge bias lab')+'</a>';const u=s.u.replace(/^n:/,'https://app.notion.com/p/');return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(label||s.t)+'</a>'+(s.d&&!label?' <span class="src">('+fd(s.d)+')</span>':'')}
  function pl(p){const u=p[1].replace(/^n:/,'https://app.notion.com/p/');return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(p[0])+'</a>'}
  function fv(x){const m=M[x.m];if(m.u==='%')return (+x.v.toFixed(2))+'%';if(m.u==='frac')return x.v.toFixed(3);return (m.u==='kappa'||m.u==='tau'||m.u==='rho'||m.u==='r')?x.v.toFixed(3):String(x.v)}
  const kd=k=>'<span class="kd '+k+'" title="'+esc(EN.k[k][1])+'">'+EN.k[k][0]+'</span>';
  const stp=st=>'<span class="pill st-'+st+'" title="'+esc(EN.st[st][1])+'">'+esc(EN.st[st][0])+'</span>';
  const JA=window.JA={sel:[],cur:null,listeners:[],esc,fd,fv,kd,sa,byId,rdId};
  // readings that belong to a row: its own (row), or for a test or study, everything run on it
  function readsOf(r){return RD.filter(x=>x.row===r.id||((r.kind==='meta')&&x.on===r.id)||(r.id==='reliab'&&x.s==='reliab'))}
  JA.readsOf=readsOf;
  $('ja-nrows').textContent=R.length;$('ja-nread').textContent=RD.length;
  $('ja-leg').innerHTML=Object.keys(EN.st).map(st=>'<span>'+stp(st)+' '+esc(EN.st[st][1])+'</span>').join('');
  // ---- filters ----
  const F={kind:new Set(),mode:new Set(),st:new Set(),ow:new Set(),q:'',ind:false};
  let sortK='kind',sortD=1;
  const chipRow=(lab,key,obj)=>'<div class="jactl"><span class="lb">'+lab+'</span><div class="chips" data-k="'+key+'">'+Object.keys(obj).map(k=>'<button data-v="'+esc(k)+'" aria-pressed="false">'+esc(Array.isArray(obj[k])?obj[k][0]:obj[k])+'</button>').join('')+'</div></div>';
  $('ja-ctl').innerHTML='<div class="jactl"><span class="lb">Search</span><input type="search" id="ja-q" placeholder="judge, test, lab, metric..." aria-label="Search judges and tests"><label class="chk"><input type="checkbox" id="ja-ind"> with an independent reading</label><button id="ja-reset">Reset</button></div>'
    +chipRow('Kind','kind',EN.kind)+chipRow('Mode','mode',EN.mode)+chipRow('Status','st',EN.st)+chipRow('Weights','ow',EN.ow);
  $('ja-ctl').querySelectorAll('.chips').forEach(c=>c.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const set=F[c.dataset.k];const v=b.dataset.v;
    if(set.has(v)){set.delete(v);b.classList.remove('on');b.setAttribute('aria-pressed','false')}else{set.add(v);b.classList.add('on');b.setAttribute('aria-pressed','true')}draw()}));
  $('ja-q').addEventListener('input',e=>{F.q=e.target.value.trim().toLowerCase();draw()});
  $('ja-ind').addEventListener('change',e=>{F.ind=e.target.checked;draw()});
  $('ja-reset').addEventListener('click',()=>{['kind','mode','st','ow'].forEach(k=>F[k].clear());F.q='';F.ind=false;$('ja-q').value='';$('ja-ind').checked=false;
    $('ja-ctl').querySelectorAll('.chips button').forEach(b=>{b.classList.remove('on');b.setAttribute('aria-pressed','false')});draw()});
  function pass(r){
    if(F.kind.size&&!F.kind.has(r.kind))return false;if(F.st.size&&!F.st.has(r.st))return false;if(F.ow.size&&!F.ow.has(r.ow))return false;
    if(F.mode.size&&!r.modes.some(m=>F.mode.has(m)))return false;
    if(F.ind&&!readsOf(r).some(x=>x.k==='ind'))return false;
    if(F.q){const rs=readsOf(r);const h=[r.n,r.sub,r.what,r.why,EN.kind[r.kind][0],r.modes.join(' '),S[r.s].t,rs.map(x=>x.j+' '+M[x.m].n).join(' ')].join(' ').toLowerCase();if(h.indexOf(F.q)<0)return false}
    return true}
  // ---- grid ----
  const kO=Object.keys(EN.kind),stO=['active','new','saturated','legacy','pointer'],owO=['yes','mixed','no','n/a'],mO=Object.keys(M);
  function hlCell(r){
    const a=r.hl&&rdId[r.hl],b=r.hl2&&rdId[r.hl2];
    if(!a&&!b)return '<span class="mute">'+(r.kind==='pointer'?'see the linked pages':'no shared metric; see detail')+'</span>';
    const one=x=>'<b>'+esc(fv(x))+'</b> '+kd(x.k)+'<br><span class="met">'+esc(M[x.m].n)+'; '+esc(x.j)+', '+fd(x.d)+'</span>';
    return (a?one(a):'')+(b?(a?'<br>':'')+one(b):'')}
  function hlSort(r){const x=(r.hl&&rdId[r.hl])||(r.hl2&&rdId[r.hl2]);if(!x)return [1e9,0];return [mO.indexOf(x.m),M[x.m].hi?-x.v:x.v]}
  const costTxt=r=>r.cost&&r.cost.length?r.cost.map(c=>esc(c[0])).join('; '):'<span class="mute">not published</span>';
  const COLS=[
    {k:'kind',t:'Kind',sv:r=>kO.indexOf(r.kind)*100+stO.indexOf(r.st),f:r=>esc(EN.kind[r.kind][0])},
    {k:'mode',t:'Mode',sv:r=>r.modes.join(),f:r=>r.modes.map(m=>esc(EN.mode[m])).join(', ')},
    {k:'hl',t:'Headline reading (metric named)',w:1,sv:hlSort,f:hlCell},
    {k:'ow',t:'Weights',sv:r=>owO.indexOf(r.ow),f:r=>esc(EN.ow[r.ow])},
    {k:'cost',t:'Cost, if published',w:1,sv:r=>r.cost&&r.cost.length?0:1,f:costTxt},
    {k:'d',t:'Date',sv:r=>r.d||'9999',f:r=>r.d?fd(r.d):'<span class="mute">n/a</span>'},
    {k:'s',t:'Source',w:1,sv:r=>S[r.s].t,f:r=>sa(r.s,S[r.s].t.split(':')[0].split(' (')[0])},
    {k:'st',t:'Status',sv:r=>stO.indexOf(r.st),f:r=>stp(r.st)+(r.corr.length?'<span class="pill fix" title="The old page said something different">corrected</span>':'')}];
  function cmpv(x,y){if(Array.isArray(x)){for(let i=0;i<x.length;i++){if(x[i]<y[i])return -1;if(x[i]>y[i])return 1}return 0}return x<y?-1:x>y?1:0}
  function sortRows(rs){const c=sortK==='n'?{sv:r=>r.n.toLowerCase()}:COLS.find(c=>c.k===sortK);return rs.slice().sort((a,b)=>cmpv(c.sv(a),c.sv(b))*sortD||a.n.localeCompare(b.n))}
  function draw(){
    const rs=sortRows(R.filter(pass));JA.vis=new Set(rs.map(r=>r.id));
    $('ja-cnt').textContent=rs.length+' of '+R.length+' rows shown'+(JA.sel.length?'; '+JA.sel.length+' ticked for comparison':'');
    const ar=k=>sortK===k?' <span class="ar">'+(sortD>0?'&#9650;':'&#9660;')+'</span>':'';
    let h='<table class="ja"><thead><tr><th class="mh"><button data-s="n">Judge or test'+ar('n')+'</button></th>'+COLS.map(c=>'<th><button data-s="'+c.k+'">'+c.t+ar(c.k)+'</button></th>').join('')+'</tr></thead><tbody>';
    let lastG=null;
    rs.forEach(r=>{
      if(sortK==='kind'){const g=r.kind==='meta'||r.kind==='study'?'Tests that rate judges':'Judges and judging methods';if(g!==lastG){h+='<tr class="grp"><td colspan="'+(COLS.length+1)+'">'+g+'</td></tr>';lastG=g}}
      h+='<tr data-id="'+r.id+'"'+(JA.cur===r.id?' class="sel"':'')+'><th class="mh"><div class="rw"><input type="checkbox" aria-label="Compare '+esc(r.n)+'"'+(JA.sel.indexOf(r.id)>=0?' checked':'')+'><button class="nm">'+esc(r.n)+'<small>'+esc(r.sub)+'</small></button></div></th>'
      +COLS.map(c=>'<td class="'+(c.w?'w':'')+'"><div class="cv">'+c.f(r)+'</div></td>').join('')+'</tr>'});
    h+='</tbody></table>';$('ja-wrap').innerHTML=rs.length?h:'<p class="mute" style="padding:8px">No row matches these filters.</p>';
    JA.listeners.forEach(f=>{try{f()}catch(e){}});
  }
  $('ja-wrap').addEventListener('click',e=>{const sb=e.target.closest('thead button');if(sb){const k=sb.dataset.s;if(sortK===k)sortD=-sortD;else{sortK=k;sortD=1}draw();return}
    if(e.target.closest('a'))return;
    const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
    if(e.target.matches('input[type=checkbox]')){toggleSel(id,e.target.checked);return}
    show(id,false)});
  function toggleSel(id,on){const i=JA.sel.indexOf(id);if(on&&i<0){JA.sel.push(id);if(JA.sel.length>3)JA.sel.shift()}else if(!on&&i>=0)JA.sel.splice(i,1);
    $('ja-cmp-pre').querySelectorAll('button').forEach(x=>x.classList.remove('on'));draw();cmp()}
  // ---- detail ----
  function evCard(x,lab){
    return '<div class="ev '+x.k+'">'+(lab?'<div class="src">'+lab+'</div>':'')+'<span class="big">'+esc(fv(x))+'</span> '+esc(M[x.m].n)+kd(x.k)
      +'<div>'+esc(x.j)+'; '+esc(x.set)+'</div>'
      +'<div class="src">'+fd(x.d)+(x.run?'; run '+esc(x.run):'')+'; source: '+sa(x.s)+'</div>'+(x.note?'<div class="src">'+esc(x.note)+'</div>':'')+'</div>'}
  const OPEN={};
  function groups(r){
    const rs=readsOf(r),by={};rs.forEach(x=>{(by[x.m]=by[x.m]||[]).push(x)});
    return Object.keys(by).sort((a,b)=>mO.indexOf(a)-mO.indexOf(b)).map(m=>{
      const all=RD.filter(x=>x.m===m),mine=new Set(by[m].map(x=>x.id));
      // for a judge, show its readings ranked among everything on that metric; for a test, its own list
      const list=(r.kind==='meta'||r.kind==='study')?by[m]:all;
      const srt=list.slice().sort((a,b)=>M[m].hi?b.v-a.v:a.v-b.v);
      const key=r.id+'|'+m,lim=OPEN[key]?srt.length:8;
      let shown=srt.slice(0,lim);if(!(r.kind==='meta'||r.kind==='study'))srt.forEach(x=>{if(mine.has(x.id)&&shown.indexOf(x)<0)shown.push(x)});
      shown.sort((a,b)=>M[m].hi?b.v-a.v:a.v-b.v);
      const mm=M[m];
      return '<div class="mg"><div class="mh2">'+esc(mm.n)+' <span>('+(mm.ch!=null?'chance '+(mm.u==='%'?mm.ch+'%':mm.ch)+'; ':'')+(mm.hi?'higher is better':'lower is better')+'; '+srt.length+' reading'+(srt.length>1?'s':'')+')</span></div><div class="src">'+esc(mm.t)+'</div><ol>'
        +shown.map(x=>'<li class="'+(mine.has(x.id)&&!(r.kind==='meta'||r.kind==='study')?'me':'')+'">'+esc(fv(x))+' '+esc(x.j)+kd(x.k)+' <span class="src">'+fd(x.d)+', '+sa(x.s,'source')+(x.note?'; '+esc(x.note):'')+'</span></li>').join('')+'</ol>'
        +(srt.length>8?'<button class="more" data-k="'+esc(key)+'">'+(OPEN[key]?'Show fewer':'Show all '+srt.length)+'</button>':'')+'</div>'}).join('')}
  function show(id,scroll){
    const r=byId[id];if(!r)return;JA.cur=id;
    document.querySelectorAll('#ja-wrap tr.sel').forEach(t=>t.classList.remove('sel'));const tr=document.querySelector('#ja-wrap tr[data-id="'+id+'"]');if(tr)tr.classList.add('sel');
    const a=r.hl&&rdId[r.hl],b=r.hl2&&rdId[r.hl2];
    let h='<h3>'+esc(r.n)+'</h3><div>'+stp(r.st)+' <span class="pill">'+esc(EN.kind[r.kind][0])+'</span>'+r.modes.map(m=>'<span class="pill">'+esc(EN.mode[m])+'</span>').join('')+'</div>'
      +'<p style="margin:6px 0">'+esc(r.what)+'</p>'
      +'<h4>Why "'+esc(EN.st[r.st][0].toLowerCase())+'"</h4><p style="margin:2px 0">'+esc(r.why)+'</p>'
      +(a?evCard(a,'Headline: best independent reading'):'')+(b?evCard(b,a?'Best self-reported or vendor-run reading, for comparison':'Headline: no independent reading exists on a shared metric; this one is '+EN.k[b.k][0]):'')
      +'<dl class="kv"><dt>First published</dt><dd>'+(r.d?fd(r.d)+'; ':'')+sa(r.s)+'</dd>'
      +(r.size?'<dt>Size</dt><dd>'+esc(r.size)+'</dd>':'')+(r.chance?'<dt>Chance level</dt><dd>'+esc(r.chance)+'</dd>':'')+(r.ceil?'<dt>Human ceiling</dt><dd>'+esc(r.ceil)+'</dd>':'')
      +'<dt>Weights</dt><dd>'+esc(EN.ow[r.ow])+(r.owt?': '+esc(r.owt):'')+(r.ows?' <span class="src">'+sa(r.ows,'model page')+'</span>':'')+'</dd>'
      +'<dt>Cost</dt><dd>'+(r.cost&&r.cost.length?r.cost.map(c=>esc(c[0])+' <span class="src">'+sa(c[1],'source')+'</span>').join('<br>'):'<span class="mute">No cost published by the source.</span>')+'</dd>'
      +(r.page?'<dt>Depth</dt><dd>'+pl(r.page)+(r.page2?'; '+pl(r.page2):'')+'</dd>':'')+'</dl>'
      +(r.quote?'<h4>In the authors\' words</h4>'+r.quote.map(q=>'<p class="small" style="margin:2px 0">'+'"'+esc(q)+'"'+'</p>').join('')+'<p class="src">'+sa(r.s)+'</p>':'')
      +(r.iss.length?'<h4>Known issues</h4><ul class="tight">'+r.iss.map(x=>'<li>'+esc(x[0])+' <span class="src">'+sa(x[1],'source')+'</span></li>').join('')+'</ul>':'')
      +(r.corr.length?'<h4>Corrections to the old page</h4>'+r.corr.map(c=>'<div class="corr"><div class="cl"><b>Old:</b> '+esc(c[0])+'</div><div class="fx"><b>Now:</b> '+esc(c[1])+' <span class="src">'+sa(c[2],'source')+'</span></div></div>').join(''):'')
      +(r.n_read?'<h4>'+((r.kind==='meta'||r.kind==='study')?'Every reading on this test, one list per metric':'Where it stands, one list per metric (its readings in bold)')+'</h4>'+groups(r):'');
    $('ja-det').innerHTML=h;
    if(scroll){const w=$('ja-wrap');if(tr)w.scrollTop=Math.max(0,tr.offsetTop-60);$('ja-det').scrollIntoView({block:'nearest'})}
    JA.listeners.forEach(f=>{try{f()}catch(e){}});
  }
  $('ja-det').addEventListener('click',e=>{const b=e.target.closest('button.more');if(b){OPEN[b.dataset.k]=!OPEN[b.dataset.k];show(JA.cur,false)}});
  JA.show=(id,scroll)=>{if(!JA.vis.has(id))$('ja-reset').click();show(id,scroll)};
  // ---- side by side ----
  $('ja-cmp-pre').innerHTML=A.presets.map((p,i)=>'<button data-i="'+i+'">'+esc(p[0])+'</button>').join('');
  $('ja-cmp-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;JA.sel=A.presets[+b.dataset.i][1].filter(x=>byId[x]);
    $('ja-cmp-pre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw();cmp()});
  function cmp(){
    const rs=JA.sel.map(x=>byId[x]).filter(Boolean);
    if(rs.length<2){$('ja-cmp').innerHTML='<p class="mute small">Tick at least two rows (or pick a preset) to compare.</p>';return}
    const L=[['Kind',r=>esc(EN.kind[r.kind][0])],['Mode',r=>r.modes.map(m=>esc(EN.mode[m])).join(', ')],['Status',r=>stp(r.st)],['First published',r=>r.d?fd(r.d):'n/a'],
      ['Weights',r=>esc(EN.ow[r.ow])],['Cost',r=>r.cost&&r.cost.length?r.cost.map(c=>esc(c[0])).join('<br>'):'<span class="mute">not published</span>'],['What it is',r=>esc(r.what)],['Verdict',r=>esc(r.why)]];
    let h='<table class="cmp"><thead><tr><th class="r"></th>'+rs.map(r=>'<th><button class="jump" data-id="'+r.id+'">'+esc(r.n)+'</button></th>').join('')+'</tr></thead><tbody>';
    L.forEach(l=>{const v=rs.map(l[1]);const dif=v.some(x=>x!==v[0]);h+='<tr'+(dif?' class="dif"':'')+'><th class="r">'+l[0]+'</th>'+v.map(x=>'<td>'+x+'</td>').join('')+'</tr>'});
    // metrics: line up only those shared by two or more rows
    const per=rs.map(r=>{const o={};readsOf(r).forEach(x=>{if(!o[x.m]||(M[x.m].hi?x.v>o[x.m].v:x.v<o[x.m].v)||(o[x.m].k!=='ind'&&x.k==='ind'))o[x.m]=x});return o});
    const ms=mO.filter(m=>per.filter(o=>o[m]).length>=2);
    if(ms.length){h+='<tr><td colspan="'+(rs.length+1)+'" class="small"><b>Shared metrics</b> (best reading each row has on it; one line per metric, never mixed)</td></tr>';
      ms.forEach(m=>{h+='<tr class="mrow"><th class="r">'+esc(M[m].n)+'</th>'+per.map(o=>{const x=o[m];return '<td>'+(x?'<b>'+esc(fv(x))+'</b>'+kd(x.k)+'<small>'+esc(x.j)+', '+fd(x.d)+'</small>':'<span class="mute">not measured</span>')+'</td>'}).join('')+'</tr>'})}
    const only=rs.map((r,i)=>Object.keys(per[i]).filter(m=>ms.indexOf(m)<0));
    h+='<tr><th class="r">Other metrics</th>'+only.map(l=>'<td class="small">'+(l.length?l.map(m=>esc(M[m].n)).join('; '):'<span class="mute">none</span>')+'</td>').join('')+'</tr>';
    h+='</tbody></table>';
    if(!ms.length)h+='<p class="small"><b>No metric in common:</b> these rows were measured on different instruments, so their numbers cannot be compared.</p>';
    $('ja-cmp').innerHTML=h}
  $('ja-cmp').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)JA.show(b.dataset.id,true)});
  // ---- corrections ----
  const cs=[];R.forEach(r=>r.corr.forEach(c=>cs.push([r,c])));
  $('ja-corr-s').textContent=cs.length+' corrections to the old LLM-as-judge page, each with its source';
  $('ja-corr-b').innerHTML=cs.map(([r,c])=>'<div class="corr"><div><b>'+esc(r.n)+'</b><button class="jump" data-id="'+r.id+'">open row</button></div><div class="cl"><b>Old:</b> '+esc(c[0])+'</div><div class="fx"><b>Now:</b> '+esc(c[1])+' <span class="src">'+sa(c[2],'source')+'</span></div></div>').join('');
  $('ja-corr-b').addEventListener('click',e=>{const b=e.target.closest('button.jump');if(b)JA.show(b.dataset.id,true)});
  // links to other tabs inside generated content
  $('t-judges').addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a||!a.closest('#ja-det,#ja-cmp,#ja-tip,#ja-corr-b'))return;e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}});
  // ---- start ----
  JA.sel=A.presets[0][1].slice();$('ja-cmp-pre').querySelector('button').classList.add('on');
  draw();cmp();show('judgebench',false);
})();

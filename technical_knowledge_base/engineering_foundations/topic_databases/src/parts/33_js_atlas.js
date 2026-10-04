// ---- Database atlas (t-atlas): table, filters, sort, search, detail, compare, chooser, licence timeline, claims ----
(function(){
const D=window.DA_DATA;if(!D)return;
const $=id=>document.getElementById(id);
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rows=D.rows;const byId={};rows.forEach(r=>byId[r.id]=r);
const FAM=D.families,ENG=D.engines,LIC=D.lic,DEP=D.deploy;
const st={q:'',f:{family:new Set(),engine:new Set(),lic:new Set(),deploy:new Set()},view:'overview',sort:'family',dir:1,sel:null,cmp:[],ans:{}};
try{const v=localStorage.getItem('da-view');if(v&&D.views[v])st.view=v}catch(e){}
function srcSup(r,k){const a=(r.s&&r.s[k])||[];if(!a.length)return '';
  return '<sup class="s">'+a.map(i=>'<a href="'+esc(D.sources[i].u)+'" target="_blank" rel="noopener noreferrer" title="'+esc(D.sources[i].t)+'">['+(i+1)+']</a>').join('')+'</sup>'}
function fmtDate(d){if(!d)return '';const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const p=d.split('-');
  return (p[2]?(+p[2])+' ':'')+(p[1]?m[+p[1]-1]+' ':'')+p[0]}
function licPill(r){return '<span class="pill '+r.licence_class+'">'+esc(LIC[r.licence_class].short)+'</span>'}
function jepCell(r){if(!r.jepsen.length)return '<span class="mute">no Jepsen report</span>';
  return r.jepsen.map(j=>'<a href="'+esc(j.url)+'" target="_blank" rel="noopener noreferrer">'+esc(j.version)+'</a> <span class="mute">('+esc(j.date.slice(0,4))+')</span>').join(', ')}
// cell renderers by column key
const COL={
  name:{h:'System',v:r=>r.name,c:r=>esc(r.name)+(D.views[st.view].cols.includes('family')?'':'<span class="fm2">'+esc(FAM[r.family].label)+'</span>')},
  family:{h:'Family',v:r=>String(FAM[r.family].ord).padStart(2,'0')+r.name.toLowerCase(),c:r=>esc(FAM[r.family].label)},
  model:{h:'Data model',v:r=>r.model,c:r=>esc(r.model),w:1},
  engine:{h:'Storage engine',v:r=>ENG[r.engine].ord+r.name,c:r=>'<b>'+esc(ENG[r.engine].label)+'</b><span class="fm2">'+esc(r.engine_note)+'</span>',w:1},
  consistency:{h:'What is guaranteed',v:r=>r.consistency,c:r=>esc(r.consistency),w:1},
  jepsen:{h:'Jepsen',v:r=>r.jepsen.length?'0'+r.jepsen[r.jepsen.length-1].date:'1',c:jepCell},
  scaling:{h:'How it scales',v:r=>r.scaling,c:r=>esc(r.scaling),w:1},
  managed:{h:'Managed offerings',v:r=>r.managed.join(','),c:r=>esc(r.managed.join(', ')||'none'),w:1},
  deploy:{h:'Runs as',v:r=>r.deploy.join(','),c:r=>r.deploy.map(d=>esc(DEP[d].label)).join(', ')},
  licence:{h:'Licence',v:r=>LIC[r.licence_class].ord+r.licence,c:r=>licPill(r)+'<span class="fm2">'+esc(r.licence)+'</span>'},
  licev:{h:'Licence changes',v:r=>r.licence_events.length?'0'+r.licence_events[r.licence_events.length-1].date:'1',c:r=>r.licence_events.length?r.licence_events.map(e=>'<b>'+esc(fmtDate(e.date))+'</b> '+esc(e.event)).join('<br>'):'<span class="mute">none recorded</span>',w:1},
  version:{h:'Latest stable',v:r=>r.version,c:r=>esc(r.version)+'<span class="fm2">'+esc(fmtDate(r.version_date))+'</span>'},
  vdate:{h:'Released',v:r=>r.version_date||'',c:r=>esc(fmtDate(r.version_date))},
  reach:{h:'Reach for it when',v:r=>r.reach,c:r=>esc(r.reach),w:1},
  avoid:{h:'Avoid when',v:r=>r.avoid,c:r=>esc(r.avoid),w:1},
  escape:{h:'Why leave Postgres for it',v:r=>r.escape,c:r=>esc(cap(r.escape)),w:1},
  chat:{h:'In the chat product',v:r=>r.chat,c:r=>esc(r.chat),w:1}
};
// lead and how-to
$('da-lead').innerHTML=D.lead;$('da-howto').innerHTML=D.howto;
$('da-glo').innerHTML=D.glossary.map(g=>'<div><b>'+esc(g.t)+'</b>'+g.d+'</div>').join('');
$('da-foot').innerHTML=D.foot;
// views
$('da-view').innerHTML=Object.keys(D.views).map(k=>'<button data-v="'+k+'">'+esc(D.views[k].label)+'</button>').join('');
$('da-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.view=b.dataset.v;try{localStorage.setItem('da-view',st.view)}catch(x){}drawTable()});
// filters
const FL=[['family','Family',FAM],['engine','Storage engine',ENG],['lic','Licence',LIC],['deploy','Runs as',DEP]];
function keyOf(r,k){return k==='family'?[r.family]:k==='engine'?[r.engine]:k==='lic'?[r.licence_class]:r.deploy}
$('da-filters').innerHTML=FL.map(([k,lab,M])=>'<div class="da-fl"><div class="band">'+lab+'</div><div class="chips" data-k="'+k+'">'+
  Object.keys(M).sort((a,b)=>(M[a].ord||0)-(M[b].ord||0)).map(id=>'<button data-id="'+id+'" title="'+esc(M[id].tip||'')+'">'+esc(M[id].label)+'<span class="ct" data-c="'+k+':'+id+'"></span></button>').join('')+'</div></div>').join('');
$('da-filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=b.parentNode.dataset.k,s=st.f[k];
  s.has(b.dataset.id)?s.delete(b.dataset.id):s.add(b.dataset.id);drawTable()});
$('da-search').addEventListener('input',e=>{st.q=e.target.value.trim().toLowerCase();drawTable()});
$('da-clear').addEventListener('click',()=>{st.q='';$('da-search').value='';Object.values(st.f).forEach(s=>s.clear());st.ans={};drawQs();drawTable()});
function hay(r){return (r.name+' '+r.model+' '+r.engine_note+' '+r.consistency+' '+r.scaling+' '+r.licence+' '+r.managed.join(' ')+' '+r.reach+' '+r.avoid+' '+r.escape+' '+r.notes+' '+(r.aka||'')+' '+FAM[r.family].label).toLowerCase()}
rows.forEach(r=>r._h=hay(r));
function pass(r,skip){if(st.q&&r._h.indexOf(st.q)<0)return false;
  for(const [k] of FL){if(k===skip)continue;const s=st.f[k];if(s.size&&!keyOf(r,k).some(x=>s.has(x)))return false}return true}
function visible(){const v=rows.filter(r=>pass(r));const c=COL[st.sort];
  const cd=st.cand;v.sort((a,b)=>{if(cd){const p=cd.has(b.id)-cd.has(a.id);if(p)return p}const x=c.v(a),y=c.v(b);return (x<y?-1:x>y?1:0)*st.dir||(a.name<b.name?-1:1)});return v}
function drawTable(){
  [...$('da-view').children].forEach(b=>b.classList.toggle('on',b.dataset.v===st.view));
  FL.forEach(([k])=>{document.querySelectorAll('#da-filters .chips[data-k="'+k+'"] button').forEach(b=>{b.classList.toggle('on',st.f[k].has(b.dataset.id));
    const n=rows.filter(r=>pass(r,k)&&keyOf(r,k).includes(b.dataset.id)).length;b.querySelector('.ct').textContent=n})});
  const cols=['name'].concat(D.views[st.view].cols);
  $('da-table').tHead.innerHTML='<tr>'+cols.map(k=>'<th data-k="'+k+'" class="'+(k==='name'?'nm':'')+'" aria-sort="'+(st.sort===k?(st.dir>0?'ascending':'descending'):'none')+'">'+esc(COL[k].h)+(st.sort===k?'<span class="ar">'+(st.dir>0?'▲':'▼')+'</span>':'')+'</th>').join('')+'</tr>';
  const v=visible();const cand=st.cand||null;
  $('da-table').tBodies[0].innerHTML=v.map(r=>'<tr data-id="'+r.id+'" class="'+(st.sel===r.id?'sel ':'')+(cand?(cand.has(r.id)?'cand':'dimr'):'')+'">'+cols.map(k=>
    '<td class="'+(k==='name'?'nm':'')+(COL[k].w?' w':'')+'">'+COL[k].c(r)+(k==='name'?'<button class="cmpb'+(st.cmp.includes(r.id)?' on':'')+'" data-cmp="'+r.id+'" aria-label="Compare '+esc(r.name)+'" title="Add to compare">'+(st.cmp.includes(r.id)?'−':'+')+'</button>':'')+'</td>').join('')+'</tr>').join('')||
    '<tr><td colspan="'+cols.length+'" class="mute">No system matches these filters.</td></tr>';
  const n1=cand?[...cand].filter(id=>v.some(r=>r.id===id)).length:0;$('da-cnt').textContent=v.length+' of '+rows.length+' systems shown'+(cand?'; '+n1+' chooser candidate'+(n1===1?'':'s')+' among them, listed first':'');
}
$('da-table').tHead.addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k;
  if(st.sort===k)st.dir=-st.dir;else{st.sort=k;st.dir=k==='vdate'?-1:1}drawTable()});
$('da-table').tBodies[0].addEventListener('click',e=>{const cb=e.target.closest('button[data-cmp]');
  if(cb){toggleCmp(cb.dataset.cmp);return}
  if(e.target.closest('a'))return;const tr=e.target.closest('tr[data-id]');if(!tr)return;openRow(tr.dataset.id,true)});
function toggleCmp(id){const i=st.cmp.indexOf(id);if(i>=0)st.cmp.splice(i,1);else{st.cmp.push(id);if(st.cmp.length>3)st.cmp.shift()}drawTable();drawCmp()}
window.DA_openRow=openRow;
function openRow(id,scroll){st.sel=st.sel===id&&scroll?null:id;drawTable();drawDetail();if(st.sel&&scroll){const el=$('da-detail');el.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}
// ---- detail panel: every field with its sources ----
const FIELDS=[['family','Family',r=>esc(FAM[r.family].label)+(r.embedded?' <span class="tag">embedded library</span>':'')],
 ['model','Data model',r=>esc(r.model)],['engine','Storage engine',r=>'<b>'+esc(ENG[r.engine].label)+'</b>: '+esc(r.engine_note)],
 ['consistency','What is guaranteed',r=>esc(r.consistency)],
 ['jepsen','Jepsen tests',r=>r.jepsen.length?r.jepsen.map(j=>'<a href="'+esc(j.url)+'" target="_blank" rel="noopener noreferrer">'+esc(j.version)+'</a> ('+esc(fmtDate(j.date))+'): '+esc(j.finding)).join('<br>'):'<span class="mute">Jepsen has not published an analysis of this system.</span>'],
 ['scaling','How it scales',r=>esc(r.scaling)],
 ['licence','Licence',r=>licPill(r)+' '+esc(r.licence)+(r.licence_events.length?'<br>'+r.licence_events.map(e=>'<b>'+esc(fmtDate(e.date))+'</b>: '+esc(e.event)+' <a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">source</a>').join('<br>'):'')],
 ['managed','Runs as; managed offerings',r=>r.deploy.map(d=>esc(DEP[d].label)).join(', ')+(r.managed.length?'; '+esc(r.managed.join(', ')):'')],
 ['version','Latest stable',r=>esc(r.version)+(r.version_date?' ('+esc(fmtDate(r.version_date))+')':'')+(r.version_note?' <span class="mute">'+esc(r.version_note)+'</span>':'')],
 ['reach','Reach for it when',r=>esc(r.reach)],['avoid','Avoid when',r=>esc(r.avoid)],
 ['escape','Why leave Postgres for it',r=>esc(cap(r.escape))],['chat','In the chat product',r=>esc(r.chat)]];
function drawDetail(){const r=byId[st.sel];if(!r){$('da-detail').innerHTML='';return}
  const srcKey={avoid:'reach',escape:'reach',chat:'reach',family:'-'};
  $('da-detail').innerHTML='<div class="da-det" role="region" aria-label="'+esc(r.name)+' details"><h3>'+esc(r.name)+'</h3>'+
   '<div class="small mute">As of '+esc(fmtDate(D.asof))+'. Superscript numbers link the source each cell rests on.</div>'+
   '<dl class="kv">'+FIELDS.map(([k,l,f])=>'<dt>'+l+'</dt><dd>'+f(r)+srcSup(r,srcKey[k]||k)+'</dd>').join('')+
   (r.notes?'<dt>Notes</dt><dd class="small">'+esc(r.notes)+'</dd>':'')+'</dl>'+
   '<div class="small">Sources: '+[...new Set(Object.values(r.s).flat())].sort((a,b)=>a-b).map(i=>'['+(i+1)+'] <a href="'+esc(D.sources[i].u)+'" target="_blank" rel="noopener noreferrer">'+esc(D.sources[i].t)+'</a>').join('; ')+' (read '+esc(fmtDate(D.asof))+').</div>'+
   '<p><button data-cmp2="'+r.id+'">'+(st.cmp.includes(r.id)?'Remove from compare':'Add to compare')+'</button> <button data-close="1">Close</button></p></div>';
}
$('da-detail').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.cmp2){toggleCmp(b.dataset.cmp2);drawDetail()}if(b.dataset.close){st.sel=null;drawTable();drawDetail()}});
// ---- compare 2 or 3 side by side ----
function drawCmp(){const c=st.cmp.map(id=>byId[id]);
  if(!c.length){$('da-cmpwrap').innerHTML='';return}
  const head='<tr>'+c.map(r=>'<th>'+esc(r.name)+' <button class="cmpb" data-rm="'+r.id+'" aria-label="Remove '+esc(r.name)+'">−</button></th>').join('')+'</tr>';
  $('da-cmpwrap').innerHTML='<div class="da-det"><b>Compare</b> <span class="small mute">'+(c.length<2?'add one or two more rows with "+"':'side by side; differences are the point')+'</span> <button class="cmpb" data-rmall="1">clear</button>'+
   '<div class="da-cmp"><table><thead>'+head+'</thead><tbody>'+FIELDS.map(([k,l,f])=>'<tr class="fh"><th colspan="'+c.length+'">'+l+'</th></tr><tr>'+c.map(r=>'<td>'+f(r)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>';
}
$('da-cmpwrap').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.rm)toggleCmp(b.dataset.rm);if(b.dataset.rmall){st.cmp=[];drawTable();drawCmp()}});
// ---- chooser: the five questions ----
const Q=D.chooser.questions;
function drawQs(){$('da-qs').innerHTML=Q.map(q=>'<div class="qq">'+esc(q.n+'. '+q.q)+'</div><div class="qh">'+esc(q.h)+'</div><div class="chips" data-q="'+q.id+'">'+
  q.opts.map(o=>'<button data-o="'+o.id+'" class="'+(st.ans[q.id]===o.id?'on':'')+'">'+esc(o.t)+'</button>').join('')+'</div>').join('');runChooser()}
$('da-qs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const q=b.parentNode.dataset.q;
  st.ans[q]=st.ans[q]===b.dataset.o?undefined:b.dataset.o;if(st.ans[q]===undefined)delete st.ans[q];drawQs();drawTable()});
function judge(r){const a=st.ans,ch=r.ch,ok=[],no=[],soft=[];
  if(a.access){(ch.acc.includes(a.access)?ok:no).push(D.chooser.why.access[ch.acc.includes(a.access)?'ok':'no'].replace('{x}',Q[0].opts.find(o=>o.id===a.access).t.toLowerCase()))}
  if(a.inv==='yes'){if(ch.txn==='multi')ok.push('multi-row transactions (see its "What is guaranteed" cell)');else if(ch.txn==='shard')soft.push('multi-row transactions are safe only inside one shard; across shards see its "What is guaranteed" cell');else no.push(ch.txn==='single'?'atomic only per item or document, not across rows':'no transactions across rows')}
  if(a.writes){const need={low:1,mid:2,high:3}[a.writes];ch.wr>=need?ok.push(D.chooser.why.wr[ch.wr]):no.push('built for '+D.chooser.why.wrshort[ch.wr]+', less than you need')}
  if(a.known==='no'){ch.flex?ok.push('new questions can be asked later with ad hoc queries'):soft.push('queries must be designed up front; a new question can mean a new table or index')}
  if(a.known==='yes'&&!ch.flex)ok.push('fixed access paths are what it is built for');
  if(a.ops){ch.ops.includes(a.ops)?ok.push(D.chooser.why.ops[a.ops]):no.push('not offered as '+D.chooser.why.opsno[a.ops])}
  return {ok,no,soft,score:ok.length-2*no.length-0.5*soft.length+(r.id==='postgresql'?0.6:0)+(ch.default?0.3:0)}}
function runChooser(){const n=Object.keys(st.ans).length;
  if(!n){st.cand=null;$('da-res').innerHTML='<span class="mute">No answers yet: every row is shown normally.</span>';return}
  const j=rows.map(r=>[r,judge(r)]);const c=j.filter(x=>!x[1].no.length).sort((a,b)=>b[1].score-a[1].score);
  st.cand=new Set(c.map(x=>x[0].id));
  const near=j.filter(x=>x[1].no.length===1).sort((a,b)=>b[1].score-a[1].score).slice(0,3);
  const li=x=>'<li><a href="#" data-open="'+x[0].id+'">'+esc(x[0].name)+'</a> <span class="mute small">'+esc(FAM[x[0].family].label)+'</span><span class="why">'+
    x[1].ok.map(t=>'<span class="ok">✓</span> '+esc(t)).join('; ')+(x[1].soft.length?'; <span class="no">!</span> '+x[1].soft.map(esc).join('; '):'')+(x[1].no.length?'; <span class="no">✗</span> '+x[1].no.map(esc).join('; '):'')+'</span></li>';
  const pg=j.find(x=>x[0].id==='postgresql');
  $('da-res').innerHTML=(c.length?'<b>'+c.length+' candidate'+(c.length>1?'s':'')+'</b>, best first'+(c.length>8?' (top 8 listed; all are marked in the table)':'')+':<ol>'+c.slice(0,8).map(li).join('')+'</ol>':'<b>No row passes every answer.</b> Relax one answer; the nearest misses are below.')+
    (!st.cand.has('postgresql')?'<p class="small"><b>Why not the default?</b> PostgreSQL misses on: '+pg[1].no.map(esc).join('; ')+'. If that need is real and measured, it is your reason to leave the default; if not, start on Postgres.</p>':'<p class="small"><b>The default still fits.</b> PostgreSQL passes these answers, so start there and leave only when a measured limit forces you.</p>')+
    (near.length?'<p class="small mute">Near misses (one answer against them): '+near.map(x=>'<a href="#" data-open="'+x[0].id+'">'+esc(x[0].name)+'</a> ('+esc(x[1].no[0])+')').join(', ')+'</p>':'');
}
$('da-res').addEventListener('click',e=>{const a=e.target.closest('a[data-open]');if(!a)return;e.preventDefault();openRow(a.dataset.open,true)});
// ---- licence timeline: one lane per system with dated events, sized to the measured width ----
function drawLT(){const el=$('da-lt');const W=Math.max(300,el.clientWidth||600);
  const L=rows.filter(r=>r.licence_events.length).sort((a,b)=>a.licence_events[0].date<b.licence_events[0].date?-1:1);
  if(!L.length){el.innerHTML='';return}
  const y0=2018,y1=2027,lw=W<520?84:120,pad=8,lh=24,top=18,H=top+L.length*lh+6;
  const x=d=>{const p=d.split('-');const t=+p[0]+((+p[1]||1)-1)/12+((+p[2]||1)-1)/365;return lw+(W-lw-pad)*(t-y0)/(y1-y0)};
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Licence changes by system and date">';
  for(let y=y0;y<=y1;y++){const X=x(y+'-01-01');if(W<520&&y%2)continue;s+='<line x1="'+X+'" x2="'+X+'" y1="'+(top-4)+'" y2="'+(H-4)+'" stroke="var(--line)"/><text x="'+X+'" y="11" text-anchor="'+(y===y1?'end':'middle')+'" fill="var(--mute)">'+(W<520?"'"+String(y).slice(2):y)+'</text>'}
  L.forEach((r,i)=>{const Y=top+i*lh+lh/2;
    s+='<text x="0" y="'+(Y+4)+'" class="ev" data-open="'+r.id+'">'+esc(r.short||r.name)+'</text><line x1="'+lw+'" x2="'+(W-pad)+'" y1="'+Y+'" y2="'+Y+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    r.licence_events.forEach(e=>{const c=e.to?'var(--'+(LIC[e.to]||{}).col+')':'var(--mute)';
      s+='<circle class="ev" data-open="'+r.id+'" cx="'+x(e.date)+'" cy="'+Y+'" r="6" fill="'+c+'" stroke="var(--bg)" stroke-width="1.5"><title>'+esc(r.name+', '+fmtDate(e.date)+': '+e.event)+'</title></circle>'})});
  el.innerHTML=s+'</svg><div class="hmleg">'+Object.keys(LIC).map(k=>'<span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="var(--'+LIC[k].col+')"/></svg>moved to '+esc(LIC[k].label.toLowerCase())+'</span>').join('')+'<span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="var(--mute)"/></svg>owner or governance changed; licence unchanged</span></div>';
}
$('da-lt').addEventListener('click',e=>{const t=e.target.closest('[data-open]');if(t)openRow(t.dataset.open,true)});
// ---- claims from the old page ----
let clf='all';
function drawClaims(){const cnt={all:D.claims.length};D.claims.forEach(c=>cnt[c.verdict]=(cnt[c.verdict]||0)+1);
  $('da-cl-f').innerHTML=['all','verified','corrected','unconfirmed'].map(k=>'<button data-k="'+k+'" class="'+(clf===k?'on':'')+'">'+k+' ('+(cnt[k]||0)+')</button>').join('');
  $('da-claims').innerHTML=D.claims.filter(c=>clf==='all'||c.verdict===clf).map(c=>'<div class="da-claim"><span class="pill v-'+c.verdict+'">'+c.verdict+'</span> <span class="old">"'+esc(c.claim)+'"</span>'+
    '<div>'+c.finding+'</div>'+(c.now?'<div><b>Now reads:</b> '+esc(c.now)+'</div>':'')+
    '<div class="small mute">Sources: '+c.src.map(s=>'<a href="'+esc(s.u)+'" target="_blank" rel="noopener noreferrer">'+esc(s.t)+'</a>').join('; ')+(c.rows&&c.rows.length?'. Rows: '+c.rows.map(id=>'<a href="#" data-open="'+id+'">'+esc(byId[id]?byId[id].name:id)+'</a>').join(', '):'')+'</div></div>').join('');
}
$('da-cl-f').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;clf=b.dataset.k;drawClaims()});
$('da-claims').addEventListener('click',e=>{const a=e.target.closest('a[data-open]');if(!a)return;e.preventDefault();openRow(a.dataset.open,true)});
// ---- init and redraw on tab open / resize ----
let done=false;function render(){if(!done){drawQs();drawClaims();done=true}drawTable();drawLT()}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-atlas']=(window.TAB_RENDER['t-atlas']||[]).concat([render]);
let rw=0,rt;addEventListener('resize',()=>{if($('t-atlas').hidden)return;clearTimeout(rt);rt=setTimeout(()=>{const w=$('da-lt').clientWidth;if(w!==rw){rw=w;drawLT()}},120)});
})();

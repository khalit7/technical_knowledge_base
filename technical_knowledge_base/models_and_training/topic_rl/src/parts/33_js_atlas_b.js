// ---- Method atlas (t-atlas), part b: shared helpers (also used by t-tax), grid, filters, detail, side by side ----
(function(){
const A=window.ATLAS;
const AT=window.AT={};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
AT.esc=esc;
AT.rows=A.rows;AT.byId={};A.rows.forEach(r=>AT.byId[r.id]=r);
AT.fam=(col,f)=>{const l=(A.fams[col]||[]).find(x=>x[0]===f);return l?l[1]:f};
AT.url=u=>u&&u.indexOf('n:')===0?'https://app.notion.com/p/'+u.slice(2):u;
AT.srcLink=(k,loc)=>{const s=A.sources[k];if(!s)return esc(k);return '<a href="'+esc(AT.url(s.u))+'" target="_blank" rel="noopener noreferrer">'+esc(s.t)+'</a>'+(loc?' <span class="mute">('+esc(loc)+')</span>':'')+' <span class="mute">'+esc(s.d)+'</span>'};
AT.year=r=>r.date.slice(0,4);
AT.pageLink=r=>{if(!r.page)return '<span class="mute">No child page covers it</span>';const p=A.pages[r.page];return '<a href="https://app.notion.com/p/'+p[1]+'" target="_blank" rel="noopener noreferrer">'+esc(p[0])+'</a>'};
// expand {s:key|loc} and {m:id} marks in taxonomy prose
AT.prose=t=>esc(t).replace(/\{s:(\w+)\|([^}]*)\}/g,(m,k,l)=>{const s=A.sources[k];return s?'(<a href="'+esc(AT.url(s.u))+'" target="_blank" rel="noopener noreferrer">'+esc(k==='sb'?'S&B '+l:s.t.split(',')[0]+' '+l)+'</a>)':m}).replace(/\{m:(\w+)\}/g,(m,id)=>AT.byId[id]?esc(AT.byId[id].short):id);
AT.quoteHtml=(q,k)=>'<blockquote>"'+esc(q)+'"<br><small class="mute">'+AT.srcLink(k)+'</small></blockquote>';
// open another tab from a link made at run time (the tab wiring binds only links present at load)
AT.goTab=(id,anchor)=>{const b=document.querySelector('#tabs button[data-t="'+id+'"]');if(b)b.click();if(anchor){const e=document.getElementById(anchor);if(e)setTimeout(()=>e.scrollIntoView({block:'start'}),30)}};
AT.selectHooks=[];
AT.select=id=>{AT.sel=id;AT.selectHooks.forEach(f=>{try{f(id)}catch(e){}})};

const COLS=A.columns, CAT=['store','model','data','act'];
const TAXSEC={store:'tx-ax-store',model:'tx-ax-model',data:'tx-ax-data',act:'tx-ax-act',target:'tx-ax-depth'};
const st={q:'',f:{store:[],model:[],data:[],act:[],lane:[]},needs:[],sort:'paper',dir:1,ticks:['ppo','grpo','dpo'],cell:null};
AT.state=st;
function cellText(r,c){const x=r.cells[c];if(c==='paper')return AT.year(r)+'. '+x.v;return x.v}
function cellHtml(r,c){const x=r.cells[c];
  if(c==='store')return '<span class="pill f-'+x.f+'">'+esc(AT.fam(c,x.f))+'</span>';
  if(c==='model')return '<span class="pill m-'+x.f+'">'+esc(AT.fam(c,x.f))+'</span>';
  if(c==='data'||c==='act')return '<span class="pill">'+esc(AT.fam(c,x.f))+'</span>';
  if(c==='needs')return (x.f.length?x.f.map(t=>'<span class="pill">'+esc(AT.fam('needs',t))+'</span>').join(''):'<span class="mute">experience only</span>');
  if(c==='paper')return '<b>'+AT.year(r)+'</b> '+esc(x.v);
  return esc(x.v)}
AT.visible=r=>{
  for(const k of ['store','model','data','act'])if(st.f[k].length&&!st.f[k].includes(r.cells[k].f))return false;
  if(st.f.lane.length&&!st.f.lane.includes(r.lane))return false;
  for(const t of st.needs)if(!r.cells.needs.f.includes(t))return false;
  if(st.q){const hay=(r.name+' '+r.alias+' '+COLS.map(c=>cellText(r,c.id)).join(' ')).toLowerCase();if(!st.q.toLowerCase().split(/\s+/).every(w=>hay.includes(w)))return false}
  return true};
function sortKey(r){const c=st.sort,x=r.cells[c];
  if(c==='name')return r.name.toLowerCase();
  if(c==='paper')return r.date;
  if(CAT.includes(c))return (A.fams[c].findIndex(f=>f[0]===x.f))+'|'+r.date;
  if(c==='needs')return String(99-x.f.length).padStart(2,'0')+r.date;
  return x.v.toLowerCase()}
function chips(id,label,list,cur,multi){
  return '<div class="atctl"><span class="lb">'+label+'</span><div class="chips" id="'+id+'">'+list.map(f=>'<button data-v="'+f[0]+'" class="'+(cur.includes(f[0])?'on':'')+'" aria-pressed="'+cur.includes(f[0])+'">'+esc(f[1])+'</button>').join('')+'</div></div>'}
function drawCtl(){
  const el=document.getElementById('at-ctl');
  el.innerHTML='<div class="atctl"><input type="search" id="at-q" placeholder="Search methods, papers, targets" aria-label="Search the atlas" value="'+esc(st.q)+'"><button id="at-clr">Clear filters</button></div>'+
    chips('at-f-store','Stores',A.fams.store,st.f.store)+chips('at-f-model','Model',A.fams.model,st.f.model)+chips('at-f-data','Data',A.fams.data,st.f.data)+
    chips('at-f-act','Actions',A.fams.act,st.f.act)+chips('at-f-lane','Family',A.lanes,st.f.lane)+chips('at-f-needs','Needs (all of)',A.fams.needs,st.needs);
  el.querySelector('#at-q').addEventListener('input',e=>{st.q=e.target.value;drawGrid();AT.filterHooks.forEach(f=>f())});
  el.querySelector('#at-clr').addEventListener('click',()=>{st.q='';for(const k in st.f)st.f[k]=[];st.needs=[];drawCtl();drawGrid();AT.filterHooks.forEach(f=>f())});
  ['store','model','data','act','lane','needs'].forEach(k=>{el.querySelector('#at-f-'+k).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    const arr=k==='needs'?st.needs:st.f[k];const v=b.dataset.v,i=arr.indexOf(v);if(i<0)arr.push(v);else arr.splice(i,1);
    b.classList.toggle('on',i<0);b.setAttribute('aria-pressed',String(i<0));drawGrid();AT.filterHooks.forEach(f=>f())})})}
AT.filterHooks=[];
function drawGrid(){
  const rows=A.rows.filter(AT.visible).sort((a,b)=>{const x=sortKey(a),y=sortKey(b);return (x<y?-1:x>y?1:0)*st.dir});
  document.getElementById('at-cnt').textContent='Showing '+rows.length+' of '+A.rows.length+' methods'+(rows.length?'':'. No method matches every filter; clear one.');
  const grp=[];COLS.forEach(c=>{const g=grp[grp.length-1];if(g&&g[0]===c.grp)g[1]++;else grp.push([c.grp,1])});
  const ar=c=>st.sort===c?' <span class="ar">'+(st.dir>0?'&#9650;':'&#9660;')+'</span>':'';
  let h='<table class="at"><thead><tr class="g"><th class="mh"></th>'+grp.map(g=>'<th colspan="'+g[1]+'">'+esc(g[0])+'</th>').join('')+'</tr><tr><th class="mh"><button class="sb" data-s="name" title="Sort by name">Method'+ar('name')+'</button><small>tick up to 3 to compare</small></th>'+
    COLS.map(c=>'<th title="'+esc(c.desc)+'"><button class="sb" data-s="'+c.id+'">'+esc(c.name)+ar(c.id)+'</button>'+(TAXSEC[c.id]?'<a class="axl" href="#" data-ax="'+TAXSEC[c.id]+'">the axis, in Taxonomy</a>':'')+'</th>').join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{h+='<tr data-r="'+r.id+'" class="'+(st.ticks.includes(r.id)?'sel':'')+'"><th class="mh"><div class="rw"><input type="checkbox" data-r="'+r.id+'" aria-label="Compare '+esc(r.name)+'"'+(st.ticks.includes(r.id)?' checked':'')+'><button class="nm" data-r="'+r.id+'">'+esc(r.name)+'<small>'+esc(A.lanes.find(l=>l[0]===r.lane)[1])+'</small></button></div></th>'+
    COLS.map(c=>{const x=r.cells[c.id];const on=st.cell&&st.cell[0]===r.id&&st.cell[1]===c.id;return '<td data-r="'+r.id+'" data-c="'+c.id+'" class="k-'+x.k+(['target','fixed','used','paper'].includes(c.id)?' w':'')+(on?' on':'')+'" tabindex="0"><div class="cv">'+cellHtml(r,c.id)+'</div></td>'}).join('')+'</tr>'});
  h+='</tbody></table>';
  document.getElementById('at-wrap').innerHTML=h}
function detail(rid,c){
  const r=AT.byId[rid],el=document.getElementById('at-det');if(!r){el.innerHTML='';return}
  if(!c){ // a whole method
    const ppl=r.pp&&A.paper_pages[r.pp]?' Paper page: <a href="https://app.notion.com/p/'+A.paper_pages[r.pp][1]+'" target="_blank" rel="noopener noreferrer">'+esc(A.paper_pages[r.pp][0])+'</a>.':'';
    el.innerHTML='<h3>'+esc(r.name)+'</h3><p class="small">'+esc(AT.year(r))+'. Owned by: '+AT.pageLink(r)+'.'+ppl+'</p><dl class="kv">'+COLS.map(cc=>'<dt>'+esc(cc.short)+'</dt><dd>'+cellHtml(r,cc.id)+(r.cells[cc.id].k!=='pub'?'<span class="kd '+r.cells[cc.id].k+'">'+(r.cells[cc.id].k==='der'?'derived':'unconfirmed')+'</span>':'')+'</dd>').join('')+'</dl><p class="small mute">Click a cell for its source and quote.</p>';return}
  const x=r.cells[c],col=COLS.find(z=>z.id===c);
  const kd={pub:'stated by the source',der:'derived here',unc:'unconfirmed'}[x.k];
  let h='<h3>'+esc(r.name)+': '+esc(col.name)+'<span class="kd '+x.k+'">'+kd+'</span></h3><div class="big">'+(c==='paper'?esc(x.v):cellHtml(r,c))+'</div>';
  if(c==='needs'||CAT.includes(c))h+='<p class="small">'+esc(x.v)+'</p>';
  if(x.q)h+=AT.quoteHtml(x.q,x.s);
  h+='<dl class="kv"><dt>Source</dt><dd>'+AT.srcLink(x.s,x.l)+'</dd>';
  if(x.n)h+='<dt>Note</dt><dd>'+esc(x.n)+'</dd>';
  if(c==='fixed'){const fr=x.from||[];h+='<dt>Predecessor</dt><dd>'+(fr.length?fr.map(id=>'<button class="pill" data-go="'+id+'">'+esc(AT.byId[id].name)+'</button>').join(' '):'none in the atlas (a starting point)')+'</dd>';
    const kids=A.rows.filter(z=>(z.cells.fixed.from||[]).includes(r.id));h+='<dt>Fixed later by</dt><dd>'+(kids.length?kids.map(z=>'<button class="pill" data-go="'+z.id+'">'+esc(z.name)+'</button>').join(' '):'none in the atlas')+'</dd>'}
  if(x.k==='der')h+='<dt>Why derived</dt><dd>The classification is ours, read from what the source describes; the source does not use these words.</dd>';
  h+='<dt>Child page</dt><dd>'+AT.pageLink(r)+'</dd></dl>';
  el.innerHTML=h}
function drawCmp(){
  const el=document.getElementById('at-cmp');const rs=st.ticks.map(id=>AT.byId[id]).filter(Boolean);
  if(rs.length<2){el.innerHTML='<p class="small mute">Tick two or three methods in the grid to line them up here.</p>';return}
  let h='<div class="hmwrap"><table class="cmp"><thead><tr><th class="r"></th>'+rs.map(r=>'<th>'+esc(r.name)+'<small>'+AT.year(r)+'</small></th>').join('')+'</tr></thead><tbody>';
  COLS.forEach(c=>{const vals=rs.map(r=>c.id==='needs'?r.cells.needs.f.join(','):(CAT.includes(c.id)?r.cells[c.id].f:r.cells[c.id].v));const dif=new Set(vals).size>1;
    h+='<tr class="'+(dif&&(CAT.includes(c.id)||c.id==='needs')?'dif':'')+'"><th class="r">'+esc(c.short)+'</th>'+rs.map(r=>'<td>'+cellHtml(r,c.id)+'<small>'+esc(((A.sources[r.cells[c.id].s]||{}).t||'').split(',')[0]+' '+String((A.sources[r.cells[c.id].s]||{}).d||'').slice(0,4))+'</small></td>').join('')+'</tr>'});
  // shared taxonomy axes from t-tax
  (A.axes||[]).filter(a=>!a.col).forEach(a=>{const vals=rs.map(r=>r.tax[a.id].f);const dif=new Set(vals).size>1;
    h+='<tr class="'+(dif?'dif':'')+'"><th class="r">'+esc(a.name)+'</th>'+rs.map(r=>'<td>'+esc((a.vals.find(v=>v[0]===r.tax[a.id].f)||[0,''])[1])+'</td>').join('')+'</tr>'});
  h+='</tbody></table></div><p class="small mute">Bold rows differ on a categorical axis. The lower rows are the extra axes of the Taxonomy tab (derived from each row\'s first paper).</p>';
  el.innerHTML=h}
function drawCorr(){
  document.getElementById('at-corr-b').innerHTML=A.corrections.map((x,i)=>'<div class="corr"><div class="cl">'+esc(x.claim)+'</div><div>'+esc(x.truth)+' <button data-ci="'+i+'">see the source</button></div></div>').join('')}
function wire(){
  const wrap=document.getElementById('at-wrap');
  wrap.addEventListener('click',e=>{
    const ax=e.target.closest('a.axl');if(ax){e.preventDefault();AT.goTab('t-tax',ax.dataset.ax);return}
    const sb=e.target.closest('.sb');if(sb){const s=sb.dataset.s;if(st.sort===s)st.dir=-st.dir;else{st.sort=s;st.dir=1}drawGrid();return}
    const nm=e.target.closest('button.nm');if(nm){st.cell=null;AT.select(nm.dataset.r);detail(nm.dataset.r);drawGrid();return}
    const td=e.target.closest('td[data-c]');if(td){st.cell=[td.dataset.r,td.dataset.c];AT.select(td.dataset.r);detail(td.dataset.r,td.dataset.c);wrap.querySelectorAll('td.on').forEach(x=>x.classList.remove('on'));td.classList.add('on')}});
  wrap.addEventListener('keydown',e=>{if(e.key==='Enter'){const td=e.target.closest('td[data-c]');if(td)td.click()}});
  wrap.addEventListener('change',e=>{const cb=e.target.closest('input[data-r]');if(!cb)return;const id=cb.dataset.r,i=st.ticks.indexOf(id);
    if(cb.checked&&i<0){if(st.ticks.length>=3){cb.checked=false;document.getElementById('at-cnt').textContent='Three methods at most: untick one first.';return}st.ticks.push(id)}
    else if(!cb.checked&&i>=0)st.ticks.splice(i,1);
    cb.closest('tr').classList.toggle('sel',cb.checked);drawCmp()});
  document.getElementById('at-det').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){st.cell=[b.dataset.go,'fixed'];AT.select(b.dataset.go);detail(b.dataset.go,'fixed');drawGrid()}});
  document.getElementById('at-corr-b').addEventListener('click',e=>{const b=e.target.closest('[data-ci]');if(!b)return;const x=A.corrections[+b.dataset.ci];
    st.q='';for(const k in st.f)st.f[k]=[];st.needs=[];drawCtl();st.cell=x.cell;AT.select(x.cell[0]);detail(x.cell[0],x.cell[1]);drawGrid();AT.filterHooks.forEach(f=>f());
    document.getElementById('at-det').scrollIntoView({block:'nearest'})})}
let done=false;
function render(){if(!done){done=true;drawCorr();drawCtl();wire();detail('ppo');st.cell=null}drawGrid();drawCmp()}
AT.detail=detail;AT.drawGrid=drawGrid;
(window.TAB_RENDER=window.TAB_RENDER||{})['t-atlas']=(window.TAB_RENDER['t-atlas']||[]);
window.TAB_RENDER['t-atlas'].push(render);
})();

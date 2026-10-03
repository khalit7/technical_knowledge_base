// ---- Taxonomy (t-tax): every axis, one method on all axes, any two axes, the unified view ----
// Shares window.ATLAS (written into 33_js_atlas_a.js by src/atlas/mk_atlas.py) and the helpers in 33_js_atlas_b.js (window.AT);
// both are loaded before any tab renders.
(function(){
const st={m:'grpo',x:'data',y:'store'};
function val(r,a){return a.col?r.cells[a.col]:r.tax[a.id]}
function vlabel(a,f){const v=a.vals.find(z=>z[0]===f);return v?v[1]:f}
function chip(r,AT){return '<button class="mc'+(st.m===r.id?' sel':'')+'" data-m="'+r.id+'" title="'+AT.esc(r.name+', '+AT.year(r))+'">'+AT.esc(r.short)+'</button>'}
function drawOne(){
  const A=window.ATLAS,AT=window.AT,esc=AT.esc,r=AT.byId[st.m];
  document.getElementById('tx-one-ctl').innerHTML='<label>Method <select id="tx-m">'+A.lanes.map(l=>'<optgroup label="'+esc(l[1])+'">'+A.rows.filter(z=>z.lane===l[0]).map(z=>'<option value="'+z.id+'"'+(z.id===st.m?' selected':'')+'>'+esc(z.name)+' ('+AT.year(z)+')</option>').join('')+'</optgroup>').join('')+'</select></label><button id="tx-open">Open it in the atlas</button>';
  let h='<div class="hmwrap" style="border:0"><table class="one"><tbody>';
  A.axes.forEach(a=>{const x=val(r,a);
    h+='<tr><th>'+esc(a.name)+'<a href="#" data-sec="tx-ax-'+a.id+'">the axis</a></th><td>'+a.vals.map(v=>'<span class="pill'+(v[0]===x.f?' on':'')+'">'+esc(v[1])+'</span>').join('')+(x.k==='unc'?'<span class="kd unc">unconfirmed</span>':'')+
      '<small>'+(a.col?esc(x.v)+'. ':'')+(x.n?esc(x.n)+' ':'')+'Source: '+AT.srcLink(x.s,x.l)+(x.k==='pub'?'':' (placement derived here)')+'</small></td></tr>'});
  h+='</tbody></table></div>';
  document.getElementById('tx-one').innerHTML=h}
function drawTwo(){
  const A=window.ATLAS,AT=window.AT,esc=AT.esc;
  const opts=sel=>A.axes.map(a=>'<option value="'+a.id+'"'+(a.id===sel?' selected':'')+'>'+esc(a.name)+'</option>').join('');
  document.getElementById('tx-two-ctl').innerHTML='<label>Across <select id="tx-x">'+opts(st.x)+'</select></label><label>Down <select id="tx-y">'+opts(st.y)+'</select></label><button id="tx-swap">Swap</button>';
  const ax=A.axes.find(a=>a.id===st.x),ay=A.axes.find(a=>a.id===st.y);
  const xs=ax.vals.filter(v=>A.rows.some(r=>val(r,ax).f===v[0])),ys=ay.vals.filter(v=>A.rows.some(r=>val(r,ay).f===v[0]));
  const el=document.getElementById('tx-two');el.style.gridTemplateColumns='minmax(4.6em,5.6em) repeat('+xs.length+',minmax(4.4em,1fr))';el.style.minWidth=xs.length>4?(4.6+xs.length*4.6)+'em':'0';
  let h='<div></div>'+xs.map(x=>'<div class="hd">'+esc(x[1])+'</div>').join(''),empty=0;
  ys.forEach(y=>{h+='<div class="rh">'+esc(y[1])+'</div>';xs.forEach(x=>{const ms=A.rows.filter(r=>val(r,ax).f===x[0]&&val(r,ay).f===y[0]);if(!ms.length)empty++;
    h+='<div class="cell'+(ms.length?'':' empty')+'">'+ms.map(r=>chip(r,AT)).join('')+'</div>'})});
  el.innerHTML=h;
  const hid=ax.vals.length-xs.length+ay.vals.length-ys.length;
  document.getElementById('tx-two-note').textContent=(st.x===st.y?'Both directions show the same axis, so only the diagonal is filled. ':'')+empty+' of '+(xs.length*ys.length)+' combinations hold no atlas method.'+(hid?' Values no atlas method takes are left out ('+hid+').':'')}
function drawUV(){
  const A=window.ATLAS,AT=window.AT,esc=AT.esc;
  const d=A.axes.find(a=>a.id==='depth'),w=A.axes.find(a=>a.id==='width');
  const corner={'one|sample':'Temporal-difference','one|exp':'Dynamic programming','full|sample':'Monte Carlo','full|exp':'Exhaustive search'};
  let h='<div></div><div class="hd">Sample updates</div><div class="hd">Expected updates</div>';
  [['one','One step (bootstraps)'],['multi','Several steps'],['full','Full return']].forEach(dd=>{h+='<div class="rh">'+dd[1]+'</div>';
    ['sample','exp'].forEach(ww=>{const ms=A.rows.filter(r=>r.tax.depth.f===dd[0]&&r.tax.width.f===ww);const c=corner[dd[0]+'|'+ww];
      h+='<div class="cell">'+(c?'<span class="corner">'+c+'</span>':'')+(ms.length?ms.map(r=>chip(r,AT)).join(''):'<span class="small mute">'+(c==='Exhaustive search'?'no atlas method: intractable beyond tiny problems':'none in the atlas')+'</span>')+'</div>'})});
  h+='<div></div><div class="ax">width of the update &rarr;</div>';
  document.getElementById('tx-uv').innerHTML=h;
  const none=A.rows.filter(r=>r.tax.depth.f==='none');
  const a=A.axes.find(x=>x.id==='depth');
  document.getElementById('tx-uv-q').innerHTML='"'+esc(a.q[1])+'" '+AT.srcLink(a.q[0],'8.13, Figure 8.11')+'. Not on the square, because they estimate no return: '+none.map(r=>chip(r,AT)).join(' ')+'. Tree search (AlphaZero, MuZero) sits in the interior in the book\'s terms; here it is placed by how its networks are trained.'}
function drawAxes(){
  const A=window.ATLAS,AT=window.AT,esc=AT.esc;
  document.getElementById('tx-nav').innerHTML=A.axes.map(a=>'<a href="#" data-sec="tx-ax-'+a.id+'">'+esc(a.name)+'</a>').join('');
  document.getElementById('tx-axes').innerHTML=A.axes.map(a=>{
    const counts=a.vals.map(v=>[v[1],A.rows.filter(r=>val(r,a).f===v[0]).length]).filter(c=>c[1]);
    return '<div class="axsec" id="tx-ax-'+a.id+'"><h3>'+esc(a.name)+'</h3><p>'+AT.prose(a.defn)+'</p>'+(a.q?AT.quoteHtml(a.q[1],a.q[0]):'')+
      '<div class="sides">'+a.sides.map(s=>'<div class="side"><b>'+esc(s[0])+'</b>'+esc(s[1])+'<div>'+s[2].map(id=>chip(AT.byId[id],AT)).join('')+'</div></div>').join('')+'</div>'+
      '<div class="co warn"><div class="t">Common misconception</div>'+AT.prose(a.mis)+(a.q2?AT.quoteHtml(a.q2[1],a.q2[0]):'')+'</div>'+
      '<div class="co"><div class="t">Where the boundary blurs</div>'+AT.prose(a.blur)+'</div>'+
      '<p class="dist">The atlas\'s 47 methods on this axis: '+counts.map(c=>esc(c[0])+' '+c[1]).join(', ')+'.</p></div>'}).join('')}
function wire(){
  const root=document.getElementById('t-tax');
  root.addEventListener('click',e=>{
    const s=e.target.closest('a[data-sec]');if(s){e.preventDefault();const t=document.getElementById(s.dataset.sec);if(t)t.scrollIntoView({block:'start'});return}
    const m=e.target.closest('.mc[data-m]');if(m){st.m=m.dataset.m;drawOne();drawTwo();drawUV();refreshChips();document.getElementById('tx-one-h').scrollIntoView({block:'start'});return}
    if(e.target.id==='tx-swap'){const t=st.x;st.x=st.y;st.y=t;drawTwo();return}
    if(e.target.id==='tx-open'){window.AT.goTab('t-atlas','at-det');window.AT.select(st.m);window.AT.detail(st.m);return}});
  root.addEventListener('change',e=>{if(e.target.id==='tx-m'){st.m=e.target.value;drawOne();drawTwo();drawUV();refreshChips()}
    if(e.target.id==='tx-x'){st.x=e.target.value;drawTwo()}if(e.target.id==='tx-y'){st.y=e.target.value;drawTwo()}})}
function refreshChips(){document.querySelectorAll('#tx-axes .mc').forEach(b=>b.classList.toggle('sel',b.dataset.m===st.m))}
let done=false;
function render(){if(!window.ATLAS||!window.AT)return;if(!done){done=true;wire();drawAxes()}drawOne();drawTwo();drawUV();refreshChips()}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tax']=(window.TAB_RENDER['t-tax']||[]);
window.TAB_RENDER['t-tax'].push(render);
})();

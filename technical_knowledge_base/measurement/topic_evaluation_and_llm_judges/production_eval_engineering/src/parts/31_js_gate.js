// Gate designer: any champion and challenger among the 34 MT-Bench models, every threshold exposed.
(function(){
const C=window.PEC;const $=id=>document.getElementById(id);if(!C||!$('t-gate'))return;
const names=C.models.map(m=>m.name);
const opt=sel=>names.map(n=>'<option'+(n===sel?' selected':'')+'>'+n+'</option>').join('');
$('gd-a').innerHTML=opt('claude-v1');$('gd-b').innerHTML=opt('claude-instant-v1');
function o(){return{aggTol:+$('gd-at').value,sliceTol:+$('gd-st').value,conf:+$('gd-cf').value,escalate:$('gd-esc').checked,aggSig:$('gd-sig').checked}}
function bars(list,tol){
  const w=Math.max(300,$('gd-bars').clientWidth||600),lw=w<480?78:100,rw=60,x0=lw,x1=w-rw;
  let lo=-3,hi=3;list.forEach(r=>{lo=Math.min(lo,Math.floor(r.lo));hi=Math.max(hi,Math.ceil(r.hi))});
  const X=v=>x0+(v-lo)/(hi-lo)*(x1-x0),rh=22,h=list.length*rh+36,step=hi-lo>8?2:1;
  let s='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="Paired change per slice">';
  s+='<rect x="'+x0+'" y="4" width="'+Math.max(0,X(-tol)-x0)+'" height="'+(list.length*rh+4)+'" fill="var(--bad)" fill-opacity=".08"/>';
  for(let v=lo;v<=hi;v+=step){s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="4" y2="'+(8+list.length*rh)+'" stroke="'+(v===0?'var(--mute)':'var(--line)')+'"/><text x="'+X(v)+'" y="'+(22+list.length*rh)+'" font-size="10.5" fill="var(--mute)" text-anchor="middle">'+(v>0?'+':v<0?'−':'')+Math.abs(v)+'</text>'}
  s+='<line x1="'+X(-tol)+'" x2="'+X(-tol)+'" y1="4" y2="'+(8+list.length*rh)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>';
  list.forEach((r,k)=>{const y=8+k*rh+rh/2,col=r.v==='fail'?'var(--bad)':r.v==='escalate'?'var(--c5)':'var(--good)';
    s+='<text x="'+(lw-6)+'" y="'+(y+4)+'" font-size="12" text-anchor="end"'+(r.cat==='all'?' font-weight="600"':'')+'>'+r.label+'</text><line x1="'+X(r.lo)+'" x2="'+X(r.hi)+'" y1="'+y+'" y2="'+y+'" stroke="'+col+'" stroke-width="2"/><circle cx="'+X(r.mean)+'" cy="'+y+'" r="4.5" fill="'+col+'"/><text x="'+(w-2)+'" y="'+(y+4)+'" font-size="11.5" font-weight="600" text-anchor="end" fill="'+col+'">'+(r.v==='fail'?'FAIL':r.v==='escalate'?'REVIEW':'pass')+'</text>'});
  s+='<text x="'+((x0+x1)/2)+'" y="'+(h-2)+'" font-size="10.5" fill="var(--mute)" text-anchor="middle">'+(w<480?'challenger minus champion, points':'challenger minus champion, points (shaded: past the slice threshold)')+'</text>';
  $('gd-bars').innerHTML=s+'</svg>';
}
let allCache=null,allKey='';
function draw(){
  const O=o();$('gd-atv').textContent=O.aggTol.toFixed(2);$('gd-stv').textContent=O.sliceTol.toFixed(2);
  const A=C.byName[$('gd-a').value].s,B=C.byName[$('gd-b').value].s;
  if($('gd-a').value===$('gd-b').value){$('gd-out').innerHTML='<div class="stat"><div class="k">Pick two different models</div><div class="v">...</div></div>';$('gd-bars').innerHTML='';$('gd-tab').innerHTML='';drawAll(O);return}
  const G=C.gate(A,B,O),nf=G.slices.filter(r=>r.v==='fail').length,ne=G.slices.filter(r=>r.v==='escalate').length;
  const sv=nf?'fail':ne?'review':'pass';
  $('gd-out').innerHTML=[['Aggregate change',C.f(G.agg.mean),'interval '+C.n(G.agg.lo)+' to '+C.n(G.agg.hi)+', '+G.agg.n+' pairs'],['Aggregate gate',G.aggV,'one threshold'],['Per-slice gate',sv,nf+' fail, '+ne+' to review'],['Worse / level / better',G.agg.worse+' / '+G.agg.same+' / '+G.agg.better,'graded turns']]
    .map(k=>'<div class="stat"><div class="k">'+k[0]+'</div><div class="v'+(/fail/.test(k[1])?' bad':/pass/.test(k[1])?' good':'')+'">'+k[1]+'</div><div class="d">'+k[2]+'</div></div>').join('');
  bars(G.slices.map(r=>Object.assign({},r,{label:C.CATN[r.cat]})),O.sliceTol);
  const mA=c=>C.mean(A.filter((x,i)=>C.catOf[i]===c)),mB=c=>C.mean(B.filter((x,i)=>C.catOf[i]===c));
  $('gd-tab').innerHTML='<thead><tr><th>Slice</th><th class="num">n</th><th class="num">Champion</th><th class="num">Challenger</th><th class="num">Δ</th><th class="num">Interval</th><th>Verdict</th></tr></thead><tbody>'+
    G.slices.map(r=>'<tr><td>'+C.CATN[r.cat]+'</td><td class="num">'+r.n+'</td><td class="num">'+mA(r.cat).toFixed(2)+'</td><td class="num">'+mB(r.cat).toFixed(2)+'</td><td class="num">'+C.f(r.mean)+'</td><td class="num">'+C.n(r.lo)+' to '+C.n(r.hi)+'</td><td class="v-'+r.v+'">'+(r.v==='escalate'?'review':r.v)+'</td></tr>').join('')+
    '<tr><td><b>All</b></td><td class="num">'+G.agg.n+'</td><td class="num">'+C.mean(A).toFixed(2)+'</td><td class="num">'+C.mean(B).toFixed(2)+'</td><td class="num">'+C.f(G.agg.mean)+'</td><td class="num">'+C.n(G.agg.lo)+' to '+C.n(G.agg.hi)+'</td><td class="v-'+G.aggV+'">'+G.aggV+' (aggregate)</td></tr></tbody>';
  drawAll(O);
}
function drawAll(O){
  const key=JSON.stringify(O);
  if(key!==allKey){allKey=key;allCache=[];
    C.models.forEach(a=>C.models.forEach(b=>{if(a===b)return;const G=C.gate(a.s,b.s,O);
      allCache.push({a:a.name,b:b.name,agg:G.agg.mean,aggV:G.aggV,fail:G.slices.filter(r=>r.v==='fail'),esc:G.slices.filter(r=>r.v==='escalate').length})}))}
  const passAgg=allCache.filter(x=>x.aggV==='pass'),hidden=passAgg.filter(x=>x.fail.length);
  $('gd-all-p').innerHTML='Every ordered pair of the 34 models, as champion and challenger, through the current settings: the aggregate gate passes <b>'+passAgg.length+'</b> of '+allCache.length+' swaps; in <b>'+hidden.length+'</b> of those the per-slice gate fails at least one slice. These are regressions an aggregate gate ships. The closest calls (smallest aggregate change) are listed first; click one to load it above.';
  const rows=hidden.slice().sort((x,y)=>Math.abs(x.agg)-Math.abs(y.agg)).slice(0,12);
  $('gd-all').innerHTML='<thead><tr><th>Champion</th><th>Challenger</th><th class="num">Aggregate Δ</th><th>Slices that fail</th></tr></thead><tbody>'+rows.map(x=>'<tr data-a="'+x.a+'" data-b="'+x.b+'" style="cursor:pointer"><td>'+x.a+'</td><td>'+x.b+'</td><td class="num">'+C.f(x.agg)+'</td><td>'+x.fail.map(r=>C.CATN[r.cat]+' '+C.f(r.mean)).join(', ')+'</td></tr>').join('')+'</tbody>';
  [...$('gd-all').querySelectorAll('tr[data-a]')].forEach(tr=>tr.onclick=()=>{$('gd-a').value=tr.dataset.a;$('gd-b').value=tr.dataset.b;draw();$('gd-a').scrollIntoView({block:'center'})});
}
['gd-a','gd-b','gd-cf','gd-sig','gd-esc'].forEach(id=>$(id).addEventListener('change',draw));
['gd-at','gd-st'].forEach(id=>$(id).addEventListener('input',draw));
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-gate').hidden)draw()},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-gate']=[draw];
})();

// ---- Exercises lab: graded in the page's SQLite by comparing the reader's last result set with the reference solution's ----
window.EXLAB=(function(){
  const X=window.SM_DATA.xs,esc=RD.esc,$=id=>document.getElementById(id);
  if(!$('ex-list'))return {};
  const KEY='sqlm-ex-v1';let solved={};try{solved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){solved={}}
  const drafts={};let cur=0,lv=0;
  const LV=['','warm-up','core','harder','pro'];
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(solved))}catch(e){}};
  // ---- grading (same rule as src/check_page.mjs) ----
  const normV=v=>{if(v===null||v===undefined)return null;if(typeof v==='number')return Math.round(v*1e6)/1e6;if(typeof v==='boolean')return v?1:0;return String(v)};
  const key=r=>JSON.stringify(r.map(normV));
  function lastRows(rs){for(let i=rs.length-1;i>=0;i--)if(rs[i].cols)return rs[i];return null}
  function grade(mine,exp,ordered){
    if(!mine)return {ok:false,why:'Your query returned no result set (only statements that change data, or an error).'};
    if(mine.cols.length!==exp.cols.length)return {ok:false,why:'Expected <b>'+exp.cols.length+'</b> column'+(exp.cols.length>1?'s':'')+', got <b>'+mine.cols.length+'</b>.'};
    const a=mine.rows.map(key),b=exp.rows.map(key);
    if(a.length!==b.length)return {ok:false,why:'Expected <b>'+b.length+'</b> row'+(b.length===1?'':'s')+', got <b>'+a.length+'</b>.'};
    if(ordered){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return {ok:false,why:'Row '+(i+1)+' differs (this exercise checks the order too).'};return {ok:true}}
    const sa=a.slice().sort(),sb=b.slice().sort();for(let i=0;i<sa.length;i++)if(sa[i]!==sb[i]){
      const miss=b.find(k=>!a.includes(k));return {ok:false,why:'Same number of rows, different values'+(miss?': for example the expected row <code>'+esc(miss)+'</code> is missing':'')+'.'}}
    return {ok:true}}
  function runAll(sql){const db=SM.fresh();try{return SQRUN.run(db,sql,100000)}finally{db.close()}}
  function table(r,cap){if(!r)return '<p class="small mute">no rows</p>';cap=cap||10;
    return '<div class="tw2"><table class="rt"><tr>'+r.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>'+r.rows.slice(0,cap).map(row=>'<tr>'+row.map(SM.cell).join('')+'</tr>').join('')+'</table></div><p class="small mute">'+(r.rows.length>cap?'first '+cap+' of ':'')+r.rows.length+' row'+(r.rows.length===1?'':'s')+'</p>'}
  function expected(x){if(SM.S.SQL){const r=lastRows(runAll(x.sol));if(r)return {cols:r.cols,rows:r.rows}}return x.exp}
  // ---- UI ----
  function list(){const h=X.map((x,i)=>(lv&&x.level!==lv)?'':'<button role="tab" data-i="'+i+'" class="'+(solved[x.id]?'ok ':'')+(i===cur?'cur':'')+'" title="'+esc(x.title)+'" aria-selected="'+(i===cur)+'">'+(i+1)+(solved[x.id]?' &#10003;':'')+'</button>').join('');
    $('ex-list').innerHTML=h;const n=X.filter(x=>solved[x.id]).length;$('ex-count').textContent=n+' of '+X.length+' solved';$('ex-meter').style.width=(100*n/X.length)+'%'}
  function show(i){if(cur!==i)drafts[X[cur].id]=$('ex-ed').value;cur=i;const x=X[i];
    $('ex-kick').innerHTML='Exercise '+(i+1)+' of '+X.length+' <span class="lv l'+x.level+'">'+x.level+' '+LV[x.level]+'</span> '+esc(x.topic)+(x.ordered?' <span class="small">(order checked)</span>':'');
    $('ex-title').textContent=x.title;$('ex-prompt').textContent=x.prompt;
    $('ex-ed').value=drafts[x.id]!==undefined?drafts[x.id]:'-- your query\nSELECT ';
    $('ex-hint').hidden=true;$('ex-hint').textContent=x.hint;$('ex-verdict').innerHTML='';$('ex-mine').innerHTML='';
    $('ex-exp').innerHTML='<p class="small mute">Shown after you check, or with the solution.</p>';$('ex-soldet').hidden=true;$('ex-soldet').open=false;$('ex-sol').textContent=x.sol;list()}
  function check(){const x=X[cur];
    if(!SM.S.SQL){$('ex-verdict').innerHTML='<div class="verdict no">'+(SM.S.fail?'The in-page database could not start in this browser ('+esc(SM.S.fail)+'), so answers cannot be checked here. The expected result and the solution are still shown.':'The database is still starting; try again in a moment.')+'</div>';$('ex-exp').innerHTML=table(x.exp);return}
    const rs=runAll($('ex-ed').value);const err=rs.find(r=>r.error);const mine=lastRows(rs);const exp=expected(x);
    let g=err&&!mine?{ok:false,why:'Error: <code>'+esc(err.error)+'</code>'}:grade(mine,exp,x.ordered);
    if(err&&mine&&g.ok)g={ok:true};
    $('ex-verdict').innerHTML=g.ok?'<div class="verdict ok">Correct.'+(solved[x.id]?'':' Saved as solved.')+'</div>':'<div class="verdict no"><b>Not yet.</b> '+g.why+'</div>';
    $('ex-mine').innerHTML=err&&!mine?'<div class="st err"><div class="r"><div class="e">'+esc(err.error)+'</div></div></div>':table(mine);$('ex-exp').innerHTML=table(exp);
    if(g.ok){solved[x.id]=1;save();list()}}
  $('ex-list').addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});
  $('ex-go').addEventListener('click',()=>SM.start().then(check));
  $('ex-ed').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();SM.start().then(check)}});
  $('ex-hintb').addEventListener('click',()=>{$('ex-hint').hidden=!$('ex-hint').hidden});
  $('ex-solb').addEventListener('click',()=>{$('ex-soldet').hidden=false;$('ex-soldet').open=true;$('ex-exp').innerHTML=table(expected(X[cur]))});
  $('ex-reset').addEventListener('click',()=>{$('ex-ed').value='-- your query\nSELECT ';delete drafts[X[cur].id]});
  $('ex-prev').addEventListener('click',()=>show((cur+X.length-1)%X.length));
  $('ex-next').addEventListener('click',()=>show((cur+1)%X.length));
  $('ex-clear').addEventListener('click',()=>{solved={};save();list()});
  RD.seg($('ex-lv'),v=>{lv=+v;if(lv&&X[cur].level!==lv){const k=X.findIndex(x=>x.level===lv);if(k>=0)show(k);else list()}else list()});
  SM.onReady(ok=>{$('ex-status').innerHTML=ok?'<span style="color:var(--good);font-weight:600">Ready.</span> SQLite '+esc(SM.S.ver)+' in this page, started in '+SM.S.ms+' ms with the chat data and parent_id.':'The in-page database could not start here ('+esc(SM.S.fail)+'): exercises cannot be checked, but every prompt, hint, solution and expected result is shown.'});
  show(0);
  return {grade,lastRows,runAll,X};
})();

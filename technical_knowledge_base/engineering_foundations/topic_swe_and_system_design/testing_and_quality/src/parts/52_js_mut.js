// ---- Mutation lab ----
(function(){
  const TQ=window.TQ,M=TQ.mut,esc=RD.esc;
  const ids=M.tests.map(t=>t.id);
  let sel=new Set(M.tests.filter(t=>t.suite==='weak').map(t=>t.id)), cur=null;
  // fewest tests that kill every mutant: exhaustive over 2^10 subsets (checked in recompute.py)
  let best=null;
  for(let m=1;m<(1<<ids.length);m++){const s=ids.filter((_,i)=>m>>i&1);if(best&&s.length>=best.length)continue;if(TQ.killed(s).length===M.mutants.length)best=s}
  TQ.calc.minSet=best.length; TQ.calc.minSetIds=best;
  const short=id=>id.replace('test_weak.','weak: ').replace('test_strong.','improved: ');
  const tl=document.getElementById('ml-tests');
  tl.innerHTML=['weak','strong'].map(g=>'<div class="grp">'+(g==='weak'?'Weak suite (3 tests)':'Improved suite (7 test functions, 23 cases)')+'</div>'+
    M.tests.filter(t=>t.suite===g).map(t=>'<label><input type="checkbox" data-id="'+t.id+'"><code>'+esc(t.name)+'</code><span class="c">'+(t.cases>1?t.cases+' cases':'1 case')+'</span></label>').join('')).join('');
  function render(){
    const s=[...sel];
    tl.querySelectorAll('input').forEach(i=>i.checked=sel.has(i.dataset.id));
    const killed=TQ.killed(s),cov=TQ.covered(s);
    const crash=killed.filter(m=>m.kind==='crash').length;
    document.getElementById('ml-stats').innerHTML=RD.stat('Tests selected',s.length+' of '+ids.length)+
      RD.stat('Line coverage',(100*cov.length/M.stmts.length).toFixed(0)+'%',cov.length+' of '+M.stmts.length+' statements')+
      RD.stat('Mutation score',(100*killed.length/M.mutants.length).toFixed(0)+'%',killed.length+' of '+M.mutants.length+' killed')+
      RD.stat('Kills by crash',String(crash),'the rest checked a value')+
      RD.stat('Survivors',String(M.mutants.length-killed.length),'bugs this selection would ship');
    const curM=cur!=null?M.mutants[cur]:null;
    const hotLine=curM?M.src.findIndex(l=>l.trim()===curM.orig.trim()||(curM.orig.startsWith('def ')&&l.startsWith(curM.orig.slice(0,curM.orig.indexOf('(')))))+1:-1;
    const cs=new Set(cov);
    document.getElementById('ml-src').innerHTML=M.src.map((l,i)=>{const n=i+1,st=M.stmts.indexOf(n)>=0;
      return '<span class="l'+(st?(cs.has(n)?' cov':' unc'):'')+(n===hotLine?' hot':'')+'"><span class="g">'+n+'</span>'+RD.hl(l,true)+'</span>'}).join('');
    document.getElementById('ml-list').innerHTML=M.mutants.map((m,i)=>{const by=m.by.filter(b=>sel.has(b));const k=by.length>0;
      return '<div class="mrow'+(i===cur?' sel':'')+'" data-i="'+i+'"><span class="id"><b>'+esc(m.id)+'</b><span class="mk">'+m.kind+'</span></span><span><code class="o">'+esc(m.orig)+'</code><code>'+esc(m.mut)+'</code></span><span class="st '+(k?'k':'s')+'">'+(k?'killed':'survived')+'<span class="mk">'+(k?by.length+' test'+(by.length>1?'s':''):'no test fails')+'</span></span></div>'}).join('');
    const why=document.getElementById('ml-why');
    if(!curM){why.innerHTML='<b>Click a mutant</b> below to see its line in the source and the test that catches it.'+(best&&s.length===best.length&&s.every(x=>best.indexOf(x)>=0)?' <br>This is the smallest selection that kills all '+M.mutants.length+': '+best.length+' test functions ('+best.map(x=>'<code>'+esc(short(x))+'</code>').join(', ')+'), found by trying all '+((1<<ids.length)-1)+' non-empty subsets.':'');return}
    const by=curM.by.filter(b=>sel.has(b)),t=M.tests.find(x=>x.id===(by[0]||curM.by[0]));
    why.innerHTML='<b>'+esc(curM.id)+'</b>: <code>'+esc(curM.orig)+'</code> became <code>'+esc(curM.mut)+'</code> ('+curM.kind+', '+curM.cases+' failing test case'+(curM.cases>1?'s':'')+' across both suites).<br>'+
      (by.length?'Killed by your selection: '+by.map(b=>'<code>'+esc(short(b))+'</code>').join(', ')+'. One of them:':'<span style="color:var(--bad);font-weight:600">No selected test fails: this bug ships.</span> A test that would catch it:')+
      '<pre class="tc">'+esc(t.code)+'</pre>';
  }
  tl.addEventListener('change',e=>{const i=e.target.closest('input');if(!i)return;i.checked?sel.add(i.dataset.id):sel.delete(i.dataset.id);
    document.querySelectorAll('#ml-pre button').forEach(b=>b.classList.remove('on'));render()});
  document.getElementById('ml-list').addEventListener('click',e=>{const r=e.target.closest('.mrow');if(!r)return;cur=+r.dataset.i===cur?null:+r.dataset.i;render()});
  RD.seg(document.getElementById('ml-pre'),p=>{cur=null;
    sel=new Set(p==='weak'?M.tests.filter(t=>t.suite==='weak').map(t=>t.id):p==='strong'?M.tests.filter(t=>t.suite==='strong').map(t=>t.id):p==='all'?ids:p==='min'?best:[]);render()});
  render();
})();

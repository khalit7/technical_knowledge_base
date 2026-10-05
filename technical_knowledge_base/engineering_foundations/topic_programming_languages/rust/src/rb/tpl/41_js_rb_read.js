// ---- Part 2 Reading: phases chart, ladder summary, abi3 table, alternatives chart ----
(function(){
  const X=window.RBX,RB=X.RB,fmt=X.fmt,esc=X.esc;
  const PH_COL={'read lines':'var(--mute)','read file':'var(--mute)','Python: json.loads':'var(--c2)','count tokens':'var(--c4)','Rust: count (with crossings)':'var(--c3)','Python: add per user':'var(--c5)','Rust: parse + count':'var(--c3)'};
  const STEPS=[
    {id:'python',n:0,name:'Pure Python',chg:'The Rosetta program, cut into phases: json.loads per line, a Python loop per character'},
    {id:'percall',n:1,name:'Rust counts, per call',chg:'count_tokens(text: &str) called 199,992 times'},
    {id:'owned',n:2,name:'One call, copied',chg:'count_many_owned(Vec<String>): one crossing, every string copied'},
    {id:'borrowed',n:3,name:'One call, borrowed',chg:'count_many(&Bound<PyList>): one crossing, &str views'},
    {id:'bytes',n:4,name:'Rust parses and counts',chg:'tally_bytes(&[u8]): Python reads bytes; serde parses, Rust counts and tallies'},
    {id:'parallel',n:5,name:'Detached, 8 threads',chg:'tally_bytes_parallel: py.detach plus rayon over 8 chunks'}];
  X.STEPS=STEPS;X.PH_COL=PH_COL;
  // stacked phase bars: el, list of step ids, scale max (ms) or auto
  X.phaseBars=function(el,ids,o){o=o||{};const P=RB.phases||{};const tot=id=>Object.values(P[id]||{}).reduce((a,b)=>a+b,0);
    const max=o.max||Math.max(...ids.map(tot));const seen={};
    let h='<div class="rb-pb">';ids.forEach(id=>{const s=STEPS.find(x=>x.id===id);const ph=P[id]||{};
      h+='<div class="rb-pbr"><div class="rb-pbl">'+s.n+'. '+esc(s.name)+' <span class="mute">'+fmt(tot(id),0)+' ms</span></div><div class="rb-pbt">'+
        Object.entries(ph).map(([k,v])=>{seen[k]=1;return '<span title="'+esc(k)+': '+fmt(v,1)+' ms" style="width:'+(v/max*100).toFixed(2)+'%;background:'+(PH_COL[k]||'var(--acc)')+'"></span>'}).join('')+'</div></div>'});
    h+='</div><div class="hmleg">'+Object.keys(seen).map(k=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+PH_COL[k]+'"/></svg>'+esc(k)+'</span>').join('')+'</div>';
    el.innerHTML=h};
  function ladderRows(hl){const L=RB.L;return STEPS.map(s=>({label:s.n+'. '+s.name,v:L[s.id].median,lo:L[s.id].min,hi:L[s.id].max,
      color:s.id==='python'?'var(--c2)':'var(--c3)',hl:s.id===hl}))}
  X.ladderRows=ladderRows;
  function draw(){
    const ph=document.getElementById('rb-ph');if(ph)X.phaseBars(ph,['python','borrowed']);
    const lm=document.getElementById('rb-lad-mini');if(lm){X.bars(lm,ladderRows().concat([{label:'root: Rust binary alone',v:RB.root.rust,color:'var(--dim)'}]),{unit:' s',d:3})}
    const tb=document.getElementById('rb-lad-tb');if(tb){const p0=RB.L.python.median;tb.innerHTML=STEPS.map(s=>'<tr><td>'+s.n+'. '+esc(s.name)+'</td><td><code>'+esc(s.chg)+'</code></td><td class="num">'+fmt(RB.L[s.id].median,3)+' s</td><td class="num">'+fmt(p0/RB.L[s.id].median,1)+'x</td></tr>').join('')}
    const at=document.getElementById('rb-abi-tb');if(at&&RB.abi&&RB.abi.length===2){const [a,b]=RB.abi;
      const rows=[['noop','empty call, per call'],['count_tokens','count_tokens(t), per call'],['total_len','list of str to &str, per item'],['count_many','count_many, per message'],['sum_sq_array','NumPy sum of squares, per float']];
      at.innerHTML=rows.map(([k,l])=>'<tr><td>'+l+'</td><td class="num">'+fmt(a[k].med,1)+'</td><td class="num">'+fmt(b[k].med,1)+'</td></tr>').join('')}
    const al=document.getElementById('rb-alts');if(al){const A=RB.alts,R=RB.root;
      const rows=[['Python loop','python','var(--c2)'],['re.findall (C regex)','regex','var(--c2)'],['mypyc','mypyc','var(--c5)'],['Cython, C types','cython','var(--c5)'],['Numba, arrays ready','numba','var(--c6)'],['Numba, incl. preparing','numba_with_prepare','var(--c6)'],['Rust via PyO3','pyo3','var(--c3)']]
        .map(([l,k,c])=>({label:l,v:A[k].med,lo:A[k].min,hi:A[k].max,color:c,hl:k==='pyo3'}));
      rows.push({label:'root: nanobind (C++)',v:R.msg_nanobind_batch,color:'var(--dim)'},{label:'root: pybind11 (C++)',v:R.msg_pybind11_batch,color:'var(--dim)'});
      X.bars(al,rows,{unit:' ns',d:0,log:true})}
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-rb-read']=window.TAB_RENDER['t-rb-read']||[]).push(draw);
  draw();
})();

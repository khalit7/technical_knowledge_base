// ---- Benchmark tab (t-bench): every number comes from window.BM_DATA (32_js_bm_data.js, generated) ----
(function(){
  const D=window.BM_DATA;if(!D)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const V={};D.variants.forEach(v=>V[v.id]=v);
  const COL={py:'var(--c1)',cpp:'var(--c2)',rs:'var(--c3)',ts:'var(--c4)',mix:'var(--c6)'};
  const LANG={py:'Python',cpp:'C++',rs:'Rust',ts:'TypeScript',mix:'Python + native'};
  // number formats
  const sig=(x,n)=>{if(x===0)return '0';const d=Math.max(0,n-1-Math.floor(Math.log10(Math.abs(x))));return x.toFixed(Math.min(d,4))};
  const fs=x=>x<1?sig(x*1000,3)+' ms':sig(x,3)+' s';
  const F={s:fs,ms:x=>sig(x,3)+' ms',ns:x=>(x<1?x.toFixed(2):sig(x,3))+' ns',load:x=>x.replace(/[{}]/g,'').trim().split(/\s+/).join(', '),ver:x=>'version '+x.replace('Version ',''),date:x=>{const d=new Date(x.replace('Z',':00Z'));return isNaN(d)?x:d.getUTCDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][d.getUTCMonth()]+' '+d.getUTCFullYear()},int:x=>Math.round(x).toLocaleString('en-US'),mb:x=>(x/1e6).toFixed(1),
    mbv:x=>String(x),kb:x=>Math.round(x/1024).toLocaleString('en-US'),ns2s:x=>fs(x*1e-9),x:x=>(x>=10?Math.round(x):sig(x,2))+'×'};
  function get(path){let cur=D;for(const p of path.split('.')){if(Array.isArray(cur))cur=cur.find(o=>o.id===p||o.label===p);else cur=cur==null?undefined:cur[p];if(cur===undefined)return undefined}return cur}
  // fill placeholders: data-bm="path" (data-f = format) and data-bmr="a/b" (ratio, shown as N×)
  document.querySelectorAll('#t-bench [data-bm]').forEach(el=>{const v=get(el.dataset.bm);const f=F[el.dataset.f];el.textContent=v===undefined?'?':(f?f(v):String(v))});
  document.querySelectorAll('#t-bench [data-bmd]').forEach(el=>{const [a,b]=el.dataset.bmd.split('*');const f=F[el.dataset.f];el.textContent=f(get(a)*get(b))});
  document.querySelectorAll('#t-bench [data-bmr]').forEach(el=>{const [a,b]=el.dataset.bmr.split('/');el.textContent=F.x(get(a)/get(b))});

  // ---- header stats ----
  const tv=D.variants.slice().sort((a,b)=>a.t_med-b.t_med);
  const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  $('bm-head').innerHTML=st('Machine',esc(D.env.cpu),esc(D.env.cores))+
    st('Fastest',fs(tv[0].t_med),esc(tv[0].label))+
    st('Plain Python loop, 3.14',fs(V.py314_loop.t_med),'the Rosetta program as written')+
    st('Variants measured',D.variants.length,'each printed the expected output first');

  // ---- generic horizontal bars (label line above each bar so nothing clips at phone width) ----
  // rows: {id, nm, v, lo, hi, dots, col, txt, sub}
  function bars(el,rows,o){o=o||{};
    const W=Math.max(260,el.clientWidth||Math.min(860,(document.documentElement.clientWidth||900)-60));
    const vals=rows.flatMap(r=>[r.v,r.hi||r.v,r.lo||r.v]).filter(x=>x>0);
    const vmax=Math.max(...vals),vmin=Math.min(...vals);
    const log=!!o.log, padR=4;
    const lo=log?vmin/1.6:0, hi=log?vmax*1.25:vmax*1.04;
    const X=v=>{const w=W-padR;if(log)return w*Math.log(v/lo)/Math.log(hi/lo);return w*v/hi};
    const RH=o.rh||34, H=rows.length*RH+(log?20:4);
    let s='';
    rows.forEach((r,i)=>{const y=i*RH;const bw=Math.max(2,X(r.v));
      s+='<g class="bm-row'+(o.sel===r.id?' sel':'')+'" data-id="'+esc(r.id||'')+'"'+(o.click?' tabindex="0" role="button" aria-label="'+esc(r.nm)+'"':'')+'>';
      s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+RH+'" fill="transparent"/>';
      s+='<text x="0" y="'+(y+12)+'" font-size="11.5">'+esc(r.nm)+(r.sub?' <tspan fill="var(--mute)">'+esc(r.sub)+'</tspan>':'')+'</text>';
      s+='<rect class="bm-bar" x="0" y="'+(y+16)+'" width="'+bw+'" height="11" rx="2" fill="'+r.col+'"/>';
      if(r.lo!=null&&r.hi!=null){const a=X(r.lo),b=X(r.hi);s+='<line x1="'+a+'" x2="'+b+'" y1="'+(y+21.5)+'" y2="'+(y+21.5)+'" stroke="var(--ink)" stroke-width="1"/><line x1="'+a+'" x2="'+a+'" y1="'+(y+17)+'" y2="'+(y+26)+'" stroke="var(--ink)"/><line x1="'+b+'" x2="'+b+'" y1="'+(y+17)+'" y2="'+(y+26)+'" stroke="var(--ink)"/>'}
      (r.dots||[]).forEach(d=>{s+='<circle cx="'+X(d)+'" cy="'+(y+30.5)+'" r="1.6" fill="var(--mute)"/>'});
      const tw=(r.txt||'').length*6.3+6, xe=Math.max(bw,r.hi?X(r.hi):0)+5;
      if(xe+tw<W)s+='<text x="'+xe+'" y="'+(y+25.5)+'" font-size="11">'+esc(r.txt)+'</text>';
      else s+='<text x="'+(Math.min(bw,W)-4)+'" y="'+(y+25.5)+'" font-size="11" text-anchor="end" fill="var(--bg)" font-weight="600">'+esc(r.txt)+'</text>';
      s+='</g>'});
    if(log){[1e-3,1e-2,0.1,1,10,100,1e3,1e4,1e5].filter(t=>t>=lo&&t<=hi).forEach(t=>{const x=X(t);s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-16)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+Math.min(W-14,Math.max(8,x))+'" y="'+(H-4)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+(o.tick?o.tick(t):t)+'</text>'})}
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.label||'bar chart')+'">'+s+'</svg>';
  }

  // ---- main chart ----
  const GR=[['all','All'],['python','Python'],['threads','Python threads'],['native','C++ and Rust'],['js','TypeScript'],['interop','Python + native']];
  const st8={view:'time',grp:'all',log:false,sel:'rust'};
  try{const v=JSON.parse(localStorage.getItem('bm-state')||'null');if(v&&v.view)Object.assign(st8,v)}catch(e){}
  $('bm-log').checked=st8.log;
  $('bm-view').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st8.view));
  $('bm-grp').innerHTML=GR.map(g=>'<button data-g="'+g[0]+'"'+(g[0]===st8.grp?' class="on"':'')+'>'+g[1]+'</button>').join('');
  $('bm-leg').innerHTML=Object.keys(COL).map(k=>'<span><i style="background:'+COL[k]+'"></i>'+LANG[k]+'</span>').join('');
  const save=()=>{try{localStorage.setItem('bm-state',JSON.stringify(st8))}catch(e){}};
  const base=V.py314_loop;
  function rowsFor(view){
    const pick=D.variants.filter(v=>st8.grp==='all'||v.group===st8.grp);
    if(view==='time')return {rows:pick.map(v=>({id:v.id,nm:v.label,v:v.t_med,lo:v.t_min,hi:v.t_max,dots:v.ts,col:COL[v.lang],
      txt:fs(v.t_med)+(v.id===base.id?' (baseline)':' · '+F.x(base.t_med/v.t_med)+(v.t_med<=base.t_med?' faster':' slower'))})),
      cap:'Wall time on the 200,000-line file, median of '+pick[0].runs+' runs; whisker: fastest to slowest run; dots: each run. "× faster" is against CPython 3.14 running the plain loop.',tick:t=>t>=1?t+' s':(t*1000)+' ms'};
    if(view==='mem')return {rows:pick.map(v=>({id:v.id,nm:v.label,v:v.rss_mb,col:COL[v.lang],txt:v.rss_mb+' MB'})),
      cap:'Peak memory on the full input: maximum resident set size, median of 3 runs (/usr/bin/time -l).',tick:t=>t+' MB'};
    if(view==='start'){const r=pick.filter(v=>v.s_med!=null).map(v=>({id:v.id,nm:v.label,v:v.s_med,lo:v.s_min,hi:v.s_max,col:COL[v.lang],txt:sig(v.s_med,3)+' ms'}));
      if(st8.grp==='all'){D.startup_extra.forEach(x=>r.push({id:'x:'+x.label,nm:'Bare runtime: '+x.label,v:x.s_med,lo:x.s_min,hi:x.s_max,col:'var(--dim)',txt:sig(x.s_med,3)+' ms'}));
        D.cold.forEach(x=>r.push({id:'c:'+x.label,nm:x.label,sub:'(cold-cache test)',v:x.s_med,lo:x.s_min,hi:x.s_max,col:'var(--c5)',txt:sig(x.s_med,3)+' ms'}))}
      return {rows:r,cap:'Each program on an empty file: the time to start, load, find nothing and exit. Median of 20 runs after 3 warmups; whisker min to max. Grey: the bare runtime. Yellow: runs with an empty Python bytecode cache or Node compile cache, 10 runs each.',tick:t=>t+' ms'}}
    if(view==='loc'){const names={python:['Python (Rosetta)','py'],python_re:['Python, regex variant','py'],cpp:['C++ (Rosetta, with its JSON parser)','cpp'],rust:['Rust (Rosetta, with Cargo.toml)','rs'],ts:['TypeScript (Rosetta)','ts'],
        ext_pyo3:['Rust extension (PyO3)','mix'],ext_pybind11:['C++ extension (pybind11)','mix'],ext_nanobind:['C++ extension (nanobind)','mix']};
      return {rows:Object.keys(names).map(k=>({id:'l:'+k,nm:names[k][0],v:D.loc[k],col:COL[names[k][1]],txt:D.loc[k]+' lines',
        sub:'('+Object.entries(D.loc_files[k]).map(e=>e[0]+' '+e[1]).join(', ')+')'})),cap:'Non-blank, non-comment lines. Extensions count only the native side; each also needs the Python caller.',tick:t=>t}}
    return {rows:D.compile.map(c=>({id:'k:'+c.label,nm:c.label,v:c.med,lo:c.min,hi:c.max,col:COL[c.lang],txt:sig(c.med,3)+' s'})),cap:'Build time, median of '+D.compile.map(c=>c.n).filter((x,i,a)=>a.indexOf(x)===i).join(' to ')+' runs; whisker min to max. Python needs no build step (it compiles to bytecode on import, in milliseconds).',tick:t=>t+' s'};
  }
  function detail(id){const v=V[id];const el=$('bm-det');
    if(!v){el.innerHTML='<span class="mute small">Click a bar for its command and every number.</span>';return}
    el.innerHTML='<h4>'+esc(v.label)+'</h4><div class="small">'+esc(v.note)+'.</div>'+
      '<div class="small">Time '+fs(v.t_med)+' (min '+fs(v.t_min)+', max '+fs(v.t_max)+', '+v.runs+' runs) · peak memory '+v.rss_mb+' MB'+(v.s_med!=null?' · empty-file run '+sig(v.s_med,3)+' ms':'')+'</div>'+
      '<pre class="bm-cmd">'+esc(v.cmd)+'</pre>'}
  function draw(){const r=rowsFor(st8.view);
    $('bm-grp').style.display=(st8.view==='loc'||st8.view==='comp')?'none':'';
    $('bm-cap').textContent=r.cap;
    r.rows.sort((a,b)=>a.v-b.v);
    bars($('bm-chart'),r.rows,{log:st8.log,click:true,sel:st8.sel,tick:r.tick,label:r.cap});
    detail(V[st8.sel]&&(st8.view==='time'||st8.view==='mem'||st8.view==='start')?st8.sel:null)}
  $('bm-view').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st8.view=b.dataset.m;$('bm-view').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));save();draw()});
  $('bm-grp').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st8.grp=b.dataset.g;$('bm-grp').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));save();draw()});
  $('bm-log').addEventListener('change',e=>{st8.log=e.target.checked;save();draw()});
  const pickRow=e=>{const g=e.target.closest('.bm-row');if(!g||!V[g.dataset.id])return;st8.sel=g.dataset.id;save();draw()};
  $('bm-chart').addEventListener('click',pickRow);
  $('bm-chart').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickRow(e)}});

  // ---- small charts in the "why" boxes ----
  function small(){
    const B=D.breakdown;
    const stages=[['read_lines_s','read and split lines','var(--c5)'],['json_loads_s','json.loads','var(--c2)'],['tokens_loop_s','token loop','var(--c1)'],['dict_tally_s','add to dict','var(--c3)']];
    const brows=[['CPython 3.13, loop',B.py313,'tokens_loop_s'],['CPython 3.14, loop',B.py314,'tokens_loop_s'],['CPython 3.14, regex',B.py314,'tokens_regex_s']];
    const tot=r=>stages.reduce((a,s)=>a+r[1][s[0]==='tokens_loop_s'?r[2]:s[0]],0);
    const mx=Math.max(...brows.map(tot));
    $('bm-brk').innerHTML='<div class="split">'+brows.map(r=>'<div class="small">'+r[0]+'<br><span class="mute">'+fs(tot(r))+'</span></div><div class="sb" style="width:'+(100*tot(r)/mx)+'%">'+
      stages.map(s=>{const v=r[1][s[0]==='tokens_loop_s'?r[2]:s[0]];return '<span title="'+s[1]+' '+fs(v)+'" style="width:'+(100*v/tot(r))+'%;background:'+s[2]+'"></span>'}).join('')+'</div>').join('')+'</div>'+
      '<div class="bm-leg">'+stages.map(s=>'<span><i style="background:'+s[2]+'"></i>'+s[1]+'</span>').join('')+'</div>'+
      '<div class="tw"><table><thead><tr><th></th>'+stages.map(x=>'<th class="num">'+x[1]+'</th>').join('')+'</tr></thead><tbody>'+brows.map(r=>'<tr><td>'+r[0]+'</td>'+stages.map(x=>'<td class="num">'+fs(r[1][x[0]==='tokens_loop_s'?r[2]:x[0]])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
      '<p class="small mute">Median of 5 passes each. The token loop costs '+sig(B.ns_per_char_loop_314,3)+' ns per character on 3.14 ('+B.trace_opcodes_per_char+' bytecode instructions per character, counted by tracing a sample), the regex '+sig(B.ns_per_char_regex_314,3)+' ns.</p>';
    const pick=(ids,f,t)=>ids.map(id=>({id,nm:V[id].label,v:f(V[id]),col:COL[V[id].lang],txt:t(V[id])}));
    bars($('bm-membars'),pick(['py314_loop','py314_re','py314_thr4','pyrs_file','node_js','bun_ts','cpp_O2','rust'],v=>v.rss_mb,v=>v.rss_mb+' MB').sort((a,b)=>a.v-b.v),{label:'Peak memory'});
    const P=D.loop_probe;
    bars($('bm-probe'),[{nm:'C++, Apple clang 14 -O3, as written in Rosetta',v:P.cpp_v0,col:COL.cpp,txt:P.cpp_v0+' ns/byte'},{nm:'C++, Apple clang 14, case-folding rewrite',v:P.cpp_v1,col:COL.cpp,txt:P.cpp_v1+' ns/byte'},{nm:'C++, LLVM clang 23 -O3, as written',v:P.cpp23_v0,col:COL.cpp,txt:P.cpp23_v0+' ns/byte'},{nm:'C++, LLVM clang 23, case-folding rewrite',v:P.cpp23_v1,col:COL.cpp,txt:P.cpp23_v1+' ns/byte'},{nm:'Rust, rustc -O, as written in Rosetta',v:P.rust,col:COL.rs,txt:P.rust+' ns/byte'}],{label:'Token loop alone'});
    const C=D.crossing.noop_ns;
    const cn=[['empty_loop','Loop overhead only (no call)','var(--dim)'],['builtin_len','Built-in len(s)',COL.py],['python_function','Python function, empty',COL.py],['nanobind','nanobind, empty C++ function',COL.mix],['pyo3','PyO3, empty Rust function',COL.mix],['pybind11','pybind11, empty C++ function',COL.mix]];
    bars($('bm-cross'),cn.map(c=>({nm:c[1],v:C[c[0]],col:c[2],txt:sig(C[c[0]],3)+' ns'})).sort((a,b)=>a.v-b.v),{label:'Cost per call'});
    const M=D.crossing.per_message_ns;
    const pm=[['python_loop','Python loop',COL.py],['pybind11_percall','pybind11, one call per message',COL.mix],['nanobind_percall','nanobind, one call per message',COL.mix],['pyo3_percall','PyO3, one call per message',COL.mix],['pybind11_batch','pybind11, one call for all',COL.mix],['nanobind_batch','nanobind, one call for all',COL.mix],['pyo3_batch','PyO3, one call for all',COL.mix]];
    bars($('bm-permsg'),pm.map(c=>({nm:c[1],v:M[c[0]],col:c[2],txt:sig(M[c[0]],3)+' ns'})).sort((a,b)=>a.v-b.v),{log:true,label:'Cost per message',tick:t=>t>=1000?(t/1000)+' µs':t+' ns'});
    bars($('bm-thr'),pick(['py314_thr1','py314_thr4','py314t_thr1','py314t_thr4','py314t_thr8'],v=>v.t_med,v=>fs(v.t_med)),{label:'Threads'});
    const E=D.env;
    $('bm-env').innerHTML=[['Measured',F.date(E.date)+' (load average at start '+F.load(E.loadavg_at_start)+')'],['Machine',E['hw.model']+', '+E.cpu+', '+E.cores+', '+(E.memory_bytes/2**30)+' GB'],['OS',E.os],
      ['CPython',E.python313+' and '+E.python314+' (uv builds; 3.14 configured '+E.python314_config+'); free-threaded '+E.python314t],
      ['C++',E.clang+'; also LLVM '+E.clang23.trim()+' against the same SDK libc++; -std=c++20; simdjson '+E.simdjson+' in one variant'],['Rust',E.rustc+', LLVM '+E.rustc_llvm+'; '+E.cargo],['TypeScript','tsc '+E.tsc.replace('Version ','')+'; '+E.node+'; Bun '+E.bun],
      ['Bindings','PyO3 '+E.pyo3+' (maturin '+E.maturin+'), pybind11 '+E.pybind11+', nanobind '+E.nanobind+'; serde_json '+E.serde_json],['Timing','hyperfine '+E.hyperfine.replace('hyperfine ','')],
      ['Input','sha256 '+D.input.sha256.slice(0,16)+'…']].map(r=>'<dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd>').join('');
    $('bm-all').innerHTML='<table><thead><tr><th>Variant</th><th class="num">Median</th><th class="num">Min</th><th class="num">Max</th><th class="num">Peak MB</th><th class="num">Empty file</th><th>Command</th></tr></thead><tbody>'+
      tv.map(v=>'<tr><td>'+esc(v.label)+'</td><td class="num">'+fs(v.t_med)+'</td><td class="num">'+fs(v.t_min)+'</td><td class="num">'+fs(v.t_max)+'</td><td class="num">'+v.rss_mb+'</td><td class="num">'+(v.s_med!=null?sig(v.s_med,3)+' ms':'')+'</td><td class="wrap"><code>'+esc(v.cmd)+'</code></td></tr>').join('')+'</tbody></table>';
  }
  let drawn=false;
  function render(){draw();small();drawn=true}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-bench']=(window.TAB_RENDER['t-bench']||[]).concat([render]);
  let rt=0;addEventListener('resize',()=>{const t=$('t-bench');if(!t||t.hidden||!drawn)return;clearTimeout(rt);rt=setTimeout(render,80)});
})();

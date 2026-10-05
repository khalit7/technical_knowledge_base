// ---- Part 2 Reading (t-pb-read), 2 of 4: wheel names, install speed, the summary table ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,W=PB.wheels.pkgs;
  // ---------- wheel name decoder ----------
  const ex=[['our pure-Python library (section 2)','lib_demo-0.1.0-py3-none-any.whl'],
    ['numpy, free-threaded 3.14',W.numpy&&W.numpy.example],
    ['torch, free-threaded 3.14',W.torch&&W.torch.example],
    ['tokenizers, stable ABI',W.tokenizers&&W.tokenizers.example],
    ['cryptography, abi3t',W.cryptography&&W.cryptography.abi3t_file],
    ['orjson, several macOS tags',W.orjson&&W.orjson.example]].filter(x=>x[1]);
  function pyTag(t){if(t==='py3'||t==='py2.py3')return 'any Python 3 interpreter (pure Python)';const m=t.match(/^cp(\d)(\d+)(t?)$/);
    return m?'CPython '+m[1]+'.'+m[2]+(m[3]?' free-threaded':'')+(m[3]?'':' (or newer, if the ABI tag is abi3)'):t}
  function abiTag(a,py){if(a==='none')return 'no compiled code, so no ABI';
    if(a==='abi3')return 'stable ABI: loads on every GIL-enabled CPython from '+py.replace(/^cp(\d)(\d+)$/,'$1.$2')+' on, not on free-threaded builds';
    if(a==='abi3.abi3t')return 'both stable ABIs: one wheel for the GIL and the free-threaded builds of '+py.replace(/^cp(\d)(\d+)$/,'$1.$2')+' and later';
    const m=a.match(/^cp(\d)(\d+)(t?)$/);return m?'built against CPython '+m[1]+'.'+m[2]+(m[3]?' free-threaded (cp'+m[1]+m[2]+'t): loads only on '+m[1]+'.'+m[2]+'t':' with the GIL: loads only on that version'):a}
  function platTag(p){return p.split('.').map(x=>{if(x==='any')return 'any platform';let m=x.match(/^macosx_(\d+)_(\d+)_(\w+)$/);
    if(m)return 'macOS '+m[1]+(m[2]!=='0'?'.'+m[2]:'')+' or newer on '+({arm64:'Apple silicon',x86_64:'Intel',universal2:'both Apple silicon and Intel'}[m[3]]||m[3]);
    m=x.match(/^manylinux_(\d+)_(\d+)_(\w+)$/);if(m)return 'Linux with glibc '+m[1]+'.'+m[2]+' or newer, '+m[3];
    if(/^win/.test(x))return 'Windows ('+x+')';return x}).join('; or ')}
  function showWheel(i){
    const f=ex[i][1],parts=f.replace(/\.whl$/,'').split('-');
    const [name,ver]=parts,py=parts[parts.length-3],abi=parts[parts.length-2],plat=parts[parts.length-1];
    $('pb-wh-chips').querySelectorAll('button').forEach((b,k)=>b.classList.toggle('on',k===i));
    const col=['var(--c1)','var(--c6)','var(--c2)','var(--c4)','var(--c3)'];
    $('pb-wh-name').innerHTML=[name,ver,py,abi,plat].map((p,k)=>'<span style="color:'+col[k]+';font-weight:600">'+E(p)+'</span>').join('-')+'.whl';
    $('pb-wh-parts').innerHTML='<div class="kv">'+[['name',name],['version',ver],['python',pyTag(py)],['abi',abiTag(abi,py)],['platform',platTag(plat)]].map((r,k)=>'<b style="color:'+col[k]+'">'+r[0]+'</b><span>'+E(r[1])+'</span>').join('')+'</div>';
  }
  $('pb-wh-chips').innerHTML=ex.map((x,i)=>'<button data-i="'+i+'">'+E(x[0])+'</button>').join('');
  $('pb-wh-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(b)showWheel(+b.dataset.i)});
  showWheel(1);
  if(W.numpy)$('pb-np-wheels').textContent=W.numpy.wheels;
  const ab=Object.entries(W).filter(([k,v])=>v.abi3t).map(([k,v])=>k+' '+v.version);
  $('pb-abi3t-count').textContent='Survey on '+PB.wheels.fetched.slice(0,10)+': '+ab.length+' of '+Object.keys(W).length+' popular compiled packages ship an abi3t wheel'+(ab.length?' ('+ab.join(', ')+')':'')+'.';

  // ---------- install speed ----------
  const I=PB.install_speed;
  if(I){const col=['var(--c2)','var(--c1)','var(--c3)'];
    PBU.bars($('pb-inst-bars'),I.runs.map((r,k)=>({name:r.name,v:r.median_s,label:PBU.fmt(r.median_s,2)+' s',col:col[k]})));
    const p=I.runs[0].median_s,c=I.runs[1].median_s,w=I.runs[2].median_s;
    $('pb-inst-note').textContent='Python '+I.python+', '+I.pip+', uv '+I.uv+'; median of 3 runs each (all runs: '+I.runs.map(r=>r.name+' '+r.all_s.join(', ')+' s').join('; ')+'); load average '+PBU.la(I.loadavg)+'. uv with an empty cache was '+PBU.fmt(p/c,1)+'x faster than pip; with a warm cache '+PBU.fmt(p/w,0)+'x, because it then copies already unpacked files from its cache instead of downloading and unpacking wheels.';
  }

  // ---------- summary cells (filled from the measurements) ----------
  const F=PB.ft,J=PB.jit.runs,IN=PB.interp.PY314,L=PB.lazy;
  const sp=k=>F[k].scale['1'].median_s/F[k].scale['4'].median_s;
  $('pb-sum-ft').innerHTML='4 threads: '+PBU.fmt(sp('PY314T'),1)+'x faster than 1 on 3.14t, '+PBU.fmt(sp('PY314'),1)+'x with the GIL; lost updates appear on both builds';
  const jr=(v,c)=>J[v+'|'+c+'|0'].median_s/J[v+'|'+c+'|1'].median_s;
  $('pb-sum-jit').innerHTML='3.15: '+PBU.fmt(jr('3.15','char_loop'),2)+'x on a character loop, '+PBU.fmt(jr('3.15','gen_pipeline'),2)+'x on generators; 3.14: '+PBU.fmt(jr('3.14','char_loop'),2)+'x and '+PBU.fmt(jr('3.14','float_loop'),2)+'x';
  $('pb-sum-int').innerHTML='start-up '+PBU.fmt(IN.startup_ms.subinterpreter,1)+' ms (thread '+PBU.fmt(IN.startup_ms.thread,2)+', process '+PBU.fmt(IN.startup_ms.process_spawn,0)+'); 4 workers '+PBU.fmt(IN.job_s.serial.median_s/IN.job_s.subinterpreters.median_s,1)+'x serial';
  const hf=L.hyperfine;$('pb-sum-lazy').innerHTML='a CLI\'s start-up '+PBU.fmt(hf[0].median_ms,0)+' ms to '+PBU.fmt(hf[1].median_ms,0)+' ms; '+L.importtime.cli_eager.modules+' to '+L.importtime.cli_lazy.modules+' modules imported';
})();

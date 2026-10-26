// ---- Reading: wheel names (section 7) and install speed (section 4); copied from the Python essentials page's 42_js_pb_read_b.js, runtime summary cells removed ----
(function(){
  const $=id=>document.getElementById(id),E=PBU.esc,W=PB.wheels.pkgs;
  // ---------- wheel name decoder ----------
  const ex=[['our pure-Python library (section 4)','lib_demo-0.1.0-py3-none-any.whl'],
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
  }

})();

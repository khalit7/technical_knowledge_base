// ---- Compiler stages tab (t-ir) ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const main={};D.main.forEach(r=>main[r.key+'.'+r.target]=r);
  const SRC={vadd:'vadd',softmax:'softmax',matmul:'matmul',attn:'attn_fwd'};
  const HL={ttir:/tt\.(dot|load|store|reduce)|scf\.for/,ttgir:/^#|dot|tmem|local_alloc|async|convert_layout|scf\.for|barrier/,llir:/nvvm|amdgcn|mma|shfl|ld\.global|cp\.async/,asm:/mma|mfma|cp\.async|ld\.global\.v4|tcgen05|wgmma|ds_read|ds_write|buffer_load|global_load/,sass:/MMA|LDGSTS|UTMA|LDSM|SHFL|SYNCS|LDTM|STTM/};
  let stage='ttgir';
  const stat=(k,v)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  function render(){
    const k=$('ir-k').value,t=$('ir-t').value,amd=t.startsWith('gfx'),key=k+'.'+t,rec=D.ir[key]||{},m=main[key]||{};
    const o=m.ops||{};
    const mma=['HGMMA','UTCHMMA','HMMA'].find(x=>o[x]);
    $('ir-meta').innerHTML=stat(amd?'VGPRs per lane':'Registers per thread',amd?m.vgpr:m.regs)+stat(amd?'LDS per program':'Shared memory per program',(m.shared||0).toLocaleString('en-US')+' B')+
      stat('Tensor-core instructions (listing)',amd?(o.v_mfma||0)+' v_mfma':(mma?o[mma]+' '+mma:'0'))+stat(amd?'Scratch bytes':'Stack bytes (spills)',amd?(m.scratch||0):(m.stack||0))+stat('num_warps, num_stages',m.num_warps+', '+m.num_stages);
    let lines,note='';
    if(stage==='src'){lines=D.src[SRC[k]].split('\n');note='Python source (src/code/kernels_tg.py). The same source for every target.'}
    else{let s=stage==='asm'?(amd?'amdgcn':'ptx'):stage;
      const e=s==='ttir'?(rec.ttir||(D.ir[k+'.'+(amd?'gfx942':'sm_90a')]||{}).ttir):rec[s];
      if(!e){lines=[];note=amd&&s==='sass'?'AMD targets have no SASS: the machine code is in the PTX / AMDGCN stage (AMDGCN).':'Not available.'}
      else{lines=e.x;note=(e.full?'Full ':'Excerpt: '+e.x.length+' of ')+e.n.toLocaleString('en-US')+' lines'+(s==='ttir'?' (TTIR from the '+(amd?'gfx942':'sm_90a')+' build; it is target-independent within a vendor)':'')+'.'}}
    const re=HL[stage];
    $('ir-note').textContent=note;
    $('ir-pre').innerHTML=lines.map(l=>re&&re.test(l)?'<mark>'+esc(l)+'</mark>':esc(l)).join('\n');
  }
  $('ir-k').addEventListener('change',render);$('ir-t').addEventListener('change',render);
  $('ir-s').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('ir-s').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));stage=b.dataset.m;render()});
  render();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ir']=window.TAB_RENDER['t-ir']||[]).push(render);
})();

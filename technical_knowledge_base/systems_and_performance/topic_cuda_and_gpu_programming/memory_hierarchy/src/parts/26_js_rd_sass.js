// ---- Reading sections 1 to 6: real compiler output filled in from window.MHD (CUDA 13.4.2), the register-cap chart ----
(function(){
  const D=window.MHD,f=MC.fmtN,esc=RD.esc,$=id=>document.getElementById(id);
  const S=D.sass,P=D.ptxas;
  const hl=s=>esc(s).replace(/^(@\S+ )?([A-Z][A-Z0-9_.]*)/,(m,a,b)=>(a||'')+'<b>'+b+'</b>');
  const pre=(id,lines)=>{const e=$(id);if(e)e.innerHTML=lines.map(hl).join('\n')};
  const op=s=>(s||'').replace(/^(@\S+ )/,'').split(' ')[0];
  // section 1: widths
  pre('rd-wsass',[].concat(['// float'],S.copy_f1.sm_90a,['// float2'],S.copy_f2.sm_90a,['// float4'],S.copy_f4.sm_90a).map(x=>x));
  $('rd-wsass').innerHTML=$('rd-wsass').innerHTML.replace(/\/\/ (float\d?)/g,'<span class="c">// $1 copy</span>');
  // section 2: cache operators
  const ROWS=[['plain load','ld_plain','ld.global (default .ca)','"Cache at all levels, likely to be accessed again."'],
    ['const __restrict__','ld_restrict','ld.global.nc','"compiled as read-only cache loads"'],
    ['__ldg(p)','ld_ldg','ld.global.nc','"a read-only L1/Tex cache load"'],
    ['__ldcg(p)','ld_ldcg','ld.global.cg','"Cache at global level (cache in L2 and below, not L1)."'],
    ['__ldcs(p)','ld_ldcs','ld.global.cs','"Cache streaming, likely to be accessed once." Evict-first in L1 and L2.'],
    ['__ldlu(p)','ld_ldlu','ld.global.lu','"Last use."'],
    ['__ldcv(p)','ld_ldcv','ld.global.cv','"Don\'t cache and fetch again."'],
    ['__stcs(p, v)','st_stcs','st.global.cs','"allocates cache lines with evict-first policy"'],
    ['__stwt(p, v)','st_stwt','st.global.wt','"Cache write-through (to system memory)."']];
  const ARCH=['sm_80','sm_90a','sm_120'];
  $('rd-cops').innerHTML='<table class="tbl-sm"><thead><tr><th>You write</th><th>PTX</th><th>Meaning (PTX ISA 9.4 or C++ extensions)</th>'+ARCH.map(a=>'<th>SASS '+a+'</th>').join('')+'</tr></thead><tbody>'+
    ROWS.map(r=>{const st=r[1].startsWith('st_');return '<tr><td><code>'+esc(r[0])+'</code></td><td><code>'+r[2]+'</code></td><td>'+esc(r[3])+'</td>'+
      ARCH.map(a=>{const l=S[r[1]][a].find(x=>op(x).startsWith(st?'STG':'LDG'));return '<td><code>'+esc(op(l))+'</code></td>'}).join('')+'</tr>'}).join('')+'</tbody></table>';
  // section 3: shared memory declarations
  const pr=(k,fn,a)=>P[k][a||'sm_90a'][fn];
  const smem=x=>x.regs+' registers, '+(x.smem?f(x.smem,0)+' bytes static shared memory':'no static shared memory');
  $('rd-sm1').textContent=smem(pr('m6_shared','smem_static'));$('rd-sm2').textContent=smem(pr('m6_shared','smem_swizzle'));$('rd-sm3').textContent=smem(pr('m6_shared','smem_dynamic'));
  // section 4: ptxas line, histogram kernels
  const hd=pr('m4_dynidx','hist_dynamic'),hs=pr('m4_dynidx','hist_select');
  $('rd-ptxasline').innerHTML=esc("ptxas info    : Compiling entry function 'hist_dynamic' for 'sm_90a'\nptxas info    : Function properties for hist_dynamic\n    "+hd.stack+" bytes stack frame, "+hd.spill_st+" bytes spill stores, "+hd.spill_ld+" bytes spill loads\nptxas info    : Used "+hd.regs+" registers, used 0 barriers, "+hd.stack+" bytes cumulative stack size");
  pre('rd-hdyn',S.hist_dynamic.sm_90a);pre('rd-hsel',S.hist_select.sm_90a);
  $('rd-hdynregs').textContent=hd.regs+' registers and a '+hd.stack+'-byte stack frame with 0 spill bytes';
  $('rd-hselregs').textContent=hs.regs+' registers, '+hs.stack+' bytes of stack';
  // register caps
  const def=D.regcap_default;
  $('rd-rdef').textContent=def.sm_90a.regs+' (sm_90a; '+def.sm_80.regs+' on sm_80, '+def.sm_120.regs+' on sm_120)';
  const MAXW={sm_80:64,sm_90a:64,sm_120:48};
  const warps=(regs,a)=>Math.min(MAXW[a],Math.floor(16384/(Math.ceil(regs*32/256)*256))*4);
  let arch='sm_90a';
  function rc(){
    const el=$('rd-rcchart');el.innerHTML='<div class="small mute">Registers per thread used under -maxrregcount (bar), and warps per SM the register file then allows</div><div class="bars" id="rd-rc1"></div><div class="small mute" style="margin-top:8px">Spill stores per thread, bytes</div><div class="bars" id="rd-rc2"></div>';
    const rows=D.regcap.map(r=>({cap:r.cap,x:r[arch]}));
    MC.bars($('rd-rc1'),rows.map(r=>({name:'cap '+r.cap,v:r.x.regs,label:r.x.regs+' regs, '+warps(r.x.regs,arch)+' warps',color:r.x.spill_st?'var(--c2)':'var(--c1)'})));
    MC.bars($('rd-rc2'),rows.map(r=>({name:'cap '+r.cap,v:Math.max(r.x.spill_st,0.001),label:f(r.x.spill_st,0)+' B',color:'var(--c2)'})));
    const at128=rows.find(r=>r.cap===128).x,at32=rows.find(r=>r.cap===32).x;
    $('rd-rcnote').innerHTML='<span class="der">compiled here</span>, '+arch+': uncapped, '+def[arch].regs+' registers ('+warps(def[arch].regs,arch)+' warps per SM of '+MAXW[arch]+'); capped at 128: '+at128.regs+' registers and '+at128.spill_st+' bytes of spill stores per thread; at 32: '+f(at32.spill_st,0)+' bytes. Warps per SM from the register limit alone, by NVIDIA\'s allocation rule (256 registers per warp granule, 4 sub-partitions of 16,384), as in the parent\'s occupancy calculator <span class="der">derived</span>.';
  }
  RD.seg($('rd-rcseg'),v=>{arch=v;rc()});rc();RD.onRender(rc);
  // section 5: constant memory
  const CK=[['const_fixed','c_tab[3], c_tab[4]: index known at compile time'],['const_uniform','c_tab[k]: index is a kernel argument'],['const_perlane','c_tab[threadIdx.x]: a different entry per lane'],['param_struct','p.scale, p.bias: a struct passed by value']];
  $('rd-consttbl').innerHTML='<table class="tbl-sm"><thead><tr><th>Kernel reads</th><th>Constant-bank instructions and the math (sm_90a)</th></tr></thead><tbody>'+
    CK.map(c=>'<tr><td><code>'+esc(c[1].split(':')[0])+'</code>:'+esc(c[1].split(':')[1]||'')+'</td><td><code>'+S[c[0]].sm_90a.filter(x=>!/c\[0x0\]\[0x28\]|c\[0x0\]\[0x208\]/.test(x)).map(esc).join('<br>')+'</code></td></tr>').join('')+'</tbody></table>';
  $('rd-c80').textContent=(S.param_struct.sm_80.find(x=>/^FFMA/.test(x))||'');
  // section 6: async copies
  pre('rd-async0',S.tile_sync.sm_90a.slice(0,8));pre('rd-async1',S.tile_async2.sm_90a.slice(0,10));
})();

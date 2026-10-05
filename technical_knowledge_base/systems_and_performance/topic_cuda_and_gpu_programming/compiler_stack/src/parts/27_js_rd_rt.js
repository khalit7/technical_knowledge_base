// ---- Reading: NVRTC numbers and specialisation; inline PTX; e^x four ways (step animation) ----
(function(){
  const D=window.CSD,E=RD.esc,N=D.nvrtc;
  document.getElementById('cs-nvC').textContent=N.med_cubin.toFixed(1)+' ms';
  document.getElementById('cs-nvP').textContent=N.med_ptx.toFixed(1)+' ms';
  document.getElementById('cs-nvV').textContent=N.version;
  document.getElementById('cs-nvL').textContent='Docker on the M1 Pro; runs '+N.ms_cubin.join(', ')+' ms; load average '+N.load.join(' / ');
  function spec(m){const L=m==='g'?N.generic:N.special;
    const hl=l=>/0x1000|0xfff|c\[0x0\]\[0x224\]|UR10|UIMAD|USHF/.test(l);
    document.getElementById('cs-specSass').innerHTML=L.map(l=>'<span style="display:block"'+(hl(l)?' class="hl"':'')+'>'+E(l)+'</span>').join('');
    document.getElementById('cs-specTxt').innerHTML=m==='g'?'<b>'+N.generic.length+' instructions.</b> The row length is loaded from the argument bank (<code>c[0x0][0x224]</code>) into a uniform register, and the row offset is a 64-bit multiply done at run time (<code>UIMAD.WIDE.U32</code>, <code>USHF</code>). Highlighted: the work that exists only because <code>ncols</code> is unknown.':'<b>'+N.special.length+' instructions.</b> The bound is now an immediate (<code>0xfff</code>, <code>0x1000</code>) and the row offset a multiply by a constant. A small win here, because the loop still depends on <code>blockDim.x</code>; when the block size and the trip count are both constants the compiler can unroll fully and keep a whole row in registers, which is what libraries that generate kernels per shape (jiterator, cuDNN’s runtime-compiled kernels, Inductor’s Triton) are after.';}
  RD.seg(document.getElementById('cs-specSeg'),spec);spec('g');
  document.getElementById('cs-templ').textContent=D.templ.map(t=>t[0]+'\n    = '+t[1]).join('\n');
  document.getElementById('cs-low').innerHTML=N.lowered.map(l=>'<code>'+E(l[0])+'</code> → <code>'+E(l[1])+'</code>').join('; ');
  document.getElementById('cs-noinc').textContent=N.noinclude.slice(0,2).join(' | ');
  document.getElementById('cs-inlP').textContent=D.inline_ptx.join('\n');
  document.getElementById('cs-inlS').textContent=D.inline_sass.join('\n');
  // e^x four ways
  const arith=l=>/MUFU|FMUL|FFMA|FADD|FSETP|SHF|FSEL/.test(l)&&!/IMAD/.test(l);
  const S=[['default','k_expf','expf(x)','The accurate library function: range reduction (FFMA.SAT, FFMA.RM, the magic constants), the exponent built separately (SHF), MUFU.EX2 for the fraction, a final multiply.'],
           ['default','k_fast','__expf(x)','The intrinsic: multiply by log2(e), then MUFU.EX2. The FSETP and the two predicated FMULs halve and square around the EX2 for inputs below 2^-126, so results stay out of the denormal range; ptx says <code>ex2.approx.f32</code> without <code>.ftz</code>.'],
           ['default','k_inline','asm ex2.approx.ftz','Inline PTX with <code>.ftz</code> (flush denormals to zero): only the multiply and MUFU.EX2 are left.'],
           ['use_fast_math','k_expf','expf(x) with -use_fast_math','The compiler flag rewrites <code>expf</code> to the fast form and adds <code>.ftz</code> to the arithmetic: the same two instructions as the inline PTX, from unchanged source.']];
  function step(i){const s=S[i],sass=D.exp[s[0]][s[1]].filter(arith),ptx=D.exp_ptx[s[0]+':'+s[1]].filter(l=>!/cvta|mul\.wide/.test(l));
    document.getElementById('cs-expCap').innerHTML='<div class="t">'+(i+1)+' of 4: <code>'+E(s[2])+'</code></div><p>'+s[3]+'</p>';
    document.getElementById('cs-expP').textContent=ptx.join('\n');
    document.getElementById('cs-expS').textContent=sass.join('\n');
    document.getElementById('cs-expCnt').innerHTML=RD.stat('SASS arithmetic instructions',sass.length)+RD.stat('MUFU.EX2',sass.filter(l=>/MUFU/.test(l)).length)+RD.stat('whole kernel, SASS',D.exp[s[0]][s[1]].length,'instructions, without end padding');}
  RD.anim({card:'cs-expCard',ctl:'cs-expCtl',n:4,draw:step,ms:2600,label:'Version of exp'});
})();

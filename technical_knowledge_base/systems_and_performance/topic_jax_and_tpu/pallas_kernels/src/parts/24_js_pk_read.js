// ---- Pallas kernels page: Reading tab renderers (tables, code toggles, bars, the pipelining animation, the page
// table, the tuned-table heatmap). Every number comes from window.PK.
(function(){
  const U=PKU,P=window.PK,KN=P.K.kernels,PR=P.K.production,$=id=>document.getElementById(id);
  const e2=U.e2,esc=U.esc;
  // 0. summary table
  (function(){const g=KN.layer_norm.grads,f=KN.flash.grads;
    const rows=[
      ['Bias + exact GELU','a broadcast block copied once','<code>jax.nn.gelu(x + b, approximate=False)</code>',e2(KN.bias_gelu.err)],
      ['Fused softmax','whole rows in one block','<code>jax.nn.softmax</code>',e2(KN.softmax_rows.err)],
      ['Fused cross-entropy','a 65-wide row; labels picked by iota','the model\'s <code>loss_fn</code>, per row',e2(KN.xent_rows.err_rows)],
      ['LayerNorm, forward and backward','custom_vjp; accumulating across grid steps','<code>jax.vjp</code> of the model\'s <code>layer_norm</code>',e2(Math.max(g.dx.err,g.dscale.err,g.dbias.err))+' <span class="mute">(values to '+Math.round(g.dscale.max_ref)+')</span>'],
      ['Flash attention, forward and backward','online softmax; two backward kernels; clamped index maps','<code>jax.vjp</code> of plain attention',e2(Math.max(KN.flash.err,f.dq.err,f.dk.err,f.dv.err))+' <span class="mute">(values to '+f.dv.max_ref.toFixed(1)+')</span>'],
      ['Matmul, copies by hand','what a BlockSpec pipeline does: async copies, semaphores','<code>jnp.dot</code>',e2(P.K.pipeline.err_manual)],
      ['Matmul with <code>emit_pipeline</code>','a pipeline inside a kernel','lowered for TPU only','<span class="mute">not run on CPU</span>'],
      ['Paged decode attention','scalar prefetch of a page table','the model\'s attention at the last position',e2(P.K.paged.err)],
      ['Production: jax TPU flash attention','reading and running a shipped kernel','<code>jax.vjp</code> of plain attention',e2(Math.max(PR.fa_fwd_err,PR.fa_grad_err.dq,PR.fa_grad_err.dk,PR.fa_grad_err.dv))],
      ['Production: megablox <code>gmm</code>','grouped matmul for MoE','per-group <code>jnp.dot</code>',e2(PR.gmm_err)],
      ['Production: jax GPU <code>mha</code> (Triton)','the same algorithm under GPU rules','<code>jax.vjp</code> of plain attention',e2(Math.max(PR.gpu_mha_err,PR.gpu_mha_grad_err.dq,PR.gpu_mha_grad_err.dk,PR.gpu_mha_grad_err.dv))]];
    $('pk-sumtab').innerHTML=rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td data-h="Teaches">'+r[1]+'</td><td data-h="Against">'+r[2]+'</td><td class="num" data-h="Max error">'+r[3]+'</td></tr>').join('')})();

  // 1. matmul guide bars
  (function(){const mg=P.SR.matmul_guide,el=$('pk-mg-bars'),sg=$('pk-mg-n');const Ns=[...new Set(mg.map(r=>r.n))];
    sg.innerHTML=Ns.map((n,i)=>'<button data-m="'+n+'"'+(i===Ns.length-1?' class="on"':'')+'>N = '+U.comma(n,0)+'</button>').join('');
    function draw(n){const rs=mg.filter(r=>r.n===+n);el.innerHTML=rs.map(r=>{const lab=r.impl==='Pallas'?'Pallas, blocks '+r.block.join(' &#215; '):'XLA (jnp.matmul)';
      const col=r.impl==='Pallas'?'var(--c1)':'var(--c3)';return '<div><span class="nm">'+lab+'</span><span class="tr"><span style="width:'+r.util+'%;background:'+col+'"></span></span><span class="v">'+r.util.toFixed(1)+'%</span></div>'}).join('')}
    U.seg(sg,draw);draw(Ns[Ns.length-1])})();

  // 2. backends before/after
  (function(){const T=P.T.backends,el=$('pk-be-code'),cap=$('pk-be-cap');
    const caps={py:['The kernel as written','<code>softmax_kernel</code> from section 3: refs in, refs out, ordinary jnp in between. Nothing in it says TPU or GPU.'],
      mosaic:['Mosaic, for a TPU v5e','The refs are <code>memref</code>s already in <code>#tpu.memory_space&lt;vmem&gt;</code>; the grid became <code>iteration_bounds</code> and the index map a <code>transform_</code> function; the body is vector loads, '+T.mosaic_ops.filter(o=>/vector|tpu\.vector/.test(o)).length+' kinds of vector op and one store. Ops present: '+T.mosaic_ops.map(o=>'<code>'+o+'</code>').join(', ')+'.'],
      triton:['Triton, for an H100','The refs are raw <code>!tt.ptr&lt;f32&gt;</code> pointers; the BlockSpec became <code>tt.get_program_id</code>, <code>tt.make_range</code> and <code>tt.addptr</code> address arithmetic before each <code>tt.load</code> and <code>tt.store</code>; <code>exp</code> became a call to <code>__nv_expf</code>. Ops present: '+T.triton_ops.map(o=>'<code>'+o+'</code>').join(', ')+'.']};
    function draw(m){el.innerHTML=m==='py'?U.code(P.code.softmax_rows):esc(T[m]);cap.innerHTML='<div class="t">'+caps[m][0]+'</div><p>'+caps[m][1]+'</p>'}
    U.seg($('pk-be-seg'),draw);draw('py')})();

  // 3. row kernels
  (function(){const caps={bias_gelu:'grid (8,), blocks 512 &#215; 512; the bias block (1, 512) is the same for every step.',
      softmax_rows:'grid (32,), blocks 512 &#215; 128: 512 whole rows per step.',xent_rows:'grid (8,), blocks 512 &#215; 65 logits and 512 &#215; 1 labels; output one loss per row.'};
    function draw(m){$('pk-row-code').innerHTML=U.code(P.code[m]);$('pk-row-cap').innerHTML='src/runs/pk_kernels.py, as it ran: '+caps[m]}
    U.seg($('pk-row-seg'),draw);draw('bias_gelu')})();
  // 4. layer norm
  $('pk-ln-code').innerHTML=U.code(P.code.layer_norm);
  (function(){const b=P.K.bugs[0];$('pk-lnbug').innerHTML=b.tpu_runs.map(r=>'seed '+r.seed+': '+(r.nan?'dscale NaN':'dscale off by '+U.comma(r.err,0))).join('; ')+' (dx, per row, stayed right)'})();
  // 5. flash
  (function(){function draw(m){$('pk-fa-code').innerHTML=U.code(P.code[m])}U.seg($('pk-fa-seg'),draw);draw('flash_fwd');
    const f=KN.flash,rows=[['This page: <code>flash_fwd</code> + <code>flash_bwd</code>',f.err,f.grads.dq.err,f.grads.dk.err,f.grads.dv.err],
      ['The root lab\'s forward kernel',f.err_root_kernel,null,null,null],
      ['jax <code>ops/tpu/flash_attention</code> (TPU interpreter)',PR.fa_fwd_err,PR.fa_grad_err.dq,PR.fa_grad_err.dk,PR.fa_grad_err.dv],
      ['jax <code>ops/gpu/attention.mha</code> (Triton style, interpret)',PR.gpu_mha_err,PR.gpu_mha_grad_err.dq,PR.gpu_mha_grad_err.dk,PR.gpu_mha_grad_err.dv]];
    const c=v=>v==null?'<span class="mute">forward only</span>':e2(v);
    $('pk-fa-tab').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num" data-h="output">'+c(r[1])+'</td><td class="num" data-h="dQ">'+c(r[2])+'</td><td class="num" data-h="dK">'+c(r[3])+'</td><td class="num" data-h="dV">'+c(r[4])+'</td></tr>').join('');
    $('pk-fa-sweep').innerHTML=f.sweep.map(s=>'<tr><td class="num">'+s.bq+'</td><td class="num">'+s.bk+'</td><td class="num">'+s.steps+'</td><td class="num">'+s.run+'</td><td class="num">'+e2(s.err)+'</td><td>'+(s.lowers?'yes':'no')+'</td></tr>').join('')})();
  // 6. pipelining: manual code, mosaic excerpt, buffered table
  $('pk-man-code').innerHTML=U.code(P.code.matmul_manual);
  $('pk-man-mos').textContent=P.T.mosaic_manual;
  (function(){const B=P.PL.buffered;$('pk-buf-tab').innerHTML=['1','2','3'].map(n=>{const b=B[n];
    return '<tr><td><code>pl.Buffered('+n+')</code>'+(n==='2'?' (the default)':'')+'</td><td>correct, error '+e2(b.err)+'</td><td>'+(b.lower.ok?'accepted':'rejected: '+esc(b.lower.msg))+'</td><td class="num">'+U.bytes(b.vmem_bytes)+'</td></tr>'}).join('')})();
  // 7. paged: code and page-table picture
  $('pk-pg-code').innerHTML=U.code(P.code.paged_decode);
  (function(){const pg=P.K.paged,el=$('pk-pg-svg');let hot=null;
    function draw(){const W=Math.min(U.width(el),760),nar=W<520;const cw=nar?24:30,ch=20,x0=nar?54:70,y0=22;
      const tw=x0+pg.npp*cw,tabH=y0+pg.table.length*ch,poolX=nar?0:tw+30,poolY=nar?tabH+26:y0,poolCols=nar?10:8,pc=nar?Math.min(30,Math.floor((W-4)/10)):Math.min(26,Math.floor((W-poolX-4)/poolCols));
      let s='';s+='<text x="'+x0+'" y="12" font-size="11" fill="var(--mute)">logical page</text>';
      for(let p=0;p<pg.npp;p++)s+='<text x="'+(x0+p*cw+cw/2)+'" y="'+(y0-2)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+p+'</text>';
      pg.table.forEach((row,si)=>{const y=y0+si*ch;s+='<text x="'+(x0-6)+'" y="'+(y+14)+'" text-anchor="end" font-size="10">n='+pg.lens[si]+'</text>';
        row.forEach((ph,p)=>{const on=hot&&hot[0]===si&&hot[1]===p;const fill=ph<0?'var(--soft)':(on?'var(--c2)':'var(--acc2)');
          s+='<g data-pg="'+si+','+p+'" style="cursor:pointer"><rect x="'+(x0+p*cw+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="3" fill="'+fill+'" stroke="var(--line)"/>'+
            '<text x="'+(x0+p*cw+cw/2)+'" y="'+(y+14)+'" text-anchor="middle" font-size="10"'+(on?' fill="var(--bg)"':'')+'>'+(ph<0?'&#8211;':ph)+'</text></g>'})});
      s+='<text x="'+poolX+'" y="'+(poolY-10)+'" font-size="11" fill="var(--mute)">pool ('+pg.n_phys+' pages)</text>';
      const used={};pg.table.forEach((row,si)=>row.forEach((ph,p)=>{if(ph>=0)used[ph]=[si,p]}));
      for(let i=0;i<pg.n_phys;i++){const c=i%poolCols,r=Math.floor(i/poolCols),x=poolX+c*pc,y=poolY+r*(pc-2);const u=used[i];
        const on=hot&&u&&u[0]===hot[0]&&u[1]===hot[1];const sameSeq=hot&&u&&u[0]===hot[0];
        s+='<rect x="'+(x+1)+'" y="'+(y+1)+'" width="'+(pc-2)+'" height="'+(pc-4)+'" rx="2" fill="'+(on?'var(--c2)':sameSeq?'var(--acc2)':u?'var(--soft)':'var(--bg)')+'" stroke="'+(u?'var(--mute)':'var(--line)')+'"'+(u?'':' stroke-dasharray="2 2"')+'/>'+
          '<text x="'+(x+pc/2)+'" y="'+(y+pc/2+1)+'" text-anchor="middle" font-size="9"'+(on?' fill="var(--bg)"':' fill="var(--mute)"')+'>'+i+'</text>'}
      const H=Math.max(tabH,poolY+Math.ceil(pg.n_phys/poolCols)*(pc-2))+18;
      const cap=hot&&nar?('sequence '+hot[0]+', page '+hot[1]+': pool page '+pg.table[hot[0]][hot[1]]):hot?('sequence '+hot[0]+', logical page '+hot[1]+' (tokens '+(hot[1]*pg.page)+' to '+(Math.min((hot[1]+1)*pg.page,pg.lens[hot[0]])-1)+') lives in physical page '+pg.table[hot[0]][hot[1]]):'tap a cell';
      s+='<text x="0" y="'+(H-4)+'" font-size="11" fill="var(--mute)">'+cap+'</text>';
      el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Page table and page pool">'+s+'</svg>'}
    el.addEventListener('click',e=>{const g=e.target.closest('[data-pg]');if(!g)return;const [a,b]=g.dataset.pg.split(',').map(Number);if(pg.table[a][b]<0)return;hot=[a,b];draw()});
    el.addEventListener('mouseover',e=>{const g=e.target.closest('[data-pg]');if(!g)return;const [a,b]=g.dataset.pg.split(',').map(Number);if(pg.table[a][b]<0)return;if(!hot||hot[0]!==a||hot[1]!==b){hot=[a,b];draw()}});
    hot=[3,2];draw();U.onRender('t-read',draw);addEventListener('resize',()=>{if(!$('t-read').hidden)draw()})})();
  // 9. bug table and timing table
  (function(){const R=P.ROOT,B=P.K.bugs;const rb=k=>R.bugs.find(b=>b.k===k);
    const ok='<span style="color:var(--good);font-weight:600">caught</span>',miss='<span style="color:var(--bad);font-weight:600">missed</span>';
    const rows=[
      ['Accumulator never zeroed (root lab)',ok+': output NaN',ok+': output NaN','accepted'],
      ['Reduction axis marked "parallel" (root lab)',miss+': error '+e2(rb('kparallel').plain.err),ok+': error '+U.comma(rb('kparallel').tpu.err,2)+' with 2 cores','accepted'],
      ['Index map one tile past the end (root lab)',miss+': silently clamped, error '+U.comma(rb('oob').plain.err,2),ok+': raises out-of-bounds','accepted'],
      ['Block of 100 rows, not a multiple of 8 (root lab)',miss+': error '+e2(R.bad_block.interpret_err),miss+': not checked',ok+': rejected'],
      ['dscale accumulated along a "parallel" axis (section 4)',miss+': error '+e2(B[0].plain_err),ok+': '+B[0].tpu_runs.map(r=>r.nan?'NaN':U.comma(r.err,0)).join(', ')+' (3 seeds)','accepted'],
      ['DMA buffer used before its wait (section 6)',miss+': exact',ok+': '+U.comma(B[1].tpu_nan_rows,0)+' NaN rows','accepted'],
      ['Page index 9,999 in a stale table slot (section 7)',miss+': error '+e2(B[2].plain.err),ok+': raises out-of-bounds','accepted'],
      ['Page index &minus;1 in a stale table slot (section 7)',miss+': error '+e2(B[2].plain.err),miss+': error '+e2(B[2].tpu_minus1.err),'not tried']];
    $('pk-bugtab').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td data-h="interpret=True">'+r[1]+'</td><td data-h="TPU interpreter">'+r[2]+'</td><td data-h="Lowering">'+r[3]+'</td></tr>').join('');
    const T=P.K.timing,nm={bias_gelu:'Bias + GELU',softmax_rows:'Fused softmax',layer_norm:'LayerNorm forward',flash:'Flash attention forward'};
    $('pk-timetab').innerHTML=Object.keys(nm).map(k=>'<tr><td>'+nm[k]+'</td><td class="num">'+U.comma(T[k].xla_ms,2)+'</td><td class="num">'+U.comma(T[k].interp_ms,2)+'</td><td class="num">'+U.comma(T[k].interp_ms/T[k].xla_ms,1)+'&#215;</td></tr>').join('')})();
  // 11. tuned table heatmap
  (function(){const R=P.SR.rpa,el=$('pk-rpa-svg');let gen='TPU v5';
    function draw(){const W=Math.min(U.width(el),760),cells=R.slice.cells;const ps=[...new Set(Object.keys(cells['TPU v5']).map(k=>+k.split('|')[0]))].sort((a,b)=>a-b);
      const ml=[...new Set(Object.keys(cells['TPU v5']).map(k=>+k.split('|')[1]))].sort((a,b)=>a-b);
      const x0=W<520?44:64,y0=30,cw=Math.max(34,Math.floor((W-x0-4)/ml.length)),ch=30;let s='';
      s+='<text x="0" y="12" font-size="10.5" fill="var(--mute)">page size</text><text x="'+x0+'" y="12" font-size="10.5" fill="var(--mute)">max model length (tokens)</text>';
      ml.forEach((m,j)=>{s+='<text x="'+(x0+j*cw+cw/2)+'" y="'+(y0-4)+'" text-anchor="middle" font-size="'+(cw<44?8.5:10)+'">'+(m>=1024?(m/1024)+'K':m)+'</text>'});
      const pal={'4,32':'var(--c1)','8,32':'var(--c6)','16,32':'var(--c3)','4,64':'var(--c5)','8,64':'var(--c2)','16,64':'var(--c4)'};
      ps.forEach((p,i)=>{const y=y0+i*ch;s+='<text x="'+(x0-6)+'" y="'+(y+ch/2+4)+'" text-anchor="end" font-size="10">'+p+'</text>';
        ml.forEach((m,j)=>{const k=p+'|'+m,a=cells['TPU v5'][k],b=cells['TPU v6'][k];const v=gen==='diff'?a:cells[gen][k];
          if(!v){s+='<rect x="'+(x0+j*cw+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="2 2"/>';return}
          const differ=a&&b&&(a[0]!==b[0]||a[1]!==b[1]);const col=gen==='diff'?(differ?'var(--bad)':'var(--soft)'):(pal[v.join(',')]||'var(--dim)');
          const lab=gen==='diff'?(differ?a.join(',')+'/'+b.join(','):'='):v.join(',');
          s+='<rect x="'+(x0+j*cw+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="3" fill="'+col+'" opacity="'+(gen==='diff'&&!differ?1:.85)+'"/>'+
            '<text x="'+(x0+j*cw+cw/2)+'" y="'+(y+ch/2+4)+'" text-anchor="middle" font-size="'+(cw<50?8:9.5)+'" fill="'+(gen==='diff'&&!differ?'var(--mute)':'var(--bg)')+'">'+lab+'</text>'})});
      const H=y0+ps.length*ch+8;el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Tuned block sizes">'+s+'</svg>'+
        (gen==='diff'?'<div class="pk-note">Coloured: v5 and v6 tuned to different (pages, queries) in this cell, shown v5/v6. Over the whole table '+R.differ+' of '+R.common+' keys differ.</div>':'<div class="pk-note">Each cell: (KV pages per block, queries per block). Most common in the whole '+gen+' table: '+R.top[gen].slice(0,3).map(t=>'('+t[0].join(', ')+') &#215; '+t[1]).join(', ')+'.</div>')}
    U.seg($('pk-rpa-gen'),m=>{gen=m;draw()});draw();U.onRender('t-read',draw);addEventListener('resize',()=>{if(!$('t-read').hidden)draw()})})();
  U.predicts($('t-read'));
})();

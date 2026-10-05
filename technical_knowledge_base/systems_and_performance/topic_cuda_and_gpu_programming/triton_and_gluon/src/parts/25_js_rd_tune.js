// ---- Reading sections 4 to 6: attention table, warps table, stages chart, TMA facts, tutorial fit count ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id),ic=window.TG_ic;
  const put=(id,s)=>{const el=$(id);if(el)el.innerHTML=s};
  const err=v=>'max error '+(v===0?'0':v.toExponential(2));
  const main={};D.main.forEach(r=>main[r.key+'.'+r.target]=r);
  const ct=D.exp.causal_tiles_8192_128;
  put('rd-causal',ct.visited.toLocaleString('en-US')+' of '+ct.full.toLocaleString('en-US')+' tiles at N = 8,192 and BM = BN = 128, a fraction of '+ct.fraction);
  put('rd-int-attn','non-causal '+err(ic.attn_fwd.max_abs_err)+', causal '+err(ic.attn_fwd_causal.max_abs_err));
  const T=['sm_80','sm_90a','sm_100a','sm_120','gfx942','gfx950'];
  const mmaOf=r=>{const o=r.ops||{};for(const k of ['HGMMA','UTCHMMA','HMMA'])if(o[k])return o[k]+' '+k;return o.v_mfma?o.v_mfma+' v_mfma':'0'};
  let t='<table class="tbl-sm"><thead><tr><th>Target</th><th class="num">Registers</th><th class="num">Shared / LDS</th><th class="num">Tensor-core instr. (listing)</th><th class="num">exp2 instr.</th></tr></thead><tbody>';
  T.forEach(k=>{const r=main['attn.'+k],o=r.ops||{};t+='<tr><td><b>'+k+'</b></td><td class="num">'+(r.regs||r.vgpr)+(r.vgpr?' VGPR':'')+'</td><td class="num">'+(r.shared/1024).toFixed(r.shared%1024?1:0)+' KB</td><td class="num">'+mmaOf(r)+'</td><td class="num">'+(o['MUFU.EX2']!=null?o['MUFU.EX2']+' MUFU.EX2':(o.v_exp_f32!=null?o.v_exp_f32+' v_exp_f32':''))+'</td></tr>'});
  put('rd-attn-tbl',t+'</tbody></table>');
  // warps table
  const W=[1,2,4,8,16],TG=['sm_80','sm_90a','sm_100a','sm_120'];
  let w='<table class="tbl-sm"><thead><tr><th>num_warps</th>'+TG.map(k=>'<th class="num">'+k+'</th>').join('')+'</tr></thead><tbody>';
  W.forEach(n=>{w+='<tr><td>'+n+' ('+n*32+' threads)</td>'+TG.map(k=>{const r=D.sweep.find(x=>x.k==='mmwarps_w'+n&&x.t===k);
    return '<td class="num" style="'+(r.stack?'background:color-mix(in srgb,var(--bad) 22%,transparent)':'')+'">'+r.regs+' regs'+(r.stack?' + '+r.stack.toLocaleString('en-US')+' B stack':'')+'<br><span class="small mute">'+r.nmma+' '+r.mma+'</span></td>'}).join('')+'</tr>'});
  put('rd-warps-tbl',w+'</tbody></table><p class="small mute">128 x 128 x 64 tile, FP16, num_stages = 3. Registers per thread and stack frame (spills) from <code>cuobjdump -res-usage</code>; the instruction and its static count from the SASS. Note sm_90a and sm_100a below 4 warps, and sm_100a at 16 warps, where the compiler chose <code>HMMA</code> (mma.sync) instead of wgmma or tcgen05.</p>');
  // stages chart
  const LIM={sm_80:163,sm_90a:227,sm_100a:227,sm_120:99},COL={sm_80:'var(--c1)',sm_90a:'var(--c2)',sm_100a:'var(--c3)',sm_120:'var(--c4)'};
  function chart(){
    const box=$('rd-stage-chart');if(!box)return;const Wd=Math.min(720,RD.width(box)),H=250,L=46,R=Wd<480?10:96,Tp=12,B=34,pw=Wd-L-R,ph=H-Tp-B,ymax=240;
    const x=s=>L+(s-1)/5*pw,y=v=>Tp+ph-(v/ymax)*ph;
    let g='';
    for(let v=0;v<=ymax;v+=40){g+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,String(v),{a:'end',fs:10.5,fill:'var(--mute)'})}
    for(let s=1;s<=6;s++)g+=RD.t(x(s),H-B+16,String(s),{a:'middle',fs:10.5,fill:'var(--mute)'});
    g+=RD.t(L+pw/2,H-4,'num_stages',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(4,Tp+4,'KB',{fs:10.5,fill:'var(--mute)'});
    TG.forEach((k,i)=>{const pts=D.exp.smem_stages.filter(r=>r.target===k).sort((a,b)=>a.ns-b.ns);
      g+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+y(LIM[k])+'" y2="'+y(LIM[k])+'" stroke="'+COL[k]+'" stroke-dasharray="4 3" stroke-opacity="0.8"/>';
      const off=(i-1.5)*1.6;
      g+='<polyline fill="none" stroke="'+COL[k]+'" stroke-width="2" points="'+pts.map(p=>x(p.ns)+','+(y(p.observed/1024)+off)).join(' ')+'"/>';
      pts.forEach(p=>{const fits=p.observed<=LIM[k]*1024;g+='<circle cx="'+x(p.ns)+'" cy="'+(y(p.observed/1024)+off)+'" r="3.6" fill="'+(fits?COL[k]:'var(--bg)')+'" stroke="'+COL[k]+'" stroke-width="1.6"><title>'+k+' num_stages '+p.ns+': '+p.observed+' bytes'+(fits?'':' (over the limit)')+'</title></circle>'});
      if(R>40){const last=pts[pts.length-1];g+=RD.t(L+pw+6,y(last.observed/1024)+4+({sm_80:-5,sm_90a:-5,sm_100a:9,sm_120:9}[k]),k,{fs:10.5,fill:COL[k]})}
    });
    let leg='';if(R<=40)leg='<div class="leg">'+TG.map(k=>'<span style="--sw:'+COL[k]+'">'+k+'</span>').join('')+'</div>';
    box.innerHTML=RD.svg(Wd,H,g,'Shared memory against num_stages')+leg+'<p class="small mute">Hollow points do not fit that GPU. sm_80 and sm_120 lie on the same line (mma.sync path), as do sm_90a and sm_100a (wgmma and tcgen05 path); lines are nudged apart slightly to stay visible.</p>';
  }
  chart();RD.onRender(chart);RD.onResize(chart);
  const a=main['mm_tma.sm_90a'],b=main['mm_tma.sm_100a'],c=main['mm_tma_ws.sm_100a'];
  put('rd-tma-ops','on sm_90a the copies became '+a.ops.UTMALDG+' <code>UTMALDG</code> (TMA loads) and one <code>UTMASTG</code> (TMA store) instead of per-thread <code>LDGSTS</code>; on sm_100a '+b.ops.UTMALDG+' <code>UTMALDG</code> feeding <code>UTCHMMA</code>. With <code>warp_specialize=True</code> on sm_100a the TTGIR gains a <code>ttg.warp_specialize</code> region: besides the default 4 warps, a 1-warp partition that issues <code>tcgen05.mma</code> and a 2-warp partition that issues the TMA copies, both asking for only 24 registers (read from the IR), while the main warps hold the accumulator ('+c.regs+' registers per thread).');
  put('rd-int-tma',err(ic.matmul_tma.max_abs_err)+' (FP16 output rounding)');
  put('rd-fit',String(D.exp.tutorial_fit_counts.sm_90a));
})();

// ---- Reading sections 2 and 3: softmax facts, the register-cliff grid, grouped ordering animation, the six-target table ----
(function(){
  const D=window.TGD,$=id=>document.getElementById(id),esc=RD.esc,ic=window.TG_ic;
  const put=(id,s)=>{const el=$(id);if(el)el.innerHTML=s};
  const err=v=>'max error '+(v===0?'0':v.toExponential(2));
  const main={};D.main.forEach(r=>main[r.key+'.'+r.target]=r);
  put('rd-int-soft',err(ic.softmax.max_abs_err));
  put('rd-mist-512',esc(D.interp.mistakes.block_smaller_than_row));
  const so=main['softmax.sm_90a'];
  put('rd-soft-ops',so.ops['SHFL.BFLY']+' <code>SHFL.BFLY</code> (warp shuffles), '+so.ops['STS']+' <code>STS</code> and '+so.ops['LDS']+' <code>LDS</code> through '+so.shared+' bytes of shared memory, '+so.ops['BAR.SYNC']+' <code>BAR.SYNC</code>, '+so.ops['MUFU.EX2']+' <code>MUFU.EX2</code>, '+so.regs+' registers per thread');
  put('rd-int-mm','fp32 inputs '+err(ic.matmul_float32.max_abs_err)+', fp16 inputs '+err(ic.matmul_float16.max_abs_err)+' against a float32 matmul');
  // register cliff grid (softmax sweep, sm_90a)
  const sw=D.sweep.filter(r=>r.k.startsWith('smx_'));
  const blocks=[...new Set(sw.map(r=>+r.k.split('_')[1]))],warps=[1,4,8,16];
  let h='<table class="tbl-sm"><thead><tr><th>BLOCK (row length)</th>'+warps.map(w=>'<th class="num">'+w+' warp'+(w>1?'s':'')+'</th>').join('')+'</tr></thead><tbody>';
  blocks.forEach(b=>{h+='<tr><td>'+b.toLocaleString('en-US')+'</td>'+warps.map(w=>{const r=sw.find(x=>x.k==='smx_'+b+'_w'+w);
    const ept=b/(32*w),sp=r.stack>0;
    return '<td class="num" style="'+(sp?'background:color-mix(in srgb,var(--bad) 22%,transparent)':'')+'">'+r.regs+(sp?' + <b>'+r.stack.toLocaleString('en-US')+' B</b>':'')+'<br><span class="mute small">'+ept+'/thread</span></td>'}).join('')+'</tr>'});
  put('rd-soft-grid',h+'</tbody></table>');
  // six-target table
  const T=['sm_80','sm_90a','sm_100a','sm_120','gfx942','gfx950'],GPU={sm_80:'A100',sm_90a:'H100, H200',sm_100a:'B200, GB200',sm_120:'RTX 5090',gfx942:'MI300X',gfx950:'MI355X'};
  const INS={sm_80:'mma.sync m16n8k16 (HMMA.16816)',sm_90a:'wgmma m64n128k16 (HGMMA.64x128x16)',sm_100a:'tcgen05.mma (UTCHMMA)',sm_120:'mma.sync m16n8k16 (HMMA.16816)',gfx942:'v_mfma_f32_32x32x8_f16',gfx950:'v_mfma_f32_32x32x16_f16'};
  const FEED={sm_80:'cp.async (LDGSTS) into shared, ldmatrix (LDSM) into registers',sm_90a:'cp.async into shared; wgmma reads shared directly',sm_100a:'cp.async into shared; accumulator in TMEM; mbarriers',sm_120:'cp.async into shared, ldmatrix into registers',gfx942:'global loads, ds_write to LDS, ds_read into registers',gfx950:'global loads, ds_write to LDS, ds_read into registers'};
  let t='<table class="tbl-sm"><thead><tr><th>Target</th><th>Instruction</th><th class="num">Per K step</th><th class="num">In the listing</th><th class="num">Registers</th><th class="num">Shared / LDS</th><th>How tiles reach it</th></tr></thead><tbody>';
  T.forEach(k=>{const r=main['matmul.'+k],m=D.exp.mma_per_kstep[k];
    t+='<tr><td><b>'+k+'</b><br><span class="mute small">'+GPU[k]+'</span></td><td><code>'+INS[k]+'</code></td><td class="num">'+m.per_issuer+'<br><span class="mute small">'+m.unit+'</span></td><td class="num">'+D.exp.mma_static[k]+'</td><td class="num">'+(r.regs||r.vgpr)+(r.vgpr?' VGPR':'')+'</td><td class="num">'+(r.shared/1024).toFixed(r.shared%1024?2:0)+' KB</td><td class="small">'+FEED[k]+'</td></tr>'});
  put('rd-mm-tbl',t+'</tbody></table>');

  // ---- grouped ordering animation: 9 x 9 tiles ----
  const NM=9,NN=9;
  function order(p,g){if(!g)return[Math.floor(p/NN),p%NN];const ing=g*NN,first=Math.floor(p/ing)*g,gs=Math.min(NM-first,g);return[first+(p%ing)%gs,Math.floor((p%ing)/gs)]}
  let mode='row';
  function state(n){const rows=new Set(),cols=new Set(),done=[];for(let p=0;p<n;p++){const[m,c]=order(p,mode==='grouped'?3:0);rows.add(m);cols.add(c);done.push([m,c])}return{rows,cols,done,tiles:(rows.size+cols.size)*9}}
  window.TG_grouped=n=>{const s=state(n);return s.tiles};
  function draw(i){
    const n=i,s=state(n),box=$('rd-gr-svg'),W=Math.min(760,RD.width(box)),gap=Math.max(10,W*0.03),cs=Math.floor((W-2*gap-8)/27*0.98),gw=cs*9,H=gw*2+gap+40;
    // layout: B on top right, A on left bottom, C bottom right
    const ax=4,ay=gw+gap+22,bx=ax+gw+gap,by=16,cx=bx,cy=ay;
    let g=RD.t(bx,by-4,'B (K x N)',{fs:11,fill:'var(--mute)'})+RD.t(ax,ay-6,'A (M x K)',{fs:11,fill:'var(--mute)'})+RD.t(cx,cy-6,'C (M x N), launch order',{fs:11,fill:'var(--mute)'});
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){
      g+='<rect x="'+(ax+c*cs)+'" y="'+(ay+r*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+(s.rows.has(r)?'var(--c1)':'var(--soft)')+'" fill-opacity="'+(s.rows.has(r)?0.75:1)+'" stroke="var(--line)"/>';
      g+='<rect x="'+(bx+c*cs)+'" y="'+(by+r*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="'+(s.cols.has(c)?'var(--c2)':'var(--soft)')+'" fill-opacity="'+(s.cols.has(c)?0.75:1)+'" stroke="var(--line)"/>';
    }
    s.done.forEach(([m,c],k)=>{const last=k===s.done.length-1;g+='<rect x="'+(cx+c*cs)+'" y="'+(cy+m*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="var(--c3)" fill-opacity="'+(last?1:0.55)+'"'+(last?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>';
      if(cs>=16)g+=RD.t(cx+c*cs+cs/2-0.5,cy+m*cs+cs/2+3.5,String(k),{a:'middle',fs:Math.min(10,cs*0.45),fill:'var(--bg)'})});
    for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!s.done.some(d=>d[0]===r&&d[1]===c))g+='<rect x="'+(cx+c*cs)+'" y="'+(cy+r*cs)+'" width="'+(cs-1)+'" height="'+(cs-1)+'" fill="none" stroke="var(--line)"/>';
    box.innerHTML=RD.svg(W,H,g,'Tiles of A and B needed by the programs launched so far');
    const other=(()=>{const keep=mode;mode=mode==='row'?'grouped':'row';const v=state(n).tiles;mode=keep;return v})();
    $('rd-gr-cap').innerHTML='<div class="t">'+n+' program'+(n===1?'':'s')+' launched ('+(mode==='row'?'row-major':'grouped')+')</div><p>'+
      (n===0?'Nothing launched yet. Each program will compute one tile of C and needs a whole row of A tiles and a whole column of B tiles.':
       n<=9?'Programs launched so far need '+s.rows.size+' row'+(s.rows.size>1?'s':'')+' of A and '+s.cols.size+' column'+(s.cols.size>1?'s':'')+' of B. '+(n===9?'This is the tutorial\'s comparison point: 9 output tiles.':''):'Past 9 programs both orders keep growing; what matters is how many tiles the programs resident at the same moment share, and grouped ordering keeps that set compact.')+'</p>';
    $('rd-gr-cnt').innerHTML=RD.stat('A tiles needed',s.rows.size*9)+RD.stat('B tiles needed',s.cols.size*9)+RD.stat('A + B tiles',s.tiles,'other order: '+other);
  }
  const A=RD.anim({card:'rd-gr-card',ctl:'rd-gr-ctl',n:82,draw,ms:700,start:9,label:'Programs launched'});
  RD.seg($('rd-gr-mode'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();

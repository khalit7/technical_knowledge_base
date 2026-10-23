// ---- Reading: the hero (top), the roofline with one movable matmul (s2), MFU of real runs (s4), the run-cost estimate (s7). Numbers from window.PMD (out/recompute.json) ----
(function(){
  const P=window.PMD,X=window.CALCX,$=id=>document.getElementById(id);
  const PK=989.5e12,BW=3.35e12;
  const box=(x,y,w,h,stroke,big,lines,fill)=>{let b='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(fill||'var(--soft)')+'" stroke="'+stroke+'" stroke-width="1.5"/>';
    b+=RD.t(x+8,y+18,big,{fs:14,w:600});lines.forEach((s,i)=>{b+=RD.t(x+8,y+34+i*14,s,{fs:11,fill:'var(--mute)'})});return b};

  // ---------- hero: four divisions ----------
  function hero(){const el=$('rd-hero');if(!el)return;const W=RD.width(el);
    const rows=[
      {q:'A training step (section 1)',c:X.sig(P.step_tf_8k,3)+' TFLOP',cd:['60.1 GFLOP per token','× 8,192 tokens'],op:'÷',k:'989.5 TFLOP/s',kd:['× 40% MFU','one H100'],a:X.sig(P.anim_time_s.flash,3)+' s per step',ad:['arithmetic is the limit']},
      {q:'What the step holds (section 3)',c:Math.round(P.anim_peaks_GB.flash)+' GB held',cd:[X.sig(P.states_fsdp8_GB,3)+' GB model state',' + '+X.sig(P.act_total_flash_GB,3)+' GB activations'],op:'vs',k:'80 GB',kd:['memory capacity'],a:'fits, barely',ad:['state sharded over 8 GPUs','with FlashAttention']},
      {q:'A decoded token (section 6)',c:X.sig(2*P.l8_P/1e9+P.kv_seq_4k_GB,3)+' GB read',cd:[X.sig(2*P.l8_P/1e9,4)+' GB weights',' + '+X.sig(P.kv_seq_4k_GB,2)+' GB KV cache'],op:'÷',k:'3.35 TB/s',kd:['memory bandwidth'],a:X.sig(P.tpot_b1_ms,3)+' ms per token',ad:[Math.round(P.tps_b1)+' tokens/s at batch 1','bandwidth is the limit']},
      {q:'A whole run (section 7)',c:'7.2e23 FLOPs',cd:['6 × 8.03e9 × 15T tokens'],op:'÷',k:'989.5 TFLOP/s',kd:['× 40% MFU','then × $3.99 per hour'],a:'$'+X.sig(P.usd_h100/1e6,3)+'M',ad:[Math.round(P.gpuh_h100/1e3)+'K H100-hours']}];
    let b='',y=4;const narrow=W<600,bh=66;
    rows.forEach((r,i)=>{
      if(narrow){b+=RD.t(0,y+12,r.q,{fs:12,w:600});y+=18;
        const g=8,w=(W-g)/2;b+=box(0,y,w,bh,'var(--c1)',r.c,r.cd)+box(w+g,y,w,bh,'var(--c4)',r.op+' '+r.k,r.kd);y+=bh+6;
        b+=box(0,y,W,bh,'var(--acc)','= '+r.a,r.ad,'var(--bg)');y+=bh+14}
      else{const lw=Math.min(150,W*.17),g=24,w=(W-lw-2*g)/3;let x=lw;
        b+=RD.t(0,y+bh/2-2,r.q.replace(/ \(.*/,''),{fs:12,w:600})+RD.t(0,y+bh/2+13,r.q.replace(/^.*\(/,'('),{fs:11,fill:'var(--mute)'});
        b+=box(x,y,w,bh,'var(--c1)',r.c,r.cd);x+=w;b+=RD.t(x+g/2,y+bh/2+5,r.op,{a:'middle',fs:14,w:600});x+=g;
        b+=box(x,y,w,bh,'var(--c4)',r.k,r.kd);x+=w;b+=RD.t(x+g/2,y+bh/2+5,'=',{a:'middle',fs:14,w:600});x+=g;
        b+=box(x,y,w,bh,'var(--acc)',r.a,r.ad,'var(--bg)');y+=bh+10}});
    el.innerHTML=RD.svg(W,y,b,'Four divisions: FLOPs over peak, bytes held against capacity, bytes read over bandwidth, FLOPs over peak times price');}

  // ---------- roofline ----------
  const mmI=m=>2*m*4096*4096/(2*(m*4096+4096*4096+m*4096));
  const costHours=(c,mf)=>c.flops/(PK*mf)/3600;
  window.PMF={mmI:mmI,costHours:costHours,ridge:PK/BW};  // for check/check_page.mjs
  function roof(){const el=$('rd-roof');if(!el)return;const W=RD.width(el),narrow=W<520,H=narrow?250:290,pl=narrow?44:52,pr=10,pt=12,pb=34;
    const m=Math.pow(2,+$('rd-roof-m').value),I=mmI(m),att=Math.min(PK,I*BW);
    const x0=-1,x1=4,y0=-2,y1=3.4,sx=v=>pl+(W-pl-pr)*(Math.log10(v)-x0)/(x1-x0),sy=v=>pt+(H-pt-pb)*(1-(Math.log10(v/1e12)-y0)/(y1-y0));
    let b='';
    for(let e=x0;e<=x1;e++){const x=sx(Math.pow(10,e));b+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+RD.t(x,H-pb+14,['0.1','1','10','100','1,000','10K'][e+1],{a:e===x1?'end':'middle',fs:10.5,fill:'var(--mute)'})}
    for(let e=y0;e<=3;e++){const y=sy(Math.pow(10,e)*1e12);b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(pl-4,y+4,(+Math.pow(10,e).toPrecision(1)).toLocaleString('en-US'),{a:'end',fs:10.5,fill:'var(--mute)'})}
    b+=RD.t((pl+W-pr)/2,H-4,'arithmetic intensity, FLOPs per byte (log)',{a:'middle',fs:11,fill:'var(--mute)'});
    b+=RD.t(pl+4,pt+10,'TFLOP/s (log)',{fs:11,fill:'var(--mute)'});
    const line=(pk,bw,dash,col)=>{const r=pk/bw,xs=[0.1,r,1e4];return '<polyline fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+' points="'+xs.map(v=>sx(v)+','+sy(Math.min(pk,v*bw))).join(' ')+'"/>'};
    b+=line(PK,BW,false,'var(--ink)')+line(5.06e12,165e9,true,'var(--mute)');
    const rx=sx(PK/BW);b+='<line x1="'+rx+'" x2="'+rx+'" y1="'+sy(PK)+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>';
    b+=RD.t(rx+4,H-pb-6,'ridge 295',{fs:11});
    b+=RD.t(W-pr-2,sy(PK)-6,'H100: 989.5 TFLOP/s',{a:'end',fs:11,w:600});
    b+=RD.t(W-pr-2,sy(5.06e12)+15,'M1 Pro: 5.06 (measured)',{a:'end',fs:11,fill:'var(--mute)'});
    b+=RD.t(sx(8),sy(8*BW)+18,'slope: 3.35 TB/s',{fs:11,fill:'var(--mute)'});
    const ax=sx(1/6),ay=sy(BW/6);b+='<circle cx="'+ax+'" cy="'+ay+'" r="4.5" fill="var(--c2)"/>'+RD.t(ax+7,ay+14,'elementwise add',{fs:11,fill:'var(--c2)'});
    const px=sx(I),py=sy(att);b+='<circle cx="'+px+'" cy="'+py+'" r="7" fill="var(--acc)" stroke="var(--bg)" stroke-width="2"/>';
    const lab=m.toLocaleString('en-US')+(m===1?' token':' tokens');b+=RD.t(att>=PK?Math.min(px-6,W-pr-80):px+9,att>=PK?py+20:py+18,lab,{fs:11.5,w:600,fill:'var(--acc)',a:att>=PK?'end':'start'});
    el.innerHTML=RD.svg(W,H,b,'Roofline of an H100 with one movable matmul');
    $('rd-roof-mv').textContent=m.toLocaleString('en-US');
    const tc=2*m*4096*4096/PK,tr=2*(m*4096*2+4096*4096)/BW,f=s=>s<1e-6?X.sig(s*1e9,3)+' ns':s<1e-3?X.sig(s*1e6,3)+' µs':X.sig(s*1e3,3)+' ms';
    $('rd-roof-cnt').innerHTML=RD.stat('Intensity',X.sig(I,3)+(I<1.5?' FLOP':' FLOPs')+' per byte',m<P.roof_m_ridge?'below the ridge (295)':'above the ridge (295)')+
      RD.stat('Attainable on an H100',X.sig(att/1e12,4)+' TFLOP/s',X.sig(100*att/PK,2)+'% of peak')+
      RD.stat('Arithmetic against reading',f(tc)+' / '+f(tr),'for this one matmul')+
      RD.stat('Limit',m<P.roof_m_ridge?'memory-bound':'compute-bound','ridge reached at about '+Math.round(P.roof_m_ridge)+' tokens');}
  const rs=$('rd-roof-m');if(rs)rs.addEventListener('input',roof);

  // ---------- MFU of real runs ----------
  function mfu(){const el=$('rd-mfu');if(!el)return;const W=RD.width(el),narrow=W<560;
    const m1=P.m1.map(r=>r.mfu),rows=[
      ['MT-NLG 530B, 2,240 A100',P.mtnlg_mfu,0,'var(--c1)'],['PaLM 540B, 6,144 TPU v4',P.palm_mfu,P.palm_hfu_ours,'var(--c3)'],
      ['Llama 3 405B, 8,192 H100',P.l3_mfu_430,0,'var(--c4)'],['DeepSeek-V3, H800',P.dsv3_mfu_bf16,0,'var(--c2)'],
      ['Two 8B layers, M1 Pro (measured)',Math.max(...m1),0,'var(--c6)',Math.min(...m1)],['Llama 3.1 8B, model-card hours',P.card_mfu_l8,0,'var(--dim)']];
    const lw=narrow?0:200,pr=44,rh=narrow?42:28,pt=6,H=pt+rows.length*rh+22,sx=v=>lw+(W-lw-pr)*v;let b='';
    b+='<defs><pattern id="rd-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--c3)" stroke-width="3"/></pattern></defs>';
    [0,.25,.5,.75,1].forEach(g=>{const x=sx(g);b+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-18)+'" stroke="var(--line)"/>'+RD.t(x,H-5,Math.round(g*100)+'%',{a:g===0?'start':g===1?'end':'middle',fs:10.5,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=pt+i*rh,by=narrow?y+16:y+5,bh=narrow?18:18;
      b+=RD.t(narrow?0:lw-6,narrow?y+12:y+19,r[0],{a:narrow?'start':'end',fs:11.5});
      if(r[2])b+='<rect x="'+sx(r[1])+'" y="'+by+'" width="'+(sx(r[2])-sx(r[1]))+'" height="'+bh+'" fill="url(#rd-hatch)" stroke="var(--c3)"/>';
      b+='<rect x="'+sx(0)+'" y="'+by+'" width="'+(sx(r[1])-sx(0))+'" height="'+bh+'" fill="'+r[3]+'"/>';
      const lab=r[4]?Math.round(r[4]*100)+' to '+Math.round(r[1]*100)+'%':X.sig(r[1]*100,3)+'%'+(r[2]?' (HFU '+X.sig(r[2]*100,3)+'%)':'');
      const tx=sx(r[2]||r[1])+4;b+=RD.t(Math.min(tx,W-pr-(r[2]?60:0)),by+13,lab,{fs:11,w:600})});
    const gx=sx(720/989.5);b+='<line x1="'+gx+'" x2="'+gx+'" y1="'+pt+'" y2="'+(H-18)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>';
    el.innerHTML=RD.svg(W,H,b,'MFU of published runs, a measured GPU and a model card')+
      '<div class="leg"><span style="--sw:var(--c3)">hatched: PaLM\'s recomputed FLOPs (HFU)</span><span style="--sw:var(--bad)">dashed: best H100 BF16 GEMM, 73%</span></div>';}

  // ---------- run cost ----------
  let pre='l405';
  function cost(){const el=$('rd-cost');if(!el)return;const c=P.cost_presets[pre],mf=+$('rd-cost-mfu').value;
    $('rd-cost-mv').textContent=X.sig(mf*100,3)+'%';
    const hours=costHours(c,mf),usd=hours*c.price,match=c.flops/(PK*c.pub_hours*3600);
    const W=RD.width(el),H=78,pl=0,pr=8,mx=Math.max(hours,c.pub_hours)*1.05,sx=v=>pl+(W-pl-pr)*v/mx;let b='';
    const bar=(y,v,col,lab)=>'<rect x="'+sx(0)+'" y="'+y+'" width="'+(sx(v)-sx(0))+'" height="20" fill="'+col+'"/>'+RD.t(4,y+14,lab,{fs:11.5,w:600,fill:'var(--bg)'});
    const fh=v=>v>=1e6?X.sig(v/1e6,3)+'M':Math.round(v/1e3)+'K';
    b+=bar(6,hours,'var(--acc)','estimate: '+fh(hours)+' GPU-hours')+bar(40,c.pub_hours,'var(--c4)','published: '+fh(c.pub_hours));
    b+=RD.t(W-pr,74,'published / estimate = '+X.sig(c.pub_hours/hours,3),{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H+4,b,'Estimated against published GPU-hours');
    $('rd-cost-cnt').innerHTML=RD.stat('Training FLOPs',X.fE(c.flops),c.pub_flops?'paper: 3.8e25':'6 × N × D')+
      RD.stat('GPU-hours',fh(hours),c.gpus?X.sig(hours/c.gpus/24,3)+' days on '+c.gpus.toLocaleString('en-US')+' GPUs':'')+
      RD.stat('Cost','$'+X.sig(usd/1e6,3)+'M','at $'+c.price.toFixed(2)+' per GPU-hour')+
      RD.stat('MFU that matches the published hours',X.sig(match*100,3)+'%',pre==='dsv3'?'by construction':'all hours counted as training');}
  const cs=$('rd-cost-mfu');if(cs){cs.addEventListener('input',cost);
    RD.seg($('rd-cost-p'),v=>{pre=v;cs.value=P.cost_presets[v].mfu.toFixed(3);cost()});}

  function all(){hero();roof();mfu();cost()}
  all();RD.onRender(all);RD.onResize(all);
})();

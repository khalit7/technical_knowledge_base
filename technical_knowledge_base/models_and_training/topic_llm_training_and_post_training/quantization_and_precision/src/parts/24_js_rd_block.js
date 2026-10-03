// ---- Reading, PTQ: one block of 32 real weights, scaled over five different scopes (animated) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-bk'))return;
  const D=window.QD,QF=window.QF;
  const R=QF.bf16(D.rows_bf16),K=D.K;
  const rows=D.rows.map((r,i)=>({r,w:R.slice(i*K,(i+1)*K)}));
  const M=[
    {k:'tensor',n:'INT4, per tensor',bits:'4',kind:'int4',g:0,scope:'tensor',bpw:4},
    {k:'channel',n:'INT4, per channel',kind:'int4',g:0,scope:'row',bpw:4+16/896},
    {k:'block',n:'INT4, per 32 (Q4_0-like)',kind:'int4',g:32,scope:'block',bpw:4.5},
    {k:'mx',n:'MXFP4',kind:'mxfp4',g:32,scope:'block',bpw:4.25},
    {k:'nv',n:'NVFP4',kind:'nvfp4',g:16,scope:'block',bpw:4.5}];
  let mi=0,ri=2,bi=0;
  $('rd-bkM').innerHTML=M.map((m,i)=>'<button data-i="'+i+'">'+m.n+'</button>').join('');
  $('rd-bkR').innerHTML=rows.map((x,i)=>'<option value="'+i+'">Row '+x.r+(x.r===223?' (holds the largest weight)':x.r===222?' (second largest)':' (ordinary)')+'</option>').join('');
  $('rd-bkR').value=ri;
  function amaxOf(a){let m=0;for(const x of a)m=Math.max(m,Math.abs(x));return m}
  function compute(m,row,b){
    const v=row.w.slice(b*32,b*32+32);
    const out=[],grids=[];let clipped=0;const info=[];
    const subs=m.g===16?[v.slice(0,16),v.slice(16)]:[v];
    for(const s of subs){
      let ctx={tensorAmax:D.w_absmax};
      if(m.scope==='tensor')ctx.amax=D.w_absmax;else if(m.scope==='row')ctx.amax=amaxOf(row.w);
      const r=QF.qgroup(s,m.kind,ctx);out.push(...r.q);info.push(r.info);clipped+=r.info.clipped||0;
      let g=r.info.grid;if(!g){g=[]}grids.push(g)}
    const scopeAmax=m.scope==='tensor'?D.w_absmax:m.scope==='row'?amaxOf(row.w):amaxOf(v);
    const zeros=out.filter((x,i)=>x===0&&v[i]!==0).length;
    const used=new Set(out.map(x=>x.toPrecision(6))).size;
    return {v,q:out,grids,info,clipped,zeros,used,err:QF.relerr(out,v),scopeAmax};
  }
  const fmt=(x,d)=>Math.abs(x)>=0.01||x===0?x.toFixed(d||3):x.toExponential(2);
  function svg(st,c){
    const W=RD.width($('rd-bkP')),H=Math.round(Math.min(260,Math.max(190,W*0.36)));
    const pl=44,pr=8,pt=12,pb=22,iw=W-pl-pr,ih=H-pt-pb;
    const A=Math.max(amaxOf(c.v),1e-9)*1.15;
    const y=val=>pt+ih/2-(val/A)*(ih/2);
    const bw=iw/32;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="32 weights and their quantised values">';
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="var(--mute)" stroke-width="1"/>';
    [A/1.15,-A/1.15].forEach(t=>{s+='<text x="'+(pl-4)+'" y="'+(y(t)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+fmt(t)+'</text>'});
    // step 1+: scope absmax lines (only if within view)
    if(st>=1){const a=c.scopeAmax;if(a<=A){[a,-a].forEach(t=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--c2)" stroke-dasharray="4 3"/>'})}}
    // step 2+: grid of representable values
    if(st>=2){c.grids.forEach((g,gi)=>{const x0=pl+(c.grids.length>1?gi*16*bw:0),x1=c.grids.length>1?x0+16*bw:W-pr;
      g.forEach(t=>{if(Math.abs(t)<=A)s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--c4)" stroke-opacity=".55" stroke-width="1"/>'})})}
    for(let i=0;i<32;i++){const x=pl+i*bw+bw*0.15,w=bw*0.7,val=c.v[i];
      const y0=y(0),y1=y(val);s+='<rect x="'+x+'" y="'+Math.min(y0,y1)+'" width="'+w+'" height="'+Math.max(1,Math.abs(y1-y0))+'" fill="var(--c1)" opacity="'+(st>=3?0.28:0.9)+'"/>';
      if(st>=3){const q=c.q[i],yq=y(q);const z=q===0&&val!==0;
        s+='<rect x="'+(x+w*0.2)+'" y="'+Math.min(y0,yq)+'" width="'+(w*0.6)+'" height="'+Math.max(1,Math.abs(yq-y0))+'" fill="'+(z?'var(--bad)':'var(--c3)')+'"/>';
        if(z)s+='<circle cx="'+(x+w/2)+'" cy="'+y0+'" r="'+Math.max(2,Math.min(3.5,bw*0.2))+'" fill="var(--bad)"/>'}}
    s+='<text x="'+pl+'" y="'+(H-6)+'" font-size="10" fill="var(--mute)">input column '+(bi*32)+'</text><text x="'+(W-pr)+'" y="'+(H-6)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(bi*32+31)+'</text>';
    return s+'</svg>'}
  const CAP=[
    m=>['The 32 weights','Row '+rows[ri].r+', input columns '+(bi*32)+' to '+(bi*32+31)+' of layer 8\'s query projection in Qwen2.5-0.5B, the exact bf16 values from the checkpoint. Bars are drawn to scale; the axis ends at this block\'s largest weight.'],
    m=>['Find the largest magnitude in the scope',m.scope==='tensor'?'Per tensor: one scale for all 802,816 weights, so it is set by the single largest, '+fmt(D.w_absmax)+' (row 223, column 5). The dashed line marks it if it falls in this view.':m.scope==='row'?'Per channel: one scale per output row, set by the largest of its 896 weights.':m.k==='nv'?'NVFP4: one scale per 16 weights, so this view holds two blocks, each set by its own largest.':'One scale per 32 weights: only this block\'s own largest matters.'],
    m=>['Lay down the grid of representable values',m.kind==='int4'?'INT4 has 15 evenly spaced levels from minus to plus the scale times 7. Purple lines are the levels that fall inside this view.':m.k==='mx'?'MXFP4: the 15 E2M1 values (0, ±0.5, ±1, ±1.5, ±2, ±3, ±4, ±6) times a power-of-two scale (E8M0). The spec sets it to 2 to the floor of log2(largest), divided by 4, so the largest lands between 4 and 8 and anything above 6 clips.':'NVFP4: the same E2M1 values, times an FP8 E4M3 block scale (times one FP32 scale for the tensor), so the block\'s largest lands on 6 almost exactly.'],
    m=>['Snap every weight to its nearest level','Green is the stored value. An orange dot marks a non-zero weight that rounded to zero: its information is gone.'],
    m=>['Count the damage','Compare the counters across the five scopes (buttons above), then pick row 223, block 0, where the outlier itself lives.']];
  let A;
  function draw(i){const m=M[mi],c=compute(m,rows[ri],bi);
    $('rd-bkM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===mi));
    $('rd-bkP').innerHTML=svg(i,c);
    const cp=CAP[i](m);$('rd-bkT').textContent=(i+1)+' of 5 · '+m.n+': '+cp[0];$('rd-bkC2').textContent=cp[1];
    const sc=c.info.map(x=>x.scale!=null?fmt(x.scale,4):'min-max').join(' and ');
    $('rd-bkN').innerHTML=RD.stat('Scale set by',i>=1?fmt(c.scopeAmax):'?',m.scope==='tensor'?'whole tensor':m.scope==='row'?'whole row':'this block')+
      RD.stat('Step between levels',i>=2?sc:'?',m.kind==='int4'?'scale':'scale (E2M1 steps are 0.5 to 2 times it)')+
      RD.stat('Weights rounded to zero',i>=3?c.zeros+' of 32':'?','')+
      RD.stat('Distinct values used',i>=3?c.used+' of '+(m.kind==='int4'?15:15):'?','')+
      RD.stat('Block error',i>=3?(100*c.err).toFixed(1)+'%':'?','‖q − w‖ / ‖w‖'+(c.clipped&&i>=3?'; '+c.clipped+' clipped above 6':''))+
      RD.stat('Bits per weight',m.bpw.toFixed(m.bpw%1?3:0),m.k==='nv'?'+ one FP32 per tensor':'');
    // every scope at once, for the before/after comparison
    if(i>=4){$('rd-bkX').hidden=false;$('rd-bkX').innerHTML='<div class="small mute">This block under every scope (error, then weights zeroed):</div><div class="bars">'+M.map((mm,j)=>{const cc=compute(mm,rows[ri],bi);
      return '<div class="row'+(j===mi?' hl':'')+'"><span class="nm">'+mm.n+'</span><span class="track"><span class="fill" style="width:'+Math.min(100,100*cc.err)+'%;background:'+(j===mi?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+(100*cc.err).toFixed(1)+'%, '+cc.zeros+'</span></div>'}).join('')+'</div>'}
    else $('rd-bkX').hidden=true;
  }
  A=RD.anim({card:'rd-bk',ctl:'rd-bkC',n:5,draw,ms:2300,label:'Step'});
  $('rd-bkM').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;mi=+b.dataset.i;A.reset(5);A.play()});
  $('rd-bkR').addEventListener('change',e=>{ri=+e.target.value;A.go(4)});
  $('rd-bkB').addEventListener('input',e=>{bi=+e.target.value;$('rd-bkBv').textContent=bi;A.go(4)});
  addEventListener('resize',()=>A.redraw());
})();

// ---- Tables tab: every table as printed, sortable, with derived columns and the checks ----
(function(){const T=PAPER.tables,RC=PAPER.rc||{},D=RC.derived||{};
  const L=[['T1a','Table 1: unconditional, CelebA-HQ'],['T1b','Table 1: unconditional, FFHQ'],['T1c','Table 1: unconditional, LSUN-Churches'],['T1d','Table 1: unconditional, LSUN-Bedrooms'],['T2','Table 2: text-to-image, MS-COCO'],['T3','Table 3: class-conditional ImageNet'],['T10','Table 10: ImageNet, all runs'],['T4','Table 4: user studies'],['T5','Table 5: super-resolution ×4'],['T11','Table 11: super-resolution with a pixel baseline'],['T6','Table 6: inpainting efficiency, pixel against latent'],['T7','Table 7: inpainting on Places'],['T8','Table 8: every autoencoder'],['T9','Table 9: layout-to-image'],['T18','Table 18: training compute and throughput']];
  const sel=$('tbSel');sel.innerHTML=L.map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join('');
  const num=s=>{const m=String(s).replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN};
  let sortc=-1,dir=1;
  function extra(k,t){// derived columns: [header, fn(row) -> string]
    if(k==='T6')return [['× faster training (derived)',r=>(num(r[1])/0.11).toFixed(2)],['× faster sampling @256 (derived)',r=>(num(r[2])/0.26).toFixed(2)],['× lower FID (derived)',r=>(24.74/num(r[5])).toFixed(3)]];
    if(k==='T18')return [['Overall A100-days (derived, ÷ 2.2)',r=>isNaN(num(r[3]))?'':(num(r[3])/2.2).toFixed(1)]];
    return []}
  function render(){const k=sel.value,t=T[k];if(!t)return;const ex=extra(k,t);$('tbCap').innerHTML=t.note?t.note.replace(/</g,'&lt;'):'';
    const bold=new Set(t.bold.map(b=>b[0]+','+b[1]));let rows=t.rows.map((r,i)=>({r,i}));
    if(sortc>=0)rows=rows.slice().sort((a,b)=>{const x=sortc<a.r.length?num(a.r[sortc]):num(ex[sortc-a.r.length][1](a.r)),y=sortc<b.r.length?num(b.r[sortc]):num(ex[sortc-b.r.length][1](b.r));return (isNaN(x)?1e9:x)*dir-(isNaN(y)?1e9:y)*dir});
    let h='<table><thead>';t.head.forEach((hr,hi)=>{h+='<tr>'+hr.map((c,j)=>'<th'+(hi===t.head.length-1?' data-c="'+j+'" style="cursor:pointer"':'')+'>'+c+(hi===t.head.length-1&&sortc===j?(dir>0?' ▲':' ▼'):'')+'</th>').join('')+(hi===t.head.length-1?ex.map((e,j)=>'<th data-c="'+(hr.length+j)+'" style="cursor:pointer" class="mute">'+e[0]+'</th>').join(''):ex.map(()=>'<th></th>').join(''))+'</tr>'});
    h+='</thead><tbody>';rows.forEach(({r,i})=>{const ours=/ours|^LDM|^\d|Pixel-DM/.test(r[0])&&k!=='T4',sec=r.slice(1).every(c=>c==='');
      h+='<tr'+(ours&&!sec?' style="background:var(--soft)"':'')+'>'+r.map((c,j)=>'<td'+(j===0?' style="text-align:left"':'')+'>'+(bold.has(i+','+j)?'<b>'+c+'</b>':(sec?'<b>'+c+'</b>':c))+'</td>').join('')+ex.map(e=>'<td class="mute">'+(sec?'':e[1](r))+'</td>').join('')+'</tr>'});
    $('tbOut').innerHTML=h+'</tbody></table>';
    $('tbOut').querySelectorAll('th[data-c]').forEach(th=>th.addEventListener('click',()=>{const c=+th.dataset.c;if(sortc===c)dir=-dir;else{sortc=c;dir=1}render()}));
    const N={T6:'Defaults reproduce the "at least 2.7×" speed-up independently (smallest ratio 2.70×, hours per epoch); the "at least 1.6×" FID factor does not hold for the attention-free row (1.55×).',
      T18:'LSUN-Bedrooms LDM-4 prints overall compute 55 below generator compute 60 (a misprint). Churches LDM-8 is "100 steps, 410K" here but "200-s" in Table 1 and 500k iterations in Table 12, with 256M parameters here against 294M there.',
      T2:'GLIDE\'s 6B here; the GLIDE paper describes 3.5B plus a 1.5B upsampler. GLIDE and Make-A-Scene numbers are copied from [26].',T8:'f = 4 (VQ, |Z| 8192) is Figure 1\'s "ours": PSNR 27.43, R-FID 0.58.',
      T7:'The record (1.50) is the bigger 387M model fine-tuned at 512²; the 215M rows match LaMa.',T4:'Task 2 shares sum to 100% ('+(D.t4?D.t4.sr.toFixed(1):'100')+'% and '+(D.t4?D.t4.inp.toFixed(1):'100')+'%); the SR study is against the paper\'s own pixel model, not SR3.',
      T1b:'LDM is fourth here: ProjectedGAN 3.08, StyleGAN 4.16 lead.',T3:'LDM-4-G uses classifier-free guidance (s = 1.5); ADM-G uses classifier guidance.'};
    $('tbNote').innerHTML=N[k]||'';$('tb8').innerHTML=''}
  sel.addEventListener('change',()=>{sortc=-1;render()});
  const chk=()=>{const C=RC.checks||[];let h='<div class="tw"><table><thead><tr><th>Claim</th><th>Printed</th><th>Recomputed or compared</th><th>Verdict</th></tr></thead><tbody>';
    C.forEach(c=>{const col=c.verdict==='holds'?'var(--good)':'var(--bad)';h+='<tr><td style="text-align:left">'+c.claim.replace(/</g,'&lt;')+' '+A(PAPER.meta.ax+'#'+c.where,'(in the paper)')+'</td><td>'+c.printed+'</td><td style="text-align:left">'+c.computed+(c.note?'<br><span class="mute">'+c.note+'</span>':'')+'</td><td style="color:'+col+';font-weight:600">'+c.verdict+'</td></tr>'});
    $('tbChk').innerHTML=h+'</tbody></table></div><p class="small mute">'+C.filter(c=>c.verdict==='holds').length+' of '+C.length+' hold.</p>'};
  onTab('t-tables',()=>{render();chk()});
  document.querySelectorAll('a[data-to="tb8"]').forEach(a=>a.addEventListener('click',()=>{sel.value='T8';render()}));
})();

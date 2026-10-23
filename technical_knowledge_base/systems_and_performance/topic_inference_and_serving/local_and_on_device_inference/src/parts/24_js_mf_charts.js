// ---- sections 3 to 6: hex view, load times, the GGUF map, type mix, block layouts, ONNX operators ----
(function(){
  const E=RD.esc,c=MFU.c;
  // safetensors: first bytes of the real file
  const sh=document.getElementById('mf-st-hex');
  if(sh){const s=MF.st.hf06,b8=s.first8.split(' ');const enc=new TextEncoder().encode(s.head.slice(0,72));
    const bytes=b8.map(h=>({h,k:'len'})).concat(Array.from(enc).map(v=>({h:('0'+v.toString(16)).slice(-2),k:'json',ch:String.fromCharCode(v)})));
    let out='';for(let i=0;i<bytes.length;i+=16){const row=bytes.slice(i,i+16);
      out+=('000'+i.toString(16)).slice(-4)+'  '+row.map(x=>x.k==='len'?'<i>'+x.h+'</i>':'<u>'+x.h+'</u>').join(' ')+'   '.repeat(16-row.length)+'  '+row.map(x=>x.k==='len'?'.':E(x.ch)).join('')+'\n'}
    sh.innerHTML=out+'<span class="mf-note"><i>red</i>: header length, 0x8ae0 = '+c(s.hlen)+'; <u>green</u>: the JSON header begins ... ('+c(s.hlen)+' bytes in all)</span>'}
  // load times
  const lb=document.getElementById('mf-lb');
  const LR=[['bin_full','torch.load, pickle .bin','reads and copies everything'],['bin_mmap','torch.load(mmap=True)','pickle program, storages mapped'],['st_full','safetensors load_file','maps the file'],['st_one','safetensors, one tensor','header plus one slice'],
    ['bin_full+touch','torch.load, then touch all','every page'],['bin_mmap+touch','torch.load(mmap=True), touch all','every page'],['st_full+touch','safetensors, touch all','every page']];
  function drawLb(){if(!lb)return;const m=MF.lb.m;MFU.bars(lb,LR.map((r,i)=>({nm:r[1],ml:r[2],v:m[r[0]].med,lo:m[r[0]].min,hi:m[r[0]].max,col:/^bin/.test(r[0])?'var(--c2)':'var(--c3)',
    txt:(m[r[0]].med<0.1?(m[r[0]].med*1000).toFixed(0)+' ms':m[r[0]].med.toFixed(2)+' s')+'<span class="ml">+'+c(m[r[0]].mib)+' MiB</span>'})),0.42)}
  drawLb();
  // GGUF map
  const gm=document.getElementById('mf-ggmap'),gcap=document.getElementById('mf-ggmap-cap');
  if(gm){const G=MF.gg.q4km,kv=G.kv,pos=k=>kv.find(x=>x[0]===k);
    const tk=pos('tokenizer.ggml.tokens'),tt=pos('tokenizer.ggml.token_type'),mg=pos('tokenizer.ggml.merges'),ct=pos('tokenizer.chat_template');
    const segs=[[0,24,'fixed header','magic, version, tensor count, key/value count: 24 bytes',4],
      [24,tk[3],'architecture and general keys',(tk[3]-24)+' bytes: general.*, qwen3.* (layers 28, heads 16, KV heads 8, context 40,960 ...), tokenizer model names',1],
      [tk[3],tk[3]+tk[4],'token strings','tokenizer.ggml.tokens: 151,936 strings, '+c(tk[4])+' bytes',2],
      [tt[3],tt[3]+tt[4],'token types','tokenizer.ggml.token_type: 151,936 INT32, '+c(tt[4])+' bytes',6],
      [mg[3],mg[3]+mg[4],'merges','tokenizer.ggml.merges: 151,387 strings, '+c(mg[4])+' bytes',5],
      [mg[3]+mg[4],ct[3],'special ids','eos, padding, add_bos: '+(ct[3]-mg[3]-mg[4])+' bytes',4],
      [ct[3],ct[3]+ct[4],'chat template','tokenizer.chat_template: a '+c(ct[4])+'-byte Jinja program',3],
      [ct[3]+ct[4],G.kvEnd,'last keys','general.quantization_version, general.file_type',4],
      [G.kvEnd,G.tiEnd,'tensor infos',G.n+' tensor infos: '+c(G.tiEnd-G.kvEnd)+' bytes',1],
      [G.tiEnd,G.ds,'padding',(G.ds-G.tiEnd)+' zero byte(s) to reach a multiple of 32',6]];
    const TC={F32:'var(--c5)',Q4_K:'var(--c1)',Q6_K:'var(--c2)'};
    function bar(items,total,sel,attr){return '<div class="mf-map" style="height:26px">'+items.map((s,i)=>{const w=100*(s[1]-s[0])/total;
      return '<span '+attr+'="'+i+'" title="'+E(s[2])+'" style="flex:0 0 '+w.toFixed(4)+'%;min-width:'+(attr==='data-d'?0:3)+'px;background:'+s[5]+(i===sel?';outline:2px solid var(--ink);outline-offset:-2px':'')+'">'+(w*RD.width(gm)/100>s[2].length*7+8?E(s[2]):'')+'</span>'}).join('')+'</div>'}
    const whole=[[0,G.ds,'header + metadata','',0,'var(--c4)'],[G.ds,G.size,'tensor data','',0,'var(--c1)']];
    const hdr=segs.map(s=>s.concat(['var(--c'+s[4]+')']));
    const data=G.t.slice().sort((a,b)=>a[3]-b[3]).map(t=>[G.ds+t[3],G.ds+t[3]+t[4],t[0]+' ('+t[2]+')','',0,TC[t[2]]||'var(--c6)']);
    let sel={h:2,d:-1};
    function draw(){gm.innerHTML='<div class="small mute">Whole file, '+c(G.size)+' bytes</div>'+bar(whole,G.size,-1,'data-w')+
      '<div class="small mute">The first '+c(G.ds)+' bytes, zoomed (tiny segments drawn at least 3 px wide)</div>'+bar(hdr,G.ds,sel.h,'data-h')+
      '<div class="small mute">The data section: '+G.n+' tensors in file order, coloured by type (<span style="color:var(--c1)">Q4_K</span>, <span style="color:var(--c2)">Q6_K</span>, <span style="color:var(--c5)">F32</span>)</div>'+bar(data,G.size-G.ds,sel.d,'data-d')}
    gm.addEventListener('click',e=>{const t=e.target.closest('[data-h],[data-d],[data-w]');if(!t)return;
      if(t.dataset.h!=null){sel={h:+t.dataset.h,d:-1};const s=segs[sel.h];gcap.innerHTML='<b>'+E(s[2])+'</b>, bytes '+c(s[0])+' to '+c(s[1])+': '+E(s[3])}
      else if(t.dataset.d!=null){sel={h:-1,d:+t.dataset.d};const s=data[sel.d];gcap.innerHTML='<b>'+E(s[2])+'</b> at file offset '+c(s[0])+', '+c(s[1]-s[0])+' bytes'}
      else gcap.innerHTML=t.dataset.w==='0'?'Header and metadata: '+(100*G.ds/G.size).toFixed(1)+'% of the file.':'Tensor data: '+c(G.size-G.ds)+' bytes.';draw()});
    RD.onResize(draw);RD.onRender(draw);
    draw();const s=segs[2];gcap.innerHTML='<b>'+s[2]+'</b>, bytes '+c(s[0])+' to '+c(s[1])+': '+s[3]+'. Tap any segment.'}
  // type mix
  const gt=document.getElementById('mf-ggtypes');
  if(gt){const G=MF.gg.q4km,bpe={Q4_K:4.5,Q6_K:6.5625,F32:32};
    MFU.bars(gt,Object.keys(G.tb).sort((a,b)=>G.tb[b]-G.tb[a]).map((k,i)=>({nm:k+' ('+G.tc[k]+' tensors)',ml:bpe[k]+' bits per weight',v:G.tb[k],col:k==='Q4_K'?'var(--c1)':k==='Q6_K'?'var(--c2)':'var(--c5)',txt:MFU.fmtB(G.tb[k])})))}
  // Q4_K block
  const qk=document.getElementById('mf-q4k');
  if(qk){const B=MF.blocks.q4k,h=B.block_hex,parts=[[0,2,'d (F16)','var(--c2)'],[2,4,'dmin (F16)','var(--c4)'],[4,16,'12 bytes: 8 scales + 8 mins, 6 bits each','var(--c5)'],[16,144,'128 bytes: 256 codes, 4 bits each','var(--c1)']];
    const by=i=>h.substr(2*i,2);
    let s='<div class="small mute">'+E(B.tensor)+' ('+B.type+'), first super-block at file offset '+c(B.abs_offset)+': 144 bytes for 256 weights = '+B.bits_per_weight+' bits each</div><div class="mf-blk">';
    for(let i=0;i<144;i++){const p=parts.find(p=>i>=p[0]&&i<p[1]);s+='<span style="background:'+p[3]+'" title="'+p[2]+'">'+by(i)+'</span>'}
    s+='</div><div class="hmleg">'+parts.map(p=>'<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+p[3]+';margin-right:4px"></span>'+p[2]+'</span>').join('')+'</div>';
    s+='<p class="small">d = '+B.d.toPrecision(5)+', dmin = '+B.dmin.toPrecision(5)+'. Sub-block 0: 6-bit scale '+B.subblocks[0].scale6+' and min '+B.subblocks[0].min6+', so scale = d &times; '+B.subblocks[0].scale6+' = '+B.subblocks[0].scale.toPrecision(4)+' and offset = dmin &times; '+B.subblocks[0].min6+' = '+B.subblocks[0].min.toPrecision(4)+'. The first code is the low 4 bits of byte 16 (0x'+by(16)+'): '+(parseInt(by(16),16)&15)+'.</p>';
    s+='<div class="tw"><table class="mf-tbl"><thead><tr><th>weight</th>'+B.decoded_first8.map((_,i)=>'<th class="num">'+i+'</th>').join('')+'</tr></thead><tbody><tr><td>original BF16</td>'+B.orig_first8.map(v=>'<td class="num">'+v.toFixed(4)+'</td>').join('')+'</tr><tr><td>decoded Q4_K</td>'+B.decoded_first8.map(v=>'<td class="num">'+v.toFixed(4)+'</td>').join('')+'</tr></tbody></table></div>';
    s+='<p class="small mute">Hand decode equals gguf-py\'s dequantize: '+(B.matches_ggufpy?'yes':'no')+'. Root-mean-square error over the block '+B.rmse_vs_orig_256.toPrecision(2)+', against weights whose own RMS is '+B.orig_rms_256.toPrecision(2)+'.</p>';
    qk.innerHTML=s}
  // GGUF block vs MLX groups, same 256 weights
  const gp=document.getElementById('mf-grp');
  function drawGp(){const M=MF.blocks.mlx,Q=MF.blocks.q4k;
    function strip(items){return '<div class="mf-map" style="height:24px">'+items.map(it=>'<span style="flex:0 0 '+(100*it[0]/144).toFixed(3)+'%;background:'+it[2]+'" title="'+E(it[1])+'">'+(it[0]/144*RD.width(gp)>it[1].length*7+8?E(it[1]):'')+'</span>').join('')+'</div>'}
    let s='<div class="small"><b>GGUF Q4_K</b>: one block, contiguous at file offset '+c(Q.abs_offset)+'</div>'+strip([[2,'d','var(--c2)'],[2,'dmin','var(--c4)'],[12,'scales','var(--c5)'],[128,'256 codes','var(--c1)']]);
    s+='<div class="small" style="margin-top:8px"><b>MLX affine 4-bit, group 64</b>: four groups, their pieces in three tensors</div>'+
      strip([[128,'256 codes, in k_proj.weight','var(--c1)'],[8,'4 scales','var(--c5)'],[8,'4 biases','var(--c4)']]);
    s+='<div class="tw"><table class="mf-tbl"><thead><tr><th>piece</th><th>tensor</th><th>dtype, shape</th><th class="num">file offset of the tensor</th></tr></thead><tbody>'+
      [['codes','k_proj.weight',M.weight],['scales','k_proj.scales',M.scales],['biases','k_proj.biases',M.biases]].map(r=>'<tr><td>'+r[0]+'</td><td><code>'+r[1]+'</code></td><td>'+r[2][0]+' ['+r[2][1].join(', ')+']</td><td class="num">'+c(r[2][2])+'</td></tr>').join('')+'</tbody></table></div>';
    s+='<p class="small">First MLX group: scale '+M.scale0.toPrecision(4)+', bias '+M.bias0.toPrecision(4)+', codes '+M.q_first8.join(', ')+' ... so weight 0 = '+M.scale0.toPrecision(4)+' &times; '+M.q_first8[0]+' + ('+M.bias0.toPrecision(4)+') = '+M.decoded_first8[0].toFixed(4)+' (original '+M.orig_first8[0].toFixed(4)+'). Both layouts: 144 bytes per 256 weights.</p>';
    gp.innerHTML=s}
  if(gp){drawGp();RD.onResize(drawGp);RD.onRender(drawGp)}
  // ONNX operators
  const on=document.getElementById('mf-onnx');
  if(on){const oc=MF.onnx_06.op_counts;const ks=Object.keys(oc).sort((a,b)=>oc[b]-oc[a]).slice(0,14);
    MFU.bars(on,ks.map(k=>({nm:k,v:oc[k],col:/MatMul|Softmax/.test(k)?'var(--c2)':/Pow|ReduceMean|Sqrt|Reciprocal/.test(k)?'var(--c3)':'var(--c1)',txt:c(oc[k])})))}
})();

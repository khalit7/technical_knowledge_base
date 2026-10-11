// ---- File explorer tab: step through real fields; tensor tables; all files ----
(function(){
  const E=RD.esc,c=MFU.c;const $=id=>document.getElementById(id);if(!$('mf-bx-card'))return;
  const KC={len:'var(--c2)',json:'var(--c4)',meta:'var(--c5)',entry:'var(--c1)',pad:'var(--c6)',data:'var(--c3)',magic:'var(--c2)',hdr:'var(--c2)',kv:'var(--c4)',ti:'var(--c1)'};
  const NAMES={st06:'Qwen3-0.6B model.safetensors',gguf:'Qwen3-0.6B-Q4_K_M.gguf',mlx4:'Qwen3-0.6B-4bit model.safetensors'};
  let file='st06';const SK={st06:'hf06',mlx4:'mlx4'};
  const reg=(window.TAB_RENDER=window.TAB_RENDER||{});
  function mark(el,f,size,zoomEnd){const W=zoomEnd||size;el.innerHTML='';
    const a=Math.min(f.o,W),b=Math.min(f.o+f.n,W);const s=document.createElement('span');
    s.style.left=(100*a/W)+'%';s.style.width=Math.max(0,100*(b-a)/W)+'%';s.style.background=KC[f.k]||'var(--acc)';el.appendChild(s)}
  function hex(f){const h=f.h||'';let s='';for(let i=0;i<h.length/2;i+=16){const row=[];for(let j=i;j<Math.min(i+16,h.length/2);j++)row.push(h.substr(2*j,2));
      const asc=row.map(x=>{const v=parseInt(x,16);return v>=32&&v<127?String.fromCharCode(v):'.'}).join('');
      s+=c(f.o+i).padStart(11,' ')+'  '+row.join(' ').padEnd(48,' ')+' '+E(asc)+'\n'}
    return s+(f.n>h.length/2&&h?'... '+c(f.n-h.length/2)+' more bytes':'')||'(a span of fields: see the steps around it)'}
  const A=RD.anim({card:'mf-bx-card',ctl:'mf-bx-ctl',n:MF.fields.st06.fields.length,ms:1700,label:'Field',draw:i=>{
    const F=MF.fields[file],f=F.fields[i];const hdrEnd=file==='gguf'?MF.gg.q4km.ds:MF.st[SK[file]].ds;
    $('mf-bx-m1').textContent='Whole file, '+c(F.size)+' bytes';$('mf-bx-m2').textContent='First '+c(hdrEnd)+' bytes (everything before the tensor data), zoomed';
    mark($('mf-bx-map1'),f,F.size);mark($('mf-bx-map2'),f,F.size,hdrEnd);
    $('mf-bx-cap').innerHTML='<div class="t">'+(i+1)+'/'+F.fields.length+'. '+E(f.l)+'</div><p>bytes '+c(f.o)+' to '+c(f.o+f.n)+' ('+c(f.n)+' bytes): <b>'+E(String(f.v))+'</b></p>';
    $('mf-bx-hex').textContent='';$('mf-bx-hex').innerHTML=hex(f);
    $('mf-bx-cnt').innerHTML=RD.stat('field',f.k)+RD.stat('offset',c(f.o))+RD.stat('share of file',(100*f.n/F.size<0.01?'&lt; 0.01':(100*f.n/F.size).toFixed(2))+'%')}});
  // the controller registers with t-read; redraw when this tab opens too
  (reg['t-bytes']=reg['t-bytes']||[]).push(()=>A.redraw());
  RD.seg($('mf-bx-file'),m=>{file=m;A.reset(MF.fields[m].fields.length);table()});
  // tensor table
  function rows(){if(file==='gguf')return MF.gg.q4km.t.map(t=>[t[0],t[2],'['+t[1].join(', ')+']',MF.gg.q4km.ds+t[3],t[4]]);
    const S=MF.st[SK[file]];return S.t.map(t=>[t[0].replace(/^~/,'model.layers.'),t[1],'['+t[2].join(', ')+']',S.ds+t[3],t[4]])}
  function table(){const q=$('mf-bx-q').value.trim().toLowerCase();const R=rows().filter(r=>!q||(r[0]+' '+r[1]).toLowerCase().includes(q));
    const tot=R.reduce((s,r)=>s+r[4],0);$('mf-bx-tsum').innerHTML=NAMES[file]+': '+c(R.length)+' tensors'+(q?' match':'')+', '+MFU.fmtB(tot)+(R.length>80?'; showing the first 80 in file order':'');
    $('mf-bx-tt').innerHTML='<thead><tr><th>name</th><th>type</th><th>shape</th><th class="num">file offset</th><th class="num">bytes</th></tr></thead><tbody>'+
      R.sort((a,b)=>a[3]-b[3]).slice(0,80).map(r=>'<tr><td>'+E(r[0])+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td class="num">'+c(r[3])+'</td><td class="num">'+c(r[4])+'</td></tr>').join('')+'</tbody>'}
  $('mf-bx-q').addEventListener('input',table);table();
  // all files
  const ST={hf06:'HF Qwen3-0.6B (as released)',hf17a:'HF Qwen3-1.7B shard 1',hf17b:'HF Qwen3-1.7B shard 2',mlx4:'MLX Qwen3-0.6B 4-bit (made here)',mlx8:'MLX Qwen3-0.6B 8-bit (made here)',mlxbf:'MLX Qwen3-0.6B bf16 (made here)'};
  const GG={q4km:'Qwen3-0.6B Q4_K_M (made here from Unsloth BF16)',bf16:'Qwen3-0.6B BF16 (Unsloth)',f16:'Qwen3-0.6B F16 (made here)',q8:'Qwen3-0.6B Q8_0 (made here)',f16_17:'Qwen3-1.7B F16 (made here)',q4km_17:'Qwen3-1.7B Q4_K_M (Unsloth)',q4km_4:'Qwen3-4B Q4_K_M (Qwen)'};
  const fm=o=>Object.keys(o).map(k=>k+' '+o[k]).join(', ');
  $('mf-bx-all').innerHTML='<thead><tr><th>file</th><th>format</th><th class="num">bytes</th><th class="num">tensors</th><th class="num">before data</th><th>types (count)</th></tr></thead><tbody>'+
    Object.keys(ST).map(k=>{const s=MF.st[k];return '<tr><td>'+ST[k]+'</td><td>safetensors</td><td class="num">'+c(s.size)+'</td><td class="num">'+s.n+'</td><td class="num">'+c(s.ds)+'</td><td>'+fm(s.dc)+'</td></tr>'}).join('')+
    Object.keys(GG).map(k=>{const g=MF.gg[k];return '<tr><td>'+GG[k]+'</td><td>GGUF v'+g.ver+'</td><td class="num">'+c(g.size)+'</td><td class="num">'+g.n+'</td><td class="num">'+c(g.ds)+'</td><td>'+fm(g.tc)+'</td></tr>'}).join('')+'</tbody>';
})();

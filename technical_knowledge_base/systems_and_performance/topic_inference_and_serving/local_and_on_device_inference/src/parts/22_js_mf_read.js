// ---- Reading tab (Model formats): number fills, predict-then-reveal, small charts ----
(function(){
  const F=(window.MF&&MF.facts)||{};
  document.querySelectorAll('[data-mf]').forEach(el=>{const k=el.dataset.mf;el.innerHTML=(k in F)?F[k]:'[missing '+k+']'});
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');if(ans)ans.hidden=false}))});
})();
window.MFU={
  fmtB(b){b=+b;if(b>=1e9)return (b/1e9).toFixed(2)+' GB';if(b>=1e6)return (b/1e6).toFixed(1)+' MB';if(b>=1e3)return (b/1e3).toFixed(1)+' kB';return b+' B'},
  c(n){return Number(n).toLocaleString('en-US')},
  col(i){return 'var(--c'+(1+i%6)+')'},
  // horizontal bars: rows [{nm, ml, v, lo, hi, txt, col}]
  bars(el,rows,max){max=max||Math.max(...rows.map(r=>r.hi||r.v));
    el.innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+r.nm+(r.ml?'<span class="ml">'+r.ml+'</span>':'')+'</div><div class="track">'+
      '<div class="fill" style="width:'+(100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></div>'+
      (r.hi!=null?'<div style="position:absolute;top:6px;height:2px;background:var(--ink);opacity:.6;left:'+(100*r.lo/max).toFixed(2)+'%;width:'+Math.max(.4,100*(r.hi-r.lo)/max).toFixed(2)+'%"></div>':'')+
      '</div><div class="val">'+r.txt+'</div></div>').join('')}
};
// ---- section 1: the Qwen3-1.7B repo to scale ----
(function(){
  const el=document.getElementById('mf-repo'),cap=document.getElementById('mf-repo-cap');if(!el)return;
  const R=MF.repo.slice().sort((a,b)=>b[0]-a[0]),tot=R.reduce((s,r)=>s+r[0],0);
  const what={'model-00001-of-00002.safetensors':'weights, shard 1 (310 tensors)','model-00002-of-00002.safetensors':'weights, shard 2: only the duplicate lm_head','tokenizer.json':'the tokenizer (vocabulary, merges, special tokens)','vocab.json':'vocabulary (older tokenizer files)','merges.txt':'merge rules (older tokenizer files)','model.safetensors.index.json':'which tensor lives in which shard','README.md':'model card','LICENSE':'Apache 2.0 text','tokenizer_config.json':'tokenizer settings and the chat template','config.json':'the architecture: layers, heads, sizes','generation_config.json':'sampling defaults and stop ids'};
  let cur=0;function draw(sel){cur=sel;
    el.innerHTML='<div class="mf-map">'+R.map((r,i)=>{const w=100*r[0]/tot;return '<span data-i="'+i+'" title="'+r[1]+'" style="flex:0 0 '+Math.max(w,0.0).toFixed(4)+'%;background:'+(i<2?'var(--c1)':MFU.col(i+1))+(i===sel?';outline:2px solid var(--ink)':'')+'">'+(w*RD.width(el)/100>r[1].replace('.safetensors','').length*7+8?r[1].replace('.safetensors',''):'')+'</span>'}).join('')+'</div>'+
      '<div class="small" style="display:flex;flex-wrap:wrap;gap:3px 10px">'+R.map((r,i)=>'<button data-i="'+i+'" class="'+(i===sel?'on':'')+'" style="font-size:11.5px;padding:1px 7px">'+r[1]+'</button>').join('')+'</div>';
    const r=R[sel];cap.innerHTML='<b>'+r[1]+'</b>: '+MFU.c(r[0])+' bytes, '+(100*r[0]/tot).toPrecision(2)+'% of the folder. '+(what[r[1]]||'');
  }
  el.addEventListener('click',e=>{const t=e.target.closest('[data-i]');if(t)draw(+t.dataset.i)});
  draw(R.findIndex(r=>r[1]==='config.json'));RD.onResize(()=>draw(cur));RD.onRender(()=>draw(cur));
})();
// ---- section 1: dtype bits and the BF16 to F16 question ----
(function(){
  const el=document.getElementById('mf-bits');if(!el)return;
  const out=document.getElementById('mf-bits-out'),inp=document.getElementById('mf-bits-in'),pick=document.getElementById('mf-bits-pick');
  const T=[['F32',1,8,23],['BF16',1,8,7],['F16',1,5,10],['FP8 E4M3',1,4,3]];
  el.innerHTML=T.map(t=>{const n=t[1]+t[2]+t[3];return '<div class="small" style="margin-top:4px"><b>'+t[0]+'</b> '+n+' bits = '+(n/8)+' byte'+(n>8?'s':'')+': sign '+t[1]+', exponent '+t[2]+', mantissa '+t[3]+'</div><div class="mf-bits">'+
    Array.from({length:n},(_,i)=>'<span style="background:'+(i<1?'var(--c2)':i<1+t[2]?'var(--c1)':'var(--c3)')+'">'+(n<=16?(i<1?'s':i<1+t[2]?'e':'m'):'')+'</span>').join('')+'</div>'}).join('');
  const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer);
  function toBf16(x){f32[0]=x;let u=u32[0];const r=((u>>>16)&1)+0x7fff;u=(u+r)>>>16;u32[0]=(u<<16)>>>0;return f32[0]}
  function toF16(x){ // round to nearest even F16, returned as a number
    if(!isFinite(x)||x===0)return x;const s=x<0?-1:1;x=Math.abs(x);if(x>=65520)return s*Infinity;
    let e=Math.floor(Math.log2(x));if(e<-14)e=-14;const q=Math.pow(2,e-10);let m=x/q;const fl=Math.floor(m),fr=m-fl;
    m=fr>0.5?fl+1:fr<0.5?fl:(fl%2?fl+1:fl);return s*m*q}
  const vals=MF.blocks.hf.first4.concat([4.12e-8,1e-5,70000]);
  pick.innerHTML=vals.map(v=>'<button data-v="'+v+'" style="font-size:11.5px;padding:1px 7px">'+(+v).toPrecision(4)+'</button>').join('');
  pick.addEventListener('click',e=>{const b=e.target.closest('button');if(b){inp.value=b.dataset.v;run()}});
  function run(){const x=parseFloat(inp.value);if(!isFinite(x)){out.textContent='Type a number.';return}
    const b=toBf16(x),h=toF16(b);
    out.innerHTML='Stored as BF16: <b>'+b.toPrecision(8)+'</b>. That BF16 value in F32: <b>'+b.toPrecision(8)+'</b> (always exact). In F16: <b>'+(isFinite(h)?h.toPrecision(8):'overflow (infinity)')+'</b> '+
      (h===b?'<span class="meas">exact</span>':'<span class="ann">changed'+(isFinite(h)?' by '+Math.abs(h-b).toExponential(1):'')+(h===0?', flushed to zero':'')+'</span>')+
      (Math.abs(b)<6.1035e-5&&b!==0?' (below F16\'s smallest normal number, 2<sup>-14</sup>, so fewer bits are left)':'');}
  inp.addEventListener('input',run);run();
})();

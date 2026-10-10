// ---- Reading, section 3: real block hash chains from the recorded engine (data: window.VL_STEP, run pc_on) ----
(function(){
  const D=window.VL_STEP,out=document.getElementById('vl-hash-out'),segEl=document.getElementById('vl-hash-seg');
  if(!D||!out)return;
  if(!D.runs[0].steps[0].blocks.map){D.runs.forEach(r=>{Object.values(r.req).forEach(q=>{if(!q.pieces)q.pieces=D.texts[q.t]});r.steps.forEach(st=>{if(typeof st.blocks==='string')st.blocks=st.blocks.split(',').map(x=>x.split('.').map(Number))})})}
  const run=D.runs.find(r=>r.key==='pc_on');if(!run){out.textContent='';return}
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // each request's block ids and their hashes, at the last step where it still holds blocks
  const chain={};
  run.steps.forEach(s=>{const bm={};s.blocks.forEach((b,k)=>bm[k+1]=[k+1,b[0],b[1]>=0?run.H[b[1]]:null]);Object.entries(s.reqs).forEach(([r,q])=>{if(q[5].length)chain[r]=q[5].map(id=>[id,bm[id]?bm[id][2]:null])})});
  const pairs=[['A','B','Two customers, same system prompt'],['A','A2','A and its own follow-up turn']].filter(p=>chain[p[0]]&&chain[p[1]]);
  if(!pairs.length){out.textContent='';return}
  segEl.innerHTML=pairs.map((p,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+esc(p[2])+'</button>').join('');
  const bs=run.bs;
  function txt(r,j){const q=run.req[r];return q?q.pieces.slice(j*bs,(j+1)*bs).join(''):''}
  function row(r,other){const oh=new Set((chain[other]||[]).map(x=>x[1]).filter(Boolean));
    return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:4px;margin:4px 0 10px">'+chain[r].map((b,j)=>{const sh=b[1]&&oh.has(b[1]);
      return '<div style="border:1px '+(b[1]?'solid':'dashed')+' '+(sh?'var(--acc)':'var(--line)')+';background:'+(sh?'var(--acc2)':'var(--bg)')+';border-radius:6px;padding:4px 6px;font-size:11.5px;min-width:0">'+
      '<div class="mono" style="font-weight:600">block '+j+' &middot; id '+b[0]+' &middot; '+(b[1]?b[1]:'no hash')+'</div><div class="mute" style="overflow-wrap:anywhere;max-height:4.4em;overflow:hidden">'+esc(txt(r,j).replace(/\s+/g,' '))+'</div></div>'}).join('')+'</div>'}
  function draw(i){const p=pairs[+i];const a=chain[p[0]],b=chain[p[1]];let k=0;while(k<a.length&&k<b.length&&a[k][1]&&a[k][1]===b[k][1])k++;
    out.innerHTML='<p class="small"><b>'+p[0]+'</b>: '+a.length+' blocks; <b>'+p[1]+'</b>: '+b.length+' blocks. The chains agree for the first <b>'+k+'</b> block'+(k===1?'':'s')+' ('+k*bs+' tokens), then part for good: once one hash differs, every later hash differs too, even where the text is the same.'+(p[1]==='A2'?(()=>{const pa=run.req.A.pieces,pb=run.req.A2.pieces;let c=0;while(c<pa.length&&pa[c]===pb[c])c++;return ' Here A2 repeats all of A\'s prompt and answer, but the token sequences agree only for the first '+c+' tokens of A\'s '+(run.req.A.np+run.cfg.max_tokens)+': Qwen3\'s chat template drops the empty &lt;think&gt; block from earlier assistant turns, so A2\'s copy of A\'s answer is tokenized differently from what A generated, and A\'s answer blocks are never reused. A template that rewrites history turns the newest part of every multi-turn prefix into a cache miss.'})():'')+'</p><div class="small"><b>'+p[0]+'</b></div>'+row(p[0],p[1])+'<div class="small"><b>'+p[1]+'</b></div>'+row(p[1],p[0])}
  RD.seg(segEl,draw);draw(0);
})();

// ---- Format comparer tab ----
(function(){
  const U=SLU,$=U.$;if(!$('t-fmt'))return;
  const GC={'row text':'var(--c2)',columnar:'var(--c1)',shards:'var(--c4)',tokens:'var(--c3)'};
  // timing keys -> size keys
  const TK={'jsonl':'jsonl','jsonl.gz':'jsonl.gz','jsonl.zst':'jsonl.zst','parquet.snappy':'parquet.snappy','parquet.zstd':'parquet.zstd','arrow.uncompressed':'arrow.uncompressed','arrow.zstd':'arrow.zstd',
    'wds.tar':'wds.tar','wds.tar.gz':'wds.tar.gz','mds.none':'mds.none','mds.zstd':'mds.zstd','lance':'lance','bin':'bin'};
  const RAL={'bin.memmap':'Token file, memory-mapped (index lookup)','parquet.rg100':'Parquet, row groups of 100 (read one group)','lance':'Lance (take by row id)','mds.zstd':'MDS zstd (offset table)','jsonl.zst':'JSONL + zstd (decompress from the start)'};
  let n='k2',m='bytes';
  function rows(){const F=n==='k2'?SL.fmt2k:SL.fmt50k,sz=F.sizes,Tq=F.tokens.qwen3.tokens,Tg=F.tokens.gpt2.tokens;
    if(m==='bytes')return sz.map(s=>({nm:s.label,v:s.bytes,txt:(s.bytes/1e6).toFixed(s.bytes<1e7?2:1)+' MB',col:GC[s.group],hl:s.fmt==='jsonl.zst'||s.fmt==='bin'}));
    if(m==='bpt')return sz.map(s=>{const T=/gpt2|GPT-2|\.g$/.test(s.fmt+s.label)?Tg:Tq,v=s.bytes/T;return {nm:s.label+(T===Tg?' (per GPT-2 token)':''),v,txt:v.toFixed(2),col:GC[s.group],hl:s.fmt==='jsonl.zst'||s.fmt==='bin'}});
    if(m==='read'){if(!F.t)return null;
      return Object.keys(TK).filter(k=>F.t[k]).map(k=>{const s=sz.find(x=>x.fmt===TK[k]),v=F.text_bytes/F.t[k].s/1e6;return {nm:s.label,v,txt:v>=100?U.f0(v):v.toFixed(1),col:GC[s.group]}}).sort((a,b)=>b.v-a.v)}
    if(m==='ra'){const R=F.ra||F.random_access;if(!R)return null;return Object.keys(RAL).filter(k=>R[k]).map(k=>{const v=R[k].docs/R[k].s;return {nm:RAL[k],v,txt:U.f0(v),col:k.indexOf('bin')===0?'var(--c3)':k.indexOf('jsonl')===0?'var(--c2)':k.indexOf('mds')===0?'var(--c4)':'var(--c1)'}}).sort((a,b)=>b.v-a.v)}}
  const NOTE={bytes:'Bytes on disk; for directories (MDS, Lance) the sum of their files. Highlighted: zstd JSONL and the uint32 token file, the two forms most corpora end up in.',
    bpt:'Bytes on disk ÷ Qwen3 tokens of the same documents (GPT-2 tokens for the GPT-2 token files).',
    read:'Megabytes of UTF-8 text recovered per second, reading every document\'s text start to end (token file: the same text\'s ids). Log-like spread: the axis is linear, so small bars are real.',
    ra:'Documents per second when fetching 200 documents chosen at random (fixed seed). JSONL + zstd must decompress from the start of the file for each one.'};
  function draw(){const r=rows(),el=$('sl-f-bars');
    if(!r){el.innerHTML='<p class="mute small">Timings were taken on the 50,000-document sample only; switch the sample.</p>';$('sl-f-note').textContent='';return}
    U.bars(el,r);$('sl-f-note').innerHTML=NOTE[m]+(m==='read'||m==='ra'?' <span class="sl-lbl rough">rough</span>':' <span class="sl-lbl meas">measured</span>')+' '+(n==='k2'?'2,000':'50,000')+' FineWeb documents, CC-MAIN-2024-30 (setup sample, first rows).';
    $('sl-f-leg').innerHTML=Object.entries(GC).map(([k,c])=>'<span><i style="background:'+c+'"></i>'+k+'</span>').join('')}
  RD.seg($('sl-f-n'),v=>{n=v;draw()});RD.seg($('sl-f-m'),v=>{m=v;if(m!=='bytes'&&m!=='bpt'&&n==='k2'){n='k50';$('sl-f-n').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m==='k50'))}draw()});
  // feature matrix
  const Y='<b style="color:var(--good)">yes</b>',N='<span style="color:var(--bad)">no</span>',P='<span style="color:var(--c5)">partly</span>';
  const feat=[['JSONL (+gzip/zstd)',N,N,Y,Y,Y,'pipeline stages, publishing (DCLM, Nemotron-CC)'],['Parquet',P+' (by row group)',Y,Y,P+' (new files)',N,'publishing and re-filtering (FineWeb), analytics'],
    ['Arrow IPC',Y+' (memory-mapped)',Y,Y,N,N,'Hugging Face datasets cache, in-memory exchange'],['WebDataset tar',N,N,Y,Y,P+' (tar tools)','images, audio, multimodal streaming'],
    ['MDS (Streaming)',Y+' (index.json + offsets)',N,Y,N,N,'streaming training from object storage'],['Lance',Y,Y,Y,Y,N,'random-access training and evaluation sets, vectors'],
    ['Token file + index',Y+' (arithmetic)',N,Y,Y,N,'what pretraining reads (nanoGPT, datatrove, Megatron)']];
  $('sl-f-feat').innerHTML='<tr><th>Format</th><th>Random access</th><th>Read some columns</th><th>Stream sequentially</th><th>Append</th><th>Human-readable</th><th>Typical use</th></tr>'+feat.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===0?' style="font-weight:600"':'')+'>'+c+'</td>').join('')+'</tr>').join('');
  // scale-up
  const F=SL.fmt50k,Tq=F.tokens.qwen3.tokens,sz=k=>F.sizes.find(s=>s.fmt===k).bytes;
  function scale(){const e=+$('sl-f-t').value,T=1e9*Math.pow(10,e/10);$('sl-f-tv').textContent=T>=1e12?(T/1e12).toFixed(T<1e13?1:0)+'T':(T/1e9).toFixed(0)+'B';
    const tb=b=>{const v=b/Tq*T;return v>=1e12?(v/1e12).toFixed(1)+' TB':(v/1e9).toFixed(0)+' GB'};
    $('sl-f-scale').innerHTML=RD.stat('Text as JSONL',tb(sz('jsonl')),'uncompressed')+RD.stat('JSONL + zstd 3',tb(sz('jsonl.zst')),'')+RD.stat('Parquet + zstd 3',tb(sz('parquet.zstd3')),'')+
      RD.stat('Token file, 4 bytes',tb(sz('bin')),'Qwen3-size vocabulary')+RD.stat('Token file, 2 bytes',tb(2*Tq),'vocabulary under 65,536')}
  $('sl-f-t').addEventListener('input',scale);scale();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-fmt']=window.TAB_RENDER['t-fmt']||[]).push(draw);draw();
})();

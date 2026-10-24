// ---- Reading tab: tables, predict-then-reveal, small measured cards (data: window.SL from data/sl_data.json) ----
window.SLU=(function(){
  const $=id=>document.getElementById(id), esc=RD.esc;
  const f0=x=>Math.round(x).toLocaleString('en-US');
  const mb=b=>(b/1e6).toFixed(2)+' MB';
  const pc=(x,d)=>(100*x).toFixed(d==null?1:d)+'%';
  // horizontal bars; rows: [{nm, v, txt, col, hl}]
  function bars(el,rows,max){max=max||Math.max(...rows.map(r=>r.v));
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.nm)+'">'+esc(r.nm)+'</div><div class="track"><div class="fill" style="width:'+(100*r.v/max).toFixed(2)+'%;background:'+(r.col||'var(--acc)')+'"></div></div><div class="val">'+r.txt+'</div></div>').join('')+'</div>'}
  // predict-then-reveal: el id, question, options [{t, ok}], answer html, onReveal
  function pred(id,q,opts,ans,onReveal){const el=$(id);if(!el)return;
    el.innerHTML='<div class="q">Predict: '+q+'</div><div class="opts">'+opts.map((o,i)=>'<button data-i="'+i+'">'+o.t+'</button>').join('')+'</div><div class="ans" hidden></div>';
    el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      el.querySelectorAll('.opts button').forEach((x,i)=>{x.classList.toggle('right',!!opts[i].ok);x.classList.toggle('wrong',x===b&&!opts[i].ok);x.disabled=true});
      const a=el.querySelector('.ans');a.hidden=false;a.innerHTML=(opts[+b.dataset.i].ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+ans;if(onReveal)onReveal(a)})}
  const size=(arr,f)=>(arr.find(s=>s.fmt===f)||{}).bytes;
  return {$,esc,f0,mb,pc,bars,pred,size};
})();
(function(){
  const S=window.SL,U=SLU,$=U.$;
  // bytes per token table
  const bt=$('sl-bpt');
  if(bt){bt.innerHTML='<tr><th>Form</th><th class="num">Bytes</th><th class="num">Bytes per token</th><th class="num">TB per trillion tokens</th></tr>'+
    S.bpt.map(r=>'<tr><td>'+U.esc(r.what)+'</td><td class="num">'+U.f0(r.bytes)+'</td><td class="num">'+r.bpt.toFixed(2)+'</td><td class="num">'+r.tb_per_T.toFixed(2)+'</td></tr>').join('')}
  // compression card
  const s2=S.fmt2k.sizes,cmp=$('sl-cmp');
  function drawCmp(){if(!cmp)return;const rows=[['jsonl','JSONL, none'],['jsonl.gz1','gzip level 1'],['jsonl.gz','gzip level 6'],['jsonl.gz9','gzip level 9'],['jsonl.zst1','zstd level 1'],['jsonl.zst','zstd level 3'],['jsonl.zst9','zstd level 9'],['jsonl.zst19','zstd level 19']]
      .map(([f,n])=>{const b=U.size(s2,f);return {nm:n,v:b,txt:(b/1e6).toFixed(2)+' MB',col:f.indexOf('gz')>0?'var(--c2)':f.indexOf('zst')>0?'var(--c1)':'var(--dim)'}});
    cmp.innerHTML='<div class="small mute" style="margin-bottom:4px">The same 2,000 documents as JSONL, by compressor and level (MB on disk)</div><div id="sl-cmp-b"></div>';U.bars($('sl-cmp-b'),rows)}
  drawCmp();
  U.pred('sl-pq1','Which makes our 7.70 MB of JSONL smallest?',[{t:'gzip at its highest level, 9'},{t:'zstd at its usual default, level 3'},{t:'zstd at level 19',ok:true}],
    'zstd level 19: '+U.mb(U.size(s2,'jsonl.zst19'))+', against '+U.mb(U.size(s2,'jsonl.gz9'))+' for gzip 9 and '+U.mb(U.size(s2,'jsonl.zst'))+' for zstd 3. gzip barely improves from level 6 to 9 ('+U.mb(U.size(s2,'jsonl.gz'))+' to '+U.mb(U.size(s2,'jsonl.gz9'))+'); zstd keeps improving with level, and reading it back costs about the same at any level.');
  // FineWeb footer card
  const fw=S.fw,fc=$('sl-fwpq');
  function drawFw(){if(!fc)return;const W=RD.width(fc),cols=Object.entries(fw.columns).sort((a,b)=>b[1].comp-a[1].comp),tot=cols.reduce((a,c)=>a+c[1].comp,0);
    const pal=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--dim)','var(--mute)','var(--bad)'];
    let x=0,body='';cols.forEach((c,i)=>{const w=Math.max(1,(W-2)*c[1].comp/tot);body+='<rect x="'+x.toFixed(1)+'" y="18" width="'+w.toFixed(1)+'" height="22" fill="'+pal[i]+'"><title>'+c[0]+': '+U.f0(c[1].comp)+' bytes</title></rect>';x+=w});
    // row groups strip: 972 groups to scale, footer at the end
    const fb=fw.footer_bytes,fsz=fw.file_bytes,gw=(W-2)*(1-fb/fsz)/fw.row_groups;let g='';
    for(let i=0;i<fw.row_groups;i+=1){if(gw<1.2&&i%Math.ceil(1.2/gw))continue;g+='<line x1="'+(i*gw).toFixed(1)+'" x2="'+(i*gw).toFixed(1)+'" y1="62" y2="80" stroke="var(--line)"/>'}
    body+=RD.t(0,12,'Bytes by column, compressed (text '+U.pc(fw.columns.text.comp/tot)+')',{fs:11.5})+'<rect x="0" y="62" width="'+(W-2)+'" height="18" fill="var(--acc2)"/>'+g+
      '<rect x="'+((W-2)*(1-fb/fsz)).toFixed(1)+'" y="58" width="'+Math.max(2,(W-2)*fb/fsz).toFixed(1)+'" height="26" fill="var(--bad)"/>'+RD.t(0,56,'The file as 972 row groups, to scale; the footer (red) is '+U.pc(fb/fsz,2)+' of it',{fs:11.5});
    fc.innerHTML=RD.svg(W,92,body,'FineWeb Parquet file layout')+'<div class="sl-leg">'+cols.slice(0,5).map((c,i)=>'<span><i style="background:'+pal[i]+'"></i>'+c[0]+' '+U.pc(c[1].comp/tot)+'</span>').join('')+'<span>others '+U.pc(cols.slice(5).reduce((a,c)=>a+c[1].comp,0)/tot,2)+'</span></div>'+
      '<div class="out">'+RD.stat('File',(fsz/1e9).toFixed(2)+' GB',U.f0(fw.rows)+' rows')+RD.stat('Row groups',U.f0(fw.row_groups),fw.rows_per_group[0]+' to '+fw.rows_per_group[fw.rows_per_group.length-1]+' rows each')+
      RD.stat('One row group',(fw.group_bytes_min/1e6).toFixed(1)+' to '+(fw.group_bytes_max/1e6).toFixed(1)+' MB','compressed, all columns')+RD.stat('Footer',(fb/1e6).toFixed(2)+' MB','read first by every reader')+RD.stat('Codec','snappy','written by '+U.esc(fw.created_by.replace('parquet-cpp-arrow version','Arrow C++')))+'</div>'}
  RD.onRender(drawFw);RD.onResize(drawFw);drawFw();
  // 16-bit trap
  const tq=S.fmt2k.tokens.qwen3;
  U.pred('sl-pq2','You write the 2,000 documents\' Qwen3 ids as uint16. How many documents end up with at least one wrong token?',[{t:'About 2%, the share of rare tokens'},{t:'About a quarter'},{t:'Almost all of them',ok:true}],
    U.f0(tq.docs_with_id_ge_65536)+' of 2,000 ('+U.pc(tq.docs_with_id_ge_65536/2000,0)+'). Only '+U.pc(tq.ids_ge_65536/tq.tokens)+' of tokens have ids of 65,536 or more, but they are spread through the vocabulary\'s second half: common words, punctuation with a newline, accented pieces. Almost every document of a few hundred tokens contains one.');
  const wr=$('sl-wrap');
  if(wr){const w=S.meg.wrap;wr.innerHTML='<div class="small mute">The most frequent ids above 65,535 in our 2,000 documents and what they become as uint16 <span class="sl-lbl meas">measured</span></div><div class="tw"><table><tr><th class="num">Id</th><th>Token</th><th class="num">Count</th><th class="num">id mod 65,536</th><th>Becomes</th></tr>'+
    w.top.slice(0,6).map(r=>'<tr><td class="num">'+U.f0(r.id)+'</td><td><code>'+U.esc(JSON.stringify(r.piece))+'</code></td><td class="num">'+r.count+'</td><td class="num">'+U.f0(r.wrapped_id)+'</td><td><code>'+U.esc(JSON.stringify(r.wrapped_piece))+'</code></td></tr>').join('')+'</table></div>'+
    '<div class="small">An illustrative sentence, encoded with Qwen3 and decoded after a uint16 round trip:</div><pre class="sl-code">before: '+U.esc(JSON.stringify(w.sentence.text))+'\nafter:  '+U.esc(JSON.stringify(w.sentence.decoded_uint16))+'</pre>'}
  // packing predict
  const P=S.pack.k2['2048'];
  U.pred('sl-pq3','Concatenating the 2,000 documents and cutting every 2,048 tokens: how many documents get cut by a window boundary?',[{t:'About 90, the ones longer than a window'},{t:'About 300'},{t:'About 600',ok:true}],
    U.f0(P.concat.docs_cut)+'. A boundary falls every 2,048 tokens regardless of where documents end, so almost every window boundary ('+U.f0(P.concat.windows-1)+' of them) lands inside some document; only the '+U.f0(P.bfd.docs_cut)+' documents longer than 2,048 tokens must be cut, which is what best-fit packing achieves.');
  // shuffle summary
  const sh=S.shuf,ss=$('sl-shsum');
  const SHN={none:'Read in order (no shuffle)',hf_buf1_mbis1:'Shard order shuffled only',buf_only100:'Buffer of 100, shards in order',hf_buf100_mbis1:'Shard order + buffer of 100 (datasets, max_buffer_input_shards=1)',
    hf_buf1000_mbis1:'Shard order + buffer of 1,000 (same)',hf_buf1000:'datasets 5.0.1 default shuffle: 10 shard groups round robin + buffer of 1,000',dl4_hf_buf1000_mbis1:'Shard order + buffer of 1,000, DataLoader with 4 workers',
    mds_py1e_blk200:'MosaicML py1e, block = one shard (200)',mds_py1e_blk262144:'MosaicML py1e, default block (262,144)',mds_py1br_blk200:'MosaicML py1br, block = one shard',mds_py1br_blk262144:'MosaicML py1br, default block',mds_naive_blk262144:'MosaicML naive',global:'Global permutation (Megatron-style)'};
  window.SL_SHN=SHN;
  if(ss){const order=['none','hf_buf1_mbis1','hf_buf100_mbis1','hf_buf1000_mbis1','dl4_hf_buf1000_mbis1','hf_buf1000','mds_py1e_blk200','mds_py1e_blk262144','global'];
    ss.innerHTML='<div class="tw"><table><tr><th>Scheme</th><th class="num">Buckets per batch of 32</th><th class="num">Largest bucket share</th><th class="num">Distance from the true mix</th></tr>'+
      order.map(k=>{const m=sh.m[k];return '<tr><td>'+SHN[k]+'</td><td class="num">'+m.batch_distinct_mean.toFixed(1)+'</td><td class="num">'+U.pc(m.batch_top_mean,0)+'</td><td class="num">'+m.batch_tv_mean.toFixed(2)+'</td></tr>'}).join('')+'</table></div>'+
      '<p class="small mute">A random batch of 32 from 11 equal buckets holds about 10.5. Distance: total variation from 1/11 each, averaged over batches (0 = perfect, 0.91 = one bucket). MosaicML orders are the global order for one canonical node, before division among workers.</p>'}
  // worker trap output and resume table
  const R=S.resume,to=$('sl-trap-out');
  if(to)to.textContent='Naive '+R.worker_trap_naive.samples+' '+R.worker_trap_naive.distinct+'\nSharded '+R.worker_trap_sharded.samples+' '+R.worker_trap_sharded.distinct;
  const rt=$('sl-restbl'),RN={naive_restart:'Restart the epoch, same seed',new_seed_restart:'Restart the epoch, new seed',megatron_consumed_samples:'Global permutation + consumed_samples (Megatron)',torchdata_stateful:'torchdata StatefulDataLoader (2 workers)',hf_noshuffle:'datasets streaming, state_dict(), no shuffle',hf_buffer100:'datasets streaming, state_dict(), buffer 100',hf_buffer1000:'datasets streaming, state_dict(), buffer 1,000',mosaic_streaming:'MosaicML StreamingDataset state_dict()'};
  window.SL_RN=RN;
  if(rt)rt.innerHTML='<tr><th>Loader and what was saved</th><th>Same order after the stop?</th><th class="num">Never seen</th><th class="num">Seen twice</th></tr>'+
    Object.keys(RN).map(k=>{const r=R[k];return '<tr><td>'+RN[k]+'</td><td>'+(r.same_order_after_stop?'<b style="color:var(--good)">yes</b>':'<b style="color:var(--bad)">no</b>')+'</td><td class="num">'+r.never_seen+'</td><td class="num">'+r.seen_twice+'</td></tr>'}).join('');
})();

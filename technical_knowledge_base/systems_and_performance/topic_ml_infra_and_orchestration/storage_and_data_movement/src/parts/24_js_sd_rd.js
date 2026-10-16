// ---- Reading tab: tables from the recorded data, the two animations, drills, reading time ----
(function(){
  const H=SD_H,D=window.SD,$=H.$,esc=H.esc,f=H.fmt;
  const R=H.mk('t-read');
  const MB=n=>f(n/1e6,1)+' MB',MiB=n=>f(n/1048576,2)+' MiB';
  const cnt=(el,items)=>{$(el).innerHTML=items.map(x=>RD.stat(x[0],x[1],x[2]||'')).join('')};

  // ---- tables ----
  (function(){
    const L={docker_volume:'Docker volume (ext4 in the VM)',host_folder:'Host folder shared into the VM',s3_seaweedfs:'S3 (SeaweedFS), HEAD for stat'};
    const ph=['create','stat','miss','unlink'];
    let h='<table><thead><tr><th>Store, 16 processes</th>'+ph.map(p=>'<th class="num">'+p+'</th>').join('')+'</tr></thead><tbody>';
    Object.keys(L).forEach(k=>{const e=D.meta_real[k]&&D.meta_real[k]['16'];if(!e)return;
      h+='<tr><td>'+L[k]+' <span class="mute small">('+e.files_per_proc+' files each)</span></td>'+ph.map(p=>'<td class="num">'+f(e.ops_per_s[p],0)+'</td>').join('')+'</tr>'});
    const t1=D.tpfs.meta['1_16'];
    h+='<tr><td>Toy parallel file system, one metadata server <span class="mute small">(create, stat, unlink averaged)</span></td><td class="num" colspan="4">'+f(t1.ops_per_s,0)+'</td></tr>';
    $('sd-mreal').innerHTML=h+'</tbody></table><p class="small mute">One process instead of 16 (create, stat, miss, unlink): '+Object.keys(L).map(k=>{const e=D.meta_real[k]['1'].ops_per_s;return L[k].split(' (')[0]+' '+ph.map(p=>f(e[p],0)).join(', ')}).join('; ')+'.</p>';
    const I=D['import'],rows=[['pass','python3 -c pass'],['import numpy','import numpy'],['import torch','import torch'],['import torch, torch.distributed, torch.distributed.checkpoint','import torch, torch.distributed, torch.distributed.checkpoint']];
    let g='<table><thead><tr><th>Command</th><th class="num">file-system calls</th><th class="num">of which stat</th><th class="num">opens</th><th class="num">failed</th><th class="num">wall time</th></tr></thead><tbody>';
    rows.forEach(r=>{const v=I[r[0]];if(!v)return;g+='<tr><td><code>'+esc(r[1])+'</code></td><td class="num">'+f(v.total_calls,0)+'</td><td class="num">'+f(v.by_call.newfstatat.calls,0)+'</td><td class="num">'+f(v.by_call.openat.calls,0)+'</td><td class="num">'+f(v.total_errors,0)+'</td><td class="num">'+f(v.wall_s,2)+' s</td></tr>'});
    $('sd-imp').innerHTML=g+'</tbody></table><p class="small mute">Wall time without strace, local disk in the container. How many of these calls reach a metadata server depends on the client\'s caches.</p>';
    // semantics column
    const S=D.semantics;
    $('sd-sem-abandon').innerHTML='an upload never completed: HEAD gave <code>'+S.abandoned_head.http+'</code>, yet it was listed in <code>list_multipart_uploads</code> <span class="meas">measured</span>';
    $('sd-sem-raw').innerHTML='<code>latest</code> read back <code>'+S.read_after_write.join('</code>, then <code>')+'</code> straight after each PUT <span class="meas">measured</span>';
    $('sd-sem-inm').innerHTML='first PUT ok; second: <code>'+S.if_none_match[1].http+' '+esc(S.if_none_match[1].code)+'</code>; the marker still says <code>'+esc(S.marker_now)+'</code> <span class="meas">measured</span>';
    $('sd-sem-ren').innerHTML='64 MiB: upload '+f(S.rename.put_s,2)+' s, copy + delete '+f(S.rename.copy_delete_s,2)+' s <span class="meas">measured</span>';
    $('sd-sem-mp').innerHTML='two 1 MiB parts: <code>'+S.small_part.http+' '+esc(S.small_part.code)+'</code> <span class="meas">measured</span>';
    $('sd-sem-list').innerHTML=f(D.list.keys,0)+' keys: '+D.list.requests+' requests, '+f(D.list.s,2)+' s <span class="meas">measured</span>';
    $('sd-err-small').textContent=S.small_part.code+': '+S.small_part.message;
    $('sd-err-inm').textContent=S.if_none_match[1].http+' '+S.if_none_match[1].code+': '+S.if_none_match[1].message;
    // S3 bars
    const M=D.multipart,b=[['upload_8_1','Upload, 8 MiB parts, 1 at a time'],['upload_8_8','Upload, 8 MiB parts, 8 in parallel'],['upload_64_1','Upload, 64 MiB parts, 1 at a time'],['upload_64_8','Upload, 64 MiB parts, 8 in parallel'],['download_8_1','Download, 8 MiB ranges, 1 at a time'],['download_8_8','Download, 8 MiB ranges, 8 in parallel']];
    const mx=Math.max(...b.map(x=>M[x[0]].MBps));
    $('sd-s3bars').innerHTML=b.map(x=>'<div class="row"><span class="nm">'+x[1]+'</span><span class="track"><span class="fill" style="width:'+(100*M[x[0]].MBps/mx).toFixed(1)+'%;background:'+(x[0][0]==='u'?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+f(M[x[0]].MBps,0)+' MB/s</span></div>').join('');
    // DCP files and chunks
    const F=D.dcp.files;
    $('sd-dcpfiles').innerHTML='<table><thead><tr><th>File</th><th class="num">bytes</th><th>holds</th></tr></thead><tbody>'+Object.keys(F).map(k=>'<tr><td><code>'+k+'</code></td><td class="num">'+f(F[k],0)+'</td><td>'+(k==='.metadata'?'the map: every entry, chunk and byte range':'rank '+k[2]+'\'s shard of every tensor')+'</td></tr>').join('')+'</tbody></table><p class="small mute">Saved in '+f(D.dcp.save_s,2)+' s; '+f(D.dcp.n_chunks,0)+' chunks, '+f(D.dcp.n_storage_items,0)+' stored items.</p>';
    $('sd-dcp-n').textContent=f(D.dcp.n_entries,0);
    const tk=D.dcp.sample.filter(t=>t.fqn==='model.tok.weight'||t.fqn==='model.blocks.0.qkv.weight');
    let c='<table><thead><tr><th>Tensor (global shape)</th><th>chunk rows</th><th>file</th><th class="num">byte offset</th><th class="num">length</th></tr></thead><tbody>';
    tk.forEach(t=>t.chunks.forEach((ch,i)=>{c+='<tr><td>'+(i?'':'<code>'+t.fqn.replace('model.','')+'</code> ('+t.size.join(' x ')+')')+'</td><td>'+ch.offsets[0]+' to '+(ch.offsets[0]+ch.sizes[0]-1)+'</td><td><code>'+ch.file+'</code></td><td class="num">'+f(ch.byte_offset,0)+'</td><td class="num">'+f(ch.length,0)+'</td></tr>'}));
    $('sd-dcpchunks').innerHTML=c+'</tbody></table>';
    const st=D.safetensors,hs=st.header_sample;
    $('sd-sthdr').textContent='# first 8 bytes, little-endian u64: '+st.header_len+'\n# then '+st.header_len+' bytes of JSON ('+st.n_tensors+' tensors), first entries:\n'+JSON.stringify(hs,null,1).replace(/\n\s+(?=[\]\d])/g,' ').slice(0,900)+'\n# then '+f(st.total_tensor_bytes,0)+' bytes of tensor data; file '+f(st.file_bytes,0)+' bytes';
    const g2=D.range;
    $('sd-rg-b').textContent=MB(g2.range_bytes);$('sd-rg-f').textContent=MB(g2.file_bytes);$('sd-rg-t').textContent=f(g2.range_s*1000,0)+' ms';$('sd-rg-ft').textContent=f(g2.full_s*1000,0)+' ms';
    const sh=st.shards;$('sd-shards').textContent=Object.keys(sh).filter(k=>k.endsWith('.safetensors')).map(k=>k+' '+MB(sh[k])).join(', ')+', and the index ('+f(sh['model.safetensors.index.json'],0)+' bytes)';
    const hf=D.dcp_hf.files||{};$('sd-dcphf').textContent=Object.keys(hf).map(k=>k+' ('+MB(hf[k])+')').join('; ');
  })();

  // ---- animation 1: the same 8 MiB write through NFS and through Lustre ----
  (function(){
    let mode='lus';
    const STEPS={
      lus:[
        ['The job wants to write 8 MiB','Rank 3 is about to write its 8 MiB checkpoint shard. The file does not exist yet.',0],
        ['open(O_CREAT) goes to the metadata server','The client\'s MDC sends one create request to the MDS. No data moves yet.',1],
        ['The MDS picks four OSTs and returns the layout','It creates one object on each of OST 0 to 3, stores the layout (4 objects, 1 MiB stripes) in the file\'s entry on the MDT, and hands it to the client.',2],
        ['The client computes where every MiB goes','MiB k goes to object k mod 4, at object offset (k div 4) x 1 MiB: lov_stripe_number() and lov_stripe_offset(). The MDS is not asked again.',3],
        ['MiB 0 to 3 go to four servers at once','Each OSC talks to its own OSS, in parallel. Each OST takes the extent lock on its object for this client.',4],
        ['MiB 4 to 7 follow','Each object now holds 2 MiB. No server saw more than a quarter of the bytes.',5],
        ['close() tells the MDS; the size lives on the OSTs','The file\'s size is the sum of what its objects hold; a later stat asks the OSTs. Two metadata requests in all, for any file size.',6]],
      nfs:[
        ['The job wants to write 8 MiB','Rank 3 is about to write its 8 MiB checkpoint shard to an NFS mount.',0],
        ['open(O_CREAT) goes to the NFS server','The one server creates the name; it will also take every byte.',1],
        ['MiB 0 to 3 go to the server','All through one network card and one set of disks.',4],
        ['MiB 4 to 7 follow','8 MiB through one machine; every other node writing now shares it.',5],
        ['close() flushes and reports errors','Close-to-open consistency: "when the application closes the file, the NFS client writes back any pending changes" and reports write errors in close() (nfs(5)). Another node sees the data when it opens the file after this.',6]]};
    const box=(x,y,w,h,lab,sub,col,on)=>H.rect(x,y,w,h,'var(--bg)',{stroke:on?col:'var(--line)',sw:on?2:1,rx:6})+H.t(x+w/2,y+15,lab,{a:'middle',fs:11.5,w:600})+(sub?H.t(x+w/2,y+29,sub,{a:'middle',fs:10,fill:'var(--mute)'}):'');
    function draw(i){
      const S=STEPS[mode],s=S[i],ph=s[2],el=$('sd-life-svg'),W=Math.min(760,H.width(el)),Hh=210;
      const cw=Math.max(92,Math.min(150,W*0.24)),cx=6,cy=60;let b='';
      b+=box(cx,cy,cw,96,'Client (rank 3)','',"var(--acc)",ph>=1);
      const q=Math.min(14,(cw-20)/8-2);
      for(let k=0;k<8;k++){const sent=(ph>=4&&k<4)||(ph>=5);const col=mode==='lus'&&ph>=3?H.OST[k%4]:'var(--dim)';
        b+=H.rect(cx+10+k*(q+2),cy+46,q,q,col,{op:sent?.25:1})}
      b+=H.t(cx+cw/2,cy+86,'8 x 1 MiB',{a:'middle',fs:10,fill:'var(--mute)'});
      const rx=cx+cw+Math.max(30,W*0.12),rw=W-rx-6;
      if(mode==='lus'){
        b+=box(rx,6,rw,40,'MDS / MDT: names and layouts',ph>=2?'layout: OST 0,1,2,3, 1 MiB':'',"var(--c5)",ph===1||ph===2||ph===6);
        const ow=(rw-12)/4;
        for(let o=0;o<4;o++){const ox=rx+o*(ow+4),oy=96;
          b+=box(ox,oy,ow,96,'OST '+o,ph>=2?'object':'',H.OST[o],ph===4||ph===5);
          const held=ph>=5?2:ph>=4?1:0;for(let m=0;m<held;m++)b+=H.rect(ox+ow/2-q/2,oy+40+m*(q+3),q,q,H.OST[o]);}
        if(ph===1||ph===2||ph===6)b+=H.line(cx+cw,cy+20,rx,26,'var(--c5)',{sw:2,dash:ph===2?'4 3':''});
        if(ph===4||ph===5)for(let o=0;o<4;o++)b+=H.line(cx+cw,cy+50,rx+o*(ow+4)+ow/2,96,H.OST[o],{sw:1.5});
      }else{
        b+=box(rx,40,rw,140,'NFS server: names and bytes','',"var(--c2)",ph>=1);
        const held=ph>=5?8:ph>=4?4:0;for(let m=0;m<held;m++)b+=H.rect(rx+12+(m%8)*(q+3),110,q,q,'var(--c2)');
        if(ph>=1)b+=H.line(cx+cw,cy+40,rx,cy+40,'var(--c2)',{sw:ph>=4&&ph<6?3:1.5});
      }
      el.innerHTML=H.svg(W,Hh,b,'One 8 MiB write, step '+(i+1));
      $('sd-life-cap').innerHTML='<div class="t">'+(i+1)+'. '+esc(s[0])+'</div><p>'+esc(s[1])+'</p>';
      const sent=ph>=5?8:ph>=4?4:0;
      cnt('sd-life-cnt',mode==='lus'?[['Bytes through the metadata server','0'],['Most bytes on one server',f(Math.ceil(sent/4),0)+' MiB'],['Servers the bytes touch',ph>=4?'4':'0'],['Metadata requests',ph>=6?'2':ph>=1?'1':'0']]
        :[['Bytes through the server',sent+' MiB'],['Most bytes on one server',sent+' MiB'],['Servers the bytes touch',ph>=4?'1':'0'],['Requests to that server',ph>=6?'open, writes, close':ph>=1?'open':'0']]);
    }
    const A=R.anim({card:'sd-life-card',ctl:'sd-life-ctl',n:STEPS.lus.length,draw,ms:1700,label:'Write step'});
    H.seg($('sd-life-mode'),m=>{mode=m;A.reset(STEPS[m].length)});
  })();

  // ---- animation 2: resharding reads ----
  (function(){
    let W=4;
    const files=Object.keys(D.dcp.files).filter(k=>k.endsWith('.distcp')).sort();
    const onDisk=D.dcp_data_bytes;
    function draw(i){
      const ranks=D.loads[W],el=$('sd-rs-svg'),Wd=Math.min(760,H.width(el));
      const lab=Math.min(70,Wd*0.16),gx=lab,gw=(Wd-gx-6-3*6)/4,rowH=22;let b='';
      b+=H.t(0,16,'on disk',{fs:10.5,fill:'var(--mute)'});
      files.forEach((fn,j)=>{const x=gx+j*(gw+6);b+=H.rect(x,4,gw,18,'var(--soft)',{stroke:'var(--line)'})+H.t(x+gw/2,16,fn.replace('.distcp',''),{a:'middle',fs:10})+H.t(x+gw/2,34,MB(D.dcp.files[fn]),{a:'middle',fs:9.5,fill:'var(--mute)'})});
      let read=0;
      ranks.forEach((r,k)=>{const y=46+k*(rowH+6),on=k<i;
        b+=H.t(0,y+14,'new rank '+r.rank,{fs:10.5,w:on?600:400,fill:on?'':'var(--mute)'});
        files.forEach((fn,j)=>{const x=gx+j*(gw+6),bytes=r.per_file[fn]||0,frac=bytes/D.dcp.files[fn];
          b+=H.rect(x,y,gw,rowH,'none',{stroke:'var(--line)',dash:'2 2'});
          if(on&&bytes>0){b+=H.rect(x,y,Math.max(1.5,gw*frac),rowH,H.OST[k],{op:.85});if(frac>0.3)b+=H.t(x+4,y+15,MB(bytes),{fs:9.5,fill:'var(--bg)'})}});
        if(on)read+=r.bytes});
      const Hh=46+ranks.length*(rowH+6)+4;
      el.innerHTML=H.svg(Wd,Hh,b,'Resharding reads, '+W+' ranks');
      const n=ranks.length;let cap;
      if(i===0)cap=['The checkpoint on disk','Four shard files written by 4 ranks, '+MB(onDisk)+' of data, and the .metadata map. Each new rank first reads .metadata, then plans which stored chunks overlap the rows it now owns.'];
      else if(i<=n){const r=ranks[i-1];const parts=Object.keys(r.per_file).map(k=>k.replace('.distcp','')+' '+MB(r.per_file[k])).join(', ');
        cap=['New rank '+r.rank+' reads '+MB(r.bytes)+' in '+f(r.n_reads,0)+' reads',parts+'. '+(W===4?'The same layout: its own file, plus the small replicated entries (step counters and the like) from the others.':W===2?'It now owns two old shards exactly, so it reads two whole files and nothing else of size.':'Its rows straddle two old chunks, so it reads both whole chunks and keeps a part of one: '+'the overlap is read again by its neighbour.')]}
      else cap=['Total: '+f(read/onDisk,2)+' times the bytes on disk',W===3?'Three ranks read 1.50 times the checkpoint, because DCP reads whole stored chunks (filesystem.py, lines 869-884). At a divisor of the old world size each byte is read once.':'Each byte of data is read once (plus the replicated entries every rank needs).'];
      $('sd-rs-cap').innerHTML='<div class="t">'+esc(cap[0])+'</div><p>'+esc(cap[1])+'</p>';
      cnt('sd-rs-cnt',[['Ranks loading',String(W)],['Bytes read so far',MB(read)],['Data on disk',MB(onDisk)],['Read / on disk',f(read/onDisk,2)+'x']]);
    }
    const A=R.anim({card:'sd-rs-card',ctl:'sd-rs-ctl',n:D.loads[4].length+2,draw,ms:1600,label:'Reshard step'});
    H.seg($('sd-rs-mode'),m=>{W=+m;A.reset(D.loads[W].length+2)});
  })();

  // ---- drills and reading time ----
  H.drills($('t-read'));
  const rt=$('t-read');if(rt){const c=rt.cloneNode(true);c.querySelectorAll('style,nav,.rd-card,details,pre,.pr,table').forEach(x=>x.remove());
    const words=(c.textContent.match(/\S+/g)||[]).length;window.RD_WORDS=words;const e=$('rd-time');if(e)e.textContent=Math.round(words/200)}
})();

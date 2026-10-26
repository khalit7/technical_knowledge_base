// ---- Moved from the root Storage lab (2026-10-19): data reading (big vs small files, prefetch) and restore errors ----
(function(){
  const H=window.IOH&&window.IOH('t-read'),D=window.IO_D;if(!H||!D||!H.$('io-dr-rows'))return;const $=H.$;
  const fS=s=>s>=1?s.toFixed(s>=10?1:2)+' s':(s*1e3).toFixed(s>=0.01?0:1)+' ms';
  const RA=D.read_all,W=D.data_write;
  const wr=l=>W.find(x=>x.layout===l)||{};
  const rows=[['big','local','16 files of 4 MiB','Docker volume'],['big','s3','16 files of 4 MiB','S3 store'],['small','local','16,384 files of 4 KiB','Docker volume'],['small','s3','16,384 files of 4 KiB','S3 store']];
  const g=(l,s,t)=>RA[l+'|'+s+'|'+t]||{};
  $('io-dr-rows').innerHTML=rows.map(([l,s,a,b])=>'<tr><td>'+a+'</td><td>'+b+'</td><td class="num">'+fS(s==='local'?wr(l).local_s:wr(l).s3_16threads_s)+(s==='s3'?' <span class="mute">(16 threads)</span>':'')+'</td><td class="num">'+fS(g(l,s,1).s)+' <span class="mute">'+g(l,s,1).MBps+' MB/s</span></td><td class="num">'+fS(g(l,s,16).s)+' <span class="mute">'+g(l,s,16).MBps+' MB/s</span></td></tr>').join('');
  const sl=g('small','s3',1),bl=g('big','s3',1),sloc=g('small','local',1),bloc=g('big','local',1);
  $('io-dr-text').innerHTML='Medians of '+(sl.n||0)+' runs; the local reads start with the files dropped from the page cache. Same bytes, very different bills: on the S3 store the small files took <b>'+(sl.s/bl.s).toFixed(0)+' times</b> as long to read as the big ones ('+(sl.s/sl.files*1e3).toFixed(2)+' ms per request, one at a time), and '+(wr('small').s3_16threads_s/wr('big').s3_16threads_s).toFixed(0)+' times as long to write; on the volume, '+(sloc.s/bloc.s).toFixed(0)+' times as long to read. Sixteen threads help the store a little and the volume not at all: the per-file cost here is Python and the kernel, not a disk. Measured on Apple M1 Pro, Docker Desktop VM, shared machine.';


  // restore errors
  const E=D.errors;if(E&&E.truncated){
    const esc=H.esc;
    $('io-errs').innerHTML=
      '<p><b>1. A file cut off mid-write</b> (half of a '+(E.truncated.of/1e6).toFixed(0)+' MB <code>torch.save</code> file, as a crash during a non-atomic write leaves it):</p><div class="io-err">'+esc(E.truncated.error)+'</div>'+
      '<p><b>2. One rank’s shard missing</b> from a 4-rank DCP checkpoint (<code>'+E.missing.removed+'</code> deleted, as a failed rank or a partial copy leaves it). DCP reports which rank failed, and the rank’s own error underneath:</p><div class="io-err">'+esc(E.missing.error)+'\n'+esc(E.missing.inner)+'</div>'+
      '<p><b>3. The wrong model shape</b> (the 512-wide checkpoint loaded into a 256-wide model): one line per mismatched tensor, '+E.shape.lines+' lines in all, starting:</p><div class="io-err">'+esc(E.shape.error)+'\n'+esc(E.shape.next)+'</div>';
  }
  const RS=D.reshard||[];
  window.IO_RS=RS;
})();

// ---- Reading tab: numbers filled from the recorded data, the stack diagram, bar charts and the writeback timeline ----
(function(){
const D=window.ST_DATA,$=id=>document.getElementById(id),esc=RD.esc;
const f0=x=>Math.round(x).toLocaleString('en-US'),f1=x=>(Math.round(x*10)/10).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const sync=(fs,shape,mode)=>D.sync.find(r=>r.fs===fs&&r.shape===shape&&r.mode===mode);
const ck=l=>D.ckpt.find(r=>r.label.indexOf(l)===0);
// ---- horizontal bars in HTML (labels never clip at phone width) ----
// rows: [{l,v,txt,c,sub,ghost}] ; opts {max, log}
function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r.v));
  const sc=v=>o.log?Math.max(0,Math.log10(Math.max(v,o.lmin||1))-Math.log10(o.lmin||1))/(Math.log10(mx)-Math.log10(o.lmin||1)):v/mx;
  el.innerHTML='<div class="hb">'+rows.map(r=>'<div class="l">'+r.l+'</div><div class="r"><span class="bar'+(r.ghost?' ghost':'')+'" style="width:calc('+(Math.max(0.004,sc(r.v))*78).toFixed(2)+'% );--bc:'+(r.c||'var(--acc)')+'"></span><span class="v">'+r.txt+'</span></div>'+(r.sub?'<div class="sub">'+r.sub+'</div>':'')).join('')+'</div>'}
RD.bars=bars;
// ---- one screen ----
const wr=sync('ext4','overwrite','none'),fsy=sync('ext4','overwrite','fsync'),fds=sync('ext4','overwrite','fdatasync'),sfr=sync('ext4','overwrite','sfr');
set('one-c-write',f1(wr.med)+' us');set('one-c-fsync',f0(fsy.med)+' us');set('one-c-fdatasync',f0(fds.med)+' us');set('one-c-sfr',f0(sfr.med)+' us');
const safe=ck('tmp + fsync'),naive=ck('torch.save straight');
const dirm=/directory fsync ([\d.]+) ms/.exec(safe.note);set('one-c-dirfsync',dirm?dirm[1]+' ms (after a rename)':'');
set('one-c-note','Medians of 1,000 overwrites of one 4 KiB record of a preallocated file on ext4 (section 6 has appends and the 99th percentiles); the directory fsync is from the 256 MiB checkpoint runs of section 11.');
set('one-dirty',f0(naive.dirty));set('one-safe',f0(safe.med));set('one-naive',f0(naive.med));
const wbT=Object.keys(D.wb).filter(k=>k==='small'||k.indexOf('primed')===0).map(k=>D.wb[k].last_dirty_s);
set('one-wbmin',f0(Math.min(...wbT)));set('one-wbmax',f0(Math.max(...wbT)));
set('one-ra',String(D.ra[0].reqs));
// ---- the stack ----
const S=[['Your code','torch.save, np.memmap, DataLoader workers','#rd-s11','var(--c4)'],['System calls','read, write, fsync, rename, openat','#rd-s6','var(--c4)'],
 ['VFS','dentries, inodes, open files','#rd-s3','var(--c1)'],['Page cache','dirty pages, readahead, writeback','#rd-s4','var(--c1)'],
 ['File system','ext4: jbd2 journal, extents, delayed allocation','#rd-s8','var(--c3)'],['Block layer','bios, requests, blk-mq queues, scheduler','#rd-s2','var(--c5)'],
 ['Driver','NVMe submission and completion queues, doorbells','#rd-s1','var(--c5)'],['Device','its own volatile cache, then flash or platter','#rd-s1','var(--c2)']];
$('rd-stack').innerHTML='<div class="stk">'+S.map((s,i)=>(i===4?'<div class="gap">write() returns here, above this line: the data is only in memory</div>':'')+(i===7?'<div class="gap">a cache flush or FUA (inside fsync) is what pushes data past this line</div>':'')+'<a href="'+s[2]+'" style="--sc:'+s[3]+'"><b>'+s[0]+'</b><span>'+s[1]+'</span></a>').join('')+'</div>';
// ---- section 1: device queue, queue depth chart ----
const E=D.env;$('rd-q-out').textContent='$ cd /sys/block/vda/queue; for f in scheduler nr_requests read_ahead_kb max_sectors_kb logical_block_size rotational write_cache fua; do echo "$f: $(cat $f)"; done\n'+['scheduler','nr_requests','read_ahead_kb','max_sectors_kb','logical_block_size','rotational','write_cache','fua'].map(k=>k+': '+E[k]).join('\n');
const qd=[1,4,16,64].map(q=>Object.assign({q},D.fio['randread_4k_qd'+q]));
bars($('rd-qd'),qd.map(r=>({l:'QD '+r.q,v:r.iops,txt:f0(r.iops)+' reads/s, mean '+f0(r.mean)+' us, p99 '+f0(r.p99)+' us'})));
set('rd-qd-note','Going from QD 1 to 64 multiplied throughput by '+f1(qd[3].iops/qd[0].iops)+' and mean latency by '+f1(qd[3].mean/qd[0].mean)+'. Little\'s law check at QD 64: 64 / '+f0(qd[3].mean)+' us = '+f0(64/(qd[3].mean*1e-6))+' per second, against '+f0(qd[3].iops)+' measured. The "rotational: 1" above is the virtual disk misreporting itself; the shape of the curve, not the absolute numbers, is the lesson (see the caveat in One screen).');
// ---- section 2 ----
set('rd-b-sched',(E.scheduler.match(/\[(\w[\w-]*)\]/)||[,''])[1]);set('rd-b-hwq',String((D.env_txt.match(/hardware queues: (\d+)/)||[,''])[1]));
set('rd-b-nr',E.nr_requests);set('rd-b-maxs',E.max_sectors_kb);set('rd-b-ra',E.read_ahead_kb);
// ---- section 3: ext4 image, metadata costs ----
$('rd-img').textContent=D.fsimage_txt.trim();
const M=l=>D.meta.find(r=>r.label.indexOf(l)===0);
const mrows=[['create + write + close 10,240 small files','create 10,240 small files','var(--c2)'],['write one 40 MiB file','write one 40 MiB file','var(--c1)'],
 ['read 10,240 small files, warm','read small files, warm','var(--c2)'],['read the big file, warm','read the big file, warm','var(--c1)'],
 ['read 10,240 small files, data cold','read small files, cold','var(--c2)'],['read the big file, cold','read the big file, cold','var(--c1)'],
 ['delete 10,240 small files','delete small files','var(--c2)'],['delete the big file','delete the big file','var(--c1)'],
 ['stat 10,240 files','stat 10,240 files (warm)','var(--c5)'],['ls: list the directory','list the directory','var(--c5)']];
bars($('rd-meta'),mrows.map(r=>({l:r[1],v:M(r[0]).ms,txt:f1(M(r[0]).ms)+' ms',c:r[2]})));
const coldx=M('read 10,240 small files, data cold').ms/M('read the big file, cold').ms;
set('rd-meta-note','Orange: 10,240 files of 4 KiB; blue: one file of 40 MiB. Creating the small files took '+f1(M('create + write + close').ms/M('write one 40 MiB').ms)+'x as long, reading them warm '+f1(M('read 10,240 small files, warm').ms/M('read the big file, warm').ms)+'x, cold '+f0(coldx)+'x. Cold means each file\'s pages were dropped with posix_fadvise(DONTNEED) after an fsync.');
set('rd-ra-meta',f0(coldx));set('rd-dl-meta',f0(coldx));
// ---- section 5: writeback ----
const thr=/nr_dirty_threshold: (\d+)/.exec(D.env_txt),bthr=/nr_dirty_background_threshold: (\d+)/.exec(D.env_txt);
set('rd-wb-bg',f0(+bthr[1]));set('rd-wb-hard',f0(+thr[1]));set('rd-wb-ck',f0(naive.dirty));
const WB=[['small','16 MiB, fresh container'],['mid','256 MiB, fresh container'],['primed','16 MiB, primed (run 1)'],['primed2','16 MiB, primed (run 2)'],['primed3','16 MiB, primed (run 3)'],['primed4','16 MiB, primed (run 4)'],['fsync','256 MiB, then fsync'],['big','1.5 GiB, as fast as possible']];
const pr=['primed','primed2','primed3','primed4'].map(k=>D.wb[k].last_dirty_s);
set('rd-wb-drill','Measured: in fresh containers the data stayed dirty '+f1(D.wb.small.last_dirty_s)+' s (16 MiB) and '+f1(D.wb.mid.last_dirty_s)+' s (256 MiB); in the four primed runs '+pr.map(f1).join(', ')+' s.');
const mode=$('rd-wb-mode');mode.innerHTML=WB.map((w,i)=>'<button data-m="'+w[0]+'"'+(i===0?' class="on"':'')+'>'+w[1]+'</button>').join('');
const SER=[['dirty (memory.stat file_dirty)',1,'var(--c2)'],['under writeback',2,'var(--c5)'],['received by the device (io.stat)',3,'var(--c3)'],['written by the program',4,'var(--c1)']];
$('rd-wb-leg').innerHTML=SER.map(s=>'<span style="--sw:'+s[2]+'">'+s[0]+'</span>').join('');
let cur='small';
function drawWB(){const el=$('rd-wb-svg'),W=Math.min(860,RD.width(el)),H=230,L=46,R=10,T=10,B=30,w=D.wb[cur],rows=w.rows;
  const tmax=Math.max(...rows.map(r=>r[0])),ymax=Math.max(1,...rows.map(r=>Math.max(r[1],r[2],r[3],r[4])))*1.08;
  const x=t=>L+(W-L-R)*t/tmax,y=v=>T+(H-T-B)*(1-v/ymax);
  let g='';const step=ymax>800?400:ymax>200?100:ymax>40?20:5;
  for(let v=0;v<=ymax;v+=step)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,f0(v),{a:'end',fill:'var(--mute)'});
  const ts=tmax>20?5:tmax>5?1:0.5;for(let t=0;t<=tmax+1e-9;t+=ts)g+=RD.t(x(t),H-B+14,(ts<1?f1(t):f0(t)),{a:'middle',fill:'var(--mute)'});
  g+=RD.t(L+(W-L-R)/2,H-3,'seconds after the first write',{a:'middle',fill:'var(--mute)'})+RD.t(4,T+4,'MiB',{fill:'var(--mute)'});
  SER.forEach(s=>{g+='<polyline fill="none" stroke="'+s[2]+'" stroke-width="2" points="'+rows.map(r=>x(r[0]).toFixed(1)+','+y(r[s[1]]).toFixed(1)).join(' ')+'"/>'});
  el.innerHTML=RD.svg(W,H,g,'Dirty and written MiB over time');
  const ws=w.wchans.filter(c=>c!=='0'&&c!=='-'&&c!=='hrtimer_nanosleep');
  $('rd-wb-cap').innerHTML=esc(w.head)+(w.fsync_s!=null?'; fsync took '+f1(w.fsync_s*1000)+' ms':'')+'. Dirty data last above 1 MiB at '+f1(w.last_dirty_s)+' s.'+(ws.length?' Writer seen sleeping in: <code>'+ws.map(esc).join('</code>, <code>')+'</code>.':'')+(cur.indexOf('primed')===0?' Primed: the same container first wrote and fsynced 1 GiB.':'')}
RD.seg(mode,m=>{cur=m;drawWB()});RD.onRender(drawWB);RD.onResize(drawWB);drawWB();
// ---- section 6: durability costs ----
const ML={none:'write only',fsync:'+ fsync',fdatasync:'+ fdatasync',odsync:'O_DSYNC',sfr:'+ sync_file_range'};
function drawSC(fs){const rows=[];['overwrite','append'].forEach(sh=>['none','sfr','fdatasync','odsync','fsync'].forEach(m=>{const r=sync(fs,sh,m);rows.push({l:sh+', '+ML[m],v:r.med,txt:f1(r.med)+' us (p99 '+f0(r.p99)+')',c:m==='none'?'var(--c3)':m==='sfr'?'var(--c5)':m==='fsync'?'var(--c2)':'var(--c1)'})}));
  bars($('rd-sc'),rows,{log:true,lmin:0.5,max:Math.max(...D.sync.map(r=>r.med))});
  set('rd-sc-note',fs==='ext4'?'Log scale. On an overwrite, fdatasync cost '+f1(sync('ext4','overwrite','fsync').med/sync('ext4','overwrite','fdatasync').med)+'x less than fsync; on an append only '+f1(sync('ext4','append','fsync').med/sync('ext4','append','fdatasync').med)+'x less. sync_file_range is cheaper because it flushes nothing and commits nothing: it is not a durability call.':'Log scale, same axis as ext4. On tmpfs every call costs about a microsecond: there is no device and nothing to flush.')}
RD.seg($('rd-sc-mode'),drawSC);drawSC('ext4');
// ---- section 7 and 11: traces ----
$('rd-tr-naive').textContent=D.trace.naive;$('rd-tr-safe').textContent=D.trace.safe;$('rd-tr-dcp').textContent=D.trace.dcp;
// ---- section 8 ----
$('rd-jbd2').textContent='$ cat /proc/fs/jbd2/vda1-8/info\n'+D.jbd2;
{const j=D.jbd2,g=r=>(r.exec(j)||[,'?'])[1];set('rd-j-run',g(/(\d+)ms running transaction/));set('rd-j-n',f0(+g(/^(\d+) transactions/)));set('rd-j-req',f0(+g(/\((\d+) requested\)/)));
 set('rd-j-blk',g(/(\d+) logged blocks per transaction/));set('rd-j-ms',f1(+g(/(\d+)us average transaction commit time/)/1000));}
// ---- section 9 ----
$('rd-dio').textContent=D.direct_txt;
const F=D.fio;set('rd-dio-a',f0(F.randwrite_4k_qd1.iops));set('rd-dio-b',f0(F.randwrite_4k_qd1_fdatasync.iops));
const FT=[['seqread_1m_direct','1 MiB sequential reads','O_DIRECT, libaio, QD 8'],['seqwrite_1m_direct','1 MiB sequential writes','O_DIRECT, libaio, QD 8'],['seqwrite_1m_buffered','1 MiB sequential writes','buffered, one thread, fsync at end'],
 ['randread_4k_qd1','4 KiB random reads','O_DIRECT, QD 1'],['randread_4k_buffered_cold_start','4 KiB random reads','buffered, one thread, cache cold at start'],['randwrite_4k_qd1','4 KiB random writes','O_DIRECT, QD 1'],['randwrite_4k_qd1_fdatasync','4 KiB random writes','O_DIRECT, QD 1, fdatasync each']];
$('rd-fio-tbl').innerHTML='<thead><tr><th>Workload</th><th>How</th><th>per second</th><th>MiB/s</th><th>mean latency</th></tr></thead><tbody>'+FT.map(r=>{const x=F[r[0]];return '<tr><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+f0(x.iops)+'</td><td>'+f0(x.mibs)+'</td><td>'+f0(x.mean)+' us</td></tr>'}).join('')+'</tbody>';
const U=F.randread_4k_qd16_iouring;set('rd-uring',f0(U.iops)+' reads per second at queue depth 16, against '+f0(F.randread_4k_qd16.iops)+' with libaio');
$('rd-uring-out').textContent=D.uring_txt.trim();
// ---- section 11: checkpoints ----
set('rd-ck-state',D.ckpt_state);
const CK=[['torch.save straight','torch.save(state, path)','var(--c2)'],['torch.save + flush + fsync','torch.save + fsync','var(--c1)'],['tmp + fsync','tmp, fsync, rename, fsync(dir)','var(--c3)'],
 ['dcp.save FileSystemWriter(sync_files=True, thread_count=1)','dcp.save, sync_files=True','var(--c4)'],['dcp.save FileSystemWriter(sync_files=False','dcp.save, sync_files=False','var(--c5)'],['dcp.save FileSystemWriter(sync_files=True, thread_count=4)','dcp.save, 4 writer threads','var(--c4)'],['dcp.async_save','dcp.async_save (total)','var(--c6)']];
bars($('rd-ck'),CK.map(c=>{const r=ck(c[0]);return {l:c[1],v:r.med,txt:f0(r.med)+' ms, '+f1(r.dirty)+' MiB dirty after',c:c[2],sub:r.note&&r.note.indexOf('files:')<0?esc(r.note.replace(/[()]/g,'')):(r.note?esc(r.note):'')}}));
const as=ck('dcp.async_save'),blk=/after (\d+) ms/.exec(as.note);
set('rd-ck-async',blk[1]);set('rd-ck-asynctot',f0(as.med));
set('rd-ck-note','Medians of 5 runs (min and max in src/raw/ckpt_time.txt). fsync added '+f0(ck('torch.save + flush').med-naive.med)+' ms to a '+f0(naive.med)+' ms save; the full safe protocol '+f0(safe.med-naive.med)+' ms, of which the directory fsync was '+(dirm?dirm[1]:'?')+' ms. The variants that do not fsync return with the whole checkpoint still dirty. Four writer threads made DCP faster than one. On this VM the device absorbs 256 MiB in about a tenth of a second; a device that writes 250 MB/s (an illustrative cloud-volume rate) would need 268 MB / 250 MB/s = about 1.1 s for the same fsync.');
// ---- glossary ----
const gl=[...document.querySelectorAll('#t-read dfn[id^="g-"]')].map(d=>({id:d.id,t:d.textContent,sec:(d.closest('section')||{}).id}));
gl.sort((a,b)=>a.t.toLowerCase()<b.t.toLowerCase()?-1:1);
$('rd-gloss').innerHTML=gl.map(g=>{const h=document.querySelector('#'+g.sec+' h2');return '<div><b><a href="#'+g.id+'">'+esc(g.t)+'</a></b> <span class="small mute">'+(h?esc(h.textContent.replace(/:.*$/,'')):'')+'</span></div>'}).join('');
})();

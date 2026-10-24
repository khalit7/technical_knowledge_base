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
// ---- the numbers below the one-screen table and the checkpoint caption are static text since 2026-10-24; check_embed.py checks them ----
const safe=ck('tmp + fsync'),naive=ck('torch.save straight'),dirm=/directory fsync ([\d.]+) ms/.exec(safe.note);
// ---- section 1: device queue, queue depth chart ----
const E=D.env;$('rd-q-out').textContent='$ cd /sys/block/vda/queue; for f in scheduler nr_requests read_ahead_kb max_sectors_kb logical_block_size rotational write_cache fua; do echo "$f: $(cat $f)"; done\n'+['scheduler','nr_requests','read_ahead_kb','max_sectors_kb','logical_block_size','rotational','write_cache','fua'].map(k=>k+': '+E[k]).join('\n');
const qd=[1,4,16,64].map(q=>Object.assign({q},D.fio['randread_4k_qd'+q]));
bars($('rd-qd'),qd.map(r=>({l:'QD '+r.q,v:r.iops,txt:f0(r.iops)+' reads/s, mean '+f0(r.mean)+' us, p99 '+f0(r.p99)+' us'})));
// ---- section 2: ext4 image, metadata costs ----
$('rd-img').textContent=D.fsimage_txt.trim();
const M=l=>D.meta.find(r=>r.label.indexOf(l)===0);
const mrows=[['create + write + close 10,240 small files','create 10,240 small files','var(--c2)'],['write one 40 MiB file','write one 40 MiB file','var(--c1)'],
 ['read 10,240 small files, warm','read small files, warm','var(--c2)'],['read the big file, warm','read the big file, warm','var(--c1)'],
 ['read 10,240 small files, data cold','read small files, cold','var(--c2)'],['read the big file, cold','read the big file, cold','var(--c1)'],
 ['delete 10,240 small files','delete small files','var(--c2)'],['delete the big file','delete the big file','var(--c1)'],
 ['stat 10,240 files','stat 10,240 files (warm)','var(--c5)'],['ls: list the directory','list the directory','var(--c5)']];
bars($('rd-meta'),mrows.map(r=>({l:r[1],v:M(r[0]).ms,txt:f1(M(r[0]).ms)+' ms',c:r[2]})));
// ---- section 4: writeback ----
const thr=/nr_dirty_threshold: (\d+)/.exec(D.env_txt),bthr=/nr_dirty_background_threshold: (\d+)/.exec(D.env_txt);
set('rd-wb-bg',f0(+bthr[1]));set('rd-wb-hard',f0(+thr[1]));
const WB=[['small','16 MiB, fresh container'],['mid','256 MiB, fresh container'],['primed','16 MiB, primed (run 1)'],['primed2','16 MiB, primed (run 2)'],['primed3','16 MiB, primed (run 3)'],['primed4','16 MiB, primed (run 4)'],['fsync','256 MiB, then fsync'],['big','1.5 GiB, as fast as possible']];
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
// ---- section 5: durability costs ----
const ML={none:'write only',fsync:'+ fsync',fdatasync:'+ fdatasync',odsync:'O_DSYNC',sfr:'+ sync_file_range'};
function drawSC(fs){const rows=[];['overwrite','append'].forEach(sh=>['none','sfr','fdatasync','odsync','fsync'].forEach(m=>{const r=sync(fs,sh,m);rows.push({l:sh+', '+ML[m],v:r.med,txt:f1(r.med)+' us (p99 '+f0(r.p99)+')',c:m==='none'?'var(--c3)':m==='sfr'?'var(--c5)':m==='fsync'?'var(--c2)':'var(--c1)'})}));
  bars($('rd-sc'),rows,{log:true,lmin:0.5,max:Math.max(...D.sync.map(r=>r.med))})}
RD.seg($('rd-sc-mode'),drawSC);drawSC('ext4');
// ---- sections 6 and 10: traces ----
$('rd-tr-naive').textContent=D.trace.naive;$('rd-tr-safe').textContent=D.trace.safe;$('rd-tr-dcp').textContent=D.trace.dcp;
// ---- section 7 ----
$('rd-jbd2').textContent='$ cat /proc/fs/jbd2/vda1-8/info\n'+D.jbd2;
// ---- section 8 ----
$('rd-dio').textContent=D.direct_txt;
const F=D.fio;
const FT=[['seqread_1m_direct','1 MiB sequential reads','O_DIRECT, libaio, QD 8'],['seqwrite_1m_direct','1 MiB sequential writes','O_DIRECT, libaio, QD 8'],['seqwrite_1m_buffered','1 MiB sequential writes','buffered, one thread, fsync at end'],
 ['randread_4k_qd1','4 KiB random reads','O_DIRECT, QD 1'],['randread_4k_buffered_cold_start','4 KiB random reads','buffered, one thread, cache cold at start'],['randwrite_4k_qd1','4 KiB random writes','O_DIRECT, QD 1'],['randwrite_4k_qd1_fdatasync','4 KiB random writes','O_DIRECT, QD 1, fdatasync each']];
$('rd-fio-tbl').innerHTML='<thead><tr><th>Workload</th><th>How</th><th>per second</th><th>MiB/s</th><th>mean latency</th></tr></thead><tbody>'+FT.map(r=>{const x=F[r[0]];return '<tr><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+f0(x.iops)+'</td><td>'+f0(x.mibs)+'</td><td>'+f0(x.mean)+' us</td></tr>'}).join('')+'</tbody>';
$('rd-uring-out').textContent=D.uring_txt.trim();
// ---- section 10: checkpoints ----
set('rd-ck-state',D.ckpt_state);
const CK=[['torch.save straight','torch.save(state, path)','var(--c2)'],['torch.save + flush + fsync','torch.save + fsync','var(--c1)'],['tmp + fsync','tmp, fsync, rename, fsync(dir)','var(--c3)'],
 ['dcp.save FileSystemWriter(sync_files=True, thread_count=1)','dcp.save, sync_files=True','var(--c4)'],['dcp.save FileSystemWriter(sync_files=False','dcp.save, sync_files=False','var(--c5)'],['dcp.save FileSystemWriter(sync_files=True, thread_count=4)','dcp.save, 4 writer threads','var(--c4)'],['dcp.async_save','dcp.async_save (total)','var(--c6)']];
bars($('rd-ck'),CK.map(c=>{const r=ck(c[0]);return {l:c[1],v:r.med,txt:f0(r.med)+' ms, '+f1(r.dirty)+' MiB dirty after',c:c[2],sub:r.note&&r.note.indexOf('files:')<0?esc(r.note.replace(/[()]/g,'')):(r.note?esc(r.note):'')}}));
})();

// ---- Section 6: one 4 KiB overwrite through fsync, fdatasync and sync_file_range (order from fs/ext4/fsync.c v5.10; totals measured) ----
(function(){
const D=window.ST_DATA,$=id=>document.getElementById(id);if(!$('rd-fs-card'))return;
const med=m=>D.sync.find(r=>r.fs==='ext4'&&r.shape==='overwrite'&&r.mode===m).med;
const LAY=['Your program','Page cache','ext4 and jbd2 journal','Block layer and driver','Device volatile cache','Stable media (flash)'];
// each step: where the data page (d) and the time-stamp change (t) are; journal state (j); caption
const P={data:'4 KiB data page',meta:'inode change (new mtime)'};
const COMMON=[
 {d:0,t:-1,c:'pwrite() of 4 KiB',p:'The call starts in your program with the 4 KiB record.'},
 {d:1,t:2,c:'pwrite() returns',p:'The bytes are copied into the cached page, which is marked dirty; the inode\'s new modification time joins the running journal transaction (in memory). Measured: '+med('none').toFixed(1)+' us for the write alone.'},
 {d:3,t:2,c:'write the page and wait',p:'file_write_and_wait_range (fs/ext4/fsync.c, called from ext4_sync_file at line 129): the dirty page becomes a bio, goes through blk-mq to the driver.'},
 {d:4,t:2,c:'the device acknowledges',p:'The device reports the write complete as soon as it is in its volatile cache (write_cache: write back). A power cut now still loses it.'}];
const SEQ={
 fsync:COMMON.concat([
  {d:4,t:3,c:'commit the journal transaction',p:'ext4_fsync_journal (line 104): this inode last changed in the running transaction (i_sync_tid), so jbd2 must commit it: journal blocks, then the commit block.'},
  {d:5,t:5,c:'commit block with PREFLUSH and FUA',p:'jbd2 writes the commit block with REQ_PREFLUSH | REQ_FUA (fs/jbd2/commit.c line 157): the device flushes its cache, so the data page and the journal reach stable media.'},
  {d:5,t:5,c:'fsync returns',p:'Data and all metadata are durable.',end:'fsync'}]),
 fdatasync:COMMON.concat([
  {d:4,t:2,c:'no commit needed',p:'For fdatasync the journal wait uses i_datasync_tid (line 109): an overwrite changed nothing data retrieval needs (size and block map unchanged), and that transaction committed long ago, so there is nothing to wait for. The mtime change stays in the running transaction.'},
  {d:5,t:2,c:'blkdev_issue_flush',p:'needs_barrier is set, so ext4_sync_file sends a cache flush (line 177): the data page reaches stable media.'},
  {d:5,t:2,c:'fdatasync returns',p:'The data is durable; the new mtime will be committed within about 5 s by the journal timer. Losing that on a crash is harmless.',end:'fdatasync'}]),
 sfr:COMMON.concat([
  {d:4,t:2,c:'sync_file_range returns',p:'WAIT_BEFORE | WRITE | WAIT_AFTER waited for writeback only: no journal commit, no cache flush. The kernel\'s own comment says there are "no guarantees here that the data will be available on disk after a crash" (fs/sync.c line 355).',end:'sfr'}])};
const NAMES={fsync:'fsync',fdatasync:'fdatasync',sfr:'sync_file_range'};
let mode='fsync';
function draw(i){const s=SEQ[mode][i],W=Math.min(860,RD.width($('rd-fs-svg')));
  let h='<div class="stk">';
  LAY.forEach((l,k)=>{const tok=[];if(s.d===k)tok.push('<span class="pill ok">'+P.data+'</span>');if(s.t===k)tok.push('<span class="pill mid">'+P.meta+'</span>');
    h+='<a href="#rd-s6" style="--sc:'+(k===5?'var(--good)':k===4?'var(--bad)':'var(--line)')+';cursor:default" onclick="return false"><b>'+l+'</b><span>'+(tok.join(' ')||'&nbsp;')+'</span></a>'});
  $('rd-fs-svg').innerHTML=h+'</div>';
  $('rd-fs-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+SEQ[mode].length+': '+s.c+'</div><p>'+s.p+'</p>';
  const dur=s.d===5?'yes':'no';
  $('rd-fs-cnt').innerHTML=RD.stat('call',NAMES[mode])+RD.stat('data durable now?',dur)+RD.stat('mtime durable now?',s.t===5?'yes':'no')+RD.stat('measured median, whole call',s.end?Math.round(med(s.end))+' us':'(at the end)','1,000 overwrites, ext4');
}
const an=RD.anim({card:'rd-fs-card',ctl:'rd-fs-ctl',n:SEQ.fsync.length,draw,ms:1700,label:'Step'});
const seg=$('rd-fs-mode');seg.innerHTML=Object.keys(NAMES).map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+NAMES[k]+'</button>').join('');
RD.seg(seg,m=>{mode=m;an.reset(SEQ[m].length);an.play()});
an.redraw();RD.onResize(()=>an.redraw());
})();

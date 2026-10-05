// ---- Reading section 7: a checkpoint's journey: write() into the page cache, fsync to the device; naive against write-fsync-rename ----
(function(){
  const Wd=window.RD_DATA&&RD_DATA.write;const host=document.getElementById('rd-wr-svg');if(!host||!Wd)return;const $=id=>document.getElementById(id);
  const runs=Wd.runs,med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
  const M={write:med(runs.map(r=>r.write_ms)),fsync:med(runs.map(r=>r.fsync_ms)),dirtyW:med(runs.map(r=>r.after_write.Dirty)),dirtyF:med(runs.map(r=>r.after_fsync.Dirty)),dirty0:med(runs.map(r=>r.before.Dirty)),
    sw:med(runs.map(r=>r.safe_ms.write)),sf:med(runs.map(r=>r.safe_ms.fsync_file)),sr:med(runs.map(r=>r.safe_ms.rename)),sd:med(runs.map(r=>r.safe_ms.fsync_dir))};
  const MiB=Wd.mib;
  // state per step: where the new bytes are (user, cache, disk), what ckpt.pt on disk holds, dirty kB, elapsed ms, crash verdict
  const NAIVE=[
    {t:'Before: the last checkpoint is safe on disk',p:'ckpt.pt on the device holds step 1000. The new state (step 2000) is only in the process\'s memory.',nw:'user',disk:'old',dirty:M.dirty0,ms:0,crash:['ok','Restart from step 1000.']},
    {t:'open("ckpt.pt", O_WRONLY|O_CREAT|O_TRUNC)',p:'torch.save(state, "ckpt.pt") opens the existing file and truncates it to zero length. The old checkpoint\'s contents are discarded now, before a single new byte exists.',nw:'user',disk:'trunc',dirty:M.dirty0,ms:0,crash:['bad','ckpt.pt may be empty: both checkpoints lost.']},
    {t:'write(): '+MiB+' MiB into the page cache',p:'The bytes are copied into kernel memory and marked dirty. write() returns after '+M.write.toFixed(0)+' ms; the device has received nothing. /proc/meminfo Dirty jumps by about '+MiB+' MiB.',nw:'cache',disk:'trunc',dirty:M.dirtyW,ms:M.write,crash:['bad','Dirty pages are lost: ckpt.pt is empty or partial.']},
    {t:'close(): torch.save returns, the loop continues',p:'Your program believes the checkpoint is saved. It is not: it waits in memory for the flusher threads, which write data once it is about 30 s old.',nw:'cache',disk:'trunc',dirty:M.dirtyW,ms:M.write,crash:['bad','For up to about 30 s, a crash loses both checkpoints.']},
    {t:'Some seconds later: writeback',p:'The kernel writes the dirty pages to the device on its own schedule. Only now does ckpt.pt hold step 2000. Nothing told your program when this happened, or whether it failed.',nw:'disk',disk:'new',dirty:M.dirtyF,ms:M.write,crash:['ok','Restart from step 2000, if writeback succeeded.']}];
  const SAFE=[
    {t:'Before: the last checkpoint is safe on disk',p:'ckpt.pt holds step 1000.',nw:'user',disk:'old',dirty:M.dirty0,ms:0,crash:['ok','Restart from step 1000.']},
    {t:'write ckpt.pt.tmp into the page cache',p:'A new file, ckpt.pt.tmp, receives the '+MiB+' MiB ('+M.sw.toFixed(0)+' ms). ckpt.pt is untouched.',nw:'cache',disk:'old',tmp:'cache',dirty:M.dirtyW,ms:M.sw,crash:['ok','ckpt.pt is still step 1000; the tmp file is ignored.']},
    {t:'fsync(tmp): wait for the device',p:'fsync returns only when the device has the data: '+M.sf.toFixed(0)+' ms here. Dirty drops back to about zero.',nw:'disk',disk:'old',tmp:'disk',dirty:M.dirtyF,ms:M.sw+M.sf,crash:['ok','Still step 1000; the tmp file is complete but unnamed.']},
    {t:'rename(tmp, ckpt.pt): atomic swap',p:'The name ckpt.pt now points at the new file, in one step ('+M.sr.toFixed(M.sr<1?2:0)+' ms, median; from '+Math.min(...runs.map(r=>r.safe_ms.rename)).toFixed(2)+' to '+Math.max(...runs.map(r=>r.safe_ms.rename)).toFixed(0)+' ms across the 5 runs). Any reader sees the old file or the new one, never a mix.',nw:'disk',disk:'new*',tmp:'',dirty:M.dirtyF,ms:M.sw+M.sf+M.sr,crash:['mid','Either step 1000 or step 2000, both complete: the rename itself may not be on disk yet.']},
    {t:'fsync(directory): the name is durable',p:'fsync on the directory makes the rename itself survive a crash ('+M.sd.toFixed(1)+' ms). Now, and only now, may the job delete older checkpoints or report success.',nw:'disk',disk:'new',tmp:'',dirty:M.dirtyF,ms:M.sw+M.sf+M.sr+M.sd,crash:['ok','Restart from step 2000.']}];
  let mode='naive';const seq=()=>mode==='naive'?NAIVE:SAFE;
  const LBL={old:'step 1000 (old)',trunc:'empty (truncated)',new:'step 2000 (new)','new*':'step 2000 (new), name not yet durable'};
  function draw(i){const S=seq(),st=S[i];const W=RD.width(host),H=176,nar=W<520;const cw=(W-16)/3;let b='';
    const lanes=[['Process memory','user mode'],['Page cache','kernel memory'],['Device','SSD or virtual disk']];
    lanes.forEach((l,k)=>{const x=6+k*(cw+2);b+='<rect x="'+x+'" y="4" width="'+cw+'" height="'+(H-10)+'" rx="8" fill="'+(k===1?'var(--acc2)':'var(--soft)')+'" stroke="var(--line)"/>'+RD.t(x+8,20,l[0],{fs:nar?10.5:11.5,w:600})+RD.t(x+8,34,l[1],{fs:10,fill:'var(--mute)'})});
    const box=(k,y,txt,col,dash)=>{const x=6+k*(cw+2)+8;return '<rect x="'+x+'" y="'+y+'" width="'+(cw-16)+'" height="34" rx="5" fill="var(--bg)" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+RD.t(x+6,y+21,txt,{fs:nar?9.5:11})};
    const lane={user:0,cache:1,disk:2};
    b+=box(lane[st.nw],48,(nar?'new, ':'new state, ')+MiB+' MiB','var(--acc)',st.nw==='cache');
    if(st.tmp)b+=box(lane[st.tmp],90,'ckpt.pt.tmp','var(--c5)',st.tmp==='cache');
    const dc=st.disk==='trunc'?'var(--bad)':st.disk==='old'?'var(--c3)':'var(--good)';
    b+='<rect x="'+(6+2*(cw+2)+8)+'" y="128" width="'+(cw-16)+'" height="34" rx="5" fill="var(--bg)" stroke="'+dc+'" stroke-width="2"/>'+RD.t(6+2*(cw+2)+14,142,'ckpt.pt:',{fs:9.5,fill:'var(--mute)'})+RD.t(6+2*(cw+2)+14,155,(nar?LBL[st.disk].split(' (')[0]:LBL[st.disk]),{fs:nar?9.5:10.5,w:600,fill:dc});
    host.innerHTML=RD.svg(W,H,b,'Where the checkpoint bytes are');
    const cc=st.crash[0]==='ok'?'var(--good)':st.crash[0]==='mid'?'var(--c5)':'var(--bad)';
    $('rd-wr-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+st.t+'</div><p>'+st.p+'</p><p><b style="color:'+cc+'">If the machine crashed now:</b> '+st.crash[1]+'</p>';
    $('rd-wr-cnt').innerHTML=RD.stat('/proc/meminfo Dirty',(st.dirty/1024).toFixed(1)+' MiB','measured at this point')+RD.stat('Time in calls',st.ms.toFixed(0)+' ms','measured, median of 5')+RD.stat('Durable on the device?',st.nw==='disk'?'yes':'no','the new checkpoint')}
  const A=RD.anim({card:'rd-wr-card',ctl:'rd-wr-ctl',n:NAIVE.length,draw:draw,ms:3200,label:'Step of the write'});
  RD.seg($('rd-wr-mode'),m=>{mode=m;A.reset(seq().length);A.play()});RD.onResize(()=>A.redraw());
  $('rd-wr-note').innerHTML='<span class="meas">measured here</span> <code>src/read/code/write_journey.py</code>: a '+MiB+' MiB file written with one os.write, then fsync, 5 runs; Dirty read from /proc/meminfo before, after write() and after fsync() (system-wide, so other processes add a little noise: before '+(M.dirty0)+' kB, after write '+M.dirtyW+' kB, after fsync '+M.dirtyF+' kB, medians); then the safe sequence timed step by step. The file system is overlayfs over ext4 inside the VM, whose disk is a file on the Mac: fsync returns when the VM\'s virtual disk has accepted the data; whether the Mac\'s SSD has it at that moment was not verified. The naive pattern\'s "some seconds later" is the kernel\'s writeback schedule (section text), not a timed step.';
})();

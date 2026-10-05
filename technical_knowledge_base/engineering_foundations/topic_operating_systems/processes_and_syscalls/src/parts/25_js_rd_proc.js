// ---- Reading: the recorded /proc snapshot of the running job, split into the panes that use it ----
(function(){
  if(!window.PD)return;
  const T=PD.proc;
  const part=(a,b)=>{const i=T.indexOf(a);if(i<0)return '';const j=b?T.indexOf(b,i+a.length):-1;return T.slice(i+a.length,j<0?undefined:j).replace(/^\n+|\n+$/g,'')};
  const set=(id,s)=>{const e=document.getElementById(id);if(e)e.textContent=s};
  set('rd-proc-ps','$ ps -eo pid,ppid,pgid,sid,tty,stat,nlwp,comm\n'+part('== ps (pid ppid pgid sid tty stat nlwp comm)\n','== MAIN'));
  const main=part('== MAIN /proc/<main>/status (selected)\n','== WORKER'),wk=part('== WORKER /proc/<worker>/status (selected)\n','== limits');
  const status=s=>s.split('-- threads')[0].trim();
  const fds=s=>{const f=s.split('-- fds (ls -l /proc/<pid>/fd, targets)\n')[1]||'';
    return f.split('\n').filter(l=>l.trim()&&!/^ls: cannot access/.test(l)).sort((a,b)=>parseInt(a)-parseInt(b)).join('\n')};
  set('rd-proc-main',status(main));set('rd-proc-worker',status(wk));
  set('rd-fd-main','$ ls -l /proc/<main>/fd\n'+fds(main));set('rd-fd-worker','$ ls -l /proc/<worker>/fd\n'+fds(wk));
  set('rd-limits','$ cat /proc/<main>/limits\n'+part('== limits of MAIN (/proc/<main>/limits)\n','== /dev/shm'));
  set('rd-shm','$ ls -la /dev/shm\n'+part('== /dev/shm\n','main exited'));
  // signal masks for the decoder
  const grab=(s,k)=>{const m=s.match(new RegExp(k+':\\s*([0-9a-f]+)'));return m?m[1]:''};
  window.PD_MASKS={main:{ign:grab(main,'SigIgn'),cgt:grab(main,'SigCgt'),blk:grab(main,'SigBlk')},worker:{ign:grab(wk,'SigIgn'),cgt:grab(wk,'SigCgt'),blk:grab(wk,'SigBlk')}};
})();
// raw outputs of the small C experiments
(function(){
  if(!window.PD)return;
  const set=(id,s)=>{const e=document.getElementById(id);if(e)e.textContent=s};
  set('rd-exec-out','$ ./exec_keep ./showself\n'+PD.execkeep);
  const so=PD.fdshare.split('--- stdout redirected to a file:\n')[1]||'';
  set('rd-stdio-out','$ ./fdshare > out.txt; cat out.txt\n'+so.trim());
  set('rd-life-out','$ ./lifecycle 0; ./lifecycle 1\n'+PD.lifecycle);
  set('rd-reparent-out','$ ./reparent\n'+PD.reparent);
  const fd1=PD.fdshare.split('--- stdout redirected')[0];
  set('rd-fdshare-out',fd1.trim());
  set('rd-cloexec-out',PD.cloexec.raw);
  set('rd-pipe-out','$ ./pipes\n'+PD.pipe.raw);
  set('rd-sigq-out','$ ./sigqueue 1000\n'+PD.sigq.raw);
})();

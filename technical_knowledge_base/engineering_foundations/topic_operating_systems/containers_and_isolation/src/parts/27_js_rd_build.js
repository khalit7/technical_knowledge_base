// ---- Reading section 0: step through minictr's run, each view compared with the previous step or step 0 (moved from the old Build a container tab, 2026-10-24) ----
// 2026-11-07: the step titles and explanations are the step list sx-build on the left (static HTML); this card shows the call and the view.
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id),S=D.mini;
  const STEP=[
    {c:'shmget(IPC_PRIVATE, 4096, IPC_CREAT | 0600);  /* one System V segment, to watch */\nview(0, ...);'},
    {c:'unshare(CLONE_NEWUTS);\nsethostname("trainer-0", 9);'},
    {c:'unshare(CLONE_NEWPID);   /* sets pid_ns_for_children only */\npid_t c = fork();       /* the child is PID 1 in the new namespace */\nif (c > 0) { waitpid(c, &st, 0); return 0; }'},
    {c:'write("/sys/fs/cgroup/ctr/cgroup.procs", "0");  /* "0" means me */\nunshare(CLONE_NEWCGROUP);'},
    {c:'unshare(CLONE_NEWNS);\nmount(NULL, "/", NULL, MS_REC | MS_PRIVATE, NULL);\nmount("overlay", "/ctr/merged", "overlay", 0,\n      "lowerdir=/ctr/lower,upperdir=/ctr/upper,workdir=/ctr/work");\nmount("/dev", "/ctr/merged/dev", NULL, MS_BIND | MS_REC, NULL);\npivot_root("/ctr/merged", "/ctr/merged/oldroot");\nchdir("/");\nmount("proc", "/proc", "proc", ...);\nmount("cgroup2", "/sys/fs/cgroup", "cgroup2", ...);\nmount("tmpfs", "/tmp", "tmpfs", 0, "size=16m");\numount2("/oldroot", MNT_DETACH);'},
    {c:'unshare(CLONE_NEWNET);   /* about 2.4 ms here, see Reading section 1 */'},
    {c:'unshare(CLONE_NEWIPC);'},
    {c:'for (cap = 0; cap <= 40; cap++)\n  if (!keep(cap)) prctl(PR_CAPBSET_DROP, cap);   /* bounding set */\ncapset(&hdr, data);   /* permitted = effective = the 14 */'},
    {c:'prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);\nprctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog);\n/* 9 BPF instructions: wrong arch: kill; mkdirat: EPERM;\n   unshare: EPERM; anything else: allow */'},
    {c:'execl("/bin/sh", "sh", "/job.sh", NULL);'}
  ];
  const ROWS=[['identity',['pid','ppid','uid','hostname']],['namespaces (inode numbers)',['ns_uts','ns_pid','ns_cgroup','ns_mnt','ns_net','ns_ipc','ns_user','ns_time']],
    ['what it can see',['procs_visible','root_entries','mounts','root_fs','net_ifaces','sysv_shm_segments']],['cgroup',['cgroup','memory_max_visible','pids_max_visible']],['privileges',['CapEff','NoNewPrivs','Seccomp']]];
  let cmp='prev';
  function draw(i){
    const s=S[i],st=STEP[i],ref=i===0?null:(cmp==='prev'?S[i-1]:S[0]);
    $('bl-code').textContent=st.c;
    $('bl-tries').innerHTML=(s.tries||[]).map(t=>'<div class="try">'+(t[1]==='ok'?'<span class="pill ok">ok</span>':'<span class="pill bad">'+E(t[1])+'</span>')+' '+E(t[0])+'</div>').join('');
    const kv=i===9?S[8].kv:s.kv;
    let n=0;
    $('bl-view').innerHTML=ROWS.map(([g,keys])=>'<tr class="grp"><td colspan="2">'+g+'</td></tr>'+keys.map(k=>{const v=kv[k]||'',o=ref&&i<9?(ref.kv[k]||''):v,ch=o!==v;if(ch)n++;
      return '<tr'+(ch?' class="chg"':'')+'><td>'+E(k)+'</td><td>'+(ch?'<span class="was">'+E(o)+'</span>':'')+E(v)+'</td></tr>'}).join('')).join('');
    const out=$('bl-out');
    if(i===9){out.hidden=false;out.textContent=s.out+'\n\n### the upper layer, seen from outside after the run\n'+D.mini_upper}else out.hidden=true;
  }
  const a=RD.anim({card:'bl-card',ctl:'bl-ctl',n:STEP.length,draw,ms:5200,label:'Build step',list:'sx-build'});
  RD.seg($('bl-cmp'),m=>{cmp=m;a.redraw()});
})();
